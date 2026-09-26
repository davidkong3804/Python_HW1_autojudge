# BUG: 切片寫成 [-1:0:-1]，終點 0 不包含，少掉第一個單字
words = input().split()
print(' '.join(words[-1:0:-1]))
