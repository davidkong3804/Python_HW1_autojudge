# Q6 Find Roots (reference solution)
data = input().split()
a = float(data[0])
b = float(data[1])
c = float(data[2])
d = (b * b - 4 * a * c) ** 0.5
r1 = (-b + d) / (2 * a)
r2 = (-b - d) / (2 * a)
if r1 < r2:
    temp = r1
    r1 = r2
    r2 = temp
print(format(r1, '.3f') + ' ' + format(r2, '.3f'))
