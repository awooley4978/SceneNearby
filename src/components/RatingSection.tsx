import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { theme } from '../theme';
import type { GooglePlaceRating } from '../models';
import { fetchPlaceRating, PlaceRating } from '../services/placesService';

interface RatingSectionProps {
  googleRating?: GooglePlaceRating;
  localRating?: { average: number; count: number };
  userRating?: number;
  placeId?: string;
}

export const RatingSection: React.FC<RatingSectionProps> = ({
  googleRating,
  localRating,
  userRating,
  placeId,
}) => {
  const [liveRating, setLiveRating] = useState<PlaceRating | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!placeId) return;
    let cancelled = false;
    setIsLoading(true);
    fetchPlaceRating(placeId).then((data) => {
      if (!cancelled) {
        setLiveRating(data);
        setIsLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [placeId]);

  // Use live rating when available, fall back to hardcoded
  const displayRating = liveRating?.rating ?? googleRating?.rating;
  const displayCount = liveRating?.reviewCount ?? googleRating?.reviewCount;
  const effectivePlaceId = placeId || googleRating?.placeId;

  const openGoogleReviews = async () => {
    if (effectivePlaceId) {
      await WebBrowser.openBrowserAsync(
        `https://www.google.com/maps/place/?q=place_id:${effectivePlaceId}`
      );
    }
  };

  const hasGoogle = !!displayRating;
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

      {/* Google rating — live or fallback */}
      {hasGoogle && (
        <View>
          <View style={styles.googleRow}>
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.colors.gold} style={{ marginRight: 8 }} />
            ) : null}
            <Text style={[styles.googleText, hasLocal && styles.secondaryText]}>
              Google ★ {displayRating} ({displayCount?.toLocaleString()} reviews)
            </Text>
          </View>
          <TouchableOpacity onPress={openGoogleReviews} activeOpacity={0.7} style={styles.viewButton}>
            <Text style={styles.viewButtonText}>📍 View on Google Maps</Text>
          </TouchableOpacity>
          <Text style={styles.attribution}>Powered by Google</Text>
        </View>
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
  viewButton: {
    marginTop: 6,
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.gold,
    textDecorationLine: 'underline',
  },
});
