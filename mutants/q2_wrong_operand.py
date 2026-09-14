# BUG: 檢查被除數是不是 0
d = input().split(',')
op = d[0]; x = float(d[1]); y = float(d[2])
if op == '/' and x == 0:
    print('Error')
else:
    if op == '+': r = x + y
    elif op == '-': r = x - y
    elif op == '*': r = x * y
    else: r = x / y
    print(format(r, '.2f'))
