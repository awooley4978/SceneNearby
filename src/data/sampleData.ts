import { MusicLocation, LocationCategory, LocationRating, CommunityPhoto, AlbumGroup, ArtistGroup } from '../models';

const DEFAULT_LOCATION = { latitude: 40.7580, longitude: -73.9855 }; // Times Square, NYC

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const clampedA = Math.min(a, 1);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - clampedA));
  return isFinite(R * c) ? R * c : 0;
}

const newYorkLocations: MusicLocation[] = [
  {
    id: 'nyc-001', title: 'CBGB', artistName: 'Ramones', year: 1974,
    imageUrl: 'https://pub-d11c6004b03c42edb2633f3ec6a9317b.r2.dev/BowBridge.jpg',
    focalPoint: { x: 0.5, y: 0.45 },
    category: LocationCategory.rock, latitude: 40.7253, longitude: -73.9917,
    address: '315 Bowery, New York, NY 10003\nBest Access: Bleecker St (6 train)\nNearest Subway: Broadway-Lafayette St (B/D/F/M)', city: 'New York City', country: 'USA',
    significance: "The birthplace of American punk rock. From 1973 to 2006, CBGB's grimy stage hosted the Ramones, Patti Smith, Talking Heads, Blondie, and Television — launching a movement that changed music forever. The club's full name stood for 'Country, BlueGrass, and Blues,' though it became synonymous with punk.",
    funFact: "The original awning, stained urinals, and walls covered in decades of band stickers were preserved and moved to museums after the club closed. The space is now a John Varvatos boutique that kept much of the original interior.",
    lyricSnippet: "Hey ho, let's go!",
    lyricAttribution: 'Ramones — "Blitzkrieg Bop"',
    historyNote: 'The space at 315 Bowery is now a high-end clothing store, but the iconic awning was donated to the Rock & Roll Hall of Fame. A small plaque outside marks its musical legacy.',
    estimatedVisitTime: '15-30 min',
    isAlbum: false,
  },
  {
    id: 'nyc-002', title: 'Apollo Theater', artistName: 'James Brown', year: 1962,
    imageUrl: 'https://pub-d11c6004b03c42edb2633f3ec6a9317b.r2.dev/Katz\'s_Deli.jpg',
    category: LocationCategory.jazz, latitude: 40.8100, longitude: -73.9500,
    address: '253 W 125th St, New York, NY 10027', city: 'New York City', country: 'USA',
    significance: "Harlem's legendary Apollo Theater launched the careers of Ella Fitzgerald, James Brown, Aretha Franklin, Stevie Wonder, and countless others. Its Amateur Night — where the crowd's approval (or brutal disapproval) could make or break a performer — became the stuff of music legend.",
    funFact: "The Apollo's famous 'Tree of Hope' stump at stage right has been rubbed by performers for good luck since the 1930s. James Brown recorded his landmark 'Live at the Apollo' album here in 1962 — and had to finance the recording himself because his label thought a live album wouldn't sell.",
    lyricSnippet: 'Say it loud — I\'m black and I\'m proud!',
    lyricAttribution: 'James Brown — "Say It Loud"',
    historyNote: 'The Apollo still operates as a thriving theater, hosting Amateur Night every Wednesday. It was designated a New York City Landmark in 1983.',
    estimatedVisitTime: '1-2 hrs',
    isAlbum: true,
  },
  {
    id: 'nyc-003', title: 'Electric Lady Studios', artistName: 'Jimi Hendrix', year: 1970,
    imageUrl: 'https://pub-d11c6004b03c42edb2633f3ec6a9317b.r2.dev/GrandCentralStation.jpg',
    category: LocationCategory.rock, latitude: 40.7314, longitude: -73.9970,
    address: '52 W 8th St, New York, NY 10011', city: 'New York City', country: 'USA',
    significance: "Jimi Hendrix designed and built Electric Lady Studios as his creative sanctuary in Greenwich Village. Opening just weeks before his death in 1970, it became one of the world's most iconic recording studios — hosting everyone from Stevie Wonder to David Bowie, John Lennon, Patti Smith, and Taylor Swift.",
    funFact: "Hendrix personally oversaw every detail of the studio's design, from the curved walls to the psychedelic lighting. He recorded his final tracks here before his death. The studio's 'Round Room' features a 360-degree mural by artist Lance Jost.",
    lyricSnippet: "And so castles made of sand fall in the sea, eventually.",
    lyricAttribution: 'Jimi Hendrix — "Castles Made of Sand"',
    historyNote: 'Electric Lady remains one of the most sought-after recording studios in the world. Recent albums recorded here include works by Adele, Lorde, and The Strokes.',
    estimatedVisitTime: 'Quick Stop (< 15 min)\nVisitor Tip: The studio is not open to the public — this is an exterior-only visit. The distinctive rainbow mural on the facade is the photo spot.',
    isAlbum: false,
  },
  {
    id: 'nyc-004', title: '1520 Sedgwick Avenue', artistName: 'DJ Kool Herc', year: 1973,
    imageUrl: 'https://pub-d11c6004b03c42edb2633f3ec6a9317b.r2.dev/EmpireStateBuildingObservationDeck.jpg',
    focalPoint: { x: 0.5, y: 0.25 },
    category: LocationCategory.hipHop, latitude: 40.8455, longitude: -73.9212,
    address: '1520 Sedgwick Ave, Bronx, NY 10453', city: 'New York City', country: 'USA',
    significance: "On August 11, 1973, DJ Kool Herc threw a back-to-school party in the rec room at 1520 Sedgwick Avenue. Using two turntables to extend the instrumental breaks of funk and soul records, he invented the 'breakbeat' — the foundational technique of hip-hop music. This Bronx apartment building is universally recognized as the birthplace of hip-hop.",
    funFact: "The party cost 25 cents for ladies and 50 cents for 'fellas.' Herc's sister Cindy organized the party to raise money for back-to-school clothes. The building was nearly sold to developers in 2007, but a coalition of activists and hip-hop legends fought to preserve it.",
    lyricSnippet: null,
    lyricAttribution: null,
    historyNote: '1520 Sedgwick Avenue was added to the National Register of Historic Places in 2007. A commemorative plaque marks the site, and it remains an affordable housing co-op.',
    isAlbum: false,
  },
  {
    id: 'nyc-005', title: 'Strawberry Fields — Imagine Mosaic', artistName: 'John Lennon', year: 1980,
    imageUrl: 'https://pub-d11c6004b03c42edb2633f3ec6a9317b.r2.dev/ImagineMosaic.jpg',
    category: LocationCategory.rock, latitude: 40.7760, longitude: -73.9747,
    address: 'Central Park (West 72nd Street Entrance)\nQ2GG+83, New York, NY 10019', city: 'New York City', country: 'USA',
    significance: "Created as a living memorial to John Lennon after his assassination in 1980, Strawberry Fields is a 2.5-acre section of Central Park directly across from the Dakota building where Lennon lived and was killed. The iconic black-and-white 'Imagine' mosaic, a gift from the city of Naples, Italy, has become a pilgrimage site for Beatles fans worldwide.",
    funFact: "The memorial was named after the Beatles song 'Strawberry Fields Forever.' On the anniversary of Lennon's death (December 8) and his birthday (October 9), hundreds of fans gather here for all-day sing-alongs of Beatles songs.",
    lyricSnippet: 'Imagine all the people living life in peace.',
    lyricAttribution: 'John Lennon — "Imagine"',
    historyNote: 'Strawberry Fields remains one of the most visited memorials in New York City. The mosaic is constantly adorned with fresh flowers, candles, and personal tributes left by fans.',
    estimatedVisitTime: '20-30 min',
    isAlbum: false,
  },
];

