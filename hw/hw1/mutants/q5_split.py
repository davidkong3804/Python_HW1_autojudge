# BUG: 多此一舉用 split()，含空格的密碼會被切斷
p = input().split()[0]
if len(p) < 6:
    print('Weak')
elif len(p) <= 10:
    print('Moderate')
else:
    print('Strong')
