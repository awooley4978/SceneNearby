// ── API Client for Nearby API ──
// Tries remote API first, falls back to bundled JSON data (210 locations).
// No network required for core location browsing.

import bundledLocationsRaw from '../data/locations.json';

// Dev: use machine IP for physical device testing. Change for prod/simulator.
const BASE_URL = 'http://172.16.5.109:3001';

// ── Types ──

export interface ApiLocation {
  id: string;
  title: string;
  movieOrShow: string;
  year: number;
  category: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  country: string;
  sceneDescription: string;
  funFact: string;
  quote: string | null;
  quoteAttribution: string | null;
  thenAndNow: string | null;
  isMovie: boolean;
  imageUrl: string | null;
  focalPoint: { x: number; y: number } | null;
  remoteDestination: {
    country?: string;
    island?: string;
    warnings?: string[];
    details?: string[];
    ferry_required?: boolean;
    travel_time?: string;
  } | null;
  actors: string[];
  estimatedVisitTime: string | null;
  worthItPercentage: number | null;
  worthItVotes: number | null;
  distance?: number;
}

export interface ApiLocationSummary {
  id: string;
  title: string;
  movieOrShow: string;
  year: number;
  category: string;
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  imageUrl: string | null;
  focalPoint: { x: number; y: number } | null;
  distance?: number;
}

export interface ApiError {
  error: string;
}

// ── Bundled data layer ──

interface RawLocationRow {
  id: string;
  title: string;
  movie_or_show: string;
  year: number;
  category: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  country: string;
  scene_description: string;
  fun_fact: string;
  quote: string | null;
  quote_attribution: string | null;
  then_and_now: string | null;
  is_movie: number;
  image_url: string | null;
  focal_point_x: number | null;
  focal_point_y: number | null;
  remote_destination_json: string | null;
  actors_json: string | null;
  estimated_visit_time: string | null;
  worth_it_percentage: number | null;
  worth_it_votes: number | null;
}

function transformRow(row: RawLocationRow): ApiLocation {
  return {
    id: row.id,
    title: row.title,
    movieOrShow: row.movie_or_show,
    year: row.year,
    category: row.category,
    latitude: row.latitude,
    longitude: row.longitude,
    address: row.address ? row.address.replace(/\\n/g, '\n') : '',
    city: row.city,
    country: row.country,
    sceneDescription: row.scene_description,
    funFact: row.fun_fact,
    quote: row.quote,
    quoteAttribution: row.quote_attribution,
    thenAndNow: row.then_and_now,
    isMovie: row.is_movie === 1,
    imageUrl: row.image_url,
    focalPoint: row.focal_point_x != null && row.focal_point_y != null
      ? { x: row.focal_point_x, y: row.focal_point_y }
      : null,
    remoteDestination: (() => {
      if (!row.remote_destination_json) return null;
      try {
        return JSON.parse(row.remote_destination_json);
      } catch {
        // Some DB entries use JS object syntax (unquoted keys) — skip
        return null;
      }
    })(),
    actors: (() => {
      if (!row.actors_json) return [];
      try {
        return JSON.parse(row.actors_json);
      } catch {
        return [];
      }
    })(),
    estimatedVisitTime: row.estimated_visit_time,
    worthItPercentage: row.worth_it_percentage,
    worthItVotes: row.worth_it_votes,
  };
}

function toSummary(loc: ApiLocation): ApiLocationSummary {
  return {
    id: loc.id,
    title: loc.title,
    movieOrShow: loc.movieOrShow,
    year: loc.year,
    category: loc.category,
    latitude: loc.latitude,
    longitude: loc.longitude,
    city: loc.city,
    country: loc.country,
    imageUrl: loc.imageUrl,
    focalPoint: loc.focalPoint,
  };
}

// Parse bundled data once at import time
const bundledLocations: ApiLocation[] = (bundledLocationsRaw as RawLocationRow[]).map(transformRow);
const bundledSummaries: ApiLocationSummary[] = bundledLocations.map(toSummary);

