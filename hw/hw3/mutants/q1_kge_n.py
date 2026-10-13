def factorial(x):
    if x == 1:
        return 1
    else:
        return (x * factorial(x-1))


while True:
    try:
        k, n = [int(t) for t in input().split()]
    except ValueError:
        print("Error! Please input two integers k and n, please input again!")
        continue
    errors = []
    if k >= n:
        errors.append("Error! k > n, please input again!")
    if k <= 0:
        errors.append("Error! k <= 0, please input again!")
    if n <= 0:
        errors.append("Error! n <= 0, please input again!")
    if errors:
        for e in errors:
            print(e)
        continue
    print(factorial(n) // (factorial(k) * factorial(n - k)))
    break
