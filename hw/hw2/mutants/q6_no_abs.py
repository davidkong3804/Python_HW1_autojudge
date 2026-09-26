# BUG: 沒有取絕對值，前面日期比較晚時印出負數
import datetime
a, b = input().split(',')
try:
    d1 = datetime.datetime.strptime(a, '%Y-%m-%d')
    d2 = datetime.datetime.strptime(b, '%Y-%m-%d')
    print((d2 - d1).days)
except ValueError:
    print('Invalid')
