#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HW1 測資驗證器
---------------
四道防線，全部通過才算測資可用：

  1. 參考解答 solutions/qN.py 跑過全部測資          -> 必須 100 分
  2. 另一位「助教」寫的獨立實作 tools/ref_alt/qN.py -> 必須 100 分
  3. 用純數學（Fraction / Decimal，不重用任何一份解答的程式碼）重算答案
  4. mutation testing：mutants/ 裡每一支故意寫錯的程式，
     都必須至少被一組測資抓到（有漏洞的程式不能拿滿分）
  5. 隨機對拍：大量隨機輸入下，兩份實作的輸出必須完全一致

執行：python3 tools/verify_tests.py
"""

import json
import os
import random
import subprocess
import sys
from decimal import Decimal, ROUND_HALF_UP, getcontext
from fractions import Fraction

getcontext().prec = 60

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOL = os.path.join(ROOT, "solutions")
ALT = os.path.join(ROOT, "tools", "ref_alt")
MUT = os.path.join(ROOT, "mutants")

RED, GREEN, YELLOW, RESET = "\033[31m", "\033[32m", "\033[33m", "\033[0m"
failures = []


def run(path, stdin_text, timeout=20):
    try:
        proc = subprocess.run(
            [sys.executable, path], input=stdin_text, capture_output=True,
            text=True, timeout=timeout,
        )
    except subprocess.TimeoutExpired:
        return None, "TLE"
    if proc.returncode != 0:
        return None, "RE"
    return proc.stdout.rstrip("\n").rstrip(), ""


def load_manifest():
    with open(os.path.join(ROOT, "data", "tests.json"), encoding="utf-8") as fh:
        return json.load(fh)


# ---------------------------------------------------------------------------
# 第三道防線：純數學重算（完全不看任何一份 Python 解答）
# ---------------------------------------------------------------------------
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


# ---------------------------------------------------------------------------
# 第五道防線：隨機對拍
# ---------------------------------------------------------------------------
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


def main():
    manifest = load_manifest()
    rng = random.Random(1234567)
    print("=" * 72)
    print("HW1 測資驗證")
    print("=" * 72)

    for prob in manifest["problems"]:
        qid = prob["id"]
        tests = prob["tests"]
        print("\n[%s] %s  (%d 分 / %d 組測資)" % (qid, prob["name"], prob["points"], len(tests)))

        # --- 1 & 2：兩份實作 ---
        for label, folder in (("參考解答", SOL), ("獨立實作", ALT)):
            bad = []
            for t in tests:
                got, err = run(os.path.join(folder, qid + ".py"), t["input"] + "\n")
                if err or got != t["expected"]:
                    bad.append((t["n"], err or got))
            status = "%s全部通過%s" % (GREEN, RESET) if not bad else "%s不通過 %s%s" % (RED, bad, RESET)
            print("   1) %s：%s" % (label, status))
            if bad:
                failures.append("%s %s 未通過：%s" % (qid, label, bad))

        # --- 3：純數學重算 ---
        bad = []
        for t in tests:
            calc = INDEPENDENT[qid](t["input"])
            if calc != t["expected"]:
                bad.append((t["n"], t["input"], calc, t["expected"]))
        print("   2) 純數學重算：%s" % ("%s一致%s" % (GREEN, RESET) if not bad
                                        else "%s不一致 %s%s" % (RED, bad, RESET)))
        if bad:
            failures.append("%s 數學重算不一致：%s" % (qid, bad))

        # --- 4：mutation testing ---
        mutants = sorted(f for f in os.listdir(MUT) if f.startswith(qid + "_"))
        for m in mutants:
            caught, first = 0, None
            for t in tests:
                got, err = run(os.path.join(MUT, m), t["input"] + "\n")
                if err or got != t["expected"]:
                    caught += 1
                    if first is None:
                        first = t["n"]
            score = prob["pointsPerTest"] * (len(tests) - caught)
            ok = caught > 0
            print("   3) 漏洞程式 %-24s 被 %2d/%d 組測資抓到 (第 %s 組起)，只能拿 %.1f 分 %s"
                  % (m, caught, len(tests), first, score,
                     GREEN + "OK" + RESET if ok else RED + "沒抓到！" + RESET))
            if not ok:
                failures.append("%s 的漏洞程式 %s 竟然拿到滿分" % (qid, m))

        # --- 5：隨機對拍 ---
        mism = []
        for line in random_inputs(qid, rng):
            a, ea = run(os.path.join(SOL, qid + ".py"), line + "\n")
            b, eb = run(os.path.join(ALT, qid + ".py"), line + "\n")
            if (a, ea) != (b, eb):
                mism.append((line, a or ea, b or eb))
            if len(mism) >= 3:
                break
        print("   4) 隨機對拍 300 筆：%s" % ("%s兩份實作完全一致%s" % (GREEN, RESET) if not mism
                                            else "%s有差異 %s%s" % (YELLOW, mism, RESET)))
        if mism:
            failures.append("%s 隨機對拍有差異：%s" % (qid, mism))

    print("\n" + "=" * 72)
    if failures:
        print(RED + "驗證失敗：" + RESET)
        for f in failures:
            print("  - " + f)
        sys.exit(1)
    print(GREEN + "全部通過：測資正確，且每一支有漏洞的程式都拿不到滿分。" + RESET)


if __name__ == "__main__":
    main()
