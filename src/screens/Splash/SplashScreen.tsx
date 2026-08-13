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
  tagline: { color: theme.colors.textPrimary, fontSize: 26, fontWeight: '700', textAlign: 'center', lineHeight: 36 },
  taglineGold: { color: theme.colors.gold },
});
