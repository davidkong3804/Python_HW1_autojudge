# -*- coding: utf-8 -*-
"""
HW2 作業規格：題目、配分、測資、獨立驗算、隨機對拍輸入。

tools/generate_tests.py、tools/verify_tests.py 會讀這個檔。
新增作業時複製一份改，欄位說明見 hw/README.md。
"""

import re

META = {
    "id": "hw2",
    "title": "HW2",
    "subtitle": "反轉單字、質數產生器、去除重複、共同元素、二進位轉十進位、日期計算",
    "submission": "學號_HW2.zip → 學號_HW2/q1a.py、q1b.py … q4b.py、q5.py、q6.py",
    "grading": "Q1~Q4 各 20 分（a、b 子題各 10 分）、Q5~Q6 各 10 分，共 100 分；"
               "每個子題／每題 5 組測資、每組 2 分",
    "handout": "handout.pdf",        # 作業定稿（hw/hw2/handout.pdf），網頁上可以直接點開
}

# 作業定稿的題目敘述（原文），網頁「測資與參考解答」裡看得到，批改時對照題意用。
# a、b 子題共用同一段，用 group 對應。
STATEMENTS = {
    "q1": "Write a program to reverse the order of words in a sentence.\n"
          "a. Use a loop\nb. Use list slicing only\n"
          "Hint: for b, you may use string.join",
    "q2": "Create a program that generates prime numbers within a specified range using a function, "
          "where the range is between N1 and N2, including N1 and N2, if N1 or N2 are prime numbers. "
          "Moreover, N1 and N2 are positive integers, N1 < N2, and N1 and N2 are separated by a space. "
          "Please output the prime numbers in one line in ascending order and separate them by commas. "
          "If there are no prime numbers, output 0.\n"
          "a. use for loop\nb. use while loop\n"
          "Hint: You need to define a function in both sub-questions",
    "q3": "Write a program to remove duplicates from a list of numbers and output them in ascending order, "
          "where numbers are separated by commas.\n"
          "a. Use a loop\nb. Use a set",
    "q4": "Create a program that finds and prints the common elements between two lists, sorted in the "
          "following order: digits 0~9, uppercase letters A~Z, and lowercase letters a~z. If there are no "
          "common elements, please print \u201cN/A\u201d. TA will give you two lines separately and there is no "
          "duplication in a line. Please use two input() to read input data. The first line is the first "
          "list and the second line is the second list. The elements in both lines are separated by commas.\n"
          "a. Loop is needed\nb. Define a function to do the comparison of two lists\n"
          "Hint: the codes in b. should be different with those in a.",
    "q5": "Write a program to convert a binary number (given as a string) to a decimal number, where the "
          "converted decimal number is positive.",
    "q6": "Write a program that calculates the difference between two dates using the datetime module. "
          "The date format is YYYY-MM-DD, the unit of the difference is day, and two dates are in one line, "
          "separated by comma. If the input date format is incorrect or the date doesn\u2019t exist, "
          "please show \u201cInvalid\u201d\n"
          "Hint 1: TAs may give you the invalid date format, such as 10-01-2026.\n"
          "Hint 2: TAs may give you non-existence dates, such as 2026-09-31.\n"
          "Hint 3: If the month or day is a single digit, automatically add a leading zero. "
          "Here is an example: 2023-1-2 \u2192 2023-01-02.\n"
          "Hint 4: The calculated result should always be non-negative. "
          "Remember to use the absolute value function, abs().",
}


# --------------------------------------------------------------------------
# 各題測資：每筆 = (輸入字串, 這組在測什麼)
# 每題 5 組、全部是手工挑選的特殊測資，不採用作業 PDF 範例，也不放隨機測資
# a、b 子題共用同一個 build 函式（輸入輸出完全一樣，只有寫法要求不同）
# --------------------------------------------------------------------------
def build_q1():
    return [
        ("Python", "只有一個單字，原樣輸出；range(len-1, 0, -1) 或 [-1:0:-1] 會少掉第一個字而印出空白"),
        ("Hello, World!", "標點要跟著單字走 -> World! Hello,；整串字元反轉會得 !dlroW ,olleH"),
        ("I love Python 3", "大小寫與數字原樣保留 -> 3 Python love I；誤用 sorted(reverse=True) 會排成 love Python I 3"),
        ("To be or not to be", "有重複的單字且 To/to 大小寫不同，全部都要保留 -> be to not or be To"),
        ("the quick brown fox jumps over the lazy dog near the river",
         "12 個單字的長句，檢查每一個單字都有反轉到、只用單一空白分隔"),
    ]


