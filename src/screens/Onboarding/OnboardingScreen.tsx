import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export const OnboardingScreen = ({ onComplete }: any) => {
  useEffect(() => {
    const t = setTimeout(onComplete, 800);
    return () => clearTimeout(t);
  }, [onComplete]);
  return (
    <View style={styles.box}>
      <Text style={styles.txt}>[STUB] OnboardingScreen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  box: { flex: 1, backgroundColor: '#0f3460', alignItems: 'center', justifyContent: 'center' },
  txt: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
});