const losAngelesLocations: MusicLocation[] = [
  {
    id: 'la-001', title: 'The Troubadour', artistName: 'Joni Mitchell', year: 1970,
    imageUrl: 'https://pub-d11c6004b03c42edb2633f3ec6a9317b.r2.dev/GriffithObservatory.jpg',
    focalPoint: { x: 0.5, y: 0.35 },
    category: LocationCategory.folk, latitude: 34.0815, longitude: -118.3893,
    address: '9081 Santa Monica Blvd, West Hollywood, CA 90069', city: 'Los Angeles', country: 'USA',
    significance: "The Troubadour is where careers were made. Elton John's legendary 1970 US debut happened here. Joni Mitchell, James Taylor, and Carole King played intimate sets in its wood-paneled room. The Eagles were discovered on its stage. In the 80s, it became ground zero for hair metal — Guns N' Roses and Mötley Crüe cut their teeth here.",
    funFact: "The club's 'Doug Weston's Troubadour' sign has been a West Hollywood landmark since 1957. The venue's upstairs bar, once a private club for industry insiders, now hosts smaller shows. Bob Dylan and Paul McCartney have been spotted in the crowd as audience members.",
    lyricSnippet: "They paved paradise and put up a parking lot.",
    lyricAttribution: 'Joni Mitchell — "Big Yellow Taxi"',
    historyNote: 'The Troubadour celebrated its 60th anniversary in 2017 and continues to host rising artists and surprise performances by legends nearly every week.',
    estimatedVisitTime: '2-3 hrs (if attending a show)',
    isAlbum: false,
  },
  {
    id: 'la-002', title: 'Capitol Records Building', artistName: 'The Beach Boys', year: 1966,
    imageUrl: 'https://pub-d11c6004b03c42edb2633f3ec6a9317b.r2.dev/BradburyBuilding.jpg',
    focalPoint: { x: 0.5, y: 0.35 },
    category: LocationCategory.rock, latitude: 34.1031, longitude: -118.3263,
    address: '1750 Vine St, Hollywood, CA 90028', city: 'Los Angeles', country: 'USA',
    significance: "The world's first circular office tower, designed to look like a stack of vinyl records on a turntable. Built in 1956, Capitol Records' iconic Hollywood headquarters has been the creative home to Frank Sinatra, Nat King Cole, The Beach Boys, and countless others. Its echo chambers, built into the concrete under the parking lot, produced the signature sound of classic Capitol recordings.",
    funFact: "The building's spire blinks 'Hollywood' in Morse code 24/7. The red light at the top was originally installed so pilots could see the building. The underground echo chambers — eight trapezoidal rooms designed by guitarist Les Paul — are still in use today.",
    lyricSnippet: "Good vibrations, excitations, ooh bop bop.",
    lyricAttribution: 'The Beach Boys — "Good Vibrations"',
    historyNote: 'The building was designated a Los Angeles Historic-Cultural Monument in 2006. While the studios are not open to the public, the ground-floor lobby occasionally hosts exhibits.',
    estimatedVisitTime: 'Quick Stop (< 15 min)',
    isAlbum: false,
  },
  {
    id: 'la-003', title: 'Whisky a Go Go', artistName: 'The Doors', year: 1966,
    imageUrl: 'https://pub-d11c6004b03c42edb2633f3ec6a9317b.r2.dev/WhiskyaGoGo.jpg',
    category: LocationCategory.rock, latitude: 34.0907, longitude: -118.3856,
    address: '8901 W Sunset Blvd, West Hollywood, CA 90069', city: 'Los Angeles', country: 'USA',
    significance: "The Whisky a Go Go is where The Doors became The Doors. As the house band in 1966, Jim Morrison and company honed their dark, theatrical sound on this stage. When Morrison performed 'The End' with its Oedipal climax, they were fired — and became legends overnight. The club was America's first live music disco and launched the Sunset Strip as the epicenter of rock.",
    funFact: "The club's name came from the French 'discothèque à gogo' (nightclub with plenty of everything). The famous go-go dancers in cages were inspired by a club in Paris. In the 1980s, the Whisky was ground zero for the Sunset Strip metal scene — Guns N' Roses, Metallica, and Van Halen all played legendary shows here.",
    lyricSnippet: 'This is the end, beautiful friend.',
    lyricAttribution: 'The Doors — "The End"',
    historyNote: 'The Whisky is still an active music venue on the Sunset Strip, hosting both established and emerging bands. The marquee and iconic neon sign remain exactly as they looked in the 60s.',
    isAlbum: false,
  },
  {
    id: 'la-004', title: 'Laurel Canyon — Lookout Mountain', artistName: 'Crosby, Stills & Nash', year: 1969,
    imageUrl: 'https://pub-d11c6004b03c42edb2633f3ec6a9317b.r2.dev/UnionStation.jpg',
    category: LocationCategory.folk, latitude: 34.1175, longitude: -118.3730,
    address: 'Lookout Mountain Ave & Wonderland Ave, Los Angeles, CA 90046', city: 'Los Angeles', country: 'USA',
    significance: "In the late 1960s and early 70s, Laurel Canyon was the epicenter of the folk-rock revolution. Joni Mitchell, The Byrds, Buffalo Springfield, The Mamas & the Papas, and Frank Zappa all lived within walking distance of each other. CSN famously harmonized in Joni's living room here. The canyon's rustic seclusion, just minutes from Hollywood, created a musical community unlike any other.",
    funFact: "The legendary 'Laurel Canyon sound' was partly inspired by the canyon's actual acoustics. Musicians would gather for all-night jam sessions in wood-paneled living rooms. Jim Morrison wrote much of 'The Soft Parade' in a house on Rothdell Trail. Mama Cass's house was the social hub — she hosted legendary parties where you might find Eric Clapton jamming with David Crosby.",
    lyricSnippet: "We are stardust, we are golden.",
    lyricAttribution: 'Joni Mitchell — "Woodstock"',
    historyNote: 'Laurel Canyon remains a residential neighborhood. The Country Store at 2108 Laurel Canyon Blvd — where Frank Zappa once bought cigarettes — is now a café. Lookout Mountain offers stunning views of the LA basin.',
    estimatedVisitTime: '30 min - 1 hr (scenic drive)',
    isAlbum: false,
  },
  {
    id: 'la-005', title: 'The Roxy Theatre', artistName: 'Bruce Springsteen', year: 1975,
    imageUrl: 'https://pub-d11c6004b03c42edb2633f3ec6a9317b.r2.dev/TCLChineseTheatre.jpg',
    category: LocationCategory.rock, latitude: 34.0907, longitude: -118.3883,
    address: '9009 W Sunset Blvd, West Hollywood, CA 90069', city: 'Los Angeles', country: 'USA',
    significance: "Opened in 1973, the Roxy quickly became LA's premier showcase venue. Bruce Springsteen's legendary 1975 stand here — with the E Street Band at their most hungry — is considered one of the greatest live performances in rock history. Neil Young, Bob Marley, and The Rocky Horror Picture Show all launched from this stage.",
    funFact: "The venue was opened by Lou Adler and originally run as a members-only private club. The famous 'On the Rox' bar upstairs was notorious as the after-hours hangout for John Lennon, Keith Moon, and other rock royalty during their 'lost weekends' in LA.",
    lyricSnippet: "Tramps like us, baby, we were born to run.",
    lyricAttribution: 'Bruce Springsteen — "Born to Run"',
    historyNote: 'The Roxy continues to host live music nightly. The venue seats about 500 and is known for its excellent sound system and intimate atmosphere.',
    isAlbum: false,
  },
];

