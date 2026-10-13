# -*- coding: utf-8 -*-
"""
HW3 作業規格：題目、配分、測資、獨立驗算、隨機對拍輸入。

tools/generate_tests.py、tools/verify_tests.py 會讀這個檔。欄位說明見 hw/README.md。

HW3 跟前兩份不一樣的地方：
  * 每題 25 分、10 組測資、每組 2.5 分（作業定稿的規定）
  * Q2、Q3 會讀寫檔案（"fileMode"）：每筆測資 = (輸入, 說明, {檔名: 內容})，
    批改時先把檔案放進程式的工作資料夾；Q2 跑完還會把程式寫出來的檔案內容接在螢幕輸出後面一起比對
"""

import math
import random
import re

META = {
    "id": "hw3",
    "title": "HW3",
    "subtitle": "組合數 C(n, k)、讀寫檔案的計算機、讀檔找最高總分、數列的第 y 個數",
    "submission": "學號_HW3.zip → 學號_HW3/q1.py ~ q4.py",
    "grading": "Q1~Q4 各 25 分，共 100 分；每題 10 組測資、每組 2.5 分",
    "handout": "handout.pdf",        # 作業定稿（hw/hw3/handout.pdf），網頁上可以直接點開
}

STATEMENTS = {
    "q1": "Combination: use the given recursive factorial(x) to compute C(n, k) = n! / (k!(n-k)!), "
          "where k, n and the result are positive integers, 0 < k < n. k and n are input in one line "
          "separated by a space, in the order k n. Check 0 < k < n until the user inputs correct k and n; "
          "the program CANNOT be interrupted by any input error.\n"
          "k > n  -> Error! k > n, please input again!\n"
          "k = n  -> Error! k = n, please input again!\n"
          "k <= 0 -> Error! k <= 0, please input again!\n"
          "n <= 0 -> Error! n <= 0, please input again!\n"
          "If there are multiple errors, output them in the above order.",
    "q2": "Extended Simple Calculator: the input is \"input file name,output file name\" in one line. "
          "Read \"number1 operator number2\" (separated by spaces; numbers may be float; operators + - * /) "
          "from the input file and write the whole calculated result (e.g. 2, 3.187343, 78.63) to the "
          "output file. If successful, show \"Successfully\". Errors shown on the screen: File not found / "
          "Operator error / Cannot divide by zero / Operator lost (number1 number2) / Number1 lost "
          "(operator number2) / Number2 lost (number1 operator). \"Execution completed\" is always shown "
          "at the end. If the result cannot be calculated, the output file is still generated but empty.",
    "q3": "Calculate and Search: the input is a .txt file name (utf-8). The first line is N (1 <= N <= 100); "
          "lines 2 to N+1 are \"No. score1 score2 score3\" separated by a space (integers >= 0). "
          "Print the No. of the student with the highest total score and the total, separated by a comma. "
          "There is only one highest total score.",
    "q4": "Loop and Condition: x and y in one line separated by a space (positive integers). x is the first "
          "number of a series and y is a location. If the number is odd, multiply it by 5 and then minus 3; "
          "if it is even, divide it by 2 and then add 1. Print the number at location y "
          "(location = index + 1).",
}


# --------------------------------------------------------------------------
# 各題測資：每筆 = (輸入, 這組在測什麼) 或 (輸入, 這組在測什麼, {檔名: 內容})
# 每題 10 組、全部是手工挑選的特殊測資，不採用作業定稿上的範例，也不放隨機測資
# 多行輸入用 "\n" 分隔（一行 = 一次 input()）
# --------------------------------------------------------------------------
def build_q1():
    return [
        ("1 2", "最小的合法輸入 k = 1、n = 2 -> 2"),
        ("5 10", "一般情況 C(10, 5) = 252；用 / 相除會印成 252.0"),
        ("9 10", "k = n - 1，n - k = 1，factorial(1) 是遞迴的終點 -> 10"),
        ("12 9\n9 12", "k > n 先報錯、重新輸入後才算 -> 220；只讀一次就結束的程式會漏掉答案"),
        ("7 7\n3 7", "k = n 要報錯（不是 k > n）-> 35"),
        ("0 5\n2 5", "k = 0 是 k <= 0 的邊界，要報錯；寫成 k < 0 會讓 0 通過並算出 1（或遞迴爆掉）"),
        ("-2 -2\n2 4", "k = n 而且兩個都 <= 0：三行錯誤要全部依序印出 -> 6；用 elif 只會印第一行"),
        ("4 0\n3 6", "k > n 和 n <= 0 同時成立（n = 0 是邊界），依序印兩行 -> 20"),
        ("-5 -9\n4 8", "-5 > -9 所以也是 k > n，三個錯誤依「k > n、k <= 0、n <= 0」的順序 -> 70"),
        ("8 3\n5 5\n0 1\n20 40",
         "連續三次錯誤（k > n；k = n；k <= 0）才輸入正確 -> 137846528820，結果超過 32 位元"),
    ]


