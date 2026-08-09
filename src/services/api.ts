// ── API Client for Nearby API ──
// Base URL for the API server (localhost in dev, configurable for production)

const BASE_URL = 'http://localhost:3001';

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
    const response = await fetch(`${this.baseUrl}${path}`);
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(errorBody.error || `HTTP ${response.status}`);
    }
    return response.json();
  }

  /** Paginated list of locations */
  async getLocations(limit: number = 200, offset: number = 0): Promise<ApiLocationSummary[]> {
    return this.fetchJson<ApiLocationSummary[]>(
      `/api/locations?limit=${limit}&offset=${offset}&fields=summary`,
    );
  }

  /** Get all locations (paginates through all pages) */
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
