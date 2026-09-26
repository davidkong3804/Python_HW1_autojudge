# BUG: 沒有由大到小排序，a 為負數時順序相反
d = input().split()
a = float(d[0]); b = float(d[1]); c = float(d[2])
s = (b * b - 4 * a * c) ** 0.5
print(format((-b + s) / (2 * a), '.3f') + ' ' + format((-b - s) / (2 * a), '.3f'))
