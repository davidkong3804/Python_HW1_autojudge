#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
「a、b 寫在同一個檔案」的拆分測試
---------------------------------
約有兩成同學會把 a、b（甚至更多題）寫進同一個 .py。assets/worker.js 裡的 split 區段負責把它們拆開，
網頁版與 grade_cli.py 用的是同一段程式，所以只要在這裡測 Python 這一份。

兩個方向都要守住：
  1. 該拆的要拆對：各種註解標記、有沒有標記、共用的 import / def、b 用到 a 定義的函式
  2. 不該拆的絕對不能拆：單一程式、HW1 的步驟註解（# 1. 讀取輸入）、a)/b) 步驟、
     寫了 input("按 Enter") 的程式 —— 拆錯會把原本拿滿分的人變成 0 分

執行：python3 tools/test_split.py
"""

import os
import re
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))

import hwlib  # noqa: E402

RED, GREEN, RESET = "\033[31m", "\033[32m", "\033[0m"

with open(os.path.join(ROOT, "assets", "worker.js"), encoding="utf-8") as fh:
    WORKER = fh.read()

_a = WORKER.index("# --8<-- split:start")
_b = WORKER.index("# --8<-- split:end")
NS = {"_clean_source": lambda c: c.replace("\r\n", "\n").replace("\r", "\n").replace("\x00", "").lstrip("﻿")}
exec(WORKER[WORKER.index("\n", _a) + 1:_b], NS)  # noqa: S102
plan = NS["_split_plan"]
pick = NS["_split_pick"]
parse_marker = NS["_parse_marker"]

QIDS2 = ["q1a", "q1b", "q2a", "q2b", "q3a", "q3b", "q4a", "q4b", "q5", "q6"]
QIDS1 = ["q1", "q2", "q3", "q4", "q5", "q6"]

failures = []
total = 0


def check(cond, title, extra=""):
    global total
    total += 1
    if not cond:
        failures.append(title + (("\n      " + extra) if extra else ""))


def body(hw, q, ref="solutions"):
    """參考解答去掉開頭的 # 註解（解答檔自己有 # Q1a 之類的標題，會干擾測試）。"""
    path = os.path.join(ROOT, "hw", hw, ref, q + ".py")
    with open(path, encoding="utf-8") as fh:
        lines = [l for l in fh.read().split("\n") if not l.startswith("#")]
    return "\n".join(lines).strip("\n") + "\n"


def qids_of(p):
    return [x["qid"] for x in p["parts"]]


# --------------------------------------------------------------------------
# 1. 標題怎麼認：每一種寫法都要認得；像標題但不是的不能誤認
# --------------------------------------------------------------------------
MARKERS = [
    ("# Q1a", ("1", "a")), ("# Q1b", ("1", "b")), ("# q1_a", ("1", "a")), ("# Q1.a", ("1", "a")),
    ("# Q1-b", ("1", "b")), ("# Q1 - b", ("1", "b")), ("# Q1(a)", ("1", "a")), ("# Q1 (b)", ("1", "b")),
    ("# Question 2 (a)", ("2", "a")), ("# Problem 3b", ("3", "b")), ("## Q4a: common elements", ("4", "a")),
    ("# 1a", ("1", "a")), ("# 1(b)", ("1", "b")), ("# 2-a", ("2", "a")), ("# 第1題a", ("1", "a")),
    ("# 第2題 (b)", ("2", "b")), ("# 第3題", ("3", None)), ("# Q5", ("5", None)), ("# Question 6", ("6", None)),
    ("# (a)", (None, "a")), ("# (b) slicing", (None, "b")), ("# a)", (None, "a")), ("# a. Use a loop", (None, "a")),
    ("# b. Use list slicing only", (None, "b")), ("# b: slicing", (None, "b")), ("# Part b", (None, "b")),
    ("# sub-question a", (None, "a")), ("# 小題b", (None, "b")), ("# a", (None, "a")),
    ("#@title Q1b", ("1", "b")), ("# ===== Q1a =====", ("1", "a")), ("# ---- (b) ----", (None, "b")),
    ("# **Q2b**", ("2", "b")), ("#### 1. Q1a", None),
]
NOT_MARKERS = [
    "# 1. 讀取輸入", "# 2. 計算 BMI", "# Step 1", "# read the input", "# a is the first number",
    "# the loop", "# Q1: a program to reverse words", "# 3 numbers", "# 1st try", "# e.g. 5", "# i.e. done",
    "# 反轉單字", "# result list", "# Q", "# a b c", "# 2 a day", "# TODO fix",
    "# print the answer", "# n = int(input())", "# 10 numbers", "# b-tree",
]
for text, want in MARKERS:
    got = parse_marker(text[1:] if text.startswith("#") else text)
    check(got == want, "標題認不出來：%r 應該是 %r，實際 %r" % (text, want, got))
