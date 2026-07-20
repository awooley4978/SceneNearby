import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme';
import { photosByLocation, locationById } from '../../data/sampleData';
import { LocationPhotoGallery, GalleryPhoto } from '../../components/LocationPhotoGallery';

export const PhotoGalleryScreen: React.FC<{ route: any }> = ({ route }) => {
  const { locationId } = route.params;
  const location = locationById(locationId);
  const communityPhotos = location ? photosByLocation(locationId) : [];

  // Map community photos to gallery format
  const galleryPhotos: GalleryPhoto[] = communityPhotos.map((p) => ({
    id: p.id,
    imageUrl: '',
    caption: p.caption,
    submittedBy: p.username,
    submittedAt: new Date(p.timestamp).toISOString(),
    locationId: p.locationId,
  }));

  return (
    <View style={styles.container}>
      {location?.imageUrl ? (
        <LocationPhotoGallery
          photos={galleryPhotos}
          primaryImageUrl={location.imageUrl}
          showAddButton={true}
          onAddPhoto={() => {
            // Placeholder — in real app would open camera/image picker
          }}
        />
      ) : galleryPhotos.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📸</Text>
          <Text style={styles.emptyTitle}>No Photos Yet</Text>
          <Text style={styles.emptyDesc}>Be the first to share a photo of this location!</Text>
        </View>
      ) : (
        <LocationPhotoGallery
          photos={galleryPhotos}
          showAddButton={true}
          onAddPhoto={() => {}}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center' },
});
