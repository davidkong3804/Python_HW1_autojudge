# BUG: 排序時用 key=str.lower，不分大小寫，大寫沒有全部排在小寫前面
def common_elements(a, b):
    return sorted([x for x in a if x in b], key=str.lower)


list1 = input().split(',')
list2 = input().split(',')
res = common_elements(list1, list2)
print(','.join(res) if res else 'N/A')
