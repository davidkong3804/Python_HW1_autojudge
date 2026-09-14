# Q5 Password Strength Checker (reference solution)
password = input()
n = len(password)
if n < 6:
    print('Weak')
elif n <= 10:
    print('Moderate')
else:
    print('Strong')
