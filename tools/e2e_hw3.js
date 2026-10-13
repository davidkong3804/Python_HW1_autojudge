#!/usr/bin/env node
/* HW3（讀寫檔案的題目）的端到端測試（真瀏覽器 + Pyodide）。需要 Playwright，所以沒接在 CI，改了 worker.js / app.js 後手動跑：
 *   python3 -m http.server 8765 &     # 在專案根目錄
 *   node tools/e2e_hw3.js               # 可用 CHROME=/path/to/chrome、BASE=http://127.0.0.1:8765 覆蓋
 */
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) {
  ({ chromium } = require(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'playwright')));
}
const BASE = process.env.BASE || 'http://127.0.0.1:8765';
let failed = 0;
const check = (cond, msg) => { if (!cond) failed++; console.log('  ' + (cond ? '\x1b[32m✓\x1b[0m ' : '\x1b[31m✗\x1b[0m ') + msg); };

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  page.on('dialog', (d) => d.accept());
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(BASE + '/#hw3');
  await page.evaluate(() => { try { indexedDB.deleteDatabase('autojudge'); localStorage.clear(); } catch (e) { /* noop */ } });
  await page.reload();

  console.log('驗證參考解答（Q2 寫檔、Q3 讀檔都要在瀏覽器裡跑對）');
  await page.click('#selfTest');
  await page.waitForFunction(() => { const b = document.getElementById('selfTestResult'); return b && !b.hidden && b.textContent; },
    null, { timeout: 300000 });
  const self = await page.textContent('#selfTestResult');
  check(/100 \/ 100/.test(self), '參考解答 100 / 100：' + self.trim());

  console.log('示範：每一支漏洞程式都被扣分');
  await page.click('#loadDemo');
  await page.click('#runAll');
  await page.waitForFunction(() => /完成/.test(document.getElementById('progressText').textContent), null, { timeout: 600000 });
  const rows = await page.$$eval('#scoreTable tbody tr', (trs) => trs.map((t) => Array.from(t.cells).map((c) => c.innerText.trim())));
  const ref = rows.find((r) => r.some((c) => /參考解答/.test(c)));
  check(ref && ref.some((c) => c === '100'), '參考解答那一列總分 100');
  const muts = rows.filter((r) => r.some((c) => /漏洞範例-q\d_/.test(c)));
  check(muts.length >= 20, '漏洞程式有 ' + muts.length + ' 份');
  const heads = await page.$$eval('#scoreTable thead th', (ths) => ths.map((t) => t.innerText.trim()));
  const scoreOf = {};
  muts.forEach((r) => {
    const name = r.find((c) => /漏洞範例-q\d_/.test(c)).match(/漏洞範例-(q\d_\w+)/)[1];
    const col = heads.findIndex((h) => h.toUpperCase().startsWith(name.slice(0, 2).toUpperCase()));
    scoreOf[name] = parseFloat(r[col]);
  });
  const full = Object.keys(scoreOf).filter((k) => !(scoreOf[k] < 25));
  check(full.length === 0, '每一支漏洞程式在自己那一題都拿不到 25 分' + (full.length ? '：' + full.join('、') : ''));
  if (process.env.SHOW) console.log(JSON.stringify(scoreOf));

  console.log('細節：Q2 的輸入要顯示附的檔案，輸出要接上程式寫出的檔案');
  await page.evaluate(() => {
    const tr = Array.from(document.querySelectorAll('#scoreTable tbody tr')).find((t) => /q2_outfile_only_on_success/.test(t.innerText));
    const cells = Array.from(tr.cells);
    const qcol = Array.from(document.querySelectorAll('#scoreTable thead th')).findIndex((th) => /^Q2/.test(th.innerText.trim()));
    (cells[qcol].querySelector('button') || cells[qcol]).click();
  });
  await page.waitForTimeout(800);
  const drawer = await page.evaluate(() => document.body.innerText);
  check(/=== out_missing\.txt（空檔案）===/.test(drawer), '應該輸出有「=== out_missing.txt（空檔案）===」');
  check(/【附的檔案 op_mod\.txt】\s*4 % 2/.test(drawer), '輸入欄顯示附的檔案 op_mod.txt 的內容');

  console.log('自訂測資：Q3 加一組附檔案的測資');
  await page.click('#drawerClose');
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const head = Array.from(document.querySelectorAll('#cfgList .sub-head')).find((h) => /Q3/.test(h.innerText));
    head.click();
  });
  await page.fill('textarea[aria-label="自訂測資輸入"]', 'mine.txt');
  await page.fill('textarea[aria-label="自訂測資附的檔案"]', '=== mine.txt ===\n2\n41 10 10 10\n42 20 20 20');
  await page.click('button:has-text("用參考解答算出正確輸出")');
  await page.waitForSelector('.cfgpreview pre', { timeout: 60000 });
  const pv = await page.textContent('.cfgpreview pre');
  check(pv.trim() === '42,60', '參考解答讀到自訂的檔案，算出 42,60（實際：' + pv.trim() + '）');
  await page.click('button:has-text("加入這組測資")');
  await page.click('#selfTest');
  await page.waitForFunction(() => /100 \/ 100|只拿到/.test(document.getElementById('selfTestResult').textContent) &&
    !/^\s*$/.test(document.getElementById('selfTestResult').textContent), null, { timeout: 300000 });
  await page.waitForTimeout(500);
  const self2 = await page.textContent('#selfTestResult');
  check(/100 \/ 100/.test(self2), '加了自訂測資之後參考解答仍然 100 分：' + self2.trim());

  check(errs.length === 0, '頁面沒有 JS 錯誤' + (errs.length ? '：' + errs.join(' | ') : ''));
  await browser.close();
  console.log(failed ? '\x1b[31m' + failed + ' 項失敗\x1b[0m' : '\x1b[32m全部通過\x1b[0m');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