def build_q2():
    return [
        ("1 10", "N1 = 1：1 不是質數；區間內有 4、9 兩個完全平方數 -> 2,3,5,7"),
        ("13 19", "兩端點 13、19 本身都是質數，必須包含 -> 13,17,19；range(N1, N2) 會漏掉 19"),
        ("24 28", "區間內沒有質數要輸出 0；其中 25 = 5*5，用 i*i < n 判斷會誤判為質數"),
        ("119 127", "119 = 7*17、121 = 11*11、125 = 5^3 都不是質數，只有右端點 127 -> 127"),
        ("180 300", "範圍較大，21 個質數，檢查逗號分隔且沒有多餘空白"),
    ]


def build_q3():
    return [
        ("10,9,100,9", "數值排序 9,10,100；用字串排序會得 10,100,9；兩個 9 不相鄰"),
        ("42", "只有一個元素，輸出後面不可以多逗號"),
        ("0,0,0,0", "全部重複而且是 0，只剩一個 0"),
        ("8,6,4,2", "沒有重複但順序顛倒，一定要排序 -> 2,4,6,8"),
        ("15,3,15,40,3,7,40,1", "多組交錯重複 + 一位數與兩位數混合 -> 1,3,7,15,40；list(set()) 沒排序會錯"),
    ]


def build_q4():
    return [
        ("b,A,3,z,Z\nZ,z,3,b,Q", "數字/大寫/小寫混合，Z 與 z 都是共同元素 -> 3,Z,b,z；照第一行順序輸出會錯"),
        ("a,B,c\nA,b,C", "只差在大小寫，不算相同 -> N/A；轉小寫再比會得 a,b,c"),
        ("9,8,7,6\n6,7,8,9", "兩行元素相同但順序相反，輸出要排序 -> 6,7,8,9"),
        ("k\np,q,k", "第一行只有一個元素、只有一個共同元素 -> k"),
        ("0,A,a,9,Z,z\nz,Z,9,a,A,0", "六個邊界字元全部共同 -> 0,9,A,Z,a,z；不分大小寫排序會得 0,9,A,a,Z,z"),
    ]


def build_q5():
    return [
        ("1", "最小的正數，只有一位 -> 1"),
        ("0001101", "開頭有 0，不影響數值 -> 13；位元順序算反會得 88"),
        ("10000000", "剛好 8 位元的 2 的次方 -> 128；位元順序算反會得 1"),
        ("1100101011111110101011011011111011101111", "40 位元、超過 32 位元範圍，而且不是迴文（位元順序算反會得到不同的數）"),
        ("1" * 64, "64 個 1 = 2^64 - 1；用 math.pow / 浮點數累加會失去精度變成 ...616"),
    ]


def build_q6():
    return [
        ("2000-02-29,2000-03-01", "2000 年是閏年（被 400 整除），2/29 合法 -> 1；以為二月最多 28 天會錯"),
        ("2023-02-29,2023-03-01", "2023 年不是閏年，2/29 不存在 -> Invalid"),
        ("2026-3-5,2025-12-25", "月、日是個位數要自動補 0，而且前面的日期比較晚要取絕對值 -> 70"),
        ("2024-06-15,2024-06-15", "同一天相差 0 天（不是 1）"),
        ("15-08-2024,2024-08-15", "第一個日期是 DD-MM-YYYY 格式錯誤 -> Invalid"),
    ]


# id：題號（也是檔名 q1a.py…）；group：同一大題的子題共用
# keywords：學生交 .ipynb 時，用 markdown / 程式碼裡的關鍵字猜是哪一題（正規表示式，不分大小寫）
# checks：程式寫法要求（只提示助教，不自動扣分），可用值見 hw/README.md
KW_Q1 = r"reverse\s*words|反轉"
KW_Q2 = r"\bprimes?\b|質數"
KW_Q3 = r"duplicate|重複"
KW_Q4 = r"common\s*elements?|共同"
KW_Q5 = r"binary|decimal|二進位"
KW_Q6 = r"datetime|date\s*calculation|日期"