def build_q2():
    return [
        ("calc_neg.txt,result_neg.txt", "負數與減法：-7 - 12 = -19；全部轉成 float 會寫成 -19.0；用 isdigit() 判斷數字會把 -7 當成不是數字",
         {"calc_neg.txt": "-7 - 12"}),
        ("half.txt,half_out.txt", "整數相除但結果有小數 7 / 2 = 3.5；用 // 會得 3",
         {"half.txt": "7 / 2"}),
        ("float_mul.txt,float_out.txt", "兩個數字都是小數 1.5 * 2.25 = 3.375；用 int() 轉數字會出錯",
         {"float_mul.txt": "1.5 * 2.25"}),
        ("third.txt,third_out.txt", "結果要寫完整的計算結果 10 / 3 = 3.3333333333333335，不可以四捨五入到兩位",
         {"third.txt": "10 / 3"}),
        ("no_such_file.txt,out_missing.txt",
         "輸入檔不存在 -> File not found + Execution completed；輸出檔仍然要產生（空檔案）",
         {}),
        ("op_mod.txt,op_mod_out.txt", "% 不是 + - * / -> Operator error；輸出檔是空的，不可以印 Successfully",
         {"op_mod.txt": "4 % 2"}),
        ("zero.txt,zero_out.txt", "除以 0 -> Cannot divide by zero（要接住 ZeroDivisionError），輸出檔是空的",
         {"zero.txt": "9 / 0"}),
        ("no_op.txt,no_op_out.txt", "只有 number1 number2 -> Operator lost",
         {"no_op.txt": "8 5"}),
        ("no_num1.txt,no_num1_out.txt", "只有 operator number2 -> Number1 lost；和 Number2 lost 搞反會錯",
         {"no_num1.txt": "* 6"}),
        ("no_num2.txt,no_num2_out.txt", "只有 number1 operator -> Number2 lost；Execution completed 不管有沒有錯都要印",
         {"no_num2.txt": "6 +"}),
    ]


def _class100():
    """N = 100 的大檔案：分數用固定亂數產生，最高總分只有一位（第 63 號 297 分）。"""
    rng = random.Random(20261014)
    rows = []
    for no in range(1, 101):
        rows.append([no, rng.randint(30, 95), rng.randint(30, 95), rng.randint(30, 95)])
    rows[62][1:] = [100, 99, 98]
    return "100\n" + "\n".join(" ".join(str(v) for v in r) for r in rows)


def build_q3():
    return [
        ("one.txt", "N = 1 而且三科都是 0 -> 7,0；最高分的初始值設成 0 又用 > 比較，會找不到人",
         {"one.txt": "1\n7 0 0 0"}),
        ("first_best.txt", "最高總分是第一位學生 -> 1,280；只記最後一位或從第二位開始比都會錯",
         {"first_best.txt": "4\n1 95 90 95\n2 60 70 80\n3 88 72 90\n4 75 80 85"}),
        ("last_best.txt", "最高總分是最後一位 -> 6,288；range(1, N) 少讀一行會漏掉他",
         {"last_best.txt": "6\n1 70 73 62\n2 63 90 92\n3 73 68 60\n4 83 73 98\n5 61 99 67\n6 99 99 90"}),
        ("ids.txt", "學號不是 1、2、3… 要印檔案裡的 No.（305），不是第幾行",
         {"ids.txt": "3\n17 80 80 80\n305 90 95 99\n2024 85 70 60"}),
        ("str_trap.txt", "總分 95 和 300：用字串比大小 \"95\" > \"300\" 會選錯人 -> 2,300",
         {"str_trap.txt": "3\n1 30 30 35\n2 100 100 100\n3 40 30 20"}),
        ("subject_trap.txt", "單科最高（第 1 號第一科 100 分）不是總分最高 -> 3,255；只比第一科會錯",
         {"subject_trap.txt": "3\n1 100 50 50\n2 60 90 70\n3 85 85 85"}),
        ("three_cols.txt", "要三科加總：只加前兩科會選到第 1 號（190），正確是 2,245",
         {"three_cols.txt": "3\n1 95 95 10\n2 80 80 85\n3 60 70 90"}),
        ("close.txt", "總分只差 1 分（241 vs 240），最高在中間 -> 3,241",
         {"close.txt": "5\n1 80 80 80\n2 79 81 79\n3 81 80 80\n4 80 79 81\n5 70 70 70"}),
        ("over100.txt", "題目只說分數是 >= 0 的整數，沒說上限：總分 1200 的同學 -> 2,1200",
         {"over100.txt": "2\n1 300 300 300\n2 400 400 400"}),
        ("class100.txt", "N = 100（題目上限），最高分在第 63 位 -> 63,297",
         {"class100.txt": _class100()}),
    ]


