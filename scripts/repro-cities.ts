// Verify: every city the app lets the user pick is covered; only live GPS outside
// the 26 covered cities produces an empty feed. Uses the app's OWN calculateDistance.
import { apiClient } from '/tmp/scene-app/src/services/api.ts';
import { calculateDistance } from './src/services/geo';
import { CITIES } from './src/models';

async function main() {
  const all: any[] = (await apiClient.getAllLocations()) as any[];
  console.log('locations:', all.length);

  let allCovered = true;
  for (const c of CITIES) {
    const within50 = all.filter((l) => calculateDistance(c.lat, c.lng, l.latitude, l.longitude) / 1609.34 <= 50).length;
    const within10 = all.filter((l) => calculateDistance(c.lat, c.lng, l.latitude, l.longitude) / 1609.34 <= 10).length;
    if (within50 === 0) allCovered = false;
    console.log(`${c.name.padEnd(14)} (${c.lat.toFixed(3)}, ${c.lng.toFixed(3)})  within10=${within10}  within50=${within50}`);
  }
  console.log('ALL APP-SELECTABLE CITIES COVERED:', allCovered);

  // Sanity: the two onboarding defaults
  const def = { lat: 40.758, lng: -73.9855 };
  console.log('NYC default (40.758,-73.9855):',
    all.filter((l) => calculateDistance(def.lat, def.lng, l.latitude, l.longitude) / 1609.34 <= 50).length, 'within 50mi');

  // GPS-realism: a city with NO coverage, e.g. a real mid-size US metro not in the 26
  const probes: Array<[string, number, number]> = [
    ['Phoenix AZ', 33.4484, -112.0740],
    ['Houston TX', 29.7604, -95.3698],
    ['Denver CO', 39.7392, -104.9903],
    ['Miami FL', 25.7617, -80.1918],
    ['Nashville TN', 36.1627, -86.7816],
    ['Cleveland OH', 41.4993, -81.6944],
  ];
  for (const [label, lat, lng] of probes) {
    const n = all.filter((l) => calculateDistance(lat, lng, l.latitude, l.longitude) / 1609.34 <= 50).length;
    console.log(`${label.padEnd(14)} within50=${n}`);
  }
}

main().catch((e) => { console.error('FAILED', e); process.exit(1); });