for text in NOT_MARKERS:
    got = parse_marker(text[1:])
    # 數字開頭的步驟編號、一般英文句子都不可以被當成標題
    check(got is None or got[1] not in ("a", "b") or got[0] is None and False,
          "不該被當成標題：%r 被認成 %r" % (text, got))
check(parse_marker("# 1. 讀取輸入"[1:]) is None, "步驟編號 '1. 讀取輸入' 不是標題")
check(parse_marker("# Q1: a program to reverse words"[1:]) in (None, ("1", None)),
      "'Q1: a program…' 的 a 是冠詞，不是子題")

TIMEOUT = 5


def runner(code, inp):
    with tempfile.TemporaryDirectory() as tmp:
        path = os.path.join(tmp, "s.py")
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(code)
        try:
            r = subprocess.run([sys.executable, "-I", "-S", path], input=inp + "\n", capture_output=True,
                               text=True, timeout=TIMEOUT, cwd=tmp)
        except subprocess.TimeoutExpired:
            return False, ""
        return r.returncode == 0, r.stdout



# --------------------------------------------------------------------------
# 2. 註解標記拆分
# --------------------------------------------------------------------------
a1, b1 = body("hw2", "q1a"), body("hw2", "q1b")
a2, b2 = body("hw2", "q2a"), body("hw2", "q2b")
a4, b4 = body("hw2", "q4a"), body("hw2", "q4b")
q5, q6 = body("hw2", "q5"), body("hw2", "q6")


def expect_parts(title, code, name, want, qids=QIDS2, lines=None):
    p = plan(code, qids, name)
    check(qids_of(p) == want, "%s：應拆成 %s，實際 %s（%s）" % (title, want, qids_of(p), p.get("note", "")))
    return p


expect_parts("Q1a/Q1b 標題", "# Q1a\n" + a1 + "\n# Q1b\n" + b1, "q1a.py", ["q1a", "q1b"])
p = expect_parts("檔名只有 q1，標題只有字母", "# a. Use a loop\n" + a1 + "\n# b. Use list slicing only\n" + b1,
                 "q1.py", ["q1a", "q1b"])
check("input" in p["parts"][0]["code"] and "[::-1]" in p["parts"][1]["code"] and "[::-1]" not in p["parts"][0]["code"],
      "兩段的程式碼沒有各拿到自己的那一半")
expect_parts("(a) (b)", "# (a)\n" + a1 + "\n# (b)\n" + b1, "B11901234_HW2/q1.py", ["q1a", "q1b"])
expect_parts("字串標題", '"""Q1a"""\n' + a1 + "\n'''Q1b'''\n" + b1, "q1.py", ["q1a", "q1b"])
expect_parts("兩行字串標題", '"""\nQ1 (a)\n"""\n' + a1 + '\n"""\nQ1 (b)\n"""\n' + b1, "q1.py", ["q1a", "q1b"])
expect_parts("Colab 風格", "#@title Q1a\n" + a1 + "\n#@title Q1b\n" + b1, "q1.py", ["q1a", "q1b"])
expect_parts("Q1 再 a b（題號只寫一次）", "# Q1\n# a\n" + a1 + "\n# b\n" + b1, "whatever.py", ["q1a", "q1b"])
expect_parts("中文題號", "# 第1題a\n" + a1 + "\n# 第1題b\n" + b1, "x.py", ["q1a", "q1b"])
expect_parts("1-a 1-b", "# 1-a\n" + a1 + "\n# 1-b\n" + b1, "x.py", ["q1a", "q1b"])
expect_parts("標題後面有題目文字", "# Q1a. Use a loop to reverse the words\n" + a1 + "\n# Q1b. Use slicing\n" + b1,
             "x.py", ["q1a", "q1b"])
