/* HW1 自動批改 — Python 執行 worker
 * 每個 worker 內含一份 Pyodide（瀏覽器裡的 CPython）。
 * 學生程式在這裡執行，input() 由測資餵入，stdout 被攔截下來比對。
 *
 * 防禦重點（都是真的會遇到的學生程式）：
 *   - 學生把 sys.stdout 關掉 / 換掉  -> 我們的 buffer 不怕被 close()
 *   - 學生一直 print                  -> 輸出到上限就中止，不會把瀏覽器吃爆
 *   - 學生改 builtins 或改 math 模組  -> 每跑完一筆就還原，不會污染下一位同學
 *   - 學生用 __file__ / sys.exit()    -> 都給它，行為跟真的 python 一樣
 *   - 無窮迴圈                        -> 由主執行緒 terminate() 這個 worker（TLE）
 */

let pyodide = null;
let runner = null;

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
`;

async function boot(baseUrl) {
  importScripts(baseUrl + 'pyodide.js');
  // eslint-disable-next-line no-undef
  pyodide = await loadPyodide({ indexURL: baseUrl });
  pyodide.runPython(HARNESS);
  runner = pyodide.globals.get('_run');
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
