import { useState, useEffect, useRef } from 'react';
import { useAllLocations } from '../services/hooks';
import { calculateDistance } from '../services/geo';
import { getLastCity, setLastCity } from '../services/StorageService';
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

/**
 * Detects when the user enters a new city and checks if they have
 * saved locations there. Triggers the city welcome flow once per city.
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

    // Check if this is a new city
    pendingRef.current = true;
    (async () => {
      const lastCity = await getLastCity();
      if (lastCity === closestCity) {
        pendingRef.current = false;
        return; // Already welcomed here
      }

      // Count saved locations in this city
      const cityLower = closestCity.toLowerCase();
      let count = 0;
      for (const id of savedIds) {
        const loc = allLocations.find((l) => l.id === id);
        if (loc && loc.city.toLowerCase() === cityLower) count++;
      }

      if (count > 0) {
        setCityName(closestCity);
        setSavedCount(count);
        setShowWelcome(true);
      }
      pendingRef.current = false;
    })();
  }, [userLocation.latitude, userLocation.longitude, savedIds, savedLoaded, allLocations.length]);

  const dismiss = async () => {
    setShowWelcome(false);
    await setLastCity(cityName);
  };

  return { showWelcome, cityName, savedCount, dismiss };
}
