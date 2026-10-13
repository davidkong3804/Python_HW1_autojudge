/* Autojudge — Python 執行 worker
 * 每個 worker 內含一份 Pyodide（瀏覽器裡的 CPython）。
 * 學生程式在這裡執行，input() 由測資餵入，stdout 被攔截下來比對。
 *
 * 防禦重點（都是真的會遇到的學生程式）：
 *   - 學生把 sys.stdout 關掉 / 換掉  -> 我們的 buffer 不怕被 close()
 *   - 學生一直 print                  -> 輸出到上限就中止，不會把瀏覽器吃爆
 *   - 學生改 builtins 或改 math 模組  -> 每跑完一筆就還原，不會污染下一位同學
 *   - 學生用 __file__ / sys.exit()    -> 都給它，行為跟真的 python 一樣
 *   - 無窮迴圈                        -> 由主執行緒 terminate() 這個 worker（TLE）
 *
 * 另外提供 features：用 ast 靜態分析程式寫法（有沒有迴圈、函式、set…），
 * 給「寫法要求」提示用。只 parse、不執行。
 * 還有 split：同學把 a、b 寫在同一個檔案時，依註解標記或候選切點把它拆開（同樣只 parse）。
 */

let pyodide = null;
let runner = null;
let featurer = null;
let splitter = null;

