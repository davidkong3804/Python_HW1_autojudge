# BUG: 大小寫不符合題目要求
p = input()
n = len(p)
if n < 6:
    print('weak')
elif n <= 10:
    print('moderate')
else:
    print('strong')
