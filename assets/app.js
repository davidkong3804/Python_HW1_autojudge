/* Autojudge 程式作業批改平台（助教用） — 主程式
 * 一切都在瀏覽器裡完成：學生程式由 Pyodide 執行，不會上傳到任何伺服器。
 *
 * 支援多份作業（HW1、HW2…），資料來自 data/assignments.js（由 tools/generate_tests.py 產生）。
 * 每份作業各自有：繳交清單、成績、手動調整、測資與配分設定，切換作業不會互相影響，
 * 而且會自動存在這台電腦的瀏覽器裡（IndexedDB），重新整理或關掉分頁都不會不見。
 *
 * 繳交格式（依作業公告）：學號_HWn.zip -> 學號_HWn/<題號>.py
 * 也吃：整包 COOL 下載的 zip（zip 裡面還有 zip）、散裝 .py、整個資料夾、
 *       以及萬一有人交 Colab 的 .ipynb。
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* 作業                                                                 */
  /* ------------------------------------------------------------------ */
  var ASSIGNMENTS = window.AUTOJUDGE_ASSIGNMENTS || [];
  var HW = null;              // 目前的作業（data/assignments.js 的一筆）
  var HW_ID = '';
  var PROBLEMS = [];
  var QIDS = [];
  var SOLUTIONS = {};
  var MUTANTS = {};
  var DEFAULT_TOTAL = 0;

  function assignmentOf(id) {
    return ASSIGNMENTS.filter(function (a) { return a.id === id; })[0] || null;
  }

  /* 設定目前作業的題目資料；useAssignment 另外連同這份作業的測資設定一起載入 */
  function setAssignmentData(id) {
    HW = assignmentOf(id) || ASSIGNMENTS[0] || null;
    HW_ID = HW ? HW.id : '';
    PROBLEMS = HW ? HW.problems : [];
    QIDS = PROBLEMS.map(function (p) { return p.id; });
    SOLUTIONS = (HW && HW.solutions) || {};
    MUTANTS = (HW && HW.mutants) || {};
    DEFAULT_TOTAL = PROBLEMS.reduce(function (s, p) { return s + p.points; }, 0);
  }

  function useAssignment(id) {
    setAssignmentData(id);
    CFG = loadConfig();
  }

  var LAST_HW_KEY = 'autojudge.lastHw';

  function pickInitialHw() {
    var fromHash = (location.hash || '').replace(/^#/, '').toLowerCase();
    if (assignmentOf(fromHash)) return fromHash;
    try {
      var last = localStorage.getItem(LAST_HW_KEY);
      if (assignmentOf(last)) return last;
    } catch (e) { /* 無痕視窗 */ }
    return ASSIGNMENTS.length ? ASSIGNMENTS[ASSIGNMENTS.length - 1].id : '';   // 預設最新一份
  }

  setAssignmentData(pickInitialHw());      // 測資設定在下面 config 區塊載入

  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  /* 不擋畫面的提示（取代 alert） */
  function toast(msg, kind, ms) {
    var box = $('toasts');
    if (!box) return;
    var t = el('div', 'toast ' + (kind || ''), msg);
    t.setAttribute('role', kind === 'bad' ? 'alert' : 'status');
    box.appendChild(t);
    setTimeout(function () {
      t.classList.add('out');
      setTimeout(function () { t.remove(); }, 300);
    }, ms || (kind === 'bad' ? 7000 : 3800));
  }

  function round2(n) { return Math.round(n * 100) / 100; }

  function fmtTime(ts) {
    var d = new Date(ts);
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  /* ------------------------------------------------------------------ */
  /* Python 執行引擎（Pyodide 跑在 Web Worker 裡，逾時就整個砍掉重開）      */
  /* ------------------------------------------------------------------ */
  var CDN_BASE = 'https://cdn.jsdelivr.net/pyodide/v0.29.4/full/';

  var Engine = {
    worker: null, ready: false, booting: null, seq: 0, pending: null,
    base: new URL('vendor/pyodide/', location.href).href,
    usedCdn: false,
    queue: Promise.resolve(),

    boot: function () {
      var self = this;
      if (self.booting) return self.booting;
      self.booting = new Promise(function (resolve, reject) {
        var w = new Worker('assets/worker.js?v=2.4');
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

    /* worker 一次只能跑一支程式。所有呼叫排隊，
       否則批改進行中去按「用參考解答算出正確輸出」會把批改那一筆的回應搶走，整輪卡死。 */
    send: function (msg, timeoutMs, onTimeout) {
      var self = this;
      var job = self.queue.then(function () {
        return self.boot().then(function () {
          return new Promise(function (resolve) {
            var id = ++self.seq;
            var timer = setTimeout(function () {
              if (self.pending && self.pending.id === id) {
                self.pending = null;
                self.restart();
                resolve(onTimeout());
              }
            }, timeoutMs);
            self.pending = { id: id, resolve: resolve, timer: timer };
            msg.id = id;
            self.worker.postMessage(msg);
          });
        });
      });
      self.queue = job.catch(function () {});
      return job;
    },

    run: function (code, stdin, timeoutMs) {
      return this.send({ cmd: 'run', code: code, stdin: stdin }, timeoutMs, function () {
        return {
          status: 'timeout', stdout: '', ms: timeoutMs,
          stderr: '執行超過時間限制（無窮迴圈，或程式還在等下一個 input()）'
        };
      });
    },

    /* 靜態分析寫法（ast，不執行）。語法錯誤或失敗回傳 null */
    features: function (code) {
      return this.send({ cmd: 'features', code: code }, 5000, function () {
        return { features: null };
      }).then(function (m) { return m.features || null; });
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

  /* 題號 + 子題 -> 這份作業真的有的題號。
   * HW2 這種有子題的作業（q1a、q1b），檔名只寫 q1 就分不出是 a 還是 b，回傳空字串讓助教指定，
   * 絕對不要自己猜一個掛上去。 */
  function qidFromParts(num, letter, qids) {
    var n = String(parseInt(num, 10));
    if (letter) {
      var sub = 'q' + n + letter.toLowerCase();
      if (qids.indexOf(sub) >= 0) return sub;
    }
    return qids.indexOf('q' + n) >= 0 ? 'q' + n : '';
  }

  /* 題號：q3、Q3、q1a、q1_a、Q1(a)、第3題、第1題a、hw2_3b… qids 是目前作業的題號清單 */
  function detectQid(name, qids) {
    var m = name.match(/(?:^|[^a-z0-9])q[ \t\u3000]*(\d{1,2})(?:[ \t\u3000]*[-_.]?[ \t\u3000]*\(?[ \t\u3000]*([a-z])[ \t\u3000]*\)?(?![a-z0-9]))?(?![0-9])/i);
    if (m) {
      var q = qidFromParts(m[1], m[2], qids);
      if (q) return q;
    }
    m = name.match(/第[ \t\u3000]*(\d{1,2})[ \t\u3000]*題(?:[ \t\u3000]*[-_.]?[ \t\u3000]*\(?[ \t\u3000]*([a-z])[ \t\u3000]*\)?(?![a-z0-9]))?/i);
    if (m) {
      q = qidFromParts(m[1], m[2], qids);
      if (q) return q;
    }
    // 先把學號和「HW1」這種作業編號拿掉再找數字：不然路徑裡的 _HW1 會讓
    // 任何認不出題號的檔案都被判成 Q1，默默掛到第一題去
    // 只剩一個可能的題號才採用：「3 (1).py」「ex3_ver2.py」這種有兩個數字的，猜錯會默默掛到別題，
    // 寧可留空讓助教指定或用自動配對
    var stripped = name.replace(/HW[ \t\u3000]*\d+/ig, '_').replace(/[A-Za-z]?\d{6,12}/g, '_');
    var re = /(?:^|[^0-9])(\d{1,2})(?:[-_.]?\(?([a-z])\)?(?![a-z0-9]))?(?![0-9])/ig;
    var found = '';
    while ((m = re.exec(stripped)) !== null) {
      if (parseInt(m[1], 10) !== 0) {
        q = qidFromParts(m[1], m[2], qids) || ('?' + m[1] + (m[2] || ''));
        if (found && found !== q) return '';
        found = q;
      }
      re.lastIndex = m.index + 1;
    }
    return found.charAt(0) === '?' ? '' : found;
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
    var cleaned = base.replace(/(?:^|[^a-z0-9])q\s*\d{1,2}[a-z]?(?![0-9])/i, '')
      .replace(/第\s*\d{1,2}\s*題/, '').replace(/^[_\-.\s]+|[_\-.\s]+$/g, '');
    return cleaned || '未知';
  }

  /* 繳交的作業編號：公告格式是「學號_HW1」，抓出 HW1 */
  function detectHw(path) {
    var parts = path.split('/').filter(Boolean);
    for (var i = parts.length - 1; i >= 0; i--) {
      var m = parts[i].replace(/\.(zip|py|ipynb)$/i, '').match(/(?:^|[^A-Za-z])(HW\s*\d+)$/i);
      if (m) return m[1].toUpperCase().replace(/\s+/g, '');
    }
    return '';
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

  /* 結尾的換行不算一行 */
  function lineCount(code) {
    return code.replace(/\n+$/, '').split('\n').length;
  }

  function qLabel(qid) {
    return qid.replace(/^q/, 'Q');
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

  function guessQidFromText(text) {
    if (!text) return '';
    var m = text.match(/(?:^|[^a-z0-9])q\s*(\d{1,2})\s*\(?([a-z])?\)?(?![a-z0-9])/i) ||
            text.match(/第\s*(\d{1,2}|[一二三四五六七八九十])\s*題\s*\(?([a-z])?/i) ||
            text.match(/^\s*(\d{1,2})\s*\(?([a-z])?\)?\s*[.、)]/m);
    if (m) {
      var d = '一二三四五六七八九十'.indexOf(m[1]);
      var q = qidFromParts(d >= 0 ? String(d + 1) : m[1], m[2], QIDS);
      if (q) return q;
    }
    for (var i = 0; i < PROBLEMS.length; i++) {
      var kw = PROBLEMS[i].keywords;
      if (!kw) continue;
      try {
        if (new RegExp(kw, 'i').test(text)) return PROBLEMS[i].id;
      } catch (e) { /* spec 寫錯的正規表示式就略過 */ }
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
  /* 工作狀態（每份作業一份）與自動儲存                                     */
  /*                                                                     */
  /* 批改幾十位同學要十幾分鐘，重新整理一下全部重來是最痛的事，               */
  /* 所以繳交清單、成績、手動調整都存在 IndexedDB，切換作業也各自保留。       */
  /* ------------------------------------------------------------------ */
  function emptySession(hw) {
    return {
      hw: hw, submissions: [], nextKey: 1,
      results: null,          // 學號 -> 題號 -> 批改紀錄
      runInfo: null,          // 這批成績是用什麼設定算出來的（文字）
      runSig: '',             // 同上（機器比對用）：設定一變，成績就過期
      runMeta: null,          // { mode, lenientRe, lenientInput, formatCredit, timeout, at }
      adjust: {},             // 學號 -> 題號 -> { delta, note }
      dirty: {}               // 批改後檔案有變動的學號
    };
  }

  var SESSIONS = {};          // 記憶體裡的快取（IndexedDB 不能用時至少切換作業不會掉）
  var S = emptySession(HW_ID);

  var Store = {
    _p: null,
    open: function () {
      if (this._p) return this._p;
      this._p = new Promise(function (resolve) {
        try {
          var req = indexedDB.open('autojudge', 1);
          req.onupgradeneeded = function () { req.result.createObjectStore('sessions'); };
          req.onsuccess = function () { resolve(req.result); };
          req.onerror = function () { resolve(null); };
          req.onblocked = function () { resolve(null); };
        } catch (e) { resolve(null); }
      });
      return this._p;
    },
    get: function (key) {
      return this.open().then(function (db) {
        if (!db) return null;
        return new Promise(function (resolve) {
          try {
            var r = db.transaction('sessions').objectStore('sessions').get(key);
            r.onsuccess = function () { resolve(r.result || null); };
            r.onerror = function () { resolve(null); };
          } catch (e) { resolve(null); }
        });
      });
    },
    put: function (key, value) {
      return this.open().then(function (db) {
        if (!db) return false;
        return new Promise(function (resolve) {
          try {
            var tx = db.transaction('sessions', 'readwrite');
            tx.objectStore('sessions').put(value, key);
            tx.oncomplete = function () { resolve(true); };
            tx.onerror = function () { resolve(false); };
            tx.onabort = function () { resolve(false); };
          } catch (e) { resolve(false); }
        });
      });
    }
  };

  var saveTimer = null;

  function persist() {
    SESSIONS[S.hw] = S;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, 250);
  }

  function flushSave() {
    clearTimeout(saveTimer);
    saveTimer = null;
    var snap = S;
    return Store.put(snap.hw, snap).then(function (ok) {
      var box = $('saveState');
      if (!box) return;
      if (ok) {
        box.textContent = '已自動儲存 ' + fmtTime(Date.now());
        box.className = 'savestate ok';
        box.title = '繳交清單、成績與手動調整都存在這台電腦的瀏覽器裡，重新整理不會不見。';
      } else {
        box.textContent = '無法自動儲存';
        box.className = 'savestate bad';
        box.title = '這個瀏覽器不允許儲存（例如無痕視窗），重新整理會遺失，請記得匯出。';
      }
    });
  }

  function sanitizeSession(raw, hw) {
    var s = emptySession(hw);
    if (!raw || typeof raw !== 'object') return s;
    if (Array.isArray(raw.submissions)) {
      s.submissions = raw.submissions.filter(function (x) {
        return x && typeof x.code === 'string' && typeof x.path === 'string';
      });
    }
    s.nextKey = Math.max(raw.nextKey || 1, s.submissions.reduce(function (n, x) {
      return Math.max(n, (x.key || 0) + 1);
    }, 1));
    s.results = raw.results && typeof raw.results === 'object' ? raw.results : null;
    s.runInfo = Array.isArray(raw.runInfo) ? raw.runInfo : null;
    s.runSig = typeof raw.runSig === 'string' ? raw.runSig : '';
    s.runMeta = raw.runMeta || null;
    s.adjust = raw.adjust && typeof raw.adjust === 'object' ? raw.adjust : {};
    s.dirty = raw.dirty && typeof raw.dirty === 'object' ? raw.dirty : {};
    return s;
  }

  function loadSession(hw) {
    if (SESSIONS[hw]) return Promise.resolve(SESSIONS[hw]);
    return Store.get(hw).then(function (raw) {
      var s = sanitizeSession(raw, hw);
      SESSIONS[hw] = s;
      return s;
    });
  }

  /* ------------------------------------------------------------------ */
  /* 修課名單（選用，所有作業共用）                                          */
  /* 有名單才知道「誰沒交」，也能抓出學號辨識錯的（不在名單上的學號）。        */
  /* ------------------------------------------------------------------ */
  var ROSTER_KEY = 'autojudge.roster.v1';
  var ROSTER = loadRoster();

  function loadRoster() {
    try {
      var raw = JSON.parse(localStorage.getItem(ROSTER_KEY) || '[]');
      return Array.isArray(raw) ? raw.filter(function (r) { return r && r.id; }) : [];
    } catch (e) { return []; }
  }

  function saveRoster() {
    try { localStorage.setItem(ROSTER_KEY, JSON.stringify(ROSTER)); } catch (e) { /* noop */ }
  }

  function splitCsvLine(line) {
    var out = [], cur = '', q = false;
    for (var i = 0; i < line.length; i++) {
      var c = line[i];
      if (q) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') q = false;
        else cur += c;
      } else if (c === '"') q = true;
      else if (c === ',' || c === '\t' || c === ';') { out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur);
    return out.map(function (s) { return s.trim(); });
  }

  /* 吃 COOL / Excel 匯出的名單：每一列找「長得像學號」的那格，旁邊第一個不像學號的就是姓名 */
  function parseRoster(text) {
    var seen = {}, out = [];
    text.replace(/\r\n?/g, '\n').split('\n').forEach(function (line) {
      if (!line.trim()) return;
      var cells = splitCsvLine(line);
      var idIdx = -1;
      for (var i = 0; i < cells.length; i++) {
        if (isIdWithLetter(cells[i]) || isIdDigits(cells[i])) { idIdx = i; break; }
      }
      if (idIdx < 0) return;                      // 標題列或空白列
      var id = cells[idIdx].toUpperCase();
      if (seen[id]) return;
      var name = '';
      for (i = 0; i < cells.length; i++) {
        if (i === idIdx || !cells[i]) continue;
        if (/^[\d\s.\-]+$/.test(cells[i]) || isIdWithLetter(cells[i]) || /@/.test(cells[i])) continue;
        name = cells[i];
        break;
      }
      seen[id] = true;
      out.push({ id: id, name: name });
    });
    return out;
  }

  function rosterIndex() {
    var m = {};
    ROSTER.forEach(function (r) { m[r.id] = r; });
    return m;
  }

  /* ------------------------------------------------------------------ */
  /* 檔案載入                                                             */
  /* ------------------------------------------------------------------ */
  function markDirty(student) {
    if (S.results && student) S.dirty[student] = true;
  }

  function addSubmission(path, code, forcedQid) {
    var clean = path.replace(/\s*▸.*$/, '');
    var base = (clean.split('/').pop() || '').replace(/\.[^.]*$/, '');
    var sub = {
      key: S.nextKey++,
      path: path,
      student: detectStudent(clean),
      qid: forcedQid !== undefined ? forcedQid : (detectQid(base, QIDS) || detectQid(clean, QIDS)),
      code: code
    };
    S.submissions.push(sub);
    markDirty(sub.student);
    return sub;
  }

  function ingest(path, text) {
    if (!/\.ipynb$/i.test(path)) { addSubmission(path, text); return; }
    var cells = parseNotebook(text);
    if (!cells || !cells.length) { addSubmission(path, text); return; }
    var fileQid = detectQid(path.replace(/\.[^.]*$/, ''), QIDS);
    if (cells.length === 1) {
      addSubmission(path + '  ▸ cell 1', cells[0].code,
        fileQid || guessQidFromText(cells[0].hint + '\n' + cells[0].code));
      return;
    }
    var guesses = cells.map(function (c) { return guessQidFromText(c.hint + '\n' + c.code); });
    var anyGuess = guesses.some(function (g) { return g; });
    cells.forEach(function (c, i) {
      var qid = guesses[i];
      if (!qid && !anyGuess && cells.length === QIDS.length) qid = QIDS[i];   // 格數剛好等於題數 -> 依序
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
    return text.replace(/^﻿+/, '').replace(/\u0000/g, '');
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
    if (typeof JSZip === 'undefined') { toast('找不到 JSZip，無法解壓縮。', 'bad'); return Promise.resolve(); }
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
      toast('解壓縮失敗（' + prefix.replace(/\/$/, '') + '）：' + (e && e.message ? e.message : e), 'bad');
    });
  }

  var INTAKING = 0;          // 還在解壓 / 讀檔的批次數：這段時間不能切換作業，不然檔案會進到另一份作業

  function intakeFiles(fileList) {
    if (RUN) { toast('批改進行中不能加檔案（會跟正在跑的這一輪對不上），請等批完或按取消。', 'warn', 6000); return Promise.resolve(); }
    var files = Array.prototype.slice.call(fileList);
    var before = S.submissions.length;
    INTAKING++;
    var jobs = files.map(function (f) {
      var path = f.webkitRelativePath || f.name;
      if (/\.zip$/i.test(f.name)) {
        return loadZip(f, f.name.replace(/\.zip$/i, '') + '/', 1);
      }
      if (!/\.(py|ipynb)$/i.test(f.name) || skipPath(path)) return Promise.resolve();
      return readFileText(f).then(function (txt) { ingest(path, txt); });
    });
    return Promise.all(jobs).then(function () {
      INTAKING--;
      var added = S.submissions.slice(before);
      if (!added.length) {
        toast('沒有找到任何 .py / .ipynb 檔。', 'warn');
      } else {
        var who = {};
        added.forEach(function (s) { who[s.student] = true; });
        toast('已加入 ' + Object.keys(who).length + ' 位學生、' + added.length + ' 個程式。', 'ok');
      }
      checkHwMismatch(added);
      persist();
      renderFiles();
      renderResultsIfAny();
      if (S.submissions.length) ensureEngine().catch(function () {});   // 先暖機
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

  /* 放進來的檔案路徑寫的是 HW1，畫面卻停在 HW2：最常見的手滑。提醒並提供一鍵搬過去。 */
  var pendingMove = null;

  function checkHwMismatch(added) {
    pendingMove = null;
    var count = {};
    added.forEach(function (s) {
      var h = detectHw(s.path).toLowerCase();
      if (h) count[h] = (count[h] || 0) + 1;
    });
    var best = '', n = 0;
    Object.keys(count).forEach(function (h) { if (count[h] > n) { best = h; n = count[h]; } });
    if (!best || best === HW_ID || n * 2 < added.length) return;
    pendingMove = {
      hw: best, known: !!assignmentOf(best),
      keys: added.filter(function (s) { return detectHw(s.path).toLowerCase() === best; })
        .map(function (s) { return s.key; })
    };
  }

  function renderHwMismatch() {
    var box = $('hwMismatch');
    box.innerHTML = '';
    box.hidden = !pendingMove;
    if (!pendingMove) return;
    var label = pendingMove.hw.toUpperCase();
    box.appendChild(el('span', '', '剛放進來的 ' + pendingMove.keys.length + ' 個檔案，路徑寫的是 ' +
      label + '，但目前選的作業是 ' + HW.title + '。'));
    if (pendingMove.known) {
      var go = el('button', 'btn small primary', '搬到 ' + label + ' 去批改');
      go.onclick = function () { moveToHw(pendingMove.hw, pendingMove.keys); };
      box.appendChild(go);
    } else {
      box.appendChild(el('span', '', '（平台上還沒有 ' + label + ' 的測資）'));
    }
    var stay = el('button', 'btn small ghost', '沒錯，就是 ' + HW.title);
    stay.onclick = function () { pendingMove = null; renderHwMismatch(); };
    box.appendChild(stay);
  }

  function moveToHw(target, keys) {
    if (RUN || INTAKING) { toast('批改或載入檔案進行中，等一下再搬。', 'warn'); return; }
    var moving = S.submissions.filter(function (s) { return keys.indexOf(s.key) >= 0; });
    S.submissions = S.submissions.filter(function (s) { return keys.indexOf(s.key) < 0; });
    moving.forEach(function (s) { markDirty(s.student); });
    pendingMove = null;
    persist();
    switchHw(target).then(function () {
      moving.forEach(function (s) { addSubmission(s.path, s.code); });
      persist();
      renderFiles();
      renderResultsIfAny();
      toast('已把 ' + moving.length + ' 個檔案搬到 ' + HW.title + '。', 'ok');
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
    S.submissions.forEach(function (sub) {
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
    var roster = rosterIndex();
    return order.map(function (k) {
      var g = byStudent[k];
      var got = {}, dup = false, unknown = 0, unsure = 0;
      g.files.forEach(function (sub) {
        if (!sub.qid) { unknown++; return; }
        if (sub.unsure) unsure++;
        if (got[sub.qid]) dup = true;
        got[sub.qid] = true;
      });
      if (!g.name && roster[k]) g.name = roster[k].name;
      g.got = got;
      g.dup = dup;
      g.unknown = unknown;
      g.unsure = unsure;
      g.notInRoster = ROSTER.length > 0 && !roster[k];
      g.wrongHw = !!g.hw && g.hw.toLowerCase() !== HW_ID;
      g.missing = QIDS.filter(function (q) { return !got[q]; });
      g.needsWork = unknown > 0 || unsure > 0 || dup || g.missing.length > 0 || k === '未知' ||
        g.notInRoster || g.wrongHw;
      return g;
    });
  }

  /* 檔名只顯示看得懂的那一截：COOL 塞在前面的流水號對助教沒有意義。
     同一位學生底下有同名檔案時，才補上它的上層資料夾以資區別。 */
  function fileLabel(sub, group) {
    var parts = sub.path.replace(/\s*▸.*$/, '').split('/').filter(Boolean);
    var base = parts[parts.length - 1] || sub.path;
    var cell = (sub.path.match(/▸.*$/) || [''])[0];
    var same = group.files.filter(function (o) {
      var op = o.path.replace(/\s*▸.*$/, '').split('/').filter(Boolean);
      return (op[op.length - 1] || '') === base;
    });
    if (same.length > 1 && parts.length > 1 && !cell) {
      return parts[parts.length - 2] + '/' + base;
    }
    return base + (cell ? ' ' + cell : '');
  }

  function missingText(missing) {
    if (missing.length > 3) {
      return '缺 ' + missing.slice(0, 3).map(qLabel).join('、') + ' 等 ' + missing.length + ' 題';
    }
    return '缺 ' + missing.map(qLabel).join('、');
  }

  function statusPill(g) {
    if (g.unknown) return { cls: 'bad', text: g.unknown + ' 個檔案待指定題號' };
    if (g.missing.length === QIDS.length) return { cls: 'bad', text: '沒有可批改的題目' };
    if (g.unsure) return { cls: 'warn', text: '子題請確認' };
    if (g.missing.length) return { cls: 'warn', text: missingText(g.missing) };
    if (g.dup) return { cls: 'warn', text: '有重複，取最高分' };
    return { cls: 'ok', text: QIDS.length + ' 題齊全' };
  }

  function renderFiles() {
    var list = $('subsList');
    list.innerHTML = '';
    var has = S.submissions.length > 0;
    $('filesCard').hidden = !has;
    $('runAll').disabled = !has || !!RUN;
    $('runAll').textContent = '開始批改';
    renderHwMismatch();

    var groups = groupSubmissions();
    var shown = groups.filter(function (g) { return !onlyProblem || g.needsWork; });
    var nWork = groups.filter(function (g) { return g.needsWork; }).length;
    var nFiles = S.submissions.filter(function (s) { return s.qid; }).length;

    $('fileCount').textContent = groups.length + ' 位學生 · ' + S.submissions.length + ' 個程式';
    $('subsStat').textContent = nWork
      ? nWork + ' 位需要處理'
      : (groups.length ? '全部都對好了' : '');
    if (has) {
      $('runAll').textContent = '開始批改（' + groups.length + ' 位學生、' + nFiles + ' 個檔案）';
    }

    if (!shown.length && groups.length) {
      list.appendChild(el('p', 'muted small', '沒有需要處理的學生，取消勾選就能看到全部。'));
    }

    shown.forEach(function (g) {
      // 第一次看到這位學生、而且有題號還沒指定，就先幫他打開——那才是需要動手的
      if (!seenGroup[g.student]) {
        seenGroup[g.student] = true;
        if (g.unknown || g.unsure) expanded[g.student] = true;
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
      if (g.notInRoster) {
        var nr = el('span', 'badge warn', '不在名單');
        nr.title = '修課名單裡沒有這個學號：可能是學號辨識錯了，展開改學號';
        idn.appendChild(nr);
      }
      head.appendChild(idn);

      if (g.hw) {
        var tg = el('span', 'tagline' + (g.wrongHw ? ' bad' : ''), g.hw);
        if (g.wrongHw) tg.title = '檔案路徑寫的是 ' + g.hw + '，但目前選的是 ' + HW.title;
        head.appendChild(tg);
      }
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
          if (/^[a-z]\d/i.test(v)) v = v.toUpperCase();
          markDirty(g.student);
          g.files.forEach(function (sub) { sub.student = v; });
          // 手動調整跟著學號走，不然改完學號，調整就默默不見了
          if (S.adjust[g.student] && !S.adjust[v]) {
            S.adjust[v] = S.adjust[g.student];
            delete S.adjust[g.student];
          }
          markDirty(v);
          expanded[v] = true;
          delete expanded[g.student];
          persist();
          renderFiles();
          renderResultsIfAny();
        };
        lbl.appendChild(inp);
        tools.appendChild(lbl);
        tools.appendChild(el('span', 'muted small', '改這裡會套用到下面全部檔案'));
        body.appendChild(tools);

        g.files.slice().sort(function (a, b) {
          return (a.qid || 'zz').localeCompare(b.qid || 'zz');
        }).forEach(function (sub) {
          var row = el('div', 'sub-file' + (sub.qid ? '' : ' unset') + (sub.unsure ? ' unsure' : ''));

          var fn = el('code', 'sub-fname', fileLabel(sub, g));
          fn.title = sub.path;
          row.appendChild(fn);

          var sel = el('select');
          sel.setAttribute('aria-label', fileLabel(sub, g) + ' 的題號');
          var opt0 = el('option', '', '未指定（不會批改）');
          opt0.value = '';
          sel.appendChild(opt0);
          PROBLEMS.forEach(function (pr) {
            var o = el('option', '', qLabel(pr.id) + ' ' + pr.name);
            o.value = pr.id;
            sel.appendChild(o);
          });
          sel.value = sub.qid || '';
          sel.onchange = function () {
            sub.qid = sel.value;
            sub.unsure = false;
            markDirty(sub.student);
            persist();
            renderFiles();
            renderResultsIfAny();
          };
          row.appendChild(sel);

          var meta = el('span', 'muted small sub-lines',
            sub.unsure ? '自動配對，請確認' : lineCount(sub.code) + ' 行');
          row.appendChild(meta);

          var del = el('button', 'btn ghost danger small', '移除');
          del.onclick = function () {
            S.submissions = S.submissions.filter(function (x) { return x.key !== sub.key; });
            markDirty(sub.student);
            persist();
            renderFiles();
            renderResultsIfAny();
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
    var totalUnsure = groups.reduce(function (n, g) { return n + g.unsure; }, 0);
    var anyDup = groups.some(function (g) { return g.dup; });
    var nNotRoster = groups.filter(function (g) { return g.notInRoster; }).length;
    if (totalUnknown) {
      msgs.push('有 ' + totalUnknown + ' 個檔案沒辨識出題號，請展開指定或按「自動配對」，未指定的不會批改。');
    }
    if (totalUnsure) {
      msgs.push('有 ' + totalUnsure + ' 個檔案是自動配對到子題（a/b 輸入輸出一樣，試跑分不出來），請展開確認。');
    }
    if (anyDup) msgs.push('同一位學生的同一題有多份，全部都會跑，成績取最高並標 ⚠。');
    if (nNotRoster) msgs.push(nNotRoster + ' 個學號不在修課名單上，可能是學號辨識錯了。');
    $('fileWarn').textContent = msgs.join(' ');
    $('fileWarn').hidden = !msgs.length;
    applyLock();
  }

  /* ------------------------------------------------------------------ */
  /* 比對                                                                 */
  /* ------------------------------------------------------------------ */
  /* --8<-- answer:start（tools/test_detect.py 會把這段抓出來跟 grade_cli.py 對拍） */
  function normalize(text, mode) {
    var lines = String(text === undefined || text === null ? '' : text)
      .replace(/\r\n?/g, '\n').split('\n')
      .map(function (l) { return l.replace(/[ \t]+$/, ''); });
    while (lines.length && lines[lines.length - 1] === '') lines.pop();
    if (mode === 'trim') lines = lines.map(function (l) { return l.replace(/^[ \t\u3000]+|[ \t\u3000]+$/g, ''); });
    if (mode === 'loose') return lines.join('\n').replace(/\s+/g, '').toLowerCase();
    return lines.join('\n');
  }

  /* 「答案對、格式不對」：同學多印了說明文字（BMI = 55.56）或提示字（請輸入身高：）。
   * 這種不該跟算錯一樣直接 0 分，但給多少由助教決定（批改選項「格式不符給分」）。
   *
   * 判定刻意保守，只接受看起來像「標籤」的多餘文字：
   *   - 答案前面只能是空的，或以 : = ： is 是 為 等於 結尾（BMI = 55.56、答案是 Weak）
   *   - 答案後面只能是標點或空白（55.56。）
   *   - 答案前面的標籤不可以有數字（10 = 5 不算印出 5）
   *   - 答案以外多印的整行只能是提示字（以 : ： ? ？ 結尾，例如「請輸入身高：」）
   * 否則 Not Prime,Odd 會被當成 Prime,Odd，一次印出 Weak / Moderate / Strong 三行也會被當成答對。 */
  var ANS_LABEL_END = /(?:[:=：]|(?:^|[^A-Za-z])is|是|為|为|等於|等于)[ \t\u3000]*$/i;
  var ANS_TAIL_OK = /^[ \t\u3000.。!！,，;；)）]*$/;
  var ANS_PROMPT_LINE = /^[^0-9]*[:：?？][ \t\u3000]*$/;

  function lineHasAnswer(line, want) {
    if (line === want) return true;
    if (!want) return false;
    var k = line.indexOf(want);
    while (k >= 0) {
      var pre = line.slice(0, k), post = line.slice(k + want.length);
      if ((pre === '' || (ANS_LABEL_END.test(pre) && !/[0-9]/.test(pre))) && ANS_TAIL_OK.test(post)) return true;
      k = line.indexOf(want, k + 1);
    }
    return false;
  }

  function answerInside(actual, expected, mode) {
    var m = mode === 'loose' ? 'trim' : mode;
    var fold = function (x) { return mode === 'loose' ? x.toLowerCase() : x; };
    var want = normalize(expected, m).split('\n').map(fold);
    var got = normalize(actual, m).split('\n').map(fold);
    if (!want.join('')) return false;
    var i = 0;
    for (var j = 0; j < got.length; j++) {
      if (i < want.length && lineHasAnswer(got[j], want[i])) { i++; continue; }
      if (got[j] !== '' && !ANS_PROMPT_LINE.test(got[j])) return false;
    }
    return i === want.length;
  }
  /* --8<-- answer:end */

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
  /* 助教可以關掉某些測資、加自己的測資、改每題配分。設定存在瀏覽器裡（每份    */
  /* 作業各自一份），也可以匯出成 JSON 交給 tools/grade_cli.py --config，   */
  /* 讓網頁版與命令列用完全相同的一套設定批改。                              */
  /*                                                                     */
  /* 配分模型：題目總分固定，啟用中的測資平分。關掉一組不會讓總分變少，      */
  /* 而是讓剩下的每一組變重。                                              */
  /* ------------------------------------------------------------------ */
  /* --8<-- config:start（tools/test_config.py 會把這段抓出來跟 grade_cli.py 對拍） */
  var CFG_VERSION = 1;
  var LEGACY_CFG_KEY = { hw1: 'hw1.judge.config.v1' };   // 改版前只有 HW1 時存的位置

  function cfgKey() { return 'autojudge.' + HW_ID + '.config.v1'; }

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
      var raw = localStorage.getItem(cfgKey());
      if (raw === null && LEGACY_CFG_KEY[HW_ID]) raw = localStorage.getItem(LEGACY_CFG_KEY[HW_ID]);
      return raw ? sanitizeConfig(JSON.parse(raw)) : emptyConfig();
    } catch (e) {
      return emptyConfig();          // 無痕視窗 / 擋住 site data 都可能讀不到
    }
  }

  function saveConfig() {
    try { localStorage.setItem(cfgKey(), JSON.stringify(CFG)); } catch (e) { /* 存不了就算了 */ }
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
        group: p.group || p.id, checks: p.checks || [], requirement: p.requirement || '',
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

  function round2c(n) { return Math.round(n * 100) / 100; }

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
    lines.push('本次使用 ' + used + ' 組測資（原廠 ' + base + ' 組），總分 ' + round2c(totalPoints()) + ' 分');
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

  /* ------------------------------------------------------------------ */
  /* 寫法要求（HW2 的「用迴圈」「只用切片」「用 set」…）                    */
  /* 只是提示，不自動扣分：靜態分析會誤判，最後由助教看程式碼決定。          */
  /* ------------------------------------------------------------------ */
  function checkViolations(checks, features) {
    if (!checks || !checks.length || !features) return [];
    var has = function (f) { return features.indexOf(f) >= 0; };
    var loop = has('for') || has('while') || has('comp');
    var out = [];
    checks.forEach(function (c) {
      if (c === 'loop' && !loop) out.push('沒有用到迴圈');
      else if (c === 'for' && !has('for') && !has('comp')) out.push('沒有用到 for 迴圈');
      else if (c === 'while' && !has('while')) out.push('沒有用到 while 迴圈');
      else if (c === 'no-loop' && loop) out.push('用了迴圈（這題規定不能用）');
      else if (c === 'def' && !has('def')) out.push('沒有定義函式（def）');
      else if (c === 'set' && !has('set')) out.push('沒有用到 set');
      else if (c === 'slice' && !has('slice')) out.push('沒有用到切片');
      else if (c.indexOf('import:') === 0 && !has(c)) out.push('沒有 import ' + c.slice(7));
    });
    return out;
  }

  /* 用參考解答算出某筆輸入的正確輸出——助教不需要自己手打答案。
     這和 tools/generate_tests.py 的做法一致：答案一律由實際執行參考解答產生。 */
  function solveWithReference(qid, input) {
    var code = SOLUTIONS[qid];
    if (!code) return Promise.reject(new Error('找不到 ' + qLabel(qid) + ' 的參考解答'));
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
  var SETTINGS_KEY = 'autojudge.settings.v1';

  function radioVal(name) {
    var r = document.querySelector('input[name="' + name + '"]:checked');
    return r ? r.value : '';
  }

  function setRadio(name, value) {
    var r = document.querySelector('input[name="' + name + '"][value="' + value + '"]');
    if (r) r.checked = true;
  }

  function settings() {
    return {
      mode: radioVal('compareMode') || 'strict',
      timeout: Math.max(1, parseInt($('timeout').value, 10) || 8) * 1000,
      lenientRe: radioVal('lenientRe') !== '0',
      lenientInput: radioVal('lenientInput') === '1',
      formatCredit: parseFloat(radioVal('formatCredit')) || 0
    };
  }

  /* 開始批改按鈕下面的一行話：現在用的是什麼標準 */
  var COMPARE_TEXT = { strict: '空白、大小寫不同算錯', trim: '空白不同不算錯', loose: '空白、大小寫不同都不算錯' };

  function renderRulesSummary() {
    var s = settings();
    var bits = [
      '多印說明文字：' + ({ 0: '不給分', 0.5: '給一半', 1: '給全分' })[s.formatCredit],
      COMPARE_TEXT[s.mode],
      '程式最後才出錯：' + (s.lenientRe ? '給分' : '不給分')
    ];
    if (s.timeout !== 8000) bits.push('每筆最多 ' + s.timeout / 1000 + ' 秒');
    if (s.lenientInput) bits.push('接受一行拆多次 input()（非老師規定）');
    $('rulesSummary').textContent = '評分標準：' + bits.join(' · ');
  }

  function saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings())); } catch (e) { /* noop */ }
  }

  function restoreSettings() {
    try {
      var s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
      if (!s) return;
      if (/^(strict|trim|loose)$/.test(s.mode)) setRadio('compareMode', s.mode);
      if (s.timeout) $('timeout').value = Math.round(s.timeout / 1000);
      setRadio('lenientRe', s.lenientRe === false ? '0' : '1');
      setRadio('lenientInput', s.lenientInput ? '1' : '0');
      if (s.formatCredit === 0.5 || s.formatCredit === 1) setRadio('formatCredit', String(s.formatCredit));
    } catch (e) { /* noop */ }
  }

  /* 物件的 key 順序不同也要得到同一個字串，不然「改了又改回來」會被誤判成設定變了 */
  function stableStringify(v) {
    if (v === null || typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']';
    return '{' + Object.keys(v).sort().map(function (k) {
      return JSON.stringify(k) + ':' + stableStringify(v[k]);
    }).join(',') + '}';
  }

  /* 會影響分數的設定（逾時秒數只影響慢的程式，也算進去） */
  function currentSig() {
    var s = settings();
    return stableStringify({
      hw: HW_ID, cfg: CFG, mode: s.mode, t: s.timeout,
      tests: activeProblems().map(function (p) {
        return [p.id, p.points, p.tests.map(function (t) { return [t.input, t.expected]; })];
      }),
      re: s.lenientRe, alt: s.lenientInput, pe: s.formatCredit
    });
  }

  function alt2text(input) {
    return altInput(input) + '\n（原本是「' + input + '」一行，這位同學是一個值一個 input() 讀的）';
  }

  function cut(text, n) {
    text = String(text === undefined || text === null ? '' : text);
    return text.length > n ? text.slice(0, n) + '…（已截斷）' : text;
  }

  var RUN = null;             // 進行中的一輪：{ cancel: bool }

  /* 批改中鎖住檔案清單：批到一半改題號、改學號、加檔案，結果會跟這一輪對不上 */
  function applyLock() {
    var on = !!RUN;
    $('filesCard').classList.toggle('locked', on);
    Array.prototype.forEach.call(
      document.querySelectorAll('#subsList input, #subsList select, #subsList .btn, #pickFiles, #pickDir, #loadDemo, #clearFiles, #autoMatch, #hwMismatch button'),
      function (n) { n.disabled = on; });
    $('drop').classList.toggle('locked', on);
    $('lockNote').hidden = !on;
  }

  function busy(on) {
    var has = S.submissions.length > 0;
    $('runAll').disabled = on || !has;
    $('selfTest').disabled = on;
    $('autoMatch').disabled = on;
    $('cancelRun').hidden = !on;
    $('progressBox').hidden = !on && !$('progressText').textContent;
    Array.prototype.forEach.call(document.querySelectorAll('[data-needs-idle]'), function (b) {
      b.disabled = on;
    });
    Array.prototype.forEach.call(document.querySelectorAll('#hwTabs button'), function (b) {
      b.disabled = on && b.getAttribute('aria-selected') !== 'true';
    });
    applyLock();
  }

  function fmtEta(ms) {
    var s = Math.round(ms / 1000);
    if (s < 60) return s + ' 秒';
    return Math.floor(s / 60) + ' 分 ' + (s % 60) + ' 秒';
  }

  /* 批改一批檔案。回傳 { out: 學號->題號->紀錄, done: 完整批完的學號, cancelled } */
  function gradeList(list, label) {
    // 這一輪要批的檔案先複製一份固定下來：學號、題號、程式碼都以開跑那一刻為準
    list = list.map(function (s) {
      return { key: s.key, path: s.path, student: s.student, qid: s.qid, code: s.code };
    });
    var cfg = settings();
    ensureEngine().catch(function () {});
    // 整輪固定用同一份設定快照：批到一半有人改設定，不該讓前後幾位同學用不同的尺
    var ACTIVE = activeProblems();
    var activeOf = function (qid) {
      return ACTIVE.filter(function (p) { return p.id === qid; })[0];
    };
    var totalRuns = 0, remainingSubs = {};
    list.forEach(function (s) {
      var p = s.qid && activeOf(s.qid);
      if (p) {
        totalRuns += p.tests.length;
        remainingSubs[s.student] = (remainingSubs[s.student] || 0) + 1;
      }
    });
    var done = 0, t0 = Date.now();
    RUN = { cancel: false };
    var run = RUN;
    $('progressText').textContent = label + '：準備中…';
    $('bar').style.width = '0%';
    busy(true);

    var out = {}, finished = [];
    var chain = Promise.resolve();

    function progress(sub) {
      $('bar').style.width = (totalRuns ? Math.round(done / totalRuns * 100) : 100) + '%';
      var eta = '';
      if (done >= 3 && done < totalRuns) {
        eta = ' · 預估還要 ' + fmtEta((Date.now() - t0) / done * (totalRuns - done));
      }
      $('progressText').textContent = label + '：' + done + ' / ' + totalRuns +
        '（' + sub.student + ' ' + qLabel(sub.qid) + '）' + eta;
    }

    list.forEach(function (sub) {
      if (!sub.qid) return;
      var prob = activeOf(sub.qid);
      if (!prob) return;
      chain = chain.then(function () {
        if (run.cancel) return;
        var rec = {
          score: 0, max: prob.points, cases: [], passed: 0, reok: 0, viaAlt: 0, pe: 0,
          file: sub.path, key: sub.key, qid: prob.id, flags: [],
          formatCredit: cfg.formatCredit
        };
        var inner = Promise.resolve();
        var stopped = '';
        var tleCount = 0;
        prob.tests.forEach(function (t) {
          inner = inner.then(function () {
            if (run.cancel) return;
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
              // 答案對、只是多印了說明文字：程式正常結束，或印完才出錯而且「印完才出錯」本來就給分
              if ((status === 'wa' || (status === 're' && cfg.lenientRe)) &&
                  answerInside(r.stdout, t.expected, cfg.mode)) status = 'pe';

              var passed = status === 'ac' || (status === 'reok' && cfg.lenientRe);
              if (passed) { rec.score += prob.pointsPerTest; rec.passed++; }
              if (status === 'pe') { rec.pe++; rec.score += prob.pointsPerTest * cfg.formatCredit; }
              if (status === 'reok') rec.reok++;
              if (r.viaAlt) rec.viaAlt++;
              if (status === 'tle') tleCount++;

              // 無窮迴圈的人不要讓他把每一筆逾時都跑完（每次逾時都要重開直譯器）
              if (tleCount >= 2 && !stopped) stopped = '連續逾時兩次，直接判定其餘測資也會逾時';

              rec.cases.push({
                n: t.n, status: status, input: r.viaAlt ? alt2text(t.input) : t.input,
                expected: t.expected, actual: cut(r.stdout, 3000), stderr: cut(r.stderr, 1500),
                note: t.note, kind: t.kind, ms: r.ms, viaAlt: !!r.viaAlt
              });
              done++;
              progress(sub);
            });
          });
        });
        return inner.then(function () {
          if (run.cancel) return;
          if (!prob.checks.length) return;
          return Engine.features(sub.code).then(function (f) {
            rec.features = f;
            rec.flags = checkViolations(prob.checks, f);
          });
        }).then(function () {
          if (run.cancel) return;
          rec.score = Math.round(rec.score * 100) / 100;
          if (!out[sub.student]) out[sub.student] = {};
          var prev = out[sub.student][sub.qid];
          if (!prev || rec.score > prev.score) {
            rec.conflict = !!prev;
            out[sub.student][sub.qid] = rec;
          } else { prev.conflict = true; }
          remainingSubs[sub.student]--;
          if (remainingSubs[sub.student] === 0) finished.push(sub.student);
        });
      });
    });

    return chain.then(function () {
      RUN = null;
      $('bar').style.width = run.cancel ? $('bar').style.width : '100%';
      $('progressText').textContent = run.cancel
        ? label + '已取消（完成 ' + finished.length + ' 位學生）。'
        : label + '完成，共執行 ' + done + ' 筆測資，用時 ' + fmtEta(Date.now() - t0) + '。';
      busy(false);
      return { out: out, done: finished, cancelled: run.cancel };
    }, function (e) {
      RUN = null;
      busy(false);
      $('progressText').textContent = label + '失敗：' + (e && e.message ? e.message : e);
      throw e;
    });
  }

  /* 批改學生的作業並把結果併進 S.results。
     students = null 表示全部重批；否則只重批這幾位（設定必須沒變，才不會混用兩把尺）。 */
  function gradeStudents(students) {
    var sig = currentSig();
    var full = !students;
    if (!full && S.results && S.runSig !== sig) {
      toast('批改設定在上次批改後改過了，只重批部分學生會讓成績混用兩套標準，請按「全部重新批改」。', 'warn', 7000);
      return Promise.resolve();
    }
    var set = students ? students.reduce(function (m, s) { m[s] = true; return m; }, {}) : null;
    var list = S.submissions.filter(function (s) { return s.qid && (!set || set[s.student]); });
    if (!list.length && full) { toast('沒有已指定題號的檔案。', 'warn'); return Promise.resolve(); }
    var info = configSummaryLines();
    var cfg = settings();
    return gradeList(list, full ? '批改中' : '重批中').then(function (res) {
      var fresh = !S.results || S.runSig !== sig;
      if (fresh || (full && !res.cancelled)) S.results = {};
      res.done.forEach(function (st) {
        if (res.out[st]) S.results[st] = res.out[st];
        delete S.dirty[st];
      });
      if (set) {
        // 被重批、但已經沒有任何檔案的學號（例如學號改掉了）-> 舊成績拿掉
        Object.keys(set).forEach(function (st) {
          if (!list.some(function (s) { return s.student === st; })) {
            delete S.results[st];
            delete S.dirty[st];
          }
        });
      }
      if (full && !res.cancelled) S.dirty = {};
      if (res.cancelled) {
        list.forEach(function (s) {
          if (res.done.indexOf(s.student) < 0 && !(S.results[s.student] && !fresh)) S.dirty[s.student] = true;
        });
      }
      S.runSig = sig;
      S.runInfo = info;
      S.runMeta = { mode: cfg.mode, lenientRe: cfg.lenientRe, lenientInput: cfg.lenientInput,
                    formatCredit: cfg.formatCredit,
                    timeout: cfg.timeout, at: Date.now() };
      persist();
      renderScores(true);
      if (res.cancelled) toast('已取消。完成的 ' + res.done.length + ' 位學生成績已保留，其餘標成「需重批」。', 'warn', 6000);
      else if (!full) toast('已重批 ' + res.done.length + ' 位學生。', 'ok');
      if (drawerState) renderDrawer();
    });
  }

  /* 用每題前 2 筆測資試跑，決定沒指定題號的檔案是哪一題。
     a/b 子題輸入輸出一樣，試跑分不出來：放到這位學生還缺的那一個，並標「請確認」。 */
  function autoMatch() {
    var targets = S.submissions.filter(function (s) { return !s.qid; });
    if (!targets.length) { toast('沒有未指定題號的檔案。'); return; }
    ensureEngine().catch(function () {});
    var cfg = settings();
    var reps = [], seenGroupId = {};
    activeProblems().forEach(function (p) {
      if (!p.tests.length || seenGroupId[p.group]) return;
      seenGroupId[p.group] = true;
      reps.push(p);
    });
    if (!reps.length) { toast('目前沒有任何啟用中的測資，無法自動配對。', 'warn'); return; }
    var total = targets.length * reps.length * 2, done = 0;
    RUN = { cancel: false };
    var run = RUN;
    busy(true);

    var chain = Promise.resolve(), matched = 0, unsure = 0;
    targets.forEach(function (sub) {
      chain = chain.then(function () {
        if (run.cancel) return;
        var best = { p: null, hit: 0 };
        var inner = Promise.resolve();
        reps.forEach(function (p) {
          inner = inner.then(function () {
            if (run.cancel) return;
            var hit = 0;
            var two = Promise.resolve();
            p.tests.slice(0, 2).forEach(function (t) {
              two = two.then(function () {
                return Engine.run(sub.code, t.input + '\n', cfg.timeout).then(function (r) {
                  if (r.status === 'ok' && (normalize(r.stdout, cfg.mode) === normalize(t.expected, cfg.mode) ||
                      answerInside(r.stdout, t.expected, cfg.mode))) hit++;
                  done++;
                  $('bar').style.width = (total ? Math.round(done / total * 100) : 100) + '%';
                  $('progressText').textContent = '自動配對：' + done + ' / ' + total;
                });
              });
            });
            return two.then(function () { if (hit > best.hit) best = { p: p, hit: hit }; });
          });
        });
        return inner.then(function () {
          if (!best.p || best.hit < 1) return;
          var siblings = QIDS.filter(function (q) { return (problemOf(q).group || q) === best.p.group; });
          if (siblings.length === 1) { sub.qid = siblings[0]; matched++; return; }
          var have = S.submissions.filter(function (o) {
            return o !== sub && o.student === sub.student && o.qid;
          }).map(function (o) { return o.qid; });
          sub.qid = siblings.filter(function (q) { return have.indexOf(q) < 0; })[0] || siblings[0];
          sub.unsure = true;
          matched++; unsure++;
        });
      });
    });

    return chain.then(function () {
      RUN = null;
      busy(false);
      S.submissions.forEach(function (s) { if (targets.indexOf(s) >= 0 && s.qid) markDirty(s.student); });
      $('progressText').textContent = '自動配對完成：' + matched + ' / ' + targets.length + ' 個檔案配到題號。';
      persist();
      renderFiles();
      toast('自動配對完成：' + matched + ' / ' + targets.length + ' 個檔案配到題號' +
        (unsure ? '，其中 ' + unsure + ' 個是子題，請確認 a/b。' : '。'), unsure ? 'warn' : 'ok', 6000);
    });
  }

  /* ------------------------------------------------------------------ */
  /* 成績表                                                               */
  /* ------------------------------------------------------------------ */
  var view = { q: '', filter: 'all', sort: 'id', dir: 1 };

  function adjOf(student, qid) {
    var a = S.adjust[student] && S.adjust[student][qid];
    return a && (a.delta || a.note) ? a : null;
  }

  function setAdj(student, qid, delta, note) {
    if (!S.adjust[student]) S.adjust[student] = {};
    if (!delta && !note) delete S.adjust[student][qid];
    else S.adjust[student][qid] = { delta: delta || 0, note: note || '' };
    if (!Object.keys(S.adjust[student]).length) delete S.adjust[student];
    persist();
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function finalOf(rec, adj) {
    if (!rec) return null;
    return round2(clamp(rec.score + (adj ? adj.delta : 0), 0, rec.max));
  }

  function nameMap() {
    var m = {};
    S.submissions.forEach(function (s) {
      if (!m[s.student]) { var n = detectName(s.path); if (n) m[s.student] = n; }
    });
    ROSTER.forEach(function (r) { if (r.name) m[r.id] = r.name; });
    return m;
  }

  /* 成績表的每一列：批過的學生 + 名單上沒交的學生 */
  function scoreRows() {
    var ACTIVE = activeProblems();
    var names = nameMap(), roster = rosterIndex();
    var ids = {};
    Object.keys(S.results || {}).forEach(function (id) { ids[id] = true; });
    ROSTER.forEach(function (r) { ids[r.id] = true; });
    // 有交檔案、卻沒有任何成績（例如題號全部沒指定）：一定要列出來，不然匯出時會變成「沒交」
    var hasFiles = {};
    S.submissions.forEach(function (s) { hasFiles[s.student] = true; ids[s.student] = true; });
    return Object.keys(ids).map(function (id) {
      var recs = (S.results && S.results[id]) || null;
      var row = {
        id: id, name: names[id] || '', recs: recs || {}, submitted: !!recs,
        inRoster: !!roster[id], cells: {}, total: 0, adjTotal: 0, flags: [],
        adjusted: false, conflict: false, dirty: !!S.dirty[id], pe: 0,
        pending: !recs && !!hasFiles[id]
      };
      ACTIVE.forEach(function (p) {
        var rec = row.recs[p.id];
        var a = adjOf(id, p.id);
        var fin = finalOf(rec, a);
        row.cells[p.id] = fin;
        if (fin !== null) row.total += fin;
        if (rec && a && a.delta) { row.adjusted = true; row.adjTotal += fin - rec.score; }
        if (rec && rec.flags && rec.flags.length) {
          rec.flags.forEach(function (f) { row.flags.push(qLabel(p.id) + ' ' + f); });
        }
        if (rec && rec.conflict) row.conflict = true;
        if (rec && rec.pe) row.pe += rec.pe;
      });
      row.total = round2(row.total);
      row.adjTotal = round2(row.adjTotal);
      return row;
    });
  }

  function rowMatches(row, full) {
    var q = view.q.trim().toLowerCase();
    if (q && row.id.toLowerCase().indexOf(q) < 0 && row.name.toLowerCase().indexOf(q) < 0) return false;
    switch (view.filter) {
      case 'notfull': return row.submitted && row.total < full;
      case 'flags': return row.flags.length > 0;
      case 'adjusted': return row.adjusted;
      case 'missing': return !row.submitted;
      case 'notroster': return ROSTER.length > 0 && !row.inRoster;
      case 'dirty': return row.dirty || row.pending;
      case 'format': return row.pe > 0;
      default: return true;
    }
  }

  function sortRows(rows) {
    var k = view.sort, dir = view.dir;
    return rows.sort(function (a, b) {
      var va, vb;
      if (k === 'id') { va = a.id; vb = b.id; }
      else if (k === 'name') { va = a.name; vb = b.name; }
      else if (k === 'total') { va = a.submitted ? a.total : -1; vb = b.submitted ? b.total : -1; }
      else { va = a.cells[k]; vb = b.cells[k]; va = va === null ? -1 : va; vb = vb === null ? -1 : vb; }
      if (va < vb) return -dir;
      if (va > vb) return dir;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
  }

  var visibleIds = [];

  function renderResultsIfAny() {
    if (S.results) renderScores(false);
  }

  function renderStale() {
    var box = $('staleBanner');
    box.innerHTML = '';
    var sigChanged = S.results && S.runSig && S.runSig !== currentSig();
    var nDirty = Object.keys(S.dirty).length;
    box.hidden = !(sigChanged || nDirty);
    if (box.hidden) return;
    if (sigChanged) {
      box.appendChild(el('span', '', '批改設定（測資、配分或比對方式）在這批成績算完之後改過了，表上的分數是舊設定的結果。'));
      var all = el('button', 'btn small primary', '全部重新批改');
      all.setAttribute('data-needs-idle', '');
      all.onclick = function () { gradeStudents(null); };
      box.appendChild(all);
      return;
    }
    box.appendChild(el('span', '', nDirty + ' 位學生的檔案在批改後有變動（或還沒批完），表上的分數可能不是最新的。'));
    var some = el('button', 'btn small primary', '只重批這 ' + nDirty + ' 位');
    some.setAttribute('data-needs-idle', '');
    some.onclick = function () { gradeStudents(Object.keys(S.dirty)); };
    box.appendChild(some);
    var show = el('button', 'btn small ghost', '只看這幾位');
    show.onclick = function () { view.filter = 'dirty'; $('scoreFilter').value = 'dirty'; renderScores(false); };
    box.appendChild(show);
  }

  function renderScores(scroll) {
    var card = $('resultCard');
    if (!S.results) { card.hidden = true; return; }
    card.hidden = false;
    var ACTIVE = activeProblems();
    var FULL = round2(totalPoints());
    var rows = scoreRows();
    var shown = sortRows(rows.filter(function (r) { return rowMatches(r, FULL); }));
    visibleIds = shown.map(function (r) { return r.id; });

    /* ---- 表頭（有子題的作業多一列大題） ---- */
    var thead = $('scoreTable').querySelector('thead');
    thead.innerHTML = '';
    var hasGroups = ACTIVE.some(function (p) { return p.group !== p.id; });
    var sortable = function (th, key, label) {
      th.textContent = label;
      th.className = 'sortable' + (view.sort === key ? ' sorted' : '');
      th.setAttribute('aria-sort', view.sort === key ? (view.dir > 0 ? 'ascending' : 'descending') : 'none');
      if (view.sort === key) th.appendChild(el('span', 'arrow', view.dir > 0 ? ' ▲' : ' ▼'));
      th.tabIndex = 0;
      var go = function () {
        if (view.sort === key) view.dir = -view.dir;
        else { view.sort = key; view.dir = (key === 'id' || key === 'name') ? 1 : -1; }
        renderScores(false);
      };
      th.onclick = go;
      th.onkeydown = function (e) { if (e.key === 'Enter') go(); };
      return th;
    };
    if (hasGroups) {
      var g1 = el('tr', 'grouprow');
      g1.appendChild(el('th', '', ''));
      g1.appendChild(el('th', '', ''));
      var i = 0;
      while (i < ACTIVE.length) {
        var gid = ACTIVE[i].group, span = 0, pts = 0;
        while (i + span < ACTIVE.length && ACTIVE[i + span].group === gid) { pts += ACTIVE[i + span].points; span++; }
        var gth = el('th', 'grp', span > 1 ? qLabel(gid) + '（' + round2(pts) + '）' : '');
        gth.colSpan = span;
        g1.appendChild(gth);
        i += span;
      }
      g1.appendChild(el('th', '', ''));
      g1.appendChild(el('th', '', ''));
      thead.appendChild(g1);
    }
    var hr = el('tr');
    hr.appendChild(sortable(el('th'), 'id', '學號'));
    hr.appendChild(sortable(el('th'), 'name', '姓名'));
    ACTIVE.forEach(function (p) {
      var th = sortable(el('th', ''), p.id, qLabel(p.id) + '（' + round2(p.points) + '）');
      th.className += ' num';
      th.title = p.name + (p.requirement ? '｜寫法要求：' + p.requirement : '');
      hr.appendChild(th);
    });
    var tth = sortable(el('th'), 'total', '總分（' + FULL + '）');
    tth.className += ' num';
    hr.appendChild(tth);
    hr.appendChild(el('th', '', '備註'));
    thead.appendChild(hr);

    /* ---- 內容 ---- */
    var tbody = $('scoreTable').querySelector('tbody');
    tbody.innerHTML = '';
    if (!shown.length) {
      var tr0 = el('tr');
      var td0 = el('td', 'muted empty', rows.length ? '沒有符合條件的學生。' : '還沒有成績。');
      td0.colSpan = ACTIVE.length + 4;
      tr0.appendChild(td0);
      tbody.appendChild(tr0);
    }
    shown.forEach(function (row) {
      var tr = el('tr', (row.submitted ? '' : 'missing') + (row.dirty ? ' dirty' : ''));
      var idTd = el('td', 'sid');
      var idBtn = el('button', 'linkbtn', row.id);
      idBtn.disabled = !row.submitted;
      idBtn.onclick = function () { openDrawer(row.id, null); };
      idTd.appendChild(idBtn);
      tr.appendChild(idTd);
      var nmTd = el('td', 'sname', shortName(row.name));
      nmTd.title = row.name;
      tr.appendChild(nmTd);
      ACTIVE.forEach(function (p) {
        var rec = row.recs[p.id];
        var td = el('td', 'score num');
        if (!rec) {
          td.className += ' miss';
          td.textContent = '—';
          td.title = row.submitted ? '沒有這一題的檔案' : '未繳交';
        } else {
          var fin = row.cells[p.id];
          var a = adjOf(row.id, p.id);
          td.textContent = String(fin);
          if (rec.conflict) td.appendChild(el('span', 'mark warn', '⚠'));
          if (rec.flags && rec.flags.length) td.appendChild(el('span', 'mark flag', '⚑'));
          if (a && a.delta) { td.className += ' adj'; td.appendChild(el('span', 'mark adj', '✎')); }
          if (fin === rec.max) td.className += ' full';
          else if (fin === 0) td.className += ' zero';
          var tip = [rec.passed + '/' + rec.cases.length + ' 筆通過' + (rec.pe ? '，' + rec.pe + ' 筆格式不符' : '')];
          if (a && a.delta) tip.push('自動 ' + rec.score + '，手動 ' + (a.delta > 0 ? '+' : '') + a.delta + (a.note ? '（' + a.note + '）' : ''));
          if (rec.flags && rec.flags.length) tip.push('寫法提示：' + rec.flags.join('、'));
          if (rec.conflict) tip.push('有多份檔案，取最高分');
          tip.push('點擊看細節');
          td.title = tip.join(' · ');
          td.tabIndex = 0;
          td.onclick = function () { openDrawer(row.id, p.id); };
          td.onkeydown = function (e) { if (e.key === 'Enter') openDrawer(row.id, p.id); };
        }
        tr.appendChild(td);
      });
      tr.appendChild(el('td', 'total num', row.submitted ? String(row.total) : '0'));
      var note = el('td', 'notes');
      if (row.pending) {
        var pd = el('span', 'badge bad', '有檔案、沒批到');
        pd.title = '這位學生有交檔案，但沒有任何一個檔案被批改（多半是題號沒指定）。回步驟 2 指定題號後重批';
        note.appendChild(pd);
      } else if (!row.submitted) note.appendChild(el('span', 'badge bad', '未繳交'));
      if (ROSTER.length && !row.inRoster) note.appendChild(el('span', 'badge warn', '不在名單'));
      if (row.dirty) note.appendChild(el('span', 'badge warn', '需重批'));
      if (row.flags.length) {
        var fb = el('span', 'badge flag', '⚑ ' + row.flags.length);
        fb.title = row.flags.join('\n');
        note.appendChild(fb);
      }
      if (row.pe) {
        var pb = el('span', 'badge warn', '格式 ' + row.pe);
        pb.title = row.pe + ' 筆測資答案對、但多印了說明文字或提示字';
        note.appendChild(pb);
      }
      if (row.adjusted) {
        var ab = el('span', 'badge adj', '✎ ' + (row.adjTotal > 0 ? '+' : '') + row.adjTotal);
        ab.title = '手動調整合計';
        note.appendChild(ab);
      }
      tr.appendChild(note);
      tbody.appendChild(tr);
    });

    /* ---- 表尾：每題平均與滿分人數（測資有問題時，這裡通常一眼就看得出來） ---- */
    var tfoot = $('scoreTable').querySelector('tfoot');
    tfoot.innerHTML = '';
    var sub = rows.filter(function (r) { return r.submitted; });
    if (sub.length) {
      var fr = el('tr');
      fr.appendChild(el('td', 'muted', '平均'));
      fr.appendChild(el('td', 'muted small', '已批 ' + sub.length + ' 位'));
      ACTIVE.forEach(function (p) {
        var have = sub.filter(function (r) { return r.cells[p.id] !== null; });
        var sum = have.reduce(function (n, r) { return n + r.cells[p.id]; }, 0);
        var nFull = have.filter(function (r) { return r.cells[p.id] === round2(p.points); }).length;
        var td = el('td', 'num muted', have.length ? String(Math.round(sum / have.length * 10) / 10) : '—');
        td.title = have.length + ' 人有交，滿分 ' + nFull + ' 人';
        if (have.length && sum / have.length < p.points * 0.3) {
          td.className += ' lowavg';
          td.title += '。平均特別低：值得點開幾位看看是不是測資或題意的問題';
        }
        fr.appendChild(td);
      });
      var tsum = sub.reduce(function (n, r) { return n + r.total; }, 0);
      fr.appendChild(el('td', 'num total', String(Math.round(tsum / sub.length * 10) / 10)));
      fr.appendChild(el('td', '', ''));
      tfoot.appendChild(fr);
    }

    /* ---- 摘要 ---- */
    var nFullAll = sub.filter(function (r) { return r.total === FULL; }).length;
    var nMissing = rows.length - sub.length;
    var bits = [sub.length + ' 位已批改'];
    if (sub.length) bits.push('平均 ' + Math.round(tsum / sub.length * 10) / 10 + ' 分');
    bits.push('滿分 ' + nFullAll + ' 位');
    if (nMissing) bits.push('未繳交 ' + nMissing + ' 位');
    if (shown.length !== rows.length) bits.push('目前顯示 ' + shown.length + ' 位');
    $('summaryStat').textContent = bits.join(' · ');

    var reokTotal = 0, altTotal = 0, flagTotal = 0, peTotal = 0, peStudents = 0;
    sub.forEach(function (r) {
      Object.keys(r.recs).forEach(function (q) {
        reokTotal += r.recs[q].reok || 0;
        altTotal += r.recs[q].viaAlt || 0;
        peTotal += r.recs[q].pe || 0;
      });
      if (r.pe) peStudents++;
      flagTotal += r.flags.length ? 1 : 0;
    });
    var meta = S.runMeta || {};
    var noteBox = $('gradeNote');
    var msgs = [];
    if (meta.quick) {
      msgs.push('這批成績是用「快速篩檢」跑的：每題錯一筆就不跑剩下的，分數會偏低，不能拿來登記。請關掉快速篩檢後全部重新批改。');
    }
    if (reokTotal) {
      msgs.push('有 ' + reokTotal + ' 筆「輸出完全正確，但程式印完之後才出錯」'
        + '（最常見是結尾多一個 input("按 Enter")），目前'
        + (meta.lenientRe === false ? '算錯' : '算通過') + '。');
    }
    if (altTotal) {
      msgs.push('有 ' + altTotal + ' 筆是同學把一行輸入拆成好幾個 input() 讀，'
        + '已改用逐行輸入重跑並以答案為準。');
    }
    if (flagTotal) {
      msgs.push(flagTotal + ' 位同學有「寫法要求」提示（⚑），請點開看程式碼，需要扣分用「手動調整」。');
    }
    noteBox.hidden = msgs.length === 0;
    noteBox.innerHTML = '';
    msgs.forEach(function (m) { noteBox.appendChild(el('div', '', m)); });
    if (peTotal) {
      /* 格式不符最常見、影響最多人，給分比例直接在這裡改，改完一鍵重批 */
      var credit = meta.formatCredit || 0;
      var pbox = el('div', 'pe-row');
      pbox.appendChild(el('span', '', peStudents + ' 位同學共 ' + peTotal +
        ' 筆「答案對、但多印了說明文字或提示字」（例如印成 BMI = 55.56），目前每筆給 ' +
        CREDIT_TEXT[String(credit)] + '。'));
      [['0', '不給分'], ['0.5', '給一半'], ['1', '給全分']].forEach(function (o) {
        var b = el('button', 'btn small' + (String(credit) === o[0] ? ' primary' : ' ghost'), o[1]);
        b.setAttribute('data-needs-idle', '');
        b.disabled = String(credit) === o[0];
        b.onclick = function () {
          setRadio('formatCredit', o[0]);
          saveSettings();
          renderRulesSummary();
          gradeStudents(null);
        };
        pbox.appendChild(b);
      });
      var see = el('button', 'btn small ghost', '只看這些同學');
      see.onclick = function () { view.filter = 'format'; $('scoreFilter').value = 'format'; renderScores(false); };
      pbox.appendChild(see);
      noteBox.appendChild(pbox);
      noteBox.hidden = false;
    }

    var info = $('runConfigInfo');
    info.innerHTML = '';
    (S.runInfo || configSummaryLines()).forEach(function (line, i) {
      info.appendChild(el('div', i === 0 ? '' : 'small', line));
    });
    if (meta.at) {
      info.appendChild(el('div', 'small', '批改時間 ' + fmtTime(meta.at) + ' · 比對方式：' + MODE_TEXT[meta.mode || 'strict'] +
        ' · 單筆逾時 ' + Math.round((meta.timeout || 8000) / 1000) + ' 秒'));
    }
    info.className = 'runinfo' + (configDiff().changed ? ' changed' : '');
    renderStale();
    busy(!!RUN);
    if (scroll) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  var CREDIT_TEXT = { '0': '0 分（只標出來）', '0.5': '一半分數', '1': '全部分數' };

  var MODE_TEXT = { strict: '嚴格', trim: '忽略每行前後空白', loose: '忽略所有空白與大小寫' };

  var STATUS_TEXT = {
    ac: '正確', wa: '答案錯誤', re: '執行錯誤', tle: '執行逾時',
    reok: '輸出正確但程式出錯', pe: '答案對但格式不符', skip: '未執行'
  };

  /* ------------------------------------------------------------------ */
  /* 學生細節（右側抽屜）：看程式碼、逐筆結果、寫法提示、手動調整，          */
  /* J / K 換學生、← / → 換題目，不用一直捲回表格。                         */
  /* ------------------------------------------------------------------ */
  var drawerState = null;     // { student, qid }

  function openDrawer(student, qid) {
    var recs = S.results && S.results[student];
    if (!recs) return;
    if (!qid || !recs[qid]) {
      qid = QIDS.filter(function (q) { return recs[q]; })[0];
      // 有問題的題目先看：第一個沒滿分的
      var firstBad = QIDS.filter(function (q) {
        return recs[q] && finalOf(recs[q], adjOf(student, q)) < recs[q].max;
      })[0];
      if (firstBad) qid = firstBad;
    }
    drawerState = { student: student, qid: qid };
    $('drawer').hidden = false;
    $('drawerMask').hidden = false;
    document.body.classList.add('drawer-open');
    renderDrawer();
    $('drawerClose').focus();
  }

  function closeDrawer() {
    drawerState = null;
    $('drawer').hidden = true;
    $('drawerMask').hidden = true;
    document.body.classList.remove('drawer-open');
  }

  function drawerStep(dir) {
    if (!drawerState) return;
    var ids = visibleIds.filter(function (id) { return S.results && S.results[id]; });
    var i = ids.indexOf(drawerState.student);
    var next = ids[i + dir];
    if (next) openDrawer(next, drawerState.qid);
  }

  function drawerProblem(dir) {
    if (!drawerState) return;
    var recs = S.results[drawerState.student] || {};
    var qs = QIDS.filter(function (q) { return recs[q]; });
    var i = qs.indexOf(drawerState.qid);
    var next = qs[i + dir];
    if (next) { drawerState.qid = next; renderDrawer(); }
  }

  function codeOf(rec) {
    var sub = S.submissions.filter(function (s) { return s.key === rec.key; })[0];
    return sub ? sub.code : null;
  }

  function codeBlock(code) {
    var pre = el('pre', 'code');
    code.replace(/\n$/, '').split('\n').forEach(function (line) {
      pre.appendChild(el('span', 'ln', line));
    });
    return pre;
  }

  function renderDrawer() {
    if (!drawerState) return;
    var st = drawerState.student;
    var recs = (S.results && S.results[st]) || {};
    var ACTIVE = activeProblems();
    var names = nameMap();
    var FULL = round2(totalPoints());
    var total = 0;
    ACTIVE.forEach(function (p) { var f = finalOf(recs[p.id], adjOf(st, p.id)); if (f !== null) total += f; });

    $('drawerTitle').textContent = st;
    $('drawerName').textContent = names[st] ? shortName(names[st]) : '';
    $('drawerTotal').textContent = round2(total) + ' / ' + FULL + ' 分';
    var ids = visibleIds.filter(function (id) { return S.results[id]; });
    var pos = ids.indexOf(st);
    $('drawerPrev').disabled = pos <= 0;
    $('drawerNext').disabled = pos < 0 || pos >= ids.length - 1;
    $('drawerPos').textContent = pos >= 0 ? (pos + 1) + ' / ' + ids.length : '';

    /* 題目頁籤 */
    var tabs = $('drawerTabs');
    tabs.innerHTML = '';
    ACTIVE.forEach(function (p) {
      var rec = recs[p.id];
      var fin = finalOf(rec, adjOf(st, p.id));
      var b = el('button', 'qtab' + (p.id === drawerState.qid ? ' on' : '') +
        (!rec ? ' none' : fin === rec.max ? ' full' : fin === 0 ? ' zero' : ' part'));
      b.appendChild(el('span', 'qtab-id', qLabel(p.id)));
      b.appendChild(el('span', 'qtab-sc', rec ? String(fin) : '—'));
      if (rec && rec.flags && rec.flags.length) b.appendChild(el('span', 'qtab-flag', '⚑'));
      b.disabled = !rec;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', p.id === drawerState.qid ? 'true' : 'false');
      b.onclick = function () { drawerState.qid = p.id; renderDrawer(); };
      tabs.appendChild(b);
    });

    var body = $('drawerBody');
    body.innerHTML = '';
    var qid = drawerState.qid;
    var rec = recs[qid];
    var prob = ACTIVE.filter(function (p) { return p.id === qid; })[0];
    if (!rec || !prob) { body.appendChild(el('p', 'muted', '這位學生沒有這一題的檔案。')); return; }
    var adj = adjOf(st, qid);
    var fin = finalOf(rec, adj);

    var h = el('h3', '', qLabel(qid) + ' ' + prob.name);
    body.appendChild(h);
    var line = el('p', 'dline');
    line.appendChild(el('strong', 'bigscore' + (fin === rec.max ? ' full' : fin === 0 ? ' zero' : ''), fin + ' / ' + rec.max));
    line.appendChild(el('span', 'muted', ' 分 · ' + rec.passed + '/' + rec.cases.length + ' 筆通過' +
      (rec.pe ? '，' + rec.pe + ' 筆格式不符（每筆給 ' + CREDIT_TEXT[String(rec.formatCredit || 0)] + '）' : '') +
      (adj && adj.delta ? ' · 自動 ' + rec.score + ' 分' : '')));
    body.appendChild(line);
    var fp = el('p', 'muted small path', '檔案：' + rec.file);
    body.appendChild(fp);
    if (rec.conflict) body.appendChild(el('p', 'warn small', '⚠ 這位學生這一題交了不只一份，這裡顯示分數最高的那一份。'));
    if (rec.quick) body.appendChild(el('p', 'warn small', '這是「快速篩檢」的結果，錯一筆後的測資沒有跑。'));

    /* 寫法要求 */
    if (prob.requirement || (prob.checks && prob.checks.length)) {
      var rq = el('div', 'reqbox' + (rec.flags && rec.flags.length ? ' bad' : ' ok'));
      rq.appendChild(el('strong', '', '寫法要求：'));
      rq.appendChild(document.createTextNode(prob.requirement || prob.checks.join('、')));
      if (rec.features === null) {
        rq.appendChild(el('div', 'small', '程式有語法錯誤，無法分析寫法。'));
      } else if (rec.flags && rec.flags.length) {
        rec.flags.forEach(function (f) { rq.appendChild(el('div', 'small', '⚑ ' + f)); });
        rq.appendChild(el('div', 'small muted', '這是靜態分析的提示，不會自動扣分。看過程式碼後需要扣分，請用下面的「手動調整」。'));
      } else if (rec.features) {
        rq.appendChild(el('div', 'small', '✓ 靜態分析沒有發現問題（仍建議抽看程式碼）'));
      }
      body.appendChild(rq);
    }

    /* 手動調整 */
    var adjBox = el('div', 'adjbox');
    adjBox.appendChild(el('strong', '', '手動調整'));
    var dIn = el('input');
    dIn.type = 'number'; dIn.step = '0.5'; dIn.className = 'adj-delta';
    dIn.value = adj && adj.delta ? String(adj.delta) : '';
    dIn.placeholder = '0';
    dIn.setAttribute('aria-label', '加減分');
    var nIn = el('input');
    nIn.type = 'text'; nIn.className = 'adj-note';
    nIn.placeholder = '原因（會寫進成績檔與回饋），例如：沒有用 while';
    nIn.value = adj ? adj.note || '' : '';
    nIn.setAttribute('aria-label', '調整原因');
    var res = el('span', 'muted small');
    function applyAdj() {
      var d = parseFloat(dIn.value);
      if (!isFinite(d)) d = 0;
      d = round2(d);
      setAdj(st, qid, d, nIn.value.trim());
      var f = finalOf(rec, adjOf(st, qid));
      res.textContent = d ? '→ 最後 ' + f + ' 分' + (rec.score + d !== f ? '（已限制在 0~' + rec.max + '）' : '') : '';
      renderScores(false);
      // 頁籤與總分跟著變，但不要整個重畫（會把游標弄丟）
      var tot = 0;
      ACTIVE.forEach(function (p) { var ff = finalOf(recs[p.id], adjOf(st, p.id)); if (ff !== null) tot += ff; });
      $('drawerTotal').textContent = round2(tot) + ' / ' + FULL + ' 分';
      var tab = tabs.querySelector('.qtab.on .qtab-sc');
      if (tab) tab.textContent = String(f);
      line.firstChild.textContent = f + ' / ' + rec.max;
    }
    dIn.oninput = applyAdj;
    nIn.oninput = applyAdj;
    var r1 = el('div', 'adjrow');
    var lb = el('label', 'opt', '加減分 ');
    lb.appendChild(dIn);
    r1.appendChild(lb);
    r1.appendChild(nIn);
    adjBox.appendChild(r1);
    adjBox.appendChild(res);
    if (adj && adj.delta) res.textContent = '→ 最後 ' + fin + ' 分';
    body.appendChild(adjBox);

    /* 程式碼 */
    var code = codeOf(rec);
    var det = el('details', 'codebox');
    det.open = true;
    var sm = el('summary', '', '學生程式碼' + (code !== null ? '（' + lineCount(code) + ' 行）' : ''));
    det.appendChild(sm);
    det.appendChild(code !== null ? codeBlock(code) : el('p', 'muted small', '（這個檔案已經從清單移除，看不到程式碼）'));
    body.appendChild(det);

    /* 逐筆 */
    body.appendChild(el('h4', '', '逐筆測資'));
    rec.cases.forEach(function (c) {
      var ok = c.status === 'ac';
      var wrap = el('div', 'case ' + (c.status === 'skip' ? '' : c.status));
      var head = el('div', 'head');
      head.appendChild(el('span', 'tag ' + (c.status === 'skip' ? '' : c.status), STATUS_TEXT[c.status]));
      head.appendChild(el('strong', '', '#' + c.n));
      head.appendChild(el('span', 'kind ' + c.kind, kindLabel(c.kind)));
      head.appendChild(el('span', 'muted small', c.why ? c.note + '（' + c.why + '）' : c.note));
      wrap.appendChild(head);
      if (!ok && c.status !== 'skip') {
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
      body.appendChild(wrap);
    });

    /* 動作 */
    var acts = el('div', 'row gap wrap-row drawer-acts');
    var rg = el('button', 'btn', '重批這位學生');
    rg.setAttribute('data-needs-idle', '');
    rg.disabled = !!RUN;
    rg.onclick = function () { gradeStudents([st]); };
    acts.appendChild(rg);
    var cp = el('button', 'btn ghost', '複製給這位學生的回饋');
    cp.onclick = function () {
      var row = scoreRows().filter(function (r) { return r.id === st; })[0];
      copyText(feedbackText(row), '回饋已複製，可以直接貼到 COOL 評語。');
    };
    acts.appendChild(cp);
    body.appendChild(acts);
  }

  function copyText(text, okMsg) {
    var done = function () { toast(okMsg || '已複製', 'ok'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallback(); });
    } else fallback();
    function fallback() {
      var ta = el('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast('瀏覽器不允許複製', 'bad'); }
      ta.remove();
    }
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

  function csvCell(v) {
    v = String(v === undefined || v === null ? '' : v);
    if (/^[=+\-@]/.test(v) && !/^-?\d+(\.\d+)?$/.test(v)) v = "'" + v;   // 避免 Excel 把它當公式
    return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }

  function toCsvText(rows) {
    return rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n');
  }

  function exportBlockers() {
    var msgs = [];
    if (S.runMeta && S.runMeta.quick) msgs.push('這批成績是「快速篩檢」跑的，分數偏低');
    if (S.runSig && S.runSig !== currentSig()) msgs.push('批改設定在批改後改過了');
    var nd = Object.keys(S.dirty).length;
    if (nd) msgs.push(nd + ' 位學生的檔案在批改後有變動或還沒批完');
    var np = scoreRows().filter(function (r) { return r.pending; }).length;
    if (np) msgs.push(np + ' 位學生有交檔案但一個都沒批到（多半是題號沒指定），匯出會是 0 分');
    return msgs;
  }

  function confirmExport() {
    var b = exportBlockers();
    if (!b.length) return true;
    return confirm('注意：' + b.join('；') + '。\n\n確定要用目前的成績匯出嗎？');
  }

  function flagNotes(row) {
    return row.flags.join('；');
  }

  function adjNotes(row) {
    var out = [];
    QIDS.forEach(function (q) {
      var a = adjOf(row.id, q);
      if (a && (a.delta || a.note)) {
        out.push(qLabel(q) + ' ' + (a.delta > 0 ? '+' : '') + (a.delta || 0) + (a.note ? ' ' + a.note : ''));
      }
    });
    return out.join('；');
  }

  function toCsv() {
    var ACTIVE = activeProblems();
    var rows = [];
    var head = ['學號', '姓名'];
    ACTIVE.forEach(function (p) { head.push(qLabel(p.id) + '(' + round2(p.points) + ')'); });
    head.push('總分');
    ACTIVE.forEach(function (p) { head.push(qLabel(p.id) + '通過筆數'); });
    head.push('格式不符筆數', '手動調整', '寫法提示', '狀態');
    rows.push(head);
    scoreRows().sort(function (a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; }).forEach(function (r) {
      var line = [r.id, r.name];
      ACTIVE.forEach(function (p) { line.push(r.cells[p.id] === null ? '' : r.cells[p.id]); });
      line.push(r.submitted ? r.total : 0);
      ACTIVE.forEach(function (p) {
        var rec = r.recs[p.id];
        line.push(rec ? rec.passed + '/' + rec.cases.length : '未繳交');
      });
      var status = [];
      if (r.pending) status.push('有檔案但沒批到（題號未指定）');
      else if (!r.submitted) status.push('未繳交');
      if (ROSTER.length && !r.inRoster) status.push('不在名單');
      if (r.conflict) status.push('有重複檔案');
      if (r.dirty) status.push('需重批');
      line.push(r.pe || '', adjNotes(r), flagNotes(r), status.join('、'));
      rows.push(line);
    });
    // 成績單一定要帶著「這是用什麼設定算出來的」，否則兩份 CSV 看起來一樣卻不同義
    rows.push([]);
    rows.push(['批改設定', HW.title]);
    (S.runInfo || configSummaryLines()).forEach(function (line) { rows.push([line]); });
    var m = S.runMeta || {};
    if (m.at) {
      rows.push(['批改時間 ' + fmtTime(m.at) + '，比對方式：' + MODE_TEXT[m.mode || 'strict'] +
        '，輸出正確但程式出錯：' + (m.lenientRe === false ? '不給分' : '給分') +
        (m.lenientInput ? '，相容一行拆多次 input()' : '') +
        '，答案對但格式不符：每筆給 ' + CREDIT_TEXT[String(m.formatCredit || 0)] + (m.quick ? '，快速篩檢（分數不可用）' : '')]);
    }
    return toCsvText(rows);
  }

  function shortIO(s) {
    s = String(s === undefined || s === null ? '' : s).replace(/\n+$/, '').replace(/\n/g, '⏎');
    return s.length > 60 ? s.slice(0, 60) + '…' : s;
  }

  /* 給學生看的回饋：每題分數、錯的那幾筆的輸入 / 應輸出 / 你的輸出、手動調整原因 */
  function feedbackText(row) {
    var ACTIVE = activeProblems();
    var out = [HW.title + ' 總分 ' + (row.submitted ? row.total : 0) + ' / ' + round2(totalPoints())];
    if (!row.submitted) { out.push('未繳交'); return out.join('\n'); }
    ACTIVE.forEach(function (p) {
      var rec = row.recs[p.id];
      if (!rec) { out.push(qLabel(p.id) + '：未繳交（0 分）'); return; }
      var a = adjOf(row.id, p.id);
      var line = qLabel(p.id) + '：' + row.cells[p.id] + ' / ' + rec.max;
      if (rec.passed === rec.cases.length) line += '（全部測資通過）';
      else line += '（' + rec.passed + '/' + rec.cases.length + ' 筆通過）';
      out.push(line);
      rec.cases.forEach(function (c) {
        if (c.status === 'ac' || (c.status === 'reok' && (!S.runMeta || S.runMeta.lenientRe !== false))) return;
        if (c.status === 'skip') return;
        var why = STATUS_TEXT[c.status];
        var detail = '  #' + c.n + ' ' + why + '：輸入 ' + shortIO(c.input) + '，應輸出 ' + shortIO(c.expected);
        if (c.status === 'pe') {
          out.push('  #' + c.n + ' 答案正確但格式不符：應只輸出 ' + shortIO(c.expected) + '，你的輸出 ' + shortIO(c.actual) +
            '（請不要多印說明文字或提示字）');
          return;
        }
        if (c.status === 'wa' || c.status === 'reok') detail += '，你的輸出 ' + (c.actual === '' ? '（沒有輸出）' : shortIO(c.actual));
        if (c.status === 're' && c.stderr) {
          var lastLine = c.stderr.trim().split('\n').pop();
          detail += '，錯誤 ' + shortIO(lastLine);
        }
        out.push(detail);
      });
      if (a && (a.delta || a.note)) {
        out.push('  助教調整 ' + (a.delta > 0 ? '+' : '') + (a.delta || 0) + ' 分' + (a.note ? '：' + a.note : ''));
      }
    });
    return out.join('\n');
  }

  function toFeedbackCsv() {
    var rows = [['學號', '姓名', '總分', '回饋']];
    scoreRows().sort(function (a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; }).forEach(function (r) {
      rows.push([r.id, r.name, r.submitted ? r.total : 0, feedbackText(r)]);
    });
    return toCsvText(rows);
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
    box.appendChild(el('h3', '', qLabel(prob.id) + ' ' + prob.name +
      '：' + prob.tests.length + ' 組啟用中的測資，' + prob.points + ' 分，每組 ' +
      round2(prob.pointsPerTest) + ' 分'));
    var base = problemOf(qid);
    if (base && base.statement) {
      var st = el('details', 'statement');
      st.open = true;
      st.appendChild(el('summary', '', '題目敘述（作業定稿原文）'));
      st.appendChild(el('div', 'statement-body', base.statement));
      box.appendChild(st);
    }
    if (prob.requirement) box.appendChild(el('p', 'muted small', '寫法要求：' + prob.requirement + '（只提示，不自動扣分）'));
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
      var i = el('td'); i.appendChild(el('code', 'io', t.input)); tr.appendChild(i);
      var o = el('td'); o.appendChild(el('code', 'io', t.expected)); tr.appendChild(o);
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
    box.appendChild(el('h3', '', qLabel(qid) + ' 參考解答'));
    box.appendChild(SOLUTIONS[qid] ? codeBlock(SOLUTIONS[qid]) : el('p', 'muted', '（找不到）'));
  }

  function testsAsText() {
    var out = [];
    activeProblems().forEach(function (p) {
      out.push('=== ' + qLabel(p.id) + ' ' + p.name +
        '（' + p.points + ' 分，每組 ' + round2(p.pointsPerTest) + ' 分）===');
      p.tests.forEach(function (t) {
        out.push('--- #' + t.n + ' [' + t.kind + '] ' + t.note);
        out.push('input : ' + t.input.replace(/\n/g, '\n        '));
        out.push('output: ' + t.expected.replace(/\n/g, '\n        '));
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
    if (S.results) renderScores(false);
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
      head.appendChild(el('span', 'cfg-name', qLabel(p.id) + ' ' + p.name));

      /* 配分直接在這一列改，不用展開 */
      var ptsCell = el('span', 'cfg-pts');
      var inp = el('input');
      inp.type = 'number'; inp.min = '0'; inp.max = '1000'; inp.step = '1';
      inp.value = String(p.points);
      inp.className = 'ptsinput';
      inp.setAttribute('aria-label', qLabel(p.id) + ' 配分');
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
    cb.setAttribute('aria-label', '啟用測資 #' + label);
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
      '只要輸入 input，正確輸出由參考解答實際跑出來，不用自己打答案。多行輸入請一行一行打（一行 = 一次 input()）。'));

    var ta = el('textarea');
    ta.rows = 2;
    ta.placeholder = '輸入（例如 ' + (base.tests[0] ? base.tests[0].input.split('\n')[0] : '') + '）';
    ta.value = draft.input;
    ta.setAttribute('aria-label', '自訂測資輸入');
    ta.oninput = function () { draft.input = ta.value; draft.expected = null; renderPreview(); };
    add.appendChild(ta);

    var noteIn = el('input');
    noteIn.type = 'text';
    noteIn.placeholder = '說明：這組在測什麼（選填）';
    noteIn.value = draft.note;
    noteIn.setAttribute('aria-label', '自訂測資說明');
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
      if (!input) { toast('請先填輸入。', 'warn'); ta.focus(); return; }
      calcBtn.disabled = true;
      calcBtn.textContent = RUN ? '等批改的空檔執行…' : '執行參考解答中…';
      ensureEngine().catch(function () {});
      solveWithReference(qid, input).then(function (expected) {
        draft.input = input;
        draft.expected = expected;
        renderPreview();
      }).catch(function (e) {
        draft.expected = null;
        renderPreview();
        preview.appendChild(el('pre', 'errbox', '算不出正確輸出：\n' + (e && e.message ? e.message : e)));
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
      toast('已加入 ' + qLabel(qid) + ' 的自訂測資。', 'ok');
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
  /* 作業切換                                                              */
  /* ------------------------------------------------------------------ */
  function renderHwTabs() {
    var nav = $('hwTabs');
    nav.innerHTML = '';
    ASSIGNMENTS.forEach(function (a) {
      var b = el('button', 'hwtab' + (a.id === HW_ID ? ' on' : ''), a.title);
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', a.id === HW_ID ? 'true' : 'false');
      b.title = a.subtitle || a.title;
      var s = SESSIONS[a.id];
      if (s && s.results) b.appendChild(el('span', 'hwdot', ''));
      b.onclick = function () { if (a.id !== HW_ID) switchHw(a.id); };
      nav.appendChild(b);
    });
  }

  function renderHwInfo() {
    document.title = (HW ? HW.title + ' ' : '') + '自動批改 · Autojudge';
    $('hwTitle').textContent = HW ? HW.title : '';
    $('hwSubtitle').textContent = HW ? HW.subtitle || '' : '';
    $('hwSubmission').textContent = HW ? HW.submission || '' : '';
    $('hwGrading').textContent = HW ? HW.grading || '' : '';
    $('hwHandout').hidden = !(HW && HW.handout);
    if (HW && HW.handout) $('hwHandout').href = HW.handout;
    $('dropTitle').textContent = '把學生的 ' + (HW ? HW.title : '') + ' 繳交檔拖進來';
    var sel = $('viewQ');
    sel.innerHTML = '';
    PROBLEMS.forEach(function (p) {
      var o = el('option', '', qLabel(p.id) + ' ' + p.name);
      o.value = p.id;
      sel.appendChild(o);
    });
    $('viewer').hidden = true;
    viewerShowing = null;
  }

  function renderRoster() {
    var box = $('rosterInfo');
    box.textContent = ROSTER.length
      ? '已匯入 ' + ROSTER.length + ' 人（所有作業共用）。成績表會列出沒交的同學，並標出不在名單上的學號。'
      : '未匯入。匯入後成績表會列出沒交的同學，也能抓出學號辨識錯的檔案。';
    $('rosterClear').hidden = !ROSTER.length;
  }

  function renderAll() {
    renderHwTabs();
    renderHwInfo();
    renderRoster();
    renderFiles();
    refreshCfgUI();
    $('selfTestResult').hidden = true;
    $('progressText').textContent = '';
    $('progressBox').hidden = true;
    renderScores(false);
    busy(!!RUN);
  }

  function switchHw(id) {
    if (RUN) { toast('批改進行中，完成或取消後才能切換作業。', 'warn'); return Promise.resolve(); }
    if (INTAKING) { toast('檔案還在載入，等一下再切換作業。', 'warn'); return Promise.resolve(); }
    if (!assignmentOf(id)) return Promise.resolve();
    SESSIONS[S.hw] = S;
    var save = saveTimer ? flushSave() : Promise.resolve();
    closeDrawer();
    return save.then(function () {
      useAssignment(id);
      try { localStorage.setItem(LAST_HW_KEY, id); } catch (e) { /* noop */ }
      if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
      return loadSession(id);
    }).then(function (s) {
      S = s;
      expanded = {}; seenGroup = {}; cfgDraft = {}; cfgExpanded = {}; pendingMove = null;
      view = { q: '', filter: 'all', sort: 'id', dir: 1 };
      $('scoreSearch').value = '';
      $('scoreFilter').value = 'all';
      renderAll();
      $('saveState').textContent = S.results || S.submissions.length ? '已載入上次的進度' : '';
      $('saveState').className = 'savestate';
    });
  }

  /* ------------------------------------------------------------------ */
  /* 綁定                                                                 */
  /* ------------------------------------------------------------------ */
  function init() {
    if (!ASSIGNMENTS.length) {
      document.querySelector('main').innerHTML = '';
      document.querySelector('main').appendChild(el('p', 'card warn',
        '找不到 data/assignments.js，請先執行 python3 tools/generate_tests.py。'));
      return;
    }

    if (location.protocol === 'file:') {
      setEngineState('fail', '請用 http 開啟（GitHub Pages，或 python3 -m http.server）');
    } else {
      setEngineState('idle', 'Python 尚未載入（放入檔案時才會準備）');
    }
    restoreSettings();

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
    // 檔案不小心丟在拖放區外面時，瀏覽器預設會直接打開那個檔案、把整頁換掉
    ['dragover', 'drop'].forEach(function (t) {
      window.addEventListener(t, function (e) { if (!drop.contains(e.target)) e.preventDefault(); });
    });

    $('clearFiles').onclick = function () {
      if (RUN) return;
      var msg = S.results
        ? '清空 ' + HW.title + ' 的所有檔案、成績與手動調整？這個動作無法復原（建議先匯出成績）。'
        : '清空 ' + HW.title + ' 的所有檔案？';
      if (!confirm(msg)) return;
      S = emptySession(HW_ID);
      expanded = {}; seenGroup = {}; pendingMove = null;
      closeDrawer();
      persist();
      renderAll();
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
      if (RUN) return;
      if (S.submissions.length &&
          !confirm('示範檔會加進目前 ' + HW.title + ' 的繳交清單裡（學號是「參考解答」「漏洞範例-…」）。要繼續嗎？')) return;
      ensureEngine().catch(function () {});
      var tag = HW.title.replace(/\s+/g, '');
      QIDS.forEach(function (q) {
        if (SOLUTIONS[q]) addSubmission('參考解答_' + tag + '/' + q + '.py', SOLUTIONS[q]);
      });
      Object.keys(MUTANTS).forEach(function (name) {
        var q = name.split('_')[0];
        addSubmission('漏洞範例-' + name.replace(/\.py$/, '') + '_' + tag + '/' + q + '.py', MUTANTS[name], q);
      });
      persist();
      renderFiles();
      toast('已載入示範：參考解答 1 位、漏洞程式 ' + Object.keys(MUTANTS).length + ' 份。', 'ok');
    };

    $('runAll').onclick = function () { gradeStudents(null); };
    $('cancelRun').onclick = function () {
      if (RUN) { RUN.cancel = true; $('progressText').textContent += '（取消中，等這一筆跑完…）'; }
    };

    /* 驗證參考解答：結果顯示在這裡，不會蓋掉成績表 */
    $('selfTest').onclick = function () {
      var list = QIDS.filter(function (q) { return SOLUTIONS[q]; }).map(function (q) {
        return { key: 0, path: 'solutions/' + q + '.py', student: '參考解答', qid: q, code: SOLUTIONS[q] };
      });
      var box = $('selfTestResult');
      box.hidden = true;
      gradeList(list, '驗證參考解答').then(function (res) {
        var recs = res.out['參考解答'] || {};
        var total = 0, bad = [];
        QIDS.forEach(function (q) {
          var r = recs[q];
          if (r) total += r.score;
          if (!r || r.score !== r.max) bad.push(qLabel(q) + (r ? ' ' + r.passed + '/' + r.cases.length + ' 筆' : ' 沒跑'));
        });
        var full = round2(totalPoints());
        total = round2(total);
        box.hidden = false;
        box.className = 'selftest ' + (total === full && !res.cancelled ? 'ok' : 'bad');
        box.textContent = res.cancelled ? '已取消。'
          : total === full
            ? '✓ 參考解答拿到 ' + total + ' / ' + full + ' 分，測資、瀏覽器與批改程式一致。'
            : '✗ 參考解答只拿到 ' + total + ' / ' + full + ' 分（' + bad.join('、') +
              '）。請檢查自訂測資或執行環境，這種狀況下不要開始批改。';
      });
    };

    Array.prototype.forEach.call(document.querySelectorAll('#rules input'), function (inp) {
      inp.addEventListener('change', function () {
        saveSettings();
        renderRulesSummary();
        if (S.results) renderScores(false);
      });
    });
    renderRulesSummary();

    /* ---- 成績表工具列 ---- */
    $('scoreSearch').oninput = function () { view.q = $('scoreSearch').value; renderScores(false); };
    $('scoreFilter').onchange = function () { view.filter = $('scoreFilter').value; renderScores(false); };
    $('exportCsv').onclick = function () {
      if (!S.results || !confirmExport()) return;
      download(HW_ID + '_成績.csv', toCsv(), 'text/csv');
    };
    $('exportFeedback').onclick = function () {
      if (!S.results || !confirmExport()) return;
      download(HW_ID + '_回饋.csv', toFeedbackCsv(), 'text/csv');
    };
    $('exportJson').onclick = function () {
      if (!S.results) return;
      var payload = {
        hw: HW_ID,
        summary: S.runInfo || configSummaryLines(),
        settings: S.runMeta,
        config: CFG,
        problems: activeProblems().map(function (p) {
          return { id: p.id, points: p.points, tests: p.tests.length,
                   pointsPerTest: round2(p.pointsPerTest) };
        }),
        adjust: S.adjust,
        names: nameMap(),
        results: S.results
      };
      download(HW_ID + '_批改明細.json', JSON.stringify(payload, null, 1), 'application/json');
    };

    /* ---- 抽屜 ---- */
    $('drawerClose').onclick = closeDrawer;
    $('drawerMask').onclick = closeDrawer;
    $('drawerPrev').onclick = function () { drawerStep(-1); };
    $('drawerNext').onclick = function () { drawerStep(1); };
    document.addEventListener('keydown', function (e) {
      if (!drawerState) return;
      var t = e.target && e.target.tagName;
      var typing = t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT';
      if (e.key === 'Escape') { closeDrawer(); return; }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'j' || e.key === 'J') { e.preventDefault(); drawerStep(1); }
      else if (e.key === 'k' || e.key === 'K') { e.preventDefault(); drawerStep(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); drawerProblem(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); drawerProblem(-1); }
    });

    /* ---- 修課名單 ---- */
    $('rosterImport').onclick = function () { $('rosterFile').click(); };
    $('rosterFile').onchange = function (e) {
      var f = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!f) return;
      readFileText(f).then(function (text) {
        var list = parseRoster(text);
        if (!list.length) { toast('這個檔案裡找不到學號（需要一欄像 B11901234 的學號）。', 'bad'); return; }
        ROSTER = list;
        saveRoster();
        renderRoster();
        renderFiles();
        renderResultsIfAny();
        var noName = list.filter(function (r) { return !r.name; }).length;
        toast('已匯入名單 ' + list.length + ' 人' + (noName ? '（其中 ' + noName + ' 人沒有姓名欄）' : '') + '。', 'ok');
      });
    };
    $('rosterClear').onclick = function () {
      if (!confirm('清除修課名單？（不會影響成績）')) return;
      ROSTER = [];
      saveRoster();
      renderRoster();
      renderFiles();
      renderResultsIfAny();
    };

    $('viewTests').onclick = function () { renderTests($('viewQ').value); };
    $('viewSol').onclick = function () { renderSolution($('viewQ').value); };
    $('downloadTests').onclick = function () { download(HW_ID + '_測資.txt', testsAsText()); };

    /* ---- 測資與配分設定 ---- */
    $('cfgExport').onclick = function () {
      var payload = { hw: HW_ID };
      Object.keys(CFG).forEach(function (k) { payload[k] = CFG[k]; });
      download(HW_ID + '_批改設定.json', JSON.stringify(payload, null, 1), 'application/json');
    };
    $('cfgImport').onclick = function () { $('cfgFile').click(); };
    $('cfgFile').onchange = function (e) {
      var f = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!f) return;
      readFileText(f).then(function (text) {
        var parsed;
        try { parsed = JSON.parse(text); }
        catch (err) { toast('這不是合法的 JSON 檔。', 'bad'); return; }
        if (parsed && parsed.config && typeof parsed.config === 'object') parsed = parsed.config;
        var from = parsed && typeof parsed.hw === 'string' ? parsed.hw : '';
        if (from && from !== HW_ID &&
            !confirm('這份設定是 ' + from.toUpperCase() + ' 的，目前選的是 ' + HW.title + '。確定要套用嗎？')) return;
        CFG = sanitizeConfig(parsed);
        cfgDraft = {};
        cfgChanged();
        toast('設定已匯入：' + configSummaryLines().join('；'), 'ok', 6000);
      });
    };
    $('cfgReset').onclick = function () {
      if (!configDiff().changed) { toast('目前就是原廠設定。'); return; }
      if (!confirm('把 ' + HW.title + ' 的配分與測資全部恢復成原廠設定？自訂測資會一併刪除。')) return;
      CFG = emptyConfig();
      cfgDraft = {};
      cfgChanged();
    };

    window.addEventListener('hashchange', function () {
      var id = location.hash.replace(/^#/, '').toLowerCase();
      if (assignmentOf(id) && id !== HW_ID) switchHw(id);
    });
    /* 同一個網頁開兩個分頁，兩邊各自自動儲存會互相蓋掉進度：偵測到就提醒 */
    try {
      var tabs = new BroadcastChannel('autojudge');
      var warnTabs = function () {
        toast('這個批改網頁在另一個分頁（或視窗）也開著。兩邊同時改會互相覆蓋進度，請只留一個分頁。', 'bad', 15000);
      };
      tabs.onmessage = function (e) {
        if (e.data === 'hello') { tabs.postMessage('here'); warnTabs(); }
        else if (e.data === 'here') warnTabs();
      };
      tabs.postMessage('hello');
    } catch (e) { /* 舊瀏覽器沒有 BroadcastChannel */ }
    window.addEventListener('beforeunload', function (e) {
      if (saveTimer) flushSave();
      if (RUN) { e.preventDefault(); e.returnValue = ''; }
    });

    loadSession(HW_ID).then(function (s) {
      S = s;
      renderAll();
      if (S.results || S.submissions.length) {
        $('saveState').textContent = '已載入上次的進度';
        toast('已載入 ' + HW.title + ' 上次的進度（' + S.submissions.length + ' 個檔案' +
          (S.results ? '、' + Object.keys(S.results).length + ' 位的成績' : '') + '）。', 'ok');
      }
      // 其他作業的進度也先讀進來，作業頁籤上才能標出「這份有成績」
      ASSIGNMENTS.forEach(function (a) {
        if (a.id !== HW_ID) loadSession(a.id).then(renderHwTabs);
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
