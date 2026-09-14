#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HW1 測資產生器
---------------
* 每題 10 組測資 = 手工特例 (special case) + 過濾過的隨機測資
* 預期輸出一律由 solutions/qN.py「實際執行」產生，避免手寫答案打錯
* 產生：tests/qN/NN.in, tests/qN/NN.out, data/tests.js, data/tests.json

隨機測資會經過「歧義過濾器」：
  - 四捨五入邊界 (x.xx5 / x.xxx5) 附近的值一律丟掉，
    否則不同寫法(先 round 再 format、%f、Decimal)可能給出不同答案。
  - 會產生 -0.00 / -0.000 的值一律丟掉。
執行：python3 tools/generate_tests.py
"""

import json
import os
import random
import subprocess
import sys
from decimal import Decimal, getcontext
from fractions import Fraction

getcontext().prec = 60

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOL = os.path.join(ROOT, "solutions")
SEED = 20260914

# --------------------------------------------------------------------------
# 歧義過濾：四捨五入邊界
# --------------------------------------------------------------------------
GUARD = Fraction(1, 10 ** 7)          # 離邊界至少這麼遠才安全


def rational_safe(value: Fraction, digits: int) -> bool:
    """value 四捨五入到小數第 digits 位時，是否離 .5 邊界夠遠。"""
    scaled = value * (10 ** digits)
    frac = scaled - int(scaled)
    if frac < 0:
        frac += 1
    return abs(frac - Fraction(1, 2)) > GUARD


def decimal_safe(value: Decimal, digits: int) -> bool:
    scaled = value * (10 ** digits)
    frac = abs(scaled - int(scaled))
    return abs(frac - Decimal("0.5")) > Decimal("1e-7")


def not_negative_zero(text: str) -> bool:
    for token in text.replace(",", " ").split():
        if token.startswith("-") and float(token) == 0.0:
            return False
    return True


# --------------------------------------------------------------------------
# 各題測資
# 每筆 = (輸入字串, 說明, 類型)  類型: example / special / random
# --------------------------------------------------------------------------
def build_q1(rng):
    cases = [
        ("1.75 68", "題目範例 1", "example"),
        ("1.60 55", "題目範例 2", "example"),
        ("2 100", "整數輸入且 BMI 為整數 25 -> 必須補成 25.00", "special"),
        ("0.5 3.2", "極小值(嬰兒)：身高 < 1，BMI 12.80", "special"),
        ("1.7 49.5", "17.128... -> 17.13，無條件捨去會得 17.12", "special"),
        ("3 500", "極大值：BMI 55.56，進位測試", "special"),
        ("1.0 0.5", "體重小於 1，答案只有 0.50", "special"),
        ("1.83 95.25", "身高體重皆為小數", "special"),
    ]
    while len(cases) < 10:
        h = Fraction(rng.randint(140, 200), 100)
        w = Fraction(rng.randint(300, 1500), 10)
        bmi = w / (h * h)
        if not rational_safe(bmi, 2):
            continue
        cases.append(("%s %s" % (float(h), float(w)), "隨機測資", "random"))
    return cases


def build_q2(rng):
    cases = [
        ("+,5.5,3.2", "題目範例 1", "example"),
        ("/,9,4", "題目範例 2", "example"),
        ("-,3,10", "結果為負數 -7.00", "special"),
        ("*,-2.5,4", "負數乘法 -10.00", "special"),
        ("/,5,0", "除數為 0 -> Error", "special"),
        ("/,7.5,0.0", "除數寫成 0.0 -> 仍然是 Error（用字串比對 '0' 會錯）", "special"),
        ("/,0,8", "被除數為 0，不是 Error，應輸出 0.00", "special"),
        ("/,2,3", "0.6666... -> 0.67，無條件捨去會得 0.66", "special"),
        ("+,-7.25,-3.75", "兩個負小數相加 -11.00", "special"),
    ]
    ops = ["+", "-", "*", "/"]
    while len(cases) < 10:
        op = ops[rng.randrange(4)]
        x = Fraction(rng.randint(-20000, 20000), 100)
        y = Fraction(rng.randint(-20000, 20000), 100)
        if op == "/" and y == 0:
            continue
        value = {"+": x + y, "-": x - y, "*": x * y, "/": (x / y if y else 0)}[op]
        if not rational_safe(value, 2):
            continue
        if float(value) == 0.0 and value != 0:
            continue
        text = "%s,%s,%s" % (op, float(x), float(y))
        cases.append((text, "隨機測資", "random"))
    return cases


def build_q3(rng):
    return [
        ("17", "題目範例 1", "example"),
        ("20", "題目範例 2", "example"),
        ("1", "1 不是質數（最常見的漏洞）", "special"),
        ("2", "唯一的偶質數", "special"),
        ("3", "最小的奇質數", "special"),
        ("4", "最小的合數", "special"),
        ("9", "奇數的完全平方，i*i<n 的迴圈會誤判為質數", "special"),
        ("997", "三位數質數", "special"),
        ("998001", "999 的平方，大的奇合數", "special"),
        ("999983", "小於 10^6 的最大質數，測效能", "special"),
    ]


def build_q4(rng):
    cases = [
        ("45OpenAI67", "題目範例 1", "example"),
        ("Programming", "題目範例 2（沒有數字，和為 0）", "example"),
        ("1234567890", "全部都是數字，和 45 長度 10", "special"),
        ("a", "單一字母", "special"),
        ("7", "單一數字", "special"),
        ("007Bond", "開頭是 0，數字和 7", "special"),
        ("0000", "全部都是 0，和仍為 0（不可與『沒有數字』混淆）", "special"),
        ("ZZZ999zzz111", "大小寫混合 + 數字，和 30 長度 12", "special"),
    ]
    letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
    digits = "0123456789"
    while len(cases) < 10:
        n = rng.choice([12, 60])
        pool = letters + digits
        s = "".join(pool[rng.randrange(len(pool))] for _ in range(n))
        if not any(ch in digits for ch in s):
            continue
        note = "隨機測資（長度 %d）" % n
        cases.append((s, note, "random"))
    return cases


def build_q5(rng):
    cases = [
        ("ewf", "題目範例 1", "example"),
        ("3r23rf", "題目範例 2（長度 6 邊界 -> Moderate）", "example"),
        ("kjfdsijhfioafhweowfw", "題目範例 3", "example"),
        ("abcde", "長度 5 邊界 -> Weak", "special"),
        ("1234567890", "長度 10 邊界 -> Moderate", "special"),
        ("12345678901", "長度 11 邊界 -> Strong", "special"),
        ("a", "長度 1", "special"),
        ("123456", "全數字密碼，用 int(input()) 會炸掉", "special"),
        ("Pass word", "含空格，長度 9；誤用 split() 會判成 Weak", "special"),
    ]
    pool = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
    while len(cases) < 10:
        n = 64
        s = "".join(pool[rng.randrange(len(pool))] for _ in range(n))
        cases.append((s, "隨機測資（長度 64，含符號）", "random"))
    return cases


def q6_roots_exact(a, b, c):
    da, db, dc = Decimal(a), Decimal(b), Decimal(c)
    disc = db * db - 4 * da * dc
    s = disc.sqrt()
    r1 = (-db + s) / (2 * da)
    r2 = (-db - s) / (2 * da)
    return (r1, r2) if r1 >= r2 else (r2, r1)


def build_q6(rng):
    cases = [
        ("2 16 1", "題目範例 1", "example"),
        ("16 200 23", "題目範例 2", "example"),
        ("2 4 2", "題目範例 3：重根 (b^2-4ac = 0)", "example"),
        ("1 -5 6", "整數雙根 3, 2", "special"),
        ("-1 0 4", "a 為負數：沒有排序會把 -2.000 印在前面", "special"),
        ("-2 5 3", "a 為負數且有小數根 3.000 / -0.500", "special"),
        ("1 5 0", "c = 0，其中一根剛好是 0.000", "special"),
        ("1 0 -2", "無理根 ±1.414", "special"),
        ("0.5 -1.5 -14", "係數含小數，根為 7.000 / -4.000", "special"),
    ]
    while len(cases) < 10:
        a = Decimal(rng.randint(-50, 50)) / 10
        b = Decimal(rng.randint(-300, 300)) / 10
        c = Decimal(rng.randint(-300, 300)) / 10
        if a == 0:
            continue
        if b * b - 4 * a * c < 0:
            continue
        r1, r2 = q6_roots_exact(a, b, c)
        if not (decimal_safe(r1, 3) and decimal_safe(r2, 3)):
            continue
        if abs(r1) > 1000 or abs(r2) > 1000:
            continue
        if r1 == 0 or r2 == 0:
            continue
        cases.append(("%s %s %s" % (a, b, c), "隨機測資", "random"))
    return cases


BUILDERS = [
    ("q1", "BMI Calculator", 15, build_q1),
    ("q2", "Simple Calculator", 15, build_q2),
    ("q3", "Prime Number and Even or Odd Checker", 15, build_q3),
    ("q4", "Sum of Digits and String Length", 15, build_q4),
    ("q5", "Password Strength Checker", 20, build_q5),
    ("q6", "Find Roots", 20, build_q6),
]


def run_solution(qid, stdin_text):
    proc = subprocess.run(
        [sys.executable, os.path.join(SOL, qid + ".py")],
        input=stdin_text,
        capture_output=True,
        text=True,
        timeout=30,
    )
    if proc.returncode != 0:
        raise RuntimeError("%s 參考解答執行失敗：%s" % (qid, proc.stderr))
    return proc.stdout.rstrip("\n")


def main():
    rng = random.Random(SEED)
    manifest = {"title": "HW1 自動批改測資", "generated_with_seed": SEED, "problems": []}

    for qid, name, points, builder in BUILDERS:
        cases = builder(rng)
        assert len(cases) == 10, "%s 應有 10 組測資" % qid
        qdir = os.path.join(ROOT, "tests", qid)
        os.makedirs(qdir, exist_ok=True)
        tests = []
        for idx, (stdin_text, note, kind) in enumerate(cases, start=1):
            expected = run_solution(qid, stdin_text + "\n")
            assert not_negative_zero(expected), "%s #%d 產生了負零：%s" % (qid, idx, expected)
            with open(os.path.join(qdir, "%02d.in" % idx), "w", encoding="utf-8") as fh:
                fh.write(stdin_text + "\n")
            with open(os.path.join(qdir, "%02d.out" % idx), "w", encoding="utf-8") as fh:
                fh.write(expected + "\n")
            tests.append(
                {"n": idx, "input": stdin_text, "expected": expected, "note": note, "kind": kind}
            )
        manifest["problems"].append(
            {
                "id": qid,
                "name": name,
                "points": points,
                "pointsPerTest": round(points / 10.0, 4),
                "tests": tests,
            }
        )

    os.makedirs(os.path.join(ROOT, "data"), exist_ok=True)
    with open(os.path.join(ROOT, "data", "tests.json"), "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=1)
    with open(os.path.join(ROOT, "data", "tests.js"), "w", encoding="utf-8") as fh:
        fh.write("// 由 tools/generate_tests.py 自動產生，請勿手動修改\n")
        fh.write("window.HW_TESTS = ")
        json.dump(manifest, fh, ensure_ascii=False, indent=1)
        fh.write(";\n")

    # 把參考解答也打包進去，讓網頁可以「自我檢測」與檢視標準答案
    sols = {}
    for qid, _n, _p, _b in BUILDERS:
        with open(os.path.join(SOL, qid + ".py"), encoding="utf-8") as fh:
            sols[qid] = fh.read()
    with open(os.path.join(ROOT, "data", "solutions.js"), "w", encoding="utf-8") as fh:
        fh.write("// 由 tools/generate_tests.py 自動產生，請勿手動修改\n")
        fh.write("window.HW_SOLUTIONS = ")
        json.dump(sols, fh, ensure_ascii=False, indent=1)
        fh.write(";\n")

    # 把故意寫錯的程式也打包進去，網頁上按「載入示範」就能看見它們被抓出來
    mut = {}
    mdir = os.path.join(ROOT, "mutants")
    for fn in sorted(os.listdir(mdir)):
        if fn.endswith(".py"):
            with open(os.path.join(mdir, fn), encoding="utf-8") as fh:
                mut[fn] = fh.read()
    with open(os.path.join(ROOT, "data", "mutants.js"), "w", encoding="utf-8") as fh:
        fh.write("// 由 tools/generate_tests.py 自動產生，請勿手動修改\n")
        fh.write("window.HW_MUTANTS = ")
        json.dump(mut, fh, ensure_ascii=False, indent=1)
        fh.write(";\n")

    # 產生一份人看的測資總表，方便另一位助教 review
    lines = ["# HW1 測資一覽", "",
             "> 由 `tools/generate_tests.py` 自動產生；每題 10 組，"
             "預期輸出是實際執行 `solutions/qN.py` 得到的結果。", ""]
    for prob in manifest["problems"]:
        lines.append("## %s %s（%d 分，每組 %s 分）" %
                     (prob["id"].upper(), prob["name"], prob["points"], prob["pointsPerTest"]))
        lines.append("")
        lines.append("| # | 類型 | 輸入 | 正確輸出 | 這組在測什麼 |")
        lines.append("|---|---|---|---|---|")
        label = {"example": "題目範例", "special": "特殊測資", "random": "隨機測資"}
        for t in prob["tests"]:
            lines.append("| %d | %s | `%s` | `%s` | %s |" %
                         (t["n"], label[t["kind"]], t["input"], t["expected"], t["note"]))
        lines.append("")
    with open(os.path.join(ROOT, "tests", "README.md"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines))

    total = sum(p["points"] for p in manifest["problems"])
    print("已產生 %d 題、每題 10 組測資，總分 %d" % (len(manifest["problems"]), total))


if __name__ == "__main__":
    main()
