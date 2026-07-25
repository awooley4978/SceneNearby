// ── Category Enum ──
export enum LocationCategory {
  rock = 'Rock',
  hipHop = 'Hip-Hop',
  electronic = 'Electronic',
  jazz = 'Jazz',
  rnb = 'R&B',
  folk = 'Folk',
  classical = 'Classical',
}

export const categoryColors: Record<LocationCategory, string> = {
  [LocationCategory.rock]: '#EF4444',
  [LocationCategory.hipHop]: '#8B5CF6',
  [LocationCategory.electronic]: '#06B6D4',
  [LocationCategory.jazz]: '#EAB308',
  [LocationCategory.rnb]: '#EC4899',
  [LocationCategory.folk]: '#22C55E',
  [LocationCategory.classical]: '#F97316',
};

export const categoryIcons: Record<LocationCategory, string> = {
  [LocationCategory.rock]: '🎸',
  [LocationCategory.hipHop]: '🎤',
  [LocationCategory.electronic]: '🎹',
  [LocationCategory.jazz]: '🎷',
  [LocationCategory.rnb]: '🎵',
  [LocationCategory.folk]: '🪕',
  [LocationCategory.classical]: '🎻',
};

// ── Core Model ──
export interface MusicLocation {
  id: string;
  title: string;
  artistName: string;
  year: number;
  category: LocationCategory;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  country: string;
  significance: string;
  funFact: string;
  lyricSnippet: string | null;
  lyricAttribution: string | null;
  historyNote: string | null;
  isAlbum: boolean;
  distanceFromUser?: number;
  rating?: LocationRating;
  photoCount?: number;
  imageUrl?: string;
  bandMembers?: string[];
  remoteDestination?: RemoteDestinationInfo;
  /** Google Places rating data */
  googleRating?: GooglePlaceRating;
  /** Music Nearby community: percentage who say this location is worth a visit */
  worthItPercentage?: number;
  /** Music Nearby community: number of votes on worth-it question */
  worthItVotes?: number;
  /** Estimated time to spend at this location (e.g. "5-10 min", "1-2 hrs") */
  estimatedVisitTime?: string;
  /** Focal point for smart cropping: { x, y } in range 0–1 (0=top/left, 1=bottom/right).
   *  Defaults to { x: 0.5, y: 0.5 } (center) when not set. */
  focalPoint?: { x: number; y: number };
}

export interface ArtistGroup {
  name: string;
  locationIds: string[];
  notableWorks: string[];
}

