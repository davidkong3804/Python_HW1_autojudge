#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
測資驗證器（所有作業共用）
--------------------------
五道防線，全部通過才算測資可用：

  1. 參考解答 hw/<id>/solutions/<題號>.py 跑過全部測資 -> 必須滿分
  2. 另一位「助教」寫的獨立實作 hw/<id>/ref_alt/       -> 必須滿分
  3. 用 spec.py 的 INDEPENDENT（不重用任何一份解答的程式碼）重算答案
  4. mutation testing：mutants/ 裡每一支故意寫錯的程式，
     都必須至少被一組測資抓到（有漏洞的程式不能拿滿分）
  5. 隨機對拍：大量隨機輸入下，兩份實作的輸出必須完全一致

執行：python3 tools/verify_tests.py [--hw hw2]
"""

import argparse
import os
import random
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hwlib  # noqa: E402

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


def verify_hw(hw_id):
    manifest = hwlib.load_manifest(hw_id)
    spec = hwlib.load_spec(hw_id)
    SOL = hwlib.hw_path(hw_id, "solutions")
    ALT = hwlib.hw_path(hw_id, "ref_alt")
    MUT = hwlib.hw_path(hw_id, "mutants")
    INDEPENDENT = getattr(spec, "INDEPENDENT", {})
    random_inputs = getattr(spec, "random_inputs", None)
    rng = random.Random(1234567)
    print("=" * 72)
    print("%s 測資驗證" % manifest["title"])
    print("=" * 72)

    for prob in manifest["problems"]:
        qid = prob["id"]
        tests = prob["tests"]
        print("\n[%s] %s  (%g 分 / %d 組測資)" % (qid, prob["name"], prob["points"], len(tests)))

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
                failures.append("%s %s %s 未通過：%s" % (hw_id, qid, label, bad))

        # --- 3：純數學重算 ---
        bad = []
        if qid not in INDEPENDENT:
            failures.append("%s %s 沒有提供 INDEPENDENT 純數學重算" % (hw_id, qid))
        for t in (tests if qid in INDEPENDENT else []):
            calc = INDEPENDENT[qid](t["input"])
            if calc != t["expected"]:
                bad.append((t["n"], t["input"], calc, t["expected"]))
        print("   2) 純數學重算：%s" % ("%s一致%s" % (GREEN, RESET) if not bad
                                        else "%s不一致 %s%s" % (RED, bad, RESET)))
        if bad:
            failures.append("%s %s 數學重算不一致：%s" % (hw_id, qid, bad))

        # --- 4：mutation testing ---
        mutants = sorted(f for f in os.listdir(MUT) if f.startswith(qid + "_")) \
            if os.path.isdir(MUT) else []
        if not mutants:
            failures.append("%s %s 沒有任何漏洞程式（mutants/%s_*.py），無法確認測資有鑑別度"
                            % (hw_id, qid, qid))
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
                failures.append("%s %s 的漏洞程式 %s 竟然拿到滿分" % (hw_id, qid, m))

        # --- 5：隨機對拍 ---
        mism = []
        for line in (random_inputs(qid, rng) if random_inputs else []):
            a, ea = run(os.path.join(SOL, qid + ".py"), line + "\n")
            b, eb = run(os.path.join(ALT, qid + ".py"), line + "\n")
            if (a, ea) != (b, eb):
                mism.append((line, a or ea, b or eb))
            if len(mism) >= 3:
                break
        print("   4) 隨機對拍 300 筆：%s" % ("%s兩份實作完全一致%s" % (GREEN, RESET) if not mism
                                            else "%s有差異 %s%s" % (YELLOW, mism, RESET)))
        if mism:
            failures.append("%s %s 隨機對拍有差異：%s" % (hw_id, qid, mism))


def main():
    ap = argparse.ArgumentParser(description="驗證測資")
    ap.add_argument("--hw", default="all", help="hw1 / hw2 / all（預設全部）")
    args = ap.parse_args()
    for hw_id in hwlib.resolve_hws(args.hw):
        verify_hw(hw_id)
        print()

    print("=" * 72)
    if failures:
        print(RED + "驗證失敗：" + RESET)
        for f in failures:
            print("  - " + f)
        sys.exit(1)
    print(GREEN + "全部通過：測資正確，且每一支有漏洞的程式都拿不到滿分。" + RESET)


if __name__ == "__main__":
    main()
