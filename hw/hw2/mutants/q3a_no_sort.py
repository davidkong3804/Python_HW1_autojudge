# BUG: 去重複後忘了排序，保留原本出現的順序
items = input().split(',')
unique = []
for x in items:
    if int(x) not in unique:
        unique.append(int(x))
print(','.join(str(n) for n in unique))
