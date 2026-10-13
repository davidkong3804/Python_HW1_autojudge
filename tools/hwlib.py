# -*- coding: utf-8 -*-
"""
多作業共用的小工具：找出有哪些作業、載入 hw/<id>/spec.py、各種路徑。

每份作業放在 hw/<id>/：
    spec.py        題目、配分、測資、獨立驗算（格式見 hw/README.md）
    solutions/     參考解答 <題號>.py
    ref_alt/       另一份獨立實作（對拍用）
    mutants/       故意寫錯的程式，檔名 <題號>_xxx.py
    tests/         產生出來的純文字測資（generate_tests.py 寫入）
"""

import importlib.util
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HW_DIR = os.path.join(ROOT, "hw")
DATA_DIR = os.path.join(ROOT, "data")


def hw_sort_key(hw_id):
    m = re.search(r"(\d+)", hw_id)
    return (int(m.group(1)) if m else 10 ** 6, hw_id)


def list_hws():
    """hw/ 底下所有有 spec.py 的作業，依編號排序。"""
    if not os.path.isdir(HW_DIR):
        return []
    found = [d for d in os.listdir(HW_DIR)
             if os.path.isfile(os.path.join(HW_DIR, d, "spec.py"))]
    return sorted(found, key=hw_sort_key)


def hw_path(hw_id, *parts):
    return os.path.join(HW_DIR, hw_id, *parts)


def load_spec(hw_id):
    path = hw_path(hw_id, "spec.py")
    if not os.path.isfile(path):
        raise SystemExit("找不到作業 %s（應該要有 %s）。現有作業：%s"
                         % (hw_id, path, "、".join(list_hws()) or "無"))
    spec = importlib.util.spec_from_file_location("hwspec_" + hw_id, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def manifest_path(hw_id):
    return os.path.join(DATA_DIR, hw_id + ".json")


def load_manifest(hw_id):
    path = manifest_path(hw_id)
    if not os.path.isfile(path):
        raise SystemExit("找不到 %s，請先執行 python3 tools/generate_tests.py" % path)
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def resolve_hws(arg):
    """--hw 參數：'all'、'hw1'、'hw1,hw2'。"""
    if not arg or arg == "all":
        return list_hws()
    return [h.strip().lower() for h in arg.split(",") if h.strip()]


# --------------------------------------------------------------------------
# 讀寫檔案的題目（spec.py 裡 "fileMode": "read" / "write"）
# 檔案的放置、收集、接在輸出後面的格式，直接用 assets/worker.js 裡那一段 Python，
# 網頁、命令列、產生測資三邊才不會各寫一份。
# --------------------------------------------------------------------------
def _load_fileio():
    with open(os.path.join(ROOT, "assets", "worker.js"), encoding="utf-8") as fh:
        src = fh.read()
    a = src.index("# --8<-- fileio:start")
    b = src.index("# --8<-- fileio:end")
    ns = {}
    exec(src[src.index("\n", a) + 1:b], ns)   # noqa: S102
    return ns


_FILEIO = _load_fileio()
io_write_files = _FILEIO["_io_write_files"]
io_collect = _FILEIO["_io_collect"]
io_compose = _FILEIO["_io_compose"]


def test_io(prob, test):
    """這筆測資執行時要準備的檔案；不是讀寫檔案的題目回傳 None（照舊在原本的資料夾跑）。"""
    mode = prob.get("fileMode")
    if not mode:
        return None
    return {"files": dict(test.get("files") or {}), "capture": mode == "write"}


def run_python(path, stdin_text, io=None, timeout=30, args=()):
    """執行一支 Python 程式。回傳 (returncode, 輸出, stderr)；逾時丟 subprocess.TimeoutExpired。
    io 不是 None 時在一個新的暫存資料夾裡跑，先放好 io["files"]，
    io["capture"] 為真就把跑完新產生 / 被改過的檔案接在輸出後面。"""
    box = None
    try:
        if io is not None:
            box = tempfile.mkdtemp(prefix="autojudge_io_")
            io_write_files(box, io.get("files"))
        proc = subprocess.run([sys.executable] + list(args) + [os.path.abspath(path)],
                              input=stdin_text, capture_output=True, text=True,
                              timeout=timeout, cwd=box)
        out = proc.stdout
        if io is not None and io.get("capture"):
            out = io_compose(out, io_collect(box, io.get("files")))
        return proc.returncode, out, proc.stderr
    finally:
        if box:
            shutil.rmtree(box, ignore_errors=True)
