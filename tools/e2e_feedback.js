#!/usr/bin/env node
/* 學生回饋文字與修課名單的端到端測試（真瀏覽器 + Pyodide）。需要 Playwright，所以沒接在 CI，改了回饋格式後手動跑：
 *   python3 -m http.server 8765 &     # 在專案根目錄
 *   node tools/e2e_feedback.js          # 可用 CHROME=/path/to/chrome、BASE=http://127.0.0.1:8765 覆蓋
 */
const fs = require('fs');
const os = require('os');
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
  const ctx = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'], viewport: { width: 1280, height: 1000 } });
  const page = await ctx.newPage();
  page.on('dialog', (d) => d.accept());
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(BASE + '/#hw1');
  await page.evaluate(() => { try { indexedDB.deleteDatabase('autojudge'); } catch (e) { /* noop */ } });
  await page.reload();

  // 名單：角色欄在最前面（真實情況：姓名欄曾整排變成「學生」）
  const roster = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'roster_')), 'roster.csv');
  fs.writeFileSync(roster, '角色,學號,姓名,Email,班別\n學生,B11902001,王小明,a@b.c,IM1011-02\n旁聽生,B11902002,陳小華,d@e.f,IM1011-02\n');
  await page.setInputFiles('#rosterFile', roster);
  await page.click('#loadDemo');
  await page.waitForFunction(() => /Python 就緒/.test(document.getElementById('engineText').textContent), null, { timeout: 120000 });
  await page.click('#runAll');
  await page.waitForFunction(() => /完成/.test(document.getElementById('progressText').textContent), null, { timeout: 300000 });

  console.log('修課名單');
  const rows = await page.$$eval('#scoreTable tbody tr', (trs) => trs.map((t) => t.innerText.replace(/\s+/g, ' ')));
  check(rows.some((r) => /B11902001 王小明/.test(r)), '姓名是「王小明」，不是角色欄的「學生」');
  check(rows.some((r) => /B11902002 陳小華/.test(r)), '旁聽生的姓名是「陳小華」，不是「旁聽生」');

  const open = async (src) => {
    await page.evaluate((s) => {
      const r = new RegExp(s);
      Array.from(document.querySelectorAll('#scoreTable tbody tr')).find((t) => r.test(t.innerText)).querySelector('button, td:nth-child(3)').click();
    }, src);
    await page.waitForSelector('.drawer-acts button:has-text("複製給這位學生的回饋")');
  };
  const copy = async () => {
    await page.click('.drawer-acts button:has-text("複製給這位學生的回饋")');
    return page.evaluate(() => navigator.clipboard.readText());
  };

  console.log('回饋文字');
  await open('漏洞範例-q1_round_nopad');
  let t = await copy();
  check(/總分 6 \/ 100（測資答對 2 \/ 30 筆）/.test(t), '標題列有總分與測資答對筆數');
  check(/#1 答案錯誤：輸入 2 100，應輸出 25\.00，你的輸出 25\.0/.test(t), '答案錯誤列出輸入、應輸出、你的輸出');
  check(/這組在測：整數輸入且 BMI 為整數 25/.test(t), '有「這組在測」說明（只留第一段用意）');
  check(/Q2：未繳交（0 分）：沒有收到 q2\.py/.test(t), '未繳交寫明沒收到哪個檔案');

  await open('漏洞範例-q2_str_zero');
  t = await copy();
  check(/執行錯誤：輸入 .*，應輸出 Error，錯誤 ZeroDivisionError: float division by zero（第 \d+ 行）/.test(t), '執行錯誤寫出錯誤種類與第幾行');

  await page.keyboard.press('Escape');
  await open('參考解答');
  await page.click('button:has-text("改判錯") >> nth=0');
  t = await copy();
  check(/#1 沒有照格式：輸入 .*，應輸出 .*，你的輸出 /.test(t), '助教改判錯：「沒有照格式」後面仍有輸入、應輸出、你的輸出');
  check(!/助教改判為錯誤/.test(t), '不再出現「助教改判為錯誤」');

  check(errs.length === 0, '沒有 JavaScript 錯誤' + (errs.length ? '：' + errs.join('; ') : ''));
  await browser.close();
  if (failed) { console.log('\n\x1b[31m失敗 ' + failed + ' 項\x1b[0m'); process.exit(1); }
  console.log('\n\x1b[32m通過\x1b[0m');
})().catch((e) => { console.error('FAILED', e); process.exit(1); });
