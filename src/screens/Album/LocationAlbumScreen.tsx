import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { BackButton } from '../../components/BackButton';
import { theme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { EmptyState } from '../../components/EmptyState';
import { getLocationPhotos, UserPhoto } from '../../services/albumService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SPACING = 3;
const NUM_COLUMNS = 3;
const PHOTO_SIZE = (SCREEN_WIDTH - 32 - SPACING * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

export const LocationAlbumScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { locationId, locationName, city } = route.params;
  const { user } = useAuth();
  const [photos, setPhotos] = useState<UserPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  // Set header title
  useEffect(() => {
    navigation.setOptions({ title: locationName });
  }, [navigation, locationName]);

  const loadPhotos = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const result = await getLocationPhotos(user.uid, locationId);
      setPhotos(result);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [user, locationId]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const renderPhoto = ({ item, index }: { item: UserPhoto; index: number }) => (
    <TouchableOpacity
      style={styles.photoTile}
      activeOpacity={0.85}
      onPress={() => setViewerIndex(index)}
    >
      <Image
        source={{ uri: item.imageUrl }}
        style={styles.photoImage}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );

  const currentPhoto = viewerIndex !== null ? photos[viewerIndex] : null;

  // Content varies by auth / loading / empty state, but the dark
  // container + back bar always render so users can always get out.
  let content: React.ReactNode;
  if (!user) {
    content = (
      <EmptyState
        emoji="🔒"
        title="Sign in to view photos"
        subtitle="Your photos will appear here once you're signed in."
      />
    );
  } else if (loading) {
    content = (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.gold} />
      </View>
    );
  } else if (photos.length === 0) {
    content = (
      <EmptyState
        emoji="📸"
        title="No photos yet"
        subtitle={`You haven't added any photos at ${locationName}.`}
      />
    );
  } else {
    content = (
      <>
        {/* Header info */}
        <View style={styles.header}>
          <Text style={styles.city}>{city}</Text>
          <Text style={styles.count}>
            {photos.length} photo{photos.length !== 1 ? 's' : ''}
          </Text>
        </View>
        {/* Photo grid */}
        <FlatList
          data={photos}
          keyExtractor={(item) => item.id}
          renderItem={renderPhoto}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={{ gap: SPACING }}
          ItemSeparatorComponent={() => <View style={{ height: SPACING }} />}
        />
      </>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <BackButton />
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.navigate('Profile')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
      {content}

      {/* Full-screen viewer modal */}
      <Modal
        visible={viewerIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerIndex(null)}
      >
        <View style={styles.viewerOverlay}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.viewerCloseButton}
            onPress={() => setViewerIndex(null)}
            activeOpacity={0.7}
          >
            <Text style={styles.viewerCloseButtonText}>✕</Text>
          </TouchableOpacity>

          {/* Position badge */}
          {viewerIndex !== null && (
            <View style={styles.positionBadge}>
              <Text style={styles.positionText}>
                {viewerIndex + 1} of {photos.length}
              </Text>
            </View>
          )}

          {/* Swipeable FlatList */}
          <FlatList
            data={photos}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={viewerIndex ?? 0}
            getItemLayout={(_, idx) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * idx,
              index: idx,
            })}
            onMomentumScrollEnd={(e) => {
              const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setViewerIndex(newIndex);
            }}
            renderItem={({ item }) => (
              <View style={styles.viewerItem}>
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.viewerImage}
                  resizeMode="contain"
                />
                {item.caption ? (
                  <View style={styles.captionBar}>
                    <Text style={styles.captionText}>{item.caption}</Text>
                  </View>
                ) : null}
              </View>
            )}
          />
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 12,
    paddingRight: 16,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surface2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  city: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  count: {
    fontSize: 13,
    color: theme.colors.gold,
    fontWeight: '600',
  },
  grid: {
    padding: 16,
  },
  photoTile: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface2,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  // Viewer
  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.97)',
    justifyContent: 'center',
  },
  viewerCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 24,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerCloseButtonText: {
    fontSize: 18,
    color: theme.colors.white,
    fontWeight: '600',
  },
  positionBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 24,
    alignSelf: 'center',
    zIndex: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 14,
  },
  positionText: {
    fontSize: 13,
    color: theme.colors.white,
    fontWeight: '500',
  },
  viewerItem: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerImage: {
    width: SCREEN_WIDTH - 20,
    height: SCREEN_HEIGHT - 200,
  },
  captionBar: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
  },
  captionText: {
    fontSize: 14,
    color: theme.colors.white,
    fontWeight: '500',
  },
});
