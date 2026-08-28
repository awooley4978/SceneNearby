import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { getOnboardingData } from '../services/StorageService';
import {
  getDestinationContextSync,
  useDestinationContext,
} from '../services/destinationContext';

export interface UserLocation {
  latitude: number | null;
  longitude: number | null;
  /** Whether the location came from real GPS (true) or onboarding/fallback (false) */
  isGps: boolean;
  /** Whether we're still loading the location */
  isLoading: boolean;
  /** Whether permission was denied */
  permissionDenied: boolean;
  /** Error message, if any */
  error: string | null;
}

/** Validate that a latitude/longitude pair is within valid geographic bounds */
export function isValidCoordinate(lat: number | null, lng: number | null): boolean {
  if (lat === null || lng === null) return false;
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (isNaN(lat) || isNaN(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
}

/**
 * Resolve the authoritative "fallback" coordinates for non-GPS browsing.
 *
 * Priority (T-DST, owner-approved 08-28):
 *  1. The STICKY destination context, when one is active — a selected
 *     destination overrides the home-city fallback (and the GPS-fallback
 *     path) so the app stays anchored on that destination.
 *  2. The onboarding home-city data (activeCityLat/Lng), which is the existing
 *     behavior when no destination is active.
 * Returns null when neither is available.
 */
function resolveFallback(destination: { latitude: number; longitude: number } | null, onboardingCoords: { lat: number; lng: number } | null): { lat: number; lng: number } | null {
  if (destination && isValidCoordinate(destination.latitude, destination.longitude)) {
    return { lat: destination.latitude, lng: destination.longitude };
  }
  if (onboardingCoords && isValidCoordinate(onboardingCoords.lat, onboardingCoords.lng)) {
    return onboardingCoords;
  }
  return null;
}

/**
 * Hook that provides the user's current location.
 *
 * Priority:
 * 1. Real GPS via expo-location (if permission granted) — a watcher is started
 *    immediately after permission is granted, and its FIRST callback populates
 *    live GPS. The watcher keeps running and refines accuracy over time.
 * 2. STICKY destination context (when active) if permission denied / no GPS.
 * 3. Onboarding data (activeCityLat/activeCityLng) as the home-city fallback.
 * 4. null if no data available (no distance is displayed).
 *
 * When GPS is available it always wins; when it is not, the hook falls back to
 * the destination context (if active) then onboarding data. The fallback
 * re-resolves reactively whenever the destination context changes.
 */
export function useUserLocation(): UserLocation {
  const destination = useDestinationContext();
  const [location, setLocation] = useState<UserLocation>({
    latitude: null,
    longitude: null,
    isGps: false,
    isLoading: true,
    permissionDenied: false,
    error: null,
  });

  // Load onboarding coords once — used as the fallback source of truth.
  const [onboardingCoords, setOnboardingCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Resolve the current non-GPS fallback from destination + onboarding.
  const applyFallback = useCallback(() => {
    const dest = getDestinationContextSync();
    const fb = resolveFallback(dest, onboardingCoords);
    setLocation((prev) => {
      if (prev.isGps) return prev; // real GPS always wins once we have it
      if (fb) {
        return {
          latitude: fb.lat,
          longitude: fb.lng,
          isGps: false,
          isLoading: false,
          permissionDenied: true,
          error: prev.isLoading ? null : prev.error,
        };
      }
      return prev;
    });
  }, [onboardingCoords]);

  useEffect(() => {
    (async () => {
      try {
        const data = await getOnboardingData();
        if (data?.activeCityLat && data?.activeCityLng) {
          setOnboardingCoords({ lat: data.activeCityLat, lng: data.activeCityLng });
        }
      } catch {}
    })();
  }, []);

  // Re-resolve fallback when onboarding coords land and when destination changes.
  useEffect(() => {
    applyFallback();
  }, [applyFallback, destination]);

  useEffect(() => {
    let mounted = true;
    let watcher: Location.LocationSubscription | null = null;
    let firstFixTimer: ReturnType<typeof setTimeout> | null = null;

    async function getLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (!mounted) return;

        if (status === 'granted') {
          // Start the watcher immediately — its first callback is our GPS handoff.
          watcher = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.Balanced,
              timeInterval: 5000,      // Every 5 seconds
              distanceInterval: 100,   // Or every 100 meters
            },
            (newLoc) => {
              if (!mounted) return;
              const { latitude, longitude } = newLoc.coords;
              if (isValidCoordinate(latitude, longitude)) {
                setLocation({
                  latitude,
                  longitude,
                  isGps: true,
                  isLoading: false,
                  permissionDenied: false,
                  error: null,
                });
              }
            }
          );

          // Guard: if no fix arrives in time, surface an explicit "still locating"
          // state instead of silently hanging on an empty feed. The watcher keeps
          // running and still hands off to GPS when the first fix lands.
          firstFixTimer = setTimeout(() => {
            if (!mounted) return;
            setLocation((prev) => {
              if (prev.isGps) return prev;
              return {
                ...prev,
                isLoading: false,
                error: 'Still determining your location',
              };
            });
          }, 10_000);

          return;
        }

        // Permission denied — fall back to destination context, then onboarding.
        setLocation((prev) => ({
          ...prev,
          permissionDenied: true,
        }));
        applyFallback();
      } catch (err: any) {
        if (!mounted) return;
        // A thrown permission/error — fall back if we have a destination.
        const dest = getDestinationContextSync();
        const fb = resolveFallback(dest, onboardingCoords);
        setLocation({
          latitude: fb?.lat ?? null,
          longitude: fb?.lng ?? null,
          isGps: false,
          isLoading: false,
          permissionDenied: !!dest,
          error: fb ? null : err?.message || 'Failed to get location',
        });
      }
    }

    getLocation();

    return () => {
      mounted = false;
      if (watcher) watcher.remove();
      if (firstFixTimer) clearTimeout(firstFixTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return location;
}
