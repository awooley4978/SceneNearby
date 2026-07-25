// ── LocationPhotoGallery ──
// Reusable photo gallery component for all Nearby apps.
// Single hero image → 1 photo. Swipeable carousel → 2+ photos.
// Tapping opens FullScreenGallery with pinch-to-zoom, swipe-to-dismiss.
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  Modal,
  Platform,
} from 'react-native';
import { theme } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DOT_SIZE = 8;
const DOT_GAP = 6;

// ── Types ──
export interface GalleryPhoto {
  id: string;
  imageUrl: string;
  caption?: string;
  credit?: string;
  submittedAt?: string;
  submittedBy?: string;
  likes?: number;
  locationId?: string;
}

interface LocationPhotoGalleryProps {
  photos: GalleryPhoto[];
  primaryImageUrl?: string;
  onAddPhoto?: () => void;
  showAddButton?: boolean;
  style?: any;
}

// ── Pagination Dots ──
const PaginationDots: React.FC<{ count: number; activeIndex: number }> = ({ count, activeIndex }) => {
  if (count <= 1) return null;
  return (
    <View style={styles.dotsContainer}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor: i === activeIndex ? theme.colors.gold : 'rgba(255,255,255,0.4)',
              width: i === activeIndex ? DOT_SIZE * 1.5 : DOT_SIZE,
            },
          ]}
        />
      ))}
    </View>
  );
};

// ── FullScreenGallery (Modal) ──
interface FullScreenGalleryProps {
  visible: boolean;
  photos: GalleryPhoto[];
  initialIndex: number;
  primaryImageUrl?: string;
  onClose: () => void;
}

const FullScreenGallery: React.FC<FullScreenGalleryProps> = ({
  visible,
  photos,
  initialIndex,
  primaryImageUrl,
  onClose,
}) => {
  const allPhotos: GalleryPhoto[] = React.useMemo(() => {
    const list = [...photos];
    if (primaryImageUrl && !list.find((p) => p.imageUrl === primaryImageUrl)) {
      list.unshift({ id: 'primary', imageUrl: primaryImageUrl, caption: 'Featured photo' });
    }
    return list.length > 0 ? list : [{ id: 'placeholder', imageUrl: '', caption: 'No photo' }];
  }, [photos, primaryImageUrl]);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index ?? 0);
    }
  }, []);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const handleClose = () => {
    onClose();
  };

  const renderGalleryItem = ({ item }: { item: GalleryPhoto }) => (
    <View style={styles.galleryItemContainer}>
      {item.imageUrl ? (
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.galleryImage}
          resizeMode="contain"
        />
      ) : (
        <View style={styles.galleryPlaceholder}>
          <Text style={styles.galleryPlaceholderIcon}>📸</Text>
        </View>
      )}
      {/* Future metadata footer: room for credit, date, likes */}
      <View style={styles.metadataFooter}>
        {item.caption ? (
          <Text style={styles.metadataCaption} numberOfLines={2}>{item.caption}</Text>
        ) : null}
        <View style={styles.metadataRow}>
          {item.submittedBy ? (
            <Text style={styles.metadataText}>by {item.submittedBy}</Text>
          ) : null}
          {item.submittedAt ? (
            <Text style={styles.metadataText}>
              {new Date(item.submittedAt).toLocaleDateString()}
            </Text>
          ) : null}
          {item.likes !== undefined ? (
            <Text style={styles.metadataText}>❤️ {item.likes}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.galleryOverlay}>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose} activeOpacity={0.7}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.positionBadge}>
          <Text style={styles.positionText}>
            {currentIndex + 1} of {allPhotos.length}
          </Text>
        </View>
        <FlatList
          ref={flatListRef}
          data={allPhotos}
          keyExtractor={(item) => item.id}
          renderItem={renderGalleryItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          style={styles.galleryList}
        />
      </View>
    </Modal>
  );
};

