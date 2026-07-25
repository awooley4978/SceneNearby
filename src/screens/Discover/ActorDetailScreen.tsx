import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { theme } from '../../theme';
import { locationsByActor, actorGroups, movieGroups } from '../../data/sampleData';
import { LocationCard } from '../../components/LocationCard';
import { MoviePoster } from '../../components/MoviePoster';

export const ActorDetailScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { actorName } = route.params;
  const locations = locationsByActor(actorName);
  const group = actorGroups.find((g) => g.name === actorName);

  if (!group || locations.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Actor not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Actor header */}
      <View style={styles.header}>
        <Text style={styles.avatar}>🎭</Text>
        <Text style={styles.actorName}>{actorName}</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{locations.length}</Text>
            <Text style={styles.statLabel}>Location{locations.length !== 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{group.showTitles.length}</Text>
            <Text style={styles.statLabel}>Film{group.showTitles.length !== 1 ? 's/TV' : ''}</Text>
          </View>
        </View>
        {/* Film/TV list with posters */}
        <View style={styles.showsList}>
          {group.showTitles.map((title) => {
            const mg = movieGroups.find((g) => g.title === title);
            return (
              <View key={title} style={styles.showChip}>
                {mg ? (
                  <MoviePoster title={title} isMovie={mg.isMovie} size="mini" />
                ) : (
                  <Text style={styles.showChipEmoji}>🎬</Text>
                )}
                <Text style={styles.showChipText}>{title}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <Text style={styles.sectionTitle}>
        🎬 Locations featuring {actorName}
      </Text>
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
  container: { flex: 1, backgroundColor: theme.colors.background },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  errorText: { fontSize: 16, color: theme.colors.textSecondary },
  header: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16 },
  avatar: { fontSize: 48, marginBottom: 8 },
  actorName: { fontSize: 24, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 12 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  stat: { alignItems: 'center', paddingHorizontal: 20 },
  statValue: { fontSize: 20, fontWeight: '700', color: theme.colors.gold },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, height: 24, backgroundColor: theme.colors.surface3 },
  showsList: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  showChip: {
    alignItems: 'center', gap: 6,
    padding: 8, backgroundColor: theme.colors.surface2,
    borderRadius: 12, borderWidth: 1, borderColor: theme.colors.surface3,
  },
  showChipEmoji: { fontSize: 24 },
  showChipText: { fontSize: 11, color: theme.colors.gold, fontWeight: '500', textAlign: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary, marginHorizontal: 16, marginBottom: 8 },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
});
