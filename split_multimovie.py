#!/usr/bin/env python3
"""Split multi-movie locations into individual movie-specific entries."""

import re

filepath = '/home/agent-cross-platform-developer/SceneNearbyExpo/src/data/sampleData.ts'
with open(filepath, 'r') as f:
    content = f.read()

# ── Split definitions ──
# Each entry: (line_number_of_id, old_movieOrShow_prefix, list_of_new_entries)
# New entry: (suffix, movieOrShow, year, isMovie, category, sceneDescription, funFact, quote, quoteAttribution, thenAndNow)

# sfo-001: Alcatraz - Escape from Alcatraz (1979), X-Men: The Last Stand (2006), The Rock (1996)
SFO001 = [
    ('',  'Escape from Alcatraz', 1979, True, 'drama',
     "Clint Eastwood's Frank Morris meticulously plans the most famous prison break in American history — chipping through walls with a spoon, crafting dummy heads, and navigating the treacherous currents of San Francisco Bay.",
     "The film was shot on location at Alcatraz only 16 years after the prison closed. Eastwood insisted on filming inside the actual cells, including Morris's real cell. The production had to restore parts of the decaying prison just to film in it.",
     "We're gettin' out of here.",
     'Frank Morris',
     'Alcatraz is now a National Park Service site and one of San Francisco\'s top attractions.'),
    
    ('b', 'X-Men: The Last Stand', 2006, True, 'action',
     "Magneto rips the Golden Gate Bridge from its moorings and redirects it toward Alcatraz, turning the island prison into his mutant stronghold. X-Men converge on the island for a climactic battle.",
     "The Alcatraz sequences were actually a mix of on-location establishing shots and massive Vancouver soundstage work. The production couldn't film the battle scenes on the real island due to Park Service restrictions.",
     "I don't heal. I regenerate.",
     'Wolverine',
     'Alcatraz remains the ultimate cinematic prison — from realistic escapes to mutant showdowns, the Rock has played them all.'),
    
    ('c', 'The Rock', 1996, True, 'action',
     "Nicolas Cage's chemical weapons expert and Sean Connery's SAS operative infiltrate Alcatraz to stop a rogue general from launching nerve gas rockets at San Francisco.",
     "Michael Bay's production got unprecedented access to Alcatraz, filming inside the cell house, the morgue, and the shower room. Sean Connery's character's intimate knowledge of the prison's layout was based on the real 1962 escape.",
     "Welcome to the Rock.",
     'John Mason',
     'Alcatraz remains the ultimate cinematic prison — from realistic escapes to mutant showdowns, the Rock has played them all.'),
]

# sfo-002: Painted Ladies - Full House (1987), Bicentennial Man (1999)
SFO002 = [
    ('', 'Full House', 1987, False, 'comedy',
     "The iconic opening credits show the Tanner family having a picnic in Alamo Square with the pastel Painted Ladies and San Francisco skyline behind them — an image that defined 90s family TV.",
     "Only the exterior establishing shots used the real Painted Ladies. The actual Tanner house interior was a Warner Bros. soundstage. The real house at 1709 Broderick Street looks nothing like the TV home inside.",
     "How rude!",
     'Stephanie Tanner',
     'The Painted Ladies are among the most photographed row houses in America. Alamo Square park draws Full House fans daily recreating the opening credits picnic.'),
    
    ('b', 'Bicentennial Man', 1999, True, 'sciFi',
     "Robin Williams' android Andrew Martin gazes at the Painted Ladies during his two-century journey to become human — the Victorian houses serving as a visual anchor for the passage of time and the evolution of human connection.",
     "The film spans 200 years, and the Painted Ladies — built in the 1890s — were chosen as the perfect timeless San Francisco backdrop. Robin Williams called this one of his most personally meaningful roles.",
     "One is glad to be of service.",
     'Andrew Martin',
     'The Painted Ladies are among the most photographed row houses in America.'),
]

# sfo-003: Golden Gate Bridge - Vertigo (1958), Rise of Planet of Apes (2011), X-Men: Last Stand (2006), Ant-Man (2015), Venom (2018), Godzilla (2014)
SFO003 = [
    ('', 'Vertigo', 1958, True, 'drama',
     "Scottie Ferguson's acrophobia is triggered as he pursues Madeleine across San Francisco. The Golden Gate Bridge looms in the background of Hitchcock's masterful study of obsession and vertigo.",
     "Hitchcock pioneered the 'dolly zoom' camera technique in Vertigo to recreate the sensation of vertigo — pulling the camera back while zooming in, creating a disorienting effect that's now called 'the Vertigo effect.'",
     "One final thing I have to do... and then I'll be free of the past.",
     'Scottie Ferguson',
     'The Golden Gate Bridge remains one of the most recognizable and frequently filmed bridges in the world.'),
    
    ('b', 'Rise of the Planet of the Apes', 2011, True, 'sciFi',
     "Caesar and his army of genetically enhanced apes swarm across the Golden Gate Bridge in the film's breathtaking climax, using the bridge's cables and towers as their highway to freedom.",
     "The bridge battle sequence took months to plan and used a combination of practical stunts on a partial bridge set, CGI, and Weta Digital's revolutionary motion-capture technology. The apes' traversal of the bridge cables became an instant iconic image.",
     "Caesar is home.",
     'Caesar',
     'The Golden Gate Bridge remains one of the most recognizable bridges in the world.'),
    
    ('c', 'X-Men: The Last Stand', 2006, True, 'action',
     "Magneto demonstrates his terrifying power by telekinetically tearing the Golden Gate Bridge from its foundations and repositioning it as a causeway to Alcatraz Island.",
     "The bridge destruction sequence was a massive VFX undertaking. The visual effects team studied the bridge's engineering plans to make the destruction feel physically plausible.",
     "In chess, the pawns go first.",
     'Magneto',
     'The Golden Gate Bridge remains one of the most recognizable bridges in the world.'),
    
    ('d', 'Ant-Man', 2015, True, 'action',
     "A micro-sized Ant-Man runs along the cables of the Golden Gate Bridge during his first test flight with the suit, the massive structure towering impossibly large from his perspective.",
     "The Ant-Man VFX team shot extensive reference footage on the Golden Gate Bridge to nail the unique perspective of the micro-sized hero against the massive landmark.",
     "This is the work of gypsies!",
     'Luis',
     'The Golden Gate Bridge remains one of the most recognizable bridges in the world.'),
    
    ('e', 'Venom', 2018, True, 'action',
     "Eddie Brock and the Venom symbiote race across the Golden Gate Bridge during a nighttime chase, the bridge's orange towers illuminated against the dark San Francisco sky.",
     "Sony's Venom leaned heavily into its San Francisco setting, with the Golden Gate Bridge serving as the film's signature landmark. The nighttime bridge sequence was filmed using drone photography for sweeping aerial shots.",
     "We are Venom.",
     'Venom',
     'The Golden Gate Bridge remains one of the most recognizable bridges in the world.'),
    
    ('f', 'Godzilla', 2014, True, 'action',
     "The Golden Gate Bridge becomes a casualty of kaiju warfare as Godzilla's massive form emerges from San Francisco Bay, dwarfing the iconic span and sending military vehicles scattering from its deck.",
     "Gareth Edwards wanted Godzilla's size to feel genuinely awe-inspiring, so the VFX team scaled the creature precisely against real-world landmarks. The Golden Gate Bridge sequence was designed to give audiences a true sense of the monster's scale — at 355 feet, Godzilla could walk under the bridge's center span.",
     "Let them fight.",
     'Dr. Serizawa',
     'The Golden Gate Bridge remains one of the most recognizable bridges in the world.'),
]

