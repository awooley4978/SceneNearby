import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FilmingLocation } from '../models';

export type LocationSummary = Pick<FilmingLocation, 'id'|'title'|'movieOrShow'|'year'|'category'|'latitude'|'longitude'|'city'|'country'|'imageUrl'|'focalPoint'> & { distance?: number };
export type SearchType = 'movie' | 'actor' | 'all';

// Override in builds with EXPO_PUBLIC_API_URL. Android emulators reach host via 10.0.2.2.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
const CACHE_PREFIX = '@scene-nearby/api/';

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) throw new Error(`Nearby API returned ${response.status}`);
  return response.json() as Promise<T>;
}

function encode(value: string) { return encodeURIComponent(value); }

export async function getLocations(limit = 50, offset = 0, summary = false): Promise<FilmingLocation[] | LocationSummary[]> {
  return request(`/api/locations?limit=${limit}&offset=${offset}${summary ? '&fields=summary' : ''}`);
}
export function getLocation(id: string) { return request<FilmingLocation>(`/api/locations/${encode(id)}`); }
export function getLocationsByCity(city: string) { return request<FilmingLocation[]>(`/api/locations/city/${encode(city)}`); }
export function getNearbyLocations(lat: number, lng: number, radius: number) { return request<FilmingLocation[]>(`/api/locations/nearby?lat=${lat}&lng=${lng}&radius=${radius}`); }
export function searchLocations(query: string, type: SearchType = 'all') { return request<FilmingLocation[]>(`/api/locations/search?q=${encode(query)}&type=${type}`); }

export async function readCache<T>(key: string): Promise<T | null> {
  try { const value = await AsyncStorage.getItem(CACHE_PREFIX + key); return value ? JSON.parse(value) as T : null; } catch { return null; }
}
export async function writeCache<T>(key: string, value: T) {
  try { await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value)); } catch { /* cache is best effort */ }
}
