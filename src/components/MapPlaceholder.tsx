import React, { useEffect, useRef } from 'react';
import { View, Text, Image, Animated, StyleSheet } from 'react-native';

const PLACEHOLDER_IMAGE = require('../../assets/missing-photo-placeholder.png');

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
      <Image
        source={PLACEHOLDER_IMAGE}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.overlay} />
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
    overflow: 'hidden',
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(6,9,18,0.45)',
  },
  copyContainer: {
    position: 'absolute',
    top: '25%',
    alignSelf: 'center',
    alignItems: 'center',
  },
  copyText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '400',
    letterSpacing: 0.3,
    lineHeight: 20,
    textAlign: 'center',
  },
});