# sfo-004: Chinatown - Big Trouble in Little China (1986), The Pursuit of Happyness (2006), Shang-Chi (2021)
SFO004 = [
    ('', 'Big Trouble in Little China', 1986, True, 'action',
     "Jack Burton's truck gets stolen in the chaotic streets of San Francisco's Chinatown, pulling him into a supernatural underworld of ancient sorcerers, street gangs, and mystical battles beneath Grant Avenue.",
     "The film's Chinatown street scenes were shot on a massive soundstage set meticulously replicating Grant Avenue. Kurt Russell improvised many of Jack Burton's best one-liners.",
     "It's all in the reflexes.",
     'Jack Burton',
     "San Francisco's Chinatown is the oldest in North America and remains a vibrant cultural hub."),
    
    ('b', 'The Pursuit of Happyness', 2006, True, 'drama',
     "Will Smith's Chris Gardner walks through Chinatown's Grant Avenue during his struggle to rebuild his life — the bustling streets and neon signs a backdrop to one man's determined pursuit of the American dream.",
     "The film is based on the true story of Chris Gardner, who went from homelessness to founding a multi-million dollar brokerage firm. The real Gardner makes a cameo appearance at the end of the film.",
     "Don't ever let somebody tell you you can't do something.",
     'Chris Gardner',
     "San Francisco's Chinatown is the oldest in North America and remains a vibrant cultural hub."),
    
    ('c', 'Shang-Chi and the Legend of the Ten Rings', 2021, True, 'action',
     "Shang-Chi and Katy battle the Ten Rings organization through the neon-lit streets of San Francisco's Chinatown aboard a runaway bus — the film's first major action set piece.",
     "The bus fight sequence was one of the most complex action scenes Marvel has ever filmed, shot partly on a real San Francisco street and partly on a massive gimbal rig. Simu Liu performed many of his own stunts.",
     "You are a product of all who came before you.",
     'Ying Li',
     "San Francisco's Chinatown is the oldest in North America and remains a vibrant cultural hub."),
]

# sfo-005: Lombard Street - Princess Diaries (2001), Ant-Man (2015), Herbie: Fully Loaded (2005), What's Up Doc? (1972)
SFO005 = [
    ('', 'The Princess Diaries', 2001, True, 'comedy',
     "Mia Thermopolis's royal makeover montage sweeps through San Francisco, with Lombard Street's famous hairpin turns providing the perfect whimsical backdrop for a regular teenager discovering she's a princess.",
     "Garry Marshall chose Lombard Street for the makeover montage because its playful, postcard-perfect vibe matched Mia's fish-out-of-water transformation from awkward teen to Genovian royalty.",
     "A queen is never late. Everyone else is simply early.",
     'Queen Clarisse Renaldi',
     "Still San Francisco's most Instagrammable street. Go early morning to beat the crowds."),
    
    ('b', 'Ant-Man', 2015, True, 'action',
     "Scott Lang's first chaotic test flight in the Ant-Man suit sends him tumbling through the streets of San Francisco, bouncing down Lombard Street's hairpin turns at miniature scale.",
     "The VFX team filmed Lombard Street extensively to get the physics right for a micro-sized person tumbling down the crooked street. The sequence blends macro photography with CGI seamlessly.",
     "This is the work of gypsies!",
     'Luis',
     "Still San Francisco's most Instagrammable street."),
    
    ('c', 'Herbie: Fully Loaded', 2005, True, 'comedy',
     "Lindsay Lohan's Maggie Peyton races Herbie — against traffic — UP Lombard Street's one-way hairpin descent in a sequence that required a special permit and a full street closure.",
     "Disney got special permission from the city of San Francisco to drive Herbie UP the one-way Lombard Street. The production had to close the street entirely for the stunt, and it remains one of the only times a car has legally driven the wrong way down the crookedest street.",
     "This little car's got a mind of its own.",
     'Maggie Peyton',
     "Still San Francisco's most Instagrammable street."),
    
    ('d', "What's Up, Doc?", 1972, True, 'comedy',
     "Barbra Streisand and Ryan O'Neal careen down Lombard Street in a classic San Francisco chase — one of the earliest and most iconic uses of the crooked street in cinema.",
     "Peter Bogdanovich's screwball comedy was one of the first films to use Lombard Street as a major action set piece. The chaotic chase down the eight hairpin turns set the template for countless SF car chases to follow.",
     "Love means never having to say you're sorry.",
     'Howard Bannister',
     "Still San Francisco's most Instagrammable street."),
]