PROBLEMS = [
    {"id": "q1a", "name": "Reverse Words in a Sentence (loop)", "points": 10, "build": build_q1,
     "group": "q1", "checks": ["loop"], "requirement": "要用迴圈反轉單字順序",
     "keywords": KW_Q1},
    {"id": "q1b", "name": "Reverse Words in a Sentence (slicing)", "points": 10, "build": build_q1,
     "group": "q1", "checks": ["slice", "no-loop"],
     "requirement": "只能用 list slicing（可搭配 join），不可以用迴圈", "keywords": KW_Q1},
    {"id": "q2a", "name": "Prime Number Generator (for)", "points": 10, "build": build_q2,
     "group": "q2", "checks": ["for", "def"], "requirement": "要用 for 迴圈，而且要定義函式",
     "keywords": KW_Q2},
    {"id": "q2b", "name": "Prime Number Generator (while)", "points": 10, "build": build_q2,
     "group": "q2", "checks": ["while", "def"], "requirement": "要用 while 迴圈，而且要定義函式",
     "keywords": KW_Q2},
    {"id": "q3a", "name": "Remove Duplicates from List (loop)", "points": 10, "build": build_q3,
     "group": "q3", "checks": ["loop"], "requirement": "要用迴圈去除重複", "keywords": KW_Q3},
    {"id": "q3b", "name": "Remove Duplicates from List (set)", "points": 10, "build": build_q3,
     "group": "q3", "checks": ["set"], "requirement": "要用 set 去除重複", "keywords": KW_Q3},
    {"id": "q4a", "name": "Finding Common Elements in Lists (loop)", "points": 10, "build": build_q4,
     "group": "q4", "checks": ["loop"], "requirement": "要用迴圈找共同元素", "keywords": KW_Q4},
    {"id": "q4b", "name": "Finding Common Elements in Lists (function)", "points": 10,
     "build": build_q4, "group": "q4", "checks": ["def"],
     "requirement": "要定義一個函式做比較", "keywords": KW_Q4},
    {"id": "q5", "name": "Convert Binary to Decimal", "points": 10, "build": build_q5,
     "checks": [], "keywords": KW_Q5},
    {"id": "q6", "name": "Date Calculation", "points": 10, "build": build_q6,
     "checks": ["import:datetime"], "requirement": "要使用 datetime 模組", "keywords": KW_Q6},
]


# --------------------------------------------------------------------------
# 第三道防線：用和參考解答不同的方法重算（完全不看任何一份 Python 解答）
# --------------------------------------------------------------------------
def independent_q1(line):
    words = line.split(" ")
    out = []
    while words:                     # 每次從尾巴拿一個
        out.append(words.pop())
    return " ".join(out)


def independent_q2(line):
    lo, hi = [int(t) for t in line.split()]
    sieve = [True] * (hi + 1)        # 埃拉托斯特尼篩法
    sieve[0] = False
    if hi >= 1:
        sieve[1] = False
    p = 2
    while p * p <= hi:
        if sieve[p]:
            for m in range(p * p, hi + 1, p):
                sieve[m] = False
        p += 1
    found = [str(k) for k in range(lo, hi + 1) if sieve[k]]
    return ",".join(found) if found else "0"


def independent_q3(line):
    remaining = [int(t) for t in line.split(",")]
    out = []
    while remaining:                 # 反覆取出最小值，再把所有等於它的拿掉
        m = min(remaining)
        out.append(str(m))
        remaining = [x for x in remaining if x != m]
    return ",".join(out)


ORDER = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"


def independent_q4(text):
    first, second = text.split("\n")
    a, b = first.split(","), second.split(",")
    found = [ch for ch in ORDER if ch in a and ch in b]   # 直接照題目規定的順序掃一遍
    return ",".join(found) if found else "N/A"


def independent_q5(line):
    total = 0
    for k, ch in enumerate(reversed(line)):
        if ch == "1":
            total |= 1 << k
    return str(total)


DATE_RE = re.compile(r"^(\d{4})-(\d{1,2})-(\d{1,2})$")


def is_leap(y):
    return y % 400 == 0 or (y % 4 == 0 and y % 100 != 0)


def month_len(y, m):
    if m == 2:
        return 29 if is_leap(y) else 28
    return 30 if m in (4, 6, 9, 11) else 31


