# 另一位助教的寫法：把整個數列存成 list，取 index = y - 1
x, y = map(int, input().split())
seq = [x]
while len(seq) < y:
    last = seq[-1]
    seq.append(last * 5 - 3 if last % 2 else last // 2 + 1)
print(seq[y - 1])
