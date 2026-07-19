import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { getOnboardingData } from '../services/StorageService';

interface UserLocation {
  latitude: number;
  longitude: number;
  /** Whether the location came from real GPS (true) or onboarding fallback (false) */
  isGps: boolean;
  /** Whether we're still loading the location */
  isLoading: boolean;
  /** Whether permission was denied */
  permissionDenied: boolean;
  /** Error message, if any */
  error: string | null;
}

const DEFAULT_LOCATION = { latitude: 40.7580, longitude: -73.9855 }; // Times Square, NYC

/**
 * Hook that provides the user's current location.
 *
 * Priority:
 * 1. Real GPS via expo-location (if permission granted) — watches for position changes
 * 2. Onboarding data (activeCityLat/activeCityLng) if permission denied
 * 3. Default location (Times Square) if no data available
 */
export function useUserLocation(): UserLocation {
  const [location, setLocation] = useState<UserLocation>({
    latitude: DEFAULT_LOCATION.latitude,
    longitude: DEFAULT_LOCATION.longitude,
    isGps: false,
    isLoading: true,
    permissionDenied: false,
    error: null,
  });

  useEffect(() => {
    let mounted = true;
    let watcher: Location.LocationSubscription | null = null;

    async function getLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (!mounted) return;

        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

          if (!mounted) return;

          setLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            isGps: true,
            isLoading: false,
            permissionDenied: false,
            error: null,
          });

          // Watch for position changes — recalculates distances as user moves
          watcher = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.Balanced,
              timeInterval: 5000,      // Every 5 seconds
              distanceInterval: 100,   // Or every 100 meters
            },
            (newLoc) => {
              if (mounted) {
                setLocation({
                  latitude: newLoc.coords.latitude,
                  longitude: newLoc.coords.longitude,
                  isGps: true,
                  isLoading: false,
                  permissionDenied: false,
                  error: null,
                });
              }
            }
          );
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
            setLocation({
              latitude: onboardingData.activeCityLat,
              longitude: onboardingData.activeCityLng,
              isGps: false,
              isLoading: false,
              permissionDenied: true,
              error: null,
            });
          } else {
            // Use default
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
          latitude: DEFAULT_LOCATION.latitude,
          longitude: DEFAULT_LOCATION.longitude,
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
    };
  }, []);

  return location;
}