# HW1 測資 + 自動批改（助教用）

程式設計 HW1（6 題）的**測資**、**參考解答**、**驗證工具**，以及一個直接跑在瀏覽器裡的**自動批改網頁**。
批改全程在本機瀏覽器完成（Pyodide = WebAssembly 版 CPython），學生的程式**不會上傳到任何伺服器**，
`vendor/` 已經把 Python 執行環境打包進來，所以**離線也能批改**。

```
配分：Q1~Q4 各 15 分、Q5~Q6 各 20 分，共 100 分
測資：每題 10 組（題目範例 + 特殊測資 + 過濾過的隨機測資）
      Q1~Q4 每組 1.5 分、Q5~Q6 每組 2 分
```

---

## 一、怎麼用（助教批改）

1. 打開 GitHub Pages 網址（或在本機執行 `python3 -m http.server` 後開 `http://localhost:8000`）。
2. 等右上角顯示「Python 執行環境就緒」。
3. 把學生的 `學號_HW1.zip` 全部拖進去 —— 幾十份一起拖沒問題，
   COOL 整包下載那種「zip 裡面還有 zip」也吃得下。
4. 確認表格裡的學號與題號（認錯可以直接用下拉選單改；認不出題號的可以按「自動配對」，
   它會拿每題前兩筆測資去試跑來判斷）。
5. 按「開始批改」→ 成績表出來後點任何一格，可以看那一題 10 筆測資的逐筆輸入 / 應該輸出 / 實際輸出。
6. 「匯出 CSV」給成績用，「匯出 JSON」保留逐筆明細備查。

第一次批改前建議先按一次 **「先驗證參考解答」**，確認測資與執行環境一致（應該剛好 100 分）。
按「載入示範」可以看到 24 支**故意寫錯的程式**分別被扣到幾分 —— 這就是「有漏洞的程式拿不到滿分」的證據。

### 判定方式

| 狀態 | 意思 |
|---|---|
| 正確 | 輸出與正解相符 |
| 答案錯誤 | 程式跑完了但輸出不對 |
| 輸出正確但程式出錯 | 答案印對了，程式之後才爆掉（多半是結尾多一個 `input()`）|
| 執行錯誤 | 語法錯誤 / 例外（會顯示 Traceback，已經濾掉批改程式自己的框架） |
| 執行逾時 | 預設 8 秒；無窮迴圈或還在等下一個 `input()` |

比對預設「嚴格」：只忽略行尾空白與結尾空行。可切成「忽略每行前後空白」或「忽略所有空白與大小寫」。
同一位學生的同一題如果有多份檔案，全部都會跑，成績取最高並標 ⚠。

### 對同學寬鬆的地方（預設開啟，可關掉）

原則是**只要答案是對的就給分**，不要因為寫法習慣不同而扣到無辜的人：

| 同學的寫法 | 批改程式怎麼處理 |
|---|---|
| `input("請輸入身高：")` 有提示字 | 提示字不算輸出，不扣分 |
| `h=input()` `w=input()` 一個值一個讀 | 第一次跑失敗時，自動把那一行拆成逐行輸入再跑一次，答案對就算對 |
| `sys.stdin.read()` 一次吃完 / `for line in sys.stdin` | 本來就吃得下 |
| 印完答案後多一個 `input("按 Enter 結束")` | 輸出正確就給分 |
| 檔案是 Big5 / UTF-16 / 有 BOM / CRLF | 自動辨識編碼、去掉 BOM，不會因此變成語法錯誤 |
| `sys.exit()`、`__file__`、把 `sys.stdout` 關掉 | 都不影響批改 |

兩個寬鬆選項都在「開始批改」那一排，關掉就變回嚴格 OJ 的算法；
命令列版對應 `--strict-input` / `--strict-output`。
成績表下方會顯示「這次有幾筆是靠寬鬆規則過的」，方便助教抽查。

### 扛得住的狀況（`tools/stress_test.py` 每次都會驗）

