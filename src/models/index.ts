// ── Category Enum ──
export enum LocationCategory {
  drama = 'Drama',
  comedy = 'Comedy',
  sciFi = 'Sci-Fi',
  action = 'Action',
  romance = 'Romance',
}

export const categoryColors: Record<LocationCategory, string> = {
  [LocationCategory.drama]: '#8B5CF6',
  [LocationCategory.comedy]: '#EAB308',
  [LocationCategory.sciFi]: '#06B6D4',
  [LocationCategory.action]: '#EF4444',
  [LocationCategory.romance]: '#EC4899',
};

export const categoryIcons: Record<LocationCategory, string> = {
  [LocationCategory.drama]: 'theater-masks',
  [LocationCategory.comedy]: 'smile',
  [LocationCategory.sciFi]: 'sparkles',
  [LocationCategory.action]: 'flame',
  [LocationCategory.romance]: 'heart',
};

// ── Core Model ──
export interface FilmingLocation {
  id: string;
  title: string;
  movieOrShow: string;
  year: number;
  category: LocationCategory;
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
  distanceFromUser?: number;
  rating?: LocationRating;
  photoCount?: number;
  actors?: string[];
}

export interface ActorGroup {
  name: string;
  locationIds: string[];
  showTitles: string[];
}

export const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)}m away`;
  }
  return `${(meters / 1000).toFixed(1)} km away`;
};

// ── Rating System ──
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

// ── Photo System ──
export interface CommunityPhoto {
  id: string;
  locationId: string;
  username: string;
  caption: string;
  timestamp: number;
  color: string;
}

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
  essentials: { label: 'Essentials', emoji: '🌿', shortDesc: 'Iconic locations & community favorites', fullDesc: 'Show me iconic locations and community favorites only. 90%+ Worth the Stop. Major landmarks. Few notifications.', minRating: 4.5 },
  explorer: { label: 'Explorer', emoji: '🌟', shortDesc: 'Popular spots & hidden gems', fullDesc: 'Show me the popular spots and some hidden gems. 75%+. More variety. Moderate notifications.', minRating: 3.75 },
  completionist: { label: 'Completionist', emoji: '🎬', shortDesc: 'Everything with community data', fullDesc: "I don't want to miss anything. Everything with community data. Even obscure filming locations. Frequent notifications.", minRating: 0 },
  archivist: { label: 'Archivist', emoji: '🗺️', shortDesc: 'Every known filming location', fullDesc: 'Show me every known filming location. Every verified location. No rating filter. Tiny cameos. One-scene appearances. Alternate angles.', minRating: 0 },
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
  { id: 'nyc-deep', cityName: 'New York City', emoji: '🗽', price: 1.99, locationCount: 15, description: "Dive deeper into NYC's most iconic film locations" },
  { id: 'la-deep', cityName: 'Los Angeles', emoji: '🎬', price: 1.99, locationCount: 15, description: "Explore Hollywood's backyard like never before" },
  { id: 'london-deep', cityName: 'London', emoji: '🎭', price: 1.99, locationCount: 15, description: "From Baker Street to Hogwarts — London's cinematic soul" },
  { id: 'paris', cityName: 'Paris', emoji: '🗼', price: 1.99, locationCount: 12, description: 'Amour, cinéma, et la ville lumière' },
  { id: 'tokyo', cityName: 'Tokyo', emoji: '🗾', price: 1.99, locationCount: 12, description: 'Neon-lit streets from your favorite films' },
];

// ── Movie/Show Grouping ──
export interface MovieGroup {
  title: string;
  year: number;
  isMovie: boolean;
  category: LocationCategory;
  locationIds: string[];
  locationCount: number;
}

// ── Local Storage Keys ──
export const STORAGE_KEYS = {
  USER_RATINGS: '@scenenearby/ratings',
  SAVED_PHOTOS: '@scenenearby/saved_photos',
  USER_SETTINGS: '@scenenearby/settings',
  NOTIFICATION_HISTORY: '@scenenearby/notifications',
  ONBOARDING_COMPLETE: '@scenenearby/onboarding_complete',
  ONBOARDING_DATA: '@scenenearby/onboarding_data',
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
