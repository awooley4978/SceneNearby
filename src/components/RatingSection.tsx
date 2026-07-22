import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { theme } from '../theme';
import type { GooglePlaceRating } from '../models';

interface RatingSectionProps {
  googleRating?: GooglePlaceRating;
  localRating?: { average: number; count: number };
  /** Scene Nearby user rating (future: native reviews) */
  userRating?: number;
}

export const RatingSection: React.FC<RatingSectionProps> = ({
  googleRating,
  localRating,
  userRating,
}) => {
  const openGoogleReviews = () => {
    if (googleRating?.placeId) {
      Linking.openURL(
        `https://www.google.com/maps/place/?q=place_id:${googleRating.placeId}`
      );
    }
  };

  const hasGoogle = !!googleRating;
  const hasLocal = !!localRating;

  if (!hasGoogle && !hasLocal) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Ratings & Reviews</Text>

      {/* Scene Nearby local rating — primary when both exist */}
      {hasLocal && (
        <TouchableOpacity
          style={styles.ratingRow}
          onPress={hasGoogle ? undefined : undefined}
          activeOpacity={hasGoogle ? 0.7 : 1}
        >
          <Text style={styles.stars}>⭐ {localRating!.average.toFixed(1)}</Text>
          <Text style={styles.reviewCount}>({localRating!.count} Scene Nearby reviews)</Text>
        </TouchableOpacity>
      )}

      {/* Google rating — secondary when local exists, primary otherwise */}
      {hasGoogle && (
        <TouchableOpacity style={styles.ratingRow} onPress={openGoogleReviews} activeOpacity={0.7}>
          <View style={styles.googleRow}>
            <Text style={[styles.stars, hasLocal && styles.secondaryStars]}>
              Google ★ {googleRating!.rating}
            </Text>
            <Text style={[styles.reviewCount, hasLocal && styles.secondaryText]}>
              ({googleRating!.reviewCount.toLocaleString()} reviews)
            </Text>
          </View>
          <Text style={styles.tapHint}>›</Text>
        </TouchableOpacity>
      )}

      {/* Attribution */}
      {hasGoogle && (
        <Text style={styles.attribution}>Powered by Google</Text>
      )}

      {/* Future: Scene Nearby native reviews slot */}
      {!hasLocal && !hasGoogle && (
        <Text style={styles.emptyText}>No ratings yet. Be the first to review!</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    paddingHorizontal: 0,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface2,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  googleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stars: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.gold,
  },
  secondaryStars: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  reviewCount: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  secondaryText: {
    fontSize: 12,
  },
  tapHint: {
    fontSize: 18,
    color: theme.colors.textTertiary,
    fontWeight: '300',
  },
  attribution: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