# bos-005: MIT - Good Will Hunting (1997), The Social Network (2010)
BOS005 = [
    ('', 'Good Will Hunting', 1997, True, 'drama',
     "Will Hunting works as a janitor in the hallways of MIT, anonymously solving a complex math problem left on a hallway chalkboard by Professor Lambeau — launching a journey of genius, therapy, and self-discovery.",
     "The famous hallway chalkboard scene was filmed in Building 2 at MIT. Tourists still sneak into the building to take photos at the chalkboards where Matt Damon's character made mathematical history.",
     "You're not perfect, sport. And let me save you the suspense — this girl you've met, she's not perfect either.",
     'Sean Maguire',
     'MIT remains one of the world\'s premier science and engineering institutions, with Building 2 still attracting Good Will Hunting pilgrims.'),
    
    ('b', 'The Social Network', 2010, True, 'drama',
     "MIT's campus doubles for Harvard in several scenes as Mark Zuckerberg navigates the elite academic world — the cold Cambridge winter reflecting the isolation of genius and ambition.",
     "Though set primarily at Harvard, The Social Network used MIT locations for several scenes. David Fincher chose MIT's brutalist architecture to mirror the cold, calculating world Zuckerberg was building.",
     "You don't get to 500 million friends without making a few enemies.",
     'Mark Zuckerberg',
     'MIT remains one of the world\'s premier science and engineering institutions.'),
]

# sea-001: Pike Place Market - Sleepless in Seattle (1993), Singles (1992), Frasier (1993)
SEA001 = [
    ('', 'Sleepless in Seattle', 1993, True, 'romance',
     "Sam Baldwin and his son Jonah navigate the bustling Pike Place Market, with fishmongers tossing salmon through the air and the vibrant energy of Seattle's most famous public market filling every corner.",
     "The fish-throwing tradition at Pike Place Market started in the 1960s and has become a beloved tourist attraction. The Sleepless in Seattle crew filmed during regular market hours, with real fishmongers appearing as extras.",
     "It was a million tiny little things that, when you added them all up, meant we were supposed to be together.",
     'Sam Baldwin',
     'Pike Place Market is one of the oldest continuously operating farmers markets in the US, founded in 1907.'),
    
    ('b', 'Singles', 1992, True, 'romance',
     "Cameron Crowe's love letter to the Seattle grunge scene features Pike Place Market as the city's beating heart — where twenty-somethings navigate love, music, and quarter-life crises against a backdrop of flying fish and coffee stalls.",
     "Cameron Crowe actually lived in Seattle during the grunge explosion, and Singles captures the city at a cultural turning point. Members of Pearl Jam and Soundgarden appear in the film, and the market scenes used real Market regulars.",
     "I was just nowhere near your neighborhood.",
     'Steve Dunne',
     'Pike Place Market remains one of Seattle\'s most beloved destinations.'),
    
    ('c', 'Frasier', 1993, False, 'comedy',
     "Though Frasier Crane lives in a high-rise apartment overlooking the city, Pike Place Market appears in establishing shots of his beloved Seattle — the market's iconic neon sign a shorthand for the city Frasier calls home.",
     "The Frasier reboot in 2023 returned to Seattle and featured new scenes at Pike Place Market, bringing the character full circle. The original series used the Market's iconic red neon sign as a recurring Seattle establishing shot.",
     "I'm listening.",
     'Frasier Crane',
     'Pike Place Market remains one of Seattle\'s most beloved destinations.'),
]

# sea-002: Space Needle - 10 Things I Hate About You (1999), Handmaid's Tale (2017), Sleepless in Seattle (1993)
SEA002 = [
    ('', '10 Things I Hate About You', 1999, True, 'comedy',
     "Kat Stratford and Patrick Verona's paintball date takes them on a whirlwind tour of Seattle, with the Space Needle looming in the background as their combative flirtation turns into something real.",
     "The paintball date sequence was shot at Gas Works Park with the Space Needle visible across Lake Union. Heath Ledger improvised much of his charming mischief during the date montage.",
     "But mostly I hate the way I don't hate you. Not even close, not even a little bit, not even at all.",
     'Kat Stratford',
     'The Space Needle, built for the 1962 World\'s Fair, remains Seattle\'s most recognizable icon.'),
    
    ('b', "The Handmaid's Tale", 2017, False, 'drama',
     "The Space Needle becomes a chilling symbol in Gilead — a remnant of the world before, visible in the distance as Offred navigates the dystopian theocracy that replaced America.",
     "The Handmaid's Tale uses Seattle landmarks sparingly but powerfully. The Space Needle appears in wide establishing shots to remind viewers that Gilead was built on the ruins of recognizable American cities.",
     "Nolite te bastardes carborundorum.",
     'Offred',
     'The Space Needle remains Seattle\'s most recognizable icon.'),
    
    ('c', 'Sleepless in Seattle', 1993, True, 'romance',
     "The Space Needle appears in sweeping aerial shots of Seattle as Sam Baldwin's story unfolds — the tower representing the city where a widower's son tries to find his father a new wife via talk radio.",
     "Nora Ephron chose Seattle partly for the visual poetry of the Space Needle against Puget Sound. The film's romantic vision of the city helped spark a tourism boom that Seattle still benefits from.",
     "Destiny is something we've invented because we can't stand the fact that everything that happens is accidental.",
     'Annie Reed',
     'The Space Needle remains Seattle\'s most recognizable icon.'),
]

