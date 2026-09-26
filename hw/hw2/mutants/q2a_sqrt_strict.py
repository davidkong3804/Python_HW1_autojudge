# BUG: 試除只到 sqrt(n) 但沒有 +1，完全平方數（4、9、25…）被當成質數
def is_prime(n):
    if n < 2:
        return False
    for i in range(2, int(n ** 0.5)):
        if n % i == 0:
            return False
    return True


n1, n2 = input().split()
primes = []
for n in range(int(n1), int(n2) + 1):
    if is_prime(n):
        primes.append(str(n))
print(','.join(primes) if primes else '0')
