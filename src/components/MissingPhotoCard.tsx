import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../theme';
import { LocationCategory } from '../models';

interface MissingPhotoCardProps {
  locationName: string;
  category: LocationCategory;
  movieOrShow: string;
}

const GRADIENT_PAIRS: Record<string, string[]> = {
  Drama: ['#2D1B69', '#1a1a2e'],
  Comedy: ['#B8860B', '#2a2a1a'],
  'Sci-Fi': ['#0E4D64', '#0a1a2e'],
  Action: ['#7F1D1D', '#2a1a1a'],
  Romance: ['#6B2142', '#2a1a2a'],
};

export const MissingPhotoCard: React.FC<MissingPhotoCardProps> = ({
  locationName,
  category,
  movieOrShow,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const gradientColors = GRADIENT_PAIRS[category] || ['#1a1a2e', '#0a0a0a'];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: gradientColors[0],
          opacity: fadeAnim,
        },
      ]}
    >
      {/* Subtle grid pattern overlay */}
      <View style={styles.gridOverlay}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
          <View key={`h-${i}`} style={[styles.gridLine, styles.gridLineH, { top: `${(i + 1) * 8.3}%` }]} />
        ))}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
          <View key={`v-${i}`} style={[styles.gridLine, styles.gridLineV, { left: `${(i + 1) * 8.3}%` }]} />
        ))}
        {/* Subtle dots at intersections */}
        {[1, 3, 5, 7, 9, 11].map((row) =>
          [1, 3, 5, 7, 9, 11].map((col) => (
            <View
              key={`d-${row}-${col}`}
              style={[
                styles.gridDot,
                { top: `${row * 8.3}%`, left: `${col * 8.3}%` },
              ]}
            />
          ))
        )}
      </View>

      {/* Gradient overlay from gradient pair */}
      <View style={[styles.gradientOverlay, { backgroundColor: gradientColors[1] }]} />

      {/* Camera icon */}
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>📷</Text>
      </View>

      {/* Heading */}
      <Text style={styles.heading}>📷 Photo Needed</Text>

      {/* Body text */}
      <Text style={styles.bodyText}>
        Help complete Scene Nearby.{'\n'}
        Be the first to contribute a photo of this filming location. After review, your image could become the featured photo seen by movie and TV fans around the world.
      </Text>

      {/* Disabled Submit button */}
      <TouchableOpacity style={styles.submitButton} activeOpacity={1} onPress={() => {}}>
        <Text style={styles.submitButtonText}>Submit Photo</Text>
      </TouchableOpacity>

      {/* Bottom fade overlay */}
      <View style={styles.bottomFade} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    paddingHorizontal: 32,
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  gridLineH: {
    left: 0,
    right: 0,
    height: 1,
  },
  gridLineV: {
    top: 0,
    bottom: 0,
    width: 1,
  },
  gridDot: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginLeft: -1.5,
    marginTop: -1.5,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.3,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  icon: {
    fontSize: 28,
  },
  heading: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
    letterSpacing: 0.5,
  },
  bodyText: {
    fontSize: theme.fontSize.sm,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: theme.spacing.lg,
    maxWidth: 280,
  },
  submitButton: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
    backgroundColor: theme.colors.gold,
    opacity: 0.5,
  },
  submitButtonText: {
    color: theme.colors.black,
    fontWeight: theme.fontWeight.bold,
    fontSize: theme.fontSize.md,
  },
  bottomFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
});