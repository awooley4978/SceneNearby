import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';

export const MapPlaceholder: React.FC = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.copyContainer}>
        <Text style={styles.copyText}>This scene is waiting</Text>
        <Text style={styles.copyText}>for its first photo.</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#060912',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyContainer: {
    alignItems: 'center',
    marginTop: '-20%',
  },
  copyText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.25)',
    fontWeight: '400',
    letterSpacing: 0.3,
    lineHeight: 20,
    textAlign: 'center',
  },
});
