// 由 tools/generate_tests.py 自動產生，請勿手動修改
window.AUTOJUDGE_ASSIGNMENTS = [
 {
  "id": "hw1",
  "title": "HW1",
  "subtitle": "BMI、計算機、質數、數字和、密碼強度、一元二次方程式",
  "submission": "學號_HW1.zip → 學號_HW1/q1.py ~ q6.py",
  "grading": "Q1~Q4 各 15 分、Q5~Q6 各 20 分，共 100 分；每題 5 組測資",
  "handout": "",
  "problems": [
   {
    "id": "q1",
    "name": "BMI Calculator",
    "group": "q1",
    "points": 15,
    "pointsPerTest": 3.0,
    "checks": [],
    "requirement": "",
    "keywords": "\\bbmi\\b",
    "statement": "",
    "tests": [
     {
      "n": 1,
      "input": "2 100",
      "expected": "25.00",
      "note": "整數輸入且 BMI 為整數 25 -> 必須補成 25.00",
      "kind": "special"
     },
     {
      "n": 2,
      "input": "0.5 3.2",
      "expected": "12.80",
      "note": "極小值（嬰兒）：身高 < 1，BMI 12.80",
      "kind": "special"
     },
     {
      "n": 3,
      "input": "1.7 49.5",
      "expected": "17.13",
      "note": "17.128... -> 17.13，無條件捨去會得 17.12",
      "kind": "special"
     },
     {
      "n": 4,
      "input": "3 500",
      "expected": "55.56",
      "note": "極大值：BMI 55.56，進位測試",
      "kind": "special"
     },
     {
      "n": 5,
      "input": "1.0 0.5",
      "expected": "0.50",
      "note": "體重小於 1，答案只有 0.50",
      "kind": "special"
     }
    ]
   },
   {
    "id": "q2",
    "name": "Simple Calculator",
    "group": "q2",
    "points": 15,
    "pointsPerTest": 3.0,
    "checks": [],
    "requirement": "",
    "keywords": "augend|minuend|divisor|dividend|calculator|計算機",
    "statement": "",
    "tests": [
     {
      "n": 1,
      "input": "-,3,10",
      "expected": "-7.00",
      "note": "減法且結果為負數 -7.00",
      "kind": "special"
     },
     {
      "n": 2,
      "input": "*,-2.5,4",
      "expected": "-10.00",
      "note": "乘法含負小數 -10.00",
      "kind": "special"
     },
     {
      "n": 3,
      "input": "/,7.5,0.0",
      "expected": "Error",
      "note": "除數寫成 0.0 -> 仍然是 Error（用字串比對 '0' 會錯）",
      "kind": "special"
     },
     {
      "n": 4,
      "input": "/,2,3",
      "expected": "0.67",
      "note": "0.6666... -> 0.67，無條件捨去會得 0.66",
      "kind": "special"
     },
     {
      "n": 5,
      "input": "+,-7.25,-3.75",
      "expected": "-11.00",
      "note": "加法，兩個負小數相加 -11.00",
      "kind": "special"
     }
    ]
   },
   {
    "id": "q3",
    "name": "Prime Number and Even or Odd Checker",
    "group": "q3",
    "points": 15,
    "pointsPerTest": 3.0,
    "checks": [],
    "requirement": "",
    "keywords": "\\bprime\\b|質數",
    "statement": "",
    "tests": [
     {
      "n": 1,
      "input": "1",
      "expected": "Not Prime,Odd",
      "note": "1 不是質數（最常見的漏洞），輸出 Not Prime,Odd",
      "kind": "special"
     },
     {
      "n": 2,
      "input": "2",
      "expected": "Prime,Even",
      "note": "唯一的偶質數，輸出 Prime,Even",
      "kind": "special"
     },
     {
      "n": 3,
      "input": "4",
      "expected": "Not Prime,Even",
      "note": "最小的合數，輸出 Not Prime,Even",
      "kind": "special"
     },
     {
      "n": 4,
      "input": "9",
      "expected": "Not Prime,Odd",
      "note": "奇數的完全平方，i*i<n 的迴圈會誤判為質數",
      "kind": "special"
     },
     {
      "n": 5,
      "input": "999983",
      "expected": "Prime,Odd",
      "note": "小於 10^6 的最大質數，測效能",
      "kind": "special"
     }
    ]
   },
   {
    "id": "q4",
    "name": "Sum of Digits and String Length",
    "group": "q4",
    "points": 15,
    "pointsPerTest": 3.0,
    "checks": [],
    "requirement": "",
    "keywords": "sum\\s*of\\s*digits|數字和",
    "statement": "",
    "tests": [
     {
      "n": 1,
      "input": "1234567890",
      "expected": "45,10",
      "note": "全部都是數字，和 45 長度 10",
      "kind": "special"
     },
     {
      "n": 2,
      "input": "a",
      "expected": "0,1",
      "note": "單一字母，沒有數字所以和為 0",
      "kind": "special"
     },
     {
      "n": 3,
      "input": "007Bond",
      "expected": "7,7",
      "note": "開頭是 0，數字和 7",
      "kind": "special"
     },
     {
      "n": 4,
      "input": "0000",
      "expected": "0,4",
      "note": "全部都是 0，和仍為 0（不可與『沒有數字』混淆）",
      "kind": "special"
     },
     {
      "n": 5,
      "input": "ZZZ999zzz111",
      "expected": "30,12",
      "note": "大小寫混合 + 數字，和 30 長度 12",
      "kind": "special"
     }
    ]
   },
   {
    "id": "q5",
    "name": "Password Strength Checker",
    "group": "q5",
    "points": 20,
    "pointsPerTest": 4.0,
    "checks": [],
    "requirement": "",
    "keywords": "password|weak|moderate|strong|密碼",
    "statement": "",
    "tests": [
     {
      "n": 1,
      "input": "abcde",
      "expected": "Weak",
      "note": "長度 5 邊界 -> Weak",
      "kind": "special"
     },
     {
      "n": 2,
      "input": "123456",
      "expected": "Moderate",
      "note": "長度 6 邊界 -> Moderate；全數字，用 int(input()) 會炸掉",
      "kind": "special"
     },
     {
      "n": 3,
      "input": "1234567890",
      "expected": "Moderate",
      "note": "長度 10 邊界 -> Moderate",
      "kind": "special"
     },
     {
      "n": 4,
      "input": "12345678901",
      "expected": "Strong",
      "note": "長度 11 邊界 -> Strong",
      "kind": "special"
     },
     {
      "n": 5,
      "input": "Pass word",
      "expected": "Moderate",
      "note": "含空格，長度 9；誤用 split() 會判成 Weak",
      "kind": "special"
     }
    ]
   },
   {
    "id": "q6",
    "name": "Find Roots",
    "group": "q6",
    "points": 20,
    "pointsPerTest": 4.0,
    "checks": [],
    "requirement": "",
    "keywords": "root|quadratic|判別式|sqrt",
    "statement": "",
    "tests": [
     {
      "n": 1,
      "input": "-1 0 4",
      "expected": "2.000 -2.000",
      "note": "a 為負數：沒有排序會把 -2.000 印在前面",
      "kind": "special"
     },
     {
      "n": 2,
      "input": "-2 5 3",
      "expected": "3.000 -0.500",
      "note": "a 為負數且有小數根 3.000 / -0.500",
      "kind": "special"
     },
     {
      "n": 3,
      "input": "1 5 0",
      "expected": "0.000 -5.000",
      "note": "c = 0，其中一根剛好是 0.000",
      "kind": "special"
     },
     {
      "n": 4,
      "input": "1 0 -2",
      "expected": "1.414 -1.414",
      "note": "無理根 ±1.414",
      "kind": "special"
     },
     {
      "n": 5,
      "input": "0.5 -3 4.5",
      "expected": "3.000 3.000",
      "note": "係數含小數且 b^2-4ac = 0 的重根 3.000 3.000",
      "kind": "special"
     }
    ]
   }
  ],
  "solutions": {
   "q1": "# Q1 BMI Calculator (reference solution)\nheight, weight = input().split()\nheight = float(height)\nweight = float(weight)\n\nbmi = weight / (height * height)\n\nprint(format(bmi, '.2f'))\n",
   "q2": "# Q2 Simple Calculator (reference solution)\nop, x, y = input().split(',')\nx = float(x)\ny = float(y)\n\nif op == '+':\n    print(format(x + y, '.2f'))\nelif op == '-':\n    print(format(x - y, '.2f'))\nelif op == '*':\n    print(format(x * y, '.2f'))\nelse:\n    if y == 0:\n        print('Error')\n    else:\n        print(format(x / y, '.2f'))\n",
   "q3": "# Q3 Prime Number and Even or Odd Checker (reference solution)\nn = int(input())\nif n < 2:\n    prime = False\nelse:\n    prime = True\n    i = 2\n    while i * i <= n:\n        if n % i == 0:\n            prime = False\n        i = i + 1\n\nif prime:\n    answer = 'Prime'\nelse:\n    answer = 'Not Prime'\n\nif n % 2 == 0:\n    answer = answer + ',Even'\nelse:\n    answer = answer + ',Odd'\n\nprint(answer)\n",
   "q4": "# Q4 Sum of Digits and String Length (reference solution)\ns = input()\ntotal = 0\nfor ch in s:\n    if ch >= '0' and ch <= '9':\n        total = total + int(ch)\nprint(str(total) + ',' + str(len(s)))\n",
   "q5": "# Q5 Password Strength Checker (reference solution)\npassword = input()\nn = len(password)\nif n < 6:\n    print('Weak')\nelif n <= 10:\n    print('Moderate')\nelse:\n    print('Strong')\n",
   "q6": "# Q6 Find Roots (reference solution)\na, b, c = input().split()\na = float(a)\nb = float(b)\nc = float(c)\n\nd = (b * b - 4 * a * c) ** 0.5\nr1 = (-b + d) / (2 * a)\nr2 = (-b - d) / (2 * a)\n\n# 由大到小：需要的話就交換\nif r1 < r2:\n    temp = r1\n    r1 = r2\n    r2 = temp\n\nprint(format(r1, '.3f') + ' ' + format(r2, '.3f'))\n"
  },
  "mutants": {
   "q1_round_nopad.py": "# BUG: 用 round() 直接印，不會補到小數第二位\nd = input().split()\nh = float(d[0]); w = float(d[1])\nprint(round(w / (h * h), 2))\n",
   "q1_swapped.py": "# BUG: 身高體重順序相反\nd = input().split()\nw = float(d[0]); h = float(d[1])\nprint(format(w / (h * h), '.2f'))\n",
   "q1_times2.py": "# BUG: 身高乘以 2 而不是平方\nd = input().split()\nh = float(d[0]); w = float(d[1])\nprint(format(w / (h * 2), '.2f'))\n",
   "q1_truncate.py": "# BUG: 無條件捨去而不是四捨五入\nd = input().split()\nh = float(d[0]); w = float(d[1])\nbmi = w / (h * h)\nprint(format(int(bmi * 100) / 100, '.2f'))\n",
   "q2_floordiv.py": "# BUG: 除法用 //\nd = input().split(',')\nop = d[0]; x = float(d[1]); y = float(d[2])\nif op == '+': print(format(x + y, '.2f'))\nelif op == '-': print(format(x - y, '.2f'))\nelif op == '*': print(format(x * y, '.2f'))\nelif y == 0: print('Error')\nelse: print(format(x // y, '.2f'))\n",
   "q2_int_cast.py": "# BUG: 用 int() 轉換，小數會被截掉\nd = input().split(',')\nop = d[0]; x = int(float(d[1])); y = int(float(d[2]))\nif op == '+': print(format(x + y, '.2f'))\nelif op == '-': print(format(x - y, '.2f'))\nelif op == '*': print(format(x * y, '.2f'))\nelif y == 0: print('Error')\nelse: print(format(x / y, '.2f'))\n",
   "q2_str_zero.py": "# BUG: 用字串比對判斷除數是否為 0\nd = input().split(',')\nop = d[0]\nif op == '/' and d[2] == '0':\n    print('Error')\nelse:\n    x = float(d[1]); y = float(d[2])\n    if op == '+': r = x + y\n    elif op == '-': r = x - y\n    elif op == '*': r = x * y\n    else: r = x / y\n    print(format(r, '.2f'))\n",
   "q2_wrong_operand.py": "# BUG: 檢查被除數是不是 0\nd = input().split(',')\nop = d[0]; x = float(d[1]); y = float(d[2])\nif op == '/' and x == 0:\n    print('Error')\nelse:\n    if op == '+': r = x + y\n    elif op == '-': r = x - y\n    elif op == '*': r = x * y\n    else: r = x / y\n    print(format(r, '.2f'))\n",
   "q3_one_is_prime.py": "# BUG: 沒有處理 n = 1\nn = int(input())\nprime = True\ni = 2\nwhile i * i <= n:\n    if n % i == 0:\n        prime = False\n    i += 1\ns = 'Prime' if prime else 'Not Prime'\nprint(s + (',Even' if n % 2 == 0 else ',Odd'))\n",
   "q3_parity_swapped.py": "# BUG: 奇偶判斷相反\nn = int(input())\nprime = n >= 2\ni = 2\nwhile i * i <= n:\n    if n % i == 0:\n        prime = False\n    i += 1\ns = 'Prime' if prime else 'Not Prime'\nprint(s + (',Odd' if n % 2 == 0 else ',Even'))\n",
   "q3_range_inclusive.py": "# BUG: 迴圈跑到 n（含），任何數都會被 n%n==0 判成不是質數\nn = int(input())\nprime = n >= 2\nfor i in range(2, n + 1):\n    if n % i == 0:\n        prime = False\ns = 'Prime' if prime else 'Not Prime'\nprint(s + (',Even' if n % 2 == 0 else ',Odd'))\n",
   "q3_sqrt_strict.py": "# BUG: 迴圈條件是 i*i < n，漏掉完全平方數\nn = int(input())\nprime = n >= 2\ni = 2\nwhile i * i < n:\n    if n % i == 0:\n        prime = False\n    i += 1\ns = 'Prime' if prime else 'Not Prime'\nprint(s + (',Even' if n % 2 == 0 else ',Odd'))\n",
   "q4_count_digits.py": "# BUG: 數數字個數而不是加總\ns = input()\nc = 0\nfor ch in s:\n    if ch.isdigit():\n        c += 1\nprint(str(c) + ',' + str(len(s)))\n",
   "q4_isdigit_whole.py": "# BUG: 只有整串都是數字才加總\ns = input()\nif s.isdigit():\n    t = 0\n    for ch in s:\n        t += int(ch)\nelse:\n    t = 0\nprint(str(t) + ',' + str(len(s)))\n",
   "q4_len_off_by_one.py": "# BUG: 長度少算 1\ns = input()\nt = 0\nfor ch in s:\n    if ch.isdigit():\n        t += int(ch)\nprint(str(t) + ',' + str(len(s) - 1))\n",
   "q4_ord_all.py": "# BUG: 沒有過濾英文字母，全部都拿去算\ns = input()\nt = 0\nfor ch in s:\n    t += ord(ch) - 48\nprint(str(t) + ',' + str(len(s)))\n",
   "q5_lowercase.py": "# BUG: 大小寫不符合題目要求\np = input()\nn = len(p)\nif n < 6:\n    print('weak')\nelif n <= 10:\n    print('moderate')\nelse:\n    print('strong')\n",
   "q5_split.py": "# BUG: 多此一舉用 split()，含空格的密碼會被切斷\np = input().split()[0]\nif len(p) < 6:\n    print('Weak')\nelif len(p) <= 10:\n    print('Moderate')\nelse:\n    print('Strong')\n",
   "q5_strong_at_10.py": "# BUG: 長度 10 被判成 Strong\np = input()\nif len(p) < 6:\n    print('Weak')\nelif len(p) < 10:\n    print('Moderate')\nelse:\n    print('Strong')\n",
   "q5_weak_at_6.py": "# BUG: 長度 6 被判成 Weak\np = input()\nif len(p) <= 6:\n    print('Weak')\nelif len(p) <= 10:\n    print('Moderate')\nelse:\n    print('Strong')\n",
   "q6_abs_sort.py": "# BUG: 用絕對值大小排序\nd = input().split()\na = float(d[0]); b = float(d[1]); c = float(d[2])\ns = (b * b - 4 * a * c) ** 0.5\nr = sorted([(-b + s) / (2 * a), (-b - s) / (2 * a)], key=abs, reverse=True)\nprint(format(r[0], '.3f') + ' ' + format(r[1], '.3f'))\n",
   "q6_comma.py": "# BUG: 用逗號分隔而不是空白\nd = input().split()\na = float(d[0]); b = float(d[1]); c = float(d[2])\ns = (b * b - 4 * a * c) ** 0.5\nr = sorted([(-b + s) / (2 * a), (-b - s) / (2 * a)], reverse=True)\nprint(format(r[0], '.3f') + ',' + format(r[1], '.3f'))\n",
   "q6_nosort.py": "# BUG: 沒有由大到小排序，a 為負數時順序相反\nd = input().split()\na = float(d[0]); b = float(d[1]); c = float(d[2])\ns = (b * b - 4 * a * c) ** 0.5\nprint(format((-b + s) / (2 * a), '.3f') + ' ' + format((-b - s) / (2 * a), '.3f'))\n",
   "q6_two_decimals.py": "# BUG: 印到小數第二位\nd = input().split()\na = float(d[0]); b = float(d[1]); c = float(d[2])\ns = (b * b - 4 * a * c) ** 0.5\nr = sorted([(-b + s) / (2 * a), (-b - s) / (2 * a)], reverse=True)\nprint(format(r[0], '.2f') + ' ' + format(r[1], '.2f'))\n"
  }
 },
 {
  "id": "hw2",
  "title": "HW2",
  "subtitle": "反轉單字、質數產生器、去除重複、共同元素、二進位轉十進位、日期計算",
  "submission": "學號_HW2.zip → 學號_HW2/q1a.py、q1b.py … q4b.py、q5.py、q6.py",
  "grading": "Q1~Q4 各 20 分（a、b 子題各 10 分）、Q5~Q6 各 10 分，共 100 分；每個子題／每題 5 組測資、每組 2 分",
  "handout": "hw/hw2/handout.pdf",
  "problems": [
   {
    "id": "q1a",
    "name": "Reverse Words in a Sentence (loop)",
    "group": "q1",
    "points": 10,
    "pointsPerTest": 2.0,
    "checks": [
     "loop"
    ],
    "requirement": "要用迴圈反轉單字順序",
    "keywords": "reverse\\s*words|反轉",
    "statement": "Write a program to reverse the order of words in a sentence.\na. Use a loop\nb. Use list slicing only\nHint: for b, you may use string.join",
    "tests": [
     {
      "n": 1,
      "input": "Python",
      "expected": "Python",
      "note": "只有一個單字，原樣輸出；range(len-1, 0, -1) 或 [-1:0:-1] 會少掉第一個字而印出空白",
      "kind": "special"
     },
     {
      "n": 2,
      "input": "Hello, World!",
      "expected": "World! Hello,",
      "note": "標點要跟著單字走 -> World! Hello,；整串字元反轉會得 !dlroW ,olleH",
      "kind": "special"
     },
     {
      "n": 3,
      "input": "I love Python 3",
      "expected": "3 Python love I",
      "note": "大小寫與數字原樣保留 -> 3 Python love I；誤用 sorted(reverse=True) 會排成 love Python I 3",
      "kind": "special"
     },
     {
      "n": 4,
      "input": "To be or not to be",
      "expected": "be to not or be To",
      "note": "有重複的單字且 To/to 大小寫不同，全部都要保留 -> be to not or be To",
      "kind": "special"
     },
     {
      "n": 5,
      "input": "the quick brown fox jumps over the lazy dog near the river",
      "expected": "river the near dog lazy the over jumps fox brown quick the",
      "note": "12 個單字的長句，檢查每一個單字都有反轉到、只用單一空白分隔",
      "kind": "special"
     }
    ]
   },
   {
    "id": "q1b",
    "name": "Reverse Words in a Sentence (slicing)",
    "group": "q1",
    "points": 10,
    "pointsPerTest": 2.0,
    "checks": [
     "slice",
     "no-loop"
    ],
    "requirement": "只能用 list slicing（可搭配 join），不可以用迴圈",
    "keywords": "reverse\\s*words|反轉",
    "statement": "Write a program to reverse the order of words in a sentence.\na. Use a loop\nb. Use list slicing only\nHint: for b, you may use string.join",
    "tests": [
     {
      "n": 1,
      "input": "Python",
      "expected": "Python",
      "note": "只有一個單字，原樣輸出；range(len-1, 0, -1) 或 [-1:0:-1] 會少掉第一個字而印出空白",
      "kind": "special"
     },
     {
      "n": 2,
      "input": "Hello, World!",
      "expected": "World! Hello,",
      "note": "標點要跟著單字走 -> World! Hello,；整串字元反轉會得 !dlroW ,olleH",
      "kind": "special"
     },
     {
      "n": 3,
      "input": "I love Python 3",
      "expected": "3 Python love I",
      "note": "大小寫與數字原樣保留 -> 3 Python love I；誤用 sorted(reverse=True) 會排成 love Python I 3",
      "kind": "special"
     },
     {
      "n": 4,
      "input": "To be or not to be",
      "expected": "be to not or be To",
      "note": "有重複的單字且 To/to 大小寫不同，全部都要保留 -> be to not or be To",
      "kind": "special"
     },
     {
      "n": 5,
      "input": "the quick brown fox jumps over the lazy dog near the river",
      "expected": "river the near dog lazy the over jumps fox brown quick the",
      "note": "12 個單字的長句，檢查每一個單字都有反轉到、只用單一空白分隔",
      "kind": "special"
     }
    ]
   },
   {
    "id": "q2a",
    "name": "Prime Number Generator (for)",
    "group": "q2",
    "points": 10,
    "pointsPerTest": 2.0,
    "checks": [
     "for",
     "def"
    ],
    "requirement": "要用 for 迴圈，而且要定義函式",
    "keywords": "\\bprimes?\\b|質數",
    "statement": "Create a program that generates prime numbers within a specified range using a function, where the range is between N1 and N2, including N1 and N2, if N1 or N2 are prime numbers. Moreover, N1 and N2 are positive integers, N1 < N2, and N1 and N2 are separated by a space. Please output the prime numbers in one line in ascending order and separate them by commas. If there are no prime numbers, output 0.\na. use for loop\nb. use while loop\nHint: You need to define a function in both sub-questions",
    "tests": [
     {
      "n": 1,
      "input": "1 10",
      "expected": "2,3,5,7",
      "note": "N1 = 1：1 不是質數；區間內有 4、9 兩個完全平方數 -> 2,3,5,7",
      "kind": "special"
     },
     {
      "n": 2,
      "input": "13 19",
      "expected": "13,17,19",
      "note": "兩端點 13、19 本身都是質數，必須包含 -> 13,17,19；range(N1, N2) 會漏掉 19",
      "kind": "special"
     },
     {
      "n": 3,
      "input": "24 28",
      "expected": "0",
      "note": "區間內沒有質數要輸出 0；其中 25 = 5*5，用 i*i < n 判斷會誤判為質數",
      "kind": "special"
     },
     {
      "n": 4,
      "input": "119 127",
      "expected": "127",
      "note": "119 = 7*17、121 = 11*11、125 = 5^3 都不是質數，只有右端點 127 -> 127",
      "kind": "special"
     },
     {
      "n": 5,
      "input": "180 300",
      "expected": "181,191,193,197,199,211,223,227,229,233,239,241,251,257,263,269,271,277,281,283,293",
      "note": "範圍較大，21 個質數，檢查逗號分隔且沒有多餘空白",
      "kind": "special"
     }
    ]
   },
   {
    "id": "q2b",
    "name": "Prime Number Generator (while)",
    "group": "q2",
    "points": 10,
    "pointsPerTest": 2.0,
    "checks": [
     "while",
     "def"
    ],
    "requirement": "要用 while 迴圈，而且要定義函式",
    "keywords": "\\bprimes?\\b|質數",
    "statement": "Create a program that generates prime numbers within a specified range using a function, where the range is between N1 and N2, including N1 and N2, if N1 or N2 are prime numbers. Moreover, N1 and N2 are positive integers, N1 < N2, and N1 and N2 are separated by a space. Please output the prime numbers in one line in ascending order and separate them by commas. If there are no prime numbers, output 0.\na. use for loop\nb. use while loop\nHint: You need to define a function in both sub-questions",
    "tests": [
     {
      "n": 1,
      "input": "1 10",
      "expected": "2,3,5,7",
      "note": "N1 = 1：1 不是質數；區間內有 4、9 兩個完全平方數 -> 2,3,5,7",
      "kind": "special"
     },
     {
      "n": 2,
      "input": "13 19",
      "expected": "13,17,19",
      "note": "兩端點 13、19 本身都是質數，必須包含 -> 13,17,19；range(N1, N2) 會漏掉 19",
      "kind": "special"
     },
     {
      "n": 3,
      "input": "24 28",
      "expected": "0",
      "note": "區間內沒有質數要輸出 0；其中 25 = 5*5，用 i*i < n 判斷會誤判為質數",
      "kind": "special"
     },
     {
      "n": 4,
      "input": "119 127",
      "expected": "127",
      "note": "119 = 7*17、121 = 11*11、125 = 5^3 都不是質數，只有右端點 127 -> 127",
      "kind": "special"
     },
     {
      "n": 5,
      "input": "180 300",
      "expected": "181,191,193,197,199,211,223,227,229,233,239,241,251,257,263,269,271,277,281,283,293",
      "note": "範圍較大，21 個質數，檢查逗號分隔且沒有多餘空白",
      "kind": "special"
     }
    ]
   },
   {
    "id": "q3a",
    "name": "Remove Duplicates from List (loop)",
    "group": "q3",
    "points": 10,
    "pointsPerTest": 2.0,
    "checks": [
     "loop"
    ],
    "requirement": "要用迴圈去除重複",
    "keywords": "duplicate|重複",
    "statement": "Write a program to remove duplicates from a list of numbers and output them in ascending order, where numbers are separated by commas.\na. Use a loop\nb. Use a set",
    "tests": [
     {
      "n": 1,
      "input": "10,9,100,9",
      "expected": "9,10,100",
      "note": "數值排序 9,10,100；用字串排序會得 10,100,9；兩個 9 不相鄰",
      "kind": "special"
     },
     {
      "n": 2,
      "input": "42",
      "expected": "42",
      "note": "只有一個元素，輸出後面不可以多逗號",
      "kind": "special"
     },
     {
      "n": 3,
      "input": "0,0,0,0",
      "expected": "0",
      "note": "全部重複而且是 0，只剩一個 0",
      "kind": "special"
     },
     {
      "n": 4,
      "input": "8,6,4,2",
      "expected": "2,4,6,8",
      "note": "沒有重複但順序顛倒，一定要排序 -> 2,4,6,8",
      "kind": "special"
     },
     {
      "n": 5,
      "input": "15,3,15,40,3,7,40,1",
      "expected": "1,3,7,15,40",
      "note": "多組交錯重複 + 一位數與兩位數混合 -> 1,3,7,15,40；list(set()) 沒排序會錯",
      "kind": "special"
     }
    ]
   },
   {
    "id": "q3b",
    "name": "Remove Duplicates from List (set)",
    "group": "q3",
    "points": 10,
    "pointsPerTest": 2.0,
    "checks": [
     "set"
    ],
    "requirement": "要用 set 去除重複",
    "keywords": "duplicate|重複",
    "statement": "Write a program to remove duplicates from a list of numbers and output them in ascending order, where numbers are separated by commas.\na. Use a loop\nb. Use a set",
    "tests": [
     {
      "n": 1,
      "input": "10,9,100,9",
      "expected": "9,10,100",
      "note": "數值排序 9,10,100；用字串排序會得 10,100,9；兩個 9 不相鄰",
      "kind": "special"
     },
     {
      "n": 2,
      "input": "42",
      "expected": "42",
      "note": "只有一個元素，輸出後面不可以多逗號",
      "kind": "special"
     },
     {
      "n": 3,
      "input": "0,0,0,0",
      "expected": "0",
      "note": "全部重複而且是 0，只剩一個 0",
      "kind": "special"
     },
     {
      "n": 4,
      "input": "8,6,4,2",
      "expected": "2,4,6,8",
      "note": "沒有重複但順序顛倒，一定要排序 -> 2,4,6,8",
      "kind": "special"
     },
     {
      "n": 5,
      "input": "15,3,15,40,3,7,40,1",
      "expected": "1,3,7,15,40",
      "note": "多組交錯重複 + 一位數與兩位數混合 -> 1,3,7,15,40；list(set()) 沒排序會錯",
      "kind": "special"
     }
    ]
   },
   {
    "id": "q4a",
    "name": "Finding Common Elements in Lists (loop)",
    "group": "q4",
    "points": 10,
    "pointsPerTest": 2.0,
    "checks": [
     "loop"
    ],
    "requirement": "要用迴圈找共同元素",
    "keywords": "common\\s*elements?|共同",
    "statement": "Create a program that finds and prints the common elements between two lists, sorted in the following order: digits 0~9, uppercase letters A~Z, and lowercase letters a~z. If there are no common elements, please print “N/A”. TA will give you two lines separately and there is no duplication in a line. Please use two input() to read input data. The first line is the first list and the second line is the second list. The elements in both lines are separated by commas.\na. Loop is needed\nb. Define a function to do the comparison of two lists\nHint: the codes in b. should be different with those in a.",
    "tests": [
     {
      "n": 1,
      "input": "b,A,3,z,Z\nZ,z,3,b,Q",
      "expected": "3,Z,b,z",
      "note": "數字/大寫/小寫混合，Z 與 z 都是共同元素 -> 3,Z,b,z；照第一行順序輸出會錯",
      "kind": "special"
     },
     {
      "n": 2,
      "input": "a,B,c\nA,b,C",
      "expected": "N/A",
      "note": "只差在大小寫，不算相同 -> N/A；轉小寫再比會得 a,b,c",
      "kind": "special"
     },
     {
      "n": 3,
      "input": "9,8,7,6\n6,7,8,9",
      "expected": "6,7,8,9",
      "note": "兩行元素相同但順序相反，輸出要排序 -> 6,7,8,9",
      "kind": "special"
     },
     {
      "n": 4,
      "input": "k\np,q,k",
      "expected": "k",
      "note": "第一行只有一個元素、只有一個共同元素 -> k",
      "kind": "special"
     },
     {
      "n": 5,
      "input": "0,A,a,9,Z,z\nz,Z,9,a,A,0",
      "expected": "0,9,A,Z,a,z",
      "note": "六個邊界字元全部共同 -> 0,9,A,Z,a,z；不分大小寫排序會得 0,9,A,a,Z,z",
      "kind": "special"
     }
    ]
   },
   {
    "id": "q4b",
    "name": "Finding Common Elements in Lists (function)",
    "group": "q4",
    "points": 10,
    "pointsPerTest": 2.0,
    "checks": [
     "def"
    ],
    "requirement": "要定義一個函式做比較",
    "keywords": "common\\s*elements?|共同",
    "statement": "Create a program that finds and prints the common elements between two lists, sorted in the following order: digits 0~9, uppercase letters A~Z, and lowercase letters a~z. If there are no common elements, please print “N/A”. TA will give you two lines separately and there is no duplication in a line. Please use two input() to read input data. The first line is the first list and the second line is the second list. The elements in both lines are separated by commas.\na. Loop is needed\nb. Define a function to do the comparison of two lists\nHint: the codes in b. should be different with those in a.",
    "tests": [
     {
      "n": 1,
      "input": "b,A,3,z,Z\nZ,z,3,b,Q",
      "expected": "3,Z,b,z",
      "note": "數字/大寫/小寫混合，Z 與 z 都是共同元素 -> 3,Z,b,z；照第一行順序輸出會錯",
      "kind": "special"
     },
     {
      "n": 2,
      "input": "a,B,c\nA,b,C",
      "expected": "N/A",
      "note": "只差在大小寫，不算相同 -> N/A；轉小寫再比會得 a,b,c",
      "kind": "special"
     },
     {
      "n": 3,
      "input": "9,8,7,6\n6,7,8,9",
      "expected": "6,7,8,9",
      "note": "兩行元素相同但順序相反，輸出要排序 -> 6,7,8,9",
      "kind": "special"
     },
     {
      "n": 4,
      "input": "k\np,q,k",
      "expected": "k",
      "note": "第一行只有一個元素、只有一個共同元素 -> k",
      "kind": "special"
     },
     {
      "n": 5,
      "input": "0,A,a,9,Z,z\nz,Z,9,a,A,0",
      "expected": "0,9,A,Z,a,z",
      "note": "六個邊界字元全部共同 -> 0,9,A,Z,a,z；不分大小寫排序會得 0,9,A,a,Z,z",
      "kind": "special"
     }
    ]
   },
   {
    "id": "q5",
    "name": "Convert Binary to Decimal",
    "group": "q5",
    "points": 10,
    "pointsPerTest": 2.0,
    "checks": [],
    "requirement": "",
    "keywords": "binary|decimal|二進位",
    "statement": "Write a program to convert a binary number (given as a string) to a decimal number, where the converted decimal number is positive.",
    "tests": [
     {
      "n": 1,
      "input": "1",
      "expected": "1",
      "note": "最小的正數，只有一位 -> 1",
      "kind": "special"
     },
     {
      "n": 2,
      "input": "0001101",
      "expected": "13",
      "note": "開頭有 0，不影響數值 -> 13；位元順序算反會得 88",
      "kind": "special"
     },
     {
      "n": 3,
      "input": "10000000",
      "expected": "128",
      "note": "剛好 8 位元的 2 的次方 -> 128；位元順序算反會得 1",
      "kind": "special"
     },
     {
      "n": 4,
      "input": "1100101011111110101011011011111011101111",
      "expected": "871856193263",
      "note": "40 位元、超過 32 位元範圍，而且不是迴文（位元順序算反會得到不同的數）",
      "kind": "special"
     },
     {
      "n": 5,
      "input": "1111111111111111111111111111111111111111111111111111111111111111",
      "expected": "18446744073709551615",
      "note": "64 個 1 = 2^64 - 1；用 math.pow / 浮點數累加會失去精度變成 ...616",
      "kind": "special"
     }
    ]
   },
   {
    "id": "q6",
    "name": "Date Calculation",
    "group": "q6",
    "points": 10,
    "pointsPerTest": 2.0,
    "checks": [
     "import:datetime"
    ],
    "requirement": "要使用 datetime 模組",
    "keywords": "datetime|date\\s*calculation|日期",
    "statement": "Write a program that calculates the difference between two dates using the datetime module. The date format is YYYY-MM-DD, the unit of the difference is day, and two dates are in one line, separated by comma. If the input date format is incorrect or the date doesn’t exist, please show “Invalid”\nHint 1: TAs may give you the invalid date format, such as 10-01-2026.\nHint 2: TAs may give you non-existence dates, such as 2026-09-31.\nHint 3: If the month or day is a single digit, automatically add a leading zero. Here is an example: 2023-1-2 → 2023-01-02.\nHint 4: The calculated result should always be non-negative. Remember to use the absolute value function, abs().",
    "tests": [
     {
      "n": 1,
      "input": "2000-02-29,2000-03-01",
      "expected": "1",
      "note": "2000 年是閏年（被 400 整除），2/29 合法 -> 1；以為二月最多 28 天會錯",
      "kind": "special"
     },
     {
      "n": 2,
      "input": "2023-02-29,2023-03-01",
      "expected": "Invalid",
      "note": "2023 年不是閏年，2/29 不存在 -> Invalid",
      "kind": "special"
     },
     {
      "n": 3,
      "input": "2026-3-5,2025-12-25",
      "expected": "70",
      "note": "月、日是個位數要自動補 0，而且前面的日期比較晚要取絕對值 -> 70",
      "kind": "special"
     },
     {
      "n": 4,
      "input": "2024-06-15,2024-06-15",
      "expected": "0",
      "note": "同一天相差 0 天（不是 1）",
      "kind": "special"
     },
     {
      "n": 5,
      "input": "15-08-2024,2024-08-15",
      "expected": "Invalid",
      "note": "第一個日期是 DD-MM-YYYY 格式錯誤 -> Invalid",
      "kind": "special"
     }
    ]
   }
  ],
  "solutions": {
   "q1a": "# Q1a Reverse Words (loop) (reference solution)\nwords = input().split()\n\nresult = []\nfor i in range(len(words) - 1, -1, -1):\n    result.append(words[i])\n\nprint(' '.join(result))\n",
   "q1b": "# Q1b Reverse Words (slicing) (reference solution)\nwords = input().split()\nprint(' '.join(words[::-1]))\n",
   "q2a": "# Q2a Prime Number Generator (for loop) (reference solution)\ndef is_prime(n):\n    if n < 2:\n        return False\n    for i in range(2, int(n ** 0.5) + 1):\n        if n % i == 0:\n            return False\n    return True\n\n\ndef primes_between(start, end):\n    primes = []\n    for n in range(start, end + 1):\n        if is_prime(n):\n            primes.append(str(n))\n    return primes\n\n\nn1, n2 = input().split()\nprimes = primes_between(int(n1), int(n2))\n\nif len(primes) == 0:\n    print('0')\nelse:\n    print(','.join(primes))\n",
   "q2b": "# Q2b Prime Number Generator (while loop) (reference solution)\ndef is_prime(n):\n    if n < 2:\n        return False\n    i = 2\n    while i * i <= n:\n        if n % i == 0:\n            return False\n        i = i + 1\n    return True\n\n\ndef primes_between(start, end):\n    primes = []\n    n = start\n    while n <= end:\n        if is_prime(n):\n            primes.append(str(n))\n        n = n + 1\n    return primes\n\n\nn1, n2 = input().split()\nprimes = primes_between(int(n1), int(n2))\n\nif len(primes) == 0:\n    print('0')\nelse:\n    print(','.join(primes))\n",
   "q3a": "# Q3a Remove Duplicates (loop) (reference solution)\nitems = input().split(',')\n\nunique = []\nfor x in items:\n    n = int(x)\n    if n not in unique:\n        unique.append(n)\n\nunique.sort()\n\ntexts = []\nfor n in unique:\n    texts.append(str(n))\nprint(','.join(texts))\n",
   "q3b": "# Q3b Remove Duplicates (set) (reference solution)\nitems = input().split(',')\n\nnumbers = []\nfor x in items:\n    numbers.append(int(x))\n\nunique = sorted(set(numbers))\n\ntexts = []\nfor n in unique:\n    texts.append(str(n))\nprint(','.join(texts))\n",
   "q4a": "# Q4a Finding Common Elements (loop) (reference solution)\nlist1 = input().split(',')\nlist2 = input().split(',')\n\ncommon = []\nfor x in list1:\n    if x in list2:\n        common.append(x)\n\n# 字元順序 0-9 < A-Z < a-z，剛好就是 sorted() 的預設順序\ncommon.sort()\n\nif len(common) == 0:\n    print('N/A')\nelse:\n    print(','.join(common))\n",
   "q4b": "# Q4b Finding Common Elements (function) (reference solution)\ndef common_elements(list1, list2):\n    result = []\n    for x in list1:\n        if x in list2:\n            result.append(x)\n    return sorted(result)\n\n\nlist1 = input().split(',')\nlist2 = input().split(',')\ncommon = common_elements(list1, list2)\n\nif len(common) == 0:\n    print('N/A')\nelse:\n    print(','.join(common))\n",
   "q5": "# Q5 Convert Binary to Decimal (reference solution)\nbinary = input()\n\nvalue = 0\nfor ch in binary:\n    value = value * 2 + int(ch)\n\nprint(value)\n",
   "q6": "# Q6 Date Calculation (reference solution)\nimport datetime\n\n\ndef parse_date(text):\n    # %m、%d 接受個位數（2023-1-2 視同 2023-01-02），%Y 一定要 4 位數\n    return datetime.datetime.strptime(text, '%Y-%m-%d')\n\n\nfirst, second = input().split(',')\n\ntry:\n    d1 = parse_date(first)\n    d2 = parse_date(second)\n    print(abs((d2 - d1).days))\nexcept ValueError:\n    print('Invalid')\n"
  },
  "mutants": {
   "q1a_char_reverse.py": "# BUG: 把整串字元反轉，而不是反轉單字順序\ns = input()\nr = ''\nfor ch in s:\n    r = ch + r\nprint(r)\n",
   "q1a_leading_space.py": "# BUG: 每個單字前面都先加空白，輸出開頭多一個空白\nwords = input().split()\nresult = ''\nfor i in range(len(words) - 1, -1, -1):\n    result = result + ' ' + words[i]\nprint(result)\n",
   "q1a_range_stop0.py": "# BUG: range 的終點寫 0，少掉第一個單字（index 0）\nwords = input().split()\nresult = []\nfor i in range(len(words) - 1, 0, -1):\n    result.append(words[i])\nprint(' '.join(result))\n",
   "q1a_sorted_desc.py": "# BUG: 把「反轉」誤會成由大到小排序\nwords = input().split()\nresult = []\nfor w in sorted(words, reverse=True):\n    result.append(w)\nprint(' '.join(result))\n",
   "q1b_char_reverse.py": "# BUG: 對整個字串切片 [::-1]，變成字元反轉\nprint(input()[::-1])\n",
   "q1b_print_list.py": "# BUG: 直接印出 list，沒有用 join 接回字串\nwords = input().split()\nprint(words[::-1])\n",
   "q1b_slice_stop0.py": "# BUG: 切片寫成 [-1:0:-1]，終點 0 不包含，少掉第一個單字\nwords = input().split()\nprint(' '.join(words[-1:0:-1]))\n",
   "q2a_half_range.py": "# BUG: 試除範圍寫成 range(2, n // 2)，4 = 2*2 檢查不到而被當成質數\ndef is_prime(n):\n    if n < 2:\n        return False\n    for i in range(2, n // 2):\n        if n % i == 0:\n            return False\n    return True\n\n\nn1, n2 = input().split()\nprimes = []\nfor n in range(int(n1), int(n2) + 1):\n    if is_prime(n):\n        primes.append(str(n))\nprint(','.join(primes) if primes else '0')\n",
   "q2a_one_is_prime.py": "# BUG: 沒有處理 n < 2，把 1 當成質數\ndef is_prime(n):\n    for i in range(2, int(n ** 0.5) + 1):\n        if n % i == 0:\n            return False\n    return True\n\n\nn1, n2 = input().split()\nprimes = []\nfor n in range(int(n1), int(n2) + 1):\n    if is_prime(n):\n        primes.append(str(n))\nprint(','.join(primes) if primes else '0')\n",
   "q2a_range_exclusive.py": "# BUG: range(N1, N2) 沒有 +1，不包含右端點 N2\ndef is_prime(n):\n    if n < 2:\n        return False\n    for i in range(2, int(n ** 0.5) + 1):\n        if n % i == 0:\n            return False\n    return True\n\n\nn1, n2 = input().split()\nprimes = []\nfor n in range(int(n1), int(n2)):\n    if is_prime(n):\n        primes.append(str(n))\nprint(','.join(primes) if primes else '0')\n",
   "q2a_sqrt_strict.py": "# BUG: 試除只到 sqrt(n) 但沒有 +1，完全平方數（4、9、25…）被當成質數\ndef is_prime(n):\n    if n < 2:\n        return False\n    for i in range(2, int(n ** 0.5)):\n        if n % i == 0:\n            return False\n    return True\n\n\nn1, n2 = input().split()\nprimes = []\nfor n in range(int(n1), int(n2) + 1):\n    if is_prime(n):\n        primes.append(str(n))\nprint(','.join(primes) if primes else '0')\n",
   "q2b_empty_not_zero.py": "# BUG: 沒有質數時印出空行，而不是 0\ndef is_prime(n):\n    if n < 2:\n        return False\n    i = 2\n    while i * i <= n:\n        if n % i == 0:\n            return False\n        i += 1\n    return True\n\n\nn1, n2 = input().split()\nn, end = int(n1), int(n2)\nprimes = []\nwhile n <= end:\n    if is_prime(n):\n        primes.append(str(n))\n    n += 1\nprint(','.join(primes))\n",
   "q2b_space_sep.py": "# BUG: 輸出用 ', '（逗號加空白）分隔\ndef is_prime(n):\n    if n < 2:\n        return False\n    i = 2\n    while i * i <= n:\n        if n % i == 0:\n            return False\n        i += 1\n    return True\n\n\nn1, n2 = input().split()\nn, end = int(n1), int(n2)\nprimes = []\nwhile n <= end:\n    if is_prime(n):\n        primes.append(str(n))\n    n += 1\nprint(', '.join(primes) if primes else '0')\n",
   "q2b_while_lt_end.py": "# BUG: while n < N2 用了 < 而不是 <=，不包含右端點\ndef is_prime(n):\n    if n < 2:\n        return False\n    i = 2\n    while i * i <= n:\n        if n % i == 0:\n            return False\n        i += 1\n    return True\n\n\nn1, n2 = input().split()\nn, end = int(n1), int(n2)\nprimes = []\nwhile n < end:\n    if is_prime(n):\n        primes.append(str(n))\n    n += 1\nprint(','.join(primes) if primes else '0')\n",
   "q3a_adjacent_only.py": "# BUG: 在排序前只和前一個比較，不相鄰的重複刪不掉\nitems = input().split(',')\nunique = []\nfor x in items:\n    n = int(x)\n    if len(unique) == 0 or unique[-1] != n:\n        unique.append(n)\nunique.sort()\nprint(','.join(str(n) for n in unique))\n",
   "q3a_no_sort.py": "# BUG: 去重複後忘了排序，保留原本出現的順序\nitems = input().split(',')\nunique = []\nfor x in items:\n    if int(x) not in unique:\n        unique.append(int(x))\nprint(','.join(str(n) for n in unique))\n",
   "q3a_string_sort.py": "# BUG: 沒有轉成 int，用字串排序（'10' 會排在 '9' 前面）\nitems = input().split(',')\nunique = []\nfor x in items:\n    if x not in unique:\n        unique.append(x)\nunique.sort()\nprint(','.join(unique))\n",
   "q3b_no_sort.py": "# BUG: 以為 set 會自動排好，直接 list(set(...)) 沒有排序\nnums = set(int(x) for x in input().split(','))\nprint(','.join(str(n) for n in list(nums)))\n",
   "q3b_print_set.py": "# BUG: 直接印出 sorted 之後的 list\nnums = set(int(x) for x in input().split(','))\nprint(sorted(nums))\n",
   "q3b_string_sort.py": "# BUG: set 裡放字串，sorted 變成字串排序\nprint(','.join(sorted(set(input().split(',')))))\n",
   "q4a_empty_not_na.py": "# BUG: 沒有共同元素時印出空行，而不是 N/A\nlist1 = input().split(',')\nlist2 = input().split(',')\ncommon = []\nfor x in list1:\n    if x in list2:\n        common.append(x)\ncommon.sort()\nprint(','.join(common))\n",
   "q4a_ignore_case.py": "# BUG: 先轉小寫再比較，把大小寫不同的當成相同\nlist1 = input().lower().split(',')\nlist2 = input().lower().split(',')\ncommon = []\nfor x in list1:\n    if x in list2:\n        common.append(x)\ncommon.sort()\nprint(','.join(common) if common else 'N/A')\n",
   "q4a_no_sort.py": "# BUG: 沒有排序，照第一行的順序輸出\nlist1 = input().split(',')\nlist2 = input().split(',')\ncommon = []\nfor x in list1:\n    if x in list2:\n        common.append(x)\nprint(','.join(common) if common else 'N/A')\n",
   "q4b_second_order.py": "# BUG: 照第二行的順序輸出，沒有排序\ndef common_elements(a, b):\n    result = []\n    for x in b:\n        if x in a:\n            result.append(x)\n    return result\n\n\nlist1 = input().split(',')\nlist2 = input().split(',')\nres = common_elements(list1, list2)\nprint(','.join(res) if res else 'N/A')\n",
   "q4b_sort_lower.py": "# BUG: 排序時用 key=str.lower，不分大小寫，大寫沒有全部排在小寫前面\ndef common_elements(a, b):\n    return sorted([x for x in a if x in b], key=str.lower)\n\n\nlist1 = input().split(',')\nlist2 = input().split(',')\nres = common_elements(list1, list2)\nprint(','.join(res) if res else 'N/A')\n",
   "q5_int_direct.py": "# BUG: 直接 int(s)，把二進位字串當成十進位數字\nprint(int(input()))\n",
   "q5_math_pow.py": "# BUG: 用 math.pow（浮點數）累加，位數很多時失去精度\nimport math\ns = input()\ntotal = 0\nn = len(s)\nfor i in range(n):\n    total = total + int(s[i]) * math.pow(2, n - 1 - i)\nprint(int(total))\n",
   "q5_power_plus1.py": "# BUG: 次方多算 1（從 2^1 開始），答案變兩倍\ns = input()\ntotal = 0\nn = len(s)\nfor i in range(n):\n    total = total + int(s[i]) * 2 ** (n - i)\nprint(total)\n",
   "q5_reversed_bits.py": "# BUG: 從左邊開始算 2 的次方，位元權重反了\ns = input()\ntotal = 0\nfor i in range(len(s)):\n    total = total + int(s[i]) * 2 ** i\nprint(total)\n",
   "q6_feb_28.py": "# BUG: 自己檢查日期時以為二月最多 28 天，閏年 2/29 被判成 Invalid\nimport datetime\n\n\ndef parse(text):\n    y, m, d = text.split('-')\n    if len(y) != 4 or (int(m) == 2 and int(d) > 28):\n        raise ValueError\n    return datetime.date(int(y), int(m), int(d))\n\n\na, b = input().split(',')\ntry:\n    print(abs((parse(b) - parse(a)).days))\nexcept ValueError:\n    print('Invalid')\n",
   "q6_fromisoformat.py": "# BUG: 用 date.fromisoformat，月日是個位數（沒補 0）時會被當成格式錯誤\nfrom datetime import date\na, b = input().split(',')\ntry:\n    print(abs((date.fromisoformat(b) - date.fromisoformat(a)).days))\nexcept ValueError:\n    print('Invalid')\n",
   "q6_inclusive.py": "# BUG: 把頭尾兩天都算進去，天數多 1\nimport datetime\na, b = input().split(',')\ntry:\n    d1 = datetime.datetime.strptime(a, '%Y-%m-%d')\n    d2 = datetime.datetime.strptime(b, '%Y-%m-%d')\n    print(abs((d2 - d1).days) + 1)\nexcept ValueError:\n    print('Invalid')\n",
   "q6_no_abs.py": "# BUG: 沒有取絕對值，前面日期比較晚時印出負數\nimport datetime\na, b = input().split(',')\ntry:\n    d1 = datetime.datetime.strptime(a, '%Y-%m-%d')\n    d2 = datetime.datetime.strptime(b, '%Y-%m-%d')\n    print((d2 - d1).days)\nexcept ValueError:\n    print('Invalid')\n",
   "q6_no_try.py": "# BUG: 沒有處理不合法的日期，直接當掉（沒有輸出 Invalid）\nimport datetime\na, b = input().split(',')\nd1 = datetime.datetime.strptime(a, '%Y-%m-%d')\nd2 = datetime.datetime.strptime(b, '%Y-%m-%d')\nprint(abs((d2 - d1).days))\n"
  }
 },
 {
  "id": "hw3",
  "title": "HW3",
  "subtitle": "組合數 C(n, k)、讀寫檔案的計算機、讀檔找最高總分、數列的第 y 個數",
  "submission": "學號_HW3.zip → 學號_HW3/q1.py ~ q4.py",
  "grading": "Q1~Q4 各 25 分，共 100 分；每題 10 組測資、每組 2.5 分",
  "handout": "hw/hw3/handout.pdf",
  "problems": [
   {
    "id": "q1",
    "name": "Combination",
    "group": "q1",
    "points": 25,
    "pointsPerTest": 2.5,
    "checks": [
     "def",
     "loop"
    ],
    "requirement": "要用題目給的 factorial 函式計算，並用迴圈重複讀到正確的 k、n 為止",
    "keywords": "factorial|combination|階乘|組合",
    "statement": "Combination: use the given recursive factorial(x) to compute C(n, k) = n! / (k!(n-k)!), where k, n and the result are positive integers, 0 < k < n. k and n are input in one line separated by a space, in the order k n. Check 0 < k < n until the user inputs correct k and n; the program CANNOT be interrupted by any input error.\nk > n  -> Error! k > n, please input again!\nk = n  -> Error! k = n, please input again!\nk <= 0 -> Error! k <= 0, please input again!\nn <= 0 -> Error! n <= 0, please input again!\nIf there are multiple errors, output them in the above order.",
    "tests": [
     {
      "n": 1,
      "input": "1 2",
      "expected": "2",
      "note": "最小的合法輸入 k = 1、n = 2 -> 2",
      "kind": "special"
     },
     {
      "n": 2,
      "input": "5 10",
      "expected": "252",
      "note": "一般情況 C(10, 5) = 252；用 / 相除會印成 252.0",
      "kind": "special"
     },
     {
      "n": 3,
      "input": "9 10",
      "expected": "10",
      "note": "k = n - 1，n - k = 1，factorial(1) 是遞迴的終點 -> 10",
      "kind": "special"
     },
     {
      "n": 4,
      "input": "12 9\n9 12",
      "expected": "Error! k > n, please input again!\n220",
      "note": "k > n 先報錯、重新輸入後才算 -> 220；只讀一次就結束的程式會漏掉答案",
      "kind": "special"
     },
     {
      "n": 5,
      "input": "7 7\n3 7",
      "expected": "Error! k = n, please input again!\n35",
      "note": "k = n 要報錯（不是 k > n）-> 35",
      "kind": "special"
     },
     {
      "n": 6,
      "input": "0 5\n2 5",
      "expected": "Error! k <= 0, please input again!\n10",
      "note": "k = 0 是 k <= 0 的邊界，要報錯；寫成 k < 0 會讓 0 通過並算出 1（或遞迴爆掉）",
      "kind": "special"
     },
     {
      "n": 7,
      "input": "-2 -2\n2 4",
      "expected": "Error! k = n, please input again!\nError! k <= 0, please input again!\nError! n <= 0, please input again!\n6",
      "note": "k = n 而且兩個都 <= 0：三行錯誤要全部依序印出 -> 6；用 elif 只會印第一行",
      "kind": "special"
     },
     {
      "n": 8,
      "input": "4 0\n3 6",
      "expected": "Error! k > n, please input again!\nError! n <= 0, please input again!\n20",
      "note": "k > n 和 n <= 0 同時成立（n = 0 是邊界），依序印兩行 -> 20",
      "kind": "special"
     },
     {
      "n": 9,
      "input": "-5 -9\n4 8",
      "expected": "Error! k > n, please input again!\nError! k <= 0, please input again!\nError! n <= 0, please input again!\n70",
      "note": "-5 > -9 所以也是 k > n，三個錯誤依「k > n、k <= 0、n <= 0」的順序 -> 70",
      "kind": "special"
     },
     {
      "n": 10,
      "input": "8 3\n5 5\n0 1\n20 40",
      "expected": "Error! k > n, please input again!\nError! k = n, please input again!\nError! k <= 0, please input again!\n137846528820",
      "note": "連續三次錯誤（k > n；k = n；k <= 0）才輸入正確 -> 137846528820，結果超過 32 位元",
      "kind": "special"
     }
    ]
   },
   {
    "id": "q2",
    "name": "Extended Simple Calculator",
    "group": "q2",
    "points": 25,
    "pointsPerTest": 2.5,
    "checks": [
     "try"
    ],
    "requirement": "要用 try / except 處理檔案、格式、計算的例外",
    "keywords": "calculator|operator|計算機",
    "statement": "Extended Simple Calculator: the input is \"input file name,output file name\" in one line. Read \"number1 operator number2\" (separated by spaces; numbers may be float; operators + - * /) from the input file and write the whole calculated result (e.g. 2, 3.187343, 78.63) to the output file. If successful, show \"Successfully\". Errors shown on the screen: File not found / Operator error / Cannot divide by zero / Operator lost (number1 number2) / Number1 lost (operator number2) / Number2 lost (number1 operator). \"Execution completed\" is always shown at the end. If the result cannot be calculated, the output file is still generated but empty.",
    "tests": [
     {
      "n": 1,
      "input": "calc_neg.txt,result_neg.txt",
      "expected": "Successfully\nExecution completed\n=== result_neg.txt ===\n-19",
      "note": "負數與減法：-7 - 12 = -19；全部轉成 float 會寫成 -19.0；用 isdigit() 判斷數字會把 -7 當成不是數字",
      "kind": "special",
      "files": {
       "calc_neg.txt": "-7 - 12"
      }
     },
     {
      "n": 2,
      "input": "half.txt,half_out.txt",
      "expected": "Successfully\nExecution completed\n=== half_out.txt ===\n3.5",
      "note": "整數相除但結果有小數 7 / 2 = 3.5；用 // 會得 3",
      "kind": "special",
      "files": {
       "half.txt": "7 / 2"
      }
     },
     {
      "n": 3,
      "input": "float_mul.txt,float_out.txt",
      "expected": "Successfully\nExecution completed\n=== float_out.txt ===\n3.375",
      "note": "兩個數字都是小數 1.5 * 2.25 = 3.375；用 int() 轉數字會出錯",
      "kind": "special",
      "files": {
       "float_mul.txt": "1.5 * 2.25"
      }
     },
     {
      "n": 4,
      "input": "third.txt,third_out.txt",
      "expected": "Successfully\nExecution completed\n=== third_out.txt ===\n3.3333333333333335",
      "note": "結果要寫完整的計算結果 10 / 3 = 3.3333333333333335，不可以四捨五入到兩位",
      "kind": "special",
      "files": {
       "third.txt": "10 / 3"
      }
     },
     {
      "n": 5,
      "input": "no_such_file.txt,out_missing.txt",
      "expected": "File not found\nExecution completed\n=== out_missing.txt（空檔案）===",
      "note": "輸入檔不存在 -> File not found + Execution completed；輸出檔仍然要產生（空檔案）",
      "kind": "special",
      "files": {}
     },
     {
      "n": 6,
      "input": "op_mod.txt,op_mod_out.txt",
      "expected": "Operator error\nExecution completed\n=== op_mod_out.txt（空檔案）===",
      "note": "% 不是 + - * / -> Operator error；輸出檔是空的，不可以印 Successfully",
      "kind": "special",
      "files": {
       "op_mod.txt": "4 % 2"
      }
     },
     {
      "n": 7,
      "input": "zero.txt,zero_out.txt",
      "expected": "Cannot divide by zero\nExecution completed\n=== zero_out.txt（空檔案）===",
      "note": "除以 0 -> Cannot divide by zero（要接住 ZeroDivisionError），輸出檔是空的",
      "kind": "special",
      "files": {
       "zero.txt": "9 / 0"
      }
     },
     {
      "n": 8,
      "input": "no_op.txt,no_op_out.txt",
      "expected": "Operator lost\nExecution completed\n=== no_op_out.txt（空檔案）===",
      "note": "只有 number1 number2 -> Operator lost",
      "kind": "special",
      "files": {
       "no_op.txt": "8 5"
      }
     },
     {
      "n": 9,
      "input": "no_num1.txt,no_num1_out.txt",
      "expected": "Number1 lost\nExecution completed\n=== no_num1_out.txt（空檔案）===",
      "note": "只有 operator number2 -> Number1 lost；和 Number2 lost 搞反會錯",
      "kind": "special",
      "files": {
       "no_num1.txt": "* 6"
      }
     },
     {
      "n": 10,
      "input": "no_num2.txt,no_num2_out.txt",
      "expected": "Number2 lost\nExecution completed\n=== no_num2_out.txt（空檔案）===",
      "note": "只有 number1 operator -> Number2 lost；Execution completed 不管有沒有錯都要印",
      "kind": "special",
      "files": {
       "no_num2.txt": "6 +"
      }
     }
    ],
    "fileMode": "write"
   },
   {
    "id": "q3",
    "name": "Calculate and Search",
    "group": "q3",
    "points": 25,
    "pointsPerTest": 2.5,
    "checks": [],
    "requirement": "",
    "keywords": "score|highest|total|成績|總分",
    "statement": "Calculate and Search: the input is a .txt file name (utf-8). The first line is N (1 <= N <= 100); lines 2 to N+1 are \"No. score1 score2 score3\" separated by a space (integers >= 0). Print the No. of the student with the highest total score and the total, separated by a comma. There is only one highest total score.",
    "tests": [
     {
      "n": 1,
      "input": "one.txt",
      "expected": "7,0",
      "note": "N = 1 而且三科都是 0 -> 7,0；最高分的初始值設成 0 又用 > 比較，會找不到人",
      "kind": "special",
      "files": {
       "one.txt": "1\n7 0 0 0"
      }
     },
     {
      "n": 2,
      "input": "first_best.txt",
      "expected": "1,280",
      "note": "最高總分是第一位學生 -> 1,280；只記最後一位或從第二位開始比都會錯",
      "kind": "special",
      "files": {
       "first_best.txt": "4\n1 95 90 95\n2 60 70 80\n3 88 72 90\n4 75 80 85"
      }
     },
     {
      "n": 3,
      "input": "last_best.txt",
      "expected": "6,288",
      "note": "最高總分是最後一位 -> 6,288；range(1, N) 少讀一行會漏掉他",
      "kind": "special",
      "files": {
       "last_best.txt": "6\n1 70 73 62\n2 63 90 92\n3 73 68 60\n4 83 73 98\n5 61 99 67\n6 99 99 90"
      }
     },
     {
      "n": 4,
      "input": "ids.txt",
      "expected": "305,284",
      "note": "學號不是 1、2、3… 要印檔案裡的 No.（305），不是第幾行",
      "kind": "special",
      "files": {
       "ids.txt": "3\n17 80 80 80\n305 90 95 99\n2024 85 70 60"
      }
     },
     {
      "n": 5,
      "input": "str_trap.txt",
      "expected": "2,300",
      "note": "總分 95 和 300：用字串比大小 \"95\" > \"300\" 會選錯人 -> 2,300",
      "kind": "special",
      "files": {
       "str_trap.txt": "3\n1 30 30 35\n2 100 100 100\n3 40 30 20"
      }
     },
     {
      "n": 6,
      "input": "subject_trap.txt",
      "expected": "3,255",
      "note": "單科最高（第 1 號第一科 100 分）不是總分最高 -> 3,255；只比第一科會錯",
      "kind": "special",
      "files": {
       "subject_trap.txt": "3\n1 100 50 50\n2 60 90 70\n3 85 85 85"
      }
     },
     {
      "n": 7,
      "input": "three_cols.txt",
      "expected": "2,245",
      "note": "要三科加總：只加前兩科會選到第 1 號（190），正確是 2,245",
      "kind": "special",
      "files": {
       "three_cols.txt": "3\n1 95 95 10\n2 80 80 85\n3 60 70 90"
      }
     },
     {
      "n": 8,
      "input": "close.txt",
      "expected": "3,241",
      "note": "總分只差 1 分（241 vs 240），最高在中間 -> 3,241",
      "kind": "special",
      "files": {
       "close.txt": "5\n1 80 80 80\n2 79 81 79\n3 81 80 80\n4 80 79 81\n5 70 70 70"
      }
     },
     {
      "n": 9,
      "input": "over100.txt",
      "expected": "2,1200",
      "note": "題目只說分數是 >= 0 的整數，沒說上限：總分 1200 的同學 -> 2,1200",
      "kind": "special",
      "files": {
       "over100.txt": "2\n1 300 300 300\n2 400 400 400"
      }
     },
     {
      "n": 10,
      "input": "class100.txt",
      "expected": "63,297",
      "note": "N = 100（題目上限），最高分在第 63 位 -> 63,297",
      "kind": "special",
      "files": {
       "class100.txt": "100\n1 52 49 91\n2 95 72 75\n3 70 75 49\n4 85 69 86\n5 85 64 60\n6 37 87 70\n7 94 81 70\n8 63 84 55\n9 39 72 57\n10 44 78 42\n11 31 36 77\n12 65 80 45\n13 85 78 41\n14 46 48 64\n15 76 37 77\n16 47 37 56\n17 31 67 30\n18 30 64 41\n19 77 92 42\n20 75 30 63\n21 30 44 91\n22 32 57 31\n23 51 57 70\n24 59 77 66\n25 30 57 48\n26 42 57 60\n27 42 57 76\n28 63 95 49\n29 57 48 32\n30 32 88 90\n31 90 89 31\n32 90 88 68\n33 63 58 66\n34 39 80 92\n35 77 77 49\n36 84 83 93\n37 66 92 92\n38 80 59 78\n39 85 69 74\n40 80 43 58\n41 88 52 56\n42 79 36 49\n43 75 71 65\n44 92 60 85\n45 78 39 72\n46 45 79 95\n47 36 30 48\n48 51 83 69\n49 68 58 71\n50 87 42 67\n51 61 89 77\n52 53 39 55\n53 77 44 33\n54 55 89 60\n55 42 74 89\n56 52 71 50\n57 82 55 62\n58 44 35 50\n59 85 70 42\n60 84 68 36\n61 42 51 81\n62 35 45 86\n63 100 99 98\n64 53 40 94\n65 81 42 62\n66 87 59 69\n67 64 52 51\n68 59 36 94\n69 43 38 59\n70 74 74 90\n71 81 72 93\n72 37 36 89\n73 30 56 53\n74 72 73 85\n75 83 40 51\n76 61 35 33\n77 78 88 87\n78 67 48 61\n79 77 51 55\n80 46 78 45\n81 53 44 60\n82 53 52 52\n83 65 88 38\n84 37 78 53\n85 79 50 93\n86 41 37 77\n87 86 65 62\n88 72 51 92\n89 88 75 34\n90 69 64 36\n91 79 35 72\n92 64 66 43\n93 30 93 46\n94 70 65 40\n95 32 80 82\n96 46 69 53\n97 48 88 53\n98 34 32 71\n99 85 67 78\n100 38 32 85"
      }
     }
    ],
    "fileMode": "read"
   },
   {
    "id": "q4",
    "name": "Loop and Condition",
    "group": "q4",
    "points": 25,
    "pointsPerTest": 2.5,
    "checks": [
     "loop"
    ],
    "requirement": "要用迴圈產生數列",
    "keywords": "series|location|數列",
    "statement": "Loop and Condition: x and y in one line separated by a space (positive integers). x is the first number of a series and y is a location. If the number is odd, multiply it by 5 and then minus 3; if it is even, divide it by 2 and then add 1. Print the number at location y (location = index + 1).",
    "tests": [
     {
      "n": 1,
      "input": "7 1",
      "expected": "7",
      "note": "y = 1：一步都不用走，直接印 x -> 7；迴圈多跑一次會印 32",
      "kind": "special"
     },
     {
      "n": 2,
      "input": "3 2",
      "expected": "12",
      "note": "奇數一步：3 * 5 - 3 = 12；寫成 5 * (3 - 3) 會得 0",
      "kind": "special"
     },
     {
      "n": 3,
      "input": "8 2",
      "expected": "5",
      "note": "偶數一步：8 / 2 + 1 = 5；用 / 會印 5.0",
      "kind": "special"
     },
     {
      "n": 4,
      "input": "1 3",
      "expected": "2",
      "note": "1 是奇數 -> 2 -> 2（2 / 2 + 1 = 2 停在原地）",
      "kind": "special"
     },
     {
      "n": 5,
      "input": "6 4",
      "expected": "12",
      "note": "6 -> 4 -> 3 -> 12：偶、偶、奇交錯",
      "kind": "special"
     },
     {
      "n": 6,
      "input": "10 3",
      "expected": "4",
      "note": "10 -> 6 -> 4，連續兩次偶數規則，用 / 會印 4.0",
      "kind": "special"
     },
     {
      "n": 7,
      "input": "13 7",
      "expected": "22",
      "note": "13 -> 62 -> 32 -> 17 -> 82 -> 42 -> 22，奇偶規則寫反會完全不同",
      "kind": "special"
     },
     {
      "n": 8,
      "input": "11 14",
      "expected": "132",
      "note": "數字會先變大到 2082 再掉回來，第 14 個是 132",
      "kind": "special"
     },
     {
      "n": 9,
      "input": "2 100",
      "expected": "2",
      "note": "2 是固定點，位置 100 還是 2；迴圈次數多也不能出錯",
      "kind": "special"
     },
     {
      "n": 10,
      "input": "999 30",
      "expected": "1892",
      "note": "起始值是三位數的奇數，走 29 步",
      "kind": "special"
     }
    ]
   }
  ],
  "solutions": {
   "q1": "def factorial(x):\n    if x == 1:\n        return 1\n    else:\n        return (x * factorial(x-1))\n\n\nwhile True:\n    try:\n        k, n = [int(t) for t in input().split()]\n    except ValueError:\n        print(\"Error! Please input two integers k and n, please input again!\")\n        continue\n    errors = []\n    if k > n:\n        errors.append(\"Error! k > n, please input again!\")\n    if k == n:\n        errors.append(\"Error! k = n, please input again!\")\n    if k <= 0:\n        errors.append(\"Error! k <= 0, please input again!\")\n    if n <= 0:\n        errors.append(\"Error! n <= 0, please input again!\")\n    if errors:\n        for e in errors:\n            print(e)\n        continue\n    print(factorial(n) // (factorial(k) * factorial(n - k)))\n    break\n",
   "q2": "OPS = (\"+\", \"-\", \"*\", \"/\")\n\n\ndef to_number(tok):\n    \"\"\"整數保持整數（3 + 2 -> 5），有小數點才是 float。不是數字丟 ValueError。\"\"\"\n    try:\n        return int(tok)\n    except ValueError:\n        return float(tok)\n\n\ndef is_number(tok):\n    try:\n        to_number(tok)\n        return True\n    except ValueError:\n        return False\n\n\nnames = input().split(\",\")\nin_name, out_name = names[0], names[1]\nfout = open(out_name, \"w\", encoding=\"utf-8\")\ntry:\n    with open(in_name, encoding=\"utf-8\") as fin:\n        parts = fin.read().split()\n    if len(parts) == 3:\n        if parts[1] not in OPS:\n            print(\"Operator error\")\n        else:\n            a, op, b = to_number(parts[0]), parts[1], to_number(parts[2])\n            if op == \"+\":\n                result = a + b\n            elif op == \"-\":\n                result = a - b\n            elif op == \"*\":\n                result = a * b\n            else:\n                result = a / b\n            fout.write(str(result))\n            print(\"Successfully\")\n    elif len(parts) == 2:\n        if is_number(parts[0]) and is_number(parts[1]):\n            print(\"Operator lost\")\n        elif parts[0] in OPS:\n            print(\"Number1 lost\")\n        elif parts[1] in OPS:\n            print(\"Number2 lost\")\n        else:\n            print(\"Format error\")\n    else:\n        print(\"Format error\")\nexcept FileNotFoundError:\n    print(\"File not found\")\nexcept ZeroDivisionError:\n    print(\"Cannot divide by zero\")\nexcept ValueError:\n    print(\"Format error\")\nfinally:\n    fout.close()\n    print(\"Execution completed\")\n",
   "q3": "name = input()\nwith open(name, encoding=\"utf-8\") as fh:\n    lines = fh.read().split(\"\\n\")\n\nn = int(lines[0])\nbest_no, best_total = None, None\nfor line in lines[1:n + 1]:\n    cols = line.split()\n    total = int(cols[1]) + int(cols[2]) + int(cols[3])\n    if best_total is None or total > best_total:\n        best_no, best_total = cols[0], total\nprint(str(best_no) + \",\" + str(best_total))\n",
   "q4": "x, y = input().split()\nnum = int(x)\nlocation = 1\nwhile location < int(y):\n    if num % 2 == 1:\n        num = num * 5 - 3\n    else:\n        num = num // 2 + 1\n    location += 1\nprint(num)\n"
  },
  "mutants": {
   "q1_elif_chain.py": "def factorial(x):\n    if x == 1:\n        return 1\n    else:\n        return (x * factorial(x-1))\n\n\nwhile True:\n    try:\n        k, n = [int(t) for t in input().split()]\n    except ValueError:\n        print(\"Error! Please input two integers k and n, please input again!\")\n        continue\n    errors = []\n    if k > n:\n        errors.append(\"Error! k > n, please input again!\")\n    elif k == n:\n        errors.append(\"Error! k = n, please input again!\")\n    elif k <= 0:\n        errors.append(\"Error! k <= 0, please input again!\")\n    elif n <= 0:\n        errors.append(\"Error! n <= 0, please input again!\")\n    if errors:\n        for e in errors:\n            print(e)\n        continue\n    print(factorial(n) // (factorial(k) * factorial(n - k)))\n    break\n",
   "q1_float_div.py": "def factorial(x):\n    if x == 1:\n        return 1\n    else:\n        return (x * factorial(x-1))\n\n\nwhile True:\n    try:\n        k, n = [int(t) for t in input().split()]\n    except ValueError:\n        print(\"Error! Please input two integers k and n, please input again!\")\n        continue\n    errors = []\n    if k > n:\n        errors.append(\"Error! k > n, please input again!\")\n    if k == n:\n        errors.append(\"Error! k = n, please input again!\")\n    if k <= 0:\n        errors.append(\"Error! k <= 0, please input again!\")\n    if n <= 0:\n        errors.append(\"Error! n <= 0, please input again!\")\n    if errors:\n        for e in errors:\n            print(e)\n        continue\n    print(factorial(n) / (factorial(k) * factorial(n - k)))\n    break\n",
   "q1_k_lt_0.py": "def factorial(x):\n    if x == 1:\n        return 1\n    else:\n        return (x * factorial(x-1))\n\n\nwhile True:\n    try:\n        k, n = [int(t) for t in input().split()]\n    except ValueError:\n        print(\"Error! Please input two integers k and n, please input again!\")\n        continue\n    errors = []\n    if k > n:\n        errors.append(\"Error! k > n, please input again!\")\n    if k == n:\n        errors.append(\"Error! k = n, please input again!\")\n    if k < 0:\n        errors.append(\"Error! k <= 0, please input again!\")\n    if n <= 0:\n        errors.append(\"Error! n <= 0, please input again!\")\n    if errors:\n        for e in errors:\n            print(e)\n        continue\n    print(factorial(n) // (factorial(k) * factorial(n - k)))\n    break\n",
   "q1_kge_n.py": "def factorial(x):\n    if x == 1:\n        return 1\n    else:\n        return (x * factorial(x-1))\n\n\nwhile True:\n    try:\n        k, n = [int(t) for t in input().split()]\n    except ValueError:\n        print(\"Error! Please input two integers k and n, please input again!\")\n        continue\n    errors = []\n    if k >= n:\n        errors.append(\"Error! k > n, please input again!\")\n    if k <= 0:\n        errors.append(\"Error! k <= 0, please input again!\")\n    if n <= 0:\n        errors.append(\"Error! n <= 0, please input again!\")\n    if errors:\n        for e in errors:\n            print(e)\n        continue\n    print(factorial(n) // (factorial(k) * factorial(n - k)))\n    break\n",
   "q1_no_retry.py": "def factorial(x):\n    if x == 1:\n        return 1\n    else:\n        return (x * factorial(x-1))\n\n\nwhile True:\n    try:\n        k, n = [int(t) for t in input().split()]\n    except ValueError:\n        print(\"Error! Please input two integers k and n, please input again!\")\n        continue\n    errors = []\n    if k > n:\n        errors.append(\"Error! k > n, please input again!\")\n    if k == n:\n        errors.append(\"Error! k = n, please input again!\")\n    if k <= 0:\n        errors.append(\"Error! k <= 0, please input again!\")\n    if n <= 0:\n        errors.append(\"Error! n <= 0, please input again!\")\n    if errors:\n        for e in errors:\n            print(e)\n        break\n    print(factorial(n) // (factorial(k) * factorial(n - k)))\n    break\n",
   "q1_order_n_first.py": "def factorial(x):\n    if x == 1:\n        return 1\n    else:\n        return (x * factorial(x-1))\n\n\nwhile True:\n    try:\n        k, n = [int(t) for t in input().split()]\n    except ValueError:\n        print(\"Error! Please input two integers k and n, please input again!\")\n        continue\n    errors = []\n    if k > n:\n        errors.append(\"Error! k > n, please input again!\")\n    if k == n:\n        errors.append(\"Error! k = n, please input again!\")\n    if n <= 0:\n        errors.append(\"Error! n <= 0, please input again!\")\n    if k <= 0:\n        errors.append(\"Error! k <= 0, please input again!\")\n    if errors:\n        for e in errors:\n            print(e)\n        continue\n    print(factorial(n) // (factorial(k) * factorial(n - k)))\n    break\n",
   "q1_read_n_k.py": "def factorial(x):\n    if x == 1:\n        return 1\n    else:\n        return (x * factorial(x-1))\n\n\nwhile True:\n    try:\n        n, k = [int(t) for t in input().split()]\n    except ValueError:\n        print(\"Error! Please input two integers k and n, please input again!\")\n        continue\n    errors = []\n    if k > n:\n        errors.append(\"Error! k > n, please input again!\")\n    if k == n:\n        errors.append(\"Error! k = n, please input again!\")\n    if k <= 0:\n        errors.append(\"Error! k <= 0, please input again!\")\n    if n <= 0:\n        errors.append(\"Error! n <= 0, please input again!\")\n    if errors:\n        for e in errors:\n            print(e)\n        continue\n    print(factorial(n) // (factorial(k) * factorial(n - k)))\n    break\n",
   "q2_append_newline_text.py": "OPS = (\"+\", \"-\", \"*\", \"/\")\n\n\ndef to_number(tok):\n    \"\"\"整數保持整數（3 + 2 -> 5），有小數點才是 float。不是數字丟 ValueError。\"\"\"\n    try:\n        return int(tok)\n    except ValueError:\n        return float(tok)\n\n\ndef is_number(tok):\n    try:\n        to_number(tok)\n        return True\n    except ValueError:\n        return False\n\n\nnames = input().split(\",\")\nin_name, out_name = names[0], names[1]\nfout = open(out_name, \"w\", encoding=\"utf-8\")\ntry:\n    with open(in_name, encoding=\"utf-8\") as fin:\n        parts = fin.read().split()\n    if len(parts) == 3:\n        if parts[1] not in OPS:\n            print(\"Operator error\")\n        else:\n            a, op, b = to_number(parts[0]), parts[1], to_number(parts[2])\n            if op == \"+\":\n                result = a + b\n            elif op == \"-\":\n                result = a - b\n            elif op == \"*\":\n                result = a * b\n            else:\n                result = a / b\n            fout.write(\"Result: \" + str(result))\n            print(\"Successfully\")\n    elif len(parts) == 2:\n        if is_number(parts[0]) and is_number(parts[1]):\n            print(\"Operator lost\")\n        elif parts[0] in OPS:\n            print(\"Number1 lost\")\n        elif parts[1] in OPS:\n            print(\"Number2 lost\")\n        else:\n            print(\"Format error\")\n    else:\n        print(\"Format error\")\nexcept FileNotFoundError:\n    print(\"File not found\")\nexcept ZeroDivisionError:\n    print(\"Cannot divide by zero\")\nexcept ValueError:\n    print(\"Format error\")\nfinally:\n    fout.close()\n    print(\"Execution completed\")\n",
   "q2_float_always.py": "OPS = (\"+\", \"-\", \"*\", \"/\")\n\n\ndef to_number(tok):\n    \"\"\"整數保持整數（3 + 2 -> 5），有小數點才是 float。不是數字丟 ValueError。\"\"\"\n    try:\n        return float(tok)\n    except ValueError:\n        return float(tok)\n\n\ndef is_number(tok):\n    try:\n        to_number(tok)\n        return True\n    except ValueError:\n        return False\n\n\nnames = input().split(\",\")\nin_name, out_name = names[0], names[1]\nfout = open(out_name, \"w\", encoding=\"utf-8\")\ntry:\n    with open(in_name, encoding=\"utf-8\") as fin:\n        parts = fin.read().split()\n    if len(parts) == 3:\n        if parts[1] not in OPS:\n            print(\"Operator error\")\n        else:\n            a, op, b = to_number(parts[0]), parts[1], to_number(parts[2])\n            if op == \"+\":\n                result = a + b\n            elif op == \"-\":\n                result = a - b\n            elif op == \"*\":\n                result = a * b\n            else:\n                result = a / b\n            fout.write(str(result))\n            print(\"Successfully\")\n    elif len(parts) == 2:\n        if is_number(parts[0]) and is_number(parts[1]):\n            print(\"Operator lost\")\n        elif parts[0] in OPS:\n            print(\"Number1 lost\")\n        elif parts[1] in OPS:\n            print(\"Number2 lost\")\n        else:\n            print(\"Format error\")\n    else:\n        print(\"Format error\")\nexcept FileNotFoundError:\n    print(\"File not found\")\nexcept ZeroDivisionError:\n    print(\"Cannot divide by zero\")\nexcept ValueError:\n    print(\"Format error\")\nfinally:\n    fout.close()\n    print(\"Execution completed\")\n",
   "q2_floor_div.py": "OPS = (\"+\", \"-\", \"*\", \"/\")\n\n\ndef to_number(tok):\n    \"\"\"整數保持整數（3 + 2 -> 5），有小數點才是 float。不是數字丟 ValueError。\"\"\"\n    try:\n        return int(tok)\n    except ValueError:\n        return float(tok)\n\n\ndef is_number(tok):\n    try:\n        to_number(tok)\n        return True\n    except ValueError:\n        return False\n\n\nnames = input().split(\",\")\nin_name, out_name = names[0], names[1]\nfout = open(out_name, \"w\", encoding=\"utf-8\")\ntry:\n    with open(in_name, encoding=\"utf-8\") as fin:\n        parts = fin.read().split()\n    if len(parts) == 3:\n        if parts[1] not in OPS:\n            print(\"Operator error\")\n        else:\n            a, op, b = to_number(parts[0]), parts[1], to_number(parts[2])\n            if op == \"+\":\n                result = a + b\n            elif op == \"-\":\n                result = a - b\n            elif op == \"*\":\n                result = a * b\n            else:\n                result = a // b\n            fout.write(str(result))\n            print(\"Successfully\")\n    elif len(parts) == 2:\n        if is_number(parts[0]) and is_number(parts[1]):\n            print(\"Operator lost\")\n        elif parts[0] in OPS:\n            print(\"Number1 lost\")\n        elif parts[1] in OPS:\n            print(\"Number2 lost\")\n        else:\n            print(\"Format error\")\n    else:\n        print(\"Format error\")\nexcept FileNotFoundError:\n    print(\"File not found\")\nexcept ZeroDivisionError:\n    print(\"Cannot divide by zero\")\nexcept ValueError:\n    print(\"Format error\")\nfinally:\n    fout.close()\n    print(\"Execution completed\")\n",
   "q2_int_only.py": "OPS = (\"+\", \"-\", \"*\", \"/\")\n\n\ndef to_number(tok):\n    \"\"\"整數保持整數（3 + 2 -> 5），有小數點才是 float。不是數字丟 ValueError。\"\"\"\n    return int(tok)\n\n\ndef is_number(tok):\n    try:\n        to_number(tok)\n        return True\n    except ValueError:\n        return False\n\n\nnames = input().split(\",\")\nin_name, out_name = names[0], names[1]\nfout = open(out_name, \"w\", encoding=\"utf-8\")\ntry:\n    with open(in_name, encoding=\"utf-8\") as fin:\n        parts = fin.read().split()\n    if len(parts) == 3:\n        if parts[1] not in OPS:\n            print(\"Operator error\")\n        else:\n            a, op, b = to_number(parts[0]), parts[1], to_number(parts[2])\n            if op == \"+\":\n                result = a + b\n            elif op == \"-\":\n                result = a - b\n            elif op == \"*\":\n                result = a * b\n            else:\n                result = a / b\n            fout.write(str(result))\n            print(\"Successfully\")\n    elif len(parts) == 2:\n        if is_number(parts[0]) and is_number(parts[1]):\n            print(\"Operator lost\")\n        elif parts[0] in OPS:\n            print(\"Number1 lost\")\n        elif parts[1] in OPS:\n            print(\"Number2 lost\")\n        else:\n            print(\"Format error\")\n    else:\n        print(\"Format error\")\nexcept FileNotFoundError:\n    print(\"File not found\")\nexcept ZeroDivisionError:\n    print(\"Cannot divide by zero\")\nexcept ValueError:\n    print(\"Format error\")\nfinally:\n    fout.close()\n    print(\"Execution completed\")\n",
   "q2_isdigit.py": "OPS = (\"+\", \"-\", \"*\", \"/\")\n\n\ndef to_number(tok):\n    \"\"\"整數保持整數（3 + 2 -> 5），有小數點才是 float。不是數字丟 ValueError。\"\"\"\n    try:\n        return int(tok)\n    except ValueError:\n        return float(tok)\n\n\ndef is_number(tok):\n    return tok.replace(\".\", \"\", 1).isdigit()\n\n\nnames = input().split(\",\")\nin_name, out_name = names[0], names[1]\nfout = open(out_name, \"w\", encoding=\"utf-8\")\ntry:\n    with open(in_name, encoding=\"utf-8\") as fin:\n        parts = fin.read().split()\n    if len(parts) == 3:\n        if parts[1] not in OPS:\n            print(\"Operator error\")\n        else:\n            if not (is_number(parts[0]) and is_number(parts[2])):\n                raise ValueError\n            a, op, b = to_number(parts[0]), parts[1], to_number(parts[2])\n            if op == \"+\":\n                result = a + b\n            elif op == \"-\":\n                result = a - b\n            elif op == \"*\":\n                result = a * b\n            else:\n                result = a / b\n            fout.write(str(result))\n            print(\"Successfully\")\n    elif len(parts) == 2:\n        if is_number(parts[0]) and is_number(parts[1]):\n            print(\"Operator lost\")\n        elif parts[0] in OPS:\n            print(\"Number1 lost\")\n        elif parts[1] in OPS:\n            print(\"Number2 lost\")\n        else:\n            print(\"Format error\")\n    else:\n        print(\"Format error\")\nexcept FileNotFoundError:\n    print(\"File not found\")\nexcept ZeroDivisionError:\n    print(\"Cannot divide by zero\")\nexcept ValueError:\n    print(\"Format error\")\nfinally:\n    fout.close()\n    print(\"Execution completed\")\n",
   "q2_lost_swapped.py": "OPS = (\"+\", \"-\", \"*\", \"/\")\n\n\ndef to_number(tok):\n    \"\"\"整數保持整數（3 + 2 -> 5），有小數點才是 float。不是數字丟 ValueError。\"\"\"\n    try:\n        return int(tok)\n    except ValueError:\n        return float(tok)\n\n\ndef is_number(tok):\n    try:\n        to_number(tok)\n        return True\n    except ValueError:\n        return False\n\n\nnames = input().split(\",\")\nin_name, out_name = names[0], names[1]\nfout = open(out_name, \"w\", encoding=\"utf-8\")\ntry:\n    with open(in_name, encoding=\"utf-8\") as fin:\n        parts = fin.read().split()\n    if len(parts) == 3:\n        if parts[1] not in OPS:\n            print(\"Operator error\")\n        else:\n            a, op, b = to_number(parts[0]), parts[1], to_number(parts[2])\n            if op == \"+\":\n                result = a + b\n            elif op == \"-\":\n                result = a - b\n            elif op == \"*\":\n                result = a * b\n            else:\n                result = a / b\n            fout.write(str(result))\n            print(\"Successfully\")\n    elif len(parts) == 2:\n        if is_number(parts[0]) and is_number(parts[1]):\n            print(\"Operator lost\")\n        elif parts[0] in OPS:\n            print(\"Number2 lost\")\n        elif parts[1] in OPS:\n            print(\"Number1 lost\")\n        else:\n            print(\"Format error\")\n    else:\n        print(\"Format error\")\nexcept FileNotFoundError:\n    print(\"File not found\")\nexcept ZeroDivisionError:\n    print(\"Cannot divide by zero\")\nexcept ValueError:\n    print(\"Format error\")\nfinally:\n    fout.close()\n    print(\"Execution completed\")\n",
   "q2_no_finally.py": "OPS = (\"+\", \"-\", \"*\", \"/\")\n\n\ndef to_number(tok):\n    \"\"\"整數保持整數（3 + 2 -> 5），有小數點才是 float。不是數字丟 ValueError。\"\"\"\n    try:\n        return int(tok)\n    except ValueError:\n        return float(tok)\n\n\ndef is_number(tok):\n    try:\n        to_number(tok)\n        return True\n    except ValueError:\n        return False\n\n\nnames = input().split(\",\")\nin_name, out_name = names[0], names[1]\nfout = open(out_name, \"w\", encoding=\"utf-8\")\ntry:\n    with open(in_name, encoding=\"utf-8\") as fin:\n        parts = fin.read().split()\n    if len(parts) == 3:\n        if parts[1] not in OPS:\n            print(\"Operator error\")\n        else:\n            a, op, b = to_number(parts[0]), parts[1], to_number(parts[2])\n            if op == \"+\":\n                result = a + b\n            elif op == \"-\":\n                result = a - b\n            elif op == \"*\":\n                result = a * b\n            else:\n                result = a / b\n            fout.write(str(result))\n            print(\"Successfully\")\n    elif len(parts) == 2:\n        if is_number(parts[0]) and is_number(parts[1]):\n            print(\"Operator lost\")\n        elif parts[0] in OPS:\n            print(\"Number1 lost\")\n        elif parts[1] in OPS:\n            print(\"Number2 lost\")\n        else:\n            print(\"Format error\")\n    else:\n        print(\"Format error\")\nexcept FileNotFoundError:\n    print(\"File not found\")\nexcept ZeroDivisionError:\n    print(\"Cannot divide by zero\")\nexcept ValueError:\n    print(\"Format error\")\nfout.close()\nprint(\"Execution completed\") if False else None\n",
   "q2_outfile_only_on_success.py": "OPS = (\"+\", \"-\", \"*\", \"/\")\n\n\ndef to_number(tok):\n    \"\"\"整數保持整數（3 + 2 -> 5），有小數點才是 float。不是數字丟 ValueError。\"\"\"\n    try:\n        return int(tok)\n    except ValueError:\n        return float(tok)\n\n\ndef is_number(tok):\n    try:\n        to_number(tok)\n        return True\n    except ValueError:\n        return False\n\n\nnames = input().split(\",\")\nin_name, out_name = names[0], names[1]\nfout = None\ntry:\n    with open(in_name, encoding=\"utf-8\") as fin:\n        parts = fin.read().split()\n    if len(parts) == 3:\n        if parts[1] not in OPS:\n            print(\"Operator error\")\n        else:\n            a, op, b = to_number(parts[0]), parts[1], to_number(parts[2])\n            if op == \"+\":\n                result = a + b\n            elif op == \"-\":\n                result = a - b\n            elif op == \"*\":\n                result = a * b\n            else:\n                result = a / b\n            fout = open(out_name, \"w\", encoding=\"utf-8\")\n            fout.write(str(result))\n            print(\"Successfully\")\n    elif len(parts) == 2:\n        if is_number(parts[0]) and is_number(parts[1]):\n            print(\"Operator lost\")\n        elif parts[0] in OPS:\n            print(\"Number1 lost\")\n        elif parts[1] in OPS:\n            print(\"Number2 lost\")\n        else:\n            print(\"Format error\")\n    else:\n        print(\"Format error\")\nexcept FileNotFoundError:\n    print(\"File not found\")\nexcept ZeroDivisionError:\n    print(\"Cannot divide by zero\")\nexcept ValueError:\n    print(\"Format error\")\nfinally:\n    if fout:\n        fout.close()\n    print(\"Execution completed\")\n",
   "q2_round2.py": "OPS = (\"+\", \"-\", \"*\", \"/\")\n\n\ndef to_number(tok):\n    \"\"\"整數保持整數（3 + 2 -> 5），有小數點才是 float。不是數字丟 ValueError。\"\"\"\n    try:\n        return int(tok)\n    except ValueError:\n        return float(tok)\n\n\ndef is_number(tok):\n    try:\n        to_number(tok)\n        return True\n    except ValueError:\n        return False\n\n\nnames = input().split(\",\")\nin_name, out_name = names[0], names[1]\nfout = open(out_name, \"w\", encoding=\"utf-8\")\ntry:\n    with open(in_name, encoding=\"utf-8\") as fin:\n        parts = fin.read().split()\n    if len(parts) == 3:\n        if parts[1] not in OPS:\n            print(\"Operator error\")\n        else:\n            a, op, b = to_number(parts[0]), parts[1], to_number(parts[2])\n            if op == \"+\":\n                result = a + b\n            elif op == \"-\":\n                result = a - b\n            elif op == \"*\":\n                result = a * b\n            else:\n                result = a / b\n            fout.write(str(round(result, 2)))\n            print(\"Successfully\")\n    elif len(parts) == 2:\n        if is_number(parts[0]) and is_number(parts[1]):\n            print(\"Operator lost\")\n        elif parts[0] in OPS:\n            print(\"Number1 lost\")\n        elif parts[1] in OPS:\n            print(\"Number2 lost\")\n        else:\n            print(\"Format error\")\n    else:\n        print(\"Format error\")\nexcept FileNotFoundError:\n    print(\"File not found\")\nexcept ZeroDivisionError:\n    print(\"Cannot divide by zero\")\nexcept ValueError:\n    print(\"Format error\")\nfinally:\n    fout.close()\n    print(\"Execution completed\")\n",
   "q2_success_always.py": "OPS = (\"+\", \"-\", \"*\", \"/\")\n\n\ndef to_number(tok):\n    \"\"\"整數保持整數（3 + 2 -> 5），有小數點才是 float。不是數字丟 ValueError。\"\"\"\n    try:\n        return int(tok)\n    except ValueError:\n        return float(tok)\n\n\ndef is_number(tok):\n    try:\n        to_number(tok)\n        return True\n    except ValueError:\n        return False\n\n\nnames = input().split(\",\")\nin_name, out_name = names[0], names[1]\nfout = open(out_name, \"w\", encoding=\"utf-8\")\ntry:\n    with open(in_name, encoding=\"utf-8\") as fin:\n        parts = fin.read().split()\n    if len(parts) == 3:\n        if parts[1] not in OPS:\n            print(\"Operator error\")\n        else:\n            a, op, b = to_number(parts[0]), parts[1], to_number(parts[2])\n            if op == \"+\":\n                result = a + b\n            elif op == \"-\":\n                result = a - b\n            elif op == \"*\":\n                result = a * b\n            else:\n                result = a / b\n            fout.write(str(result))\n    elif len(parts) == 2:\n        if is_number(parts[0]) and is_number(parts[1]):\n            print(\"Operator lost\")\n        elif parts[0] in OPS:\n            print(\"Number1 lost\")\n        elif parts[1] in OPS:\n            print(\"Number2 lost\")\n        else:\n            print(\"Format error\")\n    else:\n        print(\"Format error\")\nexcept FileNotFoundError:\n    print(\"File not found\")\nexcept ZeroDivisionError:\n    print(\"Cannot divide by zero\")\nexcept ValueError:\n    print(\"Format error\")\nfinally:\n    fout.close()\n    print(\"Successfully\")\n    print(\"Execution completed\")\n",
   "q2_zero_uncaught.py": "OPS = (\"+\", \"-\", \"*\", \"/\")\n\n\ndef to_number(tok):\n    \"\"\"整數保持整數（3 + 2 -> 5），有小數點才是 float。不是數字丟 ValueError。\"\"\"\n    try:\n        return int(tok)\n    except ValueError:\n        return float(tok)\n\n\ndef is_number(tok):\n    try:\n        to_number(tok)\n        return True\n    except ValueError:\n        return False\n\n\nnames = input().split(\",\")\nin_name, out_name = names[0], names[1]\nfout = open(out_name, \"w\", encoding=\"utf-8\")\ntry:\n    with open(in_name, encoding=\"utf-8\") as fin:\n        parts = fin.read().split()\n    if len(parts) == 3:\n        if parts[1] not in OPS:\n            print(\"Operator error\")\n        else:\n            a, op, b = to_number(parts[0]), parts[1], to_number(parts[2])\n            if op == \"+\":\n                result = a + b\n            elif op == \"-\":\n                result = a - b\n            elif op == \"*\":\n                result = a * b\n            else:\n                result = a / b\n            fout.write(str(result))\n            print(\"Successfully\")\n    elif len(parts) == 2:\n        if is_number(parts[0]) and is_number(parts[1]):\n            print(\"Operator lost\")\n        elif parts[0] in OPS:\n            print(\"Number1 lost\")\n        elif parts[1] in OPS:\n            print(\"Number2 lost\")\n        else:\n            print(\"Format error\")\n    else:\n        print(\"Format error\")\nexcept FileNotFoundError:\n    print(\"File not found\")\nexcept ValueError:\n    print(\"Format error\")\nfinally:\n    fout.close()\n    print(\"Execution completed\")\n",
   "q3_first_subject.py": "name = input()\nwith open(name, encoding=\"utf-8\") as fh:\n    lines = fh.read().split(\"\\n\")\n\nn = int(lines[0])\nbest_no, best_total, best_first = None, None, -1\nfor line in lines[1:n + 1]:\n    cols = line.split()\n    total = int(cols[1]) + int(cols[2]) + int(cols[3])\n    if best_total is None or int(cols[1]) > best_first:\n        best_first = int(cols[1])\n        best_no, best_total = cols[0], total\nprint(str(best_no) + \",\" + str(best_total))\n",
   "q3_init_zero.py": "name = input()\nwith open(name, encoding=\"utf-8\") as fh:\n    lines = fh.read().split(\"\\n\")\n\nn = int(lines[0])\nbest_no, best_total = None, 0\nfor line in lines[1:n + 1]:\n    cols = line.split()\n    total = int(cols[1]) + int(cols[2]) + int(cols[3])\n    if total > best_total:\n        best_no, best_total = cols[0], total\nprint(str(best_no) + \",\" + str(best_total))\n",
   "q3_print_index.py": "name = input()\nwith open(name, encoding=\"utf-8\") as fh:\n    lines = fh.read().split(\"\\n\")\n\nn = int(lines[0])\nbest_no, best_total = None, None\nfor idx, line in enumerate(lines[1:n + 1], start=1):\n    cols = line.split()\n    total = int(cols[1]) + int(cols[2]) + int(cols[3])\n    if best_total is None or total > best_total:\n        best_no, best_total = idx, total\nprint(str(best_no) + \",\" + str(best_total))\n",
   "q3_skip_last.py": "name = input()\nwith open(name, encoding=\"utf-8\") as fh:\n    lines = fh.read().split(\"\\n\")\n\nn = int(lines[0])\nbest_no, best_total = None, None\nfor line in lines[1:n]:\n    cols = line.split()\n    total = int(cols[1]) + int(cols[2]) + int(cols[3])\n    if best_total is None or total > best_total:\n        best_no, best_total = cols[0], total\nprint(str(best_no) + \",\" + str(best_total))\n",
   "q3_space_after_comma.py": "name = input()\nwith open(name, encoding=\"utf-8\") as fh:\n    lines = fh.read().split(\"\\n\")\n\nn = int(lines[0])\nbest_no, best_total = None, None\nfor line in lines[1:n + 1]:\n    cols = line.split()\n    total = int(cols[1]) + int(cols[2]) + int(cols[3])\n    if best_total is None or total > best_total:\n        best_no, best_total = cols[0], total\nprint(str(best_no) + \", \" + str(best_total))\n",
   "q3_string_compare.py": "name = input()\nwith open(name, encoding=\"utf-8\") as fh:\n    lines = fh.read().split(\"\\n\")\n\nn = int(lines[0])\nbest_no, best_total = None, None\nfor line in lines[1:n + 1]:\n    cols = line.split()\n    total = int(cols[1]) + int(cols[2]) + int(cols[3])\n    if best_total is None or str(total) > str(best_total):\n        best_no, best_total = cols[0], total\nprint(str(best_no) + \",\" + str(best_total))\n",
   "q3_two_subjects.py": "name = input()\nwith open(name, encoding=\"utf-8\") as fh:\n    lines = fh.read().split(\"\\n\")\n\nn = int(lines[0])\nbest_no, best_total = None, None\nfor line in lines[1:n + 1]:\n    cols = line.split()\n    total = int(cols[1]) + int(cols[2])\n    if best_total is None or total > best_total:\n        best_no, best_total = cols[0], total\nprint(str(best_no) + \",\" + str(best_total))\n",
   "q4_loop_y_times.py": "x, y = input().split()\nnum = int(x)\nlocation = 1\nwhile location <= int(y):\n    if num % 2 == 1:\n        num = num * 5 - 3\n    else:\n        num = num // 2 + 1\n    location += 1\nprint(num)\n",
   "q4_minus_first.py": "x, y = input().split()\nnum = int(x)\nlocation = 1\nwhile location < int(y):\n    if num % 2 == 1:\n        num = (num - 3) * 5\n    else:\n        num = num // 2 + 1\n    location += 1\nprint(num)\n",
   "q4_plus_first.py": "x, y = input().split()\nnum = int(x)\nlocation = 1\nwhile location < int(y):\n    if num % 2 == 1:\n        num = num * 5 - 3\n    else:\n        num = (num + 1) // 2\n    location += 1\nprint(num)\n",
   "q4_rules_swapped.py": "x, y = input().split()\nnum = int(x)\nlocation = 1\nwhile location < int(y):\n    if num % 2 == 0:\n        num = num * 5 - 3\n    else:\n        num = num // 2 + 1\n    location += 1\nprint(num)\n",
   "q4_true_div.py": "x, y = input().split()\nnum = int(x)\nlocation = 1\nwhile location < int(y):\n    if num % 2 == 1:\n        num = num * 5 - 3\n    else:\n        num = num / 2 + 1\n    location += 1\nprint(num)\n"
  }
 }
];
