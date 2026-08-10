/**
 * Background geofencing task for city-arrival notifications.
 *
 * ## Platform behavior
 *
 * **iOS:** Geofencing uses Core Location region monitoring, which
 * relaunches the app even after force-quit. This is the correct path
 * for the "user hasn't opened Scene Nearby in weeks" experience.
 * iOS limit: 20 monitored regions total.
 *
 * **Android:** Geofencing works in foreground and background, but
 * Android does NOT reliably relaunch a killed app via geofence events.
 * Users who force-quit on Android won't receive arrival notifications
 * until they open the app again. This is an Android platform limitation
 * — there is no expo-notifications workaround for it.
 *
 * ## Region management
 * When the user saves locations in >20 unique cities, we monitor the
 * 20 cities closest to their active city (stored in onboarding data).
 * All other cities are dropped silently until the set changes.
 */

import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculateDistance } from '../services/geo';
import allLocations from '../data/locations.json';

export const GEOFENCE_TASK = 'SCENE_NEARBY_GEOFENCE';

/** Maximum regions iOS will monitor (system limit). */
const MAX_REGIONS = 20;

/** Geofence radius in meters — ~3 miles / 5km. */
const REGION_RADIUS = 5000;

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
 * Geofence task: fires when the device enters a monitored region.
 * On iOS, this task can wake the app even after force-quit.
 */
TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[GeofenceTask] Error:', error.message);
    return;
  }

  const { eventType, region } = data as {
    eventType: Location.LocationGeofencingEventType;
    region: Location.LocationRegion;
  };

  // Only react to enter events
  if (eventType !== Location.LocationGeofencingEventType.Enter) return;

  const cityName = region.identifier;
  if (!cityName) return;

  try {
    // ── Dedup check ──
    const lastNotified = await AsyncStorage.getItem(
      '@scenenearby/arrival_notified_city',
    );
    if (lastNotified === cityName) return;

    // ── Verify user still has saves in this city ──
    const savedRaw = await AsyncStorage.getItem('@scenenearby/saved_ids');
    if (!savedRaw) return;
    const savedIds: Set<string> = new Set(JSON.parse(savedRaw));

    const cityLower = cityName.toLowerCase();
    let count = 0;
    for (const id of savedIds) {
      const loc = locations.find((l) => l.id === id);
      if (loc && loc.city.toLowerCase() === cityLower) count++;
    }
    if (count === 0) return;

    // ── Send notification ──
    const flag = getFlag(cityName);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${flag} Welcome to ${cityName}!`,
        body: "Scene Nearby is watching for filming locations around you. We'll let you know when there's something nearby you won't want to miss.",
        data: { type: 'arrival', city: cityName },
      },
      trigger: null,
    });

    // ── Record notification sent ──
    await AsyncStorage.setItem(
      '@scenenearby/arrival_notified_city',
      cityName,
    );
  } catch (err) {
    console.error('[GeofenceTask] Error:', err);
  }
});

/**
 * Compute the set of cities from the user's saved location IDs.
 */
function savedCitiesForIds(
  savedIds: Set<string>,
): Map<string, { lat: number; lng: number }> {
  const cities = new Map<string, { lat: number; lng: number }>();
  for (const id of savedIds) {
    const loc = locations.find((l) => l.id === id);
    if (loc && !cities.has(loc.city)) {
      cities.set(loc.city, { lat: loc.latitude, lng: loc.longitude });
    }
  }
  return cities;
}

/**
 * Pick up to MAX_REGIONS cities, sorted by distance from a reference
 * point (the user's active city from onboarding data).
 */
function selectRegions(
  cities: Map<string, { lat: number; lng: number }>,
  originLat: number,
  originLng: number,
): Location.LocationRegion[] {
  const ranked = Array.from(cities.entries())
    .map(([name, coords]) => ({
      name,
      dist: calculateDistance(originLat, originLng, coords.lat, coords.lng),
      lat: coords.lat,
      lng: coords.lng,
    }))
    .sort((a, b) => a.dist - b.dist);

  return ranked.slice(0, MAX_REGIONS).map((r) => ({
    identifier: r.name,
    latitude: r.lat,
    longitude: r.lng,
    radius: REGION_RADIUS,
  }));
}

/**
 * Start geofencing around cities where the user has saved locations.
 * If >20 cities, prioritizes the closest to the active city.
 */
export async function startBackgroundGeofencing(): Promise<void> {
  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status !== 'granted') {
    console.log('[GeofenceTask] Background location permission denied');
    return;
  }

  // Load saved IDs
  const savedRaw = await AsyncStorage.getItem('@scenenearby/saved_ids');
  if (!savedRaw) return;
  const savedIds = new Set<string>(JSON.parse(savedRaw));
  if (savedIds.size === 0) return;

  const cities = savedCitiesForIds(savedIds);
  if (cities.size === 0) return;

  // Load active city coords for region prioritization
  let originLat = 0;
  let originLng = 0;
  try {
    const onboardingRaw = await AsyncStorage.getItem(
      '@scenenearby/onboarding_data',
    );
    if (onboardingRaw) {
      const onboarding = JSON.parse(onboardingRaw);
      originLat = onboarding.activeCityLat || 0;
      originLng = onboarding.activeCityLng || 0;
    }
  } catch {}

  const regions = selectRegions(cities, originLat, originLng);

  // Stop any existing geofencing first (allows updating regions)
  const hasStarted = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK);
  if (hasStarted) {
    await Location.stopGeofencingAsync(GEOFENCE_TASK);
  }

  await Location.startGeofencingAsync(GEOFENCE_TASK, regions);
  console.log(
    `[GeofenceTask] Geofencing started — monitoring ${regions.length} cities`,
  );
}

/**
 * Stop geofencing. Call when the user removes all saved locations.
 */
export async function stopBackgroundGeofencing(): Promise<void> {
  const hasStarted = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK);
  if (!hasStarted) return;

  await Location.stopGeofencingAsync(GEOFENCE_TASK);
  console.log('[GeofenceTask] Geofencing stopped');
}
