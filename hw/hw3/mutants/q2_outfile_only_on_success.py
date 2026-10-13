OPS = ("+", "-", "*", "/")


def to_number(tok):
    """整數保持整數（3 + 2 -> 5），有小數點才是 float。不是數字丟 ValueError。"""
    try:
        return int(tok)
    except ValueError:
        return float(tok)


def is_number(tok):
    try:
        to_number(tok)
        return True
    except ValueError:
        return False


names = input().split(",")
in_name, out_name = names[0], names[1]
fout = None
try:
    with open(in_name, encoding="utf-8") as fin:
        parts = fin.read().split()
    if len(parts) == 3:
        if parts[1] not in OPS:
            print("Operator error")
        else:
            a, op, b = to_number(parts[0]), parts[1], to_number(parts[2])
            if op == "+":
                result = a + b
            elif op == "-":
                result = a - b
            elif op == "*":
                result = a * b
            else:
                result = a / b
            fout = open(out_name, "w", encoding="utf-8")
            fout.write(str(result))
            print("Successfully")
    elif len(parts) == 2:
        if is_number(parts[0]) and is_number(parts[1]):
            print("Operator lost")
        elif parts[0] in OPS:
            print("Number1 lost")
        elif parts[1] in OPS:
            print("Number2 lost")
        else:
            print("Format error")
    else:
        print("Format error")
except FileNotFoundError:
    print("File not found")
except ZeroDivisionError:
    print("Cannot divide by zero")
except ValueError:
    print("Format error")
finally:
    if fout:
        fout.close()
    print("Execution completed")
