with open('src/data/sampleData.ts', 'r') as f:
    content = f.read()

new_entry = '''        {
          id: 'syd-006', title: 'Governor Phillip Tower', movieOrShow: 'Mission: Impossible 2', year: 2000,
          imageUrl: 'https://pub-d11c6004b03c42edb2633f3ec6a9317b.r2.dev/GovernorPhillipTower.jpg',
          category: LocationCategory.action, latitude: -33.8597, longitude: 151.2089,
          address: '1 Farrer Pl, Sydney', city: 'Sydney', country: 'Australia',
          sceneDescription: 'Ethan Hunt scales the exterior of Governor Phillip Tower in a breathtaking opening sequence showcasing Sydney\'s modern skyline.',
          funFact: 'Governor Phillip Tower is one of Sydney\'s tallest buildings, and Tom Cruise performed many of the climbing stunts himself.',
          quote: 'I just might need a vacation after this.',
          quoteAttribution: 'Ethan Hunt',
          thenAndNow: 'Governor Phillip Tower remains one of Sydney\'s most iconic skyscrapers, dominating the city\'s financial district.',
          isMovie: true,
        },
'''

# Find the exact position to insert
marker = "      ];\n      const aucklandLocations: FilmingLocation[] = [\n"
idx = content.find(marker)
if idx >= 0:
    content = content[:idx] + new_entry + content[idx:]
    with open('src/data/sampleData.ts', 'w') as f:
        f.write(content)
    print("Added Governor Phillip Tower as syd-006")
else:
    print("Marker not found!")
    # Debug: show what's around that area
    alt_marker = "      ];\n      const aucklandLocations"
    idx2 = content.find(alt_marker)
    if idx2 >= 0:
        print(f"Found alt marker at {idx2}: {repr(content[idx2:idx2+60])}")