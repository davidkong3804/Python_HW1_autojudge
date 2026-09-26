# BUG: 迴圈跑到 n（含），任何數都會被 n%n==0 判成不是質數
n = int(input())
prime = n >= 2
for i in range(2, n + 1):
    if n % i == 0:
        prime = False
s = 'Prime' if prime else 'Not Prime'
print(s + (',Even' if n % 2 == 0 else ',Odd'))
