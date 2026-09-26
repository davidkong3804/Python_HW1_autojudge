# BUG: 沒有轉成 int，用字串排序（'10' 會排在 '9' 前面）
items = input().split(',')
unique = []
for x in items:
    if x not in unique:
        unique.append(x)
unique.sort()
print(','.join(unique))