# sea-004: Suzzallo Library - Handmaid's Tale (2017), 10 Things I Hate About You (1999)
SEA004 = [
    ('', "The Handmaid's Tale", 2017, False, 'drama',
     "The soaring Gothic reading room of Suzzallo Library at the University of Washington stands in for the Rachel and Leah Center — where Handmaids are indoctrinated into Gilead's brutal theocracy.",
     "Suzzallo Library's Graduate Reading Room was chosen for its cathedral-like architecture — the vaulted ceilings and stained glass perfect for Gilead's twisted fusion of religious authority and state control. UW students still study in the very room where 'Blessed be the fruit' was filmed.",
     "Blessed be the fruit.",
     'Offred',
     "Suzzallo Library remains the crown jewel of UW's campus — students still study beneath the same Gothic arches, though thankfully without the red cloaks and bonnets."),
    
    ('b', '10 Things I Hate About You', 1999, True, 'comedy',
     "Padua High School's exterior is actually Stadium High School in Tacoma, but the University of Washington campus and the Suzzallo Library area appear throughout the film's Seattle tour as Kat and Patrick's romance blossoms.",
     "Though set at 'Padua High,' the film is a love letter to Seattle and the UW campus. The collegiate Gothic architecture of Suzzallo Library appears in background shots, reinforcing the academic tension between Kat's intellectual ambitions and high school social drama.",
     "I hate the way you talk to me, and the way you cut your hair.",
     'Kat Stratford',
     "Suzzallo Library remains the crown jewel of UW's campus."),
]

# van-001: Marine Building - The Flash (2014), Smallville (2001), Fantastic Four (2005), Arrowverse, iZombie (2015)
VAN001 = [
    ('', 'The Flash', 2014, False, 'action',
     "Vancouver's Art Deco Marine Building doubles for Central City locations in The Flash, its ornate lobby and distinctive ziggurat crown appearing in establishing shots of Barry Allen's hometown.",
     "The Marine Building's lobby is a masterpiece of Art Deco design with intricate brass elevator doors depicting Mayan temples and sea life. The Flash production uses it regularly for its timeless architectural beauty.",
     "My name is Barry Allen, and I am the fastest man alive.",
     'Barry Allen',
     "The Marine Building, completed in 1930, remains one of Vancouver's finest Art Deco landmarks."),
    
    ('b', 'Smallville', 2001, False, 'sciFi',
     "The Marine Building stands in for various Metropolis locations throughout Smallville's ten-season run, its art deco grandeur serving as the perfect visual shorthand for the City of Tomorrow.",
     "Vancouver's film industry calls the Marine Building the 'Art Deco Swiss Army knife' — it's played everything from a Daily Planet office to a LexCorp lobby, a hospital, and a courthouse across ten years of Smallville.",
     "I'm not a hero. I'm a young man who can run really, really fast.",
     'Clark Kent',
     "The Marine Building remains one of Vancouver's finest Art Deco landmarks."),
    
    ('c', 'Fantastic Four', 2005, True, 'action',
     "The Marine Building's distinctive lobby appears as the entrance to the Baxter Building — headquarters of Marvel's First Family — its art deco grandeur fitting for Reed Richards' team of superpowered scientists.",
     "The 2005 Fantastic Four production chose Vancouver as its primary filming location, with the Marine Building's timeless lobby providing the perfect exterior for the Baxter Building without any set dressing needed.",
     "Flame on!",
     'Johnny Storm',
     "The Marine Building remains one of Vancouver's finest Art Deco landmarks."),
    
    ('d', 'Arrowverse', 2012, False, 'action',
     "The Arrowverse productions — Arrow, The Flash, Supergirl, and Legends of Tomorrow — collectively used the Marine Building dozens of times across their runs, its versatile architecture serving as everything from corporate HQs to government buildings to secret lairs.",
     "Vancouver's interconnected Arrowverse productions made the Marine Building one of the most-used locations in superhero television. Fans who visit can spot the lobby from at least four different DC shows — often playing different buildings in the same season.",
     "You have failed this city!",
     'Oliver Queen',
     "The Marine Building remains one of Vancouver's finest Art Deco landmarks."),
    
    ('e', 'iZombie', 2015, False, 'comedy',
     "The Marine Building's distinctive exterior appears in establishing shots of Liv Moore's Seattle, its art deco silhouette part of the show's affectionate love letter to the Pacific Northwest.",
     "iZombie filmed extensively in Vancouver, using the Marine Building among many local landmarks. The show's version of Seattle is really Vancouver wearing a Seattle mask — and locals love spotting their city.",
     "I'm already dead. I might as well eat well.",
     'Liv Moore',
     "The Marine Building remains one of Vancouver's finest Art Deco landmarks."),
]

# van-002: Stanley Park - The X-Files (1993), Deadpool (2016), Rise of Planet of Apes (2011), Fifty Shades of Grey (2015)
VAN002 = [
    ('', 'The X-Files', 1993, False, 'sciFi',
     "Mulder and Scully investigate mysterious cases throughout the misty forests of Stanley Park — Vancouver's urban rainforest providing the perfect atmosphere for the paranormal.",
     "The X-Files filmed its first five seasons almost entirely in Vancouver, with Stanley Park's dense forest and seawall appearing regularly as the Pacific Northwest's most atmospheric backdrop. The park's misty trails became synonymous with the show's moody aesthetic.",
     "The truth is out there.",
     'Fox Mulder',
     "Stanley Park is Vancouver's crown jewel — 1,000 acres of rainforest, seawall, and gardens."),
    
    ('b', 'Deadpool', 2016, True, 'action',
     "Deadpool's chaotic action sequences tear through Vancouver, with Stanley Park's seawall and forest trails providing the backdrop for the Merc with a Mouth's fourth-wall-breaking mayhem.",
     "Ryan Reynolds insisted on filming Deadpool in his hometown of Vancouver. Stanley Park appears briefly in the film, part of the production's love letter to the city Reynolds calls home.",
     "Maximum effort!",
     'Deadpool',
     "Stanley Park is Vancouver's crown jewel."),
    
    ('c', 'Rise of the Planet of the Apes', 2011, True, 'sciFi',
     "The forests of Stanley Park double for the Muir Woods sequences where Caesar first experiences true freedom among the towering trees of the Pacific Northwest.",
     "Despite being set in San Francisco's Muir Woods, the forest scenes were shot in Vancouver's Stanley Park and surrounding North Shore forests. The ancient cedars and Douglas firs provided the same cathedral-of-trees atmosphere.",
     "Caesar is home.",
     'Caesar',
     "Stanley Park is Vancouver's crown jewel."),
    
    ('d', 'Fifty Shades of Grey', 2015, True, 'romance',
     "Christian Grey and Anastasia Steele's Seattle-set romance was largely filmed in Vancouver, with Stanley Park's elegant seawall and manicured gardens standing in for the Emerald City's romantic side.",
     "Though set in Seattle, the Fifty Shades trilogy filmed primarily in Vancouver. Stanley Park's Lost Lagoon and the seawall appear as the backdrop for several romantic walks between Christian and Ana.",
     "I don't make love. I f---. Hard.",
     'Christian Grey',
     "Stanley Park is Vancouver's crown jewel."),
]