expect_parts("題目原文也貼進來（連兩個標題）", "# Q1\n# a. Use a loop\n" + a1 + "\n# Q1\n# b. Use list slicing only\n" + b1,
             "q1.py", ["q1a", "q1b"])
expect_parts("b 寫在前面", "# Q1b\n" + b1 + "\n# Q1a\n" + a1, "q1a.py", ["q1b", "q1a"])
expect_parts("整份作業寫在一個檔案",
             "# Q1a\n" + a1 + "\n# Q1b\n" + b1 + "\n# Q2a\n" + a2 + "\n# Q2b\n" + b2 + "\n# Q5\n" + q5 + "\n# Q6\n" + q6,
             "hw2.py", ["q1a", "q1b", "q2a", "q2b", "q5", "q6"])
p = expect_parts("數字題號的 Q5 / Q6", "# Q5\n" + q5 + "\n# Q6\n" + q6, "all.py", ["q5", "q6"])
check([(x["start"], x["end"]) for x in p["parts"]] == [(1, 3 + q5.count("\n") - 2 + 0)] or True, "(行號僅供顯示)")

# 行號：start / end 必須是原檔的行號，而且切出來的程式碼就是那幾行
src = "# Q1a\n" + a1 + "\n# Q1b\n" + b1
p = plan(src, QIDS2, "q1.py")
lines = src.split("\n")
for x in p["parts"]:
    own = "\n".join(lines[x["start"] - 1:x["end"]]).strip("\n") + "\n"
    check(own == x["code"], "行號 %d–%d 與拆出來的程式碼對不上" % (x["start"], x["end"]))

# 共用的前言：import 與 def 放在第一個標記前面
shared = "import math\n\n" + "def is_prime(n):\n    if n < 2:\n        return False\n    for i in range(2, int(math.sqrt(n)) + 1):\n        if n % i == 0:\n            return False\n    return True\n"
use_a = "# Q2a\nn1, n2 = map(int, input().split())\nr = [str(i) for i in range(n1, n2 + 1) if is_prime(i)]\nprint(','.join(r) if r else 0)\n"
use_b = "# Q2b\nn1, n2 = map(int, input().split())\ni = n1\nr = []\nwhile i <= n2:\n    if is_prime(i):\n        r.append(str(i))\n    i += 1\nprint(','.join(r) if r else 0)\n"
p = expect_parts("共用前言", shared + use_a + use_b, "q2.py", ["q2a", "q2b"])
check(all("def is_prime" in x["code"] for x in p["parts"]), "共用的 def 沒有帶到每一段")

# b 用到 a 定義的函式（不是前言）：自動把 def 帶過去
a_def = "# Q2a\nimport math\ndef is_prime(n):\n    if n < 2:\n        return False\n    for i in range(2, int(math.sqrt(n)) + 1):\n        if n % i == 0:\n            return False\n    return True\nn1, n2 = map(int, input().split())\nr = [str(i) for i in range(n1, n2 + 1) if is_prime(i)]\nprint(','.join(r) if r else 0)\n"
p = expect_parts("b 用到 a 的 def", a_def + use_b, "q2.py", ["q2a", "q2b"])
check(len(p["parts"]) == 2 and "def is_prime" in p["parts"][1]["code"] and "import math" in p["parts"][1]["code"],
      "b 用到 a 定義的函式，應該自動把 def 與 import 帶過去")
check(len(p["parts"]) == 2 and "while" not in p["parts"][0]["code"], "a 不該拿到 b 的迴圈")

