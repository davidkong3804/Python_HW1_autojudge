# BUG: 沒有處理 n = 1
n = int(input())
prime = True
i = 2
while i * i <= n:
    if n % i == 0:
        prime = False
    i += 1
s = 'Prime' if prime else 'Not Prime'
print(s + (',Even' if n % 2 == 0 else ',Odd'))
