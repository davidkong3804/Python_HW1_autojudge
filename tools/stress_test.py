#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批改程式的抗壓測試：把「同學真的會交出來的惡夢程式」灌進批改流程，
確認 (1) 不會把批改弄壞 (2) 該給的分要給、該扣的要扣。

執行：python3 tools/stress_test.py
（網頁版走同一套判定規則，改 assets/worker.js / app.js 後也請一起手動跑一次網頁）
"""

import os
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))

import grade_cli  # noqa: E402

GOOD = (
    "d = input().split()\n"
    "h = float(d[0]); w = float(d[1])\n"
    "print(format(w/(h*h), '.2f'))\n"
)

# (名稱, 檔案內容 bytes, 期望分數 or None=只要不要把批改弄壞就好, 說明)
CASES = [
    ("bom", ("﻿# 身高體重\n" + GOOD).encode("utf-8"), 15,
     "Windows 記事本存的 UTF-8 BOM"),
    ("utf16", ("# 中文註解\n" + GOOD).encode("utf-16"), 15,
     "記事本的「Unicode」= UTF-16"),
    ("big5", ("# 計算身高體重指數\n" + GOOD).encode("big5"), 15,
     "Big5 中文註解"),
    ("crlf", GOOD.replace("\n", "\r\n").rstrip("\r\n").encode(), 15,
     "CRLF 而且結尾沒有換行"),
    ("prompt", ("d = input('請輸入身高與體重：').split()\n"
                "h=float(d[0]); w=float(d[1])\n"
                "print(format(w/(h*h),'.2f'))\n").encode(), 15,
     "input() 有提示字（提示字不該被當成輸出）"),
    ("trailing_input", (GOOD + "input('按 Enter 結束')\n").encode(), 15,
     "印完答案又 input() 等按 Enter"),
    ("two_inputs", ("h = float(input())\nw = float(input())\n"
                    "print(format(w/(h*h),'.2f'))\n").encode(), 0,
     "把一行拆成兩次 input()（老師規定一行一次，要判錯）"),
    ("readall", ("import sys\nd = sys.stdin.read().split()\n"
                 "print(format(float(d[1])/(float(d[0])**2), '.2f'))\n").encode(), 15,
     "一次把 stdin 讀完"),
    ("sysexit", ("import sys\n" + GOOD + "sys.exit(0)\n").encode(), 15,
     "結尾 sys.exit()"),
    ("close_stdout", ("import sys\n" + GOOD + "sys.stdout.close()\n").encode(), 15,
     "把 sys.stdout 關掉"),
    ("dunder_file", ("print(__file__ and '', end='')\n" + GOOD).encode(), 15,
     "用到 __file__"),
    ("unicode", ("# 測試 🚀 全形　空白\n" + GOOD).encode("utf-8"), 15,
     "程式碼裡有 emoji / 全形空白"),
    ("writefile", (GOOD + "open('junk.txt','w').write('hi')\n").encode(), 15,
     "在工作目錄寫檔（不可以污染助教的資料夾）"),
    ("patch_builtins", ("import builtins\n_r = builtins.format\n"
                        "builtins.format = lambda *a, **k: 'X'\n"
                        "d = input().split()\n"
                        "print(_r(float(d[1])/(float(d[0])**2), '.2f'))\n").encode(), 15,
     "竄改 builtins（不可以污染後面的同學）"),
    ("infinite", "d = input()\nwhile True:\n    pass\n".encode(), 0,
     "無窮迴圈 -> 逾時"),
    ("printbomb", "d = input()\nwhile True:\n    print('x')\n".encode(), 0,
     "無窮 print -> 輸出上限"),
    ("memhog", "d = input()\nx = [0]*(10**9)\nprint(len(x))\n".encode(), 0,
     "吃記憶體 -> 記憶體上限"),
    ("recursion", "d = input()\ndef f(n):\n    return f(n+1)\nprint(f(0))\n".encode(), 0,
     "無窮遞迴"),
    ("numpy", ("import numpy as np\n" + GOOD).encode(), 0,
     "用第三方套件（批改環境只有標準函式庫）"),
    ("empty", b"", 0, "空檔案"),
    ("syntax", "print('unclosed\n".encode(), 0, "語法錯誤"),
]


# HW3 Q2（讀寫檔案）：每筆測資要在乾淨的資料夾裡跑，前一位同學留下的檔案不能影響下一位
Q2_REF = open(os.path.join(ROOT, "hw", "hw3", "solutions", "q2.py"), encoding="utf-8").read() \
    if os.path.isfile(os.path.join(ROOT, "hw", "hw3", "solutions", "q2.py")) else ""
CASES_IO = [
    ("io_good", Q2_REF, 25, "參考解答"),
    ("io_chdir", "import os\nos.chdir('..')\n" + Q2_REF, 0,
     "跑之前先 chdir 到上一層（檔案寫到別的地方，不能把批改弄壞）"),
    ("io_huge", Q2_REF + "\nopen('huge.txt', 'w').write('x' * 10**7)\n", 0,
     "多寫一個 10 MB 的檔案（只讀前面一段，不會把記憶體吃光）"),
    ("io_litter", "open('result_neg.txt','w').write('-19')\nopen('half_out.txt','w').write('3.5')\n"
                  "import os\nos.makedirs('sub', exist_ok=True)\nprint(input())\n", 0,
     "不算、直接把答案檔亂寫一通（後面的同學不可以撿到這些檔案）"),
    ("io_delete_input", Q2_REF.replace('        parts = fin.read().split()',
                                       '        parts = fin.read().split()\n    import os\n    os.remove(in_name)'), 25,
     "讀完把輸入檔刪掉（題目給的檔案不見了不算錯）"),
]


def stress_io(work):
    """HW3 Q2 的檔案讀寫：一批惡夢程式後面接一位正確的同學，他必須拿滿分。"""
    if not Q2_REF:
        return True
    base = os.path.join(work, "io_submissions")
    for name, code, _expect, _desc in CASES_IO + [("zzz_io_victim", Q2_REF, 25, "")]:
        d = os.path.join(base, name + "_HW3")
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "q2.py"), "w", encoding="utf-8") as fh:
            fh.write(code)
    out_csv = os.path.join(work, "io_scores.csv")
    proc = subprocess.run([sys.executable, os.path.join(ROOT, "tools", "grade_cli.py"), base,
                           "--hw", "hw3", "-o", out_csv, "--timeout", "5"], capture_output=True, text=True)
    if proc.returncode:
        print(proc.stdout, proc.stderr[-2000:])
        return False
    scores = {}
    with open(out_csv, encoding="utf-8-sig") as fh:
        next(fh)
        for line in fh:
            cols = line.rstrip("\n").split(",")
            scores[cols[0].lower()] = cols
    ok = True
    print("\nHW3 Q2 讀寫檔案")
    print("-" * 72)
    for name, _code, expect, desc in CASES_IO + [("zzz_io_victim", "", 25, "排在最後的正確解答（不能撿到前面留下的檔案）")]:
        row = scores.get(name.lower())
        got = float(row[2]) if row and row[2] else 0.0
        good = abs(got - expect) < 1e-9
        ok = ok and good
        print("%-16s %-6g %-6s %s %s" % (name, got, expect, desc, "" if good else "  <== 不符預期"))
    return ok


def main():
    work = tempfile.mkdtemp(prefix="autojudge_stress_")
    victim = None
    try:
        for name, data, _expect, _desc in CASES:
            d = os.path.join(work, "submissions", name + "_HW1")
            os.makedirs(d, exist_ok=True)
            with open(os.path.join(d, "q1.py"), "wb") as fh:
                fh.write(data)
        # 排在污染者後面的「無辜受害者」，分數必須不受影響
        victim = os.path.join(work, "submissions", "zzz_victim_HW1")
        os.makedirs(victim, exist_ok=True)
        shutil.copy(os.path.join(ROOT, "hw", "hw1", "solutions", "q1.py"), os.path.join(victim, "q1.py"))
        shutil.copy(os.path.join(ROOT, "hw", "hw1", "solutions", "q6.py"), os.path.join(victim, "q6.py"))

        out_csv = os.path.join(work, "scores.csv")
        cmd = [sys.executable, os.path.join(ROOT, "tools", "grade_cli.py"),
               os.path.join(work, "submissions"), "-o", out_csv, "--timeout", "5"]
        proc = subprocess.run(cmd, capture_output=True, text=True)
        print(proc.stdout)
        if proc.returncode:
            print(proc.stderr[-2000:])
            return 1

        scores = {}
        with open(out_csv, encoding="utf-8-sig") as fh:
            next(fh)
            for line in fh:
                cols = line.rstrip("\n").split(",")
                scores[cols[0].lower()] = cols

        ok = True
        print("%-16s %-6s %-6s %s" % ("程式", "得分", "期望", "測什麼"))
        print("-" * 72)
        for name, _data, expect, desc in CASES:
            row = scores.get(name.lower())
            got = float(row[1]) if row and row[1] else 0.0
            good = expect is None or abs(got - expect) < 1e-9
            ok = ok and good
            print("%-16s %-6g %-6s %s %s" % (name, got, expect, desc, "" if good else "  <== 不符預期"))

        vic = scores.get("zzz_victim")
        vic_q1 = float(vic[1]) if vic and vic[1] else 0.0
        vic_q6 = float(vic[6]) if vic and vic[6] else 0.0
        vic_ok = vic_q1 == 15 and vic_q6 == 20
        ok = ok and vic_ok
        print("-" * 72)
        print("被污染者測試：正確解答排在竄改 builtins 的人後面 -> Q1=%g Q6=%g %s"
              % (vic_q1, vic_q6, "OK" if vic_ok else "<== 被污染了！"))

        ok = stress_io(work) and ok
        print("\n" + ("全部通過：批改程式扛得住。" if ok else "有項目不符預期，請檢查上面標記的那幾行。"))
        return 0 if ok else 1
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
