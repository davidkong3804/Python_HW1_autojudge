# BUG: range(N1, N2) 沒有 +1，不包含右端點 N2
def is_prime(n):
    if n < 2:
        return False
    for i in range(2, int(n ** 0.5) + 1):
        if n % i == 0:
            return False
    return True


n1, n2 = input().split()
primes = []
for n in range(int(n1), int(n2)):
    if is_prime(n):
        primes.append(str(n))
print(','.join(primes) if primes else '0')
