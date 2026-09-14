# Q6 alternative implementation (independent cross-check)
import math

a, b, c = [float(x) for x in input().split()]
s = math.sqrt(b * b - 4 * a * c)
roots = sorted([(-b + s) / (2 * a), (-b - s) / (2 * a)], reverse=True)
print("{:.3f} {:.3f}".format(roots[0], roots[1]))
