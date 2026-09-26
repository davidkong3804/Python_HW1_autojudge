# BUG: 把整串字元反轉，而不是反轉單字順序
s = input()
r = ''
for ch in s:
    r = ch + r
print(r)
