# BUG: 以為 set 會自動排好，直接 list(set(...)) 沒有排序
nums = set(int(x) for x in input().split(','))
print(','.join(str(n) for n in list(nums)))
