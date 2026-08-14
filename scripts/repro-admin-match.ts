/**
 * RUNTIME regression test for the "Cannot read property 'match' of undefined"
 * crash in Admin flows. Executes the REAL src/services/AdminService module
 * (no copies) — deriveRegion(), getUniqueRegions(), applyDetailFilters(),
 * getUniqueValues(), getTitleFirstLetters() — against rows that lack the
 * address/city/title fields (PhotoSubmission-shaped objects, exactly what
 * the Admin "Photos Awaiting Approval" detail screen receives).
 *
 * Pre-fix: deriveRegion() did `loc.address.match(...)` — address is
 * undefined on photo-submission rows -> TypeError: Cannot read properties
 * of undefined (reading 'match'). AdminDetailScreen also ran these helpers
 * on PhotoSubmission items unconditionally, so opening the approval screen
 * crashed deterministically.
 *
 * Run:  cd <repo> && bun run scripts/repro-admin-match.ts
 */
import {
  deriveRegion,
  getUniqueRegions,
  getUniqueValues,
  getTitleFirstLetters,
  applyDetailFilters,
  EMPTY_FILTERS,
} from '../src/services/AdminService';
import { LocationCategory } from '../src/models';

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
}

// ── 1. deriveRegion: normal full-address record ──
const fullLoc = {
  id: 'x1',
  title: 'Test',
  movieOrShow: 'M',
  year: 2020,
  category: LocationCategory.drama,
  latitude: 1,
  longitude: 1,
  address: '205 E Houston St, Chicago, IL 60613',
  city: 'Chicago',
  country: 'US',
  sceneDescription: '',
  funFact: '',
  quote: null,
  quoteAttribution: null,
  thenAndNow: null,
  isMovie: true,
};
check('deriveRegion parses state from full address', deriveRegion(fullLoc) === 'IL', `got ${deriveRegion(fullLoc)}`);

// ── 2. deriveRegion: address field MISSING (the crash) ──
// PhotoSubmission rows have no `address` property at all.
const photoRow = {
  id: 'sub-1',
  location_id: 'dal-004',
  location_name: 'AT&T Stadium',
  status: 'pending',
  submitted_at: '2026-08-14T00:00:00Z',
};
let threw = false;
try {
  deriveRegion(photoRow as never);
} catch (e) {
  threw = true;
  console.log('   (threw:', (e as Error).message, ')');
}
check(
  'deriveRegion does NOT throw on missing address',
  !threw,
  threw ? 'pre-fix code throws undefined.match here' : 'falls back to country, no crash',
);

// ── 3. getUniqueRegions over photo-row-shaped items (no address/city/country) ──
threw = false;
let regions: string[] = [];
try {
  regions = getUniqueRegions([photoRow as never, fullLoc]);
} catch (e) {
  threw = true;
  console.log('   (threw:', (e as Error).message, ')');
}
check('getUniqueRegions handles rows without address/country', !threw && regions.includes('IL'), `regions=${JSON.stringify(regions)}`);

// ── 4. applyDetailFilters with an active search over rows missing address ──
threw = false;
let filtered: unknown[] = [];
try {
  // 'chicago' lives in fullLoc.address — the filter must find it and NOT
  // throw on photoRow, which has no address/title/movieOrShow at all.
  filtered = applyDetailFilters([photoRow as never, fullLoc], { ...EMPTY_FILTERS, search: 'chicago' });
} catch (e) {
  threw = true;
  console.log('   (threw:', (e as Error).message, ')');
}
check(
  'applyDetailFilters search does not throw on missing address/title/movieOrShow',
  !threw && filtered.length === 1,
  `matched ${filtered.length}`,
);

// ── 5. Screen gating: locationItems = [] for the approval screen ──
check('getUniqueValues([], "city") -> []', getUniqueValues([], 'city').length === 0);
check('getUniqueRegions([]) -> []', getUniqueRegions([]).length === 0);
check('getTitleFirstLetters([]) -> []', getTitleFirstLetters([]).length === 0);
check(
  'getTitleFirstLetters skips rows with no title',
  getTitleFirstLetters([photoRow as never, fullLoc]).join('') === 'T',
  `letters=${JSON.stringify(getTitleFirstLetters([photoRow as never, fullLoc]))}`,
);

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
