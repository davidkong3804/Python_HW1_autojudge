# Q6 Date Calculation (reference solution)
import datetime


def parse_date(text):
    # %m、%d 接受個位數（2023-1-2 視同 2023-01-02），%Y 一定要 4 位數
    return datetime.datetime.strptime(text, '%Y-%m-%d')


first, second = input().split(',')

try:
    d1 = parse_date(first)
    d2 = parse_date(second)
    print(abs((d2 - d1).days))
except ValueError:
    print('Invalid')
