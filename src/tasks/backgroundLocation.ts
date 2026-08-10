import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculateDistance } from '../services/geo';
import allLocations from '../data/locations.json';

export const BACKGROUND_LOCATION_TASK = 'SCENE_NEARBY_BACKGROUND_LOCATION';

interface LocationData {
  latitude: number;
  longitude: number;
}

interface FilmingLocation {
  id: string;
  city: string;
  latitude: number;
  longitude: number;
}

const locations = allLocations as FilmingLocation[];

const CITY_FLAGS: Record<string, string> = {
  'London': '🇬🇧',
  'Paris': '🇫🇷',
  'New York City': '🇺🇸',
  'Los Angeles': '🇺🇸',
  'Chicago': '🇺🇸',
  'Dallas': '🇺🇸',
  'San Francisco': '🇺🇸',
  'Boston': '🇺🇸',
  'Seattle': '🇺🇸',
  'New Orleans': '🇺🇸',
  'Washington DC': '🇺🇸',
  'Toronto': '🇨🇦',
  'Sydney': '🇦🇺',
  'Tokyo': '🇯🇵',
  'Dublin': '🇮🇪',
  'Albuquerque': '🇺🇸',
};

function getFlag(cityName: string): string {
  return CITY_FLAGS[cityName] || '📍';
}

/**
 * Background task: fires when the OS delivers a location update,
 * even if the app is killed. Checks if the user has entered a new
 * city with saved filming locations and sends a local notification.
 */
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[BackgroundTask] Error:', error.message);
    return;
  }

  const { locations: locs } = data as { locations: LocationData[] };
  if (!locs || locs.length === 0) return;

  const { latitude, longitude } = locs[0];

  try {
    // ── Load saved IDs ──
    const savedRaw = await AsyncStorage.getItem('@scenenearby/saved_ids');
    const savedIds: Set<string> = savedRaw
      ? new Set(JSON.parse(savedRaw))
      : new Set();
    if (savedIds.size === 0) return;

    // ── Load last notified city ──
    const lastNotified = await AsyncStorage.getItem('@scenenearby/arrival_notified_city');

    // ── Find closest city from our data ──
    const cityCenters = new Map<string, { lat: number; lng: number }>();
    for (const loc of locations) {
      if (!cityCenters.has(loc.city)) {
        cityCenters.set(loc.city, { lat: loc.latitude, lng: loc.longitude });
      }
    }

    let closestCity = '';
    let closestDist = Infinity;
    for (const [city, coords] of cityCenters) {
      const dist = calculateDistance(latitude, longitude, coords.lat, coords.lng);
      if (dist < closestDist) {
        closestDist = dist;
        closestCity = city;
      }
    }

    // Only within ~50 miles (80km)
    if (closestDist > 80467 || !closestCity) return;

    // Already notified for this arrival?
    if (lastNotified === closestCity) return;

    // ── Count saved locations in this city ──
    const cityLower = closestCity.toLowerCase();
    let count = 0;
    for (const id of savedIds) {
      const loc = locations.find((l) => l.id === id);
      if (loc && loc.city.toLowerCase() === cityLower) count++;
    }
    if (count === 0) return;

    // ── Send notification ──
    const flag = getFlag(closestCity);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${flag} Welcome to ${closestCity}!`,
        body: "Scene Nearby is watching for filming locations around you. We'll let you know when there's something nearby you won't want to miss.",
        data: { type: 'arrival', city: closestCity },
      },
      trigger: null, // immediate
    });

    // ── Record notification sent ──
    await AsyncStorage.setItem('@scenenearby/arrival_notified_city', closestCity);
  } catch (err) {
    console.error('[BackgroundTask] Error:', err);
  }
});

/**
 * Start background location tracking.
 * Call when the user has saved locations.
 */
export async function startBackgroundLocationTracking(): Promise<void> {
  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status !== 'granted') {
    console.log('[BackgroundTask] Background location permission denied');
    return;
  }

  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
  if (!isRegistered) {
    console.log('[BackgroundTask] Task not registered — this is unexpected');
    return;
  }

  const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  if (hasStarted) return; // already running

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: 1609, // ~1 mile — battery-friendly
    deferredUpdatesInterval: 300000, // 5 min minimum on iOS
    foregroundService: {
      notificationTitle: 'Scene Nearby',
      notificationBody: 'Watching for filming locations near you',
      notificationColor: '#f5c518',
    },
  });

  console.log('[BackgroundTask] Background location tracking started');
}

/**
 * Stop background location tracking.
 * Call when the user removes all saved locations.
 */
export async function stopBackgroundLocationTracking(): Promise<void> {
  const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  if (!hasStarted) return;

  await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  console.log('[BackgroundTask] Background location tracking stopped');
}
