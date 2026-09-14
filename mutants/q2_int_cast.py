# BUG: 用 int() 轉換，小數會被截掉
d = input().split(',')
op = d[0]; x = int(float(d[1])); y = int(float(d[2]))
if op == '+': print(format(x + y, '.2f'))
elif op == '-': print(format(x - y, '.2f'))
elif op == '*': print(format(x * y, '.2f'))
elif y == 0: print('Error')
else: print(format(x / y, '.2f'))
