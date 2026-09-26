# BUG: 數數字個數而不是加總
s = input()
c = 0
for ch in s:
    if ch.isdigit():
        c += 1
print(str(c) + ',' + str(len(s)))
