# BUG: 輸出用 ', '（逗號加空白）分隔
def is_prime(n):
    if n < 2:
        return False
    i = 2
    while i * i <= n:
        if n % i == 0:
            return False
        i += 1
    return True


n1, n2 = input().split()
n, end = int(n1), int(n2)
primes = []
while n <= end:
    if is_prime(n):
        primes.append(str(n))
    n += 1
print(', '.join(primes) if primes else '0')