def build_q4():
    return [
        ("7 1", "y = 1：一步都不用走，直接印 x -> 7；迴圈多跑一次會印 32"),
        ("3 2", "奇數一步：3 * 5 - 3 = 12；寫成 5 * (3 - 3) 會得 0"),
        ("8 2", "偶數一步：8 / 2 + 1 = 5；用 / 會印 5.0"),
        ("1 3", "1 是奇數 -> 2 -> 2（2 / 2 + 1 = 2 停在原地）"),
        ("6 4", "6 -> 4 -> 3 -> 12：偶、偶、奇交錯"),
        ("10 3", "10 -> 6 -> 4，連續兩次偶數規則，用 / 會印 4.0"),
        ("13 7", "13 -> 62 -> 32 -> 17 -> 82 -> 42 -> 22，奇偶規則寫反會完全不同"),
        ("11 14", "數字會先變大到 2082 再掉回來，第 14 個是 132"),
        ("2 100", "2 是固定點，位置 100 還是 2；迴圈次數多也不能出錯"),
        ("999 30", "起始值是三位數的奇數，走 29 步"),
    ]


KW_Q1 = r"factorial|combination|階乘|組合"
KW_Q2 = r"calculator|operator|計算機"
KW_Q3 = r"score|highest|total|成績|總分"
KW_Q4 = r"series|location|數列"

PROBLEMS = [
    {"id": "q1", "name": "Combination", "points": 25, "build": build_q1,
     "checks": ["def", "loop"],
     "requirement": "要用題目給的 factorial 函式計算，並用迴圈重複讀到正確的 k、n 為止",
     "keywords": KW_Q1},
    {"id": "q2", "name": "Extended Simple Calculator", "points": 25, "build": build_q2,
     "fileMode": "write", "checks": ["try"],
     "requirement": "要用 try / except 處理檔案、格式、計算的例外", "keywords": KW_Q2},
    {"id": "q3", "name": "Calculate and Search", "points": 25, "build": build_q3,
     "fileMode": "read", "checks": [], "keywords": KW_Q3},
    {"id": "q4", "name": "Loop and Condition", "points": 25, "build": build_q4,
     "checks": ["loop"], "requirement": "要用迴圈產生數列", "keywords": KW_Q4},
]


# --------------------------------------------------------------------------
# 第三道防線：用和參考解答不同的方法重算（完全不看任何一份 Python 解答）
# 讀寫檔案的題目（Q2、Q3）多收一個參數：這筆測資附的檔案 {檔名: 內容}
# --------------------------------------------------------------------------
Q1_ERRORS = ["Error! k > n, please input again!", "Error! k = n, please input again!",
             "Error! k <= 0, please input again!", "Error! n <= 0, please input again!"]


def independent_q1(text):
    out = []
    for line in text.split("\n"):
        k, n = (int(t) for t in line.split())
        flags = [k > n, k == n, k <= 0, n <= 0]
        if any(flags):
            out.extend(msg for msg, f in zip(Q1_ERRORS, flags) if f)
            continue
        out.append(str(math.comb(n, k)))
        break
    return "\n".join(out)


