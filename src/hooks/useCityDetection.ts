import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useAllLocations } from '../services/hooks';
import { calculateDistance } from '../services/geo';
import {
  getLastCity,
  setLastCity,
  getArrivalNotifiedCity,
  setArrivalNotifiedCity,
} from '../services/StorageService';
import { useSaved } from '../context/SavedContext';
import type { UserLocation } from './useUserLocation';

export interface CityDetection {
  /** Whether the welcome modal should show */
  showWelcome: boolean;
  /** Detected city name */
  cityName: string;
  /** Count of saved locations in this city */
  savedCount: number;
  /** Dismiss the modal and record the city as seen */
  dismiss: () => void;
}

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
 * Sends a local device notification for city arrival.
 * Works when the app is in the foreground or background.
 */
async function sendArrivalNotification(cityName: string): Promise<void> {
  const flag = getFlag(cityName);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${flag} Welcome to ${cityName}!`,
      body: "Scene Nearby is watching for filming locations around you. We'll let you know when there's something nearby you won't want to miss.",
    },
    trigger: null, // immediate
  });
}

/**
 * Detects when the user enters a new city and checks if they have
 * saved locations there. Triggers:
 * 1. The CityWelcomeModal (once per city, permanent until city changes)
 * 2. A local device notification (once per arrival, re-fires on subsequent trips)
 */
export function useCityDetection(
  userLocation: UserLocation,
): CityDetection {
  const { savedIds, loaded: savedLoaded } = useSaved();
  const { locations: allLocations } = useAllLocations();
  const [showWelcome, setShowWelcome] = useState(false);
  const [cityName, setCityName] = useState('');
  const [savedCount, setSavedCount] = useState(0);
  const pendingRef = useRef(false);

  useEffect(() => {
    if (!savedLoaded) return;
    if (savedIds.size === 0) return;
    if (!userLocation.latitude || !userLocation.longitude) return;
    if (pendingRef.current) return;

    // Find the closest city from our data
    const cityCenters = new Map<string, { lat: number; lng: number }>();

    for (const loc of allLocations) {
      if (!cityCenters.has(loc.city)) {
        cityCenters.set(loc.city, { lat: loc.latitude, lng: loc.longitude });
      }
    }

    let closestCity = '';
    let closestDist = Infinity;

    for (const [city, coords] of cityCenters) {
      const dist = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        coords.lat,
        coords.lng,
      );
      if (dist < closestDist) {
        closestDist = dist;
        closestCity = city;
      }
    }

    // Only consider cities within ~50 miles (80km)
    if (closestDist > 80467 || !closestCity) return;

    pendingRef.current = true;
    (async () => {
      // Count saved locations in this city
      const cityLower = closestCity.toLowerCase();
      let count = 0;
      for (const id of savedIds) {
        const loc = allLocations.find((l) => l.id === id);
        if (loc && loc.city.toLowerCase() === cityLower) count++;
      }

      if (count === 0) {
        pendingRef.current = false;
        return;
      }

      setCityName(closestCity);
      setSavedCount(count);

      // ── Welcome modal (once per city, permanent) ──
      const lastCity = await getLastCity();
      if (lastCity !== closestCity) {
        setShowWelcome(true);
      }

      // ── Device notification (once per arrival, re-fires on different trips) ──
      const lastNotified = await getArrivalNotifiedCity();
      if (lastNotified !== closestCity) {
        await sendArrivalNotification(closestCity);
        await setArrivalNotifiedCity(closestCity);
      }

      pendingRef.current = false;
    })();
  }, [userLocation.latitude, userLocation.longitude, savedIds, savedLoaded]);

  const dismiss = async () => {
    setShowWelcome(false);
    await setLastCity(cityName);
  };

  return { showWelcome, cityName, savedCount, dismiss };
}
