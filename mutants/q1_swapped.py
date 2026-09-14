# BUG: 身高體重順序相反
d = input().split()
w = float(d[0]); h = float(d[1])
print(format(w / (h * h), '.2f'))
