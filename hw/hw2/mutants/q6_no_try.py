# BUG: 沒有處理不合法的日期，直接當掉（沒有輸出 Invalid）
import datetime
a, b = input().split(',')
d1 = datetime.datetime.strptime(a, '%Y-%m-%d')
d2 = datetime.datetime.strptime(b, '%Y-%m-%d')
print(abs((d2 - d1).days))
