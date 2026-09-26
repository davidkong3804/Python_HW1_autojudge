# Q1a alternative implementation (independent cross-check)
sentence = input()
out = ""
for w in sentence.split(" "):
    out = w if out == "" else w + " " + out
print(out)
