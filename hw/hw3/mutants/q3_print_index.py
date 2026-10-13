name = input()
with open(name, encoding="utf-8") as fh:
    lines = fh.read().split("\n")

n = int(lines[0])
best_no, best_total = None, None
for idx, line in enumerate(lines[1:n + 1], start=1):
    cols = line.split()
    total = int(cols[1]) + int(cols[2]) + int(cols[3])
    if best_total is None or total > best_total:
        best_no, best_total = idx, total
print(str(best_no) + "," + str(best_total))
