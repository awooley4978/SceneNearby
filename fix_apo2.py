with open('src/data/sampleData.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix Water Rats quote - use double quotes
old = "quote: 'It's a water rat's life for me.',"
new = 'quote: "It\'s a water rat\'s life for me.",'
count = content.count(old)
print(f"Water Rats quote: found {count} time(s)")
if count > 0:
    content = content.replace(old, new, 1)

# Also check for any other single-quote strings containing apostrophes
# Check line 944 area
lines = content.split('\n')
for i, line in enumerate(lines):
    if i >= 940 and i <= 950:
        print(f"  Line {i+1}: {repr(line[:100])}")

with open('src/data/sampleData.ts', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done!")