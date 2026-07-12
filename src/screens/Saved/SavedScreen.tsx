import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { theme } from '../../theme';
import { allLocations, mockRatings } from '../../data/sampleData';
import { LocationCard } from '../../components/LocationCard';
import { EmptyState } from '../../components/EmptyState';
import { getSavedIds, setSavedIds as persistSavedIds } from '../../services/StorageService';

type SortMode = 'recent' | 'nearest' | 'az' | 'rating';

export const SavedScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortMode>('recent');

  useEffect(() => {
    (async () => {
      const ids = await getSavedIds();
      setSavedIds(ids);
      setLoaded(true);
    })();
  }, []);

  const updateSavedIds = async (newIds: Set<string>) => {
    setSavedIds(newIds);
    await persistSavedIds(newIds);
  };

  const savedLocations = useMemo(() => {
    let result = allLocations.filter((loc) => savedIds.has(loc.id));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (loc) => loc.title.toLowerCase().includes(q) || loc.movieOrShow.toLowerCase().includes(q),
      );
    }

    switch (sortBy) {
      case 'az':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'nearest':
        result.sort((a, b) => (a.distanceFromUser || 0) - (b.distanceFromUser || 0));
        break;
      case 'rating':
        result.sort((a, b) => {
          const ra = mockRatings[a.id]?.average || 0;
          const rb = mockRatings[b.id]?.average || 0;
          return rb - ra;
        });
        break;
      default:
        break;
    }

    return result;
  }, [savedIds, searchQuery, sortBy]);

  const handleRemove = (id: string, title: string) => {
    Alert.alert('Remove', `Remove "${title}" from saved?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          const next = new Set(savedIds);
          next.delete(id);
          await updateSavedIds(next);
        }
      },
    ]);
  };

  const sortOptions: { key: SortMode; label: string }[] = [
    { key: 'recent', label: 'Recent' },
    { key: 'nearest', label: 'Nearest' },
    { key: 'az', label: 'A–Z' },
    { key: 'rating', label: '⭐ Rating' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Saved</Text>
        {loaded && savedLocations.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{savedLocations.length}</Text>
          </View>
        )}
      </View>
      <View style={styles.toolbar}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search saved..."
            placeholderTextColor={theme.colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <View style={styles.sortRow}>
          {sortOptions.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.sortChip, sortBy === opt.key && styles.sortChipActive]}
              onPress={() => setSortBy(opt.key)}
            >
              <Text style={[styles.sortChipText, sortBy === opt.key && styles.sortChipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {!loaded ? null : savedLocations.length === 0 ? (
        <EmptyState
          emoji="💾"
          title="No saved locations"
          subtitle="Start exploring and save the filming locations you love to revisit them here."
          actionLabel="Discover Locations"
          onAction={() => navigation.navigate('Discover')}
        />
      ) : (
        <FlatList
          data={savedLocations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity onLongPress={() => handleRemove(item.id, item.title)} delayLongPress={300}>
              <LocationCard
                location={item}
                onPress={() => navigation.navigate('LocationDetail', { locationId: item.id })}
                onMoviePress={() => navigation.navigate('MovieDetail', { movieTitle: item.movieOrShow })}
              />
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: theme.colors.textPrimary, letterSpacing: -0.5 },
  countBadge: { marginLeft: 10, backgroundColor: theme.colors.gold, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  countText: { fontSize: 13, fontWeight: '700', color: theme.colors.black },
  toolbar: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 12,
    paddingHorizontal: 14, height: 44, borderWidth: 1, borderColor: theme.colors.surface3,
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, color: theme.colors.textPrimary, fontSize: 14 },
  sortRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  sortChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: theme.colors.surface2, borderWidth: 1, borderColor: theme.colors.surface3 },
  sortChipActive: { borderColor: theme.colors.gold, backgroundColor: theme.colors.gold + '15' },
  sortChipText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  sortChipTextActive: { color: theme.colors.gold },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
});
