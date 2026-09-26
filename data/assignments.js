// 由 tools/generate_tests.py 自動產生，請勿手動修改
window.AUTOJUDGE_ASSIGNMENTS = [
 {
  "id": "hw1",
  "title": "HW1",
  "subtitle": "BMI、計算機、質數、數字和、密碼強度、一元二次方程式",
  "submission": "學號_HW1.zip → 學號_HW1/q1.py ~ q6.py",
  "grading": "Q1~Q4 各 15 分、Q5~Q6 各 20 分，共 100 分；每題 5 組測資",
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
 }
];
