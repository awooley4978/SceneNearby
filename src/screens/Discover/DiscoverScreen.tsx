import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Animated,
} from 'react-native';
import { theme } from '../../theme';
import { LocationCategory, categoryColors } from '../../models';
import {
  allLocations,
  locationsByCategory,
  mockRatings,
  actorGroups,
  allLocationsWithActors,
  calculateDistance,
} from '../../data/sampleData';
import { LocationCard } from '../../components/LocationCard';
import { CardSkeleton } from '../../components/SkeletonLoader';
import { EmptyState } from '../../components/EmptyState';
import { useUserLocation } from '../../hooks/useUserLocation';
import { logSearchPerformed, logMovieTapped, logActorTapped } from '../../services/analytics';
import type { FilmingLocation, ActorGroup } from '../../models';

const categories = [
  { key: 'all', label: 'All' },
  { key: LocationCategory.drama, label: 'Drama' },
  { key: LocationCategory.comedy, label: 'Comedy' },
  { key: LocationCategory.sciFi, label: 'Sci-Fi' },
  { key: LocationCategory.action, label: 'Action' },
  { key: LocationCategory.romance, label: 'Romance' },
];

const typeFilters = [
  { key: 'all', label: 'All' },
  { key: 'movies', label: '🎬 Movies' },
  { key: 'shows', label: '📺 TV Shows' },
];

type SortMode = 'default' | 'rating' | 'nearest';
type SearchMode = 'all' | 'actor';

interface SearchResultItem {
  type: 'location' | 'movie' | 'show' | 'actor';
  id: string;
  label: string;
  subtitle: string;
  data: any;
}

