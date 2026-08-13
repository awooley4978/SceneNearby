// ── API Client for Nearby API ──
// Base URL for the API server. Override at build time with EXPO_PUBLIC_API_URL
// (e.g. a deployed API or a tunnel URL). Defaults to localhost:3001, which works
// for the iOS simulator (shares the host network) and local dev.

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
// Hard timeout so a missing/unreachable API surfaces as a visible error state
// instead of an endless loading state (the black-screen symptom).
const FETCH_TIMEOUT_MS = 10000;

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

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async fetchJson<T>(path: string): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      let response: Response;
      try {
        response = await fetch(`${this.baseUrl}${path}`, { signal: controller.signal });
      } catch (err) {
        if (controller.signal.aborted) {
          throw new Error(`Request timed out after ${Math.round(FETCH_TIMEOUT_MS / 1000)}s — is the API server running at ${this.baseUrl}?`);
        }
        throw new Error(`Could not reach API (${this.baseUrl}): ${err instanceof Error ? err.message : String(err)}`);
      }
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: `Request failed (HTTP ${response.status})` }));
        throw new Error(errorBody.error || `HTTP ${response.status}`);
      }
      return response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  /** Paginated list of locations */
  async getLocations(limit: number = 200, offset: number = 0): Promise<ApiLocationSummary[]> {
    return this.fetchJson<ApiLocationSummary[]>(
      `/api/locations?limit=${limit}&offset=${offset}&fields=summary`,
    );
  }

  /** Get all locations with full data including worthItPercentage */
  async getAllLocationsFull(): Promise<ApiLocation[]> {
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
  }

  /** Get all locations (summary fields, paginated) */
  async getAllLocations(): Promise<ApiLocationSummary[]> {
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
  }

  /** Single location by ID */
  async getLocationById(id: string): Promise<ApiLocation> {
    return this.fetchJson<ApiLocation>(`/api/locations/${id}`);
  }

  /** All locations for a city */
  async getLocationsByCity(city: string): Promise<ApiLocationSummary[]> {
    return this.fetchJson<ApiLocationSummary[]>(`/api/locations/city/${encodeURIComponent(city)}`);
  }

  /** Nearby locations by lat/lng/radius (meters) */
  async getNearbyLocations(
    lat: number,
    lng: number,
    radius: number = 5000,
  ): Promise<ApiLocationSummary[]> {
    return this.fetchJson<ApiLocationSummary[]>(
      `/api/locations/nearby?lat=${lat}&lng=${lng}&radius=${radius}`,
    );
  }

  /** Search by query and optional type filter */
  async searchLocations(
    q: string,
    type: 'movie' | 'actor' | 'all' = 'all',
  ): Promise<ApiLocation[]> {
    return this.fetchJson<ApiLocation[]>(
      `/api/locations/search?q=${encodeURIComponent(q)}&type=${type}`,
    );
  }
}

export const apiClient = new ApiClient();
