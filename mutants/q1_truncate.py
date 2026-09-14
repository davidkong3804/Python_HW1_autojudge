# BUG: 無條件捨去而不是四捨五入
d = input().split()
h = float(d[0]); w = float(d[1])
bmi = w / (h * h)
print(format(int(bmi * 100) / 100, '.2f'))
