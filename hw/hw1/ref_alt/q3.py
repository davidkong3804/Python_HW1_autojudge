# Q3 alternative implementation (independent cross-check)
n = int(input())


def is_prime(m):
    if m < 2:
        return False
    if m in (2, 3):
        return True
    if m % 2 == 0:
        return False
    f = 3
    while f * f <= m:
        if m % f == 0:
            return False
        f += 2
    return True


print(("Prime" if is_prime(n) else "Not Prime") + "," + ("Even" if n % 2 == 0 else "Odd"))
