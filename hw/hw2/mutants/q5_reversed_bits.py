# BUG: 從左邊開始算 2 的次方，位元權重反了
s = input()
total = 0
for i in range(len(s)):
    total = total + int(s[i]) * 2 ** i
print(total)
