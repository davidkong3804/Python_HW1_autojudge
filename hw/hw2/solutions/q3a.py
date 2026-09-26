# Q3a Remove Duplicates (loop) (reference solution)
items = input().split(',')

unique = []
for x in items:
    n = int(x)
    if n not in unique:
        unique.append(n)

unique.sort()

texts = []
for n in unique:
    texts.append(str(n))
print(','.join(texts))
