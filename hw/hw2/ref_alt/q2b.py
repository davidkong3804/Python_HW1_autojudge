# Q2b alternative implementation (independent cross-check)
# 篩法
lo, hi = map(int, input().split())
flags = [False, False] + [True] * (hi - 1)
for p in range(2, int(hi ** 0.5) + 1):
    if flags[p]:
        flags[p * p::p] = [False] * len(flags[p * p::p])
ans = [str(k) for k in range(lo, hi + 1) if flags[k]]
print(",".join(ans) or "0")
