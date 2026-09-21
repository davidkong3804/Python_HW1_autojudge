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
]


def qid_for(path):
    """和 grade_cli.py / app.js 的呼叫方式一致：先看檔名，再看整條路徑。"""
    base = os.path.splitext(os.path.basename(path))[0]
    return grade_cli.detect_qid(base) or grade_cli.detect_qid(path)


def js_results(paths):
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
var paths = JSON.parse(process.argv[2]);
console.log(JSON.stringify(paths.map(function (p) {
  var base = p.split('/').pop().replace(/\\.[^.]*$/, '');
  return { student: detectStudent(p), qid: detectQid(base) || detectQid(p) };
})));
"""
    tmp = tempfile.mkdtemp(prefix="hw1_detect_")
    try:
        js = os.path.join(tmp, "detect.js")
        with open(js, "w", encoding="utf-8") as fh:
            fh.write(harness)
        proc = subprocess.run([node, js, json.dumps(paths)],
                              capture_output=True, text=True, timeout=60)
        if proc.returncode != 0:
            raise RuntimeError("node 執行失敗：%s" % proc.stderr.strip())
        return json.loads(proc.stdout)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def main():
    failures = []
    print("=" * 72)
    print("學號 / 題號辨識")
    print("=" * 72)

    for path, want_id, want_qid, note in CASES:
        got_id, got_qid = grade_cli.detect_student(path), qid_for(path)
        ok = got_id == want_id and got_qid == want_qid
        print("  %s %-10s %-4s %s" %
              (GREEN + "OK  " + RESET if ok else RED + "FAIL" + RESET, got_id, got_qid, note))
        if not ok:
            failures.append("%s\n       預期 %s / %s，實際 %s / %s"
                            % (path, want_id, want_qid, got_id, got_qid))

    print()
    js = js_results([c[0] for c in CASES])
    if js is None:
        print("  %s找不到 node，略過 app.js 的交叉比對%s" % (YELLOW, RESET))
    else:
        mismatch = 0
        for (path, want_id, want_qid, _note), r in zip(CASES, js):
            py = (grade_cli.detect_student(path), qid_for(path))
            if (r["student"], r["qid"]) != py:
                mismatch += 1
                failures.append("app.js 與 grade_cli.py 不一致：%s\n       app.js %s / %s，"
                                "grade_cli.py %s / %s"
                                % (path, r["student"], r["qid"], py[0], py[1]))
            elif (r["student"], r["qid"]) != (want_id, want_qid):
                mismatch += 1  # 已經在上面記過，這裡只計數
        if mismatch == 0:
            print("  %s交叉比對：app.js 與 grade_cli.py 對 %d 條路徑的判斷完全一致%s"
                  % (GREEN, len(CASES), RESET))

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
