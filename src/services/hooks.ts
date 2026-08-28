// ── React Hooks for Nearby API ──
import { useState, useEffect, useRef } from 'react';
import { apiClient } from './api';
import type { ApiLocation, ApiLocationSummary } from './api';
import { LocationCategory, type FilmingLocation, type MovieGroup, type ActorGroup, type LocationRating } from '../models';

// ── Generic API hook ──
interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function useApiData<T>(fetcher: () => Promise<T>, deps: any[] = []): ApiState<T> & { refetch: () => void } {
  const [state, setState] = useState<ApiState<T>>({ data: null, loading: true, error: null });
  const mountedRef = useRef(true);

  const fetch = () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    fetcher()
      .then(data => {
        if (mountedRef.current) setState({ data, loading: false, error: null });
      })
      .catch(err => {
        if (mountedRef.current) setState({ data: null, loading: false, error: err.message || 'Unknown error' });
      });
  };

  useEffect(() => {
    mountedRef.current = true;
    fetch();
    return () => { mountedRef.current = false; };
  }, deps);

  return { ...state, refetch: fetch };
}

// ── Transform API location to app model ──
/**
 * The API sends category as a lowercase slug ('drama', 'sciFi', ...) while the
 * app's LocationCategory enum values are capitalized ('Drama', 'Sci-Fi', ...).
 * categoryColors/categoryIcons are keyed by the enum, so an un-normalized
 * category made every genre indicator/color lookup undefined. Normalize here —
 * the single source of truth for category → color is still models/categoryColors.
 */
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
function toFilmingLocation(api: ApiLocation | ApiLocationSummary): FilmingLocation {
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
    funFact: (api as ApiLocation).funFact || '',
    quote: (api as ApiLocation).quote || null,
    quoteAttribution: (api as ApiLocation).quoteAttribution || null,
    thenAndNow: (api as ApiLocation).thenAndNow || null,
    // isMovie is present in full payloads and (since 2026-08-14) summary payloads too.
    isMovie: Boolean(api.isMovie),
    distanceFromUser: api.distance,
    actors: api.actors || [],
    imageUrl: api.imageUrl || undefined,
    focalPoint: api.focalPoint || undefined,
    photoAttribution: (api as ApiLocation).photoAttribution ?? null,
  };
}

function computeRating(loc: ApiLocation): LocationRating | undefined {
  if (loc.worthItPercentage == null || loc.worthItVotes == null) return undefined;
  return {
    average: loc.worthItPercentage / 20, // Convert 0-100% to 0-5 stars
    count: loc.worthItVotes,
  };
}

// ── Hooks ──

// Shared cache + in-flight dedup for the "all locations" fetch.
// Every consumer of useAllLocations() (Discover, NearbyMap -- its own call plus
// useCityDetection -- and Saved) used to fire its own getAllLocations(): a
// paginated 2-request loop (offset 0 and 200). Mounting Discover fires three of
// these concurrently (its own + via useActorGroups + via useMovieGroups), Map
// fires two, and Saved one. Under tab-hopping that produced many duplicate
// full-location fetches per session. These module-level holders make every
// consumer share ONE in-flight request and ONE cached result: the first consumer
// triggers the paginated getAllLocations(), concurrent consumers subscribe to
// the same promise (no duplicate network call), and later consumers read the
// cache directly. refetch() clears the cache so pull-to-refresh / error-retry
// still forces a fresh network call. Only the all-locations-summary path is
// deduped; every other hook (by id / nearby / search / city / full) keeps
// existing behaviour.
let allLocationsCache: ApiLocationSummary[] | null = null;
let allLocationsInFlight: Promise<ApiLocationSummary[]> | null = null;

function fetchAllLocationsShared(): Promise<ApiLocationSummary[]> {
  if (allLocationsCache) return Promise.resolve(allLocationsCache);
  if (!allLocationsInFlight) {
    allLocationsInFlight = apiClient
      .getAllLocations()
      .then((data) => {
        allLocationsCache = data;
        return data;
      })
      .finally(() => {
        allLocationsInFlight = null;
      });
  }
  return allLocationsInFlight;
}

function clearAllLocationsCache(): void {
  allLocationsCache = null;
  allLocationsInFlight = null;
}

