# BUG: 長度 6 被判成 Weak
p = input()
if len(p) <= 6:
    print('Weak')
elif len(p) <= 10:
    print('Moderate')
else:
    print('Strong')
