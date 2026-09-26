# Q4b Finding Common Elements (function) (reference solution)
def common_elements(list1, list2):
    result = []
    for x in list1:
        if x in list2:
            result.append(x)
    return sorted(result)


list1 = input().split(',')
list2 = input().split(',')
common = common_elements(list1, list2)

if len(common) == 0:
    print('N/A')
else:
    print(','.join(common))
