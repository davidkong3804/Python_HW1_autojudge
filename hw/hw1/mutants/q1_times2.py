# BUG: 身高乘以 2 而不是平方
d = input().split()
h = float(d[0]); w = float(d[1])
print(format(w / (h * 2), '.2f'))
