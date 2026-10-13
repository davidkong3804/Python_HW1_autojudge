# HW3 測資一覽

> 由 `tools/generate_tests.py` 自動產生；預期輸出是實際執行 `hw/hw3/solutions/<題號>.py` 得到的結果。

> 測資一律不採用作業 PDF 上的範例（學生手上已經有），全部是針對常見錯誤挑選的特殊測資。

## Q1 Combination（25 分，每組 2.5 分）

寫法要求：要用題目給的 factorial 函式計算，並用迴圈重複讀到正確的 k、n 為止（批改時只提示，不自動扣分）

| # | 輸入 | 正確輸出 | 這組在測什麼 |
|---|---|---|---|
| 1 | `1 2` | `2` | 最小的合法輸入 k = 1、n = 2 -> 2 |
| 2 | `5 10` | `252` | 一般情況 C(10, 5) = 252；用 / 相除會印成 252.0 |
| 3 | `9 10` | `10` | k = n - 1，n - k = 1，factorial(1) 是遞迴的終點 -> 10 |
| 4 | `12 9<br>9 12` | `Error! k > n, please input again!<br>220` | k > n 先報錯、重新輸入後才算 -> 220；只讀一次就結束的程式會漏掉答案 |
| 5 | `7 7<br>3 7` | `Error! k = n, please input again!<br>35` | k = n 要報錯（不是 k > n）-> 35 |
| 6 | `0 5<br>2 5` | `Error! k <= 0, please input again!<br>10` | k = 0 是 k <= 0 的邊界，要報錯；寫成 k < 0 會讓 0 通過並算出 1（或遞迴爆掉） |
| 7 | `-2 -2<br>2 4` | `Error! k = n, please input again!<br>Error! k <= 0, please input again!<br>Error! n <= 0, please input again!<br>6` | k = n 而且兩個都 <= 0：三行錯誤要全部依序印出 -> 6；用 elif 只會印第一行 |
| 8 | `4 0<br>3 6` | `Error! k > n, please input again!<br>Error! n <= 0, please input again!<br>20` | k > n 和 n <= 0 同時成立（n = 0 是邊界），依序印兩行 -> 20 |
| 9 | `-5 -9<br>4 8` | `Error! k > n, please input again!<br>Error! k <= 0, please input again!<br>Error! n <= 0, please input again!<br>70` | -5 > -9 所以也是 k > n，三個錯誤依「k > n、k <= 0、n <= 0」的順序 -> 70 |
| 10 | `8 3<br>5 5<br>0 1<br>20 40` | `Error! k > n, please input again!<br>Error! k = n, please input again!<br>Error! k <= 0, please input again!<br>137846528820` | 連續三次錯誤（k > n；k = n；k <= 0）才輸入正確 -> 137846528820，結果超過 32 位元 |

## Q2 Extended Simple Calculator（25 分，每組 2.5 分）

寫法要求：要用 try / except 處理檔案、格式、計算的例外（批改時只提示，不自動扣分）

這題會讀寫檔案：每組測資附的檔案在 `tests/q2/NN.files/`；正確輸出裡 `=== 檔名 ===` 之後是程式應該寫出的檔案內容。

| # | 輸入 | 附的檔案 | 正確輸出 | 這組在測什麼 |
|---|---|---|---|---|
| 1 | `calc_neg.txt,result_neg.txt` | `calc_neg.txt`：`-7 - 12` | `Successfully<br>Execution completed<br>=== result_neg.txt ===<br>-19` | 負數與減法：-7 - 12 = -19；全部轉成 float 會寫成 -19.0；用 isdigit() 判斷數字會把 -7 當成不是數字 |
| 2 | `half.txt,half_out.txt` | `half.txt`：`7 / 2` | `Successfully<br>Execution completed<br>=== half_out.txt ===<br>3.5` | 整數相除但結果有小數 7 / 2 = 3.5；用 // 會得 3 |
| 3 | `float_mul.txt,float_out.txt` | `float_mul.txt`：`1.5 * 2.25` | `Successfully<br>Execution completed<br>=== float_out.txt ===<br>3.375` | 兩個數字都是小數 1.5 * 2.25 = 3.375；用 int() 轉數字會出錯 |
| 4 | `third.txt,third_out.txt` | `third.txt`：`10 / 3` | `Successfully<br>Execution completed<br>=== third_out.txt ===<br>3.3333333333333335` | 結果要寫完整的計算結果 10 / 3 = 3.3333333333333335，不可以四捨五入到兩位 |
| 5 | `no_such_file.txt,out_missing.txt` | （沒有附檔案） | `File not found<br>Execution completed<br>=== out_missing.txt（空檔案）===` | 輸入檔不存在 -> File not found + Execution completed；輸出檔仍然要產生（空檔案） |
| 6 | `op_mod.txt,op_mod_out.txt` | `op_mod.txt`：`4 % 2` | `Operator error<br>Execution completed<br>=== op_mod_out.txt（空檔案）===` | % 不是 + - * / -> Operator error；輸出檔是空的，不可以印 Successfully |
| 7 | `zero.txt,zero_out.txt` | `zero.txt`：`9 / 0` | `Cannot divide by zero<br>Execution completed<br>=== zero_out.txt（空檔案）===` | 除以 0 -> Cannot divide by zero（要接住 ZeroDivisionError），輸出檔是空的 |
| 8 | `no_op.txt,no_op_out.txt` | `no_op.txt`：`8 5` | `Operator lost<br>Execution completed<br>=== no_op_out.txt（空檔案）===` | 只有 number1 number2 -> Operator lost |
| 9 | `no_num1.txt,no_num1_out.txt` | `no_num1.txt`：`* 6` | `Number1 lost<br>Execution completed<br>=== no_num1_out.txt（空檔案）===` | 只有 operator number2 -> Number1 lost；和 Number2 lost 搞反會錯 |
| 10 | `no_num2.txt,no_num2_out.txt` | `no_num2.txt`：`6 +` | `Number2 lost<br>Execution completed<br>=== no_num2_out.txt（空檔案）===` | 只有 number1 operator -> Number2 lost；Execution completed 不管有沒有錯都要印 |

