# -*- coding: utf-8 -*-
"""
HW1 作業規格：題目、配分、測資、獨立驗算、隨機對拍輸入。

tools/generate_tests.py、tools/verify_tests.py 會讀這個檔。
新增作業時複製一份改，欄位說明見 hw/README.md。
"""

from decimal import Decimal, ROUND_HALF_UP, getcontext
from fractions import Fraction

getcontext().prec = 60

META = {
    "id": "hw1",
    "title": "HW1",
    "subtitle": "BMI、計算機、質數、數字和、密碼強度、一元二次方程式",
    "submission": "學號_HW1.zip → 學號_HW1/q1.py ~ q6.py",
    "grading": "Q1~Q4 各 15 分、Q5~Q6 各 20 分，共 100 分；每題 5 組測資",
}


# --------------------------------------------------------------------------
# 各題測資：每筆 = (輸入字串, 這組在測什麼)
# 每題 5 組、全部是手工挑選的特殊測資，不採用作業 PDF 範例，也不放隨機測資
# --------------------------------------------------------------------------
def build_q1():
    return [
        ("2 100", "整數輸入且 BMI 為整數 25 -> 必須補成 25.00"),
        ("0.5 3.2", "極小值（嬰兒）：身高 < 1，BMI 12.80"),
        ("1.7 49.5", "17.128... -> 17.13，無條件捨去會得 17.12"),
        ("3 500", "極大值：BMI 55.56，進位測試"),
        ("1.0 0.5", "體重小於 1，答案只有 0.50"),
    ]


def build_q2():
    return [
        ("-,3,10", "減法且結果為負數 -7.00"),
        ("*,-2.5,4", "乘法含負小數 -10.00"),
        ("/,7.5,0.0", "除數寫成 0.0 -> 仍然是 Error（用字串比對 '0' 會錯）"),
        ("/,2,3", "0.6666... -> 0.67，無條件捨去會得 0.66"),
        ("+,-7.25,-3.75", "加法，兩個負小數相加 -11.00"),
    ]


def build_q3():
    return [
        ("1", "1 不是質數（最常見的漏洞），輸出 Not Prime,Odd"),
        ("2", "唯一的偶質數，輸出 Prime,Even"),
        ("4", "最小的合數，輸出 Not Prime,Even"),
        ("9", "奇數的完全平方，i*i<n 的迴圈會誤判為質數"),
        ("999983", "小於 10^6 的最大質數，測效能"),
    ]


def build_q4():
    return [
        ("1234567890", "全部都是數字，和 45 長度 10"),
        ("a", "單一字母，沒有數字所以和為 0"),
        ("007Bond", "開頭是 0，數字和 7"),
        ("0000", "全部都是 0，和仍為 0（不可與『沒有數字』混淆）"),
        ("ZZZ999zzz111", "大小寫混合 + 數字，和 30 長度 12"),
    ]


def build_q5():
    return [
        ("abcde", "長度 5 邊界 -> Weak"),
        ("123456", "長度 6 邊界 -> Moderate；全數字，用 int(input()) 會炸掉"),
        ("1234567890", "長度 10 邊界 -> Moderate"),
        ("12345678901", "長度 11 邊界 -> Strong"),
        ("Pass word", "含空格，長度 9；誤用 split() 會判成 Weak"),
    ]


def build_q6():
    return [
        ("-1 0 4", "a 為負數：沒有排序會把 -2.000 印在前面"),
        ("-2 5 3", "a 為負數且有小數根 3.000 / -0.500"),
        ("1 5 0", "c = 0，其中一根剛好是 0.000"),
        ("1 0 -2", "無理根 ±1.414"),
        ("0.5 -3 4.5", "係數含小數且 b^2-4ac = 0 的重根 3.000 3.000"),
    ]


# id：題號（也是檔名 qN.py）；group：同一大題的子題共用（HW1 沒有子題）
# keywords：學生交 .ipynb 時，用 markdown / 程式碼裡的關鍵字猜是哪一題（正規表示式，不分大小寫）
# checks：程式寫法要求（只提示助教，不自動扣分），可用值見 hw/README.md
PROBLEMS = [
    {"id": "q1", "name": "BMI Calculator", "points": 15, "build": build_q1,
     "keywords": r"\bbmi\b"},
    {"id": "q2", "name": "Simple Calculator", "points": 15, "build": build_q2,
     "keywords": r"augend|minuend|divisor|dividend|calculator|計算機"},
    {"id": "q3", "name": "Prime Number and Even or Odd Checker", "points": 15, "build": build_q3,
     "keywords": r"\bprime\b|質數"},
    {"id": "q4", "name": "Sum of Digits and String Length", "points": 15, "build": build_q4,
     "keywords": r"sum\s*of\s*digits|數字和"},
    {"id": "q5", "name": "Password Strength Checker", "points": 20, "build": build_q5,
     "keywords": r"password|weak|moderate|strong|密碼"},
    {"id": "q6", "name": "Find Roots", "points": 20, "build": build_q6,
     "keywords": r"root|quadratic|判別式|sqrt"},
]


