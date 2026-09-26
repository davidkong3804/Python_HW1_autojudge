# Q4a alternative implementation (independent cross-check)
a = set(input().split(","))
b = set(input().split(","))
order = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
common = sorted(a & b, key=order.index)
print(",".join(common) if common else "N/A")
