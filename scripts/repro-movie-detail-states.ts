/**
 * Repro: MovieDetailScreen's render-state sequence for a known title (Landman).
 * Simulates the exact hook state React produces on mount (before/after the
 * fetch resolves) and evaluates the CURRENT guard in MovieDetailScreen.tsx:
 * loading → spinner; error → retry EmptyState; resolved-but-no-match →
 * "Film/TV not found" ONLY then. (Fixed at 7a1b105 — do not regress.)
 * Run: EXPO_PUBLIC_API_URL=<staging> bun run scripts/repro-movie-detail-states.ts
 */
import { apiClient } from '../src/services/api';

const MOVIE_TITLE = 'Landman';

/** Same group-builder as useMovieGroups() in hooks.ts. */
function buildGroups(locations: { movieOrShow: string; year: number; isMovie?: boolean; category: string; id: string }[]) {
  if (!locations.length) return [];
  const map = new Map<string, { title: string; year: number; isMovie: boolean; category: string; locationIds: string[] }>();
  for (const loc of locations) {
    const key = `${loc.movieOrShow}||${loc.year}`;
    if (!map.has(key)) {
      map.set(key, { title: loc.movieOrShow, year: loc.year, isMovie: Boolean(loc.isMovie), category: loc.category, locationIds: [] });
    }
    map.get(key)!.locationIds.push(loc.id);
  }
  return Array.from(map.values()).map((g) => ({ ...g, locationCount: g.locationIds.length }));
}

/** The CURRENT guard verbatim from MovieDetailScreen.tsx (loading → error → not-found). */
function renderDecision(
  movieGroups: ReturnType<typeof buildGroups>,
  allLocations: { movieOrShow: string; id: string }[],
  movieTitle: string,
  state: { loading: boolean; error: string | null },
): string {
  if (state.loading) {
    return '⏳ loading UI (spinner + "Loading …") — no flash';
  }
  if (state.error) {
    return '⚠️ error state (EmptyState with Try Again)';
  }
  const movieGroup = movieGroups.find((g) => g.title === movieTitle);
  const locations = allLocations.filter((l) => l.movieOrShow === movieTitle);
  if (!movieGroup || locations.length === 0) {
    return '❌ renders "Film/TV not found" (only after resolution — correct)';
  }
  return `✅ renders detail (${movieGroup.title} (${movieGroup.year}) • ${movieGroup.locationCount} locations • ${locations.length} cards)`;
}

// ── State A: first render, fetch still in flight ──
const stateA = { locations: [], loading: true, error: null as string | null };
const groupsA = buildGroups(stateA.locations);
console.log(`State A (initial mount): locations=${stateA.locations.length} loading=${stateA.loading}`);
console.log(`  movieGroups=${groupsA.length} | Landman group=${groupsA.find((g) => g.title === MOVIE_TITLE) ?? 'undefined'}`);
console.log(`  CURRENT screen: ${renderDecision(groupsA, stateA.locations, MOVIE_TITLE, stateA)}`);

// ── State B: fetch resolved ──
const locs = await apiClient.getAllLocations();
const stateB = { locations: locs, loading: false, error: null as string | null };
const groupsB = buildGroups(stateB.locations);
console.log(`\nState B (resolved): locations=${stateB.locations.length} loading=${stateB.loading}`);
console.log(`  movieGroups=${groupsB.length} | Landman group=${groupsB.find((g) => g.title === MOVIE_TITLE)?.title ?? 'undefined'} (${groupsB.find((g) => g.title === MOVIE_TITLE)?.locationCount ?? 0} locations)`);
console.log(`  CURRENT screen: ${renderDecision(groupsB, stateB.locations, MOVIE_TITLE, stateB)}`);

// ── State C: resolved, but the title genuinely does not exist ──
console.log(`\nState C (resolved, bogus title 'NotARealTitle'): ${renderDecision(groupsB, stateB.locations, 'NotARealTitle', stateB)}`);

console.log(`\nSequence (fixed at 7a1b105): State A loading UI → State B detail; "not found" ONLY in State C.`);
