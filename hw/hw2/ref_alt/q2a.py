# Q2a alternative implementation (independent cross-check)
# 用已經找到的質數去試除
lo, hi = map(int, input().split())
known = []
found = []
for n in range(2, hi + 1):
    if all(n % p for p in known if p * p <= n):
        known.append(n)
        if n >= lo:
            found.append(n)
print(",".join(map(str, found)) if found else 0)
