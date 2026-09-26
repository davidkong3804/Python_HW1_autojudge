# Q2a Prime Number Generator (for loop) (reference solution)
def is_prime(n):
    if n < 2:
        return False
    for i in range(2, int(n ** 0.5) + 1):
        if n % i == 0:
            return False
    return True


def primes_between(start, end):
    primes = []
    for n in range(start, end + 1):
        if is_prime(n):
            primes.append(str(n))
    return primes


n1, n2 = input().split()
primes = primes_between(int(n1), int(n2))

if len(primes) == 0:
    print('0')
else:
    print(','.join(primes))
