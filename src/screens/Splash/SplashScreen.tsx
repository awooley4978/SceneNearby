// SPLASH REBUILD S2 — S1 + logoCircle (🎬, surface bg, border, shadow) +
// glowRing (absolute, 8-digit alpha-hex). Tests: shadow, absolute, alpha-hex.
import React, { useEffect } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';

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
        <View style={styles.logoCircle}>
          <Text style={styles.logoIcon}>🎬</Text>
        </View>
        <Text style={styles.logo}>Scene Nearby</Text>
      </View>
      <Text style={styles.tagline}>
        Discover the movies{'\n'}
        <Text style={styles.taglineGold}>playing all around you</Text>
      </Text>
    </View>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  logoContainer: { alignItems: 'center', marginBottom: 48, position: 'relative' },
  glowRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: theme.colors.gold + '15',
    borderWidth: 1,
    borderColor: theme.colors.gold + '30',
  },
  logoCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 2,
    borderColor: theme.colors.gold + '40',
    shadowColor: theme.colors.goldLight,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  logoIcon: { fontSize: 72 },
  logo: { color: theme.colors.white, fontSize: 44, fontWeight: '800', letterSpacing: 2 },
  tagline: { color: theme.colors.textPrimary, fontSize: 26, fontWeight: '700', textAlign: 'center', lineHeight: 36 },
  taglineGold: { color: theme.colors.gold },
});