export const DiscoverScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const prevQuery = useRef('');

  // Search results with grouping — computed on every render for reliability
  const q = searchQuery.trim().toLowerCase();
  const searchResults = ((): SearchResultItem[] => {
    if (!q) return [];

    const results: SearchResultItem[] = [];
    const addedMovies = new Set<string>();
    const addedActors = new Set<string>();

    // Search locations
    const matchedLocs = allLocationsWithActors.filter(
      (loc) =>
        loc.title.toLowerCase().includes(q) ||
        loc.movieOrShow.toLowerCase().includes(q) ||
        loc.city.toLowerCase().includes(q) ||
        loc.actors?.some((a) => a.toLowerCase().includes(q)),
    );

    // Extract movie/show matches
    const movieMap = new Map<string, FilmingLocation[]>();
    for (const loc of matchedLocs) {
      const key = `${loc.movieOrShow}||${loc.year}`;
      if (!movieMap.has(key)) movieMap.set(key, []);
      movieMap.get(key)!.push(loc);
    }

    for (const [, locs] of movieMap) {
      const first = locs[0];
      const key = `${first.movieOrShow}||${first.year}`;
      if (!addedMovies.has(key)) {
        addedMovies.add(key);
        results.push({
          type: first.isMovie ? 'movie' : 'show',
          id: `movie-${key}`,
          label: first.movieOrShow,
          subtitle: `${first.year} • ${locs.length} location${locs.length !== 1 ? 's' : ''}`,
          data: { movieTitle: first.movieOrShow },
        });
      }
    }

    // Extract actor matches
    const matchedActors = actorGroups.filter((a) =>
      a.name.toLowerCase().includes(q),
    );
    for (const actor of matchedActors) {
      if (!addedActors.has(actor.name)) {
        addedActors.add(actor.name);
        results.push({
          type: 'actor',
          id: `actor-${actor.name}`,
          label: actor.name,
          subtitle: `🎭 Appears in ${actor.showTitles.length} film${actor.showTitles.length !== 1 ? 's/TV' : ''}`,
          data: { actorName: actor.name },
        });
      }
    }

    return results;
  })();

  useEffect(() => {
    if (searchQuery.trim() && searchQuery !== prevQuery.current) {
      logSearchPerformed({ query: searchQuery, resultCount: searchResults.length });
      prevQuery.current = searchQuery;
    }
  }, [searchQuery, searchResults.length]);
  const [isLoading, setIsLoading] = useState(true);
  const userLocation = useUserLocation();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Simulate initial load for skeleton demonstration
    const timer = setTimeout(() => {
      setIsLoading(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, 800);
    return () => clearTimeout(timer);
  }, []);
  const [sortMode, setSortMode] = useState<SortMode>('default');

  // Constants
  const RADIUS_STAGES = [3, 5, 10, 25, 50];
  const ARRIVAL_THRESHOLD_MILES = 0.1;

  // Progressive radius: smallest stage with >=1 result, defaults to max (50) if 0
  const activeRadius = useMemo(() => {
    if (userLocation.latitude === null || userLocation.longitude === null) return null;
    // Don't expand during active search -- use max radius
    if (searchQuery.trim()) return RADIUS_STAGES[RADIUS_STAGES.length - 1];

    let base = selectedCategory === 'all'
      ? allLocations
      : locationsByCategory(selectedCategory as LocationCategory);
    if (selectedType === 'movies') base = base.filter((l) => l.isMovie);
    else if (selectedType === 'shows') base = base.filter((l) => !l.isMovie);

    const withDist = base.map((loc) => ({
      ...loc,
      distanceFromUser: calculateDistance(userLocation.latitude!, userLocation.longitude!, loc.latitude, loc.longitude) / 1609.34,
    }));

    for (const stage of RADIUS_STAGES) {
      if (withDist.some((loc) => loc.distanceFromUser! <= stage)) return stage;
    }
    return RADIUS_STAGES[RADIUS_STAGES.length - 1]; // fallback: max radius
  }, [userLocation.latitude, userLocation.longitude, searchQuery, selectedCategory, selectedType]);

  // Filtered locations (for the main feed)
  const filteredLocations = (() => {
    // If searching with actor results, still show filtered feed below
    let result = selectedCategory === 'all'
      ? allLocations
      : locationsByCategory(selectedCategory as LocationCategory);

    // Apply type filter
    if (selectedType === 'movies') {
      result = result.filter((l) => l.isMovie);
    } else if (selectedType === 'shows') {
      result = result.filter((l) => !l.isMovie);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (loc) =>
          loc.title.toLowerCase().includes(q) ||
          loc.movieOrShow.toLowerCase().includes(q) ||
          loc.city.toLowerCase().includes(q),
      );
    }

    // Calculate distance from user for every location
    if (userLocation.latitude !== null && userLocation.longitude !== null) {
      result = result.map((loc) => ({
        ...loc,
        distanceFromUser: calculateDistance(userLocation.latitude!, userLocation.longitude!, loc.latitude, loc.longitude) / 1609.34, // meters to miles
      }));
      // Filter to within radius — skip when searching so all matching results show
      if (!searchQuery.trim()) {
        const radius = activeRadius ?? RADIUS_STAGES[RADIUS_STAGES.length - 1];
        result = result.filter((loc) => loc.distanceFromUser! <= radius);
      }
    }

    // Sort by nearest (always, since we have distance data)
    if (userLocation.latitude !== null && userLocation.longitude !== null) {
      result = [...result].sort((a, b) => (a.distanceFromUser || 0) - (b.distanceFromUser || 0));
    } else if (sortMode === 'rating') {
      result = [...result].sort((a, b) => {
        const ra = mockRatings[a.id]?.average || 0;
        const rb = mockRatings[b.id]?.average || 0;
        return rb - ra;
      });
    }

    return result;
  })();

  const nearYou = useMemo(() => {
    if (userLocation.latitude === null || userLocation.longitude === null) return [];
    const withDist = allLocations.map((loc) => ({
      ...loc,
      distanceFromUser: calculateDistance(userLocation.latitude!, userLocation.longitude!, loc.latitude, loc.longitude) / 1609.34,
    })).filter((loc) => loc.distanceFromUser! <= (activeRadius ?? RADIUS_STAGES[RADIUS_STAGES.length - 1]));
    return withDist.sort((a, b) => (a.distanceFromUser || 0) - (b.distanceFromUser || 0)).slice(0, 5);
  }, [userLocation.latitude, userLocation.longitude, activeRadius]);

  const moreToDiscover = useMemo(() => {
    if (userLocation.latitude === null || userLocation.longitude === null) return [];
    if (activeRadius === null) return [];
    const activeRadiusVal = activeRadius;

    const withDist = allLocations.map((loc) => ({
      ...loc,
      distanceFromUser: calculateDistance(userLocation.latitude!, userLocation.longitude!, loc.latitude, loc.longitude) / 1609.34,
    }));

    let outer = withDist.filter((loc) => loc.distanceFromUser! > activeRadiusVal);

    let outerCap = 50;
    const within50 = outer.filter((loc) => loc.distanceFromUser! <= 50);
    if (within50.length < 20) outerCap = 100;

    outer = outer.filter((loc) => loc.distanceFromUser! <= outerCap);

    const movieMap = new Map<string, typeof outer[0]>();
    for (const loc of outer) {
      const key = loc.movieOrShow;
      if (!movieMap.has(key) || movieMap.get(key)!.distanceFromUser! > loc.distanceFromUser!) {
        movieMap.set(key, loc);
      }
    }

    return Array.from(movieMap.values())
      .sort((a, b) => (a.distanceFromUser || 0) - (b.distanceFromUser || 0))
      .slice(0, 20);
  }, [userLocation.latitude, userLocation.longitude, activeRadius]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleSearchResultPress = (item: SearchResultItem) => {
    if (item.type === 'actor') logActorTapped({ actorName: item.data.actorName });
    else if (item.type === 'movie' || item.type === 'show') logMovieTapped({ movieTitle: item.data.movieTitle, source: 'search' });
    if (item.type === 'actor') {
      navigation.navigate('ActorDetail', { actorName: item.data.actorName });
    } else if (item.type === 'movie' || item.type === 'show') {
      navigation.navigate('MovieDetail', { movieTitle: item.data.movieTitle });
    }
  };

  const renderSearchResult = ({ item }: { item: SearchResultItem }) => {
    const emoji = item.type === 'movie' ? '🎬' : item.type === 'show' ? '📺' : '🎭';
    return (
      <TouchableOpacity
        style={styles.searchResultRow}
        onPress={() => handleSearchResultPress(item)}
      >
        <Text style={styles.searchResultEmoji}>{emoji}</Text>
        <View style={styles.searchResultInfo}>
          <Text style={styles.searchResultLabel}>{item.label}</Text>
          <Text style={styles.searchResultSub}>{item.subtitle}</Text>
        </View>
        <Text style={styles.searchResultChevron}>›</Text>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View>

      {/* Type filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsContainer}
        contentContainerStyle={styles.chipsContent}
      >
        {typeFilters.map((tf) => {
          const isActive = selectedType === tf.key;
          return (
            <TouchableOpacity
              key={tf.key}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => setSelectedType(tf.key)}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {tf.label}
              </Text>
            </TouchableOpacity>
          );
        })}
        <View style={styles.chipDivider} />
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.key;
          const chipColor = cat.key === 'all' ? theme.colors.gold : categoryColors[cat.key as LocationCategory];
          return (
            <TouchableOpacity
              key={cat.key}
              style={[styles.chip, isActive && { backgroundColor: chipColor + '26', borderColor: chipColor }]}
              onPress={() => setSelectedCategory(cat.key)}
            >
              <Text style={[styles.chipText, isActive && { color: chipColor }]}>{cat.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Filmography link */}
      <TouchableOpacity
        style={styles.filmographyLink}
        onPress={() => navigation.navigate('Filmography')}
      >
        <Text style={styles.filmographyText}>🎬 Browse Filmography — All Movies & Shows</Text>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      {/* Sort options */}
      {searchQuery || selectedCategory !== 'all' || selectedType !== 'all' ? (
        <View style={styles.sortRow}>
          {(['default', 'rating', 'nearest'] as SortMode[]).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.sortChip, sortMode === mode && styles.sortChipActive]}
              onPress={() => setSortMode(mode)}
            >
              <Text style={[styles.sortChipText, sortMode === mode && styles.sortChipTextActive]}>
                {mode === 'default' ? 'Default' : mode === 'rating' ? '⭐ Rating' : '📍 Nearest'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {/* Near You */}
      {!searchQuery && selectedCategory === 'all' && selectedType === 'all' && sortMode === 'default' && (
        <View style={styles.nearYouSection}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionTitleLeft}>
              <Text style={styles.sectionTitle}>📍 Near You</Text>
              {activeRadius && (
                <View style={styles.radiusPill}>
                  <Text style={styles.radiusPillText}>Within {activeRadius} mi</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.viewMapButton}
              onPress={() => navigation.navigate('Nearby')}
            >
              <Text style={styles.viewMapButtonText}>View on Map</Text>
              <Text style={styles.viewMapChevron}>›</Text>
            </TouchableOpacity>
          </View>
          {nearYou.map((loc) => (
            <LocationCard
              key={loc.id}
              location={loc}
              onPress={() => navigation.navigate('LocationDetail', { locationId: loc.id })}
              onMoviePress={() => navigation.navigate('MovieDetail', { movieTitle: loc.movieOrShow })}
            />
          ))}
        </View>
      )}

      {/* More to Discover */}
      {!searchQuery && selectedCategory === 'all' && selectedType === 'all' && sortMode === 'default' && moreToDiscover.length > 0 && (
        <View style={styles.moreSection}>
          <Text style={styles.moreTitle}>🌍 More to Discover</Text>
          {moreToDiscover.map((loc, idx) => (
            <TouchableOpacity
              key={loc.id}
              style={[styles.moreRow, idx === moreToDiscover.length - 1 && styles.moreRowLast]}
              onPress={() => navigation.navigate('LocationDetail', { locationId: loc.id })}
              activeOpacity={0.7}
            >
              <Text style={styles.moreMovie} numberOfLines={1}>
                🎬 {loc.movieOrShow}
              </Text>
              <Text style={styles.moreDistance}>
                {loc.distanceFromUser! <= 50
                  ? `${Math.round(loc.distanceFromUser!)} mi`
                  : `${Math.round(loc.distanceFromUser!)} mi away`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Results count */}
      <View style={styles.resultsHeader}>
        <View style={styles.sectionTitleLeft}>
          <Text style={styles.sectionTitle}>
            {searchQuery || selectedCategory !== 'all' || selectedType !== 'all'
              ? `${filteredLocations.length} Results`
              : 'All Locations'}
          </Text>
          {!searchQuery && activeRadius && (
            <View style={styles.radiusPill}>
              <Text style={styles.radiusPillText}>Within {activeRadius} mi</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {isLoading ? (
        <Animated.View style={styles.listContent}>
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </Animated.View>
      ) : (
      <>
      {/* Search bar — outside FlatList so it never remounts on keystroke */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search movies, shows, actors..."
          placeholderTextColor={theme.colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={styles.clearButton}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      {/* Search results dropdown */}
      {searchQuery.trim().length > 0 && searchResults.length > 0 && (
        <View style={styles.searchResults}>
          <FlatList
            data={searchResults.slice(0, 10)}
            keyExtractor={(item) => item.id}
            renderItem={renderSearchResult}
            scrollEnabled={false}
            extraData={searchQuery}
          />
        </View>
      )}
      <FlatList
        data={filteredLocations}
        keyExtractor={(item) => item.id}
        extraData={searchQuery}
        renderItem={({ item }) => (
          <LocationCard
            location={item}
            onPress={() => navigation.navigate('LocationDetail', { locationId: item.id })}
            onMoviePress={() => navigation.navigate('MovieDetail', { movieTitle: item.movieOrShow })}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState
              emoji="🎬"
              title="No locations found"
              subtitle={activeRadius === 50 && !searchQuery
                ? `No filming locations within ${RADIUS_STAGES[RADIUS_STAGES.length - 1]} miles`
                : "Try adjusting your search or filters"}
            />
          )
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.gold} />
        }
        showsVerticalScrollIndicator={false}
      />
      </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface2, borderRadius: 12,
    paddingHorizontal: 14, marginTop: 12, marginBottom: 8, height: 48, borderWidth: 1, borderColor: theme.colors.gold + '40',
    shadowColor: theme.colors.gold, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, color: theme.colors.textPrimary, fontSize: 15 },
  clearButton: { fontSize: 16, color: theme.colors.textTertiary, padding: 4 },

  // Search results dropdown
  searchResults: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1, borderColor: theme.colors.gold + '20',
    overflow: 'hidden',
  },
  searchResultRow: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    borderBottomWidth: 1, borderBottomColor: theme.colors.surface3 + '40',
  },
  searchResultEmoji: { fontSize: 20, marginRight: 10 },
  searchResultInfo: { flex: 1 },
  searchResultLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  searchResultSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },
  searchResultChevron: { fontSize: 18, color: theme.colors.textTertiary, fontWeight: '300' },

  chipsContainer: { marginBottom: 12 },
  chipsContent: { gap: 6 },
  chipDivider: { width: 1, backgroundColor: theme.colors.surface3, marginHorizontal: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.gold + '30', backgroundColor: theme.colors.surface2 },
  chipActive: { borderColor: theme.colors.gold, backgroundColor: theme.colors.gold + '20' },
  chipText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  chipTextActive: { color: theme.colors.gold },

  filmographyLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, backgroundColor: theme.colors.surface, borderRadius: 12, marginBottom: 12,
    borderWidth: 1, borderColor: theme.colors.gold + '20',
  },
  filmographyText: { fontSize: 14, fontWeight: '600', color: theme.colors.gold },
  chevron: { fontSize: 22, color: theme.colors.gold, fontWeight: '300' },

  sortRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  sortChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: theme.colors.surface2, borderWidth: 1, borderColor: theme.colors.surface3 },
  sortChipActive: { borderColor: theme.colors.gold, backgroundColor: theme.colors.gold + '15' },
  sortChipText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  sortChipTextActive: { color: theme.colors.gold },

  sectionTitleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  radiusPill: {
    backgroundColor: theme.colors.gold + '18',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1, borderColor: theme.colors.gold + '30',
  },
  radiusPillText: { fontSize: 11, fontWeight: '600', color: theme.colors.gold },
  sectionTitleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12,
  },
  viewMapButton: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: theme.colors.gold + '15',
    borderRadius: 16, borderWidth: 1, borderColor: theme.colors.gold + '30',
  },
  viewMapButtonText: { fontSize: 12, fontWeight: '600', color: theme.colors.gold },
  viewMapChevron: { fontSize: 16, color: theme.colors.gold, fontWeight: '300', marginTop: -1 },
  nearYouSection: { marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 12 },
  resultsHeader: { marginTop: 4, marginBottom: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 8 },
  emptyMessage: { fontSize: 14, color: theme.colors.textSecondary },
  moreSection: {
    marginBottom: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1, borderColor: theme.colors.gold + '18',
  },
  moreTitle: {
    fontSize: 16, fontWeight: '700',
    color: theme.colors.gold,
    marginBottom: 12,
  },
  moreRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: theme.colors.surface2,
  },
  moreRowLast: { borderBottomWidth: 0 },
  moreMovie: {
    flex: 1, fontSize: 14, fontWeight: '600',
    color: theme.colors.textPrimary,
    marginRight: 12,
  },
  moreDistance: {
    fontSize: 13, fontWeight: '600',
    color: theme.colors.gold,
  },
});
