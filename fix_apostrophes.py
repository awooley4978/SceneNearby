with open('src/data/sampleData.ts', 'rb') as f:
    content = f.read()

# Replace the broken single-quoted strings with double-quoted ones
# Line 930: sceneDescription
old = b"sceneDescription: 'The abandoned power station's industrial interior stood in for the Martian colony habitat in this sci-fi survival thriller.',"
new = b'sceneDescription: "The abandoned power station\'s industrial interior stood in for the Martian colony habitat in this sci-fi survival thriller.",'
content = content.replace(old, new, 1)

# Line 931: funFact
old = b"funFact: 'White Bay Power Station's cavernous interiors made it a popular filming location for science fiction productions needing otherworldly settings.',"
new = b'funFact: "White Bay Power Station\'s cavernous interiors made it a popular filming location for science fiction productions needing otherworldly settings.",'
content = content.replace(old, new, 1)

# Line 932: quote
old = b"quote: 'We're not just fighting for our lives. We're fighting for the future of the human race.',"
new = b'quote: "We\'re not just fighting for our lives. We\'re fighting for the future of the human race.",'
content = content.replace(old, new, 1)

# Check for Water Rats
old = b"funFact: 'Water Rats ran for 8 seasons and was one of Australia's most popular crime dramas, filming extensively around Sydney Harbour.',"
new = b'funFact: "Water Rats ran for 8 seasons and was one of Australia\'s most popular crime dramas, filming extensively around Sydney Harbour.",'
content = content.replace(old, new, 1)

# Check for The Great Gatsby quote
old = b"quote: 'Can't repeat the past? Why of course you can!',"
new = b'quote: "Can\'t repeat the past? Why of course you can!",'
content = content.replace(old, new, 1)

with open('src/data/sampleData.ts', 'wb') as f:
    f.write(content)
print("Fixed!")