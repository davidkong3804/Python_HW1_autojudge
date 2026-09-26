# Q3b alternative implementation (independent cross-check)
nums = sorted(int(t) for t in input().split(","))
out = [nums[0]]
for x in nums[1:]:
    if x != out[-1]:
        out.append(x)
print(*out, sep=",")
