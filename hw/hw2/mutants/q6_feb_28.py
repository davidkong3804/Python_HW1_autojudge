# BUG: 自己檢查日期時以為二月最多 28 天，閏年 2/29 被判成 Invalid
import datetime


def parse(text):
    y, m, d = text.split('-')
    if len(y) != 4 or (int(m) == 2 and int(d) > 28):
        raise ValueError
    return datetime.date(int(y), int(m), int(d))


a, b = input().split(',')
try:
    print(abs((parse(b) - parse(a)).days))
except ValueError:
    print('Invalid')