const londonLocations: MusicLocation[] = [
  {
    id: 'ldn-001', title: 'Abbey Road Studios & Crossing', artistName: 'The Beatles', year: 1969,
    imageUrl: 'https://pub-d11c6004b03c42edb2633f3ec6a9317b.r2.dev/Platform_9_3-4%2C_King\'s_Cross.jpg',
    category: LocationCategory.rock, latitude: 51.5323, longitude: -0.1778,
    address: '3 Abbey Rd, London NW8 9AY\nBest Access: St. John\'s Wood (Jubilee Line)\nThe zebra crossing is right outside the studio entrance', city: 'London', country: 'UK',
    significance: "The most famous zebra crossing in the world. On August 8, 1969, The Beatles walked back and forth across this St. John's Wood street for just 10 minutes while photographer Iain Macmillan snapped six frames from a stepladder. That image became the cover of 'Abbey Road' — and the studio itself, where The Beatles recorded nearly all of their albums, became hallowed ground for music lovers.",
    funFact: 'The white VW Beetle (license plate LMW 281F) parked in the background of the album cover was sold at auction in 1986 for £2,530. The crossing was granted Grade II listed status in 2010 — the first zebra crossing ever to receive historic protection. The studio\'s Studio Two, where "Sgt. Pepper" was recorded, remains one of the finest-sounding rooms on Earth.',
    lyricSnippet: 'And in the end, the love you take is equal to the love you make.',
    lyricAttribution: 'The Beatles — "The End" (from Abbey Road)',
    historyNote: 'Abbey Road Studios is still a working recording studio (artists include Adele, Radiohead, and Ed Sheeran). The crossing gets so busy that Transport for London installed a live webcam so fans can watch the chaos from home.',
    estimatedVisitTime: '20-30 min',
    isAlbum: true,
  },
  {
    id: 'ldn-002', title: 'Royal Albert Hall', artistName: 'Jimi Hendrix', year: 1969,
    imageUrl: 'https://pub-d11c6004b03c42edb2633f3ec6a9317b.r2.dev/Former%20Site%20of%20Sherlock\'s%20Home.jpg',
    category: LocationCategory.classical, latitude: 51.5010, longitude: -0.1775,
    address: 'Kensington Gore, London SW7 2AP', city: 'London', country: 'UK',
    significance: "Opened by Queen Victoria in 1871, the Royal Albert Hall is Britain's most iconic concert venue. Hendrix played his final UK show here. The Beatles performed here. Adele's legendary 2011 concert was filmed here. The annual BBC Proms classical music festival has called it home since 1941. Pink Floyd premiered 'Atom Heart Mother' with a full orchestra on this stage.",
    funFact: "The hall's distinctive dome was designed with a series of glass-and-iron 'sound diffusers' suspended from the ceiling, creating its famously warm acoustics. In 1969, during a Pink Floyd performance, the crew accidentally detached a prop cannon that floated into the dome — they had to cut the show short.",
    lyricSnippet: null,
    lyricAttribution: null,
    historyNote: 'The Royal Albert Hall hosts over 390 events annually, from classical concerts to rock shows to the Cirque du Soleil. Tours of the building run daily.',
    estimatedVisitTime: '1-2 hrs',
    isAlbum: false,
  },
  {
    id: 'ldn-003', title: 'Denmark Street — Tin Pan Alley', artistName: 'The Rolling Stones', year: 1964,
    imageUrl: 'https://pub-d11c6004b03c42edb2633f3ec6a9317b.r2.dev/LeadenhallMarket.jpg',
    category: LocationCategory.rock, latitude: 51.5153, longitude: -0.1290,
    address: 'Denmark St, London WC2H 8NL\nNearest Tube: Tottenham Court Road', city: 'London', country: 'UK',
    significance: "A short Soho street that packs more music history per square foot than anywhere in Britain. Known as 'Tin Pan Alley,' Denmark Street was the heart of the British music publishing industry. The Rolling Stones recorded their first album in Regent Sound Studio at No. 4. The Sex Pistols lived, rehearsed, and recorded above No. 6. David Bowie, Elton John, and Jimi Hendrix were regulars in its guitar shops and cafés.",
    funFact: "The street's music shops were so dense that in the 1960s you could walk its length and hear a dozen different songs being rehearsed simultaneously from open windows. The 12 Bar Club at No. 26 was a pivotal venue for the UK folk revival — it was torn down in 2015, sparking a campaign to save the street's musical heritage.",
    lyricSnippet: "It\'s only rock \'n roll, but I like it.",
    lyricAttribution: 'The Rolling Stones — "It\'s Only Rock \'n Roll"',
    historyNote: 'Denmark Street still houses many of London\'s best guitar and instrument shops. The historic buildings at Nos. 4-6 have been preserved, though commercial pressures continue to change the street\'s character.',
    estimatedVisitTime: '15-30 min',
    isAlbum: false,
  },
  {
    id: 'ldn-004', title: '100 Club', artistName: 'The Sex Pistols', year: 1976,
    imageUrl: 'https://pub-d11c6004b03c42edb2633f3ec6a9317b.r2.dev/TrafalgarSquare.jpg',
    category: LocationCategory.rock, latitude: 51.5160, longitude: -0.1350,
    address: '100 Oxford St, London W1D 1LL', city: 'London', country: 'UK',
    significance: "The 100 Club is where British punk exploded. On September 20-21, 1976, the 100 Club Punk Festival featured the Sex Pistols, The Clash, Siouxsie and the Banshees, and the Buzzcocks — introducing punk to a stunned British public. But the venue's legacy goes deeper: it opened in 1942 as a jazz club where Louis Armstrong and Glenn Miller played, and hosted blues legends like BB King and Muddy Waters.",
    funFact: "The 100 Club is the oldest continuously operating live music venue in Europe. It survived a near-closure in 2010 when a coalition of musicians — including Paul McCartney and Noel Gallagher — campaigned to save it. The basement's low ceiling and brick walls create an intense, intimate atmosphere that hasn't changed in decades.",
    lyricSnippet: 'No future, no future, no future for you!',
    lyricAttribution: 'Sex Pistols — "God Save the Queen"',
    historyNote: 'The 100 Club continues to host live music several nights a week. Its 80th anniversary in 2022 cemented its status as a living museum of British music.',
    estimatedVisitTime: '2-3 hrs (if attending a show)',
    isAlbum: false,
  },
  {
    id: 'ldn-005', title: 'The Roundhouse', artistName: 'Pink Floyd', year: 1966,
    imageUrl: 'https://pub-d11c6004b03c42edb2633f3ec6a9317b.r2.dev/TheShard.jpg',
    category: LocationCategory.rock, latitude: 51.5433, longitude: -0.1519,
    address: 'Chalk Farm Rd, London NW1 8EH', city: 'London', country: 'UK',
    significance: "Built in 1846 as a locomotive roundhouse, this circular Camden venue became London's psychedelic nerve centre in the 1960s. Pink Floyd played their first major London shows here, debuting their liquid light show and extended psychedelic jams to bewildered audiences. Jimi Hendrix played here. The venue also hosted the only UK performance of The Doors.",
    funFact: "The Roundhouse's unique circular design means there are no obstructed views from anywhere in the audience. In the 1970s, it was briefly used as a gin warehouse. After a major renovation in 2006, it reopened as a state-of-the-art performance space while preserving its historic cast-iron pillars.",
    lyricSnippet: "We don\'t need no education.",
    lyricAttribution: 'Pink Floyd — "Another Brick in the Wall, Part 2"',
    historyNote: 'The Roundhouse is now a thriving arts centre hosting concerts, theatre, and circus performances year-round. The Camden neighborhood around it remains a hub for London\'s alternative music scene.',
    estimatedVisitTime: '1-2 hrs (if visiting for a show)',
    isAlbum: false,
  },
];