/** Fetch all locations (paginated; shared cache + in-flight dedup) */
export function useAllLocations() {
  const result = useApiData<ApiLocationSummary[]>(
    () => fetchAllLocationsShared(),
    [],
  );
  const locations = result.data?.map(toFilmingLocation) ?? [];
  // Preserve refetch as a genuine fresh fetch: clear the shared cache so this
  // and subsequent consumers re-fetch instead of serving stale data.
  const refetch = () => {
    clearAllLocationsCache();
    result.refetch();
  };
  return { ...result, locations, refetch };
}
/**
 * Fetch all locations with full detail (descriptions, fun facts, quotes,
 * actors, isMovie). Heavier than summary; used where completeness matters.
 */
export function useAllLocationsFull() {
  const result = useApiData<ApiLocation[]>(
    () => apiClient.getAllLocationsFull(),
    [],
  );
  const locations = result.data?.map(toFilmingLocation) ?? [];
  return { ...result, locations };
}

/** Fetch a single location by ID */
export function useLocationById(id: string | undefined) {
  const result = useApiData<ApiLocation>(
    () => id ? apiClient.getLocationById(id) : Promise.reject(new Error('No ID')),
    [id],
  );
  const location = result.data ? toFilmingLocation(result.data) : null;
  const rating = result.data ? computeRating(result.data) : undefined;
  return { ...result, location, rating };
}

/** Fetch locations by city */
export function useLocationsByCity(city: string | undefined) {
  const result = useApiData<ApiLocationSummary[]>(
    () => city ? apiClient.getLocationsByCity(city) : Promise.resolve([]),
    [city],
  );
  const locations = result.data?.map(toFilmingLocation) ?? [];
  return { ...result, locations };
}

/** Fetch nearby locations */
export function useNearbyLocations(lat: number, lng: number, radius: number = 5000) {
  const result = useApiData<ApiLocationSummary[]>(
    () => apiClient.getNearbyLocations(lat, lng, radius),
    [lat, lng, radius],
  );
  const locations = result.data?.map(toFilmingLocation) ?? [];
  return { ...result, locations };
}

/** Search locations */
export function useSearchLocations(q: string, type: 'movie' | 'actor' | 'all' = 'all') {
  const result = useApiData<ApiLocation[]>(
    () => q.length >= 2 ? apiClient.searchLocations(q, type) : Promise.resolve([]),
    [q, type],
  );
  const locations = result.data?.map(toFilmingLocation) ?? [];
  return { ...result, locations };
}

// ── Derived data hooks (compute movie groups, actor groups from all locations) ──

/** Compute movie groups from all locations */
export function useMovieGroups() {
  const { locations, loading, error, refetch } = useAllLocations();

  const movieGroups: MovieGroup[] = (() => {
    if (!locations.length) return [];
    const map = new Map<string, { title: string; year: number; isMovie: boolean; category: LocationCategory; locationIds: string[] }>();
    for (const loc of locations) {
      const key = `${loc.movieOrShow}||${loc.year}`;
      if (!map.has(key)) {
        map.set(key, { title: loc.movieOrShow, year: loc.year, isMovie: loc.isMovie, category: loc.category, locationIds: [] });
      }
      map.get(key)!.locationIds.push(loc.id);
    }
    const groups = Array.from(map.values()).map(g => ({
      ...g,
      locationCount: g.locationIds.length,
    }));
    // Deterministic order: alphabetical A–Z by title, ignoring a leading
    // "The " for sorting only (display keeps the full title). Year breaks ties.
    return groups.sort((a, b) => {
      const sortKey = (t: string) => t.replace(/^The\s+/i, '').toLowerCase();
      const byTitle = sortKey(a.title).localeCompare(sortKey(b.title));
      if (byTitle !== 0) return byTitle;
      return (a.year || 0) - (b.year || 0);
    });
  })();

  return { movieGroups, loading, error, refetch, allLocations: locations };
}

/** Get locations for an actor (via search) */
export function useLocationsByActor(actorName: string) {
  const { locations, loading, error } = useSearchLocations(actorName, 'actor');
  return { locations, loading, error };
}

/** Compute actor groups from all locations */
export function useActorGroups() {
  const { locations, loading } = useAllLocations();

  const actorGroups: ActorGroup[] = (() => {
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
  })();

  return { actorGroups, loading };
}

/** Build rating map from all locations (fetches full data) */
export function useRatingMap() {
  const [ratingMap, setRatingMap] = useState<Record<string, LocationRating>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiClient.getAllLocationsFull()
      .then(locations => {
        if (cancelled) return;
        const map: Record<string, LocationRating> = {};
        for (const loc of locations) {
          const rating = computeRating(loc);
          if (rating) map[loc.id] = rating;
        }
        setRatingMap(map);
        setLoading(false);
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.message || 'Unknown error');
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  return { ratingMap, loading, error };
}
