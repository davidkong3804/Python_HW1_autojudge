#!/usr/bin/env node
/* 「a、b 寫在同一個檔案」的端到端測試：用真的瀏覽器（Chromium + Pyodide）開批改網頁，
 * 放進合成的繳交檔，檢查拆分、批改、還原、手動拆分都動得起來。
 *
 * 需要 Playwright（npm i -g playwright，且有 Chromium），所以沒有接在 CI；改了 assets/app.js 之後手動跑：
 *   python3 -m http.server 8765 &          # 在專案根目錄
 *   node tools/e2e_split.js                 # 可用 CHROME=/path/to/chrome、BASE=http://127.0.0.1:8765 覆蓋
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) {
  try { ({ chromium } = require(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'playwright'))); }
  catch (e2) { console.error('找不到 playwright'); process.exit(2); }
}

const ROOT = path.resolve(__dirname, '..');
const BASE = process.env.BASE || 'http://127.0.0.1:8765';
const sol = (q) => fs.readFileSync(path.join(ROOT, 'hw/hw2/solutions', q + '.py'), 'utf8')
  .split('\n').filter((l) => !l.startsWith('#')).join('\n').trim() + '\n';

// ---- 合成繳交檔 ----
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e_split_'));
const dir = path.join(tmp, 'B11111111_HW2');
fs.mkdirSync(dir);
const files = {
  'q1.py': '# Q1a\n' + sol('q1a') + '\n# Q1b\n' + sol('q1b'),               // 有標記
  'q2.py': sol('q2a') + '\n\n' + sol('q2b'),                                 // 沒標記
  'q3.py': sol('q3a'),                                                       // 只有一種寫法、沒寫 a/b
  'q4a.py': sol('q4a'), 'q4b.py': sol('q4b'),                                // 標準
  'q5.py': JSON.stringify({ cells: [{ cell_type: 'code', source: ['print(1)'] }], nbformat: 4 }),   // 筆記本 JSON
  'HW2Q6.py': sol('q6'),                                                     // HW2 黏在題號前
};
Object.keys(files).forEach((n) => fs.writeFileSync(path.join(dir, n), files[n]));
const upload = Object.keys(files).map((n) => path.join(dir, n));

let failed = 0;
const check = (cond, msg) => { if (!cond) { failed++; console.log('  \x1b[31m✗\x1b[0m ' + msg); } else console.log('  \x1b[32m✓\x1b[0m ' + msg); };

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  let promptAnswer = '';
  page.on('dialog', (d) => d.accept(d.type() === 'prompt' ? promptAnswer : undefined));

  await page.goto(BASE + '/#hw2');
  await page.evaluate(() => { try { indexedDB.deleteDatabase('autojudge'); } catch (e) { /* noop */ } });
  await page.reload();
  // 檔案放在資料夾裡才認得到學號：用 webkitRelativePath 的做法在 setInputFiles 做不到，所以改放 zip 之外的散裝檔 + 學號寫在檔名
  const renamed = [];
  for (const n of Object.keys(files)) {
    const p = path.join(tmp, 'B11111111_HW2_' + n);
    fs.copyFileSync(path.join(dir, n), p);
    renamed.push(p);
  }
  await page.setInputFiles('#fileInput', renamed);
  await page.waitForFunction(() => /Python 就緒/.test(document.getElementById('engineText').textContent), null, { timeout: 180000 });
  await page.waitForFunction(() => !/正在檢查/.test(document.getElementById('subsStat').textContent), null, { timeout: 120000 });
  await page.waitForTimeout(500);
  await page.evaluate(() => { const h = document.querySelector('.sub-head'); if (h && !h.parentElement.classList.contains('open')) h.click(); });
  const rowText = () => page.$$eval('.sub-file', (rs) => rs.map((r) => r.innerText.replace(/\s+/g, ' ').trim()));

  console.log('收件與自動分析');
  let rows = await rowText();
  check(rows.filter((r) => /自動拆出（依註解/.test(r)).length === 2, 'q1.py 依註解拆成 2 段');
  check(rows.filter((r) => /試跑猜的切點/.test(r)).length === 2, 'q2.py 沒有標記，試跑猜切點拆成 2 段');
  check(rows.some((r) => /q3\.py/.test(r) && /依寫法猜/.test(r)), 'q3.py 只有一種寫法，依寫法猜子題');
  check(!rows.some((r) => /q4a\.py/.test(r) && /自動拆出/.test(r)), '標準的 q4a.py 沒有被動到');
  check(await page.$$eval('.sub select', (ss) => ss.some((s) => s.value === 'q6')), 'HW2Q6.py 認得是 q6');

  console.log('批改');
  await page.click('#runAll');
  await page.waitForFunction(() => /完成|已取消|失敗/.test(document.getElementById('progressText').textContent), null, { timeout: 300000 });
  const table = await page.$$eval('#scoreTable tbody tr', (trs) => trs.map((tr) => Array.from(tr.querySelectorAll('td,th')).map((td) => td.innerText.trim().replace(/\s+/g, ' '))));
  const me = table.find((r) => r[0] === 'B11111111') || [];
  const cell = (i) => (me[2 + i] || '').replace(/[⚑⚠✎]/g, '').trim();
  // 欄位：q1a q1b q2a q2b q3a q3b q4a q4b q5 q6
  check(cell(0) === '10' && cell(1) === '10', 'Q1a、Q1b 都拿滿分（' + cell(0) + ',' + cell(1) + '）');
  check(cell(2) === '10' && cell(3) === '10', 'Q2a、Q2b 都拿滿分（' + cell(2) + ',' + cell(3) + '）');
  check(cell(4) === '10', 'Q3a 拿滿分（' + cell(4) + '）');
  check(cell(6) === '10' && cell(7) === '10', 'Q4a、Q4b 拿滿分');
  check(cell(9) === '10', 'Q6 拿滿分');
  check(/ipynb/.test(me.join(' ')), '筆記本 JSON 的 q5.py 有標示');

  console.log('還原與手動拆分');
  await page.evaluate(() => { const h = document.querySelector('.sub-head'); if (h && !h.parentElement.classList.contains('open')) h.click(); });
  await page.waitForTimeout(200);
  const undoBtns = await page.$$('.sub-file button:has-text("還原成一個檔案")');
  check(undoBtns.length === 4, '4 段都有「還原成一個檔案」按鈕');
  await undoBtns[0].click();
  await page.waitForTimeout(300);
  rows = await rowText();
  check(!rows.some((r) => /q1\.py ▸/.test(r)) && rows.some((r) => /q1\.py/.test(r)), '還原後 q1.py 回到一個檔案');
  const total = fs.readFileSync(path.join(dir, 'q1.py'), 'utf8').replace(/\n+$/, '').split('\n').length;
  const lineB = fs.readFileSync(path.join(dir, 'q1.py'), 'utf8').split('\n').findIndex((l) => l === '# Q1b') + 1;
  promptAnswer = String(lineB);
  const manual = await page.$$('.sub-file button:has-text("拆成兩段")');
  check(manual.length >= 1, '還原後出現「拆成兩段…」按鈕（共 ' + total + ' 行）');
  // 第一個「拆成兩段」就是 q1.py（已還原且排在最前面）
  const idx = (await rowText()).findIndex((r) => /q1\.py/.test(r) && !/▸/.test(r));
  const allManual = await page.$$('.sub-file');
  await (await allManual[idx].$('button:has-text("拆成兩段")')).click();
  await page.waitForTimeout(300);
  rows = await rowText();
  check(rows.filter((r) => /手動拆出/.test(r)).length === 2, '手動指定第 ' + lineB + ' 行後拆成 2 段');

  check(errors.length === 0, '沒有 JavaScript 錯誤' + (errors.length ? '：' + errors.join('; ') : ''));
  await browser.close();
  fs.rmSync(tmp, { recursive: true, force: true });
  if (failed) { console.log('\n\x1b[31m失敗 ' + failed + ' 項\x1b[0m'); process.exit(1); }
  console.log('\n\x1b[32m端到端測試通過\x1b[0m');
})().catch((e) => { console.error('FAILED', e); process.exit(1); });
