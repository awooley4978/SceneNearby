import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export const LocationSetupScreen = ({ onboardingData, onComplete }: any) => {
  useEffect(() => {
    const t = setTimeout(() => onComplete({ activeCity: 'Dallas', activeCityLat: 32.7767, activeCityLng: -96.7970 }), 800);
    return () => clearTimeout(t);
  }, [onComplete]);
  return (
    <View style={styles.box}>
      <Text style={styles.txt}>[STUB] LocationSetupScreen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  box: { flex: 1, backgroundColor: '#16213e', alignItems: 'center', justifyContent: 'center' },
  txt: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
});
