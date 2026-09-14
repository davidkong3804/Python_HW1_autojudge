# Q6 Find Roots (reference solution)
a, b, c = input().split()
a = float(a)
b = float(b)
c = float(c)

d = (b * b - 4 * a * c) ** 0.5
r1 = (-b + d) / (2 * a)
r2 = (-b - d) / (2 * a)

# 由大到小：需要的話就交換
if r1 < r2:
    temp = r1
    r1 = r2
    r2 = temp

print(format(r1, '.3f') + ' ' + format(r2, '.3f'))
