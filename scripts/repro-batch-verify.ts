/**
 * Local reproduction of the Round-6 stabilization batch against the PUBLIC staging URL.
 * Uses the app's own api.ts (real ApiClient, real headers/timeout logic) and verbatim
 * copies of the current hooks.ts transform/sort logic (toFilmingLocation +
 * normalizeCategory + movie-group sort). Verifies:
 *   1. All 210 locations map with zero drops.
 *   2. Every category normalizes to a valid LocationCategory enum value (so
 *      categoryColors / categoryIcons / map pinColor resolve everywhere).
 *   3. sceneDescription + address present on all mapped records (card description
 *      and two-line address data path).
 *   4. actors flow into the mapped model (actor groups / Discover actor search data).
 *   5. Movie groups sort A–Z ignoring a leading "The ", year as tiebreak.
 *   6. Actor groups are non-empty (actor entry point data path).
 *
 * Run:  EXPO_PUBLIC_API_URL=https://b118a520627ac1a10a1362a93ff3b3f5.ctonew.app bun run repro-batch-verify.ts
 */
import { apiClient } from '../src/services/api.ts';
import { LocationCategory, categoryColors } from '../src/models/index.ts';

// ── Verbatim copy of hooks.ts normalizeCategory + toFilmingLocation ──
function normalizeCategory(cat: string): LocationCategory {
  switch ((cat || '').toLowerCase()) {
    case 'drama': return LocationCategory.drama;
    case 'comedy': return LocationCategory.comedy;
    case 'scifi':
    case 'sci-fi': return LocationCategory.sciFi;
    case 'action': return LocationCategory.action;
    case 'romance': return LocationCategory.romance;
    case 'horror': return LocationCategory.horror;
    default: return cat as LocationCategory;
  }
}
function toFilmingLocation(api: any): any {
  return {
    id: api.id,
    title: api.title,
    movieOrShow: api.movieOrShow,
    year: api.year,
    category: normalizeCategory(api.category),
    latitude: api.latitude,
    longitude: api.longitude,
    address: api.address || '',
    city: api.city,
    country: api.country,
    sceneDescription: api.sceneDescription || '',
    isMovie: Boolean(api.isMovie),
    distanceFromUser: api.distance,
    actors: api.actors || [],
    imageUrl: api.imageUrl || undefined,
    focalPoint: api.focalPoint || undefined,
  };
}
// ── Verbatim copy of hooks.ts useMovieGroups group build + sort ──
function buildMovieGroups(locations: any[]) {
  const map = new Map<string, { name: string; year: number; locationIds: string[]; showTitles: Set<string> }>();
  for (const loc of locations) {
    const key = `${loc.movieOrShow}||${loc.year}`;
    if (!map.has(key)) {
      map.set(key, { name: loc.movieOrShow, year: loc.year, locationIds: [], showTitles: new Set() });
    }
    map.get(key)!.locationIds.push(loc.id);
    map.get(key)!.showTitles.add(loc.movieOrShow);
  }
  const groups = Array.from(map.values()).map(g => ({
    ...g,
    locationCount: g.locationIds.length,
  }));
  return groups.sort((a, b) => {
    const sortKey = (t: string) => t.replace(/^The\s+/i, '').toLowerCase();
    const byTitle = sortKey(a.name).localeCompare(sortKey(b.name));
    if (byTitle !== 0) return byTitle;
    return (a.year || 0) - (b.year || 0);
  });
}
// ── Verbatim copy of hooks.ts useActorGroups ──
function buildActorGroups(locations: any[]) {
  const map = new Map<string, { locationIds: Set<string>; showTitles: Set<string> }>();
  for (const loc of locations) {
    for (const actor of (loc.actors || [])) {
      if (!map.has(actor)) map.set(actor, { locationIds: new Set(), showTitles: new Set() });
      const entry = map.get(actor)!;
      entry.locationIds.add(loc.id);
      entry.showTitles.add(loc.movieOrShow);
    }
  }
  return Array.from(map.entries()).map(([name, data]) => ({
    name,
    locationIds: Array.from(data.locationIds),
    showTitles: Array.from(data.showTitles),
  }));
}

