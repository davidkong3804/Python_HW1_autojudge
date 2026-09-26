# BUG: 沒有共同元素時印出空行，而不是 N/A
list1 = input().split(',')
list2 = input().split(',')
common = []
for x in list1:
    if x in list2:
        common.append(x)
common.sort()
print(','.join(common))