# --------------------------------------------------------------------------
# 第三道防線：純數學重算（完全不看任何一份 Python 解答）
# --------------------------------------------------------------------------
def fmt(value, digits):
    """把精確有理數/Decimal 以四捨五入格式成固定小數位。"""
    if isinstance(value, Fraction):
        value = Decimal(value.numerator) / Decimal(value.denominator)
    q = Decimal(1).scaleb(-digits)
    return str(value.quantize(q, rounding=ROUND_HALF_UP))


def independent_q1(line):
    h, w = line.split()
    return fmt(Fraction(w) / (Fraction(h) * Fraction(h)), 2)


def independent_q2(line):
    op, x, y = line.split(",")
    x, y = Fraction(x), Fraction(y)
    if op == "/":
        if y == 0:
            return "Error"
        return fmt(x / y, 2)
    return fmt({"+": x + y, "-": x - y, "*": x * y}[op], 2)


def independent_q3(line):
    n = int(line)
    prime = n >= 2
    for i in range(2, n):            # 最笨但最不會錯的試除法
        if i * i > n:
            break
        if n % i == 0:
            prime = False
            break
    return ("Prime" if prime else "Not Prime") + ("," + ("Even" if n % 2 == 0 else "Odd"))


def independent_q4(line):
    total = 0
    for ch in line:
        code = ord(ch)
        if 48 <= code <= 57:
            total += code - 48
    return "%d,%d" % (total, len(line))


def independent_q5(line):
    n = len(line)
    if n < 6:
        return "Weak"
    if n < 11:
        return "Moderate"
    return "Strong"


def independent_q6(line):
    a, b, c = [Decimal(t) for t in line.split()]
    s = (b * b - 4 * a * c).sqrt()
    r1 = (-b + s) / (2 * a)
    r2 = (-b - s) / (2 * a)
    hi, lo = (r1, r2) if r1 >= r2 else (r2, r1)
    return fmt(hi, 3) + " " + fmt(lo, 3)


INDEPENDENT = {
    "q1": independent_q1, "q2": independent_q2, "q3": independent_q3,
    "q4": independent_q4, "q5": independent_q5, "q6": independent_q6,
}


# --------------------------------------------------------------------------
# 第五道防線：隨機對拍的輸入
# --------------------------------------------------------------------------
def random_inputs(qid, rng, n=300):
    out = []
    for _ in range(n):
        if qid == "q1":
            out.append("%s %s" % (rng.randint(30, 250) / 100.0, rng.randint(10, 3000) / 10.0))
        elif qid == "q2":
            op = "+-*/"[rng.randrange(4)]
            x = rng.randint(-50000, 50000) / 100.0
            y = rng.randint(-50000, 50000) / 100.0
            if rng.random() < 0.1:
                y = 0 if rng.random() < 0.5 else 0.0
            out.append("%s,%s,%s" % (op, x, y))
        elif qid == "q3":
            out.append(str(rng.randint(1, 5000)))
        elif qid == "q4":
            pool = "abcXYZ0123456789"
            out.append("".join(pool[rng.randrange(len(pool))] for _ in range(rng.randint(1, 40))))
        elif qid == "q5":
            pool = "abcXYZ0123456789 !@#"
            out.append("".join(pool[rng.randrange(len(pool))] for _ in range(rng.randint(1, 20))).strip() or "x")
        elif qid == "q6":
            while True:
                a = rng.randint(-40, 40) / 10.0
                b = rng.randint(-200, 200) / 10.0
                c = rng.randint(-200, 200) / 10.0
                if a != 0 and b * b - 4 * a * c >= 0:
                    break
            out.append("%s %s %s" % (a, b, c))
    return out


def not_negative_zero(text):
    for token in text.replace(",", " ").split():
        if token.startswith("-") and float(token) == 0.0:
            return False
    return True


# 產生器對每一筆預期輸出做的額外檢查（回傳 False 就中止）
def sanity(qid, expected):
    return not_negative_zero(expected)
