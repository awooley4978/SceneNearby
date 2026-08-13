import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { theme } from '../theme';
import { useUserLocation } from '../hooks/useUserLocation';
import { useAllLocations } from '../services/hooks';
import { calculateDistance } from '../services/geo';
import { getOnboardingData } from '../services/StorageService';

const RADII = [3, 5, 10, 25, 50];
const MILES_PER_METER = 1 / 1609.34;

/**
 * Diagnostic panel (Profile screen) showing the exact coordinates the device
 * feeds into calculateDistance() plus coverage counts against the loaded
 * locations. Used to verify the empty-feed diagnosis on-device:
 * a location with no coverage yields 0 within every radius.
 */
export const LocationDebugPanel: React.FC = () => {
  const loc = useUserLocation();
  const { locations } = useAllLocations();
  const [activeCity, setActiveCity] = useState<string | null>(null);
  const [activeCityCoords, setActiveCityCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    let mounted = true;
    getOnboardingData()
      .then((data) => {
        if (!mounted) return;
        setActiveCity(data?.activeCity ?? null);
        if (data?.activeCityLat && data?.activeCityLng) {
          setActiveCityCoords({ lat: data.activeCityLat, lng: data.activeCityLng });
        }
      })
      .catch(() => {
        if (mounted) setActiveCity(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const hasCoords = loc.latitude !== null && loc.longitude !== null;
  const counts = RADII.map((r) => ({
    r,
    n: hasCoords
      ? locations.filter(
          (l) => calculateDistance(loc.latitude!, loc.longitude!, l.latitude, l.longitude) * MILES_PER_METER <= r,
        ).length
      : null,
  }));

  let nearest: { title: string; miles: number } | null = null;
  if (hasCoords && locations.length > 0) {
    let best = locations[0];
    let bestMiles = Infinity;
    for (const l of locations) {
      const m = calculateDistance(loc.latitude!, loc.longitude!, l.latitude, l.longitude) * MILES_PER_METER;
      if (m < bestMiles) {
        bestMiles = m;
        best = l;
      }
    }
    nearest = { title: best.title, miles: Math.round(bestMiles * 10) / 10 };
  }

  const source = loc.isGps
    ? 'GPS (live watcher)'
    : loc.permissionDenied
      ? 'onboarding fallback'
      : loc.latitude !== null
        ? 'other'
        : 'none';

  return (
    <View style={styles.box}>
      <Text style={styles.title}>🛰️ Location Debug</Text>
      <Text style={styles.row}>
        coords: {hasCoords ? `${loc.latitude!.toFixed(6)}, ${loc.longitude!.toFixed(6)}` : '—'}
      </Text>
      <Text style={styles.row}>source: {source}</Text>
      <Text style={styles.row}>
        permissionDenied: {String(loc.permissionDenied)} · loading: {String(loc.isLoading)}
      </Text>
      {loc.error ? <Text style={[styles.row, styles.errorRow]}>error: {loc.error}</Text> : null}
      <Text style={styles.row}>
        onboarding active city: {activeCity ?? '—'}
        {activeCityCoords ? ` (${activeCityCoords.lat.toFixed(4)}, ${activeCityCoords.lng.toFixed(4)})` : ''}
      </Text>
      <Text style={styles.row}>locations loaded: {locations.length}</Text>
      <Text style={styles.row}>
        within {RADII.join('/')} mi: {counts.map((c) => (c.n === null ? '—' : c.n)).join(' / ')}
      </Text>
      <Text style={styles.row}>
        nearest: {nearest ? `${nearest.title} — ${nearest.miles} mi` : '—'}
      </Text>
    </View>
  );
};

const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

const styles = StyleSheet.create({
  box: {
    marginTop: 24,
    padding: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.surface2,
    borderWidth: 1,
    borderColor: theme.colors.surface3,
  },
  title: { fontSize: 12, fontWeight: '700', color: theme.colors.gold, marginBottom: 6 },
  row: { fontSize: 11, color: theme.colors.textSecondary, fontFamily: mono, marginTop: 2 },
  errorRow: { color: '#F87171' },
});
