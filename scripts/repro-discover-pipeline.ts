/**
 * Exact reproduction of DiscoverScreen's filter pipeline (verbatim logic copied
 * from src/screens/Discover/DiscoverScreen.tsx @ main 350c44e) against the 209
 * mapped objects from the public staging API, for device positions that place
 * Sundance Square (dal-007) at ~15.3 mi.
 *
 * Run:  EXPO_PUBLIC_API_URL=https://b118a520627ac1a10a1362a93ff3b3f5.ctonew.app bun run repro-discover-pipeline.ts
 */
import { apiClient } from '../src/services/api.ts';

// ── Verbatim copy of toFilmingLocation from src/services/hooks.ts ──
function toFilmingLocation(api: any): any {
  return {
    id: api.id,
    title: api.title,
    movieOrShow: api.movieOrShow,
    year: api.year,
    category: api.category,
    latitude: api.latitude,
    longitude: api.longitude,
    address: (api as any).address || '',
    city: api.city,
    country: api.country,
    sceneDescription: (api as any).sceneDescription || '',
    funFact: (api as any).funFact || '',
    quote: (api as any).quote || null,
    quoteAttribution: (api as any).quoteAttribution || null,
    thenAndNow: (api as any).thenAndNow || null,
    isMovie: Boolean(api.isMovie),
    distanceFromUser: api.distance,
    actors: (api as any).actors || [],
    imageUrl: api.imageUrl || undefined,
    focalPoint: api.focalPoint || undefined,
  };
}

// ── fetch exactly what useAllLocations() does ──
const p1 = await apiClient.getLocations(200, 0);
const p2 = await apiClient.getLocations(200, 200);
const allRaw = [...p1, ...p2];
const allLocations = allRaw.map(toFilmingLocation).filter(Boolean) as any[];
console.log(`== useAllLocations() -> raw ${allRaw.length}, mapped ${allLocations.length} ==\n`);

// ── verbatim from DiscoverScreen.tsx ──
const RADIUS_STAGES = [3, 5, 10, 25, 50];
const locationsByCategory = (cat: string) => allLocations.filter((l) => l.category === cat);

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
const distMiles = (uLat: number, uLon: number, lat: number, lon: number) =>
  haversine(uLat, uLon, lat, lon) / 1609.34;

function runPipeline(uLat: number, uLon: number, opts: { searchQuery?: string; selectedCategory?: string; selectedType?: string } = {}) {
  const { searchQuery = '', selectedCategory = 'all', selectedType = 'all' } = opts;

  // activeRadius (verbatim)
  let base = selectedCategory === 'all' ? allLocations : locationsByCategory(selectedCategory);
  if (selectedType === 'movies') base = base.filter((l) => l.isMovie);
  else if (selectedType === 'shows') base = base.filter((l) => !l.isMovie);
  const baseWithDist = base.map((loc) => ({ ...loc, distanceFromUser: distMiles(uLat, uLon, loc.latitude, loc.longitude) }));
  let activeRadius: number | null = null;
  if (searchQuery.trim()) activeRadius = RADIUS_STAGES[RADIUS_STAGES.length - 1];
  else {
    for (const stage of RADIUS_STAGES) {
      if (baseWithDist.some((loc) => loc.distanceFromUser <= stage)) { activeRadius = stage; break; }
    }
    if (activeRadius === null) activeRadius = 50;
  }

  // filteredLocations (verbatim)
  let result: any[] = selectedCategory === 'all' ? allLocations : locationsByCategory(selectedCategory);
  if (selectedType === 'movies') result = result.filter((l) => l.isMovie);
  else if (selectedType === 'shows') result = result.filter((l) => !l.isMovie);
  const stageCategoryTypeCount = result.length;
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    result = result.filter(
      (loc) => loc.title.toLowerCase().includes(q) || loc.movieOrShow.toLowerCase().includes(q) || loc.city.toLowerCase().includes(q),
    );
  }
  const stageAfterSearchCount = result.length;
  if (uLat !== null && uLon !== null) {
    result = result.map((loc) => ({ ...loc, distanceFromUser: distMiles(uLat, uLon, loc.latitude, loc.longitude) }));
    if (!searchQuery.trim()) {
      const radius = activeRadius ?? RADIUS_STAGES[RADIUS_STAGES.length - 1];
      result = result.filter((loc) => loc.distanceFromUser <= radius);
    }
  }
  const stageAfterRadiusCount = result.length;
  if (uLat !== null && uLon !== null) {
    result = [...result].sort((a, b) => (a.distanceFromUser || 0) - (b.distanceFromUser || 0));
  }
  const filteredLocations = result;

  // nearYou (verbatim)
  const withDist = allLocations.map((loc) => ({ ...loc, distanceFromUser: distMiles(uLat, uLon, loc.latitude, loc.longitude) }));
  const nearYou = withDist
    .filter((loc) => loc.distanceFromUser <= (activeRadius ?? RADIUS_STAGES[RADIUS_STAGES.length - 1]))
    .sort((a, b) => (a.distanceFromUser || 0) - (b.distanceFromUser || 0))
    .slice(0, 5);

  return { activeRadius, stageCategoryTypeCount, stageAfterSearchCount, stageAfterRadiusCount, filteredLocations, nearYou };
}

