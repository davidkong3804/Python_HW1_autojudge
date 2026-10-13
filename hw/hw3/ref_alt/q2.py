# 另一位助教的寫法：先判斷格式再計算，用 os.path.exists 而不是 except FileNotFoundError
import os
import re

NUM = re.compile(r"^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$")


def num(s):
    return float(s) if any(c in s for c in ".eE") else int(s)


src, dst = input().split(",", 1)
with open(dst, "w", encoding="utf-8") as out:
    msg = None
    if not os.path.exists(src):
        msg = "File not found"
    else:
        with open(src, encoding="utf-8") as f:
            tok = f.read().split()
        isn = [bool(NUM.match(t)) for t in tok]
        if len(tok) == 3 and isn[0] and isn[2]:
            op = tok[1]
            if op not in "+-*/" or len(op) != 1:
                msg = "Operator error"
            elif op == "/" and num(tok[2]) == 0:
                msg = "Cannot divide by zero"
            else:
                x, y = num(tok[0]), num(tok[2])
                val = {"+": lambda: x + y, "-": lambda: x - y,
                       "*": lambda: x * y, "/": lambda: x / y}[op]()
                out.write("%s" % (val,))
                msg = "Successfully"
        elif len(tok) == 2 and isn == [True, True]:
            msg = "Operator lost"
        elif len(tok) == 2 and tok[0] in ("+", "-", "*", "/") and isn[1]:
            msg = "Number1 lost"
        elif len(tok) == 2 and isn[0] and tok[1] in ("+", "-", "*", "/"):
            msg = "Number2 lost"
        else:
            msg = "Format error"
    print(msg)
print("Execution completed")
