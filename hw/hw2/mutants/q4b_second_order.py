# BUG: 照第二行的順序輸出，沒有排序
def common_elements(a, b):
    result = []
    for x in b:
        if x in a:
            result.append(x)
    return result


list1 = input().split(',')
list2 = input().split(',')
res = common_elements(list1, list2)
print(','.join(res) if res else 'N/A')
