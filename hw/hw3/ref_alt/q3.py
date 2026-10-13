# 另一位助教的寫法：readlines + max(key=...)
f = open(input(), "r", encoding="utf-8")
rows = f.readlines()
f.close()
count = int(rows[0].strip())
students = []
for r in rows[1:1 + count]:
    no, *scores = r.split()
    students.append((sum(int(s) for s in scores), no))
total, no = max(students)
print("%s,%d" % (no, total))
