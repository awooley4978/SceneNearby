import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { theme } from '../../theme';
import { movieGroups } from '../../data/sampleData';
import { categoryColors } from '../../models';
import { StarRating } from '../../components/StarRating';
import { MoviePoster } from '../../components/MoviePoster';
import type { MovieGroup } from '../../models';

export const FilmographyScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return movieGroups;
    const q = search.toLowerCase();
    return movieGroups.filter((g) => g.title.toLowerCase().includes(q));
  }, [search]);

  const renderMovie = ({ item }: { item: MovieGroup }) => {
    const catColor = categoryColors[item.category];
    return (
      <TouchableOpacity
        style={styles.movieCard}
        onPress={() =>
          navigation.navigate('MovieDetail', { movieTitle: item.title })
        }
        activeOpacity={0.7}
      >
        <MoviePoster title={item.title} isMovie={item.isMovie} size="mini" category={item.category} />
        <View style={styles.movieInfo}>
          <Text style={styles.movieTitle}>{item.title}</Text>
          <View style={styles.metaRow}>
            <View style={[styles.catDot, { backgroundColor: catColor }]} />
            <Text style={styles.metaText}>{item.category}</Text>
            <Text style={styles.metaSep}>•</Text>
            <Text style={styles.metaText}>{item.year}</Text>
            <Text style={styles.metaSep}>•</Text>
            <Text style={styles.metaText}>{item.locationCount} location{item.locationCount !== 1 ? 's' : ''}</Text>
          </View>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search movies & shows..."
          placeholderTextColor={theme.colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.title}
        renderItem={renderMovie}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No movies found</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: theme.colors.surface3,
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, color: theme.colors.textPrimary, fontSize: 14 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  movieCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  movieInfo: { flex: 1 },
  movieTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  metaText: { fontSize: 12, color: theme.colors.textSecondary },
  metaSep: { fontSize: 12, color: theme.colors.textTertiary },
  chevron: { fontSize: 22, color: theme.colors.textTertiary, fontWeight: '300' },
  empty: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { fontSize: 15, color: theme.colors.textTertiary },
});
