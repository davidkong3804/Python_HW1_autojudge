# BUG: 只有整串都是數字才加總
s = input()
if s.isdigit():
    t = 0
    for ch in s:
        t += int(ch)
else:
    t = 0
print(str(t) + ',' + str(len(s)))
