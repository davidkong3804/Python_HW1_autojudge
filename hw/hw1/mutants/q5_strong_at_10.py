# BUG: 長度 10 被判成 Strong
p = input()
if len(p) < 6:
    print('Weak')
elif len(p) < 10:
    print('Moderate')
else:
    print('Strong')