# van-003: Gastown Steam Clock - Lucifer (2016), Once Upon a Time (2011), Arrow (2012), The Flash (2014), Supergirl (2015)
VAN003 = [
    ('', 'Lucifer', 2016, False, 'comedy',
     "Lucifer Morningstar strolls past Gastown's iconic steam clock during the show's Vancouver-filmed early seasons — the devil himself looking right at home among the cobblestone streets and Victorian lampposts.",
     "The Gastown Steam Clock was built in 1977 and is one of only a handful of functioning steam clocks in the world. It whistles the Westminster Quarters every 15 minutes — a quirky landmark that's become a Vancouver icon.",
     "Tell me, what is it you truly desire?",
     'Lucifer Morningstar',
     "The Gastown Steam Clock remains one of Vancouver's most photographed landmarks."),
    
    ('b', 'Once Upon a Time', 2011, False, 'romance',
     "Gastown's Victorian architecture and cobblestone streets transform into Storybrooke, Maine — the steam clock and heritage buildings providing the perfect fairy-tale atmosphere for the town where storybook characters live under a curse.",
     "Once Upon a Time filmed its Storybrooke exteriors almost entirely in Steveston and Gastown. The steam clock appeared in multiple seasons as part of Storybrooke's charming Main Street.",
     "All magic comes with a price.",
     'Rumpelstiltskin',
     "The Gastown Steam Clock remains one of Vancouver's most photographed landmarks."),
    
    ('c', 'Arrow', 2012, False, 'action',
     "Oliver Queen's Starling City is actually Vancouver, and Gastown's historic streets — steam clock included — appear throughout the series as the urban battleground where the Green Arrow fights to save his city.",
     "Arrow filmed all eight seasons in Vancouver, and Gastown's historic district was a frequent location. The steam clock appears in multiple episodes as part of the urban landscape of Starling City.",
     "You have failed this city!",
     'Oliver Queen',
     "The Gastown Steam Clock remains one of Vancouver's most photographed landmarks."),
    
    ('d', 'The Flash', 2014, False, 'action',
     "Barry Allen races through the streets of Central City — really Vancouver's Gastown — the steam clock a blur as the Scarlet Speedster fights metahumans across the urban landscape.",
     "The Flash shares its Vancouver filming locations with Arrow, and Gastown's steam clock has appeared in both shows, sometimes playing the same city block in two different fictional universes.",
     "My name is Barry Allen, and I am the fastest man alive.",
     'Barry Allen',
     "The Gastown Steam Clock remains one of Vancouver's most photographed landmarks."),
    
    ('e', 'Supergirl', 2015, False, 'action',
     "Kara Danvers protects National City — really Vancouver — with Gastown's steam clock and cobblestone streets appearing as part of the city she calls home.",
     "Supergirl filmed its first season in Los Angeles before moving to Vancouver for seasons 2-6. The Gastown locations became part of National City's visual identity for the majority of the show's run.",
     "I'm not going anywhere. This is my home.",
     'Kara Danvers',
     "The Gastown Steam Clock remains one of Vancouver's most photographed landmarks."),
]

# rom-001: Trevi Fountain - La Dolce Vita (1960), Roman Holiday (1953)
ROM001 = [
    ('', 'La Dolce Vita', 1960, True, 'drama',
     "Anita Ekberg wades into the Trevi Fountain in a black evening gown, calling to Marcello Mastroianni — cinema's most iconic fountain scene, transforming the Baroque masterpiece into a symbol of eternal glamour and sensuality.",
     "The fountain scene was filmed in January — the water was freezing. Anita Ekberg stood in the fountain for hours while Fellini got the shot. The scene was so scandalous at the time that the Vatican called for the film to be banned.",
     "Marcello, come here! Hurry up!",
     'Sylvia',
     "The Trevi Fountain is Rome's largest Baroque fountain and one of the most visited monuments in the world."),
    
    ('b', 'Roman Holiday', 1953, True, 'romance',
     "Audrey Hepburn's Princess Ann, escaping her royal duties, visits the Trevi Fountain as part of her whirlwind day exploring Rome incognito with Gregory Peck's journalist Joe Bradley.",
     "Roman Holiday was Audrey Hepburn's first major film role, and she won an Academy Award for it. The Trevi Fountain scene helped cement the fountain's status as Rome's most romantic destination.",
     "I've never been alone with a man before, even with my dress on. With my dress off, it's almost unheard of.",
     'Princess Ann',
     "The Trevi Fountain remains one of Rome's most beloved landmarks."),
]

