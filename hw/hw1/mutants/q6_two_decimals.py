# BUG: 印到小數第二位
d = input().split()
a = float(d[0]); b = float(d[1]); c = float(d[2])
s = (b * b - 4 * a * c) ** 0.5
r = sorted([(-b + s) / (2 * a), (-b - s) / (2 * a)], reverse=True)
print(format(r[0], '.2f') + ' ' + format(r[1], '.2f'))
