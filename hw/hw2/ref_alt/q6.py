# Q6 alternative implementation (independent cross-check)
from datetime import date


def to_date(text):
    parts = text.split("-")
    if len(parts) != 3:
        return None
    y, m, d = parts
    if len(y) != 4 or not 1 <= len(m) <= 2 or not 1 <= len(d) <= 2:
        return None
    if not (y.isdigit() and m.isdigit() and d.isdigit()):
        return None
    try:
        return date(int(y), int(m), int(d))
    except ValueError:
        return None


s1, s2 = input().split(",")
a, b = to_date(s1), to_date(s2)
print("Invalid" if a is None or b is None else abs((a - b).days))
