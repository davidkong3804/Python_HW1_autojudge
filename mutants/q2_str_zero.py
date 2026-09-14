# BUG: 用字串比對判斷除數是否為 0
d = input().split(',')
op = d[0]
if op == '/' and d[2] == '0':
    print('Error')
else:
    x = float(d[1]); y = float(d[2])
    if op == '+': r = x + y
    elif op == '-': r = x - y
    elif op == '*': r = x * y
    else: r = x / y
    print(format(r, '.2f'))
