#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HW1 命令列批改（網頁版的離線備援；行為與網頁完全一致）

用法：
    python3 tools/grade_cli.py 繳交資料夾/            # 裡面放一堆 學號_HW1.zip
    python3 tools/grade_cli.py B11901234_HW1.zip ...  # 直接指定
    python3 tools/grade_cli.py 繳交資料夾/ -o 成績.csv --timeout 8

輸出：終端機表格 + CSV（UTF-8 with BOM，Excel 直接開）
"""

import argparse
import csv
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ID_RE = re.compile(r"[A-Za-z]\d{7,10}|\d{8,10}")
QID_RE = re.compile(r"(?:^|[^a-z0-9])q\s*([1-6])(?![0-9])", re.I)


def load_manifest():
    with open(os.path.join(ROOT, "data", "tests.json"), encoding="utf-8") as fh:
        return json.load(fh)


def normalize(text, mode="strict"):
    lines = [l.rstrip(" \t") for l in str(text).replace("\r\n", "\n").replace("\r", "\n").split("\n")]
    while lines and lines[-1] == "":
        lines.pop()
    if mode == "trim":
        lines = [l.strip() for l in lines]
    if mode == "loose":
        return re.sub(r"\s+", "", "\n".join(lines)).lower()
    return "\n".join(lines)


def detect_qid(name):
    m = QID_RE.search(name)
    if m:
        return "q" + m.group(1)
    m = re.search(r"第\s*([1-6])\s*題", name)
    if m:
        return "q" + m.group(1)
    stripped = re.sub(r"[A-Za-z]?\d{6,12}", "_", name)
    hits = re.findall(r"(?:^|[^0-9])([1-6])(?![0-9])", stripped)
    return "q" + hits[-1] if hits else ""


def detect_student(relpath):
    parts = [p for p in relpath.replace("\\", "/").split("/") if p]
    base = os.path.splitext(parts.pop())[0] if parts else ""
    for seg in reversed(parts):
        hit = ID_RE.search(re.sub(r"\.zip$", "", seg, flags=re.I))
        if hit:
            return hit.group(0).upper()
    for seg in reversed(parts):
        seg = re.sub(r"[_\-\s]*HW\s*\d+$", "", re.sub(r"\.zip$", "", seg, flags=re.I), flags=re.I).strip()
        if seg and not re.fullmatch(r"(src|code|python|作業|homework|hw\s*\d*)", seg, flags=re.I):
            return seg
    hit = ID_RE.search(base)
    return hit.group(0).upper() if hit else (base or "未知")


def collect(paths, workdir):
    """把 zip 解開（含巢狀 zip），回傳 [(顯示路徑, 程式碼)]"""
    found = []

    def take_file(disp, real):
        try:
            with open(real, encoding="utf-8", errors="replace") as fh:
                found.append((disp, fh.read()))
        except OSError as exc:
            print("讀取失敗 %s：%s" % (disp, exc), file=sys.stderr)

    def expand_zip(zpath, disp_prefix, depth=1):
        out = os.path.join(workdir, "z%d_%s" % (depth, re.sub(r"\W+", "_", os.path.basename(zpath))))
        os.makedirs(out, exist_ok=True)
        try:
            with zipfile.ZipFile(zpath) as zf:
                zf.extractall(out)
        except zipfile.BadZipFile:
            print("不是合法的 zip：%s" % zpath, file=sys.stderr)
            return
        walk(out, disp_prefix, depth)

    def walk(base, disp_prefix, depth=1):
        for dirpath, dirnames, filenames in os.walk(base):
            dirnames[:] = [d for d in dirnames if d != "__MACOSX" and not d.startswith(".")]
            for fn in sorted(filenames):
                if fn.startswith("."):
                    continue
                full = os.path.join(dirpath, fn)
                rel = os.path.relpath(full, base).replace("\\", "/")
                if fn.lower().endswith(".py"):
                    take_file(disp_prefix + rel, full)
                elif fn.lower().endswith(".zip") and depth < 3:
                    expand_zip(full, disp_prefix + re.sub(r"\.zip$", "", rel, flags=re.I) + "/", depth + 1)

    for p in paths:
        if os.path.isdir(p):
            walk(p, os.path.basename(os.path.normpath(p)) + "/")
        elif p.lower().endswith(".zip"):
            expand_zip(p, re.sub(r"\.zip$", "", os.path.basename(p), flags=re.I) + "/")
        elif p.lower().endswith(".py"):
            take_file(os.path.basename(p), p)
    return found


def run_one(code, stdin_text, timeout):
    with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False, encoding="utf-8") as fh:
        fh.write(code)
        path = fh.name
    try:
        proc = subprocess.run([sys.executable, path], input=stdin_text, capture_output=True,
                              text=True, timeout=timeout)
        return proc.stdout, proc.stderr, ("re" if proc.returncode else "ok")
    except subprocess.TimeoutExpired:
        return "", "執行逾時", "tle"
    except Exception as exc:                                   # noqa: BLE001
        return "", str(exc), "re"
    finally:
        os.unlink(path)


def main():
    ap = argparse.ArgumentParser(description="HW1 命令列自動批改")
    ap.add_argument("paths", nargs="+", help="繳交的 zip / 資料夾 / .py")
    ap.add_argument("-o", "--out", default="hw1_成績.csv")
    ap.add_argument("--timeout", type=float, default=8)
    ap.add_argument("--mode", choices=["strict", "trim", "loose"], default="strict")
    ap.add_argument("--detail", default="", help="另外輸出逐筆明細 JSON")
    args = ap.parse_args()

    manifest = load_manifest()
    problems = {p["id"]: p for p in manifest["problems"]}
    qids = [p["id"] for p in manifest["problems"]]
    total_points = sum(p["points"] for p in manifest["problems"])

    workdir = tempfile.mkdtemp(prefix="hw1grade_")
    try:
        files = collect(args.paths, workdir)
        if not files:
            print("找不到任何 .py 檔。")
            return 1

        scores, detail = {}, {}
        for disp, code in files:
            qid = detect_qid(os.path.splitext(os.path.basename(disp))[0]) or detect_qid(disp)
            if qid not in problems:
                print("略過（認不出題號）：%s" % disp)
                continue
            student = detect_student(disp)
            prob = problems[qid]
            rec = {"score": 0.0, "passed": 0, "cases": [], "file": disp}
            for t in prob["tests"]:
                out, err, st = run_one(code, t["input"] + "\n", args.timeout)
                if st == "ok":
                    st = "ac" if normalize(out, args.mode) == normalize(t["expected"], args.mode) else "wa"
                if st == "ac":
                    rec["passed"] += 1
                    rec["score"] += prob["pointsPerTest"]
                rec["cases"].append({"n": t["n"], "status": st, "input": t["input"],
                                     "expected": t["expected"], "actual": out.rstrip("\n"),
                                     "stderr": err[-800:]})
            rec["score"] = round(rec["score"], 2)
            prev = scores.setdefault(student, {}).get(qid)
            if prev is None or rec["score"] > prev["score"]:
                scores[student][qid] = rec
            detail.setdefault(student, {})[qid] = scores[student][qid]

        width = max([len(s) for s in scores] + [6])
        header = "學號".ljust(width) + "".join(q.upper().rjust(8) for q in qids) + "總分".rjust(9)
        print("\n" + header)
        print("-" * len(header))
        rows = []
        for student in sorted(scores):
            line, total, row = student.ljust(width), 0.0, [student]
            for q in qids:
                rec = scores[student].get(q)
                line += (("%g" % rec["score"]) if rec else "-").rjust(8)
                row.append(rec["score"] if rec else "")
                total += rec["score"] if rec else 0
            total = round(total, 2)
            print(line + ("%g" % total).rjust(9))
            row.append(total)
            for q in qids:
                rec = scores[student].get(q)
                row.append("%d/%d" % (rec["passed"], len(rec["cases"])) if rec else "未繳交")
            rows.append(row)

        head = ["學號"] + ["%s(%d)" % (q.upper(), problems[q]["points"]) for q in qids] + \
               ["總分"] + ["%s通過筆數" % q.upper() for q in qids]
        with io.open(args.out, "w", encoding="utf-8-sig", newline="") as fh:
            w = csv.writer(fh)
            w.writerow(head)
            w.writerows(rows)
        print("\n共 %d 位學生，滿分 %d。成績已寫入 %s" % (len(scores), total_points, args.out))

        if args.detail:
            with open(args.detail, "w", encoding="utf-8") as fh:
                json.dump(detail, fh, ensure_ascii=False, indent=1)
            print("逐筆明細：%s" % args.detail)
        return 0
    finally:
        shutil.rmtree(workdir, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
