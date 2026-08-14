// ── API Client for Nearby API ──
// Base URL for the API server. Override at build time with EXPO_PUBLIC_API_URL
// (e.g. a deployed API or a tunnel URL). Defaults to localhost:3001, which works
// for the iOS simulator (shares the host network) and local dev.

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
// Hard timeout so a missing/unreachable API surfaces as a visible error state
// instead of an endless loading state (the black-screen symptom).
const FETCH_TIMEOUT_MS = 10000;
// The staging edge gzip-compresses responses for clients that advertise gzip
// (RN's NSURLSession sends `Accept-Encoding: gzip, deflate, br`). RN's iOS
// fetch can hang indefinitely on gzip HTTP/2 bodies without Content-Length
// (a known RN networking failure), leaving screens stuck in loading forever.
// Sending `identity` keeps responses uncompressed — verified against the live
// edge (no content-encoding, payload parses normally).
const FETCH_HEADERS = { 'Accept-Encoding': 'identity' };

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
  address: string;
  city: string;
  country: string;
  sceneDescription: string;
  actors: string[];
  imageUrl: string | null;
  focalPoint: { x: number; y: number } | null;
  /** Movie (true) vs TV show (false); present in both summary and full payloads. */
  isMovie?: boolean;
  distance?: number;
}

export interface ApiError {
  error: string;
}
/** A photo submission row from GET /api/submissions (photo_submissions table). */
export interface PhotoSubmission {
  id: string;
  location_id: string;
  location_name: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_review';
  submitted_at: string;
  reviewed_by?: string | null;
  photo_path?: string | null;
  user_info?: string | null;
  comment?: string | null;
  app_name?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    // AbortController alone is not enough on RN/iOS (the abort can fail to
    // reject an already-stalled request), so race the fetch against a hard
    // timeout that always rejects. Both fire together on timeout.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error(`Request timed out after ${Math.round(FETCH_TIMEOUT_MS / 1000)}s — is the API server running at ${this.baseUrl}?`));
      }, FETCH_TIMEOUT_MS);
    });
    try {
      let response: Response;
      try {
        response = await Promise.race([
          fetch(`${this.baseUrl}${path}`, {
            signal: controller.signal,
            headers: { ...FETCH_HEADERS, ...(init?.headers ?? {}) },
            method: init?.method,
            body: init?.body,
          }),
          timedOut,
        ]);
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
      if (timer) clearTimeout(timer);
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

  /** Moderation stats */
  async getStats(): Promise<{ total_submissions: number; pending_moderation: number }> {
    return this.fetchJson(`/api/stats`);
  }
  /** Photo submissions, optionally filtered by status (e.g. 'pending'). */
  async getSubmissions(status?: string): Promise<PhotoSubmission[]> {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.fetchJson<PhotoSubmission[]>(`/api/submissions${q}`);
  }
  /** Approve a pending photo submission. */
  async approveSubmission(id: string): Promise<{ success: boolean; public_url?: string }> {
    return this.fetchJson(`/api/approve/${encodeURIComponent(id)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewed_by: 'owner' }),
    });
  }
  /** Reject a pending photo submission. */
  async rejectSubmission(id: string): Promise<{ success: boolean }> {
    return this.fetchJson(`/api/reject/${encodeURIComponent(id)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewed_by: 'owner' }),
    });
  }
}

export const apiClient = new ApiClient();
