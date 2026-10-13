x, y = input().split()
num = int(x)
location = 1
while location < int(y):
    if num % 2 == 1:
        num = (num - 3) * 5
    else:
        num = num // 2 + 1
    location += 1
print(num)
