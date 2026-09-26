# Q5 Convert Binary to Decimal (reference solution)
binary = input()

value = 0
for ch in binary:
    value = value * 2 + int(ch)

print(value)
