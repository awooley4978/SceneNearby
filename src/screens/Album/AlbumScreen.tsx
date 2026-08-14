import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { EmptyState } from '../../components/EmptyState';
import { getUserAlbum, LocationGroup } from '../../services/albumService';

export const AlbumScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<LocationGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAlbum = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const { groups: albumGroups } = await getUserAlbum(user.uid);
      setGroups(albumGroups);
    } catch (err) {
      // Silently fail — Firestore may not have photos collection yet
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAlbum();
  }, [loadAlbum]);

  // Focus listener — reload when navigating back
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadAlbum();
    });
    return unsubscribe;
  }, [navigation, loadAlbum]);

  const renderLocationCard = ({ item }: { item: LocationGroup }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() =>
        navigation.navigate('LocationAlbum', {
          locationId: item.locationId,
          locationName: item.locationName,
          city: item.city,
        })
      }
    >
      <View style={styles.thumbnail}>
        {item.firstPhotoUrl ? (
          <Image
            source={{ uri: item.firstPhotoUrl }}
            style={styles.thumbnailImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Text style={styles.thumbnailEmoji}>📸</Text>
          </View>
        )}
        <View style={styles.photoCountBadge}>
          <Text style={styles.photoCountText}>{item.photoCount}</Text>
        </View>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.locationName} numberOfLines={1}>
          {item.locationName}
        </Text>
        <Text style={styles.city} numberOfLines={1}>
          {item.city}
        </Text>
        <Text style={styles.photoCount}>
          {item.photoCount} photo{item.photoCount !== 1 ? 's' : ''}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  // Content varies by auth / loading / empty state, but the dark
  // container + back bar always render so users can always get out.
  let content: React.ReactNode;
  if (!user) {
    content = (
      <EmptyState
        emoji="🔒"
        title="Sign in to view your album"
        subtitle="Your photos will appear here once you're signed in."
      />
    );
  } else if (loading) {
    content = (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.gold} />
      </View>
    );
  } else if (groups.length === 0) {
    content = (
      <EmptyState
        emoji="📸"
        title="Your Album is waiting"
        subtitle="Photos you add at filming locations will appear here."
      />
    );
  } else {
    content = (
      <FlatList
        data={groups}
        keyExtractor={(item) => item.locationId}
        renderItem={renderLocationCard}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Fixed header bar — one back control, same pattern as Admin screens */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Profile'))}
          activeOpacity={0.7}
        >
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Your Album</Text>
      </View>
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  backButton: { paddingRight: 12 },
  backText: { fontSize: 16, color: theme.colors.gold, fontWeight: '600' },
  topTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
    paddingRight: 16,
  },
  thumbnail: {
    width: 80,
    height: 80,
    position: 'relative',
  },
  thumbnailImage: {
    width: 80,
    height: 80,
  },
  thumbnailPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: theme.colors.surface2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailEmoji: {
    fontSize: 28,
  },
  photoCountBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: theme.colors.gold,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  photoCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.black,
  },
  cardInfo: {
    flex: 1,
    paddingLeft: 14,
    paddingVertical: 12,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  city: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  photoCount: {
    fontSize: 12,
    color: theme.colors.gold,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 22,
    color: theme.colors.textTertiary,
    fontWeight: '300',
    marginLeft: 8,
  },
});
