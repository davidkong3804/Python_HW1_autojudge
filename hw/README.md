# 作業資料夾格式（新增 HW4、HW5… 看這份）

每一份作業是 `hw/<id>/` 一個資料夾，`<id>` 用小寫 `hw1`、`hw2`、`hw3`……
網頁上方的作業切換、命令列的 `--hw`、驗證工具，全部是自動掃這個資料夾決定有哪些作業，
**不用改任何網頁或批改程式**。

```
hw/hw4/
  spec.py            題目、配分、測資、獨立驗算（下面說明）
  solutions/q1.py    參考解答，檔名 = 題號。預期輸出由它實際執行產生
  ref_alt/q1.py      另一位助教寫的獨立實作（刻意用不同寫法），對拍用
  mutants/q1_xxx.py  故意寫錯一兩行的程式，檔名開頭是題號 + 底線
  tests/             generate_tests.py 產生，不要手改
```

## 新增一份作業的步驟

```bash
cp -r hw/hw3 hw/hw4          # 從最像的那份複製（有讀寫檔案的題目就從 hw3 複製）
# 改 hw/hw4/spec.py、solutions/、ref_alt/、mutants/
python3 tools/generate_tests.py --hw hw4
python3 tools/verify_tests.py --hw hw4      # 五道防線全過才能用
git add hw/hw4 data && git commit
```

push 之後 GitHub Pages 更新，網頁上方就會多一個「HW4」可以切換。

## spec.py 欄位

```python
META = {
    "id": "hw3",
    "title": "HW3",
    "subtitle": "一句話列出這次的題目",
    "submission": "學號_HW3.zip → 學號_HW3/q1.py ~ q5.py",   # 顯示在網頁上的繳交格式
    "grading": "每題 20 分；每題 5 組測資",                   # 顯示在網頁上的配分說明
    "handout": "handout.pdf",     # 選填：作業定稿 PDF 放在 hw/hw3/handout.pdf，網頁上會有連結
}

STATEMENTS = {"q1": "題目原文…"}   # 選填：每題（group）的題目敘述，網頁檢視測資時會一起顯示

def build_q1():
    # 每筆 = (輸入, 這組在測什麼)。多行輸入用 "\n" 分隔（一行 = 一次 input()）
    return [("hello world", "..."), ...]

PROBLEMS = [
    {"id": "q1", "name": "Reverse Words", "points": 20, "build": build_q1,
     "group": "q1",                 # 選填：子題共用同一個 group（例如 q1a、q1b 都寫 "q1"）
     "checks": ["loop"],            # 選填：寫法要求，只提示助教，不自動扣分
     "requirement": "要用迴圈",      # 選填：寫法要求的文字說明
     "keywords": r"reverse|反轉",    # 選填：學生交 .ipynb 時用來猜題號
     "fileMode": "read"},            # 選填：讀寫檔案的題目，見下面「讀寫檔案的題目」
]

INDEPENDENT = {"q1": lambda line: ...}    # 第三道防線：不看解答、用別的方法重算答案
def random_inputs(qid, rng, n=300): ...  # 第五道防線：隨機對拍的輸入（選填）
def sanity(qid, expected): return True   # 選填：產生測資時對預期輸出的額外檢查
```

### 測資慣例（沿用 HW1 定版）

* 每題（每個子題）**5 組**（作業定稿另有規定的照定稿，例如 HW3 每題 10 組），全部是手工挑選的特殊測資，每一組都要換到一個明確的鑑別點
* **不採用**作業 PDF 上的範例（學生手上已經有，沒有鑑別度），也不放隨機測資
* 預期輸出一律由參考解答實際執行產生，不手寫答案
* 題目敘述有兩種合理解讀的輸入**不要出**（例如題目沒說會不會有連續空白，就不要出連續空白）
* 每一支 mutant 都必須至少被一組測資抓到（`verify_tests.py` 把關）

### 讀寫檔案的題目（`fileMode`，HW3 Q2、Q3）

題目要程式自己開檔讀 / 寫時，在 `PROBLEMS` 那一題加 `"fileMode"`，每筆測資多一個「附的檔案」：

```python
def build_q3():
    return [("score.txt", "這組在測什麼", {"score.txt": "2\n1 70 80 90\n2 60 70 80"}),
            ("missing.txt,out.txt", "輸入檔不存在", {})]       # 不附檔案 = 測「檔案不存在」
```

| `fileMode` | 意思 |
|---|---|
| `"read"` | 只讀檔：每筆測資在乾淨的資料夾裡跑，先放好附的檔案，只比對螢幕輸出 |
| `"write"` | 會寫檔：同上，而且跑完把資料夾裡新產生 / 被改過的檔案接在螢幕輸出後面一起比對（`=== 檔名 ===` 下面是內容，空檔案是 `=== 檔名（空檔案）===`） |

* 預期輸出一樣由參考解答實際執行產生，接檔案的格式只有一份（`assets/worker.js` 的 `fileio` 段落），網頁、命令列、產生測資都用它
* `INDEPENDENT` 多收一個參數：`INDEPENDENT["q3"](輸入, {檔名: 內容})`；`random_inputs` 回傳 `(輸入, {檔名: 內容})`
* 附的檔案會另外寫到 `tests/<題號>/NN.files/`，方便釋出或給同學看
* 檔案內容的結尾不要加換行（題目沒說的話，有沒有結尾換行就是兩種合理解讀）

### 子題（a / b）

HW2 那種「同一題用兩種寫法各做一次」的子題，題號寫成 `q1a`、`q1b`，
`group` 都填 `"q1"`，兩個子題通常共用同一組 `build_*`。
學生的檔名要能看出子題：`q1a.py`、`q1_a.py`、`Q1(a).py`、`1a.py` 都認得；
只寫 `q1.py` 的：如果裡面把 a、b 都寫了，會自動拆開（依註解標記，沒有標記就試跑猜切點）；
只有一種寫法的，依 `checks`（a 用迴圈、b 用切片…）猜，剛好只符合一個才猜；都不行才標「待指定」。
所以子題的 `checks` 寫得越能區分 a / b，自動判斷越準。

因為 a、b 兩個子題的輸入輸出一樣，網頁的「自動配對」**分不出 a 還是 b**，
只會先放到這位學生還缺的那一個，並提醒助教確認。

拆分時用同一個 `group` 的第一個子題的前兩筆測資試跑，所以 a、b 要共用同一組 `build_*`。

### checks 可用的值

| 值 | 意思 |
|---|---|
| `loop` | 至少有一個 `for` / `while`（串列推導式也算） |
| `for` | 有 `for` 迴圈 |
| `while` | 有 `while` 迴圈 |
| `no-loop` | 不可以有任何迴圈（含串列推導式） |
| `def` | 有自己定義函式（`def`） |
| `set` | 有用到 set（`set()`、`{1, 2}`、集合推導式） |
| `slice` | 有用到切片 `x[a:b:c]` |
| `try` | 有 `try` / `except`（HW3 Q2 要處理例外） |
| `import:模組名` | 有 import 這個模組，例如 `import:datetime` |

這些是用 Python `ast` 靜態分析的**提示**：成績表上會標 ⚑，
助教點開看程式碼後自己決定要不要在「手動調整」扣分。
