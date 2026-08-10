import { useState, useEffect, useRef } from 'react';
import { useAllLocations } from '../services/hooks';
import { calculateDistance } from '../services/geo';
import { getLastCity, setLastCity, getArrivalNotifiedCity, setArrivalNotifiedCity } from '../services/StorageService';
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
  /** Whether the quiet arrival banner should show */
  showArrivalBanner: boolean;
  /** Dismiss the arrival banner and record the notification as sent */
  dismissArrival: () => void;
}

/**
 * Detects when the user enters a new city and checks if they have
 * saved locations there. Triggers both:
 * 1. The full CityWelcomeModal (once per city, permanent until city changes)
 * 2. A quiet ArrivalBanner (once per arrival — re-fires on subsequent trips)
 */
export function useCityDetection(
  userLocation: UserLocation,
): CityDetection {
  const { savedIds, loaded: savedLoaded } = useSaved();
  const { locations: allLocations } = useAllLocations();
  const [showWelcome, setShowWelcome] = useState(false);
  const [showArrivalBanner, setShowArrivalBanner] = useState(false);
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

      // ── Arrival banner (once per arrival, re-fires on different trips) ──
      const lastNotified = await getArrivalNotifiedCity();
      if (lastNotified !== closestCity) {
        setShowArrivalBanner(true);
      }

      pendingRef.current = false;
    })();
  }, [userLocation.latitude, userLocation.longitude, savedIds, savedLoaded]);

  const dismiss = async () => {
    setShowWelcome(false);
    await setLastCity(cityName);
  };

  const dismissArrival = async () => {
    setShowArrivalBanner(false);
    await setArrivalNotifiedCity(cityName);
  };

  return { showWelcome, cityName, savedCount, dismiss, showArrivalBanner, dismissArrival };
}
