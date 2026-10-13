x, y = input().split()
num = int(x)
location = 1
while location <= int(y):
    if num % 2 == 1:
        num = num * 5 - 3
    else:
        num = num // 2 + 1
    location += 1
print(num)
