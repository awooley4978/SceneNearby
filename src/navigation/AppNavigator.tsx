import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export const AppNavigator = () => (
  <View style={styles.box}>
    <Text style={styles.txt}>[STUB] AppNavigator</Text>
  </View>
);

const styles = StyleSheet.create({
  box: { flex: 1, backgroundColor: '#111111', alignItems: 'center', justifyContent: 'center' },
  txt: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
});