// ── Geolocation helpers (client-side for bundled data) ──

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = deg2rad(lat2 - lat1);
  const dLng = deg2rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ── API Client ──

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async fetchJson<T>(path: string): Promise<T> {
    // Fast timeout (2s) — unreachable server falls back to bundled data immediately
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(errorBody.error || `HTTP ${response.status}`);
      }
      return response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  /** Paginated list of locations (summary) */
  async getLocations(limit: number = 200, offset: number = 0): Promise<ApiLocationSummary[]> {
    try {
      return await this.fetchJson<ApiLocationSummary[]>(
        `/api/locations?limit=${limit}&offset=${offset}&fields=summary`,
      );
    } catch {
      return bundledSummaries.slice(offset, offset + limit);
    }
  }

  /** All locations with full data */
  async getAllLocationsFull(): Promise<ApiLocation[]> {
    try {
      const all: ApiLocation[] = [];
      let offset = 0;
      const limit = 200;
      let batch: ApiLocation[];
      do {
        batch = await this.fetchJson<ApiLocation[]>(
          `/api/locations?limit=${limit}&offset=${offset}`,
        );
        all.push(...batch);
        offset += limit;
      } while (batch.length === limit);
      return all;
    } catch {
      return bundledLocations;
    }
  }

  /** All locations (summary fields, paginated) */
  async getAllLocations(): Promise<ApiLocationSummary[]> {
    try {
      const all: ApiLocationSummary[] = [];
      let offset = 0;
      const limit = 200;
      let batch: ApiLocationSummary[];
      do {
        batch = await this.getLocations(limit, offset);
        all.push(...batch);
        offset += limit;
      } while (batch.length === limit);
      return all;
    } catch {
      return bundledSummaries;
    }
  }

  /** Single location by ID */
  async getLocationById(id: string): Promise<ApiLocation> {
    try {
      return await this.fetchJson<ApiLocation>(`/api/locations/${id}`);
    } catch {
      const found = bundledLocations.find(l => l.id === id);
      if (!found) throw new Error(`Location not found: ${id}`);
      return found;
    }
  }

  /** All locations for a city */
  async getLocationsByCity(city: string): Promise<ApiLocationSummary[]> {
    try {
      return await this.fetchJson<ApiLocationSummary[]>(
        `/api/locations/city/${encodeURIComponent(city)}`,
      );
    } catch {
      const cityLower = city.toLowerCase();
      return bundledSummaries.filter(l => l.city.toLowerCase() === cityLower);
    }
  }

  /** Nearby locations by lat/lng/radius (meters) */
  async getNearbyLocations(
    lat: number,
    lng: number,
    radius: number = 5000,
  ): Promise<ApiLocationSummary[]> {
    try {
      return await this.fetchJson<ApiLocationSummary[]>(
        `/api/locations/nearby?lat=${lat}&lng=${lng}&radius=${radius}`,
      );
    } catch {
      return bundledSummaries
        .map(loc => ({
          ...loc,
          distance: haversineDistance(lat, lng, loc.latitude, loc.longitude),
        }))
        .filter(loc => loc.distance <= radius)
        .sort((a, b) => a.distance! - b.distance!);
    }
  }

  /** Search by query and optional type filter */
  async searchLocations(
    q: string,
    type: 'movie' | 'actor' | 'all' = 'all',
  ): Promise<ApiLocation[]> {
    try {
      return await this.fetchJson<ApiLocation[]>(
        `/api/locations/search?q=${encodeURIComponent(q)}&type=${type}`,
      );
    } catch {
      const query = q.toLowerCase().trim();
      if (query.length < 2) return [];

      return bundledLocations.filter(loc => {
        const matchTitle = loc.movieOrShow.toLowerCase().includes(query);
        const matchActor = loc.actors.some(a => a.toLowerCase().includes(query));

        if (type === 'movie') return matchTitle;
        if (type === 'actor') return matchActor;
        return matchTitle || matchActor;
      });
    }
  }
}

export const apiClient = new ApiClient();
