#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
學號 / 題號辨識的回歸測試
-------------------------
批改前要先從路徑判斷「這個檔是誰的第幾題」。判錯學號的後果比判錯分數更糟：
成績會掛到別人頭上，而且同一個人的六個檔可能被拆成六位「學生」。

這支測試做兩件事：
  1. 固定案例表：每條路徑的學號與題號都必須等於預期值
  2. 交叉比對：assets/app.js（網頁版）與 tools/grade_cli.py（CLI 版）
     這兩份各自實作的辨識規則，對同一批路徑必須給出完全相同的答案

執行：python3 tools/test_detect.py
"""

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))

import grade_cli  # noqa: E402

RED, GREEN, YELLOW, RESET = "\033[31m", "\033[32m", "\033[33m", "\033[0m"

JS_START = "/* --8<-- detect:start"
JS_END = "/* --8<-- detect:end"

# (路徑, 預期學號, 預期題號, 這條在測什麼)
CASES = [
    (
        "b15a01308#_陳亮汝 (CHEN, LIANG-RU)_337379_10213134_B15A01308_HW1/B15A01308_HW1/q3.py.py",
        "B15A01308", "q3",
        "真實案例：學號中間夾字母，不可以被 COOL 的使用者編號 10213134 蓋過去",
    ),
    ("B11901234_HW1/q1.py", "B11901234", "q1", "公告的標準格式"),
    ("b11901234_hw1/q4.py", "B11901234", "q4", "小寫要正規化成大寫"),
    ("10213134_HW1/q2.py", "10213134", "q2", "純數字學號"),
    (
        "wang_123_456_B11901234_HW1.zip/B11901234_HW1/q6.py",
        "B11901234", "q6",
        "COOL 整包下載：外層 zip 檔名夾了名字與流水號",
    ),
    (
        "337379_10213134_B15A01308_HW1.zip/q1.py",
        "B15A01308", "q1",
        "同一層裡同時有流水號、COOL 編號與學號，公告格式的學號要贏",
    ),
    ("B15A01308_HW1/src/q2.py", "B15A01308", "q2", "學生多包了一層 src/"),
    ("B11901234_HW1_q5.py", "B11901234", "q5", "散裝檔，沒有資料夾"),
    ("B11901234_HW1/第3題.py", "B11901234", "q3", "檔名用中文寫題號"),
    ("B11901234_HW1/Q6.PY", "B11901234", "q6", "大寫副檔名與題號"),
    ("陳亮汝/q1.py", "陳亮汝", "q1", "完全沒有學號時退回資料夾名"),
    ("HW20241231/B11901234_HW1/q1.py", "B11901234", "q1", "外層資料夾長得像學號但其實是 HW 日期"),
    (
        "b11902345#_林佳蓉 (Lin, Chia-Jung)_339110_10214511_B11902345_HW1/"
        "B11902345_HW1/final_version.py",
        "B11902345", "",
        "認不出題號就要留空：不可以被路徑裡的 _HW1 誤判成 Q1 而默默掛到第一題",
    ),
    ("B11901234_HW1/hw1_3.py", "B11901234", "q3", "檔名寫 hw1_3 仍然要判成 Q3"),
    ("B11901234_HW1/q12.py", "B11901234", "", "HW1 沒有第 12 題：留空，不可以亂掛"),
    ("B11901234_HW1/2nd_try_q4.py", "B11901234", "q4", "檔名前面有別的數字，以 q4 為準"),
    ("B11901234_HW1/3 (1).py", "B11901234", "",
     "重新下載的「3 (1).py」有兩個數字：以前會判成 Q1 掛錯題，現在要留空讓助教指定"),
    ("B11901234_HW1/ex3_ver2.py", "B11901234", "", "ex3_ver2 有兩個數字，不猜"),
    ("B11901234_HW1/q3 (1).py", "B11901234", "q3", "有寫 q3 就以 q3 為準，後面的 (1) 不影響"),
    ("B11901234_HW1/3_3.py", "B11901234", "q3", "兩個數字一樣就不算有歧義"),
]

# HW2 有子題：q1a、q1b … q4b、q5、q6
CASES_HW2 = [
    ("B11901234_HW2/q1a.py", "B11901234", "q1a", "公告格式的子題"),
    ("B11901234_HW2/Q1B.py", "B11901234", "q1b", "大寫子題"),
    ("B11901234_HW2/q2_a.py", "B11901234", "q2a", "題號和子題中間有底線"),
    ("B11901234_HW2/Q3(b).py", "B11901234", "q3b", "子題寫在括號裡"),
    ("B11901234_HW2/4b.py", "B11901234", "q4b", "只寫數字 + 子題"),
    ("B11901234_HW2/hw2_2b.py", "B11901234", "q2b", "hw2_2b：拿掉作業編號後是 2b"),
    ("B11901234_HW2/第1題a.py", "B11901234", "q1a", "中文題號 + 子題"),
    ("B11901234_HW2/第1題\u3000a.py", "B11901234", "q1a", "全形空白：網頁版與命令列版要一致"),
    ("B11901234_HW2/q5.py", "B11901234", "q5", "沒有子題的題目照舊"),
    ("B11901234_HW2/q1.py", "B11901234", "",
     "有子題的題目只寫 q1：分不出 a 還是 b，必須留空讓助教指定，不可以猜"),
    ("B11901234_HW2/q1_final.py", "B11901234", "", "q1_final 的 f 不是子題，而且 q1 本身有子題 -> 留空"),
    ("B11901234_HW2/q6_date.py", "B11901234", "q6", "q6_date 的 d 不是子題"),
    ("wang_98765_43210_B11901234_HW2.zip/B11901234_HW2/q4a.py", "B11901234", "q4a", "COOL 加料檔名"),
]

QIDS = {
    "hw1": ["q1", "q2", "q3", "q4", "q5", "q6"],
    "hw2": ["q1a", "q1b", "q2a", "q2b", "q3a", "q3b", "q4a", "q4b", "q5", "q6"],
}

ALL = [("hw1",) + c for c in CASES] + [("hw2",) + c for c in CASES_HW2]


def qid_for(path, hw):
    """和 grade_cli.py / app.js 的呼叫方式一致：先看檔名，再看整條路徑。"""
    base = os.path.splitext(os.path.basename(path))[0]
    qids = QIDS[hw]
    return grade_cli.detect_qid(base, qids) or grade_cli.detect_qid(path, qids)


def js_results(items):
    """把 app.js 的辨識段落抓出來，用 node 跑一遍。node 不在就回傳 None。"""
    node = shutil.which("node") or shutil.which("nodejs")
    if not node:
        return None
    with open(os.path.join(ROOT, "assets", "app.js"), encoding="utf-8") as fh:
        src = fh.read()
    a, b = src.find(JS_START), src.find(JS_END)
    if a < 0 or b < 0:
        raise RuntimeError("assets/app.js 裡找不到 detect:start / detect:end 標記")
    block = src[src.index("\n", a) + 1:b]

    harness = block + """
