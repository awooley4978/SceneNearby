import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Share,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { theme } from '../../theme';
import { locationById, mockRatings, photosByLocation, calculateDistance } from '../../data/sampleData';
import { categoryColors, STORAGE_KEYS } from '../../models';
import { useSaved } from '../../context/SavedContext';
import { getOnboardingData } from '../../services/StorageService';
import { CategoryBadge } from '../../components/CategoryBadge';
import { StarRating } from '../../components/StarRating';
import { PhotoGrid } from '../../components/PhotoGrid';

export const LocationDetailScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { locationId } = route.params;
  const location = locationById(locationId);
  const rating = location ? mockRatings[location.id] : undefined;
  const photos = location ? photosByLocation(location.id) : [];
  const [userRating, setUserRating] = useState<number | undefined>(undefined);
  const { isSaved: checkSaved, toggleSave: toggleSaved } = useSaved();
  const saved = checkSaved(locationId);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);

  // Load user GPS from onboarding and calculate distance
  React.useEffect(() => {
    (async () => {
      try {
        const data = await getOnboardingData();
        if (data?.activeCityLat && data?.activeCityLng) {
          setUserLat(data.activeCityLat);
          setUserLng(data.activeCityLng);
        }
      } catch {}
    })();
  }, []);

  // Calculate distance in meters (matching the detail page's metric display)
  const distanceFromUser = React.useMemo(() => {
    if (userLat === null || userLng === null || !location) return undefined;
    // calculateDistance returns meters
    return calculateDistance(userLat, userLng, location.latitude, location.longitude);
  }, [userLat, userLng, location]);

  if (!location) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Location not found</Text>
      </View>
    );
  }

  const catColor = categoryColors[location.category];

  const handleGetDirections = () => {
    const url = `https://maps.apple.com/?daddr=${location.latitude},${location.longitude}`;
    Linking.openURL(url);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `🎬 Check out ${location.movieOrShow} filming location: ${location.title}\n${location.address}, ${location.city}\n\nvia Scene Nearby`,
      });
    } catch {}
  };

  const handleSave = async () => {
    await toggleSaved(locationId);
  };

  const handleRate = (rating: number) => {
    setUserRating(rating);
    Alert.alert('Rated!', `You gave ${location.title} ${rating} star${rating !== 1 ? 's' : ''}.`);
  };

  const handleViewMovie = () => {
    navigation.navigate('MovieDetail', { movieTitle: location.movieOrShow });
  };

  const handleAddPhoto = () => {
    Alert.alert('Add Photo', 'Camera/gallery integration coming soon!');
  };

  const displayedRating = userRating || rating?.average || 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero */}
      <View style={styles.hero}>
        {/* Location image with gradient overlay */}
        {location.imageUrl ? (
          <Image
            source={{ uri: location.imageUrl }}
            style={styles.heroImage}
          />
        ) : null}
        <View style={[styles.heroGradientOverlay, { backgroundColor: catColor + 'AA' }]} />
        <View style={styles.heroContent}>
          <TouchableOpacity onPress={handleViewMovie}>
            <Text style={styles.showName}>{location.movieOrShow} ›</Text>
          </TouchableOpacity>
          <Text style={styles.locationTitle}>{location.title}</Text>
          <View style={styles.badges}>
            <CategoryBadge category={location.category} />
            <View style={styles.yearBadge}><Text style={styles.yearText}>{location.year}</Text></View>
            {distanceFromUser !== undefined && (
              <View style={styles.distanceBadge}>
                <Text style={styles.distanceText}>
                  📍 {distanceFromUser < 1000
                    ? `${Math.round(distanceFromUser)}m`
                    : `${(distanceFromUser / 1000).toFixed(1)}km`} away
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Rating section */}
      {rating && (
        <View style={styles.ratingSection}>
          <View style={styles.ratingRow}>
            <StarRating rating={displayedRating} size={20} showCount={false} />
            <Text style={styles.ratingAverage}>{rating.average.toFixed(1)}</Text>
            <Text style={styles.ratingCount}>({rating.count} ratings)</Text>
          </View>
          <Text style={styles.ratePrompt}>Tap to rate:</Text>
          <StarRating
            rating={userRating || 0}
            size={24}
            interactive
            onRate={handleRate}
            showCount={false}
          />
        </View>
      )}

      {/* What Happened Here */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎬 What Happened Here</Text>
        <Text style={styles.bodyText}>{location.sceneDescription}</Text>
      </View>

      {/* Iconic Quote */}
      {location.quote && (
        <View style={styles.quoteSection}>
          <Text style={styles.quoteIcon}>💬</Text>
          <Text style={styles.quoteText}>"{location.quote}"</Text>
          {location.quoteAttribution && (
            <Text style={styles.quoteAttr}>— {location.quoteAttribution}</Text>
          )}
        </View>
      )}

      {/* Then & Now */}
      {location.thenAndNow && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📸 Then & Now</Text>
          <Text style={styles.bodyText}>{location.thenAndNow}</Text>
        </View>
      )}

      {/* Fun Fact */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🤔 Did You Know?</Text>
        <Text style={styles.bodyText}>{location.funFact}</Text>
      </View>

      {/* Community Photos */}
      <PhotoGrid
        photos={photos.map((p) => ({
          id: p.id,
          color: p.color,
          username: p.username,
          caption: p.caption,
        }))}
        onAddPhoto={handleAddPhoto}
      />

      {/* Location info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📍 Location</Text>
        <Text style={styles.bodyText}>{location.address}</Text>
        <Text style={styles.bodyText}>{location.city}, {location.country}</Text>
        <Text style={styles.coords}>
          {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleGetDirections}>
          <Text style={styles.primaryButtonText}>🗺️ Get Directions</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryButton, saved && styles.savedButton]}
          onPress={handleSave}
        >
          <Text style={[styles.secondaryButtonText, saved && styles.savedButtonText]}>
            {saved ? '✅ Saved' : '💾 Save'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleShare}>
          <Text style={styles.secondaryButtonText}>📤 Share</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: 40 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  errorText: { fontSize: 18, color: theme.colors.textSecondary },
  hero: { height: 300, justifyContent: 'flex-end', paddingBottom: 20, position: 'relative', overflow: 'hidden' },
  heroContent: { paddingHorizontal: 20, position: 'relative', zIndex: 2 },
  heroImage: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    width: '100%', height: '100%',
    resizeMode: 'cover',
  },
  heroGradientOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    opacity: 0.6,
  },
  showName: { fontSize: 16, fontWeight: '700', color: theme.colors.gold, marginBottom: 4 },
  locationTitle: { fontSize: 26, fontWeight: '700', color: theme.colors.white, marginBottom: 12 },
  badges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  yearBadge: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: theme.colors.surface3 + 'CC', borderRadius: 8 },
  yearText: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '500' },
  distanceBadge: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: theme.colors.surface3 + 'CC', borderRadius: 8 },
  distanceText: { fontSize: 12, color: theme.colors.gold, fontWeight: '500' },
  ratingSection: { paddingHorizontal: 20, paddingTop: 20 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  ratingAverage: { fontSize: 22, fontWeight: '700', color: theme.colors.gold },
  ratingCount: { fontSize: 13, color: theme.colors.textTertiary },
  ratePrompt: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 4 },
  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 10 },
  bodyText: { fontSize: 15, color: theme.colors.textSecondary, lineHeight: 24 },
  coords: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 6, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  quoteSection: { marginHorizontal: 20, marginTop: 24, padding: 20, backgroundColor: theme.colors.surface, borderRadius: 16, borderLeftWidth: 3, borderLeftColor: theme.colors.gold },
  quoteIcon: { fontSize: 20, marginBottom: 8 },
  quoteText: { fontSize: 17, fontStyle: 'italic', color: theme.colors.textPrimary, lineHeight: 26 },
  quoteAttr: { fontSize: 13, color: theme.colors.textTertiary, marginTop: 8 },
  actions: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 28, gap: 10 },
  primaryButton: { flex: 1, backgroundColor: theme.colors.gold, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  primaryButtonText: { color: theme.colors.black, fontWeight: '700', fontSize: 12 },
  secondaryButton: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: theme.colors.surface3, borderWidth: 1, borderColor: 'transparent' },
  secondaryButtonText: { color: theme.colors.gold, fontWeight: '600', fontSize: 12 },
  savedButton: { backgroundColor: theme.colors.gold + '20', borderColor: theme.colors.gold },
  savedButtonText: { color: theme.colors.gold },
});
