import React, { useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.emoji}>📍</Text>
        <Text style={styles.cityName}>{city}</Text>
        <Text style={styles.subtitle}>
          {cityLocations.length} filming location{cityLocations.length !== 1 ? 's' : ''}
        </Text>
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
  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 6,
    fontWeight: '600',
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
});
