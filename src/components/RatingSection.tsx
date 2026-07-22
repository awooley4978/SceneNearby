import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { theme } from '../theme';
import type { GooglePlaceRating } from '../models';

interface RatingSectionProps {
  googleRating?: GooglePlaceRating;
  localRating?: { average: number; count: number };
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
      {/* Scene Nearby local rating — primary when both exist */}
      {hasLocal && (
        <Text style={styles.localRow}>
          ⭐ {localRating!.average.toFixed(1)} · {localRating!.count} Scene Nearby reviews
        </Text>
      )}

      {/* Google rating — compact single line */}
      {hasGoogle && (
        <TouchableOpacity onPress={openGoogleReviews} activeOpacity={0.7}>
          <View style={styles.googleRow}>
            <Text style={[styles.googleText, hasLocal && styles.secondaryText]}>
              Google ★ {googleRating!.rating} ({googleRating!.reviewCount.toLocaleString()} reviews) ›
            </Text>
          </View>
          <Text style={styles.attribution}>Powered by Google</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  localRow: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.gold,
  },
  googleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  googleText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.gold,
  },
  secondaryText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  attribution: {
    fontSize: 10,
    color: theme.colors.textTertiary,
    fontStyle: 'italic',
    marginTop: 1,
  },
});