## Q3 Calculate and Search（25 分，每組 2.5 分）

這題會讀檔案：每組測資附的檔案在 `tests/q3/NN.files/`；批改時會先把檔案放進程式的工作資料夾。

| # | 輸入 | 附的檔案 | 正確輸出 | 這組在測什麼 |
|---|---|---|---|---|
| 1 | `one.txt` | `one.txt`：`1⏎7 0 0 0` | `7,0` | N = 1 而且三科都是 0 -> 7,0；最高分的初始值設成 0 又用 > 比較，會找不到人 |
| 2 | `first_best.txt` | `first_best.txt`：`4⏎1 95 90 95⏎2 60 70 80⏎3 88 72 90⏎4 75 80 85` | `1,280` | 最高總分是第一位學生 -> 1,280；只記最後一位或從第二位開始比都會錯 |
| 3 | `last_best.txt` | `last_best.txt`：`6⏎1 70 73 62⏎2 63 90 92⏎3 73 68 60⏎4 83 73 98⏎5 61 99 67⏎6 99 99 90` | `6,288` | 最高總分是最後一位 -> 6,288；range(1, N) 少讀一行會漏掉他 |
| 4 | `ids.txt` | `ids.txt`：`3⏎17 80 80 80⏎305 90 95 99⏎2024 85 70 60` | `305,284` | 學號不是 1、2、3… 要印檔案裡的 No.（305），不是第幾行 |
| 5 | `str_trap.txt` | `str_trap.txt`：`3⏎1 30 30 35⏎2 100 100 100⏎3 40 30 20` | `2,300` | 總分 95 和 300：用字串比大小 "95" > "300" 會選錯人 -> 2,300 |
| 6 | `subject_trap.txt` | `subject_trap.txt`：`3⏎1 100 50 50⏎2 60 90 70⏎3 85 85 85` | `3,255` | 單科最高（第 1 號第一科 100 分）不是總分最高 -> 3,255；只比第一科會錯 |
| 7 | `three_cols.txt` | `three_cols.txt`：`3⏎1 95 95 10⏎2 80 80 85⏎3 60 70 90` | `2,245` | 要三科加總：只加前兩科會選到第 1 號（190），正確是 2,245 |
| 8 | `close.txt` | `close.txt`：`5⏎1 80 80 80⏎2 79 81 79⏎3 81 80 80⏎4 80 79 81⏎5 70 70 70` | `3,241` | 總分只差 1 分（241 vs 240），最高在中間 -> 3,241 |
| 9 | `over100.txt` | `over100.txt`：`2⏎1 300 300 300⏎2 400 400 400` | `2,1200` | 題目只說分數是 >= 0 的整數，沒說上限：總分 1200 的同學 -> 2,1200 |
| 10 | `class100.txt` | `class100.txt`：`100⏎1 52 49 91⏎2 95 72 75⏎3 70 75 49⏎4 85 69 86⏎5 85 64 60⏎6 37 87 70⏎7 94 81 70…` | `63,297` | N = 100（題目上限），最高分在第 63 位 -> 63,297 |

## Q4 Loop and Condition（25 分，每組 2.5 分）

寫法要求：要用迴圈產生數列（批改時只提示，不自動扣分）

| # | 輸入 | 正確輸出 | 這組在測什麼 |
|---|---|---|---|
| 1 | `7 1` | `7` | y = 1：一步都不用走，直接印 x -> 7；迴圈多跑一次會印 32 |
| 2 | `3 2` | `12` | 奇數一步：3 * 5 - 3 = 12；寫成 5 * (3 - 3) 會得 0 |
| 3 | `8 2` | `5` | 偶數一步：8 / 2 + 1 = 5；用 / 會印 5.0 |
| 4 | `1 3` | `2` | 1 是奇數 -> 2 -> 2（2 / 2 + 1 = 2 停在原地） |
| 5 | `6 4` | `12` | 6 -> 4 -> 3 -> 12：偶、偶、奇交錯 |
| 6 | `10 3` | `4` | 10 -> 6 -> 4，連續兩次偶數規則，用 / 會印 4.0 |
| 7 | `13 7` | `22` | 13 -> 62 -> 32 -> 17 -> 82 -> 42 -> 22，奇偶規則寫反會完全不同 |
| 8 | `11 14` | `132` | 數字會先變大到 2082 再掉回來，第 14 個是 132 |
| 9 | `2 100` | `2` | 2 是固定點，位置 100 還是 2；迴圈次數多也不能出錯 |
| 10 | `999 30` | `1892` | 起始值是三位數的奇數，走 29 步 |
