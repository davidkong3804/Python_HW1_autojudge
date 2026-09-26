# Q3a alternative implementation (independent cross-check)
seen = {}
for tok in input().split(","):
    seen[int(tok)] = True
print(",".join(str(k) for k in sorted(seen)))
