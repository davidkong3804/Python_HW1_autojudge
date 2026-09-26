# BUG: 把頭尾兩天都算進去，天數多 1
import datetime
a, b = input().split(',')
try:
    d1 = datetime.datetime.strptime(a, '%Y-%m-%d')
    d2 = datetime.datetime.strptime(b, '%Y-%m-%d')
    print(abs((d2 - d1).days) + 1)
except ValueError:
    print('Invalid')
