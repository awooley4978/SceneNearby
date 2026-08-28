import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { getOnboardingData } from '../services/StorageService';

export interface UserLocation {
  latitude: number | null;
  longitude: number | null;
  /** Whether the location came from real GPS (true) or onboarding fallback (false) */
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
 * How long (ms) the UI shows the "Locating you…" state before we give up waiting
 * on a first GPS fix. The watcher keeps running past this and will still hand off
 * to live GPS the instant a fix arrives — this is only a guard so the screen does
 * not hang silently on a cold/indoor location service (which can otherwise take
 * 10+ minutes to satisfy `getCurrentPositionAsync` at Balanced accuracy).
 */
const FIRST_FIX_TIMEOUT_MS = 10_000;

/**
 * Hook that provides the user's current location.
 *
 * Priority:
 * 1. Real GPS via expo-location (if permission granted) — a watcher is started
 *    immediately after permission is granted, and its FIRST callback populates
 *    live GPS. Driving from the watcher (instead of `getCurrentPositionAsync`)
 *    avoids blocking on a single fix, which can take minutes on a cold/indoor
 *    location service. The watcher keeps running and refines accuracy over time.
 * 2. Onboarding data (activeCityLat/activeCityLng) if permission denied
 * 3. null if no data available (no distance is displayed)
 *
 * When GPS is available, coordinates are validated before being returned.
 * When GPS is unavailable, the hook falls back to onboarding data.
 * The hook never returns invalid coordinates.
 */
export function useUserLocation(): UserLocation {
  const [location, setLocation] = useState<UserLocation>({
    latitude: null,
    longitude: null,
    isGps: false,
    isLoading: true,
    permissionDenied: false,
    error: null,
  });

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
          // This replaces the previous `getCurrentPositionAsync` one-shot, which can
          // block for minutes before ANY fix (the V1 location-handoff bug).
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
            setLocation((prev) => ({
              ...prev,
              isLoading: false,
              error: 'Still determining your location',
            }));
          }, FIRST_FIX_TIMEOUT_MS);

          return;
        }

        // Permission denied — fall back to onboarding data
        setLocation((prev) => ({
          ...prev,
          permissionDenied: true,
        }));

        try {
          const onboardingData = await getOnboardingData();
          if (!mounted) return;

          if (onboardingData?.activeCityLat && onboardingData?.activeCityLng) {
            const onboardingLat = onboardingData.activeCityLat;
            const onboardingLng = onboardingData.activeCityLng;
            if (isValidCoordinate(onboardingLat, onboardingLng)) {
              setLocation({
                latitude: onboardingLat,
                longitude: onboardingLng,
                isGps: false,
                isLoading: false,
                permissionDenied: true,
                error: null,
              });
            } else {
              setLocation((prev) => ({
                ...prev,
                isLoading: false,
                error: 'Invalid onboarding coordinates',
              }));
            }
          } else {
            // No data available — stay null, don't display distance
            setLocation((prev) => ({
              ...prev,
              isLoading: false,
              error: 'No location data available',
            }));
          }
        } catch {
          if (!mounted) return;
          setLocation((prev) => ({
            ...prev,
            isLoading: false,
            error: 'Failed to load onboarding data',
          }));
        }
      } catch (err: any) {
        if (!mounted) return;
        setLocation({
          latitude: null,
          longitude: null,
          isGps: false,
          isLoading: false,
          permissionDenied: false,
          error: err?.message || 'Failed to get location',
        });
      }
    }

    getLocation();

    return () => {
      mounted = false;
      if (watcher) watcher.remove();
      if (firstFixTimer) clearTimeout(firstFixTimer);
    };
  }, []);

  return location;
}
