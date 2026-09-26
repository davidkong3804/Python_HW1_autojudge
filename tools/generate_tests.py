#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
測資產生器（所有作業共用）
--------------------------
* 讀 hw/<id>/spec.py 的 PROBLEMS，每題（子題）通常 5 組手工挑選的特殊測資
* 不使用作業 PDF 上的範例：那些學生手上就有，拿來當測資沒有鑑別度
* 預期輸出一律由 hw/<id>/solutions/<題號>.py「實際執行」產生，避免手寫答案打錯
* 產生：
    hw/<id>/tests/<題號>/NN.in|.out、hw/<id>/tests/README.md   給人看 / 釋出用
    data/<id>.json                                              命令列批改用
    data/assignments.js                                         網頁用（所有作業打包成一份）

挑選原則：mutants/ 裡每一支錯誤程式都必須至少被一組測資抓到
（由 tools/verify_tests.py 的第四道防線把關）。

執行：
    python3 tools/generate_tests.py            # 全部作業
    python3 tools/generate_tests.py --hw hw2   # 只重產某一份（網頁打包仍會包含全部）
"""

import argparse
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hwlib  # noqa: E402


def run_solution(hw_id, qid, stdin_text):
    proc = subprocess.run(
        [sys.executable, hwlib.hw_path(hw_id, "solutions", qid + ".py")],
        input=stdin_text, capture_output=True, text=True, timeout=30,
    )
    if proc.returncode != 0:
        raise RuntimeError("%s %s 參考解答執行失敗：%s" % (hw_id, qid, proc.stderr))
    return proc.stdout.rstrip("\n")


def drop_stale_files(qdir, keep):
    """刪掉上一版留下來、編號超過 keep 的測資檔（例如 10 組縮成 5 組時的 06~10）。"""
    for fn in sorted(os.listdir(qdir)):
        m = re.match(r"^(\d+)\.(in|out)$", fn)
        if m and int(m.group(1)) > keep:
            os.remove(os.path.join(qdir, fn))


def build_manifest(hw_id):
    spec = hwlib.load_spec(hw_id)
    meta = dict(spec.META)
    manifest = {
        "id": hw_id,
        "title": meta.get("title", hw_id.upper()),
        "subtitle": meta.get("subtitle", ""),
        "submission": meta.get("submission", ""),
        "grading": meta.get("grading", ""),
        "problems": [],
    }
    sanity = getattr(spec, "sanity", None)

    for prob in spec.PROBLEMS:
        qid = prob["id"]
        cases = prob["build"]()
        assert cases, "%s %s 沒有任何測資" % (hw_id, qid)
        qdir = hwlib.hw_path(hw_id, "tests", qid)
        os.makedirs(qdir, exist_ok=True)
        drop_stale_files(qdir, len(cases))
        tests = []
        for idx, (stdin_text, note) in enumerate(cases, start=1):
            expected = run_solution(hw_id, qid, stdin_text + "\n")
            if sanity is not None:
                assert sanity(qid, expected), "%s %s #%d 預期輸出沒通過 sanity 檢查：%s" % (
                    hw_id, qid, idx, expected)
            with open(os.path.join(qdir, "%02d.in" % idx), "w", encoding="utf-8") as fh:
                fh.write(stdin_text + "\n")
            with open(os.path.join(qdir, "%02d.out" % idx), "w", encoding="utf-8") as fh:
                fh.write(expected + "\n")
            tests.append({"n": idx, "input": stdin_text, "expected": expected,
                          "note": note, "kind": "special"})
        points = prob["points"]
        manifest["problems"].append({
            "id": qid,
            "name": prob["name"],
            "group": prob.get("group", qid),
            "points": points,
            "pointsPerTest": round(points / float(len(tests)), 4),
            "checks": list(prob.get("checks", [])),
            "requirement": prob.get("requirement", ""),
            "keywords": prob.get("keywords", ""),
            "tests": tests,
        })
    return manifest


def read_sources(folder, predicate=lambda fn: fn.endswith(".py")):
    out = {}
    if not os.path.isdir(folder):
        return out
    for fn in sorted(os.listdir(folder)):
        if predicate(fn):
            with open(os.path.join(folder, fn), encoding="utf-8") as fh:
                out[fn] = fh.read()
    return out


def write_readme(hw_id, manifest):
    lines = ["# %s 測資一覽" % manifest["title"], "",
             "> 由 `tools/generate_tests.py` 自動產生；預期輸出是實際執行 "
             "`hw/%s/solutions/<題號>.py` 得到的結果。" % hw_id, "",
             "> 測資一律不採用作業 PDF 上的範例（學生手上已經有），"
             "全部是針對常見錯誤挑選的特殊測資。", ""]
    for prob in manifest["problems"]:
        lines.append("## %s %s（%g 分，每組 %g 分）" %
                     (prob["id"].upper(), prob["name"], prob["points"], prob["pointsPerTest"]))
        if prob.get("requirement"):
            lines.append("")
            lines.append("寫法要求：%s（批改時只提示，不自動扣分）" % prob["requirement"])
        lines.append("")
        lines.append("| # | 輸入 | 正確輸出 | 這組在測什麼 |")
        lines.append("|---|---|---|---|")
        for t in prob["tests"]:
            shown_in = t["input"].replace("\n", "<br>")
            shown_out = t["expected"].replace("\n", "<br>")
            lines.append("| %d | `%s` | `%s` | %s |" % (t["n"], shown_in, shown_out, t["note"]))
        lines.append("")
    with open(hwlib.hw_path(hw_id, "tests", "README.md"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines))


def main():
    ap = argparse.ArgumentParser(description="產生測資")
    ap.add_argument("--hw", default="all", help="hw1 / hw2 / all（預設全部）")
    args = ap.parse_args()

    os.makedirs(hwlib.DATA_DIR, exist_ok=True)
    for hw_id in hwlib.resolve_hws(args.hw):
        manifest = build_manifest(hw_id)
        with open(hwlib.manifest_path(hw_id), "w", encoding="utf-8") as fh:
            json.dump(manifest, fh, ensure_ascii=False, indent=1)
            fh.write("\n")
        write_readme(hw_id, manifest)
        total = sum(p["points"] for p in manifest["problems"])
        n = sum(len(p["tests"]) for p in manifest["problems"])
        print("%s：%d 題、%d 組測資，總分 %g" % (hw_id, len(manifest["problems"]), n, total))

    # 網頁用：所有作業（含參考解答與漏洞程式）打包成一份，切換作業不用重新載入頁面
    bundle = []
    for hw_id in hwlib.list_hws():
        entry = hwlib.load_manifest(hw_id)
        sols = read_sources(hwlib.hw_path(hw_id, "solutions"))
        entry["solutions"] = {fn[:-3]: code for fn, code in sols.items()}
        entry["mutants"] = read_sources(hwlib.hw_path(hw_id, "mutants"))
        bundle.append(entry)
    with open(os.path.join(hwlib.DATA_DIR, "assignments.js"), "w", encoding="utf-8") as fh:
        fh.write("// 由 tools/generate_tests.py 自動產生，請勿手動修改\n")
        fh.write("window.AUTOJUDGE_ASSIGNMENTS = ")
        json.dump(bundle, fh, ensure_ascii=False, indent=1)
        fh.write(";\n")
    print("data/assignments.js：%s" % "、".join(e["id"] for e in bundle))


if __name__ == "__main__":
    main()
