with open('src/data/sampleData.ts', 'r') as f:
    content = f.read()

base = "https://pub-d11c6004b03c42edb2633f3ec6a9317b.r2.dev/"

# 1. SUITS: Toronto City Hall -> Bay Adelaide Centre
content = content.replace(
    "id: 'tor-004', title: 'Toronto City Hall', movieOrShow: 'Suits', year: 2011,",
    "id: 'tor-004', title: 'Bay Adelaide Centre West Tower Lobby', movieOrShow: 'Suits', year: 2011,"
)

old_suits = """address: '100 Queen St W, Toronto', city: 'Toronto', country: 'Canada',
          sceneDescription: 'The modernist Toronto City Hall doubles as the exterior of Pearson Specter Litt law firm.',
          funFact: 'Suits was filmed entirely in Toronto, which stood in for New York City throughout the series.',
          quote: 'I don\\'t have dreams. I have goals.',
          quoteAttribution: 'Harvey Specter',
          thenAndNow: 'Toronto City Hall\\'s iconic twin towers remain one of the city\\'s most recognizable buildings.',"""

new_suits = """address: '333 Bay St, Toronto', city: 'Toronto', country: 'Canada',
          sceneDescription: 'The sleek modern lobby of Bay Adelaide Centre doubles as the entrance to Pearson Specter Litt\\'s prestigious law firm.',
          funFact: 'Suits was filmed entirely in Toronto, with Bay Adelaide Centre serving as the primary exterior for the Pearson Specter Litt building.',
          quote: 'I don\\'t have dreams. I have goals.',
          quoteAttribution: 'Harvey Specter',
          thenAndNow: 'Bay Adelaide Centre remains a striking modern landmark in Toronto\\'s financial district.',"""

content = content.replace(old_suits, new_suits)

content = content.replace(
    "id: 'tor-004', title: 'Bay Adelaide Centre West Tower Lobby', movieOrShow: 'Suits', year: 2011,\n          imageUrl: undefined,",
    f"id: 'tor-004', title: 'Bay Adelaide Centre West Tower Lobby', movieOrShow: 'Suits', year: 2011,\n          imageUrl: '{base}BayAdelaideWestTowerLobby.jpg',"
)

# Vancouver photos
content = content.replace(
    "id: 'van-001', title: 'Marine Building', movieOrShow: 'The Flash', year: 2014,\n          imageUrl: undefined,",
    f"id: 'van-001', title: 'Marine Building', movieOrShow: 'The Flash', year: 2014,\n          imageUrl: '{base}MarineBuilding.jpg',"
)
content = content.replace(
    "id: 'van-002', title: 'Stanley Park', movieOrShow: 'The X-Files', year: 1993,\n          imageUrl: undefined,",
    f"id: 'van-002', title: 'Stanley Park', movieOrShow: 'The X-Files', year: 1993,\n          imageUrl: '{base}StanleyPark.jpg',"
)
content = content.replace(
    "id: 'van-003', title: 'Gastown Steam Clock', movieOrShow: 'Lucifer', year: 2016,\n          imageUrl: undefined,",
    f"id: 'van-003', title: 'Gastown Steam Clock', movieOrShow: 'Lucifer', year: 2016,\n          imageUrl: '{base}GastownSteamClock.jpg',"
)
content = content.replace(
    "id: 'van-004', title: 'Dr. Sun Yat-Sen Garden', movieOrShow: 'The Man in the High Castle', year: 2015,\n          imageUrl: undefined,",
    f"id: 'van-004', title: 'Dr. Sun Yat-Sen Garden', movieOrShow: 'The Man in the High Castle', year: 2015,\n          imageUrl: '{base}SunYatSenGarden.jpg',"
)
content = content.replace(
    "id: 'van-005', title: 'Vancouver Art Gallery', movieOrShow: 'The 100', year: 2014,\n          imageUrl: undefined,",
    f"id: 'van-005', title: 'Vancouver Art Gallery', movieOrShow: 'The 100', year: 2014,\n          imageUrl: '{base}VancouverArtGallery.jpg',"
)

# Washington DC photos - fix indentation
content = content.replace(
    "          id: 'was-001', title: 'Lincoln Memorial', movieOrShow: 'Forrest Gump', year: 1994,\n          imageUrl: undefined,",
    f"          id: 'was-001', title: 'Lincoln Memorial', movieOrShow: 'Forrest Gump', year: 1994,\n          imageUrl: '{base}LincolnMemorial.JPG',"
)
content = content.replace(
    "          id: 'was-002', title: 'National Mall', movieOrShow: 'Independence Day', year: 1996,\n          imageUrl: undefined,",
    f"          id: 'was-002', title: 'National Mall', movieOrShow: 'Independence Day', year: 1996,\n          imageUrl: '{base}NationalMall.jpg',"
)
content = content.replace(
    "          id: 'was-003', title: 'Jefferson Memorial', movieOrShow: 'The West Wing', year: 1999,\n          imageUrl: undefined,",
    f"          id: 'was-003', title: 'Jefferson Memorial', movieOrShow: 'The West Wing', year: 1999,\n          imageUrl: '{base}JeffersonMemorial.jpg',"
)
content = content.replace(
    "                id: 'was-004', title: 'Library of Congress', movieOrShow: 'National Treasure 2', year: 2007,\n                imageUrl: undefined,",
    f"                id: 'was-004', title: 'Library of Congress', movieOrShow: 'National Treasure 2', year: 2007,\n                imageUrl: '{base}LiibraryofCongress.jpg',"
)

with open('src/data/sampleData.ts', 'w') as f:
    f.write(content)
print("All done!")
