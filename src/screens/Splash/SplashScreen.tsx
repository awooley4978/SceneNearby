import React, { useEffect } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';

const SPARKLE_POSITIONS = [
  { x: -40, y: -40, size: 4 },
  { x: 40, y: -35, size: 3 },
  { x: -50, y: 20, size: 5 },
  { x: 50, y: 25, size: 3 },
  { x: -30, y: 50, size: 4 },
  { x: 30, y: -50, size: 3 },
  { x: -60, y: -10, size: 2 },
  { x: 60, y: 10, size: 4 },
];

// STATIC splash: the animated variant (5× Animated.loop + entrance sequence)
// crashes Release on Fabric regardless of driver (proven: js-chunk2b2 JS-driver
// and js-chunk2b3 native-driver both fail; static js-chunk2b3b/cee47c9 progresses).
// Keeps the full branded layout frozen at its final state; restores motion later
// once the crash construct is isolated.
export const SplashScreen: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
  useEffect(() => {
    const t = setTimeout(onFinish, 2200);
    return () => clearTimeout(t);
  }, [onFinish]);
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
      {/* Logo area */}
      <View style={[styles.logoContainer, { opacity: 1, transform: [{ scale: 1 }] }]}>
        {/* Gold glow ring */}
        <View style={[styles.glowRing, { opacity: 0.5, transform: [{ scale: 1.04 }] }]} />
        {/* Sparkles around logo */}
        {SPARKLE_POSITIONS.map((pos, i) => (
          <View
            key={i}
            style={[
              styles.sparkle,
              {
                width: pos.size * 2,
                height: pos.size * 2,
                borderRadius: pos.size,
                left: pos.x,
                top: pos.y,
                opacity: 1,
                transform: [{ scale: 1 }],
              },
            ]}
          />
        ))}
        <View style={styles.logoCircle}>
          <Text style={styles.logoIcon}>🎬</Text>
        </View>
        <Text style={styles.appName}>Scene Nearby</Text>
      </View>
      {/* Tagline */}
      <View style={styles.taglineContainer}>
        <Text style={styles.tagline}>
          Discover the movies{'\n'}
          <Text style={styles.taglineGold}>playing all around you</Text>
        </Text>
      </View>
      {/* Subtitle */}
      <View style={styles.subtitleContainer}>
        <Text style={styles.subtitle}>
          Turn your everyday surroundings into{'\n'}
          a treasure hunt of cinematic history
        </Text>
      </View>
      {/* "Tap to begin" indicator */}
      <View style={[styles.tapIndicator, { opacity: 0.6 }]}>
        <View style={styles.tapLine} />
        <Text style={styles.tapText}>Tap to begin</Text>
        <View style={styles.tapLine} />
      </View>
      {/* Bottom decoration */}
      <View style={styles.bottomRow}>
        <View style={styles.goldDot} />
        <View style={styles.goldLine} />
        <View style={styles.goldDot} />
      </View>
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
    position: 'relative',
  },
  glowRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: theme.colors.gold + '15',
    borderWidth: 1,
    borderColor: theme.colors.gold + '30',
  },
  sparkle: {
    position: 'absolute',
    backgroundColor: theme.colors.gold,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: theme.colors.gold + '40',
    // Gold gradient border effect via shadow
    shadowColor: theme.colors.goldLight,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoIcon: {
    fontSize: 48,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.white,
    letterSpacing: 1,
  },
  taglineContainer: {
    marginBottom: 16,
  },
  tagline: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    lineHeight: 36,
  },
  taglineGold: {
    color: theme.colors.gold,
  },
  subtitleContainer: {
    marginBottom: 40,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  tapIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 80,
  },
  tapLine: {
    width: 20,
    height: 1,
    backgroundColor: theme.colors.gold + '50',
  },
  tapText: {
    fontSize: 13,
    color: theme.colors.gold,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  bottomRow: {
    position: 'absolute',
    bottom: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goldDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.gold,
  },
  goldLine: {
    width: 60,
    height: 1,
    backgroundColor: theme.colors.gold + '50',
  },
});