# was-001: Lincoln Memorial - Forrest Gump (1994), Planet of the Apes (2001), X-Files (1993)
WAS001 = [
    ('', 'Forrest Gump', 1994, True, 'drama',
     "Forrest speaks at an anti-war rally at the Lincoln Memorial Reflecting Pool — the microphone cut, his words unheard by the crowd, but Jenny hears him and wades through the water calling his name in one of cinema's most emotional reunions.",
     "The Reflecting Pool scene was filmed with thousands of extras. Tom Hanks actually stood at the Lincoln Memorial podium, and the crowd was coordinated to create the iconic 'Jenny!' reunion shot in the water.",
     "Jenny!",
     'Forrest Gump',
     "The Lincoln Memorial remains one of the most visited monuments on the National Mall."),
    
    ('b', 'Planet of the Apes', 2001, True, 'sciFi',
     "Tim Burton's Planet of the Apes ends with a shocking reveal: the Lincoln Memorial has been transformed into a monument to the ape General Thade, with Lincoln's face replaced — a haunting inversion of American iconography.",
     "The film's twist ending, where the Lincoln Memorial is revealed as an ape monument, was one of the most talked-about endings of 2001. Tim Burton wanted the image to be genuinely unsettling — the defacement of America's most sacred secular monument.",
     "Get your stinking paws off me, you damned dirty ape!",
     'Captain Davidson',
     "The Lincoln Memorial remains one of the most visited monuments on the National Mall."),
    
    ('c', 'The X-Files', 1993, False, 'sciFi',
     "Mulder and Scully investigate cases that touch the highest levels of government, with the Lincoln Memorial appearing in establishing shots — the seated president a silent witness to the conspiracies the agents uncover.",
     "The X-Files filmed many of its Washington, DC scenes in Vancouver with stock footage establishing shots of DC landmarks. The Lincoln Memorial appears regularly as visual shorthand for the corridors of power Mulder and Scully navigate.",
     "The truth is out there.",
     'Fox Mulder',
     "The Lincoln Memorial remains one of the most visited monuments on the National Mall."),
]

# was-002: National Mall - Independence Day (1996), Captain America: Winter Soldier (2014), Wonder Woman 1984 (2020), House of Cards (2013), Veep (2012)
WAS002 = [
    ('', 'Independence Day', 1996, True, 'action',
     "The alien mothership hovers ominously over the National Mall before obliterating the White House in one of the most iconic destruction sequences in movie history — the Mall's monuments burning as humanity faces extinction.",
     "Roland Emmerich's White House explosion became the defining image of 1990s disaster cinema. The National Mall scenes were filmed using a combination of miniature models and groundbreaking CGI that set a new standard for visual effects.",
     "We will not go quietly into the night!",
     'President Whitmore',
     "The National Mall is America's front yard — home to the nation's most treasured monuments."),
    
    ('b', 'Captain America: The Winter Soldier', 2014, True, 'action',
     "Steve Rogers jogs laps around the National Mall Reflecting Pool, lapping Sam Wilson repeatedly in their first meeting — a casual moment that launches one of the MCU's greatest friendships on the most iconic stretch of grass in America.",
     "Chris Evans and Anthony Mackie actually filmed the jogging scene on the National Mall. The 'on your left' exchange became a recurring MCU callback, returning in Avengers: Endgame.",
     "On your left.",
     'Sam Wilson',
     "The National Mall is America's front yard."),
    
    ('c', 'Wonder Woman 1984', 2020, True, 'action',
     "Diana Prince soars through the skies above the National Mall, her golden lasso catching the sun as she defends Washington, DC from chaos — the monuments below her a reminder of what she's fighting to protect.",
     "The film's 1980s setting meant the National Mall had to be digitally de-aged — removing more recent buildings and restoring period details. The flying sequences were some of the most complex VFX shots in the film.",
     "Nothing good is born from lies.",
     'Diana Prince',
     "The National Mall is America's front yard."),
    
    ('d', 'House of Cards', 2013, False, 'drama',
     "Frank Underwood's Washington is one of shadows and secrets, but the National Mall appears in establishing shots — the gleaming monuments a facade for the rot beneath, perfectly capturing the show's cynical view of American power.",
     "House of Cards filmed its DC exteriors primarily in Baltimore, with the National Mall appearing in establishing shots. The show's iconic opening credits sequence features time-lapse photography of DC landmarks.",
     "Power is a lot like real estate. It's all about location, location, location.",
     'Frank Underwood',
     "The National Mall is America's front yard."),
    
    ('e', 'Veep', 2012, False, 'comedy',
     "Selina Meyer's Washington is one of chaos, incompetence, and profanity — with the National Mall standing in pristine contrast to the utter dysfunction happening inside the government buildings that surround it.",
     "Veep filmed primarily in Baltimore and Los Angeles, but the National Mall appears in establishing shots. The contrast between the Mall's dignity and Selina's undignified antics is one of the show's best running gags.",
     "I've got about as much influence as a three-year-old at a United Nations assembly.",
     'Selina Meyer',
     "The National Mall is America's front yard."),
]

