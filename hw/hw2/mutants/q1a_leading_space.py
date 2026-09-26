# BUG: 每個單字前面都先加空白，輸出開頭多一個空白
words = input().split()
result = ''
for i in range(len(words) - 1, -1, -1):
    result = result + ' ' + words[i]
print(result)