const nashvilleLocations: MusicLocation[] = [
  {
    id: 'nsh-001', title: 'Ryman Auditorium', artistName: 'Johnny Cash', year: 1956,
    imageUrl: 'https://pub-d11c6004b03c42edb2633f3ec6a9317b.r2.dev/WhelansPub.jpg',
    focalPoint: { x: 0.5, y: 0.35 },
    category: LocationCategory.folk, latitude: 36.1612, longitude: -86.7766,
    address: '116 5th Ave N, Nashville, TN 37219', city: 'Nashville', country: 'USA',
    significance: "The 'Mother Church of Country Music.' Built as a tabernacle in 1892, the Ryman became home to the Grand Ole Opry from 1943 to 1974. Every country legend — Hank Williams, Patsy Cline, Johnny Cash, Dolly Parton — graced this stage. Its wooden pews and stained-glass windows give it a sacred atmosphere unlike any other concert venue. Johnny Cash met June Carter here in 1956 — and proposed to her on this very stage in 1968.",
    funFact: "The Ryman's legendary acoustics were discovered by accident. The building was originally a church, and the curved balcony and hardwood floors create a near-perfect listening experience. Artists still say performing here feels spiritual — you can hear a pin drop from the stage.",
    lyricSnippet: 'I fell into a burning ring of fire.',
    lyricAttribution: 'Johnny Cash — "Ring of Fire"',
    historyNote: 'After the Opry moved out in 1974, the Ryman fell into disrepair. A $14 million restoration in 1994 brought it back to glory, and it now hosts over 200 shows annually alongside daytime tours.',
    estimatedVisitTime: '1-2 hrs (tour) or 3 hrs (for a show)',
    isAlbum: false,
  },
  {
    id: 'nsh-002', title: 'Grand Ole Opry House', artistName: 'Dolly Parton', year: 1974,
    imageUrl: 'https://pub-d11c6004b03c42edb2633f3ec6a9317b.r2.dev/TreviFountain.jpg',
    category: LocationCategory.folk, latitude: 36.2068, longitude: -86.6920,
    address: '600 Opry Mills Dr, Nashville, TN 37214', city: 'Nashville', country: 'USA',
    significance: "The permanent home of the Grand Ole Opry since 1974, this 4,400-seat venue is the heart of country music's most enduring institution. Dolly Parton, Garth Brooks, Reba McEntire, and every major country artist performs here. The famous six-foot circle of oak flooring cut from the Ryman Auditorium stage was embedded into center stage — so every artist who performs here stands on the same wood as Hank Williams and Patsy Cline.",
    funFact: "The Opry broadcasts live on WSM radio every week — it's the longest-running radio show in American history, airing since 1925. During the 2010 Nashville floods, the Opry House was submerged in 4 feet of water. The iconic circle of Ryman floorboards survived. The show must go on.",
    lyricSnippet: 'Working 9 to 5, what a way to make a living.',
    lyricAttribution: 'Dolly Parton — "9 to 5"',
    historyNote: 'The Opry House underwent a $12 million renovation in 2020 and continues to host the Grand Ole Opry show multiple nights per week, plus major touring acts.',
    estimatedVisitTime: '2-3 hrs',
    isAlbum: false,
  },
  {
    id: 'nsh-003', title: 'The Bluebird Cafe', artistName: 'Taylor Swift', year: 2004,
    imageUrl: 'https://pub-d11c6004b03c42edb2633f3ec6a9317b.r2.dev/SpanishSteps%2C.jpg',
    category: LocationCategory.folk, latitude: 36.1025, longitude: -86.8170,
    address: '4104 Hillsboro Pike, Nashville, TN 37215', city: 'Nashville', country: 'USA',
    significance: "A tiny 90-seat venue in a strip mall that became the most important listening room in America. The Bluebird's 'in-the-round' format — four songwriters on stools, sharing songs and stories — launched the careers of Garth Brooks, Taylor Swift, and countless Nashville songwriters. Taylor Swift was discovered here at age 14 by Scott Borchetta, who signed her to his new label Big Machine Records.",
    funFact: "The Bluebird's strict 'shhh' policy means no talking during performances — the intimacy is the point. Garth Brooks played his first industry showcase here, and when only a handful of people showed up, he played as if the room was full. The venue was featured prominently in the TV show 'Nashville.'",
    lyricSnippet: "You\'re on the phone with your girlfriend, she\'s upset.",
    lyricAttribution: 'Taylor Swift — "You Belong With Me"',
    historyNote: 'The Bluebird still operates as a listening room. Reservations are notoriously hard to get — tickets for the best shows sell out within seconds of release.',
    estimatedVisitTime: '2 hrs (if attending a show — reservations essential)',
    isAlbum: false,
  },
  {
    id: 'nsh-004', title: 'RCA Studio B', artistName: 'Elvis Presley', year: 1958,
    imageUrl: 'https://pub-d11c6004b03c42edb2633f3ec6a9317b.r2.dev/DealeyPlaza.jpeg',
    category: LocationCategory.rock, latitude: 36.1500, longitude: -86.7770,
    address: '1611 Roy Acuff Pl, Nashville, TN 37203', city: 'Nashville', country: 'USA',
    significance: "Nashville's oldest surviving recording studio — and the birthplace of the 'Nashville Sound.' Elvis Presley recorded over 200 songs here, including 'Are You Lonesome Tonight?' and 'It's Now or Never.' Roy Orbison, Dolly Parton, Chet Atkins, and the Everly Brothers all cut classics in this room. The studio's RCA 44BX ribbon microphone still captures the warm, rich tones that defined an era.",
    funFact: "Elvis was so fond of Studio B that he installed red and blue lights to create what he called a 'mood.' When recording 'Are You Lonesome Tonight?,' he insisted on total darkness in the studio. The original Steinway piano used on countless hits still sits in the corner.",
    lyricSnippet: 'Are you lonesome tonight? Do you miss me tonight?',
    lyricAttribution: 'Elvis Presley — "Are You Lonesome Tonight?"',
    historyNote: 'RCA Studio B is now part of the Country Music Hall of Fame and Museum. Guided tours run daily, and you can stand exactly where Elvis stood at the mic.',
    estimatedVisitTime: '1 hr (guided tour)',
    isAlbum: false,
  },
  {
    id: 'nsh-005', title: 'Country Music Hall of Fame and Museum', artistName: 'Hank Williams', year: 1949,
    imageUrl: 'https://pub-d11c6004b03c42edb2633f3ec6a9317b.r2.dev/SouthforkRanch.jpeg',
    category: LocationCategory.folk, latitude: 36.1580, longitude: -86.7765,
    address: '222 Rep. John Lewis Way S, Nashville, TN 37203', city: 'Nashville', country: 'USA',
    significance: "Opened in 1967 and housed since 2001 in a dramatic building whose windows are designed to look like piano keys, the Country Music Hall of Fame is the world's largest museum of popular music. It preserves the legacy of Hank Williams, Patsy Cline, Johnny Cash, Dolly Parton, and every country music giant. The rotunda's Hall of Fame plaques are a pilgrimage destination for music lovers.",
    funFact: "The museum's collection includes over 2.5 million artifacts — from Elvis's solid gold Cadillac to Taylor Swift's handwritten lyrics for 'Tim McGraw.' The building's sweeping architectural design includes a 200-foot radio tower that broadcasts WSM from the roof — the same station that aired the Grand Ole Opry since 1925.",
    lyricSnippet: "Hey, good lookin\', what you got cooking?",
    lyricAttribution: 'Hank Williams — "Hey Good Lookin\'"',
    historyNote: 'The museum expanded in 2014 with a $100 million addition, doubling its gallery space. The nearby Hatch Show Print shop (one of America\'s oldest letterpress print shops, operating since 1879) produces iconic concert posters and is part of the museum experience.',
    estimatedVisitTime: '2-3 hrs',
    isAlbum: false,
  },
];

