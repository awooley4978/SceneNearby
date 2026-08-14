/**
 * DATA-LEVEL regression for the Map "List" bottom sheet showing 0 in
 * Arlington while the nearest location (AT&T Stadium, city="Dallas") is
 * 4.1 mi away, pins render, and Discover finds it.
 *
 * Uses the REAL apiClient.getAllLocations() (same summary payload the map
 * screen loads via useAllLocations) and the REAL calculateDistance() from
 * src/services/geo.ts.
 *
 * Shows the exact exclusion condition (old filter) and validates the
 * replacement rule (list = the array the map renders, nearest-first).
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

// ── OLD rule (the reported bug): exact metro-label substring match ──
const cityName = userCity.toLowerCase();
const oldList = all.filter(
  (l) => l.city.toLowerCase().includes(cityName) || cityName.includes(l.city.toLowerCase()),
);
check(
  'OLD filter excludes AT&T Stadium for userCity="Arlington"',
  !oldList.some((l) => l.id === 'dal-004'),
  `oldList.length=${oldList.length} (matches the "0 in Arlington" report)`,
);

// ── NEW rule: same array the map renders (allLocations), nearest-first ──
const sorted = [...all].sort(
  (a, b) =>
    calculateDistance(GPS.lat, GPS.lng, a.latitude, a.longitude) -
    calculateDistance(GPS.lat, GPS.lng, b.latitude, b.longitude),
);
const idx = sorted.findIndex((l) => l.id === 'dal-004');
const distMi = (m: number) => (m / MILES).toFixed(1);
check('NEW list includes AT&T Stadium', idx >= 0, `position #${idx + 1} of ${sorted.length}`);
check(
  'NEW list length == locations the map renders',
  sorted.length === all.length,
  `${sorted.length} == ${all.length} markers`,
);
check('AT&T Stadium ~4.1 mi from device GPS', idx >= 0 && Math.abs(parseFloat(distMi(calculateDistance(GPS.lat, GPS.lng, dal004.latitude, dal004.longitude))) - 4.1) < 0.5, `${distMi(calculateDistance(GPS.lat, GPS.lng, dal004.latitude, dal004.longitude))} mi`);

console.log('\nTop of the new nearest-first list (device GPS):');
for (const l of sorted.slice(0, 5)) {
  console.log(
    `  ${distMi(calculateDistance(GPS.lat, GPS.lng, l.latitude, l.longitude)).padStart(5)} mi  ${l.id.padEnd(8)} ${l.city.padEnd(12)} ${l.title}`,
  );
}

// ── Debug-panel parity: counts within 3/5/10/25/50 mi ──
const counts = [3, 5, 10, 25, 50].map(
  (mi) => all.filter((l) => calculateDistance(GPS.lat, GPS.lng, l.latitude, l.longitude) / MILES <= mi).length,
);
console.log(`debug-parity counts within 3/5/10/25/50 mi: ${counts.join('/')} (reported 0/1/1/7/8)`);
check('parity: 1 within 5 mi (AT&T Stadium)', counts[1] === 1, counts.join('/'));

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
