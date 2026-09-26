# BUG: 在排序前只和前一個比較，不相鄰的重複刪不掉
items = input().split(',')
unique = []
for x in items:
    n = int(x)
    if len(unique) == 0 or unique[-1] != n:
        unique.append(n)
unique.sort()
print(','.join(str(n) for n in unique))
