/* HW1 自動批改（助教用） — 主程式
 * 一切都在瀏覽器裡完成：學生程式由 Pyodide 執行，不會上傳到任何伺服器。
 *
 * 繳交格式（依作業公告）：學號_HW1.zip -> 學號_HW1/q1.py ~ q6.py
 * 也吃：整包 COOL 下載的 zip（zip 裡面還有 zip）、散裝 .py、整個資料夾、
 *       以及萬一有人交 Colab 的 .ipynb。
 */
(function () {
  'use strict';

  var DATA = window.HW_TESTS;
  var SOLUTIONS = window.HW_SOLUTIONS || {};
  var MUTANTS = window.HW_MUTANTS || {};
  var PROBLEMS = DATA.problems;
  var QIDS = PROBLEMS.map(function (p) { return p.id; });
  var TOTAL_POINTS = PROBLEMS.reduce(function (s, p) { return s + p.points; }, 0);

  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  /* ------------------------------------------------------------------ */
  /* Python 執行引擎（Pyodide 跑在 Web Worker 裡，逾時就整個砍掉重開）      */
  /* ------------------------------------------------------------------ */
  var CDN_BASE = 'https://cdn.jsdelivr.net/pyodide/v0.29.4/full/';

  var Engine = {
    worker: null, ready: false, booting: null, seq: 0, pending: null,
    base: new URL('vendor/pyodide/', location.href).href,
    usedCdn: false,

    boot: function () {
      var self = this;
      if (self.booting) return self.booting;
      self.booting = new Promise(function (resolve, reject) {
        var w = new Worker('assets/worker.js');
        self.worker = w;
        w.onmessage = function (ev) {
          var m = ev.data;
          if (m.type === 'booted') { self.ready = true; resolve(); return; }
          if (m.type === 'bootfail') {
            self.ready = false;
            // 本機 vendor/pyodide 不見了就退而求其次用 CDN
            if (!self.usedCdn) {
              self.usedCdn = true;
              self.base = CDN_BASE;
              w.terminate();
              self.worker = null; self.booting = null;
              resolve(self.boot());
              return;
            }
            reject(new Error(m.error));
            return;
          }
          if (m.type === 'result' && self.pending && self.pending.id === m.id) {
            var p = self.pending; self.pending = null;
            clearTimeout(p.timer);
            // Python 直譯器自己死掉（os._exit、abort）-> 這個 worker 不能再用了
            if (m.fatal) self.restart();
            p.resolve(m);
          }
        };
        w.onerror = function (e) {
          if (self.ready) {            // 開跑之後才死掉：下一次呼叫重開一個
            self.ready = false; self.booting = null; self.worker = null;
            return;
          }
          reject(new Error(e.message || 'worker error'));
        };
        w.postMessage({ cmd: 'boot', base: self.base });
      });
      return self.booting;
    },

    restart: function () {
      if (this.worker) { this.worker.terminate(); this.worker = null; }
      this.ready = false; this.booting = null; this.pending = null;
      return this.boot();
    },

    run: function (code, stdin, timeoutMs) {
      var self = this;
      return self.boot().then(function () {
        return new Promise(function (resolve) {
          var id = ++self.seq;
          var timer = setTimeout(function () {
            if (self.pending && self.pending.id === id) {
              self.pending = null;
              self.restart();
              resolve({
                status: 'timeout', stdout: '', ms: timeoutMs,
                stderr: '執行超過時間限制（無窮迴圈，或程式還在等下一個 input()）'
              });
            }
          }, timeoutMs);
          self.pending = { id: id, resolve: resolve, timer: timer };
          self.worker.postMessage({ cmd: 'run', id: id, code: code, stdin: stdin });
        });
      });
    }
  };

  function setEngineState(cls, text) {
    $('engine').className = 'engine ' + cls;
    $('engineText').textContent = text;
  }

  /* Python 執行環境（Pyodide）解壓後約 11.7 MB。
     這裡先自己抓一次只是為了「看得到進度」，抓完留在瀏覽器快取，
     等一下 Pyodide 抓同樣的網址會直接命中，不會抓第二次。
     注意：伺服器回傳的 content-length 是壓縮後大小，但我們數的是解壓後的
     位元組，所以分母要用檔案的實際大小（寫死），不能用 content-length。 */
  var VENDOR_FILES = [
    ['vendor/pyodide/pyodide.js', 18597],
    ['vendor/pyodide/pyodide-lock.json', 122027],
    ['vendor/pyodide/pyodide.asm.js', 1074322],
    ['vendor/pyodide/python_stdlib.zip', 2424002],
    ['vendor/pyodide/pyodide.asm.wasm', 8647684]
  ];
  var VENDOR_TOTAL = VENDOR_FILES.reduce(function (n, f) { return n + f[1]; }, 0);

  function preloadEngine(onProgress) {
    var got = {};
    function tick() {
      var loaded = 0;
      VENDOR_FILES.forEach(function (f) { loaded += got[f[0]] || 0; });
      onProgress(Math.min(loaded, VENDOR_TOTAL), VENDOR_TOTAL);
    }
    return Promise.all(VENDOR_FILES.map(function (f) {
      var url = f[0];
      return fetch(url).then(function (res) {
        if (!res.ok) return;
        got[url] = 0;
        if (!res.body || !res.body.getReader) {
          return res.arrayBuffer().then(function (b) { got[url] = b.byteLength; tick(); });
        }
        var reader = res.body.getReader();
        return (function pump() {
          return reader.read().then(function (r) {
            if (r.done) return;
            got[url] += r.value.length;      // 解壓後的位元組
            tick();
            return pump();
          });
        })();
      }).catch(function () { /* 抓不到就算了，等下讓 Pyodide 自己想辦法 */ });
    })).then(tick);
  }

  /* Pyodide 會吃掉一兩百 MB 記憶體，所以不要一開頁面就載入：
     等到真的要批改（或放入檔案）才準備。 */
  var enginePromise = null;

  function ensureEngine() {
    if (enginePromise) return enginePromise;
    var t0 = Date.now();
    setEngineState('loading', '準備 Python 環境…');
    enginePromise = Promise.race([
      preloadEngine(function (loaded, total) {
        setEngineState('loading', '載入 Python ' + Math.round(loaded / total * 100) + '%');
      }),
      new Promise(function (r) { setTimeout(r, 90000); })   // 預載卡住就不等了
    ]).then(function () {
      setEngineState('loading', '啟動 Python…');
      return Engine.boot();
    }).then(function () {
      setEngineState('ready', 'Python 就緒（' + Math.round((Date.now() - t0) / 1000) + ' 秒）');
    }).catch(function (e) {
      setEngineState('fail', '載入失敗：' + e.message);
      enginePromise = null;
      throw e;
    });
    return enginePromise;
  }

  /* ------------------------------------------------------------------ */
  /* 路徑 -> (學號, 題號)                                                 */
  /* ------------------------------------------------------------------ */
  var ID_RE = /[A-Za-z]\d{7,10}|\d{8,10}/;

  function detectQid(name) {
    var m = name.match(/(?:^|[^a-z0-9])q\s*([1-6])(?![0-9])/i);
    if (m) return 'q' + m[1];
    m = name.match(/第\s*([1-6])\s*題/);
    if (m) return 'q' + m[1];
    var stripped = name.replace(/[A-Za-z]?\d{6,12}/g, '_');      // 先把學號拿掉再找數字
    var all = stripped.match(/(?:^|[^0-9])([1-6])(?![0-9])/g);
    if (all && all.length) {
      var last = all[all.length - 1].match(/([1-6])/);
      if (last) return 'q' + last[1];
    }
    return '';
  }

  /* 學號_HW1/q1.py、COOL 的 wang_123_456_B11901234_HW1.zip/... 都能抓到 */
  function detectStudent(path) {
    var parts = path.split('/').filter(Boolean);
    var base = (parts.pop() || '').replace(/\.[^.]*$/, '');
    for (var i = parts.length - 1; i >= 0; i--) {          // 由內往外找學號
      var hit = parts[i].replace(/\.zip$/i, '').match(ID_RE);
      if (hit) return hit[0].toUpperCase();
    }
    for (i = parts.length - 1; i >= 0; i--) {              // 沒學號就用資料夾名（去掉 _HW1）
      var seg = parts[i].replace(/\.zip$/i, '').replace(/[_\-\s]*HW\s*\d+$/i, '').trim();
      if (seg && !/^(src|code|python|作業|homework|hw\s*\d*)$/i.test(seg)) return seg;
    }
    var own = base.match(ID_RE);
    if (own) return own[0].toUpperCase();
    // 再來才用「最內層資料夾名稱原樣」——絕對不能拿檔名(q1/q2...)當學號，
    // 否則同一個人的六個檔案會被拆成六位「學生」。
    if (parts.length) return parts[parts.length - 1];
    var cleaned = base.replace(/(?:^|[^a-z0-9])q\s*[1-6](?![0-9])/i, '')
      .replace(/第\s*[1-6]\s*題/, '').replace(/^[_\-.\s]+|[_\-.\s]+$/g, '');
    return cleaned || '未知';
  }

  /* ------------------------------------------------------------------ */
  /* Colab / Jupyter 筆記本（保險用：公告是交 .py，但總有人交 .ipynb）      */
  /* ------------------------------------------------------------------ */
  function joinSource(src) { return Array.isArray(src) ? src.join('') : String(src || ''); }

  function cleanCellCode(code) {
    if (/^\s*%%/.test(code)) return '';                    // %%bash 之類整格丟掉
    return code.split('\n').filter(function (line) {
      return !/^\s*[!%]/.test(line);                       // !pip install / %cd
    }).join('\n');
  }

  var KEYWORDS = [
    ['q1', /\bbmi\b/i],
    ['q2', /augend|minuend|divisor|dividend|calculator|計算機/i],
    ['q3', /\bprime\b|質數/i],
    ['q4', /sum\s*of\s*digits|數字和/i],
    ['q5', /password|weak|moderate|strong|密碼/i],
    ['q6', /root|quadratic|判別式|sqrt/i]
  ];

  function guessQidFromText(text) {
    if (!text) return '';
    var m = text.match(/(?:^|[^a-z0-9])q\s*([1-6])(?![0-9])/i) ||
            text.match(/第\s*([1-6一二三四五六])\s*題/) ||
            text.match(/^\s*([1-6])\s*[.、)]/m);
    if (m) {
      var d = '一二三四五六'.indexOf(m[1]);
      return 'q' + (d >= 0 ? d + 1 : m[1]);
    }
    for (var i = 0; i < KEYWORDS.length; i++) {
      if (KEYWORDS[i][1].test(text)) return KEYWORDS[i][0];
    }
    return '';
  }

  function parseNotebook(text) {
    var nb;
    try { nb = JSON.parse(text); } catch (e) { return null; }
    var cells = nb.cells || (nb.worksheets && nb.worksheets[0] && nb.worksheets[0].cells);
    if (!cells) return null;
    var items = [], lastMd = '';
    cells.forEach(function (c) {
      var src = joinSource(c.source !== undefined ? c.source : c.input);
      if (c.cell_type === 'markdown' || c.cell_type === 'heading') { lastMd = src; return; }
      if (c.cell_type !== 'code') return;
      var code = cleanCellCode(src);
      if (!code.replace(/\s|#[^\n]*/g, '')) return;
      items.push({ code: code, hint: lastMd });
      lastMd = '';
    });
    return items;
  }

  /* ------------------------------------------------------------------ */
  /* 檔案載入                                                             */
  /* ------------------------------------------------------------------ */
  var submissions = [];
  var nextKey = 1;

  function addSubmission(path, code, forcedQid) {
    var clean = path.replace(/\s*▸.*$/, '');
    var base = (clean.split('/').pop() || '').replace(/\.[^.]*$/, '');
    submissions.push({
      key: nextKey++,
      path: path,
      student: detectStudent(clean),
      qid: forcedQid !== undefined ? forcedQid : (detectQid(base) || detectQid(clean)),
      code: code
    });
  }

  function ingest(path, text) {
    if (!/\.ipynb$/i.test(path)) { addSubmission(path, text); return; }
    var cells = parseNotebook(text);
    if (!cells || !cells.length) { addSubmission(path, text); return; }
    var fileQid = detectQid(path.replace(/\.[^.]*$/, ''));
    if (cells.length === 1) {
      addSubmission(path + '  ▸ cell 1', cells[0].code,
        fileQid || guessQidFromText(cells[0].hint + '\n' + cells[0].code));
      return;
    }
    var guesses = cells.map(function (c) { return guessQidFromText(c.hint + '\n' + c.code); });
    var anyGuess = guesses.some(function (g) { return g; });
    cells.forEach(function (c, i) {
      var qid = guesses[i];
      if (!qid && !anyGuess && cells.length === QIDS.length) qid = QIDS[i];   // 剛好六格 -> 依序
      addSubmission(path + '  ▸ cell ' + (i + 1), c.code, qid || '');
    });
  }

  /* 學生的 .py 可能是 Windows 記事本存的：UTF-8 BOM、UTF-16，或台灣常見的 Big5。
     直接當 UTF-8 讀會變成亂碼甚至 NUL byte，compile 直接失敗 -> 無辜吃 0 分。 */
  function decodeBytes(buffer) {
    var bytes = new Uint8Array(buffer);
    if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
      return stripBom(new TextDecoder('utf-16le').decode(bytes.subarray(2)));
    }
    if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
      return stripBom(new TextDecoder('utf-16be').decode(bytes.subarray(2)));
    }
    var body = bytes;
    if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
      body = bytes.subarray(3);
    }
    try {
      return stripBom(new TextDecoder('utf-8', { fatal: true }).decode(body));
    } catch (e) {
      try {                                   // 不是合法 UTF-8 -> 當成 Big5
        return stripBom(new TextDecoder('big5').decode(body));
      } catch (e2) {
        return stripBom(new TextDecoder('utf-8').decode(body));
      }
    }
  }

  function stripBom(text) {
    return text.replace(/^\uFEFF+/, '').replace(/\u0000/g, '');
  }

  function readFileText(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () {
        try { resolve(decodeBytes(r.result)); } catch (e) { reject(e); }
      };
      r.onerror = function () { reject(r.error); };
      r.readAsArrayBuffer(file);
    });
  }

  function skipPath(p) { return /(^|\/)(__MACOSX|\._|\.)/.test(p); }

  /* zip 裡面還有 zip（COOL 整包下載）也吃得下，最多往下三層 */
  function loadZip(blob, prefix, depth) {
    if (typeof JSZip === 'undefined') { alert('找不到 JSZip，無法解壓縮。'); return Promise.resolve(); }
    return JSZip.loadAsync(blob).then(function (zip) {
      var jobs = [];
      zip.forEach(function (rel, entry) {
        if (entry.dir || skipPath(rel)) return;
        if (/\.(py|ipynb)$/i.test(rel)) {
          jobs.push(entry.async('arraybuffer').then(function (buf) {
            ingest(prefix + rel, decodeBytes(buf));
          }));
        } else if (/\.zip$/i.test(rel) && depth < 3) {
          jobs.push(entry.async('blob').then(function (b) {
            return loadZip(b, prefix + rel.replace(/\.zip$/i, '') + '/', depth + 1);
          }));
        }
      });
      return Promise.all(jobs);
    }).catch(function (e) {
      alert('解壓縮失敗：' + (e && e.message ? e.message : e));
    });
  }

  function intakeFiles(fileList) {
    var files = Array.prototype.slice.call(fileList);
    var jobs = files.map(function (f) {
      var path = f.webkitRelativePath || f.name;
      if (/\.zip$/i.test(f.name)) {
        return loadZip(f, f.name.replace(/\.zip$/i, '') + '/', 1);
      }
      if (!/\.(py|ipynb)$/i.test(f.name) || skipPath(path)) return Promise.resolve();
      return readFileText(f).then(function (txt) { ingest(path, txt); });
    });
    return Promise.all(jobs).then(function () {
      renderFiles();
      if (submissions.length) ensureEngine().catch(function () {});   // 先暖機
    });
  }

  function walkEntry(entry, prefix, out) {
    return new Promise(function (resolve) {
      if (entry.isFile) {
        entry.file(function (f) {
          if (/\.(py|ipynb|zip)$/i.test(f.name)) {
            try { Object.defineProperty(f, 'webkitRelativePath', { value: prefix + f.name }); } catch (e) { /* noop */ }
            out.push(f);
          }
          resolve();
        }, resolve);
      } else if (entry.isDirectory) {
        var reader = entry.createReader(), all = [];
        var readBatch = function () {
          reader.readEntries(function (entries) {
            if (!entries.length) {
              Promise.all(all.map(function (e) { return walkEntry(e, prefix + entry.name + '/', out); })).then(resolve);
              return;
            }
            all = all.concat(entries);
            readBatch();
          }, resolve);
        };
        readBatch();
      } else { resolve(); }
    });
  }

  /* ------------------------------------------------------------------ */
  /* 對應表                                                               */
  /* ------------------------------------------------------------------ */
  function renderFiles() {
    var tbody = $('filesTable').querySelector('tbody');
    tbody.innerHTML = '';
    $('filesCard').hidden = submissions.length === 0;
    $('fileCount').textContent = submissions.length + ' 個程式';
    $('runAll').disabled = submissions.length === 0;

    var seen = {}, dup = false, unknown = 0, students = {};
    submissions.forEach(function (s) {
      var tr = el('tr');
      tr.appendChild(el('td', 'small', s.path));

      var tdS = el('td');
      var inp = el('input');
      inp.value = s.student; inp.size = 16;
      inp.onchange = function () { s.student = inp.value.trim(); renderFiles(); };
      tdS.appendChild(inp);
      tr.appendChild(tdS);

      var tdQ = el('td');
      var sel = el('select');
      var opt0 = el('option', '', '未指定'); opt0.value = '';
      sel.appendChild(opt0);
      PROBLEMS.forEach(function (p) {
        var o = el('option', '', p.id.toUpperCase() + ' ' + p.name);
        o.value = p.id;
        sel.appendChild(o);
      });
      sel.value = s.qid || '';
      sel.onchange = function () { s.qid = sel.value; renderFiles(); };
      tdQ.appendChild(sel);
      tr.appendChild(tdQ);

      tr.appendChild(el('td', 'muted small', String(s.code.split('\n').length)));

      var tdX = el('td');
      var b = el('button', 'btn ghost danger', '移除');
      b.onclick = function () {
        submissions = submissions.filter(function (x) { return x.key !== s.key; });
        renderFiles();
      };
      tdX.appendChild(b);
      tr.appendChild(tdX);
      tbody.appendChild(tr);

      students[s.student] = true;
      if (!s.qid) unknown++;
      var k = s.student + '|' + s.qid;
      if (s.qid) { if (seen[k]) dup = true; seen[k] = true; }
    });

    var nStu = Object.keys(students).length;
    var msgs = ['共 ' + nStu + ' 位學生。'];
    submissions.length && Object.keys(students).forEach(function (st) {
      var got = submissions.filter(function (s) { return s.student === st && s.qid; })
        .map(function (s) { return s.qid; });
      var missing = QIDS.filter(function (q) { return got.indexOf(q) < 0; });
      if (missing.length && missing.length < QIDS.length) {
        msgs.push(st + ' 缺 ' + missing.map(function (q) { return q.toUpperCase(); }).join('、') + '。');
      }
    });
    if (unknown) msgs.push('有 ' + unknown + ' 個檔案沒辨識出題號，請手動指定或按「自動配對」，未指定者不會批改。');
    if (dup) msgs.push('同一位學生的同一題有多份，全部都會跑，成績取最高並標 ⚠。');
    $('fileWarn').textContent = msgs.join(' ');
  }

  /* ------------------------------------------------------------------ */
  /* 比對                                                                 */
  /* ------------------------------------------------------------------ */
  function normalize(text, mode) {
    var lines = String(text === undefined || text === null ? '' : text)
      .replace(/\r\n?/g, '\n').split('\n')
      .map(function (l) { return l.replace(/[ \t]+$/, ''); });
    while (lines.length && lines[lines.length - 1] === '') lines.pop();
    if (mode === 'trim') lines = lines.map(function (l) { return l.trim(); });
    if (mode === 'loose') return lines.join('\n').replace(/\s+/g, '').toLowerCase();
    return lines.join('\n');
  }

  /* 同一筆測資的「逐行版」：把空白與逗號換成換行。
     老師的規定是「一行就是一次 input()」，所以這是預設關閉的非標準選項；
     打開之後，一個值一個 input() 讀的同學會用逐行輸入再跑一次。 */
  function altInput(text) {
    var alt = String(text).replace(/[,\s]+/g, '\n').trim();
    return (alt !== String(text).trim() && alt.indexOf('\n') >= 0) ? alt : '';
  }

  function problemOf(qid) {
    return PROBLEMS.filter(function (p) { return p.id === qid; })[0];
  }

  /* ------------------------------------------------------------------ */
  /* 批改                                                                 */
  /* ------------------------------------------------------------------ */
  var results = null;

  function settings() {
    return {
      mode: $('compareMode').value,
      timeout: Math.max(1, parseInt($('timeout').value, 10) || 8) * 1000,
      stopOnFirst: $('stopOnFirst').checked,
      lenientRe: $('lenientRe') ? $('lenientRe').checked : true,
      lenientInput: $('lenientInput') ? $('lenientInput').checked : false
    };
  }

  function alt2text(input) {
    return altInput(input) + '\n（原本是「' + input + '」一行，這位同學是一個值一個 input() 讀的）';
  }

  function cut(text, n) {
    text = String(text === undefined || text === null ? '' : text);
    return text.length > n ? text.slice(0, n) + '…（已截斷）' : text;
  }

  function busy(on) {
    $('runAll').disabled = on || submissions.length === 0;
    $('selfTest').disabled = on;
    $('autoMatch').disabled = on;
    $('progressBox').hidden = !on && !results;
  }

  function gradeList(list, label) {
    var cfg = settings();
    ensureEngine().catch(function () {});
    var totalRuns = list.length * PROBLEMS[0].tests.length;
    var done = 0;
    $('progressBox').hidden = false;
    busy(true);

    var out = {};
    var chain = Promise.resolve();

    list.forEach(function (sub) {
      if (!sub.qid) return;
      var prob = problemOf(sub.qid);
      chain = chain.then(function () {
        var rec = {
          score: 0, max: prob.points, cases: [], passed: 0, reok: 0, viaAlt: 0,
          file: sub.path, qid: prob.id
        };
        var inner = Promise.resolve();
        var stopped = '';
        var tleCount = 0;
        prob.tests.forEach(function (t) {
          inner = inner.then(function () {
            if (stopped) {
              rec.cases.push({ n: t.n, status: 'skip', input: t.input, expected: t.expected,
                               actual: '', stderr: '', note: t.note, kind: t.kind, why: stopped });
              done++;
              return;
            }
            return Engine.run(sub.code, t.input + '\n', cfg.timeout).then(function (r) {
              // 讀到 EOF（同學一個值一個 input()）-> 換成逐行輸入再給一次機會
              var alt = altInput(t.input);
              // 不只 EOF：float("1.75 68") 這種也是「他一個值一個 input() 讀」造成的
              if (cfg.lenientInput && r.status === 'error' && alt) {
                return Engine.run(sub.code, alt + '\n', cfg.timeout).then(function (r2) {
                  if (normalize(r2.stdout, cfg.mode) === normalize(t.expected, cfg.mode)) {
                    r2.viaAlt = true;
                    return r2;
                  }
                  return r;                                  // 換了也沒用，回報原本的錯
                });
              }
              return r;
            }).then(function (r) {
              var outputOk = normalize(r.stdout, cfg.mode) === normalize(t.expected, cfg.mode);
              var status;
              if (r.status === 'ok') status = outputOk ? 'ac' : 'wa';
              else if (outputOk) status = 'reok';          // 輸出對了，但程式後來才出事
              else if (r.status === 'timeout') status = 'tle';
              else status = 're';

              var passed = status === 'ac' || (status === 'reok' && cfg.lenientRe);
              if (passed) { rec.score += prob.pointsPerTest; rec.passed++; }
              if (status === 'reok') rec.reok++;
              if (r.viaAlt) rec.viaAlt++;
              if (status === 'tle') tleCount++;

              if (!passed && cfg.stopOnFirst) stopped = '前面已經錯了，依設定略過剩下的測資';
              // 無窮迴圈的人不要讓他把 10 次逾時都跑完（每次逾時都要重開直譯器）
              if (tleCount >= 2 && !stopped) stopped = '連續逾時兩次，直接判定其餘測資也會逾時';

              rec.cases.push({
                n: t.n, status: status, input: r.viaAlt ? alt2text(t.input) : t.input,
                expected: t.expected, actual: cut(r.stdout, 3000), stderr: cut(r.stderr, 1500),
                note: t.note, kind: t.kind, ms: r.ms, viaAlt: !!r.viaAlt
              });
              done++;
              $('bar').style.width = Math.round(done / totalRuns * 100) + '%';
              $('progressText').textContent = label + '：' + done + ' / ' + totalRuns +
                '（' + sub.student + ' ' + sub.qid.toUpperCase() + '）';
            });
          });
        });
        return inner.then(function () {
          rec.score = Math.round(rec.score * 100) / 100;
          if (!out[sub.student]) out[sub.student] = {};
          var prev = out[sub.student][sub.qid];
          if (!prev || rec.score > prev.score) {
            rec.conflict = !!prev;
            out[sub.student][sub.qid] = rec;
          } else { prev.conflict = true; }
        });
      });
    });

    return chain.then(function () {
      $('bar').style.width = '100%';
      $('progressText').textContent = label + '完成，共執行 ' + done + ' 筆測資。';
      busy(false);
      return out;
    });
  }

  /* 用每題前 2 筆測資試跑，決定沒指定題號的檔案是哪一題 */
  function autoMatch() {
    var targets = submissions.filter(function (s) { return !s.qid; });
    if (!targets.length) { alert('沒有未指定題號的檔案。'); return; }
    ensureEngine().catch(function () {});
    var cfg = settings();
    var total = targets.length * PROBLEMS.length * 2, done = 0;
    $('progressBox').hidden = false;
    busy(true);

    var chain = Promise.resolve();
    targets.forEach(function (sub) {
      chain = chain.then(function () {
        var best = { qid: '', hit: 0 };
        var inner = Promise.resolve();
        PROBLEMS.forEach(function (p) {
          inner = inner.then(function () {
            var hit = 0;
            var two = Promise.resolve();
            p.tests.slice(0, 2).forEach(function (t) {
              two = two.then(function () {
                return Engine.run(sub.code, t.input + '\n', cfg.timeout).then(function (r) {
                  if (r.status === 'ok' && normalize(r.stdout, cfg.mode) === normalize(t.expected, cfg.mode)) hit++;
                  done++;
                  $('bar').style.width = Math.round(done / total * 100) + '%';
                  $('progressText').textContent = '自動配對：' + done + ' / ' + total;
                });
              });
            });
            return two.then(function () { if (hit > best.hit) best = { qid: p.id, hit: hit }; });
          });
        });
        return inner.then(function () { if (best.hit >= 1) sub.qid = best.qid; });
      });
    });

    return chain.then(function () {
      busy(false);
      $('progressText').textContent = '自動配對完成。';
      renderFiles();
    });
  }

  /* ------------------------------------------------------------------ */
  /* 成績表                                                               */
  /* ------------------------------------------------------------------ */
  function renderScores(out) {
    results = out;
    $('resultCard').hidden = false;
    var head = $('scoreHead');
    head.innerHTML = '';
    head.appendChild(el('th', '', '學生'));
    PROBLEMS.forEach(function (p) { head.appendChild(el('th', '', p.id.toUpperCase() + '（' + p.points + '）')); });
    head.appendChild(el('th', '', '總分（' + TOTAL_POINTS + '）'));

    var tbody = $('scoreTable').querySelector('tbody');
    tbody.innerHTML = '';
    var students = Object.keys(out).sort();
    var sum = 0, full = 0;

    students.forEach(function (name) {
      var tr = el('tr');
      tr.appendChild(el('td', '', name));
      var total = 0;
      PROBLEMS.forEach(function (p) {
        var rec = out[name][p.id];
        var td = el('td', 'score');
        if (!rec) {
          td.className += ' miss';
          td.textContent = '—';
          td.title = '沒有這一題的檔案';
        } else {
          total += rec.score;
          td.textContent = rec.score + (rec.conflict ? ' ⚠' : '');
          if (rec.score === rec.max) td.className += ' full';
          else if (rec.score === 0) td.className += ' zero';
          td.title = rec.passed + '/' + rec.cases.length + ' 筆通過 · ' + rec.file + '（點擊看細節）';
          td.onclick = function () { renderDetail(name, p, rec); };
        }
        tr.appendChild(td);
      });
      total = Math.round(total * 100) / 100;
      sum += total;
      if (total === TOTAL_POINTS) full++;
      tr.appendChild(el('td', 'total', String(total)));
      tbody.appendChild(tr);
    });

    var reokTotal = 0, altTotal = 0;
    students.forEach(function (name) {
      PROBLEMS.forEach(function (p) {
        var rec = out[name][p.id];
        if (rec) { reokTotal += rec.reok || 0; altTotal += rec.viaAlt || 0; }
      });
    });
    $('summaryStat').textContent = students.length + ' 位學生 · 平均 ' +
      (students.length ? Math.round(sum / students.length * 10) / 10 : 0) + ' 分 · 滿分 ' + full + ' 位';
    var noteBox = $('gradeNote');
    var msgs = [];
    if (reokTotal) {
      msgs.push('有 ' + reokTotal + ' 筆「輸出完全正確，但程式印完之後才出錯」'
        + '（最常見是結尾多一個 input("按 Enter")），目前'
        + ($('lenientRe').checked ? '算通過' : '算錯') + '。');
    }
    if (altTotal) {
      msgs.push('有 ' + altTotal + ' 筆是同學把一行輸入拆成好幾個 input() 讀，'
        + '已改用逐行輸入重跑並以答案為準。');
    }
    noteBox.hidden = msgs.length === 0;
    noteBox.textContent = msgs.join(' ') + (msgs.length ? '（選項在上面，改完要重新批改）' : '');
    $('resultCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  var STATUS_TEXT = {
    ac: '正確', wa: '答案錯誤', re: '執行錯誤', tle: '執行逾時',
    reok: '輸出正確但程式出錯', skip: '未執行'
  };

  function renderDetail(student, prob, rec) {
    var box = $('detail');
    box.hidden = false;
    box.innerHTML = '';
    box.appendChild(el('h3', '', student + ' — ' + prob.id.toUpperCase() + ' ' + prob.name +
      '：' + rec.score + ' / ' + rec.max + ' 分（' + rec.passed + '/' + rec.cases.length + ' 筆通過）'));
    box.appendChild(el('p', 'muted small', '檔案：' + rec.file));

    rec.cases.forEach(function (c) {
      var wrap = el('div', 'case ' + (c.status === 'skip' ? '' : c.status));
      var head = el('div', 'head');
      head.appendChild(el('span', 'tag ' + (c.status === 'skip' ? '' : c.status), STATUS_TEXT[c.status]));
      head.appendChild(el('strong', '', '#' + c.n));
      head.appendChild(el('span', 'kind ' + c.kind,
        c.kind === 'example' ? '題目範例' : (c.kind === 'special' ? '特殊測資' : '隨機測資')));
      head.appendChild(el('span', 'muted small', c.why ? c.note + '（' + c.why + '）' : c.note));
      wrap.appendChild(head);

      if (c.status !== 'ac' && c.status !== 'skip') {
        var grid = el('div', 'grid2');
        var a = el('div'), b = el('div');
        a.appendChild(el('span', 'lbl', '輸入'));
        a.appendChild(el('pre', '', c.input));
        b.appendChild(el('span', 'lbl', '應該輸出'));
        b.appendChild(el('pre', '', c.expected));
        grid.appendChild(a); grid.appendChild(b);
        wrap.appendChild(grid);
        var got = el('div');
        got.appendChild(el('span', 'lbl', '實際輸出'));
        got.appendChild(el('pre', '', c.actual === '' ? '（沒有任何輸出）' : c.actual));
        wrap.appendChild(got);
        if (c.stderr) {
          var e = el('div');
          e.appendChild(el('span', 'lbl', '錯誤訊息'));
          e.appendChild(el('pre', '', c.stderr));
          wrap.appendChild(e);
        }
      }
      box.appendChild(wrap);
    });
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ------------------------------------------------------------------ */
  /* 匯出                                                                 */
  /* ------------------------------------------------------------------ */
  function download(name, text, type) {
    var blob = new Blob(['﻿' + text], { type: (type || 'text/plain') + ';charset=utf-8' });
    var a = el('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }

  function toCsv() {
    var rows = [];
    var head = ['學號'];
    PROBLEMS.forEach(function (p) { head.push(p.id.toUpperCase() + '(' + p.points + ')'); });
    head.push('總分');
    PROBLEMS.forEach(function (p) { head.push(p.id.toUpperCase() + '通過筆數'); });
    rows.push(head);
    Object.keys(results).sort().forEach(function (name) {
      var row = [name], total = 0, pass = [];
      PROBLEMS.forEach(function (p) {
        var rec = results[name][p.id];
        row.push(rec ? rec.score : '');
        pass.push(rec ? rec.passed + '/' + rec.cases.length : '未繳交');
        if (rec) total += rec.score;
      });
      row.push(Math.round(total * 100) / 100);
      rows.push(row.concat(pass));
    });
    return rows.map(function (r) {
      return r.map(function (v) {
        v = String(v);
        if (/^[=+\-@]/.test(v)) v = "'" + v;        // 避免 Excel 把它當公式
        return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
      }).join(',');
    }).join('\n');
  }

  /* ------------------------------------------------------------------ */
  /* 測資 / 參考解答檢視                                                   */
  /* ------------------------------------------------------------------ */
  function renderTests(qid) {
    var prob = problemOf(qid);
    var box = $('viewer');
    box.hidden = false;
    box.innerHTML = '';
    box.appendChild(el('h3', '', prob.id.toUpperCase() + ' ' + prob.name +
      '：' + prob.tests.length + ' 組測資，每組 ' + prob.pointsPerTest + ' 分'));
    var tbl = el('table');
    var thead = el('thead'), htr = el('tr');
    ['#', '類型', '輸入', '正確輸出', '說明'].forEach(function (h) { htr.appendChild(el('th', '', h)); });
    thead.appendChild(htr);
    tbl.appendChild(thead);
    var tb = el('tbody');
    prob.tests.forEach(function (t) {
      var tr = el('tr');
      tr.appendChild(el('td', '', String(t.n)));
      var k = el('td');
      k.appendChild(el('span', 'kind ' + t.kind,
        t.kind === 'example' ? '題目範例' : (t.kind === 'special' ? '特殊測資' : '隨機測資')));
      tr.appendChild(k);
      var i = el('td'); i.appendChild(el('code', '', t.input)); tr.appendChild(i);
      var o = el('td'); o.appendChild(el('code', '', t.expected)); tr.appendChild(o);
      tr.appendChild(el('td', 'muted small', t.note));
      tb.appendChild(tr);
    });
    tbl.appendChild(tb);
    var w = el('div', 'tablewrap');
    w.appendChild(tbl);
    box.appendChild(w);
  }

  function renderSolution(qid) {
    var box = $('viewer');
    box.hidden = false;
    box.innerHTML = '';
    box.appendChild(el('h3', '', qid.toUpperCase() + ' 參考解答（只用課內語法）'));
    box.appendChild(el('pre', '', SOLUTIONS[qid] || '（找不到）'));
  }

  function testsAsText() {
    var out = [];
    PROBLEMS.forEach(function (p) {
      out.push('=== ' + p.id.toUpperCase() + ' ' + p.name +
        '（' + p.points + ' 分，每組 ' + p.pointsPerTest + ' 分）===');
      p.tests.forEach(function (t) {
        out.push('--- #' + t.n + ' [' + t.kind + '] ' + t.note);
        out.push('input : ' + t.input);
        out.push('output: ' + t.expected);
      });
      out.push('');
    });
    return out.join('\n');
  }

  /* ------------------------------------------------------------------ */
  /* 綁定                                                                 */
  /* ------------------------------------------------------------------ */
  function init() {
    PROBLEMS.forEach(function (p) {
      var o = el('option', '', p.id.toUpperCase() + ' ' + p.name);
      o.value = p.id;
      $('viewQ').appendChild(o);
    });

    if (location.protocol === 'file:') {
      setEngineState('fail', '請用 http 開啟（GitHub Pages，或 python3 -m http.server）');
    } else {
      setEngineState('idle', 'Python 尚未載入（放入檔案時才會準備）');
    }

    $('pickFiles').onclick = function () { $('fileInput').click(); };
    $('pickDir').onclick = function () { $('dirInput').click(); };
    $('fileInput').onchange = function (e) { intakeFiles(e.target.files); e.target.value = ''; };
    $('dirInput').onchange = function (e) { intakeFiles(e.target.files); e.target.value = ''; };

    var drop = $('drop');
    ['dragenter', 'dragover'].forEach(function (t) {
      drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('over'); });
    });
    ['dragleave', 'drop'].forEach(function (t) {
      drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.remove('over'); });
    });
    drop.addEventListener('drop', function (e) {
      var items = e.dataTransfer.items, entries = [];
      if (items && items.length && items[0].webkitGetAsEntry) {
        for (var i = 0; i < items.length; i++) {
          var en = items[i].webkitGetAsEntry();
          if (en) entries.push(en);
        }
      }
      if (entries.length) {
        var files = [];
        Promise.all(entries.map(function (en) { return walkEntry(en, '', files); }))
          .then(function () { return intakeFiles(files); });
      } else {
        intakeFiles(e.dataTransfer.files);
      }
    });

    $('clearFiles').onclick = function () { submissions = []; results = null; renderFiles(); };
    $('autoMatch').onclick = autoMatch;

    $('loadDemo').onclick = function () {
      ensureEngine().catch(function () {});
      QIDS.forEach(function (q) {
        if (SOLUTIONS[q]) addSubmission('參考解答_HW1/' + q + '.py', SOLUTIONS[q]);
      });
      Object.keys(MUTANTS).forEach(function (name) {
        var q = name.slice(0, 2);
        addSubmission('漏洞範例-' + name.replace(/\.py$/, '') + '_HW1/' + q + '.py', MUTANTS[name]);
      });
      renderFiles();
    };

    $('runAll').onclick = function () {
      var list = submissions.filter(function (s) { return s.qid; });
      if (!list.length) { alert('沒有已指定題號的檔案。'); return; }
      gradeList(list, '批改中').then(renderScores);
    };

    $('selfTest').onclick = function () {
      var list = QIDS.filter(function (q) { return SOLUTIONS[q]; }).map(function (q) {
        return { key: 0, path: 'solutions/' + q + '.py', student: '參考解答', qid: q, code: SOLUTIONS[q] };
      });
      gradeList(list, '驗證參考解答').then(function (out) {
        renderScores(out);
        var total = 0;
        Object.keys(out).forEach(function (s) {
          QIDS.forEach(function (q) { if (out[s][q]) total += out[s][q].score; });
        });
        alert(total === TOTAL_POINTS
          ? '參考解答拿到 ' + total + ' / ' + TOTAL_POINTS + ' 分，測資與批改程式一致。'
          : '注意：參考解答只拿到 ' + total + ' / ' + TOTAL_POINTS + ' 分，請檢查測資或執行環境。');
      });
    };

    $('exportCsv').onclick = function () { if (results) download('hw1_成績.csv', toCsv(), 'text/csv'); };
    $('exportJson').onclick = function () {
      if (results) download('hw1_批改明細.json', JSON.stringify(results, null, 1), 'application/json');
    };
    $('viewTests').onclick = function () { renderTests($('viewQ').value); };
    $('viewSol').onclick = function () { renderSolution($('viewQ').value); };
    $('downloadTests').onclick = function () { download('hw1_測資.txt', testsAsText()); };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
