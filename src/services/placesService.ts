// Places service — fetches live Google Places ratings via the nearby API proxy

const API_BASE = __DEV__
  ? 'http://localhost:3000'
  : 'https://b118a520627ac1a10a1362a93ff3b3f5.ctonew.app';

export interface PlaceRating {
  rating: number | null;
  reviewCount: number;
  placeId: string;
  displayName: string | null;
}

/**
 * Fetch live rating from Google Places via the nearby API proxy.
 * Endpoint: GET /api/places/:placeId
 */
export async function fetchPlaceRating(placeId: string): Promise<PlaceRating | null> {
  try {
    const response = await fetch(`${API_BASE}/api/places/${encodeURIComponent(placeId)}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data as PlaceRating;
  } catch {
    return null;
  }
}
