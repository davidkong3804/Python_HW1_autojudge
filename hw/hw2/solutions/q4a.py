# Q4a Finding Common Elements (loop) (reference solution)
list1 = input().split(',')
list2 = input().split(',')

common = []
for x in list1:
    if x in list2:
        common.append(x)

# 字元順序 0-9 < A-Z < a-z，剛好就是 sorted() 的預設順序
common.sort()

if len(common) == 0:
    print('N/A')
else:
    print(','.join(common))
