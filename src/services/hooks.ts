// ── React Hooks for Nearby API ──
import { useState, useEffect, useRef } from 'react';
import { apiClient } from './api';
import type { ApiLocation, ApiLocationSummary } from './api';
import type { FilmingLocation, MovieGroup, ActorGroup, LocationCategory, LocationRating } from '../models';

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
function toFilmingLocation(api: ApiLocation | ApiLocationSummary): FilmingLocation {
  return {
    id: api.id,
    title: api.title,
    movieOrShow: api.movieOrShow,
    year: api.year,
    category: api.category as LocationCategory,
    latitude: api.latitude,
    longitude: api.longitude,
    address: (api as ApiLocation).address || '',
    city: api.city,
    country: api.country,
    sceneDescription: (api as ApiLocation).sceneDescription || '',
    funFact: (api as ApiLocation).funFact || '',
    quote: (api as ApiLocation).quote || null,
    quoteAttribution: (api as ApiLocation).quoteAttribution || null,
    thenAndNow: (api as ApiLocation).thenAndNow || null,
    isMovie: api.isMovie,
    distanceFromUser: api.distance,
    actors: (api as ApiLocation).actors || [],
    imageUrl: api.imageUrl || undefined,
    focalPoint: api.focalPoint || undefined,
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

/** Fetch all locations (paginated) */
export function useAllLocations() {
  const result = useApiData<ApiLocationSummary[]>(
    () => apiClient.getAllLocations(),
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
    return Array.from(map.values()).map(g => ({
      ...g,
      locationCount: g.locationIds.length,
    }));
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

/** Build rating map from all locations */
export function useRatingMap() {
  const { locations, loading } = useAllLocations();
  // Fetch full locations to get rating data — but for now use the API's worthIt fields
  // For a full implementation, fetch each location individually, but that's expensive
  // Instead, use allLocations and the worthIt data from full fetches when loaded
  const [ratingMap, setRatingMap] = useState<Record<string, LocationRating>>({});

  useEffect(() => {
    if (!locations.length) return;
    // For now, create ratings from whatever data we have
    // Full ratings would require fetching each location individually
    const map: Record<string, LocationRating> = {};
    // Use a default rating until full data is loaded
    for (const loc of locations) {
      map[loc.id] = { average: 4.0, count: 10 };
    }
    setRatingMap(map);
  }, [locations.length]);

  return { ratingMap, loading };
}
