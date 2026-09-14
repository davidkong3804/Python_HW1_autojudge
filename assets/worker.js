/* HW1 自動批改 — Python 執行 worker
 * 每個 worker 內含一份 Pyodide（瀏覽器裡的 CPython）。
 * 學生程式在這裡執行，input() 由測資餵入，stdout 被攔截下來比對。
 * 無窮迴圈由主執行緒 terminate() 這個 worker 處理（TLE）。
 */

let pyodide = null;
let runner = null;

const HARNESS = `
import builtins, io, sys, traceback, json

class _OutputLimit(Exception):
    pass

class _Writer(io.StringIO):
    def __init__(self, cap):
        io.StringIO.__init__(self)
        self._cap = cap
        self._n = 0
    def write(self, s):
        self._n += len(s)
        if self._n > self._cap:
            raise _OutputLimit('output too long')
        return io.StringIO.write(self, s)

def _run(code, stdin_text):
    lines = stdin_text.split('\\n')
    if lines and lines[-1] == '':
        lines.pop()
    state = {'i': 0}

    def fake_input(prompt=''):
        if state['i'] >= len(lines):
            raise EOFError('EOF when reading a line')
        state['i'] += 1
        return lines[state['i'] - 1]

    out = _Writer(200000)
    err = _Writer(200000)
    old = (sys.stdout, sys.stderr, sys.stdin, builtins.input)
    sys.stdout, sys.stderr = out, err
    sys.stdin = io.StringIO(stdin_text)
    builtins.input = fake_input
    status, tb = 'ok', ''
    try:
        g = {'__name__': '__main__'}
        exec(compile(code, 'student.py', 'exec'), g)
    except _OutputLimit:
        status = 'overflow'
        tb = '輸出超過 200000 個字元（可能是無窮迴圈一直 print）'
    except SystemExit:
        pass
    except BaseException:
        status = 'error'
        etype, evalue, etb = sys.exc_info()
        tb = ''.join(traceback.format_exception(etype, evalue, etb.tb_next if etb else None))
    finally:
        sys.stdout, sys.stderr, sys.stdin, builtins.input = old
    return json.dumps({'stdout': out.getvalue(), 'stderr': err.getvalue() + tb, 'status': status})
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
      const raw = runner(msg.code, msg.stdin);
      const res = JSON.parse(raw);
      res.type = 'result';
      res.id = msg.id;
      res.ms = Date.now() - started;
      self.postMessage(res);
    } catch (e) {
      self.postMessage({
        type: 'result', id: msg.id, stdout: '', status: 'error',
        stderr: String(e && e.message ? e.message : e), ms: Date.now() - started,
      });
    }
  }
};
