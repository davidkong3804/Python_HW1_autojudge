# Q2b Prime Number Generator (while loop) (reference solution)
def is_prime(n):
    if n < 2:
        return False
    i = 2
    while i * i <= n:
        if n % i == 0:
            return False
        i = i + 1
    return True


def primes_between(start, end):
    primes = []
    n = start
    while n <= end:
        if is_prime(n):
            primes.append(str(n))
        n = n + 1
    return primes


n1, n2 = input().split()
primes = primes_between(int(n1), int(n2))

if len(primes) == 0:
    print('0')
else:
    print(','.join(primes))
