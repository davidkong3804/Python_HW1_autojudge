# BUG: 用絕對值大小排序
d = input().split()
a = float(d[0]); b = float(d[1]); c = float(d[2])
s = (b * b - 4 * a * c) ** 0.5
r = sorted([(-b + s) / (2 * a), (-b - s) / (2 * a)], key=abs, reverse=True)
print(format(r[0], '.3f') + ' ' + format(r[1], '.3f'))
