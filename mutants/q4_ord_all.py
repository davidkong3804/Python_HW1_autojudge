# BUG: 沒有過濾英文字母，全部都拿去算
s = input()
t = 0
for ch in s:
    t += ord(ch) - 48
print(str(t) + ',' + str(len(s)))
