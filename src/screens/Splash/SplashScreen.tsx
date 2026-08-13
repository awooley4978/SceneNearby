import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';

// STATIC probe variant: no Animated usage at all — isolates whether ANY
// splash animation crashes on Fabric Release (vs just the JS-driver loop).
export const SplashScreen = ({ onFinish }: any) => {
  useEffect(() => {
    const t = setTimeout(onFinish, 1200);
    return () => clearTimeout(t);
  }, [onFinish]);
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Scene Nearby</Text>
      <Text style={styles.tagline}>Discover the movies playing all around you</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' },
  logo: { color: theme.colors.gold, fontSize: 32, fontWeight: '800', marginBottom: 8 },
  tagline: { color: theme.colors.textSecondary, fontSize: 14 },
});