var items = JSON.parse(process.argv[2]);
console.log(JSON.stringify(items.map(function (it) {
  var p = it[0], qids = it[1];
  var base = p.split('/').pop().replace(/\\.[^.]*$/, '');
  return { student: detectStudent(p), qid: detectQid(base, qids) || detectQid(p, qids) };
})));
"""
    tmp = tempfile.mkdtemp(prefix="autojudge_detect_")
    try:
        js = os.path.join(tmp, "detect.js")
        with open(js, "w", encoding="utf-8") as fh:
            fh.write(harness)
        proc = subprocess.run([node, js, json.dumps(items)],
                              capture_output=True, text=True, timeout=60)
        if proc.returncode != 0:
            raise RuntimeError("node 執行失敗：%s" % proc.stderr.strip())
        return json.loads(proc.stdout)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


# (實際輸出, 預期輸出, 應該算「答案對但格式不符」嗎, 說明)
ANSWER_CASES = [
    ("BMI = 55.56", "55.56", True, "多印了 BMI = 標籤"),
    ("BMI: 55.56\n", "55.56", True, "冒號標籤"),
    ("BMI：55.56", "55.56", True, "全形冒號"),
    ("請輸入身高與體重：\n55.56", "55.56", True, "多印一行提示字"),
    ("The password is Weak.", "Weak", True, "is + 句點"),
    ("答案是 3,4,5", "3,4,5", True, "中文標籤"),
    ("Not Prime,Odd", "Prime,Odd", False, "Not Prime 不是 Prime 的格式問題：答案其實錯了"),
    ("BMI = 55.57", "55.56", False, "數字不一樣就是錯"),
    ("BMI = 155.56", "55.56", False, "前面黏著數字不算"),
    ("55.56 kg/m2", "55.56", False, "後面多了單位：保守起見不算"),
    ("55.55\nBMI = 55.56", "55.56", False, "多印的行有數字（可能是別的答案）"),
    ("Weak\nModerate\nStrong", "Weak", False, "三種答案全印出來：絕對不能算答對"),
    ("Prime,Odd\nNot Prime,Odd", "Not Prime,Odd", False, "迴圈寫錯先印了另一個答案"),
    ("10 = 5", "5", False, "標籤裡有數字（10 = 5 不是印出 5）"),
    ("Enter a number:\n5", "5", True, "英文提示字一行"),
    ("請輸入身高與體重\n55.56", "55.56", False, "多印的行不像提示字（沒有冒號）：保守起見不算"),
    ("BMI = -7.00", "7.00", False, "負號不是標籤"),
    ("weak", "Weak", False, "大小寫不同（嚴格模式）"),
    ("x = 1\ny = 2", "1\n2", True, "多行答案各自帶標籤"),
    ("", "0", False, "沒有輸出"),
]

FEATURE_CASES = [
    ("for i in range(3):\n    print(i)\n", ["for"]),
    ("i = 0\nwhile i < 3:\n    i += 1\n", ["while"]),
    ("print(' '.join(input().split()[::-1]))\n", ["slice"]),
    ("s = [x for x in range(3)]\n", ["comp"]),
    ("def f(a):\n    return set(a)\n", ["def", "set"]),
    ("s = {1, 2}\n", ["set"]),
    ("from datetime import datetime\nimport os.path\n", ["import:datetime", "import:os"]),
    ("print('unclosed\n", None),
]


def check_answers():
    """答案對但格式不符的判定：Python 版與 app.js 版都要給出預期結果。"""
    bad = []
    for actual, expected, want, note in ANSWER_CASES:
        got = grade_cli.answer_inside(actual, expected)
        if got != want:
            bad.append("格式判定（%s）：預期 %s，grade_cli 給 %s" % (note, want, got))
    node = shutil.which("node") or shutil.which("nodejs")
    if node:
        with open(os.path.join(ROOT, "assets", "app.js"), encoding="utf-8") as fh:
            src = fh.read()
        a, b = src.find("/* --8<-- answer:start"), src.find("/* --8<-- answer:end")
        block = src[src.index("\n", a) + 1:b]
        harness = block + """
