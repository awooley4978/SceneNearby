import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '../theme';
import { FilmingLocation } from '../models';
import { CategoryBadge } from './CategoryBadge';
import { DistanceBadge } from './DistanceBadge';
import { StarRating } from './StarRating';
import { mockRatings } from '../data/sampleData';
import { getSavedIds, setSavedIds } from '../services/StorageService';

interface LocationCardProps {
  location: FilmingLocation;
  onPress: () => void;
  onMoviePress?: () => void;
  onUnsave?: (id: string) => void;
  showRating?: boolean;
  index?: number;
}

const GRADIENT_PAIRS: Record<string, string[]> = {
  Drama: ['#2D1B69', '#1a1a2e'],
  Comedy: ['#B8860B', '#2a2a1a'],
  'Sci-Fi': ['#0E4D64', '#0a1a2e'],
  Action: ['#7F1D1D', '#2a1a1a'],
  Romance: ['#6B2142', '#2a1a2a'],
};

export const LocationCard: React.FC<LocationCardProps> = ({
  location,
  onPress,
  onMoviePress,
  onUnsave,
  showRating = true,
  index = 0,
}) => {
  const rating = mockRatings[location.id];
  const [isSaved, setIsSaved] = React.useState(false);
  const [savedLoaded, setSavedLoaded] = React.useState(false);

  // Load saved state from AsyncStorage on mount
  React.useEffect(() => {
    (async () => {
      try {
        const ids = await getSavedIds();
        setIsSaved(ids.has(location.id));
      } catch {} finally {
        setSavedLoaded(true);
      }
    })();
  }, [location.id]);
  const heartScale = useRef(new Animated.Value(1)).current;
  const pressAnim = useRef(new Animated.Value(0)).current;
  const entranceAnim = useRef(new Animated.Value(0)).current;
  // Burst particles
  const particleAnim = useRef(new Animated.Value(0)).current;

  // Entrance animation — staggered by index
  useEffect(() => {
    const delay = Math.min(index * 80, 400);
    Animated.timing(entranceAnim, {
      toValue: 1,
      duration: 500,
      delay,
      useNativeDriver: true,
    }).start();
  }, [index]);

  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      damping: 20,
      stiffness: 300,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 0,
      damping: 15,
      stiffness: 250,
      useNativeDriver: true,
    }).start();
  };

  const handleSave = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const next = !isSaved;
    setIsSaved(next);
    Animated.sequence([
      Animated.spring(heartScale, {
        toValue: 1.3,
        damping: 8,
        stiffness: 200,
        useNativeDriver: true,
      }),
      Animated.spring(heartScale, {
        toValue: 1,
        damping: 12,
        stiffness: 250,
        useNativeDriver: true,
      }),
    ]).start();

    // Burst particle effect
    if (next) {
      particleAnim.setValue(0);
      Animated.timing(particleAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }

    // Persist to AsyncStorage
    try {
      const ids = await getSavedIds();
      if (next) ids.add(location.id);
      else ids.delete(location.id);
      await setSavedIds(ids);
    } catch {}

    // Notify parent when unsaved (e.g. to remove from Saved tab)
    if (!next && onUnsave) {
      onUnsave(location.id);
    }
  }, [isSaved, heartScale, particleAnim, location.id, onUnsave]);

  const entranceOpacity = entranceAnim.interpolate({
    inputRange: [0, 1], outputRange: [0, 1],
  });
  const entranceTranslateY = entranceAnim.interpolate({
    inputRange: [0, 1], outputRange: [24, 0],
  });

  const pressScale = pressAnim.interpolate({
    inputRange: [0, 1], outputRange: [1, 0.97],
  });

  const gradientColors = GRADIENT_PAIRS[location.category] || ['#1a1a2e', '#0a0a0a'];
  const heroGradient = {
    backgroundColor: gradientColors[0],
  };

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          opacity: entranceOpacity,
          transform: [{ translateY: entranceTranslateY }],
        },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ scale: pressScale }],
            },
          ]}
        >
          {/* ── Hero Image Area ── */}
          <View style={[styles.hero, heroGradient]}>
            {/* Subtle gradient overlay at bottom of hero */}
            <View style={styles.heroOverlayGradient} />

            {/* Category badge — top left */}
            <View style={styles.heroBadgeTopLeft}>
              <CategoryBadge category={location.category} />
            </View>

            {/* Distance badge — top right */}
            {location.distanceFromUser !== undefined && (
              <View style={styles.heroBadgeTopRight}>
                {location.distanceFromUser < 0.1 ? (
                  <View style={styles.arrivalBadge}>
                    <Text style={styles.arrivalText}>YOU'RE HERE 🎉</Text>
                  </View>
                ) : (
                  <DistanceBadge
                    distance={location.distanceFromUser < 1
                      ? `${(location.distanceFromUser * 5280).toFixed(0)}ft`
                      : `${location.distanceFromUser.toFixed(1)}mi`}
                  />
                )}
              </View>
            )}

            {/* Save / Heart button */}
            <TouchableOpacity
              style={styles.heartButton}
              onPress={handleSave}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {/* Burst particles */}
              {[0, 1, 2, 3, 4, 5].map((i) => {
                const angle = (i / 6) * Math.PI * 2;
                const dist = 30 + i * 4;
                return (
                  <Animated.View
                    key={i}
                    style={[
                      styles.particle,
                      {
                        backgroundColor: theme.colors.gold,
                        opacity: particleAnim.interpolate({
                          inputRange: [0, 0.3, 1],
                          outputRange: [0, 1, 0],
                        }),
                        transform: [
                          {
                            translateX: particleAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, Math.cos(angle) * dist],
                            }),
                          },
                          {
                            translateY: particleAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, Math.sin(angle) * dist],
                            }),
                          },
                          {
                            scale: particleAnim.interpolate({
                              inputRange: [0, 0.5, 1],
                              outputRange: [1, 1.5, 0],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                );
              })}
              <Animated.Text
                style={[
                  styles.heartIcon,
                  { transform: [{ scale: heartScale }] },
                  isSaved && styles.heartIconFilled,
                ]}
              >
                {isSaved ? '❤️' : '🤍'}
              </Animated.Text>
            </TouchableOpacity>

            {/* City and year overlay at bottom of hero */}
            <View style={styles.heroMeta}>
              <Text style={styles.heroCity}>{location.city}</Text>
              <View style={styles.heroMetaRight}>
                <Text style={styles.heroYear}>{location.year}</Text>
                <Text style={styles.heroType}>{location.isMovie ? '🎬' : '📺'}</Text>
              </View>
            </View>
          </View>

          {/* ── Content Area ── */}
          <View style={styles.content}>
            {/* Movie/Show name */}
            <TouchableOpacity onPress={onMoviePress} disabled={!onMoviePress}>
              <Text style={styles.movieName} numberOfLines={1}>
                {location.movieOrShow}
              </Text>
            </TouchableOpacity>

            {/* Location title */}
            <Text style={styles.locationTitle} numberOfLines={1}>
              {location.title}
            </Text>

            {/* Scene description */}
            <Text style={styles.description} numberOfLines={2}>
              {location.sceneDescription}
            </Text>

            {/* Bottom row: rating + address */}
            <View style={styles.bottomRow}>
              <View style={styles.ratingRow}>
                {showRating && rating && (
                  <StarRating rating={rating.average} count={rating.count} size={11} showCount />
                )}
              </View>
              <Text style={styles.address} numberOfLines={1}>
                📍 {location.address}
              </Text>
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: 'rgba(28,28,34,0.85)',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    // Gold left-border accent
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.gold + '40',
  },

  // ── Hero Image ──
  hero: {
    height: 180,
    justifyContent: 'flex-end',
    padding: 16,
    position: 'relative',
  },
  heroOverlayGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  heroBadgeTopLeft: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 10,
  },
  heroBadgeTopRight: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },
  heartButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  heartIcon: {
    fontSize: 18,
  },
  heartIconFilled: {
    // Already has emoji color
  },
  heroMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 5,
  },
  heroCity: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroMetaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroYear: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroType: {
    fontSize: 12,
  },

  // ── Content ──
  content: {
    padding: 16,
    gap: 6,
  },
  movieName: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.gold,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
  locationTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginTop: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surface3 + '60',
  },
  ratingRow: {
    flex: 1,
    marginRight: 8,
  },
  address: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    maxWidth: '50%',
  },
  arrivalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: theme.colors.gold + 'E6',
    borderRadius: 8,
  },
  arrivalText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.black,
  },
});