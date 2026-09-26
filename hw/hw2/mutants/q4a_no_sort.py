# BUG: 沒有排序，照第一行的順序輸出
list1 = input().split(',')
list2 = input().split(',')
common = []
for x in list1:
    if x in list2:
        common.append(x)
print(','.join(common) if common else 'N/A')
