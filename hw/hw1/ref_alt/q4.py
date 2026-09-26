# Q4 alternative implementation (independent cross-check)
s = input()
print("%d,%d" % (sum(int(c) for c in s if c.isdigit()), len(s)))
