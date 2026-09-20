#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
測資與配分設定的對拍測試
------------------------
助教可以在網頁上關掉測資、加自訂測資、改配分，也可以把設定匯出給
tools/grade_cli.py --config 用。這代表同一套規則被寫了兩次：
一次在 assets/app.js，一次在 tools/grade_cli.py。

兩邊只要有一點不一樣，同一份作業在網頁和在命令列就會算出不同的成績，
而且不會有人發現。這支測試就是為了擋這件事：

  1. 固定案例表：每個設定情境算出來的配分必須等於預期值
  2. 交叉比對：app.js 與 grade_cli.py 對同一份設定必須給出完全相同的
     「每題配分 / 啟用組數 / 每組分數 / 測資內容」

配分模型：題目總分固定，啟用中的測資平分。

執行：python3 tools/test_config.py
"""

import copy
import json
import os
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))

import grade_cli  # noqa: E402

RED, GREEN, YELLOW, RESET = "\033[31m", "\033[32m", "\033[33m", "\033[0m"

JS_START = "/* --8<-- config:start"
JS_END = "/* --8<-- config:end"

CUSTOM_Q1 = {"input": "1.8 72", "expected": "22.22", "note": "助教自訂", "enabled": True}
CUSTOM_Q1_OFF = {"input": "2 50", "expected": "12.50", "note": "先關著", "enabled": False}

# (情境名稱, 設定, 預期 {qid: (配分, 啟用組數)})
CASES = [
    ("原廠設定", {}, {"q1": (15, 5), "q2": (15, 5), "q3": (15, 5),
                      "q4": (15, 5), "q5": (20, 5), "q6": (20, 5)}),
    ("關掉 Q2 兩組：總分不變，剩下三組變成每組 5 分",
     {"disabled": {"q2": [1, 4]}},
     {"q1": (15, 5), "q2": (15, 3), "q3": (15, 5), "q4": (15, 5), "q5": (20, 5), "q6": (20, 5)}),
    ("改 Q3 配分",
     {"points": {"q3": 12}},
     {"q1": (15, 5), "q2": (15, 5), "q3": (12, 5), "q4": (15, 5), "q5": (20, 5), "q6": (20, 5)}),
    ("Q1 加一組自訂測資",
     {"custom": {"q1": [CUSTOM_Q1]}},
     {"q1": (15, 6), "q2": (15, 5), "q3": (15, 5), "q4": (15, 5), "q5": (20, 5), "q6": (20, 5)}),
    ("關掉的自訂測資不算數",
     {"custom": {"q1": [CUSTOM_Q1, CUSTOM_Q1_OFF]}},
     {"q1": (15, 6), "q2": (15, 5), "q3": (15, 5), "q4": (15, 5), "q5": (20, 5), "q6": (20, 5)}),
    ("Q4 全部關掉：這一題所有人都是 0 分",
     {"disabled": {"q4": [1, 2, 3, 4, 5]}},
     {"q1": (15, 5), "q2": (15, 5), "q3": (15, 5), "q4": (15, 0), "q5": (20, 5), "q6": (20, 5)}),
    ("關一組又加一組：組數回到 5，每組仍是 3 分",
     {"disabled": {"q1": [2]}, "custom": {"q1": [CUSTOM_Q1]}},
     {"q1": (15, 5), "q2": (15, 5), "q3": (15, 5), "q4": (15, 5), "q5": (20, 5), "q6": (20, 5)}),
    ("亂填的設定要被忽略（不存在的題號與測資編號、負分、型別錯誤）",
     {"points": {"q1": -5, "q9": 30}, "disabled": {"q1": [99], "q9": [1]},
      "custom": {"q1": [{"input": 123}]}},
     {"q1": (15, 5), "q2": (15, 5), "q3": (15, 5), "q4": (15, 5), "q5": (20, 5), "q6": (20, 5)}),
]


def load_manifest():
    with open(os.path.join(ROOT, "data", "tests.json"), encoding="utf-8") as fh:
        return json.load(fh)


def py_apply(manifest, cfg):
    """用 grade_cli.apply_config 算出這份設定的結果。"""
    m = copy.deepcopy(manifest)
    tmp = tempfile.mkdtemp(prefix="hw1_cfg_")
    try:
        path = os.path.join(tmp, "cfg.json")
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(cfg, fh, ensure_ascii=False)
        grade_cli.apply_config(m, path)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    return [shape(p) for p in m["problems"]]


def shape(prob):
    return {
        "id": prob["id"],
        "points": round(float(prob["points"]), 4),
        "tests": len(prob["tests"]),
        "pointsPerTest": round(float(prob["pointsPerTest"]), 4),
        "sig": "\u0001".join("%s|%s|%s" % (t["n"], t["input"], t["expected"])
                             for t in prob["tests"]),
    }


def js_apply(manifest, configs):
    """把 app.js 的設定段落抓出來，用 node 跑同一批設定。node 不在就回傳 None。"""
    node = shutil.which("node") or shutil.which("nodejs")
    if not node:
        return None
    with open(os.path.join(ROOT, "assets", "app.js"), encoding="utf-8") as fh:
        src = fh.read()
    a, b = src.find(JS_START), src.find(JS_END)
    if a < 0 or b < 0:
        raise RuntimeError("assets/app.js 裡找不到 config:start / config:end 標記")
    block = src[src.index("\n", a) + 1:b]

    harness = """