const HARNESS = String.raw`
import builtins, io, sys, traceback, json

MAX_OUTPUT = 200000          # 超過就中止，避免無窮 print 把記憶體吃光
RETURN_CAP = 20000           # 回傳給網頁的長度上限（正確答案都只有幾十字）

class _OutputLimit(Exception):
    pass

class _Writer:
    """學生就算 sys.stdout.close() 也不會把批改弄壞。"""
    def __init__(self, cap):
        self._parts = []
        self._n = 0
        self._cap = cap
        self.closed = False
        self.encoding = 'utf-8'
        self.errors = 'strict'
        self.name = '<stdout>'
        self.mode = 'w'
    def write(self, s):
        if not isinstance(s, str):
            s = str(s)
        self._n += len(s)
        if self._n > self._cap:
            raise _OutputLimit()
        self._parts.append(s)
        return len(s)
    def writelines(self, lines):
        for line in lines:
            self.write(line)
    def flush(self):
        pass
    def close(self):
        pass
    def isatty(self):
        return False
    def writable(self):
        return True
    def readable(self):
        return False
    def seekable(self):
        return False
    def fileno(self):
        raise OSError('not a real file')
    def getvalue(self):
        return ''.join(self._parts)

_BUILTIN_SNAPSHOT = dict(builtins.__dict__)
_MODULE_SNAPSHOT = set(sys.modules)
_RECURSION_LIMIT = sys.getrecursionlimit()


def _restore_environment():
    """把上一位同學動過的全域狀態還原，否則會污染後面所有人的成績。"""
    bd = builtins.__dict__
    if len(bd) != len(_BUILTIN_SNAPSHOT) or any(bd.get(k) is not v for k, v in _BUILTIN_SNAPSHOT.items()):
        bd.clear()
        bd.update(_BUILTIN_SNAPSHOT)
    for name in list(sys.modules):
        if name not in _MODULE_SNAPSHOT:
            sys.modules.pop(name, None)
    sys.setrecursionlimit(_RECURSION_LIMIT)


def _clean_source(code):
    """BOM、CRLF、NUL：Windows 記事本 / Big5 亂碼存出來的檔常常有。"""
    code = code.replace('\r\n', '\n').replace('\r', '\n')
    code = code.replace('\x00', '')
    while code[:1] == '\ufeff':
        code = code[1:]
    return code


def _run(code, stdin_text):
    lines = stdin_text.split('\n')
    if lines and lines[-1] == '':
        lines.pop()
    state = {'i': 0}

    def fake_input(prompt=''):
        # 提示字不進 stdout（input('請輸入身高：') 不該被扣分）
        if state['i'] >= len(lines):
            raise EOFError('EOF when reading a line')
        state['i'] += 1
        return lines[state['i'] - 1]

    out = _Writer(MAX_OUTPUT)
    err = _Writer(MAX_OUTPUT)
    old = (sys.stdout, sys.stderr, sys.stdin, builtins.input)
    sys.stdout, sys.stderr = out, err
    sys.stdin = io.StringIO(stdin_text)
    builtins.input = fake_input
    status, tb, errkind = 'ok', '', ''
    try:
        g = {'__name__': '__main__', '__file__': 'student.py', '__doc__': None}
        exec(compile(_clean_source(code), 'student.py', 'exec'), g)
    except _OutputLimit:
        status = 'overflow'
        tb = '輸出超過 %d 個字元就停下來了（多半是無窮迴圈一直 print）' % MAX_OUTPUT
    except SystemExit:
        pass
    except EOFError:
        status = 'error'
        errkind = 'eof'
        tb = ('EOFError：程式把這一題的輸入用完了還想再讀一次 input()。\n'
              '（常見原因：印完答案後又寫了 input("按 Enter 結束")，'
              '或是把一行的輸入拆成好幾次 input()）\n')
    except BaseException:
        status = 'error'
        etype, evalue, etb = sys.exc_info()
        tb = ''.join(traceback.format_exception(etype, evalue, etb.tb_next if etb else None))
        if etype is ModuleNotFoundError:
            tb += '\n注意：批改環境只有 Python 標準函式庫，沒有 numpy/pandas 等第三方套件。\n'
    finally:
        sys.stdout, sys.stderr, sys.stdin, builtins.input = old
        try:
            _restore_environment()
        except Exception:
            pass

    stdout_text = out.getvalue()
    stderr_text = err.getvalue() + tb
    truncated = False
    if len(stdout_text) > RETURN_CAP:
        stdout_text = stdout_text[:RETURN_CAP] + '\n…（輸出太長，只顯示前面 %d 個字元）' % RETURN_CAP
        truncated = True
    if len(stderr_text) > 4000:
        stderr_text = stderr_text[:4000] + '…'
    return json.dumps({'stdout': stdout_text, 'stderr': stderr_text,
                       'status': status, 'truncated': truncated, 'errkind': errkind})


# --8<-- features:start（tools/grade_cli.py 用同一段程式，tools/test_detect.py 對拍）
def _features(code):
    """靜態分析寫法：回傳 ['for', 'while', 'comp', 'def', 'set', 'slice', 'import:x'...]。
    語法錯誤回傳 None（沒辦法判斷，不要亂標）。"""
    import ast
    try:
        tree = ast.parse(_clean_source(code))
    except (SyntaxError, ValueError):
        return None
    found = set()
    for node in ast.walk(tree):
        if isinstance(node, (ast.For, ast.AsyncFor)):
            found.add('for')
        elif isinstance(node, ast.While):
            found.add('while')
        elif isinstance(node, (ast.ListComp, ast.SetComp, ast.DictComp, ast.GeneratorExp)):
            found.add('comp')
            if isinstance(node, ast.SetComp):
                found.add('set')
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            found.add('def')
        elif isinstance(node, ast.Set):
            found.add('set')
        elif isinstance(node, ast.Call) and isinstance(node.func, ast.Name) \
                and node.func.id in ('set', 'frozenset'):
            found.add('set')
        elif isinstance(node, ast.Slice):
            found.add('slice')
        elif isinstance(node, ast.Import):
            for alias in node.names:
                found.add('import:' + alias.name.split('.')[0])
        elif isinstance(node, ast.ImportFrom) and node.module:
            found.add('import:' + node.module.split('.')[0])
    return sorted(found)
# --8<-- features:end


def _features_json(code):
    return json.dumps(_features(code))


# --8<-- split:start（tools/grade_cli.py 用同一段程式，tools/test_split.py 測試）
# 同學把 a、b 兩個子題（甚至好幾題）寫在同一個檔案裡時，把它拆成各自獨立的程式。
# 全部是靜態分析（只 parse、不執行學生程式）：
#   1. _split_markers：依註解標記（# Q1a、# (b)、# 1-b、# b. Use a loop、"""Q1b"""…）切開
#   2. 沒有標記就用 _split_cands 找「第二支程式可能從哪裡開始」的候選行，
#      由呼叫端拿測資試跑，挑出兩邊都對的那一個
import ast
import builtins as _bi
import re
import textwrap

_SPLIT_BUILTINS = set(dir(_bi)) | {'__name__', '__file__', '__doc__'}
_WS = r'[ \t　]'
_MK_KEY = r'(?:q|question|problem|prob|exercise)'
_MK_RE = [
    # Q1a  Q1_a  Q1.a  Q1-a  Q1 - a  Q1(a)  Question 1 (a)   （數字與字母之間只准這幾種接法，"Q1: a program" 不算）
    re.compile(r'^' + _MK_KEY + _WS + r'*[.\-_]?' + _WS + r'*0*(\d{1,2})(?:' + _WS + r'*\(' + _WS + r'*([a-z])' + _WS +
               r'*\)|' + _WS + r'*-' + _WS + r'*([a-z])|[_.]?([a-z]))(?![a-z0-9])', re.I | re.A),
    # 第1題a  第1題 (a)  第1題 - a
    re.compile(r'^第' + _WS + r'*0*(\d{1,2})' + _WS + r'*題(?:' + _WS + r'*\(' + _WS + r'*([a-z])' + _WS + r'*\)|' + _WS +
               r'*[-_.:、]?' + _WS + r'*([a-z])(?![a-z0-9]))?', re.I | re.A),
    # 1a  1(a)  1-a  1.a  （沒有 Q 的寫法）
    re.compile(r'^0*(\d{1,2})(?:' + _WS + r'*\(' + _WS + r'*([a-z])' + _WS + r'*\)|' + _WS + r'*[-_.]' + _WS +
               r'*([a-z])|([a-z]))(?![a-z0-9])', re.I | re.A),
]
# 只有題號、沒有子題：Q1、Question 2、Problem 3（沒有 Q 的單獨數字不算，# 1. 讀取輸入 是步驟編號）
_MK_NUM_RE = re.compile(r'^' + _MK_KEY + _WS + r'*[.\-_]?' + _WS + r'*0*(\d{1,2})(?![a-z0-9])', re.I | re.A)
# 只有字母：(a)、a)、a.、a:、Part a、sub-question b、小題a
_MK_LETTER_RE = [
    re.compile(r'^\(' + _WS + r'*([a-z])' + _WS + r'*\)(?![a-z0-9])', re.I | re.A),
    re.compile(r'^([a-z])' + _WS + r'*[).:：、](?=' + _WS + r'|$)', re.I | re.A),
    re.compile(r'^(?:part|sub' + _WS + r'*-?' + _WS + r'*(?:q|question|problem)?|小題|子題)' + _WS + r'*[-_.:]?' + _WS +
               r'*\(?([a-z])\)?(?![a-z0-9])', re.I | re.A),
    re.compile(r'^([a-z])$', re.I | re.A),
    re.compile(r'^(?:for' + _WS + r'+)?([a-z])' + _WS + r'*[-_]\d+(?![a-z0-9])', re.I | re.A),   # for a-1、a_2 test
]
_CELL_RE = re.compile(r'^\s*#\s*(?:In\s*\[|%%|@title|<a\s|\[?\s*cell\b|---)', re.I)


def _clean_marker_text(text):
    t = text.strip(' \t　#')
    t = re.sub(r'^@\w+' + _WS + r'*', '', t)           # Colab 的 #@title Q1a
    t = t.replace(chr(96), '').replace('*', '')
    return t.strip(' \t　=-~_>').strip()


def _parse_marker(text):
    """一行註解（或單行字串）-> (題號數字或 None, 子題字母或 None)；不像標題就回傳 None。"""
    t = _clean_marker_text(text)
    if not t:
        return None
    for i, rx in enumerate(_MK_RE):
        m = rx.match(t)
        if m:
            letter = next((g for g in m.groups()[1:] if g), None)
            if i == 1 and letter is None and len(t) > 60:
                return None
            return m.group(1), (letter.lower() if letter else None)
    if len(t) > 60:
        return None
    m = _MK_NUM_RE.match(t)
    if m:
        return m.group(1), None
    for rx in _MK_LETTER_RE:
        m = rx.match(t)
        if m:
            return None, m.group(1).lower()
    return None


def _num_hint(name):
    """從檔名猜題號數字：q1、Q1_final、第1題、整個檔名只有一個 1~2 位數字。猜不出來回傳空字串。"""
    base = name.replace('\\', '/').split('/')[-1]
    base = re.sub(r'\.[^.]*$', '', base)
    m = re.search(r'(?:^|[^a-z0-9])q' + _WS + r'*0*(\d{1,2})(?![0-9])', base, re.I | re.A) or \
        re.search(r'第' + _WS + r'*0*(\d{1,2})' + _WS + r'*題', base, re.A)
    if m:
        return str(int(m.group(1)))
    rest = re.sub(r'hw' + _WS + r'*\d+', '_', base, flags=re.I)
    rest = re.sub(r'[A-Za-z]?\d{6,12}', '_', rest)
    nums = set(int(x) for x in re.findall(r'(?<![0-9])(\d{1,2})(?![0-9])', rest, re.A) if int(x))
    return str(nums.pop()) if len(nums) == 1 else ''


def _qid_of(num, letter, qids):
    q = 'q%d%s' % (int(num), letter or '')
    return q if q in qids else None


def _top_start(node):
    return min([node.lineno] + [d.lineno for d in getattr(node, 'decorator_list', [])])


_DEF_TYPES = (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)


def _is_carry(node):
    """可以原樣帶到別一段去的敘述：import / def / class。"""
    return isinstance(node, _DEF_TYPES + (ast.Import, ast.ImportFrom))


def _is_const_assign(node):
    if isinstance(node, ast.Assign):
        targets, value = node.targets, node.value
    elif isinstance(node, ast.AnnAssign) and node.value is not None:
        targets, value = [node.target], node.value
    else:
        return False
    try:
        ast.literal_eval(value)
    except Exception:
        return False
    return all(isinstance(t, ast.Name) for t in targets)


def _is_inert(node):
    """放在第一個標記前面、不會讀輸入也不會輸出的敘述：import / def / class / 字串 / 常數 / pass。"""
    if _is_carry(node) or isinstance(node, ast.Pass) or _is_const_assign(node):
        return True
    return isinstance(node, ast.Expr) and isinstance(node.value, ast.Constant)


def _bound_names(nodes):
    out = set()
    for top in nodes:
        for n in ast.walk(top):
            if isinstance(n, ast.Name) and isinstance(n.ctx, (ast.Store, ast.Del)):
                out.add(n.id)
            elif isinstance(n, _DEF_TYPES):
                out.add(n.name)
            elif isinstance(n, ast.arg):
                out.add(n.arg)
            elif isinstance(n, ast.alias):
                out.add((n.asname or n.name).split('.')[0])
            elif isinstance(n, ast.ExceptHandler) and n.name:
                out.add(n.name)
    return out


def _free_names(nodes):
    loaded = set()
    for top in nodes:
        for n in ast.walk(top):
            if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Load):
                loaded.add(n.id)
    return loaded - _bound_names(nodes) - _SPLIT_BUILTINS


def _carry_names(node):
    if isinstance(node, _DEF_TYPES):
        return [node.name]
    return [(a.asname or a.name).split('.')[0] for a in node.names]


def _is_entry(fn):
    """不用傳參數、裡面自己 input() 的函式：整支程式包在函式裡的寫法（def q1_a(): ...），要呼叫它才會跑。"""
    a = fn.args
    if len(a.posonlyargs) + len(a.args) - len(a.defaults) > 0 or any(d is None for d in a.kw_defaults):
        return False
    return any(isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id == 'input' for n in ast.walk(fn))


def _src(lines, node):
    return '\n'.join(lines[_top_start(node) - 1:node.end_lineno])


def _wrap_plan(spans, owner, nparts, lines):
    """每個子題只「定義」函式、最後由 if __name__ == '__main__': 呼叫其中一個（常見寫法）。
    這種檔案拆開後每段只有 def、不會輸出任何東西；這裡替每一段補上呼叫自己的入口函式。
    回傳 ({段落編號: 補好呼叫的程式碼}, 呼叫用的敘述編號集合)。"""
    entries = {}
    for j, (s, e, node) in enumerate(spans):
        if owner[j] >= 0 and isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and _is_entry(node):
            entries[node.name] = owner[j]
    if not entries:
        return {}, set()
    names = set(entries)
    drivers, driver_js = [], set()               # drivers: (文字, 呼叫到的入口函式名集合)
    for j, (s, e, node) in enumerate(spans):
        if owner[j] < 0 or _is_inert(node) or _stmt_flags(node)[2]:
            continue                             # 自己有 input() 的是正式的程式，不是呼叫用的敘述
        guard = isinstance(node, ast.If) and any(isinstance(n, ast.Name) and n.id == '__name__' for n in ast.walk(node.test))
        items = node.body if guard and not node.orelse else [node]
        if not guard and not (_free_names([node]) & names):
            continue
        driver_js.add(j)
        for b in items:
            text = textwrap.dedent(_src(lines, b))
            drivers.append((text, _free_names([b]) & names))
    out = {}
    for k in range(nparts):
        mine_fn = [spans[j][2].name for j in range(len(spans)) if owner[j] == k and spans[j][2].__class__ in
                   (ast.FunctionDef, ast.AsyncFunctionDef) and spans[j][2].name in names]
        own_nodes = [spans[j][2] for j in range(len(spans)) if owner[j] == k and j not in driver_js]
        if not mine_fn or any(not _is_inert(n) for n in own_nodes):
            continue
        entry = mine_fn[-1]
        own = [d for d in drivers if d[1] & set(mine_fn)]
        if own:
            calls = [d[0] for d in drivers if (d[1] & set(mine_fn)) or not d[1]]
        elif drivers:
            calls = []
            for text, called in drivers:
                for nm in called:
                    text = re.sub(r'\b%s\b' % re.escape(nm), entry, text)
                calls.append(text)
        else:
            calls = [entry + '()']
        calls = list(dict.fromkeys(calls))
        out[k] = '\n'.join([_src(lines, n) for n in own_nodes] + [''] + calls)
    return out, driver_js


def _has_input(text):
    return bool(re.search(r'\binput\s*\(|\bstdin\b', text))


def _has_code(lines):
    return any(l.strip() and not l.strip().startswith('#') for l in lines)


def _split_markers(code, qids, name=''):
    """依註解標記拆開。回傳 {'parts': [...], 'note': 說明}；沒有拆分根據（或拆了會壞）時 parts 是空的。
    part = {qid, start, end, label, code, carried, implicit}，start/end 是原檔行號（1 起算）。"""
    src = _clean_source(code)
    lines = src.split('\n')
    hint = _num_hint(name)
    try:
        tree = ast.parse(src)
    except Exception:
        tree = None
    spans = []
    if tree is not None:
        for node in tree.body:
            spans.append((_top_start(node), node.end_lineno, node))

    def inside(ln):
        return any(s < ln <= e for s, e, _ in spans)

    found = []                                   # (行號, 題號數字, 字母, 標題文字)
    for i, line in enumerate(lines):
        ln = i + 1
        if line.startswith('#') and not inside(ln):
            mk = _parse_marker(line)
            if mk:
                found.append((ln, mk[0], mk[1], _clean_marker_text(line)))
    for s, e, node in spans:                     # """Q1b""" 這種單獨一行的字串
        if isinstance(node, ast.Expr) and isinstance(node.value, ast.Constant) and isinstance(node.value.value, str):
            txt = node.value.value
            rows = [x for x in txt.splitlines() if x.strip()]
            if rows and len(rows) <= 3 and not re.search(r'ipynb|colab', txt, re.I):
                mk = _parse_marker(rows[0])
                if mk:
                    found.append((s, mk[0], mk[1], _clean_marker_text(rows[0])))
    found.sort(key=lambda x: x[0])

    ctx = hint
    segs = []                                    # [起始行, qid, 標題, 是否明確寫了題號]
    for ln, num, letter, text in found:
        if num is not None:
            ctx = str(int(num))
        if not ctx:
            continue
        q = _qid_of(ctx, letter, qids)
        if q:
            segs.append([ln, q, text[:40], num is not None])

    # 標記後面沒有程式的（空的標題、或連續兩個標題）不算一段
    dropped = []
    kept = []
    for i, sg in enumerate(segs):
        end = segs[i + 1][0] - 1 if i + 1 < len(segs) else len(lines)
        if _has_code(lines[sg[0] - 1:end]):
            kept.append(sg)
        else:
            dropped.append(sg[1])
    segs = kept
    notes = ['%s 的標記後面沒有程式' % q.upper() for q in dict.fromkeys(dropped) if q not in [s[1] for s in segs]]
    if not segs:
        return {'parts': [], 'note': ''}

    # 第一個標記前面的程式
    first = segs[0][0]
    pre_nodes = [n for s, e, n in spans if e < first]
    if tree is not None:
        pre_exec = any(not _is_inert(n) for n in pre_nodes)
    else:
        pre_exec = _has_code(lines[:first - 1])
    implicit = None
    shared = ''
    if pre_exec:
        prefix = re.match(r'q\d+', segs[0][1]).group(0)
        used = set(s[1] for s in segs)
        sibs = [q for q in qids if q.startswith(prefix) and re.fullmatch(prefix + r'[a-z]', q) and q not in used
                and qids.index(q) < qids.index(segs[0][1])]
        if sibs:
            implicit = sibs[0]
    else:
        shared = '\n'.join(lines[:first - 1])
    if len(segs) + (1 if implicit else 0) < 2 or len(set(s[1] for s in segs) | ({implicit} if implicit else set())) < 2:
        return {'parts': [], 'note': ''}
    if pre_exec and not implicit:
        segs[0][0] = 1                           # 前面那段就是第一題的程式

    # 每一段的範圍
    bounds = []
    if implicit:
        bounds.append([1, first - 1, implicit, '（第一個標記之前的程式）', False, True])
    for i, sg in enumerate(segs):
        end = segs[i + 1][0] - 1 if i + 1 < len(segs) else len(lines)
        bounds.append([sg[0], end, sg[1], sg[2], sg[3], False])

    # 後面的段落如果用到前面段落的「變數」，那是同一支程式的步驟，不是獨立的子題 -> 不拆
    carried = [[] for _ in bounds]
    wrap, driver_js = {}, set()
    if tree is not None:
        owner = []                               # 每個頂層敘述屬於第幾段（-1 = 共用的前言）
        for s, e, n in spans:
            idx = -1
            for k, b in enumerate(bounds):
                if b[0] <= s <= b[1]:
                    idx = k
                    break
            owner.append(idx)
        wrap, driver_js = _wrap_plan(spans, owner, len(bounds), lines)
        carry_map, var_map = {}, {}
        for k in range(len(bounds)):
            mine = [spans[j][2] for j in range(len(spans)) if owner[j] == k and j not in driver_js]
            need = _free_names(mine)
            done = set()
            todo = list(need)
            while todo:
                nm = todo.pop()
                if nm in done:
                    continue
                done.add(nm)
                if nm in carry_map:
                    j = carry_map[nm]
                    if j not in carried[k]:
                        carried[k].append(j)
                        todo.extend(_free_names([spans[j][2]]))
                elif nm in var_map:
                    return {'parts': [], 'note': '各段之間共用變數（%s），看起來是同一支程式的步驟，沒有拆開' % nm}
            for j in range(len(spans)):
                if owner[j] == k and _is_carry(spans[j][2]):
                    for nm in _carry_names(spans[j][2]):
                        carry_map[nm] = j
            for nm in _bound_names(mine):          # 這一段綁定的名字，後面的段落不能直接拿來用
                var_map.setdefault(nm, k)
    weak = any(not b[4] and not b[5] for b in bounds)
    parts = []
    for k, (a, b, qid, label, strong, imp) in enumerate(bounds):
        own = wrap[k] if k in wrap else '\n'.join(lines[a - 1:b])
        pieces = [shared] if shared else []
        for j in sorted(carried[k], key=lambda j: spans[j][0]):
            if spans[j][0] < a and not (shared and spans[j][1] < first):
                pieces.append('\n'.join(lines[spans[j][0] - 1:spans[j][1]]))
        pieces.append(own)
        text = '\n'.join(pieces).strip('\n') + '\n'
        if weak and not _has_input(text):
            return {'parts': [], 'note': '%s 這一段沒有讀取輸入，標記又只有字母，不確定是子題，沒有拆開' % qid.upper()}
        parts.append({'qid': qid, 'start': a, 'end': b, 'label': label, 'code': text,
                      'carried': [n for j in carried[k] for n in _carry_names(spans[j][2])],
                      'implicit': imp})
    return {'parts': parts, 'note': '；'.join(notes)}


def _stmt_flags(node):
    """這個頂層敘述（不含函式內容）有沒有讀輸入 / 印東西；函式裡面另外記。"""
    top_in = top_out = any_in = any_out = False
    stack = [(node, True)]
    while stack:
        n, top = stack.pop()
        is_in = (isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id == 'input') or \
                (isinstance(n, ast.Attribute) and n.attr == 'stdin')
        is_out = (isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id == 'print') or \
                 (isinstance(n, ast.Attribute) and n.attr == 'write')
        if is_in:
            any_in = True
            top_in = top_in or top
        if is_out:
            any_out = True
            top_out = top_out or top
        inner = top and not isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef, ast.Lambda))
        for c in ast.iter_child_nodes(n):
            stack.append((c, inner))
    return top_in, top_out, any_in, any_out


def _parses(text):
    try:
        ast.parse(text)
        return True
    except Exception:
        return False


def _split_cands_text(src, limit=6):
    """整份檔案有語法錯誤（多半是其中一支寫壞了）時的備援：只看文字，
    切點取在「頂格、而且像一支新程式開頭」的行，並要求至少有一半是合法的 Python。"""
    lines = src.split('\n')
    out, seen = [], set()
    for i in range(1, len(lines)):
        line = lines[i]
        if not line.strip() or line[0] in ' \t#)]}' or re.match(r'(else|elif|except|finally|\)|\]|\})\b', line):
            continue
        if not (re.search(r'\binput\s*\(', line) or re.match(r'(def|class|import|from)\b', line)):
            continue
        j = i                                    # 緊貼在上方的註解屬於這一行
        while j - 1 >= 0 and lines[j - 1].lstrip().startswith('#') and lines[j - 1][:1] == '#':
            j -= 1
        pre, suf = '\n'.join(lines[:j]).strip('\n') + '\n', '\n'.join(lines[j:]).strip('\n') + '\n'
        if j + 1 in seen or not (_has_input(pre) and _has_input(suf) and 'print' in pre and 'print' in suf):
            continue
        if not (_parses(pre) or _parses(suf)):
            continue
        prev = next((l for l in reversed(lines[:j]) if l.strip() and not l.lstrip().startswith('#')), '')
        score = (3 if re.search(r'\binput\s*\(', line) else 2) + (1 if prev.startswith('print') else 0) \
            + (1 if j < i or (j > 0 and not lines[j - 1].strip()) else 0)
        seen.add(j + 1)
        out.append({'line': j + 1, 'score': score, 'a': pre, 'b': suf})
    out.sort(key=lambda c: (-c['score'], c['line']))
    return out[:limit]


def _split_cands(code, limit=6):
    """沒有註解可依據時，找出「第二支程式可能從哪一行開始」。
    回傳 [{line, score, a, b}]：a 是 line 之前、b 是 line 起的程式碼，分數高的排前面。
    切點一定落在頂層敘述之間，所以兩半各自都是合法的 Python。"""
    src = _clean_source(code)
    try:
        tree = ast.parse(src)
    except Exception:
        return _split_cands_text(src, limit)
    body = tree.body
    if len(body) < 2:
        return []
    lines = src.split('\n')
    info = [_stmt_flags(n) for n in body]
    out, seen = [], set()
    for i in range(1, len(body)):
        pre, suf = info[:i], info[i:]
        if not (any(p[2] for p in pre) and any(p[3] for p in pre) and any(p[2] for p in suf) and any(p[3] for p in suf)):
            continue
        prev_end = body[i - 1].end_lineno
        start = _top_start(body[i])
        gap = lines[prev_end:start - 1]
        score = 0
        if info[i][0]:
            score += 3
        elif _is_carry(body[i]) and any(p[1] for p in pre):
            score += 2
        if info[i - 1][1]:
            score += 1
        if any(l.strip() for l in gap):
            score += 1
        if sum(1 for l in gap if not l.strip()) >= 2:
            score += 1
        if any(_CELL_RE.match(l) for l in gap):
            score += 2
        if score < 2:
            continue
        cut = start                              # 緊貼在這個敘述上方的註解屬於它
        while cut - 1 > prev_end and lines[cut - 2].lstrip().startswith('#'):
            cut -= 1
        if cut in seen:
            continue
        seen.add(cut)
        out.append({'line': cut, 'score': score,
                    'a': '\n'.join(lines[:cut - 1]).strip('\n') + '\n',
                    'b': '\n'.join(lines[cut - 1:]).strip('\n') + '\n'})
    out.sort(key=lambda c: (-c['score'], c['line']))
    return out[:limit]


def _split_plan(code, qids, name=''):
    plan = _split_markers(code, qids, name)
    plan['hint'] = _num_hint(name)
    plan['cands'] = [] if plan['parts'] else _split_cands(code)
    return plan


def _canon(text):
    return ''.join(str(text).split()).lower()


def _match(out, exp):
    """試跑時答案算不算對（只是在找切點，不是在評分，所以很寬鬆）：
    2 = 去掉空白、不分大小寫後完全相同；1 = 答案包在輸出裡（多印了 "a. Loop result:" 這類說明文字）；0 = 不對。"""
    o, e = _canon(out), _canon(exp)
    if o == e:
        return 2
    return 1 if len(e) >= 3 and e in o else 0


def _split_pick(cands, tests, run, whole):
    """拿測資試跑，從候選切點裡挑出兩半都對的那一個。
    tests = [(輸入, 正確輸出)]（前兩筆就夠）；run(程式碼, 輸入) -> (正常結束?, 輸出)。
    整份程式本來就答對第一筆 -> 是單一程式，不拆（回傳 None）。
    回傳 (候選, 前半得分, 後半得分)，得分 = 每筆 0/1/2（見 _match）加總，或 None。"""
    if not cands or not tests:
        return None
    ok, out = run(whole, tests[0][0])
    if ok and _match(out, tests[0][1]) == 2:
        return None
    best = None
    for c in cands:
        got = []
        for half in (c['a'], c['b']):
            n = 0
            for inp, exp in tests:
                ok, out = run(half, inp)
                if ok:
                    n += _match(out, exp)
            got.append(n)
        rank = (got[0] >= 1 and got[1] >= 1, got[0] + got[1], c['score'], -c['line'])
        if best is None or rank > best[0]:
            best = (rank, c, got[0], got[1])
    if best is None:
        return None
    _, c, pre, suf = best
    if pre >= 1 and suf >= 1:
        return c, pre, suf
    if pre + suf >= 2 and c['score'] >= 4:        # 只有一半答對，但切點很像第二支程式的開頭
        return c, pre, suf
    return None
# --8<-- split:end


def _split_json(code, name, qids_json):
    try:
        return json.dumps(_split_plan(code, json.loads(qids_json), name))
    except Exception:
        return json.dumps({'parts': [], 'cands': [], 'note': '', 'hint': ''})
`;

