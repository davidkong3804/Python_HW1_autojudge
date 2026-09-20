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
import signal
import subprocess
import sys
import tempfile
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QID_RE = re.compile(r"(?:^|[^a-z0-9])q\s*([1-6])(?![0-9])", re.I)


def decode_source(raw):
    """學生的 .py 可能是 UTF-8 BOM / UTF-16 / Big5（Windows 記事本）。
    直接當 UTF-8 讀會變亂碼或夾帶 NUL，compile 失敗就變成無辜的 0 分。"""
    if raw[:2] in (b"\xff\xfe", b"\xfe\xff"):
        text = raw.decode("utf-16", errors="replace")
    else:
        if raw[:3] == b"\xef\xbb\xbf":
            raw = raw[3:]
        for enc in ("utf-8", "big5", "cp950"):
            try:
                text = raw.decode(enc)
                break
            except UnicodeDecodeError:
                continue
        else:
            text = raw.decode("utf-8", errors="replace")
    return text.lstrip("\ufeff").replace("\x00", "").replace("\r\n", "\n").replace("\r", "\n")


def load_manifest():
    with open(os.path.join(ROOT, "data", "tests.json"), encoding="utf-8") as fh:
        return json.load(fh)


def apply_config(manifest, path):
    """套用網頁版「測資與配分設定」匯出的 JSON，讓兩邊用同一把尺。

    設定格式（assets/app.js 的 CFG）：
        {"version":1,
         "points":   {"q1": 15},            # 每題總分
         "disabled": {"q1": [2, 5]},        # 關掉的內建測資編號
         "custom":   {"q1": [{"input":..., "expected":..., "note":..., "enabled":true}]}}

    也吃「批改明細 JSON」——它把設定包在 config 欄位裡。

    配分模型和網頁版一致：題目總分固定，啟用中的測資平分。
    """
    with open(path, encoding="utf-8") as fh:
        cfg = json.load(fh)
    if isinstance(cfg, dict) and isinstance(cfg.get("config"), dict):
        cfg = cfg["config"]
    if not isinstance(cfg, dict):
        raise SystemExit("設定檔格式不對：最外層應該是一個物件")

    points = cfg.get("points") or {}
    disabled = cfg.get("disabled") or {}
    custom = cfg.get("custom") or {}
    notes = []

    for prob in manifest["problems"]:
        qid = prob["id"]
        base_points, base_n = prob["points"], len(prob["tests"])

        pt = points.get(qid)
        if isinstance(pt, (int, float)) and 0 <= pt <= 1000:
            prob["points"] = round(float(pt), 2)
            if prob["points"] != base_points:
                notes.append("%s 配分 %g→%g 分" % (qid.upper(), base_points, prob["points"]))

        have = set(t["n"] for t in prob["tests"])
        off = sorted(n for n in (disabled.get(qid) or [])
                     if isinstance(n, int) and not isinstance(n, bool) and n in have)
        if off:
            prob["tests"] = [t for t in prob["tests"] if t["n"] not in off]
            notes.append("%s 關閉 #%s" % (qid.upper(), " #".join(str(n) for n in off)))

        added = 0
        for i, c in enumerate(custom.get(qid) or []):
            if not isinstance(c, dict) or c.get("enabled") is False:
                continue
            if not isinstance(c.get("input"), str) or not isinstance(c.get("expected"), str):
                continue
            prob["tests"].append({
                "n": "C%d" % (i + 1), "input": c["input"], "expected": c["expected"],
                "note": str(c.get("note") or "助教自訂測資"), "kind": "custom",
            })
            added += 1
        if added:
            notes.append("%s 自訂 %d 組" % (qid.upper(), added))

        n = len(prob["tests"])
        prob["pointsPerTest"] = (prob["points"] / float(n)) if n else 0.0
        if not n:
            notes.append("警告：%s 沒有任何啟用中的測資，這一題永遠是 0 分" % qid.upper())
        del base_n
    return notes


def normalize(text, mode="strict"):
    lines = [l.rstrip(" \t") for l in str(text).replace("\r\n", "\n").replace("\r", "\n").split("\n")]
    while lines and lines[-1] == "":
        lines.pop()
    if mode == "trim":
        lines = [l.strip() for l in lines]
    if mode == "loose":
        return re.sub(r"\s+", "", "\n".join(lines)).lower()
    return "\n".join(lines)


