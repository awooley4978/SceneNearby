import React, { useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '../../components/BackButton';
import { theme } from '../../theme';
import { useAllLocations } from '../../services/hooks';
import { LocationCard } from '../../components/LocationCard';
import { EmptyState } from '../../components/EmptyState';

/**
 * Destination screen — reached from Discover search when the user picks a
 * city/destination result (e.g. "📍 London, UK — Explore locations").
 *
 * Shows EVERY filming location for that destination (metro/city grouping),
 * regardless of the user's current GPS position or discovery radius. It is a
 * pure content view: it does NOT change the user's onboarding or home
 * location, GPS location, notification settings, or any preferences.
 *
 * "View on Map" opens the map centered + zoomed to this destination's
 * locations so the user can see them all geographically. No location count is
 * shown on this screen (V1).
 */
export const DestinationScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { city } = route.params;
  const insets = useSafeAreaInsets();
  const { locations, loading, error, refetch } = useAllLocations();

  // Filter the full set to this destination's locations. Comparison is
  // case-insensitive metro/city grouping (the app's `city` field), identical
  // to how the search result was built.
  const cityLocations = useMemo(() => {
    const needle = (city || '').trim().toLowerCase();
    if (!needle) return [];
    return locations.filter((loc) => (loc.city || '').trim().toLowerCase() === needle);
  }, [city, locations]);

  // Region that fits every location of this destination (with padding), so the
  // map shows them all at once. Falls back to a sane default if there's a
  // single location or none yet. Used when navigating to the map.
  const mapRegion = useMemo(() => {
    const locs = cityLocations;
    if (!locs.length) return null;
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (const l of locs) {
      if (l.latitude < minLat) minLat = l.latitude;
      if (l.latitude > maxLat) maxLat = l.latitude;
      if (l.longitude < minLng) minLng = l.longitude;
      if (l.longitude > maxLng) maxLng = l.longitude;
    }
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    // Pad the pan bounds by 60% so edge pins aren't clipped; clamp to a minimum
    // so a single-location destination (or a tight cluster) is still readable.
    const latDelta = Math.max((maxLat - minLat) * 1.6, 0.08);
    const lngDelta = Math.max((maxLng - minLng) * 1.6, 0.08);
    return { centerLat, centerLng, centerLatDelta: latDelta, centerLngDelta: lngDelta, focusCity: city };
  }, [cityLocations, city]);

  const openMap = () => {
    if (!mapRegion) return;
    navigation.navigate('Nearby', { screen: 'NearbyMap', params: mapRegion });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.gold} />
        <Text style={[styles.centerText, { marginTop: 10 }]}>Loading {city}…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <EmptyState
        emoji="⚠️"
        title="Couldn't load this destination"
        subtitle={error}
        actionLabel="Try Again"
        onAction={refetch}
      />
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <BackButton />
      {/* Header — city name only. No location count is shown for V1. */}
      <View style={styles.header}>
        <Text style={styles.emoji}>📍</Text>
        <Text style={styles.cityName}>{city}</Text>
        <TouchableOpacity
          style={[styles.viewMapButton, !mapRegion && styles.viewMapButtonDisabled]}
          onPress={openMap}
          disabled={!mapRegion}
          activeOpacity={0.7}
        >
          <Text style={styles.viewMapButtonText}>🗺️ View on Map</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={cityLocations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <LocationCard
            location={item}
            onPress={() => navigation.navigate('LocationDetail', { locationId: item.id })}
            onMoviePress={() => navigation.navigate('MovieDetail', { movieTitle: item.movieOrShow })}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            emoji="📍"
            title="No locations yet"
            subtitle="We're still adding filming locations for this destination."
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
  centerText: { color: theme.colors.textSecondary, fontSize: 14, fontWeight: '600' },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  emoji: { fontSize: 40, marginBottom: 8 },
  cityName: { fontSize: 24, fontWeight: '700', color: theme.colors.textPrimary, textAlign: 'center' },
  viewMapButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: theme.colors.gold,
  },
  viewMapButtonDisabled: { opacity: 0.4 },
  viewMapButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
});
