# BUG: 先轉小寫再比較，把大小寫不同的當成相同
list1 = input().lower().split(',')
list2 = input().lower().split(',')
common = []
for x in list1:
    if x in list2:
        common.append(x)
common.sort()
print(','.join(common) if common else 'N/A')
