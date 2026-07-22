import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface MapPlaceholderProps {
  tintColor?: string;
}

export const MapPlaceholder: React.FC<MapPlaceholderProps> = ({
  tintColor = theme.colors.gold,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Map grid lines — horizontal */}
      {[0.08, 0.17, 0.25, 0.33, 0.42, 0.50, 0.58, 0.67, 0.75, 0.83, 0.92].map((pct, i) => (
        <View
          key={`h-${i}`}
          style={[
            styles.gridLineH,
            { top: `${pct * 100}%`, height: i % 3 === 1 ? 1.5 : 0.5 },
          ]}
        />
      ))}

      {/* Map grid lines — vertical */}
      {[0.06, 0.13, 0.19, 0.25, 0.31, 0.38, 0.44, 0.50, 0.56, 0.63, 0.69, 0.75, 0.81, 0.88].map((pct, i) => (
        <View
          key={`v-${i}`}
          style={[
            styles.gridLineV,
            { left: `${pct * 100}%`, width: i % 4 === 2 ? 1.2 : 0.5 },
          ]}
        />
      ))}

      {/* Pin shadow */}
      <View style={styles.pinShadow} />

      {/* Pin body — teardrop shape */}
      <View style={[styles.pinBody, { backgroundColor: tintColor }]}>
        <View style={styles.pinInnerRing}>
          <View style={[styles.pinDot, { backgroundColor: tintColor }]} />
        </View>
      </View>

      {/* Pin point — small triangle at bottom */}
      <View style={[styles.pinPoint, { borderTopColor: tintColor }]} />
    </Animated.View>
  );
};

const PIN_SIZE = 48;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0d0d14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  pinBody: {
    width: PIN_SIZE,
    height: PIN_SIZE * 0.75,
    borderRadius: PIN_SIZE / 2,
    borderBottomLeftRadius: PIN_SIZE / 3,
    borderBottomRightRadius: PIN_SIZE / 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -PIN_SIZE * 0.3,
  },
  pinPoint: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
  },
  pinInnerRing: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    opacity: 0.85,
  },
  pinShadow: {
    position: 'absolute',
    bottom: '40%',
    width: 24,
    height: 6,
    borderRadius: 12,
    backgroundColor: '#000',
    opacity: 0.3,
  },
});
