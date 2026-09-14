# BUG: 除法用 //
d = input().split(',')
op = d[0]; x = float(d[1]); y = float(d[2])
if op == '+': print(format(x + y, '.2f'))
elif op == '-': print(format(x - y, '.2f'))
elif op == '*': print(format(x * y, '.2f'))
elif y == 0: print('Error')
else: print(format(x // y, '.2f'))
