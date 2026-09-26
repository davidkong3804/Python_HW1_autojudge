# BUG: 次方多算 1（從 2^1 開始），答案變兩倍
s = input()
total = 0
n = len(s)
for i in range(n):
    total = total + int(s[i]) * 2 ** (n - i)
print(total)