var cases = JSON.parse(process.argv[2]);
console.log(JSON.stringify(cases.map(function (c) { return answerInside(c[0], c[1], 'strict'); })));
"""
        tmp = tempfile.mkdtemp(prefix="autojudge_ans_")
        try:
            js = os.path.join(tmp, "ans.js")
            with open(js, "w", encoding="utf-8") as fh:
                fh.write(harness)
            proc = subprocess.run([node, js, json.dumps([[c[0], c[1]] for c in ANSWER_CASES])],
                                  capture_output=True, text=True, timeout=60)
            if proc.returncode != 0:
                bad.append("node 執行失敗：%s" % proc.stderr.strip())
            else:
                for (actual, expected, want, note), got in zip(ANSWER_CASES, json.loads(proc.stdout)):
                    if got != want:
                        bad.append("格式判定（%s）：預期 %s，app.js 給 %s" % (note, want, got))
        finally:
            shutil.rmtree(tmp, ignore_errors=True)
    print("  %s格式不符判定：%d 個案例%s" % (GREEN if not bad else RED, len(ANSWER_CASES),
                                       "，網頁版與命令列版一致" + RESET if not bad else "有錯" + RESET))
    return bad


def check_features():
    """寫法分析：grade_cli 從 worker.js 抓同一段 Python 來跑，這裡確認抓得到、結果正確。"""
    bad = []
    for code, want in FEATURE_CASES:
        got = grade_cli.code_features(code)
        if got != want:
            bad.append("寫法分析 %r：預期 %s，實際 %s" % (code, want, got))
    checks = [
        (["loop"], ["slice"], ["沒有用到迴圈"]),
        (["slice", "no-loop"], ["slice", "for"], ["用了迴圈（這題規定不能用）"]),
        (["while", "def"], ["for", "def"], ["沒有用到 while 迴圈"]),
        (["import:datetime"], [], ["沒有 import datetime"]),
        (["loop"], None, []),
    ]
    for chk, feats, want in checks:
        got = grade_cli.check_violations(chk, feats)
        if got != want:
            bad.append("寫法要求 %s + %s：預期 %s，實際 %s" % (chk, feats, want, got))
    print("  %s寫法分析：%d 個案例%s" % (GREEN if not bad else RED,
                                     len(FEATURE_CASES) + len(checks),
                                     "全部正確" + RESET if not bad else "有錯" + RESET))
    return bad


def main():
    failures = []
    print("=" * 72)
    print("學號 / 題號辨識")
    print("=" * 72)

    for hw, path, want_id, want_qid, note in ALL:
        got_id, got_qid = grade_cli.detect_student(path), qid_for(path, hw)
        ok = got_id == want_id and got_qid == want_qid
        print("  %s %s %-10s %-4s %s" %
              (GREEN + "OK  " + RESET if ok else RED + "FAIL" + RESET, hw, got_id, got_qid, note))
        if not ok:
            failures.append("%s\n       預期 %s / %s，實際 %s / %s"
                            % (path, want_id, want_qid, got_id, got_qid))

    print()
    js = js_results([[c[1], QIDS[c[0]]] for c in ALL])
    if js is None:
        print("  %s找不到 node，略過 app.js 的交叉比對%s" % (YELLOW, RESET))
    else:
        mismatch = 0
        for (hw, path, want_id, want_qid, _note), r in zip(ALL, js):
            py = (grade_cli.detect_student(path), qid_for(path, hw))
            if (r["student"], r["qid"]) != py:
                mismatch += 1
                failures.append("app.js 與 grade_cli.py 不一致：%s\n       app.js %s / %s，"
                                "grade_cli.py %s / %s"
                                % (path, r["student"], r["qid"], py[0], py[1]))
            elif (r["student"], r["qid"]) != (want_id, want_qid):
                mismatch += 1  # 已經在上面記過，這裡只計數
        if mismatch == 0:
            print("  %s交叉比對：app.js 與 grade_cli.py 對 %d 條路徑的判斷完全一致%s"
                  % (GREEN, len(ALL), RESET))

    print()
    failures.extend(check_features())
    failures.extend(check_answers())
    print()
    print("=" * 72)
    if failures:
        print("%s共 %d 項不符：%s" % (RED, len(failures), RESET))
        for f in failures:
            print("  - %s" % f)
        sys.exit(1)
    print("%s全部通過：學號與題號都判對，兩份實作也一致。%s" % (GREEN, RESET))


if __name__ == "__main__":
    main()
