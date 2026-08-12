import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export const SplashScreen = ({ onFinish }: any) => {
  useEffect(() => {
    const t = setTimeout(onFinish, 800);
    return () => clearTimeout(t);
  }, [onFinish]);
  return (
    <View style={styles.box}>
      <Text style={styles.txt}>[STUB] SplashScreen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  box: { flex: 1, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center' },
  txt: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
});