const sundance = allLocations.find((l) => l.id === 'dal-007')!;
console.log(`Sundance Square: id=${sundance.id} lat=${sundance.latitude} lon=${sundance.longitude} movieOrShow=${sundance.movieOrShow} category=${sundance.category} isMovie=${sundance.isMovie}`);
console.log(`AT&T Stadium (dal-004) in dataset? ${allLocations.some((l) => l.id === 'dal-004')}\n`);

// 15.3 mi in degrees lon at lat 32.7555 ≈ 15.3 / 58.17 ≈ 0.263
const candidates: Record<string, [number, number]> = {
  'E (Arlington/Grand Prairie)': [32.7555, -97.3308 + 0.263],
  'NE': [32.7555 + 0.16, -97.3308 + 0.21],
  'N': [32.7555 + 0.224, -97.3308],
  'NW': [32.7555 + 0.16, -97.3308 - 0.21],
  'W (Weatherford side)': [32.7555, -97.3308 - 0.263],
  'S (Cleburne side)': [32.7555 - 0.224, -97.3308],
  'SE': [32.7555 - 0.16, -97.3308 + 0.21],
};

for (const [label, [lat, lon]] of Object.entries(candidates)) {
  const sundanceDist = distMiles(lat, lon, sundance.latitude, sundance.longitude);
  const r = runPipeline(lat, lon);
  const dalInFeed = r.filteredLocations.filter((l) => l.id.startsWith('dal-'));
  const dalNear = r.nearYou.filter((l) => l.id.startsWith('dal-'));
  console.log(`--- device ${label} (${lat.toFixed(4)}, ${lon.toFixed(4)}) -> Sundance dist ${sundanceDist.toFixed(1)} mi ---`);
  console.log(`  activeRadius=${r.activeRadius} | cat/type stage: ${r.stageCategoryTypeCount} | after search: ${r.stageAfterSearchCount} | after radius: ${r.stageAfterRadiusCount}`);
  console.log(`  feed dal-*: ${dalInFeed.map((l) => `${l.id}(${l.distanceFromUser?.toFixed(1)}mi)`).join(', ') || 'NONE'}`);
  console.log(`  feed total: ${r.filteredLocations.length} | nearYou total: ${r.nearYou.length} (${dalNear.map((l) => l.id).join(', ') || 'no dal'})`);
}

// non-default states at the east (Arlington) position
const [aLat, aLon] = candidates['E (Arlington/Grand Prairie)'];
console.log(`\n=== non-default states @ E position (${aLat.toFixed(4)}, ${aLon.toFixed(4)}) ===`);
for (const state of [
  { label: 'search="landman"', opts: { searchQuery: 'landman' } },
  { label: 'search="dallas"', opts: { searchQuery: 'dallas' } },
  { label: 'search="blind side"', opts: { searchQuery: 'blind side' } },
  { label: 'type=movies', opts: { selectedType: 'movies' } },
  { label: 'type=shows', opts: { selectedType: 'shows' } },
  { label: 'cat=drama', opts: { selectedCategory: 'drama' } },
  { label: 'cat=action', opts: { selectedCategory: 'action' } },
]) {
  const r = runPipeline(aLat, aLon, state.opts);
  console.log(`  ${state.label}: activeRadius=${r.activeRadius} feed=[${r.filteredLocations.map((l) => `${l.id}(${l.distanceFromUser?.toFixed(1)}mi)`).join(', ') || 'EMPTY'}]`);
}
