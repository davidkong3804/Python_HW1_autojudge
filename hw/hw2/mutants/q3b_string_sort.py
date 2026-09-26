# BUG: set 裡放字串，sorted 變成字串排序
print(','.join(sorted(set(input().split(',')))))
