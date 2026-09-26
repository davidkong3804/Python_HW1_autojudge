# BUG: 用 date.fromisoformat，月日是個位數（沒補 0）時會被當成格式錯誤
from datetime import date
a, b = input().split(',')
try:
    print(abs((date.fromisoformat(b) - date.fromisoformat(a)).days))
except ValueError:
    print('Invalid')
