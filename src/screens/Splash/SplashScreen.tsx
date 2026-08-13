// SPLASH REBUILD S1 — stripped proven base + StatusBar + container padding
// + branded text styling. No absolutes, no shadows, no alpha-hex, no gap.
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
      <Text style={styles.logo}>Scene Nearby</Text>
      <Text style={styles.tagline}>
        Discover the movies{'\n'}
        <Text style={styles.taglineGold}>playing all around you</Text>
      </Text>
    </View>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  logo: { color: theme.colors.gold, fontSize: 32, fontWeight: '800', marginBottom: 16, letterSpacing: 1 },
  tagline: { color: theme.colors.textPrimary, fontSize: 26, fontWeight: '700', textAlign: 'center', lineHeight: 36 },
  taglineGold: { color: theme.colors.gold },
});
