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
  var DEFAULT_TOTAL = PROBLEMS.reduce(function (s, p) { return s + p.points; }, 0);

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
  /* --8<-- detect:start（tools/test_detect.py 會把這段抓出來，用 node 跟 Python 版對拍） */

  /* 學號有兩種長相：
   *   含字母 —— B11901234、B15A01308（中間夾字母的也算）
   *   純數字 —— 8~10 碼
   * 舊的寫法 /[A-Za-z]\d{7,10}|\d{8,10}/ 只認得「一個字母 + 一串數字」，
   * 碰到 B15A01308 時「B」後面只跟得到 2 個數字就斷掉，整段比對失敗，
   * 於是退而抓到 COOL 塞在路徑裡的使用者編號（例如 10213134），把學號判成別人的。
   * 改成先把路徑切成 token 再分級判定：公告格式的「學號_HW1」資料夾最優先，
   * 其次是含字母的學號，純數字排最後。 */
  function idTokens(segment) {
    return segment.split(/[^A-Za-z0-9]+/).filter(Boolean);
  }

  function isIdWithLetter(tok) {
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(tok)) return false;
    if (tok.length < 6 || tok.length > 12) return false;
    if (/^hw\d+$/i.test(tok)) return false;              // HW20241231 這種資料夾名不是學號
    return tok.replace(/\D/g, '').length >= 4;
  }

  function isIdDigits(tok) {
    return /^\d{8,10}$/.test(tok);
  }

  /* 第一級：公告格式的「學號_HW1」，取 HW 前面最後一個 token */
  function idFromHwFolder(segment) {
    var m = segment.match(/^(.*?)[_\-\s]*HW\s*\d+$/i);
    if (!m || !m[1]) return '';
    var toks = idTokens(m[1]);
    if (!toks.length) return '';
    var last = toks[toks.length - 1];
    return (isIdWithLetter(last) || isIdDigits(last)) ? last.toUpperCase() : '';
  }

  /* 第二級：含字母的學號；第三級：純數字 */
  function idFromTokens(segment, wantLetters) {
    var toks = idTokens(segment);
    for (var i = 0; i < toks.length; i++) {
      if (wantLetters ? isIdWithLetter(toks[i]) : isIdDigits(toks[i])) return toks[i].toUpperCase();
    }
    return '';
  }

  var ID_FINDERS = [
    idFromHwFolder,
    function (s) { return idFromTokens(s, true); },
    function (s) { return idFromTokens(s, false); }
  ];

  function detectQid(name) {
    var m = name.match(/(?:^|[^a-z0-9])q\s*([1-6])(?![0-9])/i);
    if (m) return 'q' + m[1];
    m = name.match(/第\s*([1-6])\s*題/);
    if (m) return 'q' + m[1];
    // 先把學號和「HW1」這種作業編號拿掉再找數字：不然路徑裡的 _HW1 會讓
    // 任何認不出題號的檔案都被判成 Q1，默默掛到第一題去
    var stripped = name.replace(/HW\s*\d+/ig, '_').replace(/[A-Za-z]?\d{6,12}/g, '_');
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
    var segs = [];
    for (var i = parts.length - 1; i >= 0; i--) {        // 由內往外找
      segs.push(parts[i].replace(/\.zip$/i, ''));
    }
    for (var f = 0; f < ID_FINDERS.length; f++) {        // 先把所有層都用高優先級的規則掃過一輪
      for (i = 0; i < segs.length; i++) {
        var hit = ID_FINDERS[f](segs[i]);
        if (hit) return hit;
      }
    }
    for (i = 0; i < segs.length; i++) {                  // 沒學號就用資料夾名（去掉 _HW1）
      var seg = segs[i].replace(/[_\-\s]*HW\s*\d+$/i, '').trim();
      if (seg && !/^(src|code|python|作業|homework|hw\s*\d*)$/i.test(seg)) return seg;
    }
    for (f = 0; f < ID_FINDERS.length; f++) {
      var own = ID_FINDERS[f](base);
      if (own) return own;
    }
    // 再來才用「最內層資料夾名稱原樣」——絕對不能拿檔名(q1/q2...)當學號，
    // 否則同一個人的六個檔案會被拆成六位「學生」。
    if (parts.length) return parts[parts.length - 1];
    var cleaned = base.replace(/(?:^|[^a-z0-9])q\s*[1-6](?![0-9])/i, '')
      .replace(/第\s*[1-6]\s*題/, '').replace(/^[_\-.\s]+|[_\-.\s]+$/g, '');
    return cleaned || '未知';
  }

  /* --8<-- detect:end */

  /* COOL 下載的資料夾會把姓名夾在中間：
       b15107040#_梁宸華 (Liang, Chen-Hua)_352729_10220667_B15107040_HW1
     抓出「梁宸華 (Liang, Chen-Hua)」用來顯示。純顯示用，不影響批改。 */
  function detectName(path) {
    var parts = path.split('/').filter(Boolean);
    for (var i = 0; i < parts.length; i++) {
      var m = parts[i].replace(/\.zip$/i, '').match(/#_(.+)$/);
      if (!m) continue;
      var rest = m[1]
        .replace(/(?:_\d+)*(?:_[A-Za-z0-9]+)?[_\-\s]*HW\s*\d+$/i, '')   // _流水號_編號_學號_HW1
        .replace(/(?:_\d+)+$/, '')
        .replace(/^[_\-\s]+|[_\-\s]+$/g, '');
      if (rest) return rest;
    }
    return '';
  }

  /* 「梁宸華 (Liang, Chen-Hua)」-> 顯示「梁宸華」，完整的放 title */
  function shortName(name) {
    var m = name.match(/^(.+?)\s*[（(].+[）)]\s*$/);
    return m ? m[1].trim() : name;
  }

  /* 繳交的作業編號：公告格式是「學號_HW1」，抓出 HW1 */
  function detectHw(path) {
    var parts = path.split('/').filter(Boolean);
    for (var i = parts.length - 1; i >= 0; i--) {
      var m = parts[i].replace(/\.zip$/i, '').match(/(HW\s*\d+)$/i);
      if (m) return m[1].toUpperCase().replace(/\s+/g, '');
    }
    return '';
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
  var expanded = {};          // 學號 -> 是否展開
  var seenGroup = {};         // 出現過的學號（用來決定要不要自動展開）
  var onlyProblem = false;

  function groupSubmissions() {
    var order = [], byStudent = {};
    submissions.forEach(function (sub) {
      var k = sub.student || '未知';
      if (!byStudent[k]) {
        byStudent[k] = { student: k, name: '', hw: '', files: [] };
        order.push(k);
      }
      var g = byStudent[k];
      g.files.push(sub);
      if (!g.name) g.name = detectName(sub.path);
      if (!g.hw) g.hw = detectHw(sub.path);
    });
    order.sort();
    return order.map(function (k) {
      var g = byStudent[k];
      var got = {}, dup = false, unknown = 0;
      g.files.forEach(function (sub) {
        if (!sub.qid) { unknown++; return; }
        if (got[sub.qid]) dup = true;
        got[sub.qid] = true;
      });
      g.got = got;
      g.dup = dup;
      g.unknown = unknown;
      g.missing = QIDS.filter(function (q) { return !got[q]; });
      g.needsWork = unknown > 0 || dup || g.missing.length > 0 || k === '未知';
      return g;
    });
  }

  /* 檔名只顯示看得懂的那一截：COOL 塞在前面的流水號對助教沒有意義。
     同一位學生底下有同名檔案時，才補上它的上層資料夾以資區別。 */
  function fileLabel(sub, group) {
    var parts = sub.path.replace(/\s*▸.*$/, '').split('/').filter(Boolean);
    var base = parts[parts.length - 1] || sub.path;
    var same = group.files.filter(function (o) {
      var op = o.path.split('/').filter(Boolean);
      return (op[op.length - 1] || '') === base;
    });
    if (same.length > 1 && parts.length > 1) {
      return parts[parts.length - 2] + '/' + base;
    }
    return base;
  }

  function statusPill(g) {
    if (g.unknown) {
      return { cls: 'bad', text: g.unknown + ' 題待指定' };
    }
    if (g.missing.length === QIDS.length) {
      return { cls: 'bad', text: '沒有可批改的題目' };
    }
    if (g.missing.length) {
      return { cls: 'warn', text: '缺 ' + g.missing.map(function (q) { return q.toUpperCase(); }).join('、') };
    }
    if (g.dup) return { cls: 'warn', text: '有重複，取最高分' };
    return { cls: 'ok', text: '六題齊全' };
  }

  function renderFiles() {
    var list = $('subsList');
    list.innerHTML = '';
    $('filesCard').hidden = submissions.length === 0;
    $('runAll').disabled = submissions.length === 0;

    var groups = groupSubmissions();
    var shown = groups.filter(function (g) { return !onlyProblem || g.needsWork; });
    var nWork = groups.filter(function (g) { return g.needsWork; }).length;

    $('fileCount').textContent = groups.length + ' 位學生 · ' + submissions.length + ' 個程式';
    $('subsStat').textContent = nWork
      ? nWork + ' 位需要處理'
      : (groups.length ? '全部都對好了' : '');

    if (!shown.length && groups.length) {
      list.appendChild(el('p', 'muted small', '沒有需要處理的學生，取消勾選就能看到全部。'));
    }

    shown.forEach(function (g) {
      // 第一次看到這位學生、而且有題號還沒指定，就先幫他打開——那才是需要動手的
      if (!seenGroup[g.student]) {
        seenGroup[g.student] = true;
        if (g.unknown) expanded[g.student] = true;
      }
      var open = !!expanded[g.student];
      var box = el('div', 'sub' + (open ? ' open' : '') + (g.needsWork ? ' work' : ''));

      /* ---- 摺疊列 ---- */
      var head = el('div', 'sub-head');
      head.setAttribute('role', 'button');
      head.setAttribute('tabindex', '0');
      head.setAttribute('aria-expanded', open ? 'true' : 'false');

      head.appendChild(el('span', 'sub-caret', '▸'));
      var idn = el('div', 'sub-id');
      idn.appendChild(el('strong', '', g.student));
      if (g.name) {
        var nm = el('span', 'sub-name', shortName(g.name));
        nm.title = g.name;
        idn.appendChild(nm);
      }
      head.appendChild(idn);

      if (g.hw) head.appendChild(el('span', 'tagline', g.hw));
      head.appendChild(el('span', 'sub-count', g.files.length + ' 個檔案'));

      var pill = statusPill(g);
      head.appendChild(el('span', 'state ' + pill.cls, pill.text));

      function toggle() {
        expanded[g.student] = !expanded[g.student];
        renderFiles();
      }
      head.onclick = toggle;
      head.onkeydown = function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      };
      box.appendChild(head);

      /* ---- 展開後的內容 ---- */
      if (open) {
        var body = el('div', 'sub-body');

        var tools = el('div', 'sub-tools');
        var lbl = el('label', 'opt', '這份作業的學號 ');
        var inp = el('input');
        inp.type = 'text';
        inp.value = g.student;
        inp.size = 14;
        inp.onchange = function () {
          var v = inp.value.trim();
          if (!v || v === g.student) { inp.value = g.student; return; }
          g.files.forEach(function (sub) { sub.student = v; });
          expanded[v] = true;
          delete expanded[g.student];
          renderFiles();
        };
        lbl.appendChild(inp);
        tools.appendChild(lbl);
        tools.appendChild(el('span', 'muted small', '改這裡會套用到下面全部檔案'));
        body.appendChild(tools);

        g.files.slice().sort(function (a, b) {
          return (a.qid || 'zz').localeCompare(b.qid || 'zz');
        }).forEach(function (sub) {
          var row = el('div', 'sub-file' + (sub.qid ? '' : ' unset'));

          var fn = el('code', 'sub-fname', fileLabel(sub, g));
          fn.title = sub.path;
          row.appendChild(fn);

          var sel = el('select');
          var opt0 = el('option', '', '未指定（不會批改）');
          opt0.value = '';
          sel.appendChild(opt0);
          PROBLEMS.forEach(function (pr) {
            var o = el('option', '', pr.id.toUpperCase() + ' ' + pr.name);
            o.value = pr.id;
            sel.appendChild(o);
          });
          sel.value = sub.qid || '';
          sel.onchange = function () { sub.qid = sel.value; renderFiles(); };
          row.appendChild(sel);

          row.appendChild(el('span', 'muted small sub-lines',
            sub.code.split('\n').length + ' 行'));

          var del = el('button', 'btn ghost danger small', '移除');
          del.onclick = function () {
            submissions = submissions.filter(function (x) { return x.key !== sub.key; });
            renderFiles();
          };
          row.appendChild(del);
          body.appendChild(row);
        });

        box.appendChild(body);
      }

      list.appendChild(box);
    });

    /* ---- 整批的提醒 ---- */
    var msgs = [];
    var totalUnknown = groups.reduce(function (n, g) { return n + g.unknown; }, 0);
    var anyDup = groups.some(function (g) { return g.dup; });
    if (totalUnknown) {
      msgs.push('有 ' + totalUnknown + ' 個檔案沒辨識出題號，請展開指定或按「自動配對」，未指定的不會批改。');
    }
    if (anyDup) msgs.push('同一位學生的同一題有多份，全部都會跑，成績取最高並標 ⚠。');
    $('fileWarn').textContent = msgs.join(' ');
    $('fileWarn').hidden = !msgs.length;
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
  /* 測資與配分設定                                                        */
  /*                                                                     */
  /* 助教可以關掉某些測資、加自己的測資、改每題配分。設定存在瀏覽器裡，       */
  /* 也可以匯出成 JSON 交給 tools/grade_cli.py --config，讓網頁版與命令列   */
  /* 用完全相同的一套設定批改（兩邊設定不同會算出不同的成績）。             */
  /*                                                                     */
  /* 配分模型：題目總分固定，啟用中的測資平分。關掉一組不會讓總分變少，      */
  /* 而是讓剩下的每一組變重。                                              */
  /* ------------------------------------------------------------------ */
  /* --8<-- config:start（tools/test_config.py 會把這段抓出來跟 grade_cli.py 對拍） */
  var CFG_KEY = 'hw1.judge.config.v1';
  var CFG_VERSION = 1;

  function emptyConfig() {
    return { version: CFG_VERSION, points: {}, disabled: {}, custom: {} };
  }

  /* 匯入的東西可能是別人手改過的，一律當成不可信的資料驗過再用 */
  function sanitizeConfig(raw) {
    var out = emptyConfig();
    if (!raw || typeof raw !== 'object') return out;
    QIDS.forEach(function (q) {
      var base = problemOf(q);
      var pt = raw.points && raw.points[q];
      if (typeof pt === 'number' && isFinite(pt) && pt >= 0 && pt <= 1000) {
        out.points[q] = Math.round(pt * 100) / 100;
      }
      var off = raw.disabled && raw.disabled[q];
      if (Object.prototype.toString.call(off) === '[object Array]') {
        out.disabled[q] = off.filter(function (n) {
          return base.tests.some(function (t) { return t.n === n; });
        });
      }
      var cus = raw.custom && raw.custom[q];
      if (Object.prototype.toString.call(cus) === '[object Array]') {
        out.custom[q] = cus.filter(function (c) {
          return c && typeof c.input === 'string' && typeof c.expected === 'string';
        }).map(function (c) {
          return {
            input: String(c.input),
            expected: String(c.expected),
            note: String(c.note || '助教自訂測資'),
            enabled: c.enabled !== false
          };
        });
      }
    });
    return out;
  }

  function loadConfig() {
    try {
      var raw = localStorage.getItem(CFG_KEY);
      return raw ? sanitizeConfig(JSON.parse(raw)) : emptyConfig();
    } catch (e) {
      return emptyConfig();          // 無痕視窗 / 擋住 site data 都可能讀不到
    }
  }

  function saveConfig() {
    try { localStorage.setItem(CFG_KEY, JSON.stringify(CFG)); } catch (e) { /* 存不了就算了 */ }
  }

  var CFG = loadConfig();

  function pointsOf(qid) {
    var v = CFG.points[qid];
    return typeof v === 'number' ? v : problemOf(qid).points;
  }

  function builtinOn(qid, n) {
    var off = CFG.disabled[qid];
    return !off || off.indexOf(n) < 0;
  }

  function customOf(qid) { return CFG.custom[qid] || []; }

  /* 目前這一輪實際要用的題目資料：只含啟用中的測資，每組分數重新攤分。 */
  function activeProblems() {
    return PROBLEMS.map(function (p) {
      var tests = [];
      p.tests.forEach(function (t) {
        if (builtinOn(p.id, t.n)) tests.push(t);
      });
      customOf(p.id).forEach(function (c, i) {
        if (c.enabled === false) return;
        tests.push({
          n: 'C' + (i + 1), input: c.input, expected: c.expected,
          note: c.note, kind: 'custom'
        });
      });
      var points = pointsOf(p.id);
      return {
        id: p.id, name: p.name, points: points, tests: tests,
        pointsPerTest: tests.length ? points / tests.length : 0
      };
    });
  }

  function activeProblemOf(qid) {
    return activeProblems().filter(function (p) { return p.id === qid; })[0];
  }

  function totalPoints() {
    return QIDS.reduce(function (n, q) { return n + pointsOf(q); }, 0);
  }

  function round2(n) { return Math.round(n * 100) / 100; }

  /* 設定是否動過原廠值——報表上要講清楚這次是用什麼設定批改的 */
  function configDiff() {
    var d = { points: [], disabled: [], custom: [], empty: [] };
    activeProblems().forEach(function (p) {
      var base = problemOf(p.id);
      if (p.points !== base.points) {
        d.points.push(p.id.toUpperCase() + ' ' + base.points + '→' + p.points + ' 分');
      }
      var off = (CFG.disabled[p.id] || []).slice().sort(function (a, b) { return a - b; });
      if (off.length) {
        d.disabled.push(p.id.toUpperCase() + ' 關閉 #' + off.join(' #'));
      }
      var cus = customOf(p.id).filter(function (c) { return c.enabled !== false; });
      if (cus.length) d.custom.push(p.id.toUpperCase() + ' 自訂 ' + cus.length + ' 組');
      if (!p.tests.length) d.empty.push(p.id.toUpperCase());
    });
    d.changed = !!(d.points.length || d.disabled.length || d.custom.length);
    return d;
  }

  function configSummaryLines() {
    var d = configDiff();
    var lines = [];
    var used = 0, base = 0;
    activeProblems().forEach(function (p) { used += p.tests.length; });
    PROBLEMS.forEach(function (p) { base += p.tests.length; });
    lines.push('本次使用 ' + used + ' 組測資（原廠 ' + base + ' 組），總分 ' + round2(totalPoints()) + ' 分');
    if (d.points.length) lines.push('配分已調整：' + d.points.join('、'));
    if (d.disabled.length) lines.push('已關閉的測資：' + d.disabled.join('、'));
    if (d.custom.length) lines.push('助教自訂測資：' + d.custom.join('、'));
    if (d.empty.length) lines.push('警告：' + d.empty.join('、') + ' 沒有任何啟用中的測資，這一題永遠是 0 分');
    return lines;
  }

  function kindLabel(kind) {
    if (kind === 'example') return '題目範例';
    if (kind === 'special') return '特殊測資';
    if (kind === 'custom') return '自訂測資';
    return '隨機測資';
  }
  /* --8<-- config:end */

  /* 用參考解答算出某筆輸入的正確輸出——助教不需要自己手打答案。
     這和 tools/generate_tests.py 的做法一致：答案一律由實際執行參考解答產生。 */
  function solveWithReference(qid, input) {
    var code = SOLUTIONS[qid];
    if (!code) return Promise.reject(new Error('找不到 ' + qid.toUpperCase() + ' 的參考解答'));
    return Engine.run(code, input + '\n', 15000).then(function (r) {
      if (r.status === 'timeout') throw new Error('參考解答執行逾時，這筆輸入可能不合法');
      if (r.status !== 'ok') {
        throw new Error('參考解答跑這筆輸入會出錯，請檢查格式：\n' + (r.stderr || '').slice(0, 300));
      }
      return String(r.stdout).replace(/\n+$/, '');
    });
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

  var lastRunInfo = null;

  function gradeList(list, label) {
    var cfg = settings();
    ensureEngine().catch(function () {});
    // 整輪固定用同一份設定快照：批到一半有人改設定，不該讓前後幾位同學用不同的尺
    var ACTIVE = activeProblems();
    var activeOf = function (qid) {
      return ACTIVE.filter(function (p) { return p.id === qid; })[0];
    };
    lastRunInfo = configSummaryLines();
    var totalRuns = 0;
    list.forEach(function (s) {
      var p = s.qid && activeOf(s.qid);
      if (p) totalRuns += p.tests.length;
    });
    var done = 0;
    $('progressBox').hidden = false;
    busy(true);

    var out = {};
    var chain = Promise.resolve();

    list.forEach(function (sub) {
      if (!sub.qid) return;
      var prob = activeOf(sub.qid);
      if (!prob) return;
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
              // 無窮迴圈的人不要讓他把每一筆逾時都跑完（每次逾時都要重開直譯器）
              if (tleCount >= 2 && !stopped) stopped = '連續逾時兩次，直接判定其餘測資也會逾時';

              rec.cases.push({
                n: t.n, status: status, input: r.viaAlt ? alt2text(t.input) : t.input,
                expected: t.expected, actual: cut(r.stdout, 3000), stderr: cut(r.stderr, 1500),
                note: t.note, kind: t.kind, ms: r.ms, viaAlt: !!r.viaAlt
              });
              done++;
              $('bar').style.width = (totalRuns ? Math.round(done / totalRuns * 100) : 100) + '%';
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
    var ACTIVE = activeProblems().filter(function (p) { return p.tests.length; });
    if (!ACTIVE.length) { alert('目前沒有任何啟用中的測資，無法自動配對。'); return; }
    var total = targets.length * ACTIVE.length * 2, done = 0;
    $('progressBox').hidden = false;
    busy(true);

    var chain = Promise.resolve();
    targets.forEach(function (sub) {
      chain = chain.then(function () {
        var best = { qid: '', hit: 0 };
        var inner = Promise.resolve();
        ACTIVE.forEach(function (p) {
          inner = inner.then(function () {
            var hit = 0;
            var two = Promise.resolve();
            p.tests.slice(0, 2).forEach(function (t) {
              two = two.then(function () {
                return Engine.run(sub.code, t.input + '\n', cfg.timeout).then(function (r) {
                  if (r.status === 'ok' && normalize(r.stdout, cfg.mode) === normalize(t.expected, cfg.mode)) hit++;
                  done++;
                  $('bar').style.width = (total ? Math.round(done / total * 100) : 100) + '%';
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
    var ACTIVE = activeProblems();
    var FULL = round2(totalPoints());
    $('resultCard').hidden = false;
    var head = $('scoreHead');
    head.innerHTML = '';
    head.appendChild(el('th', '', '學生'));
    ACTIVE.forEach(function (p) { head.appendChild(el('th', '', p.id.toUpperCase() + '（' + p.points + '）')); });
    head.appendChild(el('th', '', '總分（' + FULL + '）'));

    var tbody = $('scoreTable').querySelector('tbody');
    tbody.innerHTML = '';
    var students = Object.keys(out).sort();
    var sum = 0, full = 0;

    students.forEach(function (name) {
      var tr = el('tr');
      tr.appendChild(el('td', '', name));
      var total = 0;
      ACTIVE.forEach(function (p) {
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
      total = round2(total);
      sum += total;
      if (total === FULL) full++;
      tr.appendChild(el('td', 'total', String(total)));
      tbody.appendChild(tr);
    });

    var reokTotal = 0, altTotal = 0;
    students.forEach(function (name) {
      ACTIVE.forEach(function (p) {
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

    var info = $('runConfigInfo');
    var lines = lastRunInfo || configSummaryLines();
    info.innerHTML = '';
    lines.forEach(function (line, i) {
      info.appendChild(el('div', i === 0 ? '' : 'small', line));
    });
    info.className = 'runinfo' + (configDiff().changed ? ' changed' : '');
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
      head.appendChild(el('span', 'kind ' + c.kind, kindLabel(c.kind)));
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
    var ACTIVE = activeProblems();
    var rows = [];
    var head = ['學號'];
    ACTIVE.forEach(function (p) { head.push(p.id.toUpperCase() + '(' + p.points + ')'); });
    head.push('總分');
    ACTIVE.forEach(function (p) { head.push(p.id.toUpperCase() + '通過筆數'); });
    rows.push(head);
    Object.keys(results).sort().forEach(function (name) {
      var row = [name], total = 0, pass = [];
      ACTIVE.forEach(function (p) {
        var rec = results[name][p.id];
        row.push(rec ? rec.score : '');
        pass.push(rec ? rec.passed + '/' + rec.cases.length : '未繳交');
        if (rec) total += rec.score;
      });
      row.push(round2(total));
      rows.push(row.concat(pass));
    });
    // 成績單一定要帶著「這是用什麼設定算出來的」，否則兩份 CSV 看起來一樣卻不同義
    rows.push([]);
    rows.push(['批改設定']);
    (lastRunInfo || configSummaryLines()).forEach(function (line) { rows.push([line]); });
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
  var viewerShowing = null;

  function renderTests(qid) {
    viewerShowing = { type: 'tests', qid: qid };
    var prob = activeProblemOf(qid);
    var box = $('viewer');
    box.hidden = false;
    box.innerHTML = '';
    box.appendChild(el('h3', '', prob.id.toUpperCase() + ' ' + prob.name +
      '：' + prob.tests.length + ' 組啟用中的測資，' + prob.points + ' 分，每組 ' +
      round2(prob.pointsPerTest) + ' 分'));
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
      k.appendChild(el('span', 'kind ' + t.kind, kindLabel(t.kind)));
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
    viewerShowing = { type: 'sol', qid: qid };
    var box = $('viewer');
    box.hidden = false;
    box.innerHTML = '';
    box.appendChild(el('h3', '', qid.toUpperCase() + ' 參考解答（只用課內語法）'));
    box.appendChild(el('pre', '', SOLUTIONS[qid] || '（找不到）'));
  }

  function testsAsText() {
    var out = [];
    activeProblems().forEach(function (p) {
      out.push('=== ' + p.id.toUpperCase() + ' ' + p.name +
        '（' + p.points + ' 分，每組 ' + round2(p.pointsPerTest) + ' 分）===');
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
  /* 測資與配分設定面板                                                     */
  /* ------------------------------------------------------------------ */
  var cfgDraft = {};            // qid -> 正在編輯、還沒加進去的自訂測資

  function draftOf(qid) {
    if (!cfgDraft[qid]) cfgDraft[qid] = { input: '', note: '', expected: null };
    return cfgDraft[qid];
  }

  function cfgChanged() {
    saveConfig();
    refreshCfgUI();
  }

  function renderCfgTotals() {
    var box = $('cfgTotals');
    box.innerHTML = '';
    var total = round2(totalPoints());
    var d = configDiff();
    var used = 0, base = 0;
    activeProblems().forEach(function (p) { used += p.tests.length; });
    PROBLEMS.forEach(function (p) { base += p.tests.length; });

    var main = el('div', 'totals-main');
    main.appendChild(el('span', 'totals-num', String(total)));
    main.appendChild(el('span', 'totals-lbl', '分 · 目前啟用 ' + used + ' 組測資（原廠 ' + base + ' 組）'));
    box.appendChild(main);

    var msgs = [];
    if (total !== DEFAULT_TOTAL) {
      msgs.push('總分是 ' + total + ' 分，不是原本的 ' + DEFAULT_TOTAL + ' 分。確定要這樣給分嗎？');
    }
    if (d.empty.length) {
      msgs.push(d.empty.join('、') + ' 沒有任何啟用中的測資，這一題所有人都會是 0 分。');
    }
    if (msgs.length) {
      box.className = 'totals bad';
      msgs.forEach(function (m) { box.appendChild(el('div', 'totals-warn', '⚠ ' + m)); });
    } else {
      box.className = 'totals' + (d.changed ? ' changed' : '');
      if (d.changed) box.appendChild(el('div', 'totals-note', '設定已經動過原廠值，批改報表上會一併註記。'));
    }
  }

  var cfgExpanded = {};       // 題號 -> 是否展開

  function renderCfgList() {
    var box = $('cfgList');
    box.innerHTML = '';
    activeProblems().forEach(function (p) {
      var base = problemOf(p.id);
      var open = !!cfgExpanded[p.id];
      var changed = p.points !== base.points
        || p.tests.length !== base.tests.length
        || customOf(p.id).length > 0;
      var wrap = el('div', 'sub' + (open ? ' open' : '') + (changed ? ' work' : ''));

      var head = el('div', 'sub-head cfgrow-head-grid');
      head.setAttribute('role', 'button');
      head.setAttribute('tabindex', '0');
      head.setAttribute('aria-expanded', open ? 'true' : 'false');

      head.appendChild(el('span', 'sub-caret', '▸'));
      head.appendChild(el('span', 'cfg-name', p.id.toUpperCase() + ' ' + p.name));

      /* 配分直接在這一列改，不用展開 */
      var ptsCell = el('span', 'cfg-pts');
      var inp = el('input');
      inp.type = 'number'; inp.min = '0'; inp.max = '1000'; inp.step = '1';
      inp.value = String(p.points);
      inp.className = 'ptsinput';
      inp.onclick = function (e) { e.stopPropagation(); };     // 點輸入框不要摺疊這一列
      inp.onkeydown = function (e) { e.stopPropagation(); };
      inp.onchange = function () {
        var v = parseFloat(inp.value);
        if (!isFinite(v) || v < 0) { inp.value = String(p.points); return; }
        v = round2(v);
        if (v === base.points) delete CFG.points[p.id];
        else CFG.points[p.id] = v;
        cfgChanged();
      };
      ptsCell.appendChild(inp);
      ptsCell.appendChild(el('span', 'muted small',
        p.points !== base.points ? ' 分（原 ' + base.points + '）' : ' 分'));
      head.appendChild(ptsCell);

      var nCustom = customOf(p.id).filter(function (c) { return c.enabled !== false; }).length;
      var nBuiltin = p.tests.length - nCustom;
      var nCell = el('span', 'cfg-n' + (p.tests.length ? '' : ' zero'));
      nCell.appendChild(el('span', '', p.tests.length + ' 組'));
      var parts = ['內建 ' + nBuiltin + '/' + base.tests.length];
      if (nCustom) parts.push('自訂 ' + nCustom);
      nCell.appendChild(el('span', 'muted small', '（' + parts.join('，') + '）'));
      head.appendChild(nCell);

      head.appendChild(el('span', 'cfg-per',
        p.tests.length ? '每組 ' + round2(p.pointsPerTest) + ' 分' : '—'));

      function toggle() {
        cfgExpanded[p.id] = !cfgExpanded[p.id];
        refreshCfgUI();
      }
      head.onclick = toggle;
      head.onkeydown = function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      };
      wrap.appendChild(head);

      if (open) wrap.appendChild(renderCfgEditor(p.id));
      box.appendChild(wrap);
    });
  }

  function testRow(label, kind, input, expected, note, on, onToggle, onDelete) {
    var row = el('div', 'cfgrow' + (on ? '' : ' off'));
    var cb = el('input');
    cb.type = 'checkbox';
    cb.checked = on;
    cb.onchange = function () { onToggle(cb.checked); };
    row.appendChild(cb);

    var mid = el('div', 'cfgrow-mid');
    var head = el('div', 'cfgrow-head');
    head.appendChild(el('strong', '', '#' + label));
    head.appendChild(el('span', 'kind ' + kind, kindLabel(kind)));
    head.appendChild(el('span', 'muted small', note));
    mid.appendChild(head);
    var io_ = el('div', 'cfgrow-io');
    var i = el('div');
    i.appendChild(el('span', 'lbl', '輸入'));
    i.appendChild(el('code', '', input));
    var o = el('div');
    o.appendChild(el('span', 'lbl', '正確輸出'));
    o.appendChild(el('code', '', expected));
    io_.appendChild(i); io_.appendChild(o);
    mid.appendChild(io_);
    row.appendChild(mid);

    if (onDelete) {
      var del = el('button', 'btn danger ghost small', '刪除');
      del.onclick = onDelete;
      row.appendChild(del);
    }
    return row;
  }

  function renderCfgEditor(qid) {
    var box = el('div', 'sub-body cfgeditor');
    var base = problemOf(qid);
    var draft = draftOf(qid);

    box.appendChild(el('p', 'muted small', '內建測資（取消勾選就不列入這次批改）'));
    base.tests.forEach(function (t) {
      box.appendChild(testRow(t.n, t.kind, t.input, t.expected, t.note, builtinOn(qid, t.n),
        function (on) {
          var off = CFG.disabled[qid] || [];
          if (on) off = off.filter(function (x) { return x !== t.n; });
          else if (off.indexOf(t.n) < 0) off = off.concat([t.n]);
          if (off.length) CFG.disabled[qid] = off; else delete CFG.disabled[qid];
          cfgChanged();
        }));
    });

    var cus = customOf(qid);
    if (cus.length) {
      box.appendChild(el('p', 'muted small', '助教自訂測資'));
      cus.forEach(function (c, idx) {
        box.appendChild(testRow('C' + (idx + 1), 'custom', c.input, c.expected, c.note,
          c.enabled !== false,
          function (on) { c.enabled = on; cfgChanged(); },
          function () {
            if (!confirm('刪除這組自訂測資？')) return;
            CFG.custom[qid] = cus.filter(function (_x, i) { return i !== idx; });
            if (!CFG.custom[qid].length) delete CFG.custom[qid];
            cfgChanged();
          }));
      });
    }

    /* ---- 新增自訂測資 ---- */
    var add = el('div', 'cfgadd');
    add.appendChild(el('h4', '', '新增自訂測資'));
    add.appendChild(el('p', 'muted small',
      '只要輸入 input，正確輸出由參考解答實際跑出來，不用自己打答案。多行輸入請一行一行打。'));

    var ta = el('textarea');
    ta.rows = 2;
    ta.placeholder = '輸入（例如 1.75 68）';
    ta.value = draft.input;
    ta.oninput = function () { draft.input = ta.value; draft.expected = null; renderPreview(); };
    add.appendChild(ta);

    var noteIn = el('input');
    noteIn.type = 'text';
    noteIn.placeholder = '說明：這組在測什麼（選填）';
    noteIn.value = draft.note;
    noteIn.oninput = function () { draft.note = noteIn.value; };
    add.appendChild(noteIn);

    var btnRow = el('div', 'row gap wrap-row');
    var calcBtn = el('button', 'btn', '用參考解答算出正確輸出');
    var addBtn = el('button', 'btn primary', '加入這組測資');
    addBtn.disabled = true;
    btnRow.appendChild(calcBtn);
    btnRow.appendChild(addBtn);
    add.appendChild(btnRow);

    var preview = el('div', 'cfgpreview');
    add.appendChild(preview);

    function renderPreview() {
      preview.innerHTML = '';
      addBtn.disabled = draft.expected === null;
      if (draft.expected === null) return;
      preview.appendChild(el('span', 'lbl', '參考解答算出的正確輸出'));
      preview.appendChild(el('pre', '', draft.expected));
    }

    calcBtn.onclick = function () {
      var input = ta.value.replace(/\s+$/, '');
      if (!input) { alert('請先填輸入。'); return; }
      calcBtn.disabled = true;
      calcBtn.textContent = '執行參考解答中…';
      ensureEngine().catch(function () {});
      solveWithReference(qid, input).then(function (expected) {
        draft.input = input;
        draft.expected = expected;
        renderPreview();
      }).catch(function (e) {
        draft.expected = null;
        renderPreview();
        alert('算不出正確輸出：\n' + (e && e.message ? e.message : e));
      }).then(function () {
        calcBtn.disabled = false;
        calcBtn.textContent = '用參考解答算出正確輸出';
      });
    };

    addBtn.onclick = function () {
      if (draft.expected === null) return;
      var list = CFG.custom[qid] || [];
      list.push({
        input: draft.input,
        expected: draft.expected,
        note: draft.note || '助教自訂測資',
        enabled: true
      });
      CFG.custom[qid] = list;
      cfgDraft[qid] = { input: '', note: '', expected: null };
      cfgChanged();
    };

    box.appendChild(add);
    renderPreview();
    return box;
  }

  function refreshCfgUI() {
    renderCfgTotals();
    renderCfgList();
    if (viewerShowing && viewerShowing.type === 'tests' && !$('viewer').hidden) {
      renderTests(viewerShowing.qid);       // 檢視中的測資表要跟著設定一起變
    }
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

    $('clearFiles').onclick = function () {
      submissions = []; results = null; expanded = {}; seenGroup = {};
      renderFiles();
    };
    $('expandAll').onclick = function () {
      groupSubmissions().forEach(function (g) { expanded[g.student] = true; });
      renderFiles();
    };
    $('collapseAll').onclick = function () { expanded = {}; renderFiles(); };
    $('onlyProblem').onchange = function () {
      onlyProblem = $('onlyProblem').checked;
      renderFiles();
    };
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
        var full = round2(totalPoints());
        total = round2(total);
        alert(total === full
          ? '參考解答拿到 ' + total + ' / ' + full + ' 分，測資與批改程式一致。'
          : '注意：參考解答只拿到 ' + total + ' / ' + full + ' 分，請檢查測資或執行環境。');
      });
    };

    $('exportCsv').onclick = function () { if (results) download('hw1_成績.csv', toCsv(), 'text/csv'); };
    $('exportJson').onclick = function () {
      if (!results) return;
      var payload = {
        summary: lastRunInfo || configSummaryLines(),
        config: CFG,
        problems: activeProblems().map(function (p) {
          return { id: p.id, points: p.points, tests: p.tests.length,
                   pointsPerTest: round2(p.pointsPerTest) };
        }),
        results: results
      };
      download('hw1_批改明細.json', JSON.stringify(payload, null, 1), 'application/json');
    };
    $('viewTests').onclick = function () { renderTests($('viewQ').value); };
    $('viewSol').onclick = function () { renderSolution($('viewQ').value); };
    $('downloadTests').onclick = function () { download('hw1_測資.txt', testsAsText()); };

    /* ---- 測資與配分設定 ---- */
    $('cfgExport').onclick = function () {
      download('hw1_批改設定.json', JSON.stringify(CFG, null, 1), 'application/json');
    };
    $('cfgImport').onclick = function () { $('cfgFile').click(); };
    $('cfgFile').onchange = function (e) {
      var f = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!f) return;
      readFileText(f).then(function (text) {
        var parsed;
        try { parsed = JSON.parse(text); }
        catch (err) { alert('這不是合法的 JSON 檔。'); return; }
        CFG = sanitizeConfig(parsed);
        cfgDraft = {};
        cfgChanged();
        alert('設定已匯入。' + configSummaryLines().join('\n'));
      });
    };
    $('cfgReset').onclick = function () {
      if (!configDiff().changed) { alert('目前就是原廠設定。'); return; }
      if (!confirm('把配分與測資全部恢復成原廠設定？自訂測資會一併刪除。')) return;
      CFG = emptyConfig();
      cfgDraft = {};
      cfgChanged();
    };

    refreshCfgUI();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