export const allLocations: MusicLocation[] = [
  ...newYorkLocations,
  ...losAngelesLocations,
  ...londonLocations,
  ...nashvilleLocations,
]; // distanceFromUser calculated at runtime from user GPS coordinates

// ── Band Members per location ──
const bandMemberMap: Record<string, string[]> = {
  'nyc-001': ['Joey Ramone', 'Johnny Ramone', 'Dee Dee Ramone', 'Tommy Ramone'],
  'nyc-002': ['James Brown', 'Ella Fitzgerald', 'Aretha Franklin', 'Stevie Wonder'],
  'nyc-003': ['Jimi Hendrix', 'Mitch Mitchell', 'Noel Redding'],
  'nyc-004': ['DJ Kool Herc', 'Grandmaster Flash', 'Afrika Bambaataa'],
  'nyc-005': ['John Lennon', 'Paul McCartney', 'George Harrison', 'Ringo Starr'],
  'la-001': ['Joni Mitchell', 'James Taylor', 'Carole King', 'Elton John'],
  'la-002': ['Brian Wilson', 'Mike Love', 'Al Jardine', 'Dennis Wilson'],
  'la-003': ['Jim Morrison', 'Ray Manzarek', 'Robby Krieger', 'John Densmore'],
  'la-004': ['David Crosby', 'Stephen Stills', 'Graham Nash', 'Neil Young'],
  'la-005': ['Bruce Springsteen', 'Clarence Clemons', 'Steven Van Zandt', 'Max Weinberg'],
  'ldn-001': ['John Lennon', 'Paul McCartney', 'George Harrison', 'Ringo Starr'],
  'ldn-002': ['Jimi Hendrix', 'Noel Redding', 'Mitch Mitchell'],
  'ldn-003': ['Mick Jagger', 'Keith Richards', 'Charlie Watts', 'Ronnie Wood'],
  'ldn-004': ['Johnny Rotten', 'Steve Jones', 'Paul Cook', 'Glen Matlock'],
  'ldn-005': ['David Gilmour', 'Roger Waters', 'Richard Wright', 'Nick Mason'],
  'nsh-001': ['Johnny Cash', 'June Carter Cash', 'Luther Perkins', 'Marshall Grant'],
  'nsh-002': ['Dolly Parton', 'Porter Wagoner', 'Roy Acuff', 'Minnie Pearl'],
  'nsh-003': ['Taylor Swift', 'Garth Brooks', 'Vince Gill', 'Amy Grant'],
  'nsh-004': ['Elvis Presley', 'Scotty Moore', 'Bill Black', 'D.J. Fontana'],
  'nsh-005': ['Hank Williams', 'Patsy Cline', 'Roy Acuff', 'Bill Monroe'],
};

