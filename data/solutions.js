// 由 tools/generate_tests.py 自動產生，請勿手動修改
window.HW_SOLUTIONS = {
 "q1": "# Q1 BMI Calculator (reference solution)\ndata = input().split()\nheight = float(data[0])\nweight = float(data[1])\nbmi = weight / (height * height)\nprint(format(bmi, '.2f'))\n",
 "q2": "# Q2 Simple Calculator (reference solution)\ndata = input().split(',')\nop = data[0]\nx = float(data[1])\ny = float(data[2])\nif op == '+':\n    print(format(x + y, '.2f'))\nelif op == '-':\n    print(format(x - y, '.2f'))\nelif op == '*':\n    print(format(x * y, '.2f'))\nelse:\n    if y == 0:\n        print('Error')\n    else:\n        print(format(x / y, '.2f'))\n",
 "q3": "# Q3 Prime Number and Even or Odd Checker (reference solution)\nn = int(input())\nif n < 2:\n    prime = False\nelse:\n    prime = True\n    i = 2\n    while i * i <= n:\n        if n % i == 0:\n            prime = False\n        i = i + 1\n\nif prime:\n    answer = 'Prime'\nelse:\n    answer = 'Not Prime'\n\nif n % 2 == 0:\n    answer = answer + ',Even'\nelse:\n    answer = answer + ',Odd'\n\nprint(answer)\n",
 "q4": "# Q4 Sum of Digits and String Length (reference solution)\ns = input()\ntotal = 0\nfor ch in s:\n    if ch >= '0' and ch <= '9':\n        total = total + int(ch)\nprint(str(total) + ',' + str(len(s)))\n",
 "q5": "# Q5 Password Strength Checker (reference solution)\npassword = input()\nn = len(password)\nif n < 6:\n    print('Weak')\nelif n <= 10:\n    print('Moderate')\nelse:\n    print('Strong')\n",
 "q6": "# Q6 Find Roots (reference solution)\ndata = input().split()\na = float(data[0])\nb = float(data[1])\nc = float(data[2])\nd = (b * b - 4 * a * c) ** 0.5\nr1 = (-b + d) / (2 * a)\nr2 = (-b - d) / (2 * a)\nif r1 < r2:\n    temp = r1\n    r1 = r2\n    r2 = temp\nprint(format(r1, '.3f') + ' ' + format(r2, '.3f'))\n"
};
