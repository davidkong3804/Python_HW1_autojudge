# Q4b alternative implementation (independent cross-check)
def rank(ch):
    if ch.isdigit():
        return (0, ch)
    if ch.isupper():
        return (1, ch)
    return (2, ch)


def compare(x, y):
    return sorted([c for c in y if c in x], key=rank)


first = input().split(",")
second = input().split(",")
res = compare(first, second)
print(",".join(res) if res else "N/A")
