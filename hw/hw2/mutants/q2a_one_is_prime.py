# BUG: 沒有處理 n < 2，把 1 當成質數
def is_prime(n):
    for i in range(2, int(n ** 0.5) + 1):
        if n % i == 0:
            return False
    return True


n1, n2 = input().split()
primes = []
for n in range(int(n1), int(n2) + 1):
    if is_prime(n):
        primes.append(str(n))
print(','.join(primes) if primes else '0')
