# BUG: 試除範圍寫成 range(2, n // 2)，4 = 2*2 檢查不到而被當成質數
def is_prime(n):
    if n < 2:
        return False
    for i in range(2, n // 2):
        if n % i == 0:
            return False
    return True


n1, n2 = input().split()
primes = []
for n in range(int(n1), int(n2) + 1):
    if is_prime(n):
        primes.append(str(n))
print(','.join(primes) if primes else '0')
