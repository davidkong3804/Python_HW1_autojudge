# Q1 BMI Calculator (reference solution)
height, weight = input().split()
height = float(height)
weight = float(weight)

bmi = weight / (height * height)

print(format(bmi, '.2f'))
