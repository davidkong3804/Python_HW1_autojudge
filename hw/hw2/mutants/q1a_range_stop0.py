# BUG: range 的終點寫 0，少掉第一個單字（index 0）
words = input().split()
result = []
for i in range(len(words) - 1, 0, -1):
    result.append(words[i])
print(' '.join(result))
