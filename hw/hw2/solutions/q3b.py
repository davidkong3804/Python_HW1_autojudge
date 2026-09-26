# Q3b Remove Duplicates (set) (reference solution)
items = input().split(',')

numbers = []
for x in items:
    numbers.append(int(x))

unique = sorted(set(numbers))

texts = []
for n in unique:
    texts.append(str(n))
print(','.join(texts))
