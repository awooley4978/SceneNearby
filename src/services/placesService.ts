// Places service — fetches live Google Places ratings directly from Places API (New)

const GOOGLE_PLACES_API_KEY = 'AIzaSyBLUZWpL5Z0S2_G_tcddtInru-KFeMivLs';
const PLACES_API_BASE = 'https://places.googleapis.com/v1/places';

export interface PlaceRating {
  rating: number | null;
  reviewCount: number;
  placeId: string;
  displayName: string | null;
  googleMapsUri: string | null;
}

/**
 * Fetch live rating from Google Places API (New).
 * Uses the googleMapsUri returned by Google — never constructs fallback URLs.
 */
export async function fetchPlaceRating(placeId: string): Promise<PlaceRating | null> {
  try {
    const url = `${PLACES_API_BASE}/${encodeURIComponent(placeId)}?fields=rating,userRatingCount,displayName,googleMapsUri&key=${GOOGLE_PLACES_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data: any = await response.json();
    return {
      rating: data.rating ?? null,
      reviewCount: data.userRatingCount ?? 0,
      placeId,
      displayName: data.displayName?.text ?? null,
      googleMapsUri: data.googleMapsUri ?? null,
    };
  } catch {
    return null;
  }
}
