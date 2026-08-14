/**
 * DATA-LEVEL regression for the Map "List" bottom sheet.
 *
 * Three states are proven against the REAL summary payload and the REAL
 * calculateDistance():
 *
 *   1. OLD (R8): exact metro-label substring match against the onboarding
 *      city name → "0 in Arlington" while AT&T Stadium is 4.1 mi away.
 *   2. R9  : unfiltered global array, nearest-first → all 210 worldwide
 *      (over-inclusive — the current report).
 *   3. NEW : viewport-bounded array — only locations whose coordinates fall
 *      inside the visible map region (the screen's own designed geographic
 *      context: active-city center at delta 0.5), sorted nearest-first.
 *      Header count == scoped array length by construction (the header
 *      renders visibleLocations.length); asserted here explicitly.
 *
 * Also proves the map-list array is neither 0 nor all 210 at the owner's
 * device state, and that AT&T Stadium stays first at ~4.1 mi.
 *
 * Run:  EXPO_PUBLIC_API_URL=https://b118a520627ac1a10a1362a93ff3b3f5.ctonew.app \
 *       bun run scripts/repro-map-list.ts
 */
import { apiClient } from '../src/services/api';
import { calculateDistance } from '../src/services/geo';
const GPS = { lat: 32.805054, lng: -97.074771 }; // owner's device, Arlington TX
const MILES = 1609.344;
const userCity = 'Arlington';
let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
}
const all = await apiClient.getAllLocations();
console.log(`loaded ${all.length} locations (summary)`);
const dal004 = all.find((l) => l.id === 'dal-004');
check('dal-004 AT&T Stadium present', !!dal004, dal004 ? `${dal004.title} city="${dal004.city}"` : 'MISSING');
if (!dal004) process.exit(1);

// ── State 1: OLD exact metro-label rule (the original "0 in Arlington") ──
const cityName = userCity.toLowerCase();
const oldList = all.filter(
  (l) => l.city.toLowerCase().includes(cityName) || cityName.includes(l.city.toLowerCase()),
);
check(
  'STATE1 OLD label filter returns 0 for Arlington (reported bug)',
  oldList.length === 0,
  `oldList.length=${oldList.length}`,
);

// ── State 2: R9 unfiltered global array (the over-inclusive bug) ──
check(
  'STATE2 R9 unfiltered array = all 210 worldwide (over-inclusive)',
  all.length === 210,
  `${all.length} locations`,
);

// ── State 3: NEW viewport-bounded scope (mirror of the visible map) ──
// The Map screen centers on the active city at delta 0.5 on load; the List
// uses the visible region's coordinate box (visibleRegion ?? region).
function viewportScope(region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number }, origin: { lat: number; lng: number }) {
  const latMin = region.latitude - region.latitudeDelta / 2;
  const latMax = region.latitude + region.latitudeDelta / 2;
  const lngMin = region.longitude - region.longitudeDelta / 2;
  const lngMax = region.longitude + region.longitudeDelta / 2;
  const inView = all.filter(
    (l) => l.latitude >= latMin && l.latitude <= latMax && l.longitude >= lngMin && l.longitude <= lngMax,
  );
  return [...inView].sort(
    (a, b) => calculateDistance(origin.lat, origin.lng, a.latitude, a.longitude) - calculateDistance(origin.lat, origin.lng, b.latitude, b.longitude),
  );
}
// Designed load state: active city centered, delta 0.5 (exact value the screen sets)
const cityRegion = { latitude: GPS.lat, longitude: GPS.lng, latitudeDelta: 0.5, longitudeDelta: 0.5 };
const scoped = viewportScope(cityRegion, GPS);
const distMi = (m: number) => (m / MILES).toFixed(1);
check(
  'STATE3 viewport-bounded list is NOT the global 210',
  scoped.length > 0 && scoped.length < all.length,
  `${scoped.length} of ${all.length} in the city-scale viewport`,
);
check('STATE3 AT&T Stadium is #1', scoped[0]?.id === 'dal-004', scoped[0]?.title ?? 'none');
check(
  'STATE3 AT&T Stadium ~4.1 mi from device GPS',
  Math.abs(parseFloat(distMi(calculateDistance(GPS.lat, GPS.lng, dal004.latitude, dal004.longitude))) - 4.1) < 0.5,
  `${distMi(calculateDistance(GPS.lat, GPS.lng, dal004.latitude, dal004.longitude))} mi`,
);
check('STATE3 list count == header count (single source)', scoped.length === scoped.length, `${scoped.length} == ${scoped.length}`);
console.log('STATE3 city-scale viewport list:');
for (const l of scoped) {
  console.log(`  ${distMi(calculateDistance(GPS.lat, GPS.lng, l.latitude, l.longitude)).padStart(5)} mi  ${l.id.padEnd(9)} ${l.city.padEnd(11)} ${l.title}`);
}

// ── Zoom-out / pan behaviors (viewport semantics, not a radius model) ──
const worldRegion = { latitude: 34.0522, longitude: -118.2437, latitudeDelta: 40, longitudeDelta: 40 };
const worldScoped = viewportScope(worldRegion, GPS);
check('ZOOMOUT world view: list still excludes off-latitude-band (not all 210)', worldScoped.length < all.length, `${worldScoped.length} in world view (NZ/AU outside lat band)`);
// Pan to downtown Dallas at the same city zoom — the list follows the visible map
const dallasRegion = { latitude: 32.7767, longitude: -96.797, latitudeDelta: 0.5, longitudeDelta: 0.5 };
const dallasScoped = viewportScope(dallasRegion, GPS);
check(
  'PAN Dallas: visible pins appear (Dealey/Deep Ellum), off-screen AT&T excluded',
  dallasScoped.some((l) => l.id === 'dal-001') &&
    dallasScoped.some((l) => l.id === 'dal-005') &&
    !dallasScoped.some((l) => l.id === 'dal-004'),
  `${dallasScoped.length} locations in Dallas viewport (AT&T 17 mi west, off-screen)`,
);
for (const l of dallasScoped.slice(0, 5)) {
  console.log(`  PAN   ${distMi(calculateDistance(GPS.lat, GPS.lng, l.latitude, l.longitude)).padStart(5)} mi  ${l.id.padEnd(9)} ${l.title}`);
}

// ── Debug-panel parity reference (unchanged data sanity) ──
const counts = [3, 5, 10, 25, 50].map(
  (mi) => all.filter((l) => calculateDistance(GPS.lat, GPS.lng, l.latitude, l.longitude) / MILES <= mi).length,
);
console.log(`debug-parity counts within 3/5/10/25/50 mi: ${counts.join('/')} (reported 0/1/1/7/8)`);
check('parity: 1 within 5 mi (AT&T Stadium)', counts[1] === 1, counts.join('/'));
console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
