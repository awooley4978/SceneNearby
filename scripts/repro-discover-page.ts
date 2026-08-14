/**
 * Repro: the Discover page as rendered at a device position ~4.1 mi from AT&T Stadium.
 * Traces the EXACT stage order in DiscoverScreen.tsx (2cf171f) and reports counts at
 * every stage, plus the composition of each visible section (Near You, More to
 * Discover, All Locations feed) and the radius pill value.
 * Run: EXPO_PUBLIC_API_URL=<staging> bun run scripts/repro-discover-page.ts
 */
import { apiClient } from '../src/services/api';
import { calculateDistance } from '../src/services/geo';
import type { ApiLocationSummary } from '../src/services/api';

const RADIUS_STAGES = [3, 5, 10, 25, 50];

type Loc = ApiLocationSummary & { distanceFromUser?: number };

function mi(lat: number, lng: number, loc: Loc): number {
  return calculateDistance(lat, lng, loc.latitude, loc.longitude) / 1609.34;
}

function traceAt(label: string, lat: number, lng: number, locs: Loc[]) {
  console.log(`\n── device ${label} (${lat}, ${lng}) ──`);
  // stage 1: all mapped locations
  console.log(`1. all mapped: ${locs.length}`);
  // stage 2: active city filter — NONE exists in DiscoverScreen (city never consulted)
  console.log(`2. active-city filter: NOT APPLIED (DiscoverScreen never reads onboarding city)`);
  // stage 3: media-type filter ('all' default)
  const movies = locs.filter((l) => l.isMovie);
  const shows = locs.filter((l) => !l.isMovie);
  console.log(`3. media-type: movies=${movies.length} shows=${shows.length} (default 'all' keeps ${locs.length})`);
  // stage 4: genre/category filter ('all' default)
  const cats = new Set(locs.map((l) => l.category));
  console.log(`4. genre/category: ${[...cats].join(', ')} (default 'all' keeps ${locs.length})`);
  // stage 5: distance calc (meters -> miles)
  const withDist = locs.map((l) => ({ ...l, distanceFromUser: mi(lat, lng, l) }));
  // stage 6: radius filter (auto-radius: smallest stage with >=1)
  let activeRadius: number | null = null;
  for (const stage of RADIUS_STAGES) {
    if (withDist.some((l) => l.distanceFromUser! <= stage)) { activeRadius = stage; break; }
  }
  activeRadius = activeRadius ?? 50;
  const within = withDist.filter((l) => l.distanceFromUser! <= activeRadius!);
  const nearest = withDist.reduce((a, b) => (a.distanceFromUser! < b.distanceFromUser! ? a : b));
  console.log(`5/6. distance computed; activeRadius(pill)=${activeRadius} (nearest=${nearest.distanceFromUser!.toFixed(1)}mi ${nearest.id})`);
  // stage 7: radius filter on the feed
  console.log(`    radius filter: ${locs.length} -> ${within.length}`);
  // stage 8: sort by nearest
  const feed = [...within].sort((a, b) => (a.distanceFromUser || 0) - (b.distanceFromUser || 0));
  console.log(`    sorted feed (${feed.length}): ${feed.map((l) => `${l.id}@${l.distanceFromUser!.toFixed(1)}mi`).join(', ')}`);
  // Near You = top 5 of the radius-bounded set
  const nearYou = feed.slice(0, 5);
  console.log(`8. Near You (<=${activeRadius}mi, top 5): ${nearYou.map((l) => `${l.id}@${l.distanceFromUser!.toFixed(1)}mi`).join(', ')}`);
  // The former "🌍 More to Discover" section (OUTSIDE the radius, up to 50/100mi)
  // was REMOVED (84f8bab) — the radius-bounded feed above is the single source
  // of truth; every card on the page comes from the same array as the pill.
  const totalVisible = feed.length;
  console.log(`→ page shows ${feed.length} feed cards (Near You = top 5) = ${totalVisible} visible items, all drawn from the SAME radius-bounded array as the "Within ${activeRadius} mi" pill; no beyond-radius rows exist anymore`);
}

const locs = await apiClient.getAllLocations();
// Owner device: AT&T Stadium renders at 4.1 mi. Pick a point ~4.1 mi east of AT&T (32.7473,-97.0929).
traceAt('owner (~4.1mi E of AT&T)', 32.7473, -97.0225, locs);
// Reference: the repro positions already in the repo
traceAt('E (32.7555, -97.0678)', 32.7555, -97.0678, locs);
traceAt('SE (32.5955, -97.1208)', 32.5955, -97.1208, locs);
