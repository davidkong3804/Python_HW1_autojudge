# Q4 Sum of Digits and String Length (reference solution)
s = input()
total = 0
for ch in s:
    if ch >= '0' and ch <= '9':
        total = total + int(ch)
print(str(total) + ',' + str(len(s)))
