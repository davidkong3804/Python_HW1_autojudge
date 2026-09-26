# BUG: 用 math.pow（浮點數）累加，位數很多時失去精度
import math
s = input()
total = 0
n = len(s)
for i in range(n):
    total = total + int(s[i]) * math.pow(2, n - 1 - i)
print(int(total))