無窮迴圈（逾時後把整個直譯器砍掉重開，連續兩次就不再浪費時間）、
無窮 `print`（輸出上限 200000 字元）、
`[0]*10**9` 吃記憶體（命令列版有 1 GB 上限，網頁版由 WebAssembly 擋下）、
無窮遞迴、空檔案、語法錯誤、
以及**竄改 `builtins` 或 `math` 模組的程式**——每跑完一筆就把全域狀態還原，
不會讓某一位同學的程式污染排在他後面的所有人。

---

## 二、放上 GitHub Pages

```bash
git init && git add -A && git commit -m "HW1 autograder"
git remote add origin git@github.com:<你的帳號>/<repo>.git
git push -u origin main
```

GitHub → Settings → Pages → Source 選 `Deploy from a branch`，branch 選 `main` / `(root)`，
一兩分鐘後網址就是 `https://<帳號>.github.io/<repo>/`。倉庫裡已經放了 `.nojekyll`，不用另外設定。

> ⚠️ **公開 repo 的 Pages 是所有人都看得到的，`data/` 和 `tests/` 裡就是完整測資與標準答案。**
> 如果不希望學生在繳交期限前看到：
> * 用 private repo（private 的 Pages 需要付費方案），或
> * 先不要 push，助教在本機跑 `python3 -m http.server`（`vendor/` 已內含 Python，離線可用），或
> * 等作業截止、成績登完之後再公開 —— 這份 repo 本來就順便是「釋出測資」用的版本。

---

## 三、離線 / 命令列批改

不想開瀏覽器也可以：

```bash
python3 tools/grade_cli.py 繳交資料夾/                 # 裡面放一堆 學號_HW1.zip
python3 tools/grade_cli.py *.zip -o 成績.csv --detail 明細.json
```

判定邏輯與網頁版完全一致：同一份 `data/tests.json`、同樣的輸出正規化規則、同一套
`input()` 攔截方式，而且命令列版用 `python -I -S` 執行（不載入 site-packages），
避免「網頁版 0 分、助教電腦裝了 numpy 就滿分」這種不一致。

常用選項：`--timeout 8`、`--strict-input`、`--strict-output`、`--detail 明細.json`。

---

## 四、測資是怎麼出的

`tools/generate_tests.py`：手工特例 + 隨機測資，預期輸出一律**實際執行參考解答**產生，不手寫答案。

隨機測資會先過「歧義過濾器」再採用：

* 四捨五入邊界（`x.xx5`、`x.xxx5`）附近的值一律丟掉 —— 否則「先 `round()` 再 `format()`」和
  「直接 `format()`」可能給出不同答案，那是測資的錯不是學生的錯。
* 會印出 `-0.00`／`-0.000` 的值一律丟掉。
* Q6 另外限制係數範圍，避免公式抵消誤差（naive 公式與穩定公式在小數第三位必須一致）。

每題的 special case 想法（完整表格見 [`tests/README.md`](tests/README.md)）：

| 題 | 特別放進去的坑 |
|---|---|
| Q1 | BMI 剛好是整數（要補成 `25.00`）、身高 < 1、極大值進位、第三位小數 ≥ 5（無條件捨去會錯） |
| Q2 | 除數寫成 `0.0`（用字串比對 `'0'` 會錯）、被除數是 0（不是 Error）、結果為負、`0.67` 進位 |
| Q3 | `1` 不是質數、`2` 是唯一偶質數、`9` 與 `998001`（`i*i < n` 會漏掉完全平方）、`999983` 測效能 |
| Q4 | 沒有數字（和為 0）、全部是 `0`（和也是 0，但意義不同）、單一字元、全數字字串、長字串 |
| Q5 | 長度 5/6/10/11 四個邊界、全數字密碼（`int(input())` 會炸）、含空格（誤用 `split()` 會錯） |
| Q6 | 重根、`a` 為負數（不排序就會反過來）、`c = 0`（有一根是 `0.000`）、無理根、係數含小數 |

---

## 五、測資怎麼驗的

```bash
python3 tools/verify_tests.py
```

五道防線，全過才敢放出去：

1. **參考解答**（`solutions/`，只用課內語法）跑全部測資 → 必須 100 分。
2. **另一份獨立實作**（`tools/ref_alt/`，刻意用不同寫法：`map`、`%` 格式化、`sorted`、`math.sqrt`、
   `isdigit`、跳過偶數的試除法）→ 也必須 100 分。