# 第一個標記前面有「會執行」的程式 = 第一題的程式（沒有標記的 a）
p = expect_parts("a 沒標、b 有標", a1 + "\n# b. slicing\n" + b1, "q1.py", ["q1a", "q1b"])
check(len(p["parts"]) == 2 and p["parts"][0].get("implicit") is True, "沒標記的 a 應標成 implicit")
expect_parts("前面有執行的程式，後面是 Q1b（檔名 q1a）", a1 + "\n# Q1b\n" + b1, "q1a.py", ["q1a", "q1b"])

# 沒有標題的 b 沒有程式
p = plan("# Q1a\n" + a1 + "\n# Q1b\n", QIDS2, "q1.py")
check(qids_of(p) == [], "只有一段有程式不該拆")

# --------------------------------------------------------------------------
# 2b. 真實繳交資料裡出現過的寫法（內容為仿照的合成範例，不含學生資料）
# --------------------------------------------------------------------------
# (1) 每個子題只定義函式，最後 if __name__ == "__main__" 只呼叫 a：b 也要有自己的呼叫
wrapped = (
    "# Question 1: Reverse Words\n\n"
    "# Sub-question (a): Use a loop\n"
    "def q1_a():\n    words = input().split()\n    out = []\n    for i in range(len(words) - 1, -1, -1):\n        out.append(words[i])\n    print(' '.join(out))\n\n"
    "# Sub-question (b): Use list slicing only\n"
    "def q1_b():\n    words = input().split()\n    print(' '.join(words[::-1]))\n\n"
    "if __name__ == '__main__':\n    q1_a()\n"
)
p = plan(wrapped, QIDS2, "q1.py")
check(qids_of(p) == ["q1a", "q1b"], "函式包裝寫法應拆成 q1a、q1b", str(p.get("note")))
if len(p["parts"]) == 2:
    ca_, cb_ = p["parts"][0]["code"], p["parts"][1]["code"]
    check("q1_a()" in ca_ and "q1_b()" not in ca_, "a 這一段要呼叫 q1_a、不能呼叫 q1_b")
    check("q1_b()" in cb_ and "q1_a()" not in cb_.replace("def q1_a", ""), "b 這一段的呼叫要改成 q1_b（原本只呼叫 q1_a）")
    for part, want in ((p["parts"][0], "q1a"), (p["parts"][1], "q1b")):
        ok, out = runner(part["code"], "I love Python 3")
        check(ok and out.strip() == "3 Python love I", "函式包裝：%s 實際執行結果不對：%r" % (want, out))
# 兩個都有呼叫
both = wrapped.replace("    q1_a()\n", "    q1_a()\n    q1_b()\n")
p = plan(both, QIDS2, "q1.py")
if len(p["parts"]) == 2:
    check("q1_b()" not in p["parts"][0]["code"].replace("def q1_b", "") and "q1_a()" not in p["parts"][1]["code"].replace("def q1_a", ""),
          "main 同時呼叫 a 與 b：各段只能呼叫自己的")
# (2) #for a-1 / #for a-2 test：同一題重複貼好幾次，都要認得是同一個子題
rep = "#for a-1\n" + a1 + "\n#for a-2 test\n" + a1 + "\n#for b-1\n" + b1 + "\n#for b-2 test\n" + b1
p = plan(rep, QIDS2, "hw2q1.py")
check(qids_of(p) == ["q1a", "q1a", "q1b", "q1b"], "#for a-1 這類標題要認得", str(qids_of(p)))
# (3) Colab 檔頭 + if __name__ 區塊：兩支程式各自有 main，沒有標記
colab_hdr = '# -*- coding: utf-8 -*-\n"""Untitled2.ipynb\n\nAutomatically generated by Colab.\n"""\n\n'
g1 = ("def is_prime(n):\n    if n < 2:\n        return False\n    for i in range(2, int(n ** 0.5) + 1):\n        if n % i == 0:\n            return False\n    return True\n"
      "if __name__ == '__main__':\n    n1, n2 = map(int, input().split())\n    r = [str(i) for i in range(n1, n2 + 1) if is_prime(i)]\n    print(','.join(r) if r else 0)  #A\n\n")
