# BUG: 奇偶判斷相反
n = int(input())
prime = n >= 2
i = 2
while i * i <= n:
    if n % i == 0:
        prime = False
    i += 1
s = 'Prime' if prime else 'Not Prime'
print(s + (',Odd' if n % 2 == 0 else ',Even'))
