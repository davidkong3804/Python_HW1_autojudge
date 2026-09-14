# BUG: 迴圈條件是 i*i < n，漏掉完全平方數
n = int(input())
prime = n >= 2
i = 2
while i * i < n:
    if n % i == 0:
        prime = False
    i += 1
s = 'Prime' if prime else 'Not Prime'
print(s + (',Even' if n % 2 == 0 else ',Odd'))
