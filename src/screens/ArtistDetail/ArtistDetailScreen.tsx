import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { theme } from '../../theme';
import { locationsByArtistMember, artistGroups, albumGroups } from '../../data/sampleData';
import { LocationCard } from '../../components/LocationCard';
import { MusicArtwork } from '../../components/MusicArtwork';

export const ArtistDetailScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { actorName } = route.params;
  const locations = locationsByArtistMember(actorName);
  const group = artistGroups.find((g) => g.name === actorName);

  if (!group || locations.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Artist not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Artist header */}
      <View style={styles.header}>
        <Text style={styles.avatar}>🎤</Text>
        <Text style={styles.artistName}>{actorName}</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{locations.length}</Text>
            <Text style={styles.statLabel}>Location{locations.length !== 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{group.notableWorks.length}</Text>
            <Text style={styles.statLabel}>Albums/Works</Text>
          </View>
        </View>
        {/* Notable works with artwork */}
        <View style={styles.worksList}>
          {group.notableWorks.map((work) => {
            const mg = albumGroups.find((g) => g.name === work);
            return (
              <View key={work} style={styles.workChip}>
                {mg ? (
                  <MusicArtwork title={work} isAlbum={mg.isAlbum} size="mini" />
                ) : (
                  <Text style={styles.workChipEmoji}>🎵</Text>
                )}
                <Text style={styles.workChipText}>{work}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <Text style={styles.sectionTitle}>
        🎵 Locations featuring {actorName}
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
  artistName: { fontSize: 24, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 12 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  stat: { alignItems: 'center', paddingHorizontal: 20 },
  statValue: { fontSize: 20, fontWeight: '700', color: theme.colors.gold },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, height: 24, backgroundColor: theme.colors.surface3 },
  worksList: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  workChip: {
    alignItems: 'center', gap: 6,
    padding: 8, backgroundColor: theme.colors.surface2,
    borderRadius: 12, borderWidth: 1, borderColor: theme.colors.surface3,
  },
  workChipEmoji: { fontSize: 24 },
  workChipText: { fontSize: 11, color: theme.colors.gold, fontWeight: '500', textAlign: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary, marginHorizontal: 16, marginBottom: 8 },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
});