async function boot(baseUrl) {
  importScripts(baseUrl + 'pyodide.js');
  // eslint-disable-next-line no-undef
  pyodide = await loadPyodide({ indexURL: baseUrl });
  pyodide.runPython(HARNESS);
  runner = pyodide.globals.get('_run');
  featurer = pyodide.globals.get('_features_json');
  splitter = pyodide.globals.get('_split_json');
}

self.onmessage = async (ev) => {
  const msg = ev.data || {};
  if (msg.cmd === 'boot') {
    try {
      await boot(msg.base);
      self.postMessage({ type: 'booted' });
    } catch (e) {
      self.postMessage({ type: 'bootfail', error: String(e && e.message ? e.message : e) });
    }
    return;
  }
  if (msg.cmd === 'features') {
    let features = null;
    try { features = JSON.parse(featurer(msg.code)); } catch (e) { features = null; }
    self.postMessage({ type: 'result', id: msg.id, features: features });
    return;
  }
  if (msg.cmd === 'split') {
    let plan = null;
    try { plan = JSON.parse(splitter(msg.code, msg.name || '', JSON.stringify(msg.qids || []))); } catch (e) { plan = null; }
    self.postMessage({ type: 'result', id: msg.id, plan: plan });
    return;
  }
  if (msg.cmd === 'run') {
    const started = Date.now();
    try {
      const res = JSON.parse(runner(msg.code, msg.stdin));
      res.type = 'result';
      res.id = msg.id;
      res.ms = Date.now() - started;
      self.postMessage(res);
    } catch (e) {
      // 連 harness 都炸了（例如 os._exit 把直譯器關掉）
      self.postMessage({
        type: 'result', id: msg.id, stdout: '', status: 'error',
        stderr: 'Python 直譯器中止：' + String(e && e.message ? e.message : e),
        ms: Date.now() - started, fatal: true,
      });
    }
  }
};