def independent_q2(line, files):
    """直接寫出預期的「螢幕輸出 + === 輸出檔 ===」，順便驗證 worker.js 的接檔格式。"""
    src, dst = line.split(",")
    screen, content = [], ""
    if src not in files:
        screen.append("File not found")
    else:
        tok = files[src].split()
        numeric = [bool(re.fullmatch(r"-?\d+(\.\d+)?", t)) for t in tok]
        if len(tok) == 2:
            if all(numeric):
                screen.append("Operator lost")
            elif numeric[1]:
                screen.append("Number1 lost")
            else:
                screen.append("Number2 lost")
        elif tok[1] not in ("+", "-", "*", "/"):
            screen.append("Operator error")
        else:
            a, b = (float(t) if "." in t else int(t) for t in (tok[0], tok[2]))
            if tok[1] == "/" and b == 0:
                screen.append("Cannot divide by zero")
            else:
                content = repr({"+": a + b, "-": a - b, "*": a * b}[tok[1]] if tok[1] != "/" else a / b)
                screen.append("Successfully")
    screen.append("Execution completed")
    head = ("=== %s ===\n%s" % (dst, content)) if content else "=== %s（空檔案）===" % dst
    return "\n".join(screen) + "\n" + head


def independent_q3(line, files):
    rows = files[line].split("\n")
    n = int(rows[0])
    table = {}
    for r in rows[1:n + 1]:
        no, s1, s2, s3 = r.split(" ")
        table[no] = int(s1) + int(s2) + int(s3)
    top = sorted(table.items(), key=lambda kv: -kv[1])[0]
    return "%s,%d" % top


def independent_q4(line):
    x, y = (int(t) for t in line.split())

    def at(loc):                     # 遞迴：位置 loc 的數 = 依位置 loc - 1 的數套規則
        if loc == 1:
            return x
        prev = at(loc - 1)
        return prev * 5 - 3 if prev & 1 else (prev >> 1) + 1
    return str(at(y))


INDEPENDENT = {"q1": independent_q1, "q2": independent_q2, "q3": independent_q3, "q4": independent_q4}


# --------------------------------------------------------------------------
# 第五道防線：隨機對拍的輸入（只產生題目敘述下沒有歧義的合法輸入）
# Q2、Q3 回傳 (輸入, {檔名: 內容})
# --------------------------------------------------------------------------
def _rand_num(rng, allow_float=True):
    if allow_float and rng.random() < 0.5:
        return "%d.%d" % (rng.randint(-50, 50), rng.randint(1, 99))
    return str(rng.randint(-200, 200))


def random_inputs(qid, rng, n=300):
    out = []
    for i in range(n):
        if qid == "q1":
            lines = []
            for _ in range(rng.randint(0, 3)):
                k, n_ = rng.randint(-10, 30), rng.randint(-10, 30)
                if 0 < k < n_:
                    k = n_ + rng.randint(0, 5)
                lines.append("%d %d" % (k, n_))
            n_ = rng.randint(2, 60)
            lines.append("%d %d" % (rng.randint(1, n_ - 1), n_))
            out.append("\n".join(lines))
        elif qid == "q2":
            src, dst = "in%d.txt" % i, "out%d.txt" % i
            r = rng.random()
            if r < 0.1:
                out.append(("%s,%s" % (src, dst), {}))
                continue
            a, b = _rand_num(rng), _rand_num(rng)
            if r < 0.15:
                body = "%s %s" % (a, b)
            elif r < 0.2:
                body = "%s %s" % (rng.choice("+-*/"), b)
            elif r < 0.25:
                body = "%s %s" % (a, rng.choice("+-*/"))
            elif r < 0.3:
                body = "%s %s %s" % (a, rng.choice(["%", "^", "x", "//"]), b)
            elif r < 0.35:
                body = "%s / 0" % a
            else:
                op = rng.choice("+-*/")
                body = "%s %s %s" % (a, op, b)
            out.append(("%s,%s" % (src, dst), {src: body}))
        elif qid == "q3":
            n_ = rng.randint(1, 100)
            nos = rng.sample(range(1, 10000), n_)
            rows = [[no, rng.randint(0, 100), rng.randint(0, 100), rng.randint(0, 100)] for no in nos]
            totals = [sum(r[1:]) for r in rows]
            top = max(totals)
            if totals.count(top) > 1:              # 題目保證最高分只有一位
                rows[totals.index(top)][1] += 1
            name = "s%d.txt" % i
            out.append((name, {name: "%d\n" % n_ + "\n".join(" ".join(str(v) for v in r) for r in rows)}))
        elif qid == "q4":
            out.append("%d %d" % (rng.randint(1, 5000), rng.randint(1, 120)))
    return out