def alt_input(text):
    """同一筆測資的逐行版（非標準，預設不用）：老師規定一行就是一次 input()。"""
    alt = re.sub(r"[,\s]+", "\n", str(text)).strip()
    return alt if (alt != str(text).strip() and "\n" in alt) else ""


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


# 學號有兩種長相：
#   含字母 —— B11901234、B15A01308（中間夾字母的也算）
#   純數字 —— 8~10 碼
# 舊的寫法 [A-Za-z]\d{7,10}|\d{8,10} 只認得「一個字母 + 一串數字」，碰到
# B15A01308 時「B」後面只跟得到 2 個數字就斷掉，整段比對失敗，於是退而抓到
# COOL 塞在路徑裡的使用者編號（例如 10213134），把學號判成別人的。
# 改成先把路徑切成 token 再分級判定：公告格式的「學號_HW1」資料夾最優先，
# 其次是含字母的學號，純數字排最後。
# 這段規則與 assets/app.js 的同名函式必須一致，由 tools/test_detect.py 對拍把關。
TOKEN_SEP_RE = re.compile(r"[^A-Za-z0-9]+")
HW_SUFFIX_RE = re.compile(r"^(.*?)[_\-\s]*HW\s*\d+$", re.I)


def id_tokens(segment):
    return [t for t in TOKEN_SEP_RE.split(segment) if t]


def is_id_with_letter(tok):
    if not re.fullmatch(r"[A-Za-z][A-Za-z0-9]*", tok):
        return False
    if not 6 <= len(tok) <= 12:
        return False
    if re.fullmatch(r"hw\d+", tok, flags=re.I):      # HW20241231 這種資料夾名不是學號
        return False
    return sum(ch.isdigit() for ch in tok) >= 4


def is_id_digits(tok):
    return bool(re.fullmatch(r"\d{8,10}", tok))


def id_from_hw_folder(segment):
    """第一級：公告格式的「學號_HW1」，取 HW 前面最後一個 token。"""
    m = HW_SUFFIX_RE.match(segment)
    if not m or not m.group(1):
        return ""
    toks = id_tokens(m.group(1))
    if not toks:
        return ""
    last = toks[-1]
    return last.upper() if (is_id_with_letter(last) or is_id_digits(last)) else ""


def id_from_tokens(segment, want_letters):
    """第二級：含字母的學號；第三級：純數字。"""
    for tok in id_tokens(segment):
        if is_id_with_letter(tok) if want_letters else is_id_digits(tok):
            return tok.upper()
    return ""


ID_FINDERS = [
    id_from_hw_folder,
    lambda s: id_from_tokens(s, True),
    lambda s: id_from_tokens(s, False),
]


def detect_student(relpath):
    parts = [p for p in relpath.replace("\\", "/").split("/") if p]
    base = os.path.splitext(parts.pop())[0] if parts else ""
    segs = [re.sub(r"\.zip$", "", seg, flags=re.I) for seg in reversed(parts)]
    for finder in ID_FINDERS:            # 先把所有層都用高優先級的規則掃過一輪
        for seg in segs:
            hit = finder(seg)
            if hit:
                return hit
    for seg in segs:                     # 沒學號就用資料夾名（去掉 _HW1）
        seg = re.sub(r"[_\-\s]*HW\s*\d+$", "", seg, flags=re.I).strip()
        if seg and not re.fullmatch(r"(src|code|python|作業|homework|hw\s*\d*)", seg, flags=re.I):
            return seg
    for finder in ID_FINDERS:
        own = finder(base)
        if own:
            return own
    # 絕對不能拿檔名(q1/q2...)當學號，否則一個人的六個檔會變成六位「學生」
    if parts:
        return parts[-1]
    return base or "未知"


def collect(paths, workdir):
    """把 zip 解開（含巢狀 zip），回傳 [(顯示路徑, 程式碼)]"""
    found = []

    def take_file(disp, real):
        try:
            with open(real, "rb") as fh:
                found.append((disp, decode_source(fh.read())))
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


