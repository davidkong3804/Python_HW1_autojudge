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
