import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
} from 'react-native';
import { theme } from '../theme';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width - 32;
const CARD_MAX_HEIGHT = height * 0.75;

export interface DiscoveryNotificationProps {
  visible: boolean;
  onDismiss: () => void;
  movieTitle: string;
  locationName: string;
  city: string;
  description: string;
  distance: string; // e.g. "0.8 mi"
  imageUrl?: string;
  rating?: string;
  visitTime?: string;
  onNavigate: () => void;
  onViewDetails: () => void;
}

export const DiscoveryNotificationCard: React.FC<DiscoveryNotificationProps> = ({
  visible,
  onDismiss,
  movieTitle,
  locationName,
  city,
  description,
  distance,
  imageUrl,
  rating,
  visitTime,
  onNavigate,
  onViewDetails,
}) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 1,
          damping: 18,
          stiffness: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 18,
          stiffness: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.92,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [60, 0],
  });

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onDismiss}
    >
      {/* Backdrop */}
      <Animated.View
        style={[
          styles.backdrop,
          { opacity: backdropAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] }) },
        ]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onDismiss}
        />
      </Animated.View>

      {/* Card */}
      <View style={styles.centeredContainer}>
        <Animated.View
          style={[
            styles.card,
            {
              transform: [
                { translateY },
                { scale: scaleAnim },
              ],
            },
          ]}
        >
          {/* ── Top Bar ── */}
          <View style={styles.topBar}>
            <View style={styles.topBarLeft}>
              <Text style={styles.pinIcon}>📍</Text>
              <Text style={styles.topBarTitle}>Nearby Discovery</Text>
            </View>
            <View style={styles.distancePill}>
              <Text style={styles.distanceText}>{distance} Away</Text>
            </View>
          </View>

          {/* ── Hero Section ── */}
          <View style={styles.hero}>
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.heroImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.heroImage, styles.heroPlaceholder]}>
                <Text style={styles.heroPlaceholderText}>🎬</Text>
              </View>
            )}
            {/* Gradient overlay */}
            <View style={styles.heroGradient} />
            {/* Hero text overlay */}
            <View style={styles.heroOverlay}>
              <Text style={styles.heroMovieTitle} numberOfLines={1}>
                🎬 {movieTitle}
              </Text>
              <Text style={styles.heroLocation} numberOfLines={1}>
                {locationName} • {city}
              </Text>
            </View>
          </View>

          {/* ── Description ── */}
          <View style={styles.descriptionSection}>
            <Text style={styles.descriptionText} numberOfLines={2}>
              {description}
            </Text>
          </View>

          {/* ── Badges Row ── */}
          {(rating || visitTime) && (
            <View style={styles.badgesRow}>
              {rating && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>⭐ {rating}</Text>
                </View>
              )}
              {visitTime && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>⏱ {visitTime}</Text>
                </View>
              )}
              <View style={styles.badge}>
                <Text style={styles.badgeText}>📍 {distance}</Text>
              </View>
            </View>
          )}

          {/* ── Context Line ── */}
          <Text style={styles.contextLine}>You're passing this location.</Text>

          {/* ── Bottom Actions ── */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                onNavigate();
                onDismiss();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>🗺️ Navigate</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onDismiss}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Later</Text>
            </TouchableOpacity>
          </View>

          {/* ── View Details Link ── */}
          <TouchableOpacity
            style={styles.viewDetailsLink}
            onPress={() => {
              onViewDetails();
              onDismiss();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.viewDetailsText}>View Details</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  card: {
    width: CARD_WIDTH,
    maxHeight: CARD_MAX_HEIGHT,
    backgroundColor: '#1C1C22',
    borderRadius: 20,
    overflow: 'hidden',
    ...theme.shadows.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  // ── Top Bar ──
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pinIcon: {
    fontSize: 14,
  },
  topBarTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.gold,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
  distancePill: {
    backgroundColor: 'rgba(245, 197, 24, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 197, 24, 0.3)',
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.gold,
  },

  // ── Hero Section ──
  hero: {
    position: 'relative',
    height: CARD_WIDTH * 0.5625, // 16:9 ratio
    marginHorizontal: 0,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    backgroundColor: theme.colors.surface2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroPlaceholderText: {
    fontSize: 48,
    opacity: 0.5,
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  heroMovieTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroLocation: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // ── Description ──
  descriptionSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },

  // ── Badges Row ──
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    flexWrap: 'wrap',
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },

  // ── Context Line ──
  contextLine: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    paddingHorizontal: 16,
    paddingTop: 10,
    fontStyle: 'italic' as const,
  },

  // ── Actions ──
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: theme.colors.gold,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  primaryButtonText: {
    color: theme.colors.black,
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  secondaryButtonText: {
    color: theme.colors.textSecondary,
    fontWeight: '600',
    fontSize: 15,
  },

  // ── View Details Link ──
  viewDetailsLink: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 4,
  },
  viewDetailsText: {
    fontSize: 13,
    color: theme.colors.gold,
    fontWeight: '600',
    textDecorationLine: 'underline',
    textDecorationColor: theme.colors.gold + '50',
  },
});