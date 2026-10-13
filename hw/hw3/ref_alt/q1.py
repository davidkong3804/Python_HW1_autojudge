# 另一位助教的寫法：迭代算階乘、sys.stdin 逐行讀
import sys

MESSAGES = [
    (lambda k, n: k > n, "Error! k > n, please input again!"),
    (lambda k, n: k == n, "Error! k = n, please input again!"),
    (lambda k, n: k <= 0, "Error! k <= 0, please input again!"),
    (lambda k, n: n <= 0, "Error! n <= 0, please input again!"),
]


def fact(m):
    r = 1
    for i in range(2, m + 1):
        r *= i
    return r


for raw in sys.stdin:
    toks = raw.split()
    if len(toks) != 2 or not all(t.lstrip("-").isdigit() for t in toks):
        print("Error! Please input two integers k and n, please input again!")
        continue
    k, n = int(toks[0]), int(toks[1])
    bad = [msg for cond, msg in MESSAGES if cond(k, n)]
    if bad:
        print("\n".join(bad))
        continue
    print(fact(n) // fact(k) // fact(n - k))
    break
