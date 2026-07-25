import React, { useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../../theme';
import { movieGroupByTitle, locationsByMovie, mockRatings } from '../../data/sampleData';
import { categoryColors } from '../../models';
import { LocationCard } from '../../components/LocationCard';
import { StarRating } from '../../components/StarRating';
import { MoviePoster } from '../../components/MoviePoster';

export const MovieDetailScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { movieTitle } = route.params;
  const movieGroup = movieGroupByTitle(movieTitle);
  const locations = locationsByMovie(movieTitle);

  if (!movieGroup || locations.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Film/TV not found</Text>
      </View>
    );
  }

  const catColor = categoryColors[movieGroup.category];
  const avgRating =
    locations.reduce((sum, loc) => {
      const r = mockRatings[loc.id];
      return sum + (r?.average || 0);
    }, 0) / locations.length;

  return (
    <View style={styles.container}>
      {/* Hero header */}
      <View style={[styles.hero, { backgroundColor: catColor + '25' }]}>
        {/* Poster */}
        <MoviePoster title={movieGroup.title} isMovie={movieGroup.isMovie} size="hero" category={movieGroup.category} />

        <View style={styles.heroInfo}>
          <Text style={styles.movieTitle}>{movieGroup.title}</Text>
          <View style={styles.metaRow}>
            <View style={[styles.categoryBadge, { backgroundColor: catColor + '30' }]}>
              <Text style={[styles.categoryText, { color: catColor }]}>{movieGroup.category}</Text>
            </View>
            <Text style={styles.yearText}>{movieGroup.year}</Text>
            <Text style={styles.typeText}>{movieGroup.isMovie ? 'Movie' : 'TV Series'}</Text>
          </View>
          <StarRating rating={avgRating} size={14} showCount={false} />
          <Text style={styles.locationCount}>
            🎥 {movieGroup.locationCount} filming location{movieGroup.locationCount !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* See all films link (Filmography) */}
      <TouchableOpacity
        style={styles.filmographyLink}
        onPress={() => navigation.navigate('Filmography')}
      >
        <Text style={styles.filmographyText}>📋 View Filmography</Text>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      {/* Locations list */}
      <Text style={styles.sectionTitle}>📍 Filming Locations</Text>
      <FlatList
        data={locations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <LocationCard
            location={item}
            onPress={() => navigation.navigate('LocationDetail', { locationId: item.id })}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  hero: {
    flexDirection: 'row',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    gap: 16,
  },
  heroInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
  movieTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  yearText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  typeText: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: theme.colors.surface2,
    borderRadius: 4,
  },
  locationCount: {
    fontSize: 13,
    color: theme.colors.gold,
    fontWeight: '500',
    marginTop: 2,
  },
  filmographyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    padding: 14,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
  },
  filmographyText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.gold,
  },
  chevron: {
    fontSize: 22,
    color: theme.colors.gold,
    fontWeight: '300',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
});