# 跟網頁版 assets/worker.js 完全相同的執行語意：
#   * input() 的提示字不進 stdout
#   * 輸入用完再 input() -> EOFError
#   * traceback 不顯示批改程式自己的框架
RUNNER = r"""
import sys, io, builtins, traceback

path = sys.argv[1]
with open(path, encoding="utf-8") as fh:
    src = fh.read()

data = sys.stdin.read().split("\n")
if data and data[-1] == "":
    data.pop()
state = [0]

def _input(prompt=""):
    if state[0] >= len(data):
        raise EOFError("EOF when reading a line")
    state[0] += 1
    return data[state[0] - 1]

builtins.input = _input
sys.stdin = io.StringIO("\n".join(data) + "\n")

g = {"__name__": "__main__", "__file__": "student.py", "__doc__": None}
try:
    exec(compile(src, "student.py", "exec"), g)
except SystemExit:
    pass
except EOFError:
    sys.stdout.flush()
    sys.stderr.write("EOFError：程式把這一題的輸入用完了還想再讀一次 input()。\n")
    sys.exit(3)          # 3 = 輸入不夠用，批改程式會改用逐行輸入再跑一次
except BaseException:
    sys.stdout.flush()
    etype, evalue, etb = sys.exc_info()
    traceback.print_exception(etype, evalue, etb.tb_next if etb else None, file=sys.stderr)
    sys.exit(1)
"""

MEM_LIMIT_MB = 1024


def _child_setup():
    """新的 process group（逾時才殺得乾淨）+ 記憶體上限（擋 [0]*10**9）"""
    os.setsid()
    try:
        import resource
        limit = MEM_LIMIT_MB * 1024 * 1024
        resource.setrlimit(resource.RLIMIT_AS, (limit, limit))
    except Exception:                                          # noqa: BLE001
        pass


def run_one(code, stdin_text, timeout, workdir):
    path = os.path.join(workdir, "student_run.py")
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(code)
    sandbox = os.path.join(workdir, "cwd")
    os.makedirs(sandbox, exist_ok=True)
    proc = subprocess.Popen(
        # -I -S：不載入 site-packages，跟網頁版一樣「只有標準函式庫」，
        # 免得同一份作業在網頁 0 分、在 CLI 卻因為助教電腦裝了 numpy 而滿分
        [sys.executable, "-I", "-S", "-c", RUNNER, path],
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        text=True, cwd=sandbox,
        preexec_fn=_child_setup if os.name == "posix" else None,
    )
    try:
        out, err = proc.communicate(stdin_text, timeout=timeout)
        if proc.returncode == 3:
            return out, err[-2000:], "eof"
        return out, err[-2000:], ("re" if proc.returncode else "ok")
    except subprocess.TimeoutExpired:
        try:                                                   # 連同子孫行程一起殺掉
            os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
        except Exception:                                      # noqa: BLE001
            proc.kill()
        proc.communicate()
        return "", "執行超過時間限制（無窮迴圈，或程式還在等下一個 input()）", "tle"
    except Exception as exc:                                   # noqa: BLE001
        proc.kill()
        return "", str(exc), "re"


