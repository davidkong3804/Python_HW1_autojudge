# BUG: 長度少算 1
s = input()
t = 0
for ch in s:
    if ch.isdigit():
        t += int(ch)
print(str(t) + ',' + str(len(s) - 1))
