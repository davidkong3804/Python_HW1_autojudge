# Q3 Prime Number and Even or Odd Checker (reference solution)
n = int(input())
if n < 2:
    prime = False
else:
    prime = True
    i = 2
    while i * i <= n:
        if n % i == 0:
            prime = False
        i = i + 1

if prime:
    answer = 'Prime'
else:
    answer = 'Not Prime'

if n % 2 == 0:
    answer = answer + ',Even'
else:
    answer = answer + ',Odd'

print(answer)
