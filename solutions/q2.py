# Q2 Simple Calculator (reference solution)
data = input().split(',')
op = data[0]
x = float(data[1])
y = float(data[2])
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
