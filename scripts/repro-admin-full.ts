/**
 * Admin completeness bug repro: computeAdminStats over FULL-mode payloads (what
 * Admin SHOULD use) vs the true DB state. Also dumps the 10 missing-photo IDs.
 *
 * Run:  EXPO_PUBLIC_API_URL=https://b118a520627ac1a10a1362a93ff3b3f5.ctonew.app bun run repro-admin-full.ts
 */
import { apiClient } from '../src/services/api.ts';

function toFilmingLocation(api: any): any {
  return {
    id: api.id,
    title: api.title,
    movieOrShow: api.movieOrShow,
    year: api.year,
    category: api.category,
    latitude: api.latitude,
    longitude: api.longitude,
    address: api.address || '',
    city: api.city,
    country: api.country,
    sceneDescription: api.sceneDescription || '',
    funFact: api.funFact || '',
    quote: api.quote || null,
    quoteAttribution: api.quoteAttribution || null,
    thenAndNow: api.thenAndNow || null,
    isMovie: Boolean(api.isMovie),
    imageUrl: api.imageUrl || undefined,
    focalPoint: api.focalPoint || undefined,
  };
}

const full = await apiClient.getAllLocationsFull();
const mapped = full.map(toFilmingLocation).filter(Boolean) as any[];
console.log(`getAllLocationsFull() -> raw ${full.length}, mapped ${mapped.length}`);

const missingPhotoItems = mapped.filter((l: any) => !l.imageUrl);
const missingDescriptionItems = mapped.filter((l: any) => !l.sceneDescription || l.sceneDescription.trim() === '');
const completeCount = mapped.filter(
  (l: any) => l.imageUrl && l.sceneDescription && l.sceneDescription.trim() !== '' && l.funFact && l.funFact.trim() !== '',
).length;
const completeness = Math.round((completeCount / mapped.length) * 100);

console.log(`\n=== computeAdminStats over FULL payloads ===`);
console.log(`totalLocations: ${mapped.length}`);
console.log(`missingDescriptions: ${missingDescriptionItems.length} ${missingDescriptionItems.length ? '-> ' + missingDescriptionItems.map((l: any) => l.id).join(', ') : ''}`);
console.log(`missingPhotos: ${missingPhotoItems.length}`);
console.log(`completeCount: ${completeCount} | completionPercentage: ${completeness}%`);
console.log(`\nmissing-photo IDs: ${missingPhotoItems.map((l: any) => `${l.id} (${l.title})`).join(' | ') || 'none'}`);

// sanity: isMovie coverage in full payloads
const movies = mapped.filter((l: any) => l.isMovie);
const shows = mapped.filter((l: any) => !l.isMovie);
console.log(`\nisMovie in full mode -> movies: ${movies.length}, shows: ${shows.length}`);

// What does a summary payload actually contain? (key set)
const p1 = await apiClient.getLocations(200, 0);
const summaryKeys = Object.keys(p1[0]).sort();
console.log(`\nsummary payload keys: ${summaryKeys.join(', ')}`);
console.log(`summary has isMovie? ${'isMovie' in p1[0]}`);
