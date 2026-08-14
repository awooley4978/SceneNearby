/**
 * Local reproduction of the app's exact data path against the PUBLIC staging URL.
 * Uses the app's own api.ts (real ApiClient, real headers/timeout logic) and
 * verbatim copies of hooks.ts's toFilmingLocation and AdminService's computeAdminStats.
 *
 * Run:  EXPO_PUBLIC_API_URL=https://b118a520627ac1a10a1362a93ff3b3f5.ctonew.app bun run repro-mapping.ts
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

// ── Verbatim copy of computeAdminStats core from src/services/AdminService.ts ──
function computeAdminStats(pendingPhotoCount: number, allLocations: any[]) {
  const total = allLocations.length;
  const missingPhotoItems = allLocations.filter((l: any) => !l.imageUrl);
  const missingDescriptionItems = allLocations.filter(
    (l: any) => !l.sceneDescription || l.sceneDescription.trim() === '',
  );
  const completeCount = allLocations.filter(
    (l: any) => l.imageUrl && l.sceneDescription && l.sceneDescription.trim() !== '' && l.funFact && l.funFact.trim() !== '',
  ).length;
  return {
    totalLocations: total,
    missingPhotos: missingPhotoItems.length,
    missingDescriptions: missingDescriptionItems.length,
    pendingApproval: pendingPhotoCount,
    completionPercentage: total > 0 ? Math.round((completeCount / total) * 100) : 0,
    missingPhotoItems,
    missingDescriptionItems,
  };
}

async function main() {
  const base = (apiClient as any).baseUrl;
  console.log('BASE_URL =', base);

  // 1. Raw page-1 shape (exactly what getLocations(200,0) fetches)
  const raw1 = await apiClient.getLocations(200, 0);
  console.log('--- getLocations(200,0) ---');
  console.log('isArray:', Array.isArray(raw1), '| length:', (raw1 as any[]).length);
  if (Array.isArray(raw1) && raw1.length > 0) {
    console.log('keys of item[0]:', JSON.stringify(Object.keys(raw1[0]).sort()));
    console.log('item[0]:', JSON.stringify(raw1[0]).slice(0, 400));
  }

  // 2. Full getAllLocations() — the exact function Discover/Admin/Map use
  const all = await apiClient.getAllLocations();
  console.log('--- getAllLocations() ---');
  console.log('isArray:', Array.isArray(all), '| length:', all.length);

  // 3. The app's own mapping (toFilmingLocation)
  const mapped = (all as any[]).map(toFilmingLocation);
  console.log('--- after toFilmingLocation ---');
  console.log('mapped length:', mapped.length);
  const usable = mapped.filter(
    (l: any) => l.id && l.title && l.movieOrShow && typeof l.latitude === 'number' && typeof l.longitude === 'number',
  );
  console.log('usable (id+title+movieOrShow+lat+lng):', usable.length);
  if (mapped.length > 0) {
    console.log('mapped[0]:', JSON.stringify(mapped[0]).slice(0, 500));
    const undef = mapped.filter((l: any) => !l.id || !l.title).length;
    console.log('items missing id or title:', undef);
  }

  // 4. Admin stats over the mapped array (why does Admin show 0?)
  const stats = computeAdminStats(4, mapped);
  console.log('--- computeAdminStats over mapped ---');
  console.log(JSON.stringify(stats, null, 1).slice(0, 500));
}

main().catch((e) => {
  console.error('REPRO FAILED:', e);
  process.exit(1);
});