3. **純數學重算**：用 `Fraction` / `Decimal`（60 位精度）完全不看任何 Python 解答重算一次答案，
   結果必須與測資檔一致 —— 這道防線是為了抓「兩份解答犯同一個錯」。
4. **Mutation testing**：`mutants/` 裡 24 支故意寫錯一兩行的程式，每一支都必須至少被一組測資抓到。
   輸出會列出每支被幾組測資抓到、最多只能拿幾分。
5. **隨機對拍**：每題 300 筆隨機輸入，兩份實作的輸出必須逐字相同。

目前結果（節錄）：

```
漏洞程式 q3_one_is_prime.py    被  1/10 組抓到，只能拿 13.5 分   # 沒處理 n=1
漏洞程式 q3_sqrt_strict.py     被  2/10 組抓到，只能拿 12.0 分   # i*i < n
漏洞程式 q2_str_zero.py        被  1/10 組抓到，只能拿 13.5 分   # 用字串比對 '0'
漏洞程式 q6_nosort.py          被  2/10 組抓到，只能拿 16.0 分   # 沒有由大到小排序
漏洞程式 q1_truncate.py        被  3/10 組抓到，只能拿 10.5 分   # 無條件捨去
...（24 支全部都被抓到）
```

**還是請至少三到四位助教各自寫一次作業、跑過測資**：自動驗證擋得住實作 bug，
擋不住「題目本身有兩種合理解讀」。真的遇到同學反應測資怪怪的，先看 `tests/README.md` 那一欄「這組在測什麼」。

---

## 六、要改東西的話

| 想做的事 | 怎麼做 |
|---|---|
| 加 / 改測資 | 改 `tools/generate_tests.py` 裡對應的 `build_qN()`，再跑 `python3 tools/generate_tests.py` |
| 改配分或題數 | 同上，改 `BUILDERS` 那個表（`pointsPerTest` 會自動重算） |
| 改參考解答 | 改 `solutions/qN.py`，**一定要重跑** generate + verify（預期輸出是從它產生的） |
| 多加一支漏洞程式 | 丟進 `mutants/`，檔名開頭是題號（例：`q5_xxx.py`），`verify_tests.py` 會自動測它 |
| 下次作業 HW2 | 複製整個資料夾，改 `BUILDERS` 與 `solutions/`，其餘都能沿用 |

改完請務必依序跑：

```bash
python3 tools/generate_tests.py && python3 tools/verify_tests.py
```

另外還有一支抗壓測試，專門檢查批改程式扛不扛得住奇怪的學生程式：

```bash
python3 tools/stress_test.py
```

`.github/workflows/verify.yml` 會在每次 push 時自動跑這兩支。

---

## 七、檔案結構

```
index.html                批改網頁（GitHub Pages 入口）
assets/app.js             介面 + 批改流程（檔名辨識、比對、成績表、CSV）
assets/worker.js          Pyodide worker：執行學生程式、餵 input、攔 stdout、逾時砍掉重開
data/tests.js / .json     測資（網頁與 CLI 共用同一份）
data/solutions.js         參考解答（網頁上可檢視、可自我檢測）
data/mutants.js           故意寫錯的程式（網頁上的示範資料）
solutions/q1..q6.py       參考解答（只用課內語法：input/split/format/if/while）
tools/generate_tests.py   產生測資
tools/verify_tests.py     五道防線驗證（含 mutation testing）
tools/grade_cli.py        命令列批改（離線備援，判定與網頁版一致）
tools/stress_test.py      抗壓測試：21 支「同學會交出來的惡夢程式」
tools/ref_alt/q1..q6.py   第二份獨立實作（對拍用）
mutants/                  24 支故意寫錯的程式
tests/qN/NN.in|.out       純文字測資（釋出給學生 / 手動比對用）
tests/README.md           測資一覽表（給另一位助教 review）
vendor/pyodide/           Pyodide 執行環境（約 12 MB，讓網頁離線可用）
vendor/jszip/             解 zip 用
```

參考解答只使用課內語法：`input()`、`split()`、`float()`、`int()`、`format()`、`if/elif/else`、
`while`、`for`、`len()`、字串串接、`** 0.5`（不 import `math`）。
