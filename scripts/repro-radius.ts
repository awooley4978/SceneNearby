// Probe: does the Discover radius filter empty the feed for a "far" user?
// Uses the app's OWN geo.ts calculateDistance against the real 209 locations.
import { apiClient } from '../src/services/api.ts';
import { calculateDistance } from './src/services/geo';

async function main() {
  const all: any[] = (await apiClient.getAllLocations()) as any[];
  console.log('locations:', all.length);

  const probes: Array<[string, number, number]> = [
    ['Kansas (middle of nowhere)', 38.9, -98.3],
    ['Bloomington, IN', 39.16, -86.53],
    ['New York City', 40.71, -74.0],
    ['Los Angeles', 34.05, -118.24],
    ['Rural Montana', 46.6, -109.5],
    ['Honolulu, HI', 21.3, -157.85],
  ];
  for (const [label, lat, lng] of probes) {
    const within50 = all.filter((l) => calculateDistance(lat, lng, l.latitude, l.longitude) / 1609.34 <= 50).length;
    const within3 = all.filter((l) => calculateDistance(lat, lng, l.latitude, l.longitude) / 1609.34 <= 3).length;
    console.log(`${label}: within 3mi=${within3}, within 50mi=${within50}`);
  }

  // Which cities do the 209 cover?
  const cities = new Map<string, number>();
  for (const l of all) cities.set(l.city, (cities.get(l.city) || 0) + 1);
  console.log('covered cities:', JSON.stringify([...cities.entries()].sort((a, b) => b[1] - a[1])));
}

main().catch((e) => { console.error('FAILED', e); process.exit(1); });
