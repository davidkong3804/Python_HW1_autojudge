# BUG: 用 round() 直接印，不會補到小數第二位
d = input().split()
h = float(d[0]); w = float(d[1])
print(round(w / (h * h), 2))