def main():
    ap = argparse.ArgumentParser(description="HW1 命令列自動批改")
    ap.add_argument("paths", nargs="+", help="繳交的 zip / 資料夾 / .py")
    ap.add_argument("-o", "--out", default="hw1_成績.csv")
    ap.add_argument("--timeout", type=float, default=8)
    ap.add_argument("--mode", choices=["strict", "trim", "loose"], default="strict")
    ap.add_argument("--detail", default="", help="另外輸出逐筆明細 JSON")
    ap.add_argument("--config", default="",
                    help="套用網頁版「測資與配分設定」匯出的 JSON（關掉的測資、自訂測資、配分）")
    ap.add_argument("--strict-output", action="store_true",
                    help="嚴格模式：程式印完正確答案後才出錯（例如結尾多一個 input()）也算錯")
    ap.add_argument("--lenient-input", action="store_true",
                    help="非標準：把一行拆成多次 input() 讀的同學，改用逐行輸入重跑一次再判定"
                         "（老師規定一行就是一次 input()，所以預設關閉）")
    args = ap.parse_args()

    manifest = load_manifest()
    cfg_notes = apply_config(manifest, args.config) if args.config else []
    problems = {p["id"]: p for p in manifest["problems"]}
    qids = [p["id"] for p in manifest["problems"]]
    total_points = sum(p["points"] for p in manifest["problems"])
    used_tests = sum(len(p["tests"]) for p in manifest["problems"])

    # 成績單一定要帶著「這是用什麼設定算出來的」，否則兩份看起來一樣卻不同義
    summary_lines = ["本次使用 %d 組測資，總分 %g 分" % (used_tests, round(total_points, 2))]
    summary_lines += cfg_notes
    if args.config:
        print("套用設定：%s" % args.config)
    for line in summary_lines:
        print("  " + line)

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
            rec = {"score": 0.0, "passed": 0, "reok": 0, "viaAlt": 0, "cases": [], "file": disp}
            tle_count = 0
            stopped = ""
            for t in prob["tests"]:
                if stopped:
                    rec["cases"].append({"n": t["n"], "status": "skip", "input": t["input"],
                                         "expected": t["expected"], "actual": "",
                                         "stderr": stopped})
                    continue
                shown_input = t["input"]
                via_alt = False
                out, err, st = run_one(code, t["input"] + "\n", args.timeout, workdir)
                alt = alt_input(t["input"])
                if st in ("eof", "re") and alt and args.lenient_input:
                    out2, err2, st2 = run_one(code, alt + "\n", args.timeout, workdir)
                    if normalize(out2, args.mode) == normalize(t["expected"], args.mode):
                        out, err, st = out2, err2, st2
                        shown_input, via_alt = alt, True
                        rec["viaAlt"] = rec.get("viaAlt", 0) + 1
                if st == "eof":
                    st = "re"
                output_ok = normalize(out, args.mode) == normalize(t["expected"], args.mode)
                if st == "ok":
                    st = "ac" if output_ok else "wa"
                elif output_ok:
                    st = "reok"          # 輸出正確，但程式印完之後才出錯／逾時
                if st == "tle":
                    tle_count += 1
                    if tle_count >= 2:
                        stopped = "連續逾時兩次，其餘測資直接略過"
                passed = st == "ac" or (st == "reok" and not args.strict_output)
                if passed:
                    rec["score"] += prob["pointsPerTest"]
                    rec["passed"] += 1
                if st == "reok":
                    rec["reok"] += 1
                rec["cases"].append({"n": t["n"], "status": st, "input": shown_input,
                                     "expected": t["expected"], "actual": out[:3000].rstrip("\n"),
                                     "stderr": err[-800:], "viaAlt": via_alt})
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

        head = ["學號"] + ["%s(%g)" % (q.upper(), problems[q]["points"]) for q in qids] + \
               ["總分"] + ["%s通過筆數" % q.upper() for q in qids]
        def safe(v):                       # 避免 Excel 把 =、+ 開頭當公式
            v = "" if v is None else str(v)
            return "'" + v if v[:1] in "=+-@" and not v.replace(".", "").isdigit() else v

        with io.open(args.out, "w", encoding="utf-8-sig", newline="") as fh:
            w = csv.writer(fh)
            w.writerow(head)
            w.writerows([[safe(c) for c in r] for r in rows])
            w.writerow([])
            w.writerow(["批改設定"])
            for line in summary_lines:
                w.writerow([safe(line)])
        reok_total = sum(rec.get("reok", 0) for qs in scores.values() for rec in qs.values())
        alt_total = sum(rec.get("viaAlt", 0) for qs in scores.values() for rec in qs.values())
        if reok_total:
            print("\n注意：有 %d 筆「輸出正確但程式印完之後才出錯」（常見於結尾多一個 input()），目前%s。"
                  % (reok_total, "算錯（--strict-output）" if args.strict_output else "算通過"))
        if alt_total:
            print("注意：有 %d 筆是同學把一行輸入拆成好幾個 input() 讀，已改用逐行輸入重跑並以答案為準。"
                  % alt_total)
        print("\n共 %d 位學生，滿分 %g。成績已寫入 %s" % (len(scores), round(total_points, 2), args.out))

        if args.detail:
            payload = {
                "summary": summary_lines,
                "problems": [{"id": p["id"], "points": p["points"], "tests": len(p["tests"]),
                              "pointsPerTest": round(p["pointsPerTest"], 4)}
                             for p in manifest["problems"]],
                "results": detail,
            }
            with open(args.detail, "w", encoding="utf-8") as fh:
                json.dump(payload, fh, ensure_ascii=False, indent=1)
            print("逐筆明細：%s" % args.detail)
        return 0
    finally:
        shutil.rmtree(workdir, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
