import { useCallback, useEffect, useState } from 'react';
import type { FilmingLocation } from '../models';
import { getLocation, getLocations, getLocationsByCity, getNearbyLocations, searchLocations, readCache, writeCache, type LocationSummary, type SearchType } from '../api/locations';

type Result<T> = { data: T | null; loading: boolean; error: Error | null; cached: boolean; refetch: () => Promise<void> };
function useApi<T>(key: string, fetcher: () => Promise<T>, enabled = true): Result<T> {
  const [data, setData] = useState<T | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState<Error | null>(null); const [cached, setCached] = useState(false);
  const run = useCallback(async () => { setLoading(true); setError(null); try { const value = await fetcher(); setData(value); setCached(false); void writeCache(key, value); } catch (e) { const fallback = await readCache<T>(key); if (fallback) { setData(fallback); setCached(true); } else setError(e instanceof Error ? e : new Error('Unable to load locations')); } finally { setLoading(false); } }, [key, fetcher]);
  useEffect(() => { if (enabled) void run(); else setLoading(false); }, [run, enabled]);
  return { data, loading, error, cached, refetch: run };
}
export function useLocations(limit = 50, offset = 0): Result<FilmingLocation[] | LocationSummary[]> { return useApi(`locations-${limit}-${offset}`, useCallback(() => getLocations(limit, offset), [limit, offset])); }
export function useLocation(id?: string): Result<FilmingLocation> { return useApi(`location-${id}`, useCallback(() => getLocation(id!), [id]), Boolean(id)); }
export function useLocationsByCity(city?: string): Result<FilmingLocation[]> { return useApi(`city-${city}`, useCallback(() => getLocationsByCity(city!), [city]), Boolean(city)); }
export function useNearbyLocations(lat?: number, lng?: number, radius = 4828): Result<FilmingLocation[]> { return useApi(`nearby-${lat}-${lng}-${radius}`, useCallback(() => getNearbyLocations(lat!, lng!, radius), [lat, lng, radius]), lat != null && lng != null); }
export function useSearchLocations(query: string, type: SearchType = 'all'): Result<FilmingLocation[]> { return useApi(`search-${query}-${type}`, useCallback(() => searchLocations(query, type), [query, type])); }