export const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)}m away`;
  }
  return `${(meters / 1000).toFixed(1)} km away`;
};

/** Format distance in miles from meters, with consistent formatting */
export const formatDistanceInMiles = (meters: number): string => {
  const miles = meters / 1609.34;
  if (miles < 0.1) {
    const feet = Math.round(miles * 5280);
    return `${feet}ft`;
  }
  return `${miles.toFixed(1)}mi`;
};

// ── Rating System ──
// ── Google Places Rating ──
export interface GooglePlaceRating {
  rating: number;
  reviewCount: number;
  placeId: string;
  attribution: string;
}

export interface LocationRating {
  average: number;
  count: number;
  userRating?: number;
}

export interface UserRating {
  locationId: string;
  rating: number;
  timestamp: number;
}

// ── Remote Destination System ──
export interface RemoteDestinationInfo {
  /** Brief reason like "Limited cell service" shown as bullet points */
  warnings: string[];
  /** Optional detail like "Nearest fuel: 28 miles" */
  details?: string[];
  /** The severity/type label */
  label?: string;
}

// ── Photo System ──
export interface CommunityPhoto {
  id: string;
  locationId: string;
  username: string;
  caption: string;
  timestamp: number;
  color: string;
}

/** Gallery photo with real image support — used in LocationPhotoGallery */
export interface GalleryPhoto {
  id: string;
  imageUrl: string;
  caption?: string;
  credit?: string;
  submittedAt?: string;
  submittedBy?: string;
  likes?: number;
  locationId?: string;
}

/** Map a CommunityPhoto (mock data) to a GalleryPhoto */
export const communityPhotoToGallery = (photo: CommunityPhoto, primaryImageUrl?: string): GalleryPhoto => ({
  id: photo.id,
  imageUrl: primaryImageUrl || '',
  caption: photo.caption,
  credit: photo.username,
  submittedBy: photo.username,
  submittedAt: new Date(photo.timestamp).toISOString(),
  locationId: photo.locationId,
});

// ── User Settings ──
export type MapStyleOption = 'standard' | 'hybrid' | 'satellite';
export type DistanceUnit = 'metric' | 'imperial';
export type ProximityMode = 'walking' | 'biking' | 'driving';
export type DiscoveryFrequency = 'essentials' | 'explorer' | 'completionist' | 'archivist';

export const PROXIMITY_PRESETS: Record<ProximityMode, { label: string; meters: number; description: string }> = {
  walking: { label: 'Walking', meters: 1609, description: '~1 mile — you\'ll pass right by it' },
  biking: { label: 'Biking', meters: 3218, description: '~2 miles — a bit more lead time' },
  driving: { label: 'Driving', meters: 4828, description: '~3 miles — need time to find parking' },
};

export const DISCOVERY_FREQUENCIES: Record<DiscoveryFrequency, { label: string; emoji: string; shortDesc: string; fullDesc: string; minRating: number }> = {
  essentials: { label: 'Essentials', emoji: '🌿', shortDesc: 'Iconic locations & community favorites', fullDesc: 'Show me iconic music locations and community favorites only. 90%+ Worth the Stop. Major landmarks. Few notifications.', minRating: 4.5 },
  explorer: { label: 'Explorer', emoji: '🌟', shortDesc: 'Popular spots & hidden gems', fullDesc: 'Show me the popular spots and some hidden gems. 75%+. More variety. Moderate notifications.', minRating: 3.75 },
  completionist: { label: 'Completionist', emoji: '🎵', shortDesc: 'Everything with community data', fullDesc: "I don't want to miss anything. Everything with community data. Even obscure music locations. Frequent notifications.", minRating: 0 },
  archivist: { label: 'Archivist', emoji: '🗺️', shortDesc: 'Every known music location', fullDesc: 'Show me every known music location. Every verified location. No rating filter. Demo recordings. One-night shows. Alternate covers.', minRating: 0 },
};

export interface QuietHours {
  enabled: boolean;
  from: string;
  to: string;
}

export interface NotificationPreferences {
  savedLocationsEnabled: boolean;
  discoveryModeEnabled: boolean;
  discoveryFrequency: DiscoveryFrequency;
  maxNotificationsPerDay: number;
  quietHours: QuietHours;
  proximityMode: ProximityMode;
}

export const defaultNotificationPreferences: NotificationPreferences = {
  savedLocationsEnabled: true,
  discoveryModeEnabled: false,
  discoveryFrequency: 'essentials',
  maxNotificationsPerDay: 10,
  quietHours: { enabled: false, from: '22:00', to: '07:00' },
  proximityMode: 'driving',
};

export interface UserSettings {
  mapStyle: MapStyleOption;
  distanceUnit: DistanceUnit;
  notificationsEnabled: boolean;
  isPremium: boolean;
  purchasedCityPacks: string[];
  dailyLocationCount: number;
  lastDailyReset: number;
  savedLocationIds: string[];
  proximityMode: ProximityMode;
  notificationPrefs: NotificationPreferences;
  navApp: 'googlemaps' | 'applemaps' | 'waze' | null;
}

export const defaultUserSettings: UserSettings = {
  mapStyle: 'standard',
  distanceUnit: 'metric',
  notificationsEnabled: true,
  isPremium: false,
  purchasedCityPacks: [],
  dailyLocationCount: 0,
  lastDailyReset: Date.now(),
  savedLocationIds: ['nyc-002', 'nyc-007', 'la-001', 'ldn-006'],
  proximityMode: 'driving',
  notificationPrefs: defaultNotificationPreferences,
  navApp: null,
};

// ── City Pack ──
export interface CityPack {
  id: string;
  cityName: string;
  emoji: string;
  price: number;
  locationCount: number;
  description: string;
}

export const availableCityPacks: CityPack[] = [
  { id: 'nyc-deep', cityName: 'New York City', emoji: '🗽', price: 1.99, locationCount: 15, description: "Explore NYC's most iconic music landmarks" },
  { id: 'la-deep', cityName: 'Los Angeles', emoji: '🎸', price: 1.99, locationCount: 15, description: "From the Sunset Strip to Laurel Canyon — LA's musical soul" },
  { id: 'london-deep', cityName: 'London', emoji: '🎹', price: 1.99, locationCount: 15, description: "From Abbey Road to the 100 Club — London's musical legacy" },
  { id: 'paris', cityName: 'Paris', emoji: '🗼', price: 1.99, locationCount: 12, description: 'Amour, musique, et la ville lumière' },
  { id: 'tokyo', cityName: 'Tokyo', emoji: '🗾', price: 1.99, locationCount: 12, description: 'Neon-lit venues from legendary live houses' },
];

// ── Album Grouping ──
export interface AlbumGroup {
  name: string;
  year: number;
  isAlbum: boolean;
  category: LocationCategory;
  locationIds: string[];
  locationCount: number;
}

// ── Local Storage Keys ──
export const STORAGE_KEYS = {
  USER_RATINGS: '@musicnearby/ratings',
  SAVED_PHOTOS: '@musicnearby/saved_photos',
  USER_SETTINGS: '@musicnearby/settings',
  NOTIFICATION_HISTORY: '@musicnearby/notifications',
  ONBOARDING_COMPLETE: '@musicnearby/onboarding_complete',
  ONBOARDING_DATA: '@musicnearby/onboarding_data',
};

// ── Onboarding Data ──
export interface OnboardingData {
  travelStyle: DiscoveryFrequency;
  contentLoves: string[];
  travelMode: 'walking' | 'driving' | 'flying';
  mediaInterests: string[];
  completed: boolean;
  activeCity?: string;
  activeCityLat?: number;
  activeCityLng?: number;
}

export const CITIES: { name: string; state: string; lat: number; lng: number }[] = [
  { name: 'New York', state: 'NY', lat: 40.7128, lng: -74.0060 },
  { name: 'Los Angeles', state: 'CA', lat: 34.0522, lng: -118.2437 },
  { name: 'Chicago', state: 'IL', lat: 41.8781, lng: -87.6298 },
  { name: 'London', state: 'UK', lat: 51.5074, lng: -0.1278 },
  { name: 'Paris', state: 'France', lat: 48.8566, lng: 2.3522 },
  { name: 'Rome', state: 'Italy', lat: 41.9028, lng: 12.4964 },
  { name: 'Sydney', state: 'Australia', lat: -33.8688, lng: 151.2093 },
  { name: 'Tokyo', state: 'Japan', lat: 35.6762, lng: 139.6503 },
  { name: 'Berlin', state: 'Germany', lat: 52.5200, lng: 13.4050 },
  { name: 'Dublin', state: 'Ireland', lat: 53.3498, lng: -6.2603 },
  { name: 'San Francisco', state: 'CA', lat: 37.7749, lng: -122.4194 },
  { name: 'Boston', state: 'MA', lat: 42.3601, lng: -71.0589 },
  { name: 'Seattle', state: 'WA', lat: 47.6062, lng: -122.3321 },
  { name: 'Atlanta', state: 'GA', lat: 33.7490, lng: -84.3880 },
  { name: 'Vancouver', state: 'BC', lat: 49.2827, lng: -123.1207 },
  { name: 'Toronto', state: 'ON', lat: 43.6532, lng: -79.3832 },
  { name: 'Auckland', state: 'NZ', lat: -36.8485, lng: 174.7633 },
  { name: 'New Orleans', state: 'LA', lat: 29.9511, lng: -90.0715 },
  { name: 'Washington DC', state: 'DC', lat: 38.9072, lng: -77.0369 },
  { name: 'Dallas', state: 'TX', lat: 32.7767, lng: -96.7970 },
];