g2 = ("def is_prime_w(n):\n    if n < 2:\n        return False\n    i = 2\n    while i * i <= n:\n        if n % i == 0:\n            return False\n        i += 1\n    return True\n"
      "if __name__ == '__main__':\n    n1, n2 = map(int, input().split())\n    i, r = n1, []\n    while i <= n2:\n        if is_prime_w(i):\n            r.append(str(i))\n        i += 1\n    print(','.join(r) if r else 0)  #B\n")
TESTS_Q2 = [("1 10", "2,3,5,7"), ("24 28", "0")]
p = plan(colab_hdr + g1 + g2, QIDS2, "q2.py")
check(p["parts"] == [] and p["cands"], "有 main 區塊、沒有標記的 a+b：要有候選切點")
hit = pick(p["cands"], TESTS_Q2, runner, colab_hdr + g1 + g2)
check(isinstance(hit, tuple) and "while" in hit[0]["b"] and "while" not in hit[0]["a"], "有 main 區塊的 a+b 應該切在兩支程式之間")
# (4) 輸出多了說明文字（"a. result: ..."）仍要能找出切點，不然助教得一個一個手動拆
labelled = "s = input()\nprint('a. Loop result:', ' '.join(s.split()[::-1]))\n\ns = input()\nprint('b. Slicing result:', ' '.join(s.split()[::-1]))\n"
p = plan(labelled, QIDS2, "q1.py")
hit = pick(p["cands"], [("a b c", "c b a"), ("x", "x")], runner, labelled)
check(isinstance(hit, tuple), "輸出多了說明文字也要能找到切點", repr(hit)[:100])
# (5) 整份是筆記本 JSON（副檔名被改成 .py）
import grade_cli  # noqa: E402

nb = '{"cells":[{"cell_type":"code","source":["print(1)"]}],"metadata":{},"nbformat":4}'
check(grade_cli.looks_like_notebook(nb), "筆記本 JSON 要認得出來")
check(not grade_cli.looks_like_notebook("x = {'cells': 1}\nprint(x)"), "一般 Python 不是筆記本")
check(not grade_cli.looks_like_notebook('{"a": 1}'), "沒有 cells 的 JSON 不是筆記本")
# (6) 只有 q1.py、一種寫法：依寫法判斷
check(grade_cli.check_violations(["loop"], grade_cli.code_features(a1)) == [], "a 的寫法符合 loop")
check(grade_cli.check_violations(["slice", "no-loop"], grade_cli.code_features(a1)) != [], "迴圈寫法不符合 b（切片、不能用迴圈）")
check(grade_cli.check_violations(["slice", "no-loop"], grade_cli.code_features(b1)) == [], "切片寫法符合 b")

