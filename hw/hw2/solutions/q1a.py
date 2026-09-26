# Q1a Reverse Words (loop) (reference solution)
words = input().split()

result = []
for i in range(len(words) - 1, -1, -1):
    result.append(words[i])

print(' '.join(result))
