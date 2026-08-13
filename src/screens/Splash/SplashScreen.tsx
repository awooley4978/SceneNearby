// SPLASH REBUILD S3 — S2 + sparkles (map) + tap indicator + bottom row.
// Tests: gap, SPARKLE_POSITIONS.map render, remaining absolutes. = full branded static splash.
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

export const SplashScreen = ({ onFinish }: any) => {
  useEffect(() => {
    const t = setTimeout(onFinish, 2200);
    return () => clearTimeout(t);
  }, [onFinish]);
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
      <View style={styles.logoContainer}>
        <View style={styles.glowRing} />
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
              },
            ]}
          />
        ))}
        <View style={styles.logoCircle}>
          <Text style={styles.logoIcon}>🎬</Text>
        </View>
        <Text style={styles.logo}>Scene Nearby</Text>
      </View>
      <View style={styles.taglineContainer}>
        <Text style={styles.tagline}>
          Discover the movies{'\n'}
          <Text style={styles.taglineGold}>playing all around you</Text>
        </Text>
      </View>
      <View style={styles.subtitleContainer}>
        <Text style={styles.subtitle}>
          Turn your everyday surroundings into{'\n'}
          a treasure hunt of cinematic history
        </Text>
      </View>
      <View style={styles.tapIndicator}>
        <View style={styles.tapLine} />
        <Text style={styles.tapText}>Tap to begin</Text>
        <View style={styles.tapLine} />
      </View>
      <View style={styles.bottomRow}>
        <View style={styles.goldDot} />
        <View style={styles.goldLine} />
        <View style={styles.goldDot} />
      </View>
    </View>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  logoContainer: { alignItems: 'center', marginBottom: 40, position: 'relative' },
  glowRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: theme.colors.gold + '15',
    borderWidth: 1,
    borderColor: theme.colors.gold + '30',
  },
  sparkle: { position: 'absolute', backgroundColor: theme.colors.gold },
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
    shadowColor: theme.colors.goldLight,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoIcon: { fontSize: 48 },
  logo: { color: theme.colors.white, fontSize: 32, fontWeight: '800', letterSpacing: 1 },
  taglineContainer: { marginBottom: 16 },
  tagline: { color: theme.colors.textPrimary, fontSize: 26, fontWeight: '700', textAlign: 'center', lineHeight: 36 },
  taglineGold: { color: theme.colors.gold },
  subtitleContainer: { marginBottom: 40 },
  subtitle: { color: theme.colors.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  tapIndicator: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 80 },
  tapLine: { width: 20, height: 1, backgroundColor: theme.colors.gold + '50' },
  tapText: { color: theme.colors.gold, fontSize: 13, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase' },
  bottomRow: { position: 'absolute', bottom: 60, flexDirection: 'row', alignItems: 'center', gap: 8 },
  goldDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.gold },
  goldLine: { width: 60, height: 1, backgroundColor: theme.colors.gold + '50' },
});
