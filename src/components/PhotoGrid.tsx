import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { theme } from '../theme';

const { width } = Dimensions.get('window');
const GRID_SPACING = 4;
const PHOTO_SIZE = (width - 32 - GRID_SPACING * 2) / 3;

export interface PhotoItem {
  id: string;
  color: string;
  username: string;
  caption: string;
}

interface PhotoGridProps {
  photos: PhotoItem[];
  onAddPhoto?: () => void;
}

export const PhotoGrid: React.FC<PhotoGridProps> = ({ photos, onAddPhoto }) => {
  const renderPhoto = ({ item }: { item: PhotoItem }) => (
    <View style={[styles.photo, { backgroundColor: item.color + '60' }]}>
      <Text style={styles.photoEmoji}>📸</Text>
      <View style={styles.photoInfo}>
        <Text style={styles.photoUser} numberOfLines={1}>{item.username}</Text>
        <Text style={styles.photoCaption} numberOfLines={2}>{item.caption}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📸 Community Photos</Text>
        {onAddPhoto && (
          <TouchableOpacity style={styles.addButton} onPress={onAddPhoto}>
            <Text style={styles.addButtonText}>+ Add Photo</Text>
          </TouchableOpacity>
        )}
      </View>
      {photos.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No photos yet. Be the first to share!</Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(item) => item.id}
          renderItem={renderPhoto}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  addButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: theme.colors.gold + '20',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.gold + '30',
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.gold,
  },
  list: {
    gap: 8,
  },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 12,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  photoEmoji: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 4,
  },
  photoInfo: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 6,
  },
  photoUser: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.white,
  },
  photoCaption: {
    fontSize: 9,
    color: theme.colors.textSecondary,
  },
  emptyState: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textTertiary,
  },
});