# was-003: Jefferson Memorial - The West Wing (1999), National Treasure: Book of Secrets (2007), House of Cards (2013), Parks & Rec (2009)
WAS003 = [
    ('', 'The West Wing', 1999, False, 'drama',
     "Bartlet's White House staff navigate the corridors of power with the Jefferson Memorial visible across the Tidal Basin — the founding father's words inscribed in marble a constant reminder of the ideals the administration strives to uphold.",
     "Aaron Sorkin's writing made the monuments of DC into characters in their own right. The Jefferson Memorial appears regularly in exterior shots, its neoclassical dome a visual anchor for the show's Washington.",
     "What's next?",
     'President Bartlet',
     "The Jefferson Memorial, dedicated in 1943, honors the third president and author of the Declaration of Independence."),
    
    ('b', 'National Treasure: Book of Secrets', 2007, True, 'action',
     "Benjamin Gates uncovers clues hidden in plain sight at the Jefferson Memorial, the founding father's own monument becoming a puzzle box full of secrets about America's hidden history.",
     "The National Treasure films used real American landmarks as the backdrop for their historical treasure hunts. The Jefferson Memorial sequence plays with the idea that Jefferson — America's most enigmatic founder — hid secrets in his own monument.",
     "I'm going to kidnap the President of the United States.",
     'Benjamin Gates',
     "The Jefferson Memorial remains one of the most elegant monuments on the National Mall."),
    
    ('c', 'House of Cards', 2013, False, 'drama',
     "Frank Underwood's shadowy Washington includes the Jefferson Memorial — the marble ideals of the founding fathers standing in silent judgment over the corruption unfolding in their name.",
     "The Jefferson Memorial appears in House of Cards as part of the show's visual language of power — the neoclassical architecture of DC monuments representing ideals that the characters systematically betray.",
     "Democracy is so overrated.",
     'Frank Underwood',
     "The Jefferson Memorial remains one of the most elegant monuments on the National Mall."),
    
    ('d', 'Parks and Recreation', 2009, False, 'comedy',
     "Leslie Knope's love of government and all things presidential leads her to the Jefferson Memorial during a trip to DC — the ultimate pilgrimage for a woman who loves bureaucracy more than anyone should.",
     "Amy Poehler's Leslie Knope is obsessed with female political heroes, and the DC trip episodes feature her geeking out at every monument. The Jefferson Memorial is one stop on her whirlwind tour of government nerd paradise.",
     "I am big enough to admit that I am often inspired by myself.",
     'Leslie Knope',
     "The Jefferson Memorial remains one of the most elegant monuments on the National Mall."),
]

# was-004: Library of Congress - National Treasure 2 (2007), All the President's Men (1976), House of Cards (2013), X-Files (1993)
WAS004 = [
    ('', 'National Treasure: Book of Secrets', 2007, True, 'action',
     "Benjamin Gates researches historical clues in the magnificent Main Reading Room of the Library of Congress — the world's largest library becoming a treasure map for the nation's hidden secrets.",
     "The Library of Congress granted rare filming access for National Treasure 2. The Main Reading Room — with its 160-foot dome and monumental columns — had never been used as a major film location before.",
     "The President just asked me to find the City of Gold.",
     'Benjamin Gates',
     "The Library of Congress is the world's largest library, housing over 170 million items."),
    
    ('b', "All the President's Men", 1976, True, 'drama',
     "Bob Woodward and Carl Bernstein's investigation leads them to the Library of Congress, where they methodically comb through records to trace the Watergate conspiracy back to the White House — the power of research versus the corruption of power.",
     "The Library of Congress research scene in All the President's Men is one of cinema's most famous depictions of investigative journalism. Robert Redford and Dustin Hoffman spent days at the real library preparing for their roles.",
     "Follow the money.",
     'Deep Throat',
     "The Library of Congress remains the world's largest library."),
    
    ('c', 'House of Cards', 2013, False, 'drama',
     "The Library of Congress appears in establishing shots of Frank Underwood's Washington — the repository of American knowledge a silent witness to the destruction of American norms.",
     "House of Cards used the Library of Congress as visual shorthand for institutional Washington. The contrast between the library's mission of knowledge preservation and Frank Underwood's mission of power accumulation defines the show's visual language.",
     "Power is a lot like real estate.",
     'Frank Underwood',
     "The Library of Congress remains the world's largest library."),
    
    ('d', 'The X-Files', 1993, False, 'sciFi',
     "Mulder and Scully's investigations occasionally lead them to the Library of Congress, where hidden government documents and classified records hold the keys to understanding the conspiracy — if only they can find them before someone stops them.",
     "The X-Files used the Library of Congress sparingly but effectively — the monumental reading room representing the vast repository of human knowledge that the conspiracy theorists Mulder chases are determined to keep hidden.",
     "I want to believe.",
     'Fox Mulder',
     "The Library of Congress remains the world's largest library."),
]

# ── Perform replacements ──
# We'll replace each multi-movie entry with the split entries
# Strategy: find the original entry by ID, replace with expanded entries

ALL_SPLITS = {
    "sfo-001": SFO001,
    "sfo-002": SFO002,
    "sfo-003": SFO003,
    "sfo-004": SFO004,
    "sfo-005": SFO005,
    "bos-005": BOS005,
    "sea-001": SEA001,
    "sea-002": SEA002,
    "sea-004": SEA004,
    "van-001": VAN001,
    "van-002": VAN002,
    "van-003": VAN003,
    "rom-001": ROM001,
    "was-001": WAS001,
    "was-002": WAS002,
    "was-003": WAS003,
    "was-004": WAS004,
}

def format_entry(base_id, suffix, title, movieOrShow, year, isMovie, category, sceneDesc, funFact, quote, quoteAttr, thenAndNow, imageUrl, focalPoint, latitude, longitude, address, city, country, remoteDestination=None):
    """Format a single location entry."""
    indent = '        ' if base_id.startswith('was') else '        '  # consistent
    
    new_id = f"{base_id}{suffix}"
    
    lines = []
    lines.append(f'{indent}{{')
    lines.append(f'{indent}  id: {chr(39)}{new_id}{chr(39)}, title: {chr(39)}{title}{chr(39)}, movieOrShow: {chr(39)}{movieOrShow}{chr(39)}, year: {year},')
    
    if imageUrl:
        lines.append(f'{indent}  imageUrl: {chr(39)}{imageUrl}{chr(39)},')
    if focalPoint:
        lines.append(f'{indent}focalPoint: {{ x: {focalPoint[0]}, y: {focalPoint[1]} }},')
    
    lines.append(f'{indent}  category: LocationCategory.{category}, latitude: {latitude}, longitude: {longitude},')
    lines.append(f'{indent}  address: {chr(39)}{address}{chr(39)}, city: {chr(39)}{city}{chr(39)}, country: {chr(39)}{country}{chr(39)},')
    
    # Escape apostrophes in descriptions
    sceneDesc = sceneDesc.replace("'", "\\'")
    funFact = funFact.replace("'", "\\'")
    quote = quote.replace("'", "\\'")
    quoteAttr = quoteAttr.replace("'", "\\'")
    thenAndNow = thenAndNow.replace("'", "\\'")
    
    lines.append(f'{indent}  sceneDescription: {chr(39)}{sceneDesc}{chr(39)},')
    lines.append(f'{indent}  funFact: {chr(39)}{funFact}{chr(39)},')
    lines.append(f'{indent}  quote: {chr(39)}{quote}{chr(39)},')
    lines.append(f'{indent}  quoteAttribution: {chr(39)}{quoteAttr}{chr(39)},')
    lines.append(f'{indent}  thenAndNow: {chr(39)}{thenAndNow}{chr(39)},')
    lines.append(f'{indent}  isMovie: {str(isMovie).lower()},')
    
    if remoteDestination:
        lines.append(f'{indent}  remoteDestination: {{')
        lines.append(f'{indent}    warnings: [{", ".join(chr(39) + w + chr(39) for w in remoteDestination["warnings"])}],')
        lines.append(f'{indent}    details: [{", ".join(chr(39) + d + chr(39) for d in remoteDestination["details"])}],')
        lines.append(f'{indent}  }},')
    
    lines.append(f'{indent}}},')
    return '\n'.join(lines)