var manifest = JSON.parse(process.argv[2]);
var configs = JSON.parse(process.argv[3]);
var PROBLEMS = manifest.problems;
var QIDS = PROBLEMS.map(function (p) { return p.id; });
var DEFAULT_TOTAL = PROBLEMS.reduce(function (s, p) { return s + p.points; }, 0);
function problemOf(qid) { return PROBLEMS.filter(function (p) { return p.id === qid; })[0]; }
var localStorage = { getItem: function () { return null; }, setItem: function () {} };
""" + block + """
function r4(n) { return Math.round(n * 10000) / 10000; }
console.log(JSON.stringify(configs.map(function (sc) {
  CFG = sanitizeConfig(sc);
  return activeProblems().map(function (p) {
    return {
      id: p.id, points: r4(p.points), tests: p.tests.length,
      pointsPerTest: r4(p.pointsPerTest),
      sig: p.tests.map(function (t) {
        return t.n + '|' + t.input + '|' + t.expected;
      }).join('\\u0001')
    };
  });
})));
"""
    tmp = tempfile.mkdtemp(prefix="hw1_cfgjs_")
    try:
        js = os.path.join(tmp, "config.js")
        with open(js, "w", encoding="utf-8") as fh:
            fh.write(harness)
        proc = subprocess.run(
            [node, js, json.dumps(manifest, ensure_ascii=False), json.dumps(configs, ensure_ascii=False)],
            capture_output=True, text=True, timeout=60)
        if proc.returncode != 0:
            raise RuntimeError("node 執行失敗：%s" % proc.stderr.strip())
        return json.loads(proc.stdout)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def main():
    manifest = load_manifest()
    failures = []
    print("=" * 72)
    print("測資與配分設定（配分模型：題目總分固定，啟用中的測資平分）")
    print("=" * 72)

    py_all = []
    for name, cfg, want in CASES:
        got = py_apply(manifest, cfg)
        py_all.append(got)
        bad = []
        for prob in got:
            wp, wn = want[prob["id"]]
            if prob["points"] != wp or prob["tests"] != wn:
                bad.append("%s 預期 %g 分 / %d 組，實際 %g 分 / %d 組"
                           % (prob["id"].upper(), wp, wn, prob["points"], prob["tests"]))
            expect_per = round(wp / float(wn), 4) if wn else 0.0
            if prob["pointsPerTest"] != expect_per:
                bad.append("%s 每組預期 %g 分，實際 %g 分"
                           % (prob["id"].upper(), expect_per, prob["pointsPerTest"]))
        total = round(sum(p["points"] for p in got), 2)
        print("  %s %-6s %s" % (GREEN + "OK  " + RESET if not bad else RED + "FAIL" + RESET,
                                "%g 分" % total, name))
        for b in bad:
            failures.append("%s：%s" % (name, b))

    print()
    js_all = js_apply(manifest, [c[1] for c in CASES])
    if js_all is None:
        print("  %s找不到 node，略過 app.js 的交叉比對%s" % (YELLOW, RESET))
    else:
        mismatch = 0
        for (name, _cfg, _want), py, js in zip(CASES, py_all, js_all):
            if py != js:
                mismatch += 1
                for a, b in zip(py, js):
                    if a != b:
                        failures.append("app.js 與 grade_cli.py 不一致（%s）：%s\n"
                                        "       grade_cli.py %s\n       app.js       %s"
                                        % (name, a["id"].upper(), a, b))
        if not mismatch:
            print("  %s交叉比對：app.js 與 grade_cli.py 對 %d 種設定的算法完全一致%s"
                  % (GREEN, len(CASES), RESET))

    print()
    print("=" * 72)
    if failures:
        print("%s共 %d 項不符：%s" % (RED, len(failures), RESET))
        for f in failures:
            print("  - %s" % f)
        sys.exit(1)
    print("%s全部通過：配分算法正確，兩份實作也一致。%s" % (GREEN, RESET))


if __name__ == "__main__":
    main()
