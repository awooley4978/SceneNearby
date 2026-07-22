import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { theme } from '../theme';

interface MapPlaceholderProps {
  tintColor?: string;
}

export const MapPlaceholder: React.FC<MapPlaceholderProps> = ({
  tintColor = theme.colors.gold,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [size, setSize] = useState({ width: 400, height: 300 });

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setSize({ width, height });
    }
  };

  const pinColor = tintColor;
  const pinShadow = '#000000';
  const cx = size.width / 2;
  const cy = size.height / 2;

  return (
    <Animated.View
      style={[styles.container, { opacity: fadeAnim }]}
      onLayout={onLayout}
    >
      <Svg width={size.width} height={size.height} viewBox={`0 0 ${size.width} ${size.height}`}>
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
        <Circle cx={cx} cy={cy} r={Math.max(size.width, size.height)} fill="url(#mapFade)" />

        {/* Horizontal street lines */}
        {[0.08, 0.16, 0.24, 0.32, 0.40, 0.48, 0.56, 0.64, 0.72, 0.80, 0.88].map((pct, i) => (
          <Line
            key={`h-${i}`}
            x1="0"
            y1={pct * size.height}
            x2={size.width}
            y2={pct * size.height}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={i % 3 === 1 ? 1.5 : 0.5}
          />
        ))}

        {/* Vertical street lines */}
        {[0.06, 0.12, 0.18, 0.25, 0.32, 0.38, 0.44, 0.50, 0.56, 0.62, 0.68, 0.75, 0.82, 0.88].map((pct, i) => (
          <Line
            key={`v-${i}`}
            x1={pct * size.width}
            y1="0"
            x2={pct * size.width}
            y2={size.height}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={i % 4 === 2 ? 1.2 : 0.5}
          />
        ))}

        {/* Curved paths suggesting roads */}
        <Path
          d={`M0 ${cy * 0.6} Q ${cx * 0.4} ${cy * 0.3}, ${cx * 0.8} ${cy * 0.35} T ${size.width} ${cy * 0.4}`}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="2"
          fill="none"
        />
        <Path
          d={`M${size.width} ${cy * 0.7} Q ${cx * 1.2} ${cy * 1.1}, ${cx} ${cy} T ${cx * 0.3} ${cy * 1.4}`}
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="1.5"
          fill="none"
        />

        {/* Pin — flipped 180° so point faces down */}
        <G
          rotation={180}
          origin={`${cx}, ${cy}`}
        >
          {/* Pin shadow */}
          <Circle cx={cx} cy={cy + 5} r={Math.min(size.width, size.height) * 0.027} fill={pinShadow} opacity="0.25" />

          {/* Pin body — teardrop pointing up (will flip to point down) */}
          <Path
            d={`M${cx} ${cy - 30} C${cx} ${cy - 30}, ${cx - 12} ${cy - 10}, ${cx - 12} ${cy + 3} C${cx - 12} ${cy + 10}, ${cx - 7} ${cy + 16}, ${cx} ${cy + 16} C${cx + 7} ${cy + 16}, ${cx + 12} ${cy + 10}, ${cx + 12} ${cy + 3} C${cx + 12} ${cy - 10}, ${cx} ${cy - 30}, ${cx} ${cy - 30} Z`}
            fill="url(#pinGrad)"
          />

          {/* Pin inner circle */}
          <Circle cx={cx} cy={cy + 1} r={Math.min(size.width, size.height) * 0.017} fill={theme.colors.background} />
          <Circle cx={cx} cy={cy + 1} r={Math.min(size.width, size.height) * 0.01} fill={pinColor} opacity="0.8" />
        </G>
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
