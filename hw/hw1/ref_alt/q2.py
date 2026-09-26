# Q2 alternative implementation (independent cross-check)
parts = input().strip().split(",")
op, a, b = parts[0], float(parts[1]), float(parts[2])
if op == "/" and b == 0.0:
    print("Error")
else:
    r = {"+": a + b, "-": a - b, "*": a * b, "/": a / b if b else 0}[op]
    print("{:.2f}".format(r))