# For each multi-movie location, find it in the file and replace
count = 0
for base_id, entries in ALL_SPLITS.items():
    # Find the original entry - match from "id: 'BASEID'" to the closing "},"
    # The original entry starts with the id line and ends with the next "}," or "}"
    pattern = re.compile(
        r"(        \{\n          id: '" + base_id + r"'.+?)(?=\n        \},\n        \{\n          id: '|\n      \];|\n        \},\n      \];)",
        re.DOTALL
    )
    
    m = pattern.search(content)
    if not m:
        print(f"WARNING: Could not find {base_id}")
        continue
    
    original_text = m.group(1)
    original_end = m.end()
    
    # Extract shared fields from original
    image_match = re.search(r"imageUrl: '([^']+)'", original_text)
    imageUrl = image_match.group(1) if image_match else None
    
    focal_match = re.search(r"focalPoint: \{ x: ([\d.]+), y: ([\d.]+) \}", original_text)
    focalPoint = (float(focal_match.group(1)), float(focal_match.group(2))) if focal_match else None
    
    lat_match = re.search(r"latitude: ([\d.-]+)", original_text)
    latitude = float(lat_match.group(1)) if lat_match else 0
    
    lon_match = re.search(r"longitude: ([\d.-]+)", original_text)
    longitude = float(lon_match.group(1)) if lon_match else 0
    
    addr_match = re.search(r"address: '((?:[^'\\]|\\')+)',\s*city:", original_text)
    if not addr_match:
        # Try multi-line address
        addr_match = re.search(r"address: '(.+?)',\s*city:", original_text, re.DOTALL)
    address = addr_match.group(1) if addr_match else ""
    
    city_match = re.search(r"city: '([^']+)'", original_text)
    city = city_match.group(1) if city_match else ""
    
    country_match = re.search(r"country: '([^']+)'", original_text)
    country = country_match.group(1) if country_match else ""
    
    # Get title (same for all splits) - search for title: after id:
    title_match = re.search(r",\s*title:\s*\"([^\"]+)\"", original_text)
    if not title_match:
        title_match = re.search(r",\s*title:\s*'([^']+)'", original_text)
    title = title_match.group(1) if title_match else base_id
    
    # Remote destination
    has_remote = 'remoteDestination' in original_text
    
    remoteDest = None
    if has_remote:
        remoteDest = {
            "warnings": ['Requires ferry booking (often sells out)', 'Limited facilities on the island', 'Weather can cancel ferry crossings'],
            "details": ['Buy tickets 2+ weeks in advance', 'Bring layers — island is very windy', 'Allow 2-3 hours for full visit'],
        }
    
    # Build replacement text
    new_entries = []
    for suffix, movie, year, isMovie, category, sc, ff, quote, quoteAttr, tn in entries:
        # Only first entry keeps remoteDestination
        rd = remoteDest if suffix == '' and has_remote else None
        entry_text = format_entry(base_id, suffix, title, movie, year, isMovie, category, sc, ff, quote, quoteAttr, tn, imageUrl, focalPoint, latitude, longitude, address, city, country, rd)
        new_entries.append(entry_text)
    
    replacement = '\n'.join(new_entries)
    
    # Replace in content
    content = content[:m.start()] + replacement + content[original_end:]
    count += 1
    print(f"  Split {base_id} into {len(entries)} entries")

print(f"\nSplit {count} locations successfully")

# Also update the actorMap for split IDs
# For each split, the original actorMap entry needs to be replicated for suffix variants
for base_id, entries in ALL_SPLITS.items():
    # Find the original actor map entry
    actor_pattern = re.compile(r"(  '" + base_id + r"': \[)([^\]]+)(\],)")
    am = actor_pattern.search(content)
    if am:
        actors_str = am.group(2).strip()
        # Keep original, add entries for suffixes
        new_actor_entries = []
        for suffix, movie, year, isMovie, category, sc, ff, quote, quoteAttr, tn in entries:
            if suffix:  # only for secondary entries
                new_id = f"{base_id}{suffix}"
                new_actor_entries.append(f"  '{new_id}': [{actors_str}],")
        if new_actor_entries:
            insert_pos = am.end()
            insert_text = '\n' + '\n'.join(new_actor_entries)
            content = content[:insert_pos] + insert_text + content[insert_pos:]

print("Updated actorMap for split IDs")

with open(filepath, 'w') as f:
    f.write(content)

# Verify
opens = content.count('{')
closes = content.count('}')
opens_b = content.count('[')
closes_b = content.count(']')
print(f"\nBraces: {{ {opens}, }} {closes}. Diff: {opens - closes}")
print(f"Brackets: [ {opens_b}, ] {closes_b}. Diff: {opens_b - closes_b}")
print(f"Lines: {len(content.splitlines())}")