def days_from_civil(y, m, d):
    """自己算的天數公式（不用 datetime）：公元 1 年 1 月 1 日起算的第幾天。"""
    days = 365 * (y - 1) + (y - 1) // 4 - (y - 1) // 100 + (y - 1) // 400
    for mm in range(1, m):
        days += month_len(y, mm)
    return days + d


def parse_date(text):
    mo = DATE_RE.match(text)
    if not mo:
        return None
    y, m, d = int(mo.group(1)), int(mo.group(2)), int(mo.group(3))
    if y < 1 or not 1 <= m <= 12 or not 1 <= d <= month_len(y, m):
        return None
    return days_from_civil(y, m, d)


def independent_q6(line):
    parts = line.split(",")
    if len(parts) != 2:
        return "Invalid"
    a, b = parse_date(parts[0]), parse_date(parts[1])
    if a is None or b is None:
        return "Invalid"
    return str(abs(a - b))


INDEPENDENT = {
    "q1a": independent_q1, "q1b": independent_q1,
    "q2a": independent_q2, "q2b": independent_q2,
    "q3a": independent_q3, "q3b": independent_q3,
    "q4a": independent_q4, "q4b": independent_q4,
    "q5": independent_q5, "q6": independent_q6,
}


# --------------------------------------------------------------------------
# 第五道防線：隨機對拍的輸入（只產生題目敘述下沒有歧義的合法輸入；Q6 混入不合法日期）
# --------------------------------------------------------------------------
WORD_POOL = ["a", "I", "cat", "Dog", "python", "Java", "is", "fun!", "hello,", "World",
             "x1", "42", "don't", "(ok)", "C++", "end."]
CHAR_POOL = ORDER


def random_date(rng):
    y = rng.randint(1900, 2100)
    m = rng.randint(1, 12)
    d = rng.randint(1, 31)             # 可能產生 4/31、2/30 之類不存在的日期
    if rng.random() < 0.05:
        m = rng.choice([0, 13])
    if rng.random() < 0.05:
        d = rng.choice([0, 32])
    if rng.random() < 0.05:
        m, d = 2, 29                   # 閏年 / 非閏年的 2/29
    ms = ("%02d" % m) if rng.random() < 0.5 else str(m)
    ds = ("%02d" % d) if rng.random() < 0.5 else str(d)
    r = rng.random()
    if r < 0.05:
        return "%s-%s-%04d" % (ds, ms, y)          # DD-MM-YYYY 格式錯誤
    if r < 0.08:
        return "%04d/%s/%s" % (y, ms, ds)          # 用斜線，格式錯誤
    if r < 0.10:
        return "%02d-%s-%s" % (y % 100, ms, ds)    # 兩位數年份，格式錯誤
    return "%04d-%s-%s" % (y, ms, ds)


def random_inputs(qid, rng, n=300):
    out = []
    for _ in range(n):
        if qid in ("q1a", "q1b"):
            k = rng.randint(1, 12)
            out.append(" ".join(rng.choice(WORD_POOL) for _ in range(k)))
        elif qid in ("q2a", "q2b"):
            if rng.random() < 0.1:
                lo = rng.randint(1, 5000)
                hi = lo + rng.randint(1, 2000)
            else:
                lo = rng.randint(1, 300)
                hi = lo + rng.randint(1, 150)
            out.append("%d %d" % (lo, hi))
        elif qid in ("q3a", "q3b"):
            k = rng.randint(1, 15)
            top = rng.choice([9, 20, 150, 5000])
            out.append(",".join(str(rng.randint(0, top)) for _ in range(k)))
        elif qid in ("q4a", "q4b"):
            a = rng.sample(CHAR_POOL, rng.randint(1, 12))
            b = rng.sample(CHAR_POOL, rng.randint(1, 12))
            if rng.random() < 0.5:     # 讓共同元素多一點
                b = list(dict.fromkeys(b[: len(b) // 2] + rng.sample(a, rng.randint(1, len(a)))))
                rng.shuffle(b)
            out.append(",".join(a) + "\n" + ",".join(b))
        elif qid == "q5":
            k = rng.randint(1, 80)
            bits = "".join(rng.choice("01") for _ in range(k))
            if "1" not in bits:
                bits = bits + "1"
            out.append(bits)
        elif qid == "q6":
            out.append(random_date(rng) + "," + random_date(rng))
    return out
