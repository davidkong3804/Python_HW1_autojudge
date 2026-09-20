#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HW1 測資產生器
---------------
* 每題 5 組測資，全部是手工挑選的特殊測資
* 不使用作業 PDF 上的範例：那些學生手上就有，拿來當測資沒有鑑別度
* 不使用隨機測資：5 組的額度太少，每一組都要換到明確的鑑別點
* 配分依作業公告：Q1~Q4 各 15 分（每組 3 分）、Q5~Q6 各 20 分（每組 4 分），總分 100
* 預期輸出一律由 solutions/qN.py「實際執行」產生，避免手寫答案打錯
* 產生：tests/qN/NN.in, tests/qN/NN.out, data/tests.js, data/tests.json

挑選原則：每題 5 組必須讓 mutants/ 裡對應的 4 支錯誤程式全部至少被抓到一次
（由 tools/verify_tests.py 的第四道防線把關），同時盡量覆蓋題目敘述裡
提到的每一種輸出情況。

執行：python3 tools/generate_tests.py
"""

import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOL = os.path.join(ROOT, "solutions")

TESTS_PER_PROBLEM = 5


def not_negative_zero(text: str) -> bool:
    for token in text.replace(",", " ").split():
        if token.startswith("-") and float(token) == 0.0:
            return False
    return True


# --------------------------------------------------------------------------
# 各題測資
# 每筆 = (輸入字串, 這組在測什麼)
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


def drop_stale_files(qdir, keep):
    """刪掉上一版留下來、編號超過 keep 的測資檔（例如 10 組縮成 5 組時的 06~10）。"""
    for fn in sorted(os.listdir(qdir)):
        m = re.match(r"^(\d+)\.(in|out)$", fn)
        if m and int(m.group(1)) > keep:
            os.remove(os.path.join(qdir, fn))


def main():
    manifest = {"title": "HW1 自動批改測資", "problems": []}

    for qid, name, points, builder in BUILDERS:
        cases = builder()
        assert len(cases) == TESTS_PER_PROBLEM, \
            "%s 應有 %d 組測資，實際 %d 組" % (qid, TESTS_PER_PROBLEM, len(cases))
        qdir = os.path.join(ROOT, "tests", qid)
        os.makedirs(qdir, exist_ok=True)
        drop_stale_files(qdir, TESTS_PER_PROBLEM)
        tests = []
        for idx, (stdin_text, note) in enumerate(cases, start=1):
            expected = run_solution(qid, stdin_text + "\n")
            assert not_negative_zero(expected), "%s #%d 產生了負零：%s" % (qid, idx, expected)
            with open(os.path.join(qdir, "%02d.in" % idx), "w", encoding="utf-8") as fh:
                fh.write(stdin_text + "\n")
            with open(os.path.join(qdir, "%02d.out" % idx), "w", encoding="utf-8") as fh:
                fh.write(expected + "\n")
            tests.append(
                {"n": idx, "input": stdin_text, "expected": expected,
                 "note": note, "kind": "special"}
            )
        manifest["problems"].append(
            {
                "id": qid,
                "name": name,
                "points": points,
                "pointsPerTest": round(points / float(TESTS_PER_PROBLEM), 4),
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
             "> 由 `tools/generate_tests.py` 自動產生；每題 %d 組，"
             "預期輸出是實際執行 `solutions/qN.py` 得到的結果。" % TESTS_PER_PROBLEM, "",
             "> 測資一律不採用作業 PDF 上的範例（學生手上已經有），"
             "全部是針對常見錯誤挑選的特殊測資。", ""]
    for prob in manifest["problems"]:
        lines.append("## %s %s（%d 分，每組 %s 分）" %
                     (prob["id"].upper(), prob["name"], prob["points"], prob["pointsPerTest"]))
        lines.append("")
        lines.append("| # | 輸入 | 正確輸出 | 這組在測什麼 |")
        lines.append("|---|---|---|---|")
        for t in prob["tests"]:
            lines.append("| %d | `%s` | `%s` | %s |" %
                         (t["n"], t["input"], t["expected"], t["note"]))
        lines.append("")
    with open(os.path.join(ROOT, "tests", "README.md"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines))

    total = sum(p["points"] for p in manifest["problems"])
    print("已產生 %d 題、每題 %d 組測資，總分 %d" %
          (len(manifest["problems"]), TESTS_PER_PROBLEM, total))


if __name__ == "__main__":
    main()