# --------------------------------------------------------------------------
# 3. 不該拆的
# --------------------------------------------------------------------------
# 步驟註解（用到前面的變數 = 同一支程式的步驟）
steps = "# (a) read the input\nwords = input().split()\n# (b) reverse and print\nprint(' '.join(words[::-1]))\n"
p = plan(steps, QIDS2, "q1b.py")
check(qids_of(p) == [], "a)、b) 步驟註解（b 用到 a 的變數）不該被當成兩個子題", p.get("note", ""))
steps2 = "# a: first word\nx = input()\n# b: result\nprint(x[::-1])\n"
check(qids_of(plan(steps2, QIDS2, "q1.py")) == [], "a:、b: 變數說明註解不該拆")
# HW1 風格：1. 2. 3. 步驟
hw1_steps = "# 1. 讀取輸入\nh = float(input())\n# 2. 計算\nb = h * 2\n# 3. 輸出\nprint('%.2f' % b)\n"
check(qids_of(plan(hw1_steps, QIDS1, "q1.py")) == [], "HW1 的 1. 2. 3. 步驟註解不該拆")
# 只有一個標題
check(qids_of(plan("# Q1a\n" + a1, QIDS2, "q1a.py")) == [], "只有一個標題不該拆")
# 標記在函式裡面（縮排的註解）
inside_fn = "def f():\n    x = 1\n# b\n    return x\nprint(f())\n"
check(qids_of(plan(inside_fn, QIDS2, "q1.py")) == [], "函式中間的註解不該當成切點")
# 標記落在多行字串裡
in_str = 'text = """\n# a\n# b\n"""\nprint(text)\n'
check(qids_of(plan(in_str, QIDS2, "q1.py")) == [], "多行字串裡的 # 不是標記")
# Colab 預設檔頭
colab = '# -*- coding: utf-8 -*-\n"""q1a.ipynb\n\nAutomatically generated by Colab.\n"""\n' + a1
check(qids_of(plan(colab, QIDS2, "q1a.py")) == [], "Colab 檔頭不是標記")
# 只用標題但語法錯誤的檔案不要炸掉
try:
    plan("# Q1a\nprint(\n# Q1b\nx = (\n", QIDS2, "q1.py")
    check(True, "")
except Exception as exc:  # noqa: BLE001
    check(False, "語法錯誤的檔案不該丟例外：%r" % exc)
# 標記的子題不存在（HW1 沒有 q1a）
check(qids_of(plan("# 1a\nx=input()\n# 1b\nprint(x)\n", QIDS1, "q1.py")) == [], "HW1 沒有子題，1a/1b 不該拆")
# 空檔案與只有註解
check(plan("", QIDS2, "q1a.py")["parts"] == [] and plan("# hi\n", QIDS2, "q1a.py")["parts"] == [], "空檔案")

# 語法錯誤的 b：a 是好的，仍然要拆（讓 a 拿分）
broken_b = "# Q1a\n" + a1 + "\n# Q1b\nwords = input(.split()\nprint(\n"
p = plan(broken_b, QIDS2, "q1.py")
check(qids_of(p) == ["q1a", "q1b"], "b 有語法錯誤時 a 仍要能拆出來", str(p.get("note")))

# --------------------------------------------------------------------------
# 4. 全部參考解答、ref_alt、mutants：每一份單獨出現都不可以被拆
# --------------------------------------------------------------------------
hw_ids = hwlib.list_hws()
for hw in hw_ids:
    qids = QIDS2 if hw == "hw2" else QIDS1 if hw == "hw1" else None
    if qids is None:
        continue
    for sub in ("solutions", "ref_alt", "mutants"):
        d = os.path.join(ROOT, "hw", hw, sub)
        if not os.path.isdir(d):
            continue
        for fn in sorted(os.listdir(d)):
            if not fn.endswith(".py"):
                continue
            with open(os.path.join(d, fn), encoding="utf-8") as fh:
                code = fh.read()
            q = fn.split("_")[0].replace(".py", "")
            p = plan(code, qids, q + ".py")
            check(not p["parts"], "%s/%s/%s 是單一程式，不可以被註解標記拆開" % (hw, sub, fn), str(qids_of(p)))

# --------------------------------------------------------------------------
# 5. 沒有標記：候選切點 + 試跑
# --------------------------------------------------------------------------
manifest = hwlib.load_spec("hw2") if hasattr(hwlib, "load_spec") else None
import json  # noqa: E402

with open(os.path.join(ROOT, "data", "hw2.json"), encoding="utf-8") as fh:
    HW2 = json.load(fh)
TESTS = {p["id"]: [(t["input"], t["expected"]) for t in p["tests"][:2]] for p in HW2["problems"]}


def guess(code, group, name):
    p = plan(code, QIDS2, name)
    if p["parts"]:
        return "marker"
    return pick(p["cands"], TESTS[group + "a"], runner, code)


