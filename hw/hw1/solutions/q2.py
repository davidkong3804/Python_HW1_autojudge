# Q2 Simple Calculator (reference solution)
op, x, y = input().split(',')
x = float(x)
y = float(y)

if op == '+':
    print(format(x + y, '.2f'))
elif op == '-':
    print(format(x - y, '.2f'))
elif op == '*':
    print(format(x * y, '.2f'))
else:
    if y == 0:
        print('Error')
    else:
        print(format(x / y, '.2f'))