// ── Main LocationPhotoGallery Component ──
export const LocationPhotoGallery: React.FC<LocationPhotoGalleryProps> = ({
  photos,
  primaryImageUrl,
  onAddPhoto,
  showAddButton = true,
  style,
}) => {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const displayPhotos: GalleryPhoto[] = React.useMemo(() => {
    const list = [...photos];
    if (primaryImageUrl && !list.find((p) => p.imageUrl === primaryImageUrl)) {
      list.unshift({ id: 'primary', imageUrl: primaryImageUrl, caption: 'Featured photo' });
    }
    return list;
  }, [photos, primaryImageUrl]);

  const handlePhotoPress = (index: number) => {
    setSelectedIndex(index);
    setGalleryOpen(true);
  };

  const handleCloseGallery = () => {
    setGalleryOpen(false);
  };

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCarouselIndex(viewableItems[0].index ?? 0);
    }
  }, []);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  // Single photo: hero mode
  if (displayPhotos.length === 1) {
    const photo = displayPhotos[0];
    return (
      <View style={[styles.container, style]}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => handlePhotoPress(0)}
          style={styles.heroContainer}
        >
          {photo.imageUrl ? (
            <Image
              source={{ uri: photo.imageUrl }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Text style={styles.heroPlaceholderIcon}>📸</Text>
              <Text style={styles.heroPlaceholderText}>Tap to view</Text>
            </View>
          )}
          <View style={styles.heroOverlay}>
            <Text style={styles.heroTapHint}>Tap to view</Text>
          </View>
        </TouchableOpacity>
        {showAddButton && onAddPhoto && (
          <TouchableOpacity style={styles.addButton} onPress={onAddPhoto}>
            <Text style={styles.addButtonText}>+ Add Photo</Text>
          </TouchableOpacity>
        )}
        <FullScreenGallery
          visible={galleryOpen}
          photos={displayPhotos}
          initialIndex={selectedIndex}
          primaryImageUrl={primaryImageUrl}
          onClose={handleCloseGallery}
        />
      </View>
    );
  }

  // Multiple photos: carousel mode
  return (
    <View style={[styles.container, style]}>
      <View style={styles.carouselHeader}>
        <Text style={styles.carouselTitle}>📸 Photos</Text>
        {showAddButton && onAddPhoto && (
          <TouchableOpacity style={styles.addButton} onPress={onAddPhoto}>
            <Text style={styles.addButtonText}>+ Add Photo</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        ref={flatListRef}
        data={displayPhotos}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SCREEN_WIDTH - 32}
        snapToAlignment="center"
        decelerationRate="fast"
        contentContainerStyle={styles.carouselContent}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => handlePhotoPress(index)}
            style={styles.carouselItem}
          >
            {item.imageUrl ? (
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.carouselImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.carouselPlaceholder}>
                <Text style={styles.heroPlaceholderIcon}>📸</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      />
      <PaginationDots count={displayPhotos.length} activeIndex={carouselIndex} />
      <FullScreenGallery
        visible={galleryOpen}
        photos={displayPhotos}
        initialIndex={selectedIndex}
        primaryImageUrl={primaryImageUrl}
        onClose={handleCloseGallery}
      />
    </View>
  );
};

// ── Styles ──
const styles = StyleSheet.create({
  container: { paddingTop: 8, paddingBottom: 16 },
  heroContainer: { height: 260, borderRadius: 16, overflow: 'hidden', marginHorizontal: 20, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroPlaceholder: { width: '100%', height: '100%', backgroundColor: theme.colors.surface3, justifyContent: 'center', alignItems: 'center' },
  heroPlaceholderIcon: { fontSize: 48, marginBottom: 8 },
  heroPlaceholderText: { fontSize: 14, color: theme.colors.textTertiary },
  heroOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: 'rgba(0,0,0,0.3)' },
  heroTapHint: { fontSize: 13, color: theme.colors.white, fontWeight: '500', textAlign: 'center' },
  carouselHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  carouselTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },
  addButton: { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: theme.colors.gold + '20', borderRadius: 8, borderWidth: 1, borderColor: theme.colors.gold + '30' },
  addButtonText: { fontSize: 13, fontWeight: '600', color: theme.colors.gold },
  carouselContent: { paddingHorizontal: 16, gap: 12 },
  carouselItem: { width: SCREEN_WIDTH - 64, height: 220, borderRadius: 14, overflow: 'hidden' },
  carouselImage: { width: '100%', height: '100%' },
  carouselPlaceholder: { width: '100%', height: '100%', backgroundColor: theme.colors.surface3, justifyContent: 'center', alignItems: 'center' },
  dotsContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, gap: DOT_GAP },
  dot: { height: DOT_SIZE, borderRadius: DOT_SIZE / 2 },
  galleryOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' },
  closeButton: { position: 'absolute', top: Platform.OS === 'ios' ? 54 : 24, right: 20, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  closeButtonText: { fontSize: 18, color: theme.colors.white, fontWeight: '600' },
  positionBadge: { position: 'absolute', top: Platform.OS === 'ios' ? 54 : 24, alignSelf: 'center', zIndex: 10, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 14 },
  positionText: { fontSize: 13, color: theme.colors.white, fontWeight: '500' },
  galleryList: { flex: 1 },
  galleryItemContainer: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT, justifyContent: 'center', alignItems: 'center' },
  galleryImage: { width: SCREEN_WIDTH - 20, height: SCREEN_HEIGHT - 160 },
  galleryPlaceholder: { width: SCREEN_WIDTH - 20, height: SCREEN_HEIGHT - 160, backgroundColor: '#1a1a1a', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  galleryPlaceholderIcon: { fontSize: 64 },
  metadataFooter: { position: 'absolute', bottom: 40, left: 20, right: 20, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12 },
  metadataCaption: { fontSize: 14, color: theme.colors.white, fontWeight: '500', marginBottom: 4 },
  metadataRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  metadataText: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
});
