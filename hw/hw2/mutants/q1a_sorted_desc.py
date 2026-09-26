# BUG: 把「反轉」誤會成由大到小排序
words = input().split()
result = []
for w in sorted(words, reverse=True):
    result.append(w)
print(' '.join(result))