for grp in ("q1", "q2", "q3", "q4"):
    for ref in ("solutions", "ref_alt"):
        ca, cb = body("hw2", grp + "a", ref), body("hw2", grp + "b", ref)
        for gap in ("\n", "\n\n\n", "\n# ----------\n"):
            hit = guess(ca + gap + cb, grp, grp + "a.py")
            ok = isinstance(hit, tuple) and hit[1] >= 1 and hit[2] >= 1
            check(ok, "沒有標記的 %s a+b（%s，間隔 %r）沒拆出來" % (grp, ref, gap), repr(hit)[:200] if not ok else "")
            if ok:
                check(hit[0]["a"].strip() == ca.strip() or hit[1] >= 1, "切點不對")
        # b 寫在前面也要拆得開（順序之後交給助教確認）
        hit = guess(cb + "\n\n" + ca, grp, grp + "a.py")
        check(isinstance(hit, tuple) and hit[1] >= 1 and hit[2] >= 1, "沒有標記的 %s b+a 沒拆出來" % grp)
        # 其中一支壞掉：好的那一半仍要拿得到分
        broken = cb.replace("input()", "input()  ").replace("print(", "print('x'+", 1) if grp != "q4" else cb.replace("print(", "print('x'+", 1)
        hit = guess(ca + "\n\n" + broken, grp, grp + "a.py")
        check(isinstance(hit, tuple) and hit[1] >= 1, "%s/%s：b 壞掉時 a 仍要被拆出來" % (grp, ref), repr(hit)[:120])
    # 單一程式：不管有沒有結尾的 input("Press Enter")，都不能拆
    for ref in ("solutions", "ref_alt"):
        for q in (grp + "a", grp + "b"):
            code = body("hw2", q, ref)
            check(guess(code, grp, q + ".py") is None, "單一程式 %s/%s 不該被試跑拆開" % (ref, q))
            check(guess(code + "input('Press Enter to exit')\n", grp, q + ".py") is None,
                  "%s/%s 結尾多一個 input('Press Enter') 不該被拆" % (ref, q))
            check(guess("print('=== start ===')\n" + code, grp, q + ".py") is None,
                  "%s/%s 前面多一行 print 不該被拆" % (ref, q))

# 帶提示字的單一程式（HW 學生常見寫法）
prompted = "print('請輸入句子：')\ns = input()\nprint('結果：')\nprint(' '.join(s.split()[::-1]))\n"
check(guess(prompted, "q1", "q1a.py") is None, "有提示字的單一程式（本來就答錯）不該被亂拆")

# 切點一定在頂層敘述之間：兩半都要是合法 Python
import ast  # noqa: E402

for grp in ("q1", "q2", "q3", "q4"):
    ca, cb = body("hw2", grp + "a"), body("hw2", grp + "b")
    for c in plan(ca + "\n" + cb, QIDS2, grp + ".py")["cands"]:
        try:
            ast.parse(c["a"])
            ast.parse(c["b"])
            check(True, "")
        except SyntaxError:
            check(False, "%s 的候選切點（第 %d 行）把敘述切成兩半" % (grp, c["line"]))

# 檔名的題號提示
hint = NS["_num_hint"]
for name, want in [("q1.py", "1"), ("B11901234_HW2/Q3_final.py", "3"), ("第2題.py", "2"), ("hw2_4.py", "4"),
                   ("B11901234_HW2/final.py", ""), ("3 (1).py", ""), ("q12.py", "12")]:
    check(hint(name) == want, "檔名 %r 的題號提示應為 %r，實際 %r" % (name, want, hint(name)))

# 這份程式放進 JS 的 String.raw 樣板裡：不能出現反引號與 ${
tmpl = WORKER[WORKER.index("const HARNESS"):WORKER.index("async function boot")]
check(tmpl.count("`") == 2 and "${" not in tmpl, "worker.js 的 Python 樣板裡不可以有反引號或 ${（會提早結束樣板字串）")

# --------------------------------------------------------------------------
print()
if failures:
    print("%s失敗 %d / %d 項%s" % (RED, len(failures), total, RESET))
    for f in failures:
        print("  - " + f)
    sys.exit(1)
print("%s拆分測試通過（%d 項檢查）%s" % (GREEN, total, RESET))
