import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { theme } from '../theme';

export const MapPlaceholder: React.FC = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: 1,
            duration: 4000,
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 4000,
            useNativeDriver: true,
          }),
        ]),
      ),
    ]).start();
  }, [fadeAnim, floatAnim]);

  const cloudDrift = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Sky gradient layers */}
      <View style={styles.sky} />
      <View style={styles.skyGradient} />

      {/* Stars / sparkles */}
      <View style={[styles.star, { top: '12%', left: '15%' }]} />
      <View style={[styles.star, { top: '8%', left: '72%' }]} />
      <View style={[styles.starSmall, { top: '18%', left: '55%' }]} />
      <View style={[styles.starSmall, { top: '6%', left: '38%' }]} />

      {/* Distant clouds */}
      <Animated.View style={[styles.cloud, { top: '22%', left: '10%', transform: [{ translateX: cloudDrift }] }]}>
        <View style={styles.cloudShape} />
        <View style={[styles.cloudShape, { top: -6, left: 14, width: 30 }]} />
        <View style={[styles.cloudShape, { top: 2, left: -8, width: 20 }]} />
      </Animated.View>

      {/* Landmark silhouette — Eiffel Tower */}
      <View style={styles.landmark}>
        {/* Base legs */}
        <View style={styles.towerLegL} />
        <View style={styles.towerLegR} />
        {/* Main body */}
        <View style={styles.towerBody} />
        {/* Platform 1 */}
        <View style={styles.towerPlatform1} />
        {/* Upper section */}
        <View style={styles.towerUpper} />
        {/* Platform 2 */}
        <View style={styles.towerPlatform2} />
        {/* Spire */}
        <View style={styles.towerSpire} />
        {/* Antenna */}
        <View style={styles.towerAntenna} />
        {/* Arch */}
        <View style={styles.towerArch} />
      </View>

      {/* Secondary silhouette — dome */}
      <View style={styles.dome}>
        <View style={styles.domeBase} />
        <View style={styles.domeCurve} />
        <View style={styles.domeSpire} />
      </View>

      {/* Horizon line */}
      <View style={styles.horizon} />
      <View style={styles.horizonGlow} />

      {/* Ground */}
      <View style={styles.ground} />

      {/* Camera on tripod */}
      <View style={styles.tripodContainer}>
        {/* Tripod legs */}
        <View style={styles.tripodLegC} />
        <View style={styles.tripodLegL} />
        <View style={styles.tripodLegR} />

        {/* Camera body */}
        <View style={styles.cameraBody}>
          {/* Lens */}
          <View style={styles.cameraLensOuter}>
            <View style={styles.cameraLensMid}>
              <View style={styles.cameraLensInner} />
            </View>
            {/* Lens glint */}
            <View style={styles.lensGlint} />
          </View>
          {/* Viewfinder */}
          <View style={styles.viewfinder} />
          {/* Flash */}
          <View style={styles.flash} />
        </View>
      </View>

      {/* Copy */}
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

  // ── Sky ──
  sky: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '68%',
    backgroundColor: '#080c1a',
  },
  skyGradient: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    height: '38%',
    backgroundColor: '#0a1024',
    opacity: 0.6,
  },

  // ── Stars ──
  star: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(245,197,24,0.25)',
  },
  starSmall: {
    position: 'absolute',
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  // ── Clouds ──
  cloud: {
    position: 'absolute',
    opacity: 0.12,
  },
  cloudShape: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },

  // ── Horizon ──
  horizon: {
    position: 'absolute',
    top: '62%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(245,197,24,0.1)',
  },
  horizonGlow: {
    position: 'absolute',
    top: '58%',
    left: 0,
    right: 0,
    height: 30,
    backgroundColor: 'rgba(245,197,24,0.02)',
  },

  // ── Ground ──
  ground: {
    position: 'absolute',
    top: '63%',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#040610',
  },

  // ── Landmark: Eiffel Tower ──
  landmark: {
    position: 'absolute',
    top: '24%',
    left: '14%',
    width: 36,
    height: 130,
    alignItems: 'center',
    opacity: 0.14,
  },
  towerLegL: {
    position: 'absolute',
    bottom: 0,
    left: 4,
    width: 3,
    height: 80,
    backgroundColor: 'rgba(245,197,24,0.5)',
    transform: [{ rotate: '-8deg' }],
    transformOrigin: 'bottom left',
    borderRadius: 1,
  },
  towerLegR: {
    position: 'absolute',
    bottom: 0,
    right: 4,
    width: 3,
    height: 80,
    backgroundColor: 'rgba(245,197,24,0.5)',
    transform: [{ rotate: '8deg' }],
    transformOrigin: 'bottom right',
    borderRadius: 1,
  },
  towerBody: {
    position: 'absolute',
    bottom: 55,
    width: 20,
    height: 40,
    backgroundColor: 'rgba(245,197,24,0.5)',
  },
  towerPlatform1: {
    position: 'absolute',
    bottom: 88,
    width: 28,
    height: 3,
    backgroundColor: 'rgba(245,197,24,0.5)',
  },
  towerUpper: {
    position: 'absolute',
    bottom: 91,
    width: 12,
    height: 28,
    backgroundColor: 'rgba(245,197,24,0.5)',
  },
  towerPlatform2: {
    position: 'absolute',
    bottom: 116,
    width: 18,
    height: 2,
    backgroundColor: 'rgba(245,197,24,0.5)',
  },
  towerSpire: {
    position: 'absolute',
    bottom: 118,
    width: 6,
    height: 12,
    backgroundColor: 'rgba(245,197,24,0.5)',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  towerAntenna: {
    position: 'absolute',
    bottom: 129,
    width: 1.5,
    height: 6,
    backgroundColor: 'rgba(245,197,24,0.4)',
  },
  towerArch: {
    position: 'absolute',
    bottom: 62,
    width: 16,
    height: 10,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(245,197,24,0.5)',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },

  // ── Silhouette: dome ──
  dome: {
    position: 'absolute',
    top: '32%',
    right: '18%',
    width: 30,
    height: 50,
    alignItems: 'center',
    opacity: 0.1,
  },
  domeBase: {
    position: 'absolute',
    bottom: 0,
    width: 30,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  domeCurve: {
    position: 'absolute',
    bottom: 14,
    width: 28,
    height: 22,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  domeSpire: {
    position: 'absolute',
    bottom: 36,
    width: 2,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderTopLeftRadius: 1,
    borderTopRightRadius: 1,
  },

  // ── Camera Tripod ──
  tripodContainer: {
    position: 'absolute',
    top: '58%',
    alignSelf: 'center',
    alignItems: 'center',
  },
  tripodLegC: {
    position: 'absolute',
    top: 22,
    width: 2,
    height: 50,
    backgroundColor: 'rgba(245,197,24,0.25)',
  },
  tripodLegL: {
    position: 'absolute',
    top: 22,
    left: -20,
    width: 1.5,
    height: 48,
    backgroundColor: 'rgba(245,197,24,0.18)',
    transform: [{ rotate: '15deg' }],
    transformOrigin: 'top right',
  },
  tripodLegR: {
    position: 'absolute',
    top: 22,
    right: -20,
    width: 1.5,
    height: 48,
    backgroundColor: 'rgba(245,197,24,0.18)',
    transform: [{ rotate: '-15deg' }],
    transformOrigin: 'top left',
  },

  // ── Camera body ──
  cameraBody: {
    width: 42,
    height: 30,
    borderRadius: 6,
    backgroundColor: 'rgba(245,197,24,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,197,24,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  cameraLensOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(245,197,24,0.07)',
    borderWidth: 2,
    borderColor: 'rgba(245,197,24,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraLensMid: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(245,197,24,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraLensInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(245,197,24,0.6)',
  },
  lensGlint: {
    position: 'absolute',
    top: 3,
    right: 4,
    width: 4,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    transform: [{ rotate: '-30deg' }],
  },
  viewfinder: {
    position: 'absolute',
    top: 4,
    left: 8,
    width: 6,
    height: 4,
    borderRadius: 1,
    backgroundColor: 'rgba(245,197,24,0.15)',
    borderWidth: 0.5,
    borderColor: 'rgba(245,197,24,0.25)',
  },
  flash: {
    position: 'absolute',
    top: 3,
    right: 7,
    width: 5,
    height: 3,
    borderRadius: 1,
    backgroundColor: 'rgba(245,197,24,0.08)',
  },

  // ── Copy ──
  copyContainer: {
    position: 'absolute',
    bottom: 28,
    alignSelf: 'center',
    alignItems: 'center',
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