// Merge band members into allLocations
export const allLocationsWithMembers: MusicLocation[] = allLocations.map((loc) => ({
  ...loc,
  bandMembers: bandMemberMap[loc.id] || [],
}));

// ── Artist Groups ──
export function buildArtistGroups(): ArtistGroup[] {
  const groups = new Map<string, ArtistGroup>();
  for (const loc of allLocationsWithMembers) {
    for (const member of loc.bandMembers || []) {
      if (!groups.has(member)) {
        groups.set(member, { name: member, locationIds: [], notableWorks: [] });
      }
      const g = groups.get(member)!;
      if (!g.locationIds.includes(loc.id)) {
        g.locationIds.push(loc.id);
      }
      if (!g.notableWorks.includes(loc.artistName)) {
        g.notableWorks.push(loc.artistName);
      }
    }
  }
  return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export const artistGroups = buildArtistGroups();

export const locationsByArtistMember = (memberName: string): MusicLocation[] =>
  allLocationsWithMembers.filter((loc) => loc.bandMembers?.includes(memberName));

export interface SearchResult {
  type: 'artist' | 'album' | 'member';
  label: string;
  subtitle: string;
  data: any;
}

export const locationsByCity = (city: string): MusicLocation[] =>
  allLocations.filter((l) => l.city === city);

export const locationsByCategory = (category: LocationCategory): MusicLocation[] =>
  allLocations.filter((l) => l.category === category);

export const locationById = (id: string): MusicLocation | undefined => {
  const loc = allLocations.find((l) => l.id === id);
  if (!loc) return undefined;
  const gr = googleRatings[id];
  if (gr) {
    return { ...loc, googleRating: { ...gr, attribution: 'Google' } };
  }
  return loc;
};

export const cities = ['New York City', 'Los Angeles', 'London', 'Nashville'] as const;

// ── Mock Ratings ──

// ── Google Places Ratings ──
export const googleRatings: Record<string, { rating: number; reviewCount: number; placeId: string }> = {
  'nyc-002': { rating: 4.7, reviewCount: 18532, placeId: 'ChIJn6M4zEdZwokRdB24UXFEDcE' },
  'nyc-003': { rating: 4.8, reviewCount: 2856, placeId: 'ChIJxbXkK1VYwokRSQpN3aw_ZAk' },
  'nyc-005': { rating: 4.7, reviewCount: 12340, placeId: 'ChIJT67qlFJYwokRixq5IWlDUck' },
  'la-001': { rating: 4.6, reviewCount: 9845, placeId: 'ChIJK8pX-zy5woARS5n9vxn7cRw' },
  'la-003': { rating: 4.5, reviewCount: 11256, placeId: 'ChIJj8m2qDW5woARYhNPRlb9GBM' },
  'ldn-001': { rating: 4.8, reviewCount: 42310, placeId: 'ChIJLw0JF7QEdkgRaYbPFEAJ_0I' },
  'ldn-002': { rating: 4.7, reviewCount: 56321, placeId: 'ChIJjwQpO7AEdkgR9CJkFUjIFb8' },
  'nsh-001': { rating: 4.8, reviewCount: 23456, placeId: 'ChIJz26oP55kZIgRnoK5SmGH4Sk' },
};
export const mockRatings: Record<string, LocationRating> = {
  'nyc-001': { average: 4.7, count: 43 },
  'nyc-002': { average: 4.9, count: 128 },
  'nyc-003': { average: 4.5, count: 67 },
  'nyc-004': { average: 4.3, count: 89 },
  'nyc-005': { average: 4.8, count: 156 },
  'la-001': { average: 4.9, count: 234 },
  'la-002': { average: 4.6, count: 87 },
  'la-003': { average: 4.7, count: 112 },
  'la-004': { average: 4.4, count: 56 },
  'la-005': { average: 4.5, count: 73 },
  'ldn-001': { average: 4.9, count: 312 },
  'ldn-002': { average: 4.6, count: 178 },
  'ldn-003': { average: 4.3, count: 44 },
  'ldn-004': { average: 4.8, count: 167 },
  'ldn-005': { average: 4.5, count: 98 },
  'nsh-001': { average: 4.9, count: 256 },
  'nsh-002': { average: 4.7, count: 189 },
  'nsh-003': { average: 4.6, count: 134 },
  'nsh-004': { average: 4.8, count: 203 },
  'nsh-005': { average: 4.7, count: 178 },
};

// ── Mock Community Photos ──
export const mockPhotos: CommunityPhoto[] = [
  { id: 'p-001', locationId: 'nyc-001', username: 'punkrock_fan', caption: 'The CBGB awning — legendary! 🤘', timestamp: Date.now() - 86400000 * 3, color: '#EF4444' },
  { id: 'p-002', locationId: 'nyc-001', username: 'ramones_forever', caption: 'Hey ho, let\'s go!', timestamp: Date.now() - 86400000 * 7, color: '#FF9800' },
  { id: 'p-003', locationId: 'nyc-001', username: 'sevenseven', caption: 'Standing where punk was born', timestamp: Date.now() - 86400000 * 14, color: '#2196F3' },
  { id: 'p-004', locationId: 'nyc-002', username: 'soul_brother', caption: 'Say it loud! ✊', timestamp: Date.now() - 86400000 * 2, color: '#EAB308' },
  { id: 'p-005', locationId: 'nyc-002', username: 'apollo_fan', caption: 'Amateur Night was incredible', timestamp: Date.now() - 86400000 * 5, color: '#FF5722' },
  { id: 'p-006', locationId: 'nyc-003', username: 'hendrix_fan', caption: 'The Round Room is pure magic 🎸', timestamp: Date.now() - 86400000 * 10, color: '#9C27B0' },
  { id: 'p-007', locationId: 'nyc-004', username: 'hiphop_head', caption: 'The birthplace! Respect. 🎤', timestamp: Date.now() - 86400000 * 4, color: '#8B5CF6' },
  { id: 'p-008', locationId: 'nyc-005', username: 'beatles_fan42', caption: 'Imagine all the people... 🕊️', timestamp: Date.now() - 86400000 * 8, color: '#4CAF50' },
  { id: 'p-009', locationId: 'la-001', username: 'canyon_songwriter', caption: 'The Troubadour at sunset 🌅', timestamp: Date.now() - 86400000, color: '#22C55E' },
  { id: 'p-010', locationId: 'la-002', username: 'vinyl_collector', caption: 'That building is a record stack!', timestamp: Date.now() - 86400000 * 6, color: '#EF4444' },
  { id: 'p-011', locationId: 'la-003', username: 'lizard_king', caption: 'This is the end... 🚪', timestamp: Date.now() - 86400000 * 20, color: '#2196F3' },
  { id: 'p-012', locationId: 'la-004', username: 'canyon_dreamer', caption: 'Laurel Canyon magic hour', timestamp: Date.now() - 86400000 * 3, color: '#22C55E' },
  { id: 'p-013', locationId: 'la-005', username: 'boss_fan', caption: 'Tramps like us! 🎸', timestamp: Date.now() - 86400000 * 9, color: '#E91E63' },
  { id: 'p-014', locationId: 'ldn-001', username: 'beatlemaniac', caption: 'Walked across the crossing! 🚶‍♂️', timestamp: Date.now() - 86400000 * 12, color: '#00BCD4' },
  { id: 'p-015', locationId: 'ldn-001', username: 'abbey_road_visitor', caption: 'The zebra crossing is real!', timestamp: Date.now() - 86400000 * 4, color: '#FF5722' },
  { id: 'p-016', locationId: 'ldn-002', username: 'proms_fan', caption: 'Royal Albert Hall — breathtaking', timestamp: Date.now() - 86400000 * 2, color: '#F97316' },
  { id: 'p-017', locationId: 'ldn-003', username: 'tin_pan_alley', caption: 'Denmark Street still rocks 🎸', timestamp: Date.now() - 86400000, color: '#F44336' },
  { id: 'p-018', locationId: 'ldn-004', username: 'punk_historian', caption: '100 Club — punk ground zero', timestamp: Date.now() - 86400000 * 5, color: '#FF9800' },
  { id: 'p-019', locationId: 'ldn-005', username: 'floyd_fan', caption: 'The Roundhouse is so unique', timestamp: Date.now() - 86400000 * 8, color: '#795548' },
  { id: 'p-020', locationId: 'nsh-001', username: 'man_in_black', caption: 'The Mother Church 🙏', timestamp: Date.now() - 86400000 * 15, color: '#22C55E' },
  { id: 'p-021', locationId: 'nsh-002', username: 'opry_fan', caption: 'Standing on Hank\'s circle!', timestamp: Date.now() - 86400000 * 3, color: '#2196F3' },
  { id: 'p-022', locationId: 'nsh-003', username: 'swiftie13', caption: 'Where Taylor was discovered 💫', timestamp: Date.now() - 86400000 * 11, color: '#EC4899' },
  { id: 'p-023', locationId: 'nsh-004', username: 'elvis_lives', caption: 'Elvis stood right here', timestamp: Date.now() - 86400000 * 6, color: '#9C27B0' },
  { id: 'p-024', locationId: 'nsh-005', username: 'honky_tonk_fan', caption: 'The Hall of Fame rotunda 👑', timestamp: Date.now() - 86400000 * 2, color: '#FFC107' },
  { id: 'p-025', locationId: 'nsh-005', username: 'country_music_lover', caption: 'Hank Williams\' guitar!', timestamp: Date.now() - 86400000 * 7, color: '#22C55E' },
];

export const photosByLocation = (locationId: string): CommunityPhoto[] =>
  mockPhotos.filter((p) => p.locationId === locationId);

// ── Album Groups ──
function buildAlbumGroups(): AlbumGroup[] {
  const groups = new Map<string, AlbumGroup>();
  for (const loc of allLocations) {
    const key = `${loc.artistName}||${loc.year}`;
    if (!groups.has(key)) {
      groups.set(key, {
        name: loc.artistName,
        year: loc.year,
        isAlbum: loc.isAlbum,
        category: loc.category,
        locationIds: [],
        locationCount: 0,
      });
    }
    const g = groups.get(key)!;
    g.locationIds.push(loc.id);
    g.locationCount = g.locationIds.length;
  }
  return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export const albumGroups = buildAlbumGroups();

export const locationsByArtist = (artistName: string): MusicLocation[] =>
  allLocations.filter((l) => l.artistName === artistName);

export const albumGroupByName = (name: string): AlbumGroup | undefined =>
  albumGroups.find((g) => g.name === name);
