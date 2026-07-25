with open('src/data/sampleData.ts', 'r') as f:
    content = f.read()

# New entries for White Bay Power Station with different movies
new_entries = """        {
          id: 'syd-007', title: 'White Bay Power Station', movieOrShow: 'Red Planet', year: 2000,
          imageUrl: 'https://pub-d11c6004b03c42edb2633f3ec6a9317b.r2.dev/White%20Bay%20Power%20Station.jpg',
          category: LocationCategory.sciFi, latitude: -34.1230, longitude: 151.0640,
          address: 'White Bay, Rozelle, Sydney', city: 'Sydney', country: 'Australia',
          sceneDescription: 'The abandoned power station\'s industrial interior stood in for the Martian colony habitat in this sci-fi survival thriller.',
          funFact: 'White Bay Power Station\'s cavernous interiors made it a popular filming location for science fiction productions needing otherworldly settings.',
          quote: 'We\'re not just fighting for our lives. We\'re fighting for the future of the human race.',
          quoteAttribution: 'Captain Kate Bowman',
          thenAndNow: 'White Bay Power Station is a heritage-listed former power station, now being redeveloped as a cultural venue.',
          isMovie: true,
        },
        {
          id: 'syd-008', title: 'White Bay Power Station', movieOrShow: 'Water Rats', year: 1996,
          imageUrl: 'https://pub-d11c6004b03c42edb2633f3ec6a9317b.r2.dev/White%20Bay%20Power%20Station.jpg',
          category: LocationCategory.action, latitude: -34.1230, longitude: 151.0640,
          address: 'White Bay, Rozelle, Sydney', city: 'Sydney', country: 'Australia',
          sceneDescription: 'The gritty industrial backdrop of White Bay Power Station featured in this long-running Australian police drama.',
          funFact: 'Water Rats ran for 8 seasons and was one of Australia\'s most popular crime dramas, filming extensively around Sydney Harbour.',
          quote: 'It\'s a water rat\'s life for me.',
          quoteAttribution: 'Detective Frank Holloway',
          thenAndNow: 'White Bay Power Station is a heritage-listed former power station, now being redeveloped as a cultural venue.',
          isMovie: false,
        },
        {
          id: 'syd-009', title: 'White Bay Power Station', movieOrShow: 'The Great Gatsby', year: 2013,
          imageUrl: 'https://pub-d11c6004b03c42edb2633f3ec6a9317b.r2.dev/White%20Bay%20Power%20Station.jpg',
          category: LocationCategory.drama, latitude: -34.1230, longitude: 151.0640,
          address: 'White Bay, Rozelle, Sydney', city: 'Sydney', country: 'Australia',
          sceneDescription: 'Baz Luhrmann\'s dazzling adaptation used White Bay Power Station\'s vast interior for lavish set construction.',
          funFact: 'The production built Gatsby\'s mansion and the Valley of Ashes sets inside the power station, taking advantage of its enormous covered space.',
          quote: 'Can\'t repeat the past? Why of course you can!',
          quoteAttribution: 'Jay Gatsby',
          thenAndNow: 'White Bay Power Station is a heritage-listed former power station, now being redeveloped as a cultural venue.',
          isMovie: true,
        },"""

# Insert after the closing of the existing White Bay Power Station entry (syd-004)
# The pattern is: the closing of syd-004, then the opening of syd-005
old = "          isMovie: true,\n        },\n        {\n          id: 'syd-005', title: 'Sydney Harbour Bridge'"
new = "          isMovie: true,\n        },\n" + new_entries + "\n        {\n          id: 'syd-005', title: 'Sydney Harbour Bridge'"
content = content.replace(old, new, 1)

with open('src/data/sampleData.ts', 'w') as f:
    f.write(content)
print("Added 3 new White Bay Power Station entries!")