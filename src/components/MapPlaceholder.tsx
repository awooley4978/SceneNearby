import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
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
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const gold05 = 'rgba(245,197,24,0.05)';
  const gold08 = 'rgba(245,197,24,0.08)';
  const gridColor = 'rgba(255,255,255,0.03)';
  const contourColor = 'rgba(255,255,255,0.035)';

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Base map tone */}
      <View style={styles.baseMap} />

      {/* Latitude / longitude grid */}
      {[0.06, 0.14, 0.22, 0.30, 0.38, 0.46, 0.54, 0.62, 0.70, 0.78, 0.86, 0.94].map((pct, i) => (
        <View
          key={`lat-${i}`}
          style={[styles.gridLineH, { top: `${pct * 100}%`, height: i === 5 ? 1 : 0.5 }]}
        />
      ))}
      {[0.05, 0.11, 0.18, 0.24, 0.30, 0.36, 0.42, 0.48, 0.55, 0.61, 0.67, 0.73, 0.79, 0.86, 0.92].map((pct, i) => (
        <View
          key={`lon-${i}`}
          style={[styles.gridLineV, { left: `${pct * 100}%`, width: i === 7 ? 1 : 0.5 }]}
        />
      ))}

      {/* Major roads — thicker horizontal lines */}
      <View style={[styles.roadH, { top: '32%' }]} />
      <View style={[styles.roadH, { top: '56%' }]} />
      <View style={[styles.roadV, { left: '28%' }]} />
      <View style={[styles.roadV, { left: '68%' }]} />

      {/* Contour rings — elliptical, off-center */}
      <View style={[styles.contourRing, styles.contour1]} />
      <View style={[styles.contourRing, styles.contour2]} />
      <View style={[styles.contourRing, styles.contour3]} />

      {/* Small park / green area */}
      <View style={styles.parkArea}>
        <View style={styles.parkStipple} />
      </View>

      {/* Water feature */}
      <View style={styles.waterBody}>
        <View style={styles.waterShimmer} />
      </View>

      {/* Compass — top right */}
      <View style={styles.compass}>
        <View style={styles.compassNeedleN} />
        <View style={styles.compassNeedleS} />
        <View style={styles.compassNeedleH} />
        <View style={styles.compassCenter} />
        <Text style={styles.compassN}>N</Text>
      </View>

      {/* Lat/Lon labels — bottom left */}
      <View style={styles.coordLabel}>
        <Text style={styles.coordText}>40.7128° N</Text>
        <Text style={styles.coordText}>74.0060° W</Text>
      </View>

      {/* Gold accent glow under pin */}
      <View style={styles.pinGlow} />

      {/* Pin shadow */}
      <View style={styles.pinShadow} />

      {/* Pin body — inverted teardrop (wide top, tapered to point at bottom) */}
      <View style={styles.pinWrapper}>
        {/* Teardrop body */}
        <View style={[styles.pinTeardrop, { backgroundColor: tintColor }]}>
          {/* Highlight streak */}
          <View style={styles.pinHighlight} />
          {/* Inner ring */}
          <View style={styles.pinInnerRing}>
            <View style={[styles.pinInnerDot, { backgroundColor: tintColor }]} />
          </View>
        </View>
        {/* Sharp point */}
        <View style={[styles.pinNeedle, { borderTopColor: tintColor }]} />
      </View>

      {/* Subtle gold rim light around pin */}
      <View style={styles.pinRimLight} />
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
    backgroundColor: '#080c14',
    overflow: 'hidden',
  },

  // ── Base map ──
  baseMap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#080c14',
  },

  // ── Grid ──
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.025)',
  },

  // ── Major roads ──
  roadH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: 'rgba(245,197,24,0.08)',
  },
  roadV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1.5,
    backgroundColor: 'rgba(245,197,24,0.08)',
  },

  // ── Contour rings ──
  contourRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  contour1: {
    width: 200,
    height: 140,
    top: '34%',
    left: '32%',
  },
  contour2: {
    width: 280,
    height: 200,
    top: '28%',
    left: '22%',
  },
  contour3: {
    width: 360,
    height: 260,
    top: '22%',
    left: '12%',
  },

  // ── Park ──
  parkArea: {
    position: 'absolute',
    top: '15%',
    left: '62%',
    width: 60,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(34,139,34,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(34,139,34,0.1)',
  },
  parkStipple: {
    position: 'absolute',
    top: '20%',
    left: '25%',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(34,139,34,0.15)',
  },

  // ── Water ──
  waterBody: {
    position: 'absolute',
    top: '65%',
    left: '10%',
    width: 90,
    height: 25,
    borderRadius: 12,
    backgroundColor: 'rgba(30,80,140,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(30,80,140,0.1)',
  },
  waterShimmer: {
    position: 'absolute',
    top: '30%',
    left: '20%',
    width: 30,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },

  // ── Compass ──
  compass: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: 'rgba(245,197,24,0.15)',
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compassNeedleN: {
    position: 'absolute',
    width: 2,
    height: 13,
    borderRadius: 1,
    backgroundColor: 'rgba(245,197,24,0.45)',
    bottom: '50%',
  },
  compassNeedleS: {
    position: 'absolute',
    width: 2,
    height: 9,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    top: '50%',
  },
  compassNeedleH: {
    position: 'absolute',
    width: 22,
    height: 1,
    borderRadius: 0.5,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  compassCenter: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(245,197,24,0.4)',
    position: 'absolute',
  },
  compassN: {
    position: 'absolute',
    top: 2,
    fontSize: 8,
    fontWeight: '700',
    color: 'rgba(245,197,24,0.6)',
  },

  // ── Coordinates ──
  coordLabel: {
    position: 'absolute',
    bottom: 12,
    left: 14,
  },
  coordText: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: 'rgba(255,255,255,0.12)',
    letterSpacing: 1,
    lineHeight: 14,
  },

  // ── Pin glow ──
  pinGlow: {
    position: 'absolute',
    top: '38%',
    alignSelf: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(245,197,24,0.04)',
  },

  // ── Pin shadow ──
  pinShadow: {
    position: 'absolute',
    top: '54%',
    alignSelf: 'center',
    width: 20,
    height: 6,
    borderRadius: 10,
    backgroundColor: '#000',
    opacity: 0.35,
  },

  // ── Pin wrapper (centering) ──
  pinWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -8,
  },

  // ── Teardrop body ──
  pinTeardrop: {
    width: 44,
    height: 38,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },

  // ── Highlight on pin ──
  pinHighlight: {
    position: 'absolute',
    top: 6,
    left: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  // ── Sharp point at bottom ──
  pinNeedle: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -3,
  },

  // ── Inner ring ──
  pinInnerRing: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -2,
  },
  pinInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.9,
  },

  // ── Gold rim light ──
  pinRimLight: {
    position: 'absolute',
    top: '44%',
    alignSelf: 'center',
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(245,197,24,0.06)',
  },
});