const FAIL: string[] = [];
const pass = (ok: boolean, label: string, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) FAIL.push(label);
};

(async () => {
  const raw = await apiClient.getAllLocations();
  const locations = raw.map(toFilmingLocation);
  pass(locations.length === 210, 'all locations map', `${locations.length}/210, zero dropped`);

  // 2. category normalization
  const badCats = locations.filter(l => !categoryColors[l.category as LocationCategory]);
  pass(badCats.length === 0, 'category → color resolves for every location', badCats.length === 0 ? `all ${locations.length} colored` : `uncolored: ${badCats.map(b => b.id).join(',')}`);
  const catSample = Object.keys(categoryColors).map(k => `${k}:${categoryColors[k as LocationCategory]}`);
  console.log(`      categoryColors: ${catSample.join(' ')}`);

  // 3. descriptions + addresses
  const noDesc = locations.filter(l => !l.sceneDescription);
  const noAddr = locations.filter(l => !l.address);
  pass(noDesc.length === 0, 'every location has a scene description', `missing: ${noDesc.length}`);
  pass(noAddr.length === 0, 'every location has an address', `missing: ${noAddr.length}`);
  const dal004 = locations.find(l => l.id === 'dal-004')!;
  console.log(`      dal-004 card line1: "📍 ${dal004.address.split('\n')[0]}"`);
  console.log(`      dal-004 card line2: "${[dal004.city, dal004.country && dal004.country !== 'USA' ? dal004.country : null].filter(Boolean).join(', ')}"`);

  // 4. actors
  const withActors = locations.filter(l => (l.actors || []).length > 0);
  pass(withActors.length > 0, 'actors flow through mapping', `${withActors.length}/${locations.length} locations have actors`);
  console.log(`      dal-004 actors: ${dal004.actors.join(', ')}`);

  // 5. movie group sort (check mirrors the hooks.ts comparator exactly)
  const groups = buildMovieGroups(locations);
  const sortKey = (t: string) => t.replace(/^The\s+/i, '').toLowerCase();
  const compareGroups = (a: any, b: any) => {
    const d = sortKey(a.name).localeCompare(sortKey(b.name));
    return d !== 0 ? d : (a.year || 0) - (b.year || 0);
  };
  const sorted = groups.every((g, i) => i === 0 || compareGroups(groups[i - 1], g) <= 0);
  pass(sorted, 'movie groups sorted A–Z (ignoring "The ")', `${groups.length} groups`);
  const theGroup = groups.find(g => g.name.startsWith('The '));
  if (theGroup) {
    const idx = groups.indexOf(theGroup);
    const prevOk = idx === 0 || compareGroups(groups[idx - 1], theGroup) <= 0;
    const nextOk = idx === groups.length - 1 || compareGroups(theGroup, groups[idx + 1]) <= 0;
    pass(prevOk && nextOk, `"${theGroup.name}" sorted under ${theGroup.name.replace(/^The\s+/i, '')} (display keeps "The")`);
  }
  const first5 = groups.slice(0, 5).map(g => `${g.name} (${g.year})`).join(' | ');
  console.log(`      first groups: ${first5}`);

  // 6. actor groups (Discover actor-search entry point data)
  const actorGroups = buildActorGroups(locations);
  pass(actorGroups.length > 0, 'actor groups non-empty (Discover actor search data)', `${actorGroups.length} actors`);
  const grenier = actorGroups.find(a => a.name === 'Adrian Grenier');
  pass(!!grenier && grenier.locationIds.includes('dal-004'), 'search "Adrian" would hit ActorDetail via dal-004', grenier ? `${grenier.showTitles.join(', ')} x${grenier.locationIds.length}` : 'not found');

  console.log(FAIL.length === 0 ? '\nALL CHECKS PASSED' : `\n${FAIL.length} FAILED: ${FAIL.join('; ')}`);
  process.exit(FAIL.length === 0 ? 0 : 1);
})();
