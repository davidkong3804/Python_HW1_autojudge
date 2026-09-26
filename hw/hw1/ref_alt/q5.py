# Q5 alternative implementation (independent cross-check)
n = len(input())
print("Weak" if n <= 5 else ("Moderate" if n <= 10 else "Strong"))
