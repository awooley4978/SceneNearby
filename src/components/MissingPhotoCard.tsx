import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { LocationCategory } from '../models';

interface MissingPhotoCardProps {
  category: LocationCategory;
  height?: number;
  variant?: 'card' | 'detail';
}

const GRADIENT_PAIRS: Record<string, string[]> = {
  Drama: ['#2D1B69', '#1a1a2e'],
  Comedy: ['#B8860B', '#2a2a1a'],
  'Sci-Fi': ['#0E4D64', '#0a1a2e'],
  Action: ['#7F1D1D', '#2a1a1a'],
  Romance: ['#6B2142', '#2a1a2a'],
};

export const MissingPhotoCard: React.FC<MissingPhotoCardProps> = ({
  category,
  height = 260,
  variant = 'card',
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [fadeAnim, pulseAnim]);

  const gradientColors = GRADIENT_PAIRS[category] || ['#1a1a2e', '#0a0a0a'];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          height,
          backgroundColor: gradientColors[0],
          opacity: fadeAnim,
        },
      ]}
    >
      {/* Subtle gradient overlay */}
      <View style={[styles.gradientOverlay, { backgroundColor: gradientColors[1] }]} />

      {/* Icon with pulse */}
      <Animated.View
        style={[
          styles.iconContainer,
          { transform: [{ scale: pulseAnim }] },
        ]}
      >
        <Text style={styles.icon}>🎬</Text>
      </Animated.View>

      {/* Film strip decoration */}
      <View style={styles.filmStrip}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View
            key={i}
            style={[
              styles.filmSprocket,
              { opacity: 0.15 + (i % 2 === 0 ? 0.1 : 0) },
            ]}
          />
        ))}
      </View>

      {/* Text */}
      <Text style={styles.title}>No Photo Available</Text>
      <Text style={styles.subtitle}>
        {variant === 'detail'
          ? 'A community-submitted photo will appear here'
          : 'Photo coming soon'}
      </Text>

      {/* Bottom fade */}
      <View style={styles.bottomFade} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
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
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  icon: {
    fontSize: 24,
  },
  filmStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  filmSprocket: {
    width: 4,
    height: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: 0.3,
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