import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Share } from 'react-native';
import { theme } from '../../theme';
import { photosByLocation, locationById } from '../../data/sampleData';
import { PhotoGrid } from '../../components/PhotoGrid';

export const PhotoGalleryScreen: React.FC<{ route: any }> = ({ route }) => {
  const { locationId } = route.params;
  const location = locationById(locationId);
  const photos = photosByLocation(locationId);

  return (
    <View style={styles.container}>
      {photos.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📸</Text>
          <Text style={styles.emptyTitle}>No Photos Yet</Text>
          <Text style={styles.emptyDesc}>Be the first to share a photo of this location!</Text>
        </View>
      ) : (
        <PhotoGrid
          photos={photos.map((p) => ({
            id: p.id,
            color: p.color,
            username: p.username,
            caption: p.caption,
          }))}
          onAddPhoto={() => {
            // Placeholder — in real app would open camera/image picker
          }}
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
