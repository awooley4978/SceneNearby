import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { theme } from '../theme';

interface MapPlaceholderProps {
  /** Subtle tint color, defaults to gold for brand consistency */
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

  const pinColor = tintColor;
  const pinShadow = '#000000';

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Map grid — subtle street-like lines */}
      <Svg width="100%" height="100%" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id="mapFade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="rgba(255,255,255,0.06)" stopOpacity="1" />
            <Stop offset="100%" stopColor="rgba(255,255,255,0.02)" stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id="pinGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={pinColor} stopOpacity="1" />
            <Stop offset="100%" stopColor={pinColor} stopOpacity="0.85" />
          </LinearGradient>
        </Defs>

        {/* Background */}
        <Circle cx="200" cy="150" r="300" fill="url(#mapFade)" />

        {/* Horizontal street lines */}
        {[0.08, 0.16, 0.24, 0.32, 0.40, 0.48, 0.56, 0.64, 0.72, 0.80, 0.88].map((pct, i) => (
          <Line
            key={`h-${i}`}
            x1="0"
            y1={pct * 300}
            x2="400"
            y2={pct * 300}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={i % 3 === 1 ? 1.5 : 0.5}
          />
        ))}

        {/* Vertical street lines */}
        {[0.06, 0.12, 0.18, 0.25, 0.32, 0.38, 0.44, 0.50, 0.56, 0.62, 0.68, 0.75, 0.82, 0.88].map((pct, i) => (
          <Line
            key={`v-${i}`}
            x1={pct * 400}
            y1="0"
            x2={pct * 400}
            y2="300"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={i % 4 === 2 ? 1.2 : 0.5}
          />
        ))}

        {/* A few subtle curved paths suggesting roads */}
        <Path
          d="M0 180 Q 80 120, 160 140 T 300 100"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="2"
          fill="none"
        />
        <Path
          d="M400 80 Q 300 160, 200 150 T 50 200"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="1.5"
          fill="none"
        />
        <Path
          d="M200 0 Q 180 80, 220 160 T 180 300"
          stroke="rgba(255,255,255,0.03)"
          strokeWidth="1"
          fill="none"
        />

        {/* Pin shadow */}
        <Circle cx="200" cy="155" r="8" fill={pinShadow} opacity="0.25" />

        {/* Pin body — drop/teardrop shape */}
        <Path
          d="M200 120 C200 120, 188 140, 188 153 C188 160, 193 166, 200 166 C207 166, 212 160, 212 153 C212 140, 200 120, 200 120 Z"
          fill="url(#pinGrad)"
        />

        {/* Pin inner circle */}
        <Circle cx="200" cy="151" r="5" fill={theme.colors.background} />
        <Circle cx="200" cy="151" r="3" fill={pinColor} opacity="0.8" />
      </Svg>
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
    backgroundColor: '#0d0d14',
  },
});
