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

      {/* Skyline — mix of iconic landmarks */}
      <View style={styles.skyline}>

        {/* Pyramids */}
        <View style={styles.skItem}>
          <View style={styles.pyramidLarge} />
          <View style={styles.pyramidSmall} />
        </View>

        {/* Big Ben */}
        <View style={styles.skItem}>
          <View style={styles.bbBody} />
          <View style={styles.bbClock} />
          <View style={styles.bbSpire} />
        </View>

        {/* Eiffel Tower */}
        <View style={styles.skItem}>
          <View style={styles.etLegL} />
          <View style={styles.etLegR} />
          <View style={styles.etBody} />
          <View style={styles.etPlatform1} />
          <View style={styles.etUpper} />
          <View style={styles.etPlatform2} />
          <View style={styles.etSpire} />
          <View style={styles.etAntenna} />
        </View>

        {/* Empire State */}
        <View style={styles.skItem}>
          <View style={styles.esBase} />
          <View style={styles.esTier1} />
          <View style={styles.esTier2} />
          <View style={styles.esSpire} />
        </View>

        {/* St Basil's Cathedral */}
        <View style={styles.skItem}>
          <View style={styles.stBasilBase} />
          <View style={styles.stBasilDome} />
          <View style={styles.stBasilLeft} />
          <View style={styles.stBasilRight} />
        </View>

        {/* Colosseum */}
        <View style={styles.skItem}>
          <View style={styles.colBody}>
            <View style={styles.colArch1} />
            <View style={styles.colArch2} />
            <View style={styles.colArch3} />
          </View>
        </View>

        {/* Chrysler Building */}
        <View style={styles.skItem}>
          <View style={styles.chryslerBase} />
          <View style={styles.chryslerCrown} />
          <View style={styles.chryslerSpire} />
        </View>

        {/* Taj Mahal */}
        <View style={styles.skItem}>
          <View style={styles.tajBase} />
          <View style={styles.tajDome} />
          <View style={styles.tajMinaret1} />
          <View style={styles.tajMinaret2} />
          <View style={styles.tajSpire} />
        </View>

        {/* Leaning Tower */}
        <View style={styles.skItem}>
          <View style={styles.pisaBody} />
          <View style={styles.pisaTop} />
        </View>

        {/* Sydney Opera House */}
        <View style={styles.skItem}>
          <View style={styles.sydneySail1} />
          <View style={styles.sydneySail2} />
          <View style={styles.sydneyBase} />
        </View>

        {/* Space Needle */}
        <View style={styles.skItem}>
          <View style={styles.needleStem} />
          <View style={styles.needleSaucer} />
          <View style={styles.needleSpire} />
        </View>

        {/* Burj Khalifa */}
        <View style={styles.skItem}>
          <View style={styles.burjTier1} />
          <View style={styles.burjTier2} />
          <View style={styles.burjSpire} />
        </View>

        {/* Windmill */}
        <View style={styles.skItem}>
          <View style={styles.windmillBody} />
          <View style={styles.windmillRoof} />
          <View style={styles.windmillBlade1} />
          <View style={styles.windmillBlade2} />
        </View>

        {/* Golden Gate tower */}
        <View style={styles.skItem}>
          <View style={styles.ggLeg1} />
          <View style={styles.ggLeg2} />
          <View style={styles.ggBeam} />
        </View>
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

  // ── Skyline ──
  skyline: {
    position: 'absolute',
    top: '28%',
    left: 10,
    right: 10,
    height: 120,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-evenly',
    opacity: 0.12,
  },
  skItem: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
    minWidth: 20,
  },

  // Big Ben
  bbBody: {
    width: 12,
    height: 40,
    backgroundColor: 'rgba(245,197,24,0.5)',
  },
  bbClock: {
    width: 16,
    height: 10,
    backgroundColor: 'rgba(245,197,24,0.6)',
    borderRadius: 2,
  },
  bbSpire: {
    width: 3,
    height: 22,
    backgroundColor: 'rgba(245,197,24,0.4)',
    borderTopLeftRadius: 1,
    borderTopRightRadius: 1,
  },

  // Eiffel Tower
  etLegL: {
    width: 2,
    height: 55,
    backgroundColor: 'rgba(245,197,24,0.5)',
    position: 'absolute',
    bottom: 0,
    left: 4,
    transform: [{ rotate: '-6deg' }],
    transformOrigin: 'bottom left',
    borderRadius: 1,
  },
  etLegR: {
    width: 2,
    height: 55,
    backgroundColor: 'rgba(245,197,24,0.5)',
    position: 'absolute',
    bottom: 0,
    right: 4,
    transform: [{ rotate: '6deg' }],
    transformOrigin: 'bottom right',
    borderRadius: 1,
  },
  etBody: {
    width: 12,
    height: 28,
    backgroundColor: 'rgba(245,197,24,0.5)',
    position: 'absolute',
    bottom: 38,
    alignSelf: 'center',
  },
  etPlatform1: {
    width: 18,
    height: 2,
    backgroundColor: 'rgba(245,197,24,0.5)',
    position: 'absolute',
    bottom: 64,
    alignSelf: 'center',
  },
  etUpper: {
    width: 7,
    height: 18,
    backgroundColor: 'rgba(245,197,24,0.5)',
    position: 'absolute',
    bottom: 66,
    alignSelf: 'center',
  },
  etPlatform2: {
    width: 11,
    height: 1.5,
    backgroundColor: 'rgba(245,197,24,0.5)',
    position: 'absolute',
    bottom: 82,
    alignSelf: 'center',
  },
  etSpire: {
    width: 4,
    height: 8,
    backgroundColor: 'rgba(245,197,24,0.5)',
    position: 'absolute',
    bottom: 83,
    alignSelf: 'center',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  etAntenna: {
    width: 1,
    height: 5,
    backgroundColor: 'rgba(245,197,24,0.35)',
    position: 'absolute',
    bottom: 91,
    alignSelf: 'center',
  },

  // Empire State
  esBase: {
    width: 18,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.45)',
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
  },
  esTier1: {
    width: 12,
    height: 18,
    backgroundColor: 'rgba(255,255,255,0.45)',
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
  },
  esTier2: {
    width: 6,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.45)',
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
  },
  esSpire: {
    width: 1.5,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.35)',
    position: 'absolute',
    bottom: 62,
    alignSelf: 'center',
  },

  // Colosseum
  colBody: {
    width: 26,
    height: 28,
    backgroundColor: 'rgba(245,197,24,0.4)',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    flexDirection: 'row',
    paddingTop: 4,
  },
  colArch1: {
    width: 4,
    height: 14,
    borderRadius: 2,
    backgroundColor: '#060912',
  },
  colArch2: {
    width: 4,
    height: 14,
    borderRadius: 2,
    backgroundColor: '#060912',
  },
  colArch3: {
    width: 4,
    height: 14,
    borderRadius: 2,
    backgroundColor: '#060912',
  },

  // Taj Mahal
  tajBase: {
    width: 22,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.45)',
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
  },
  tajDome: {
    width: 20,
    height: 14,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.45)',
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
  },
  tajSpire: {
    width: 1.5,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.3)',
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
  },

  // Sydney Opera House
  sydneySail1: {
    width: 16,
    height: 20,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: 'rgba(245,197,24,0.4)',
    position: 'absolute',
    bottom: 6,
    left: 8,
  },
  sydneySail2: {
    width: 12,
    height: 14,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    backgroundColor: 'rgba(245,197,24,0.35)',
    position: 'absolute',
    bottom: 6,
    right: 8,
  },
  sydneyBase: {
    width: 30,
    height: 6,
    backgroundColor: 'rgba(245,197,24,0.3)',
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
  },

  // ── Pyramids ──
  pyramidLarge: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderBottomWidth: 30,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(245,197,24,0.4)',
    position: 'absolute',
    bottom: 0,
    left: 2,
  },
  pyramidSmall: {
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderBottomWidth: 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(245,197,24,0.35)',
    position: 'absolute',
    bottom: 0,
    right: 2,
  },

  // ── St Basil's ──
  stBasilBase: {
    width: 16,
    height: 18,
    backgroundColor: 'rgba(245,197,24,0.4)',
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
  },
  stBasilDome: {
    width: 12,
    height: 10,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    backgroundColor: 'rgba(245,197,24,0.35)',
    position: 'absolute',
    bottom: 18,
    alignSelf: 'center',
  },
  stBasilLeft: {
    width: 8,
    height: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    backgroundColor: 'rgba(245,197,24,0.3)',
    position: 'absolute',
    bottom: 14,
    left: 2,
  },
  stBasilRight: {
    width: 8,
    height: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    backgroundColor: 'rgba(245,197,24,0.3)',
    position: 'absolute',
    bottom: 14,
    right: 2,
  },

  // ── Chrysler Building ──
  chryslerBase: {
    width: 14,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.4)',
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
  },
  chryslerCrown: {
    width: 14,
    height: 10,
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    borderTopWidth: 0,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(255,255,255,0.4)',
  },
  chryslerSpire: {
    width: 1.5,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.3)',
    position: 'absolute',
    bottom: 34,
    alignSelf: 'center',
  },

  // ── Taj Mahal minarets ──
  tajMinaret1: {
    width: 3,
    height: 26,
    backgroundColor: 'rgba(255,255,255,0.35)',
    position: 'absolute',
    bottom: 2,
    left: 2,
  },
  tajMinaret2: {
    width: 3,
    height: 26,
    backgroundColor: 'rgba(255,255,255,0.35)',
    position: 'absolute',
    bottom: 2,
    right: 2,
  },

  // ── Leaning Tower of Pisa ──
  pisaBody: {
    width: 7,
    height: 34,
    backgroundColor: 'rgba(245,197,24,0.4)',
    borderRadius: 2,
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    transform: [{ rotate: '5deg' }],
  },
  pisaTop: {
    width: 10,
    height: 8,
    backgroundColor: 'rgba(245,197,24,0.35)',
    borderRadius: 3,
    position: 'absolute',
    bottom: 34,
    alignSelf: 'center',
    transform: [{ rotate: '5deg' }],
  },

  // ── Space Needle ──
  needleStem: {
    width: 2,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.4)',
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
  },
  needleSaucer: {
    width: 12,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    borderRadius: 2,
  },
  needleSpire: {
    width: 1.5,
    height: 18,
    backgroundColor: 'rgba(255,255,255,0.3)',
    position: 'absolute',
    bottom: 34,
    alignSelf: 'center',
  },

  // ── Burj Khalifa ──
  burjTier1: {
    width: 8,
    height: 26,
    backgroundColor: 'rgba(255,255,255,0.4)',
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
  },
  burjTier2: {
    width: 4,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.4)',
    position: 'absolute',
    bottom: 26,
    alignSelf: 'center',
  },
  burjSpire: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    position: 'absolute',
    bottom: 42,
    alignSelf: 'center',
  },

  // ── Windmill ──
  windmillBody: {
    width: 8,
    height: 20,
    backgroundColor: 'rgba(245,197,24,0.35)',
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
  },
  windmillRoof: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(245,197,24,0.3)',
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
  },
  windmillBlade1: {
    width: 16,
    height: 1.5,
    backgroundColor: 'rgba(245,197,24,0.2)',
    position: 'absolute',
    bottom: 28,
    left: 4,
    transform: [{ rotate: '30deg' }],
  },
  windmillBlade2: {
    width: 16,
    height: 1.5,
    backgroundColor: 'rgba(245,197,24,0.2)',
    position: 'absolute',
    bottom: 28,
    left: 4,
    transform: [{ rotate: '-30deg' }],
  },

  // ── Golden Gate ──
  ggLeg1: {
    width: 2,
    height: 36,
    backgroundColor: 'rgba(245,197,24,0.4)',
    position: 'absolute',
    bottom: 0,
    left: 4,
  },
  ggLeg2: {
    width: 2,
    height: 36,
    backgroundColor: 'rgba(245,197,24,0.4)',
    position: 'absolute',
    bottom: 0,
    right: 4,
  },
  ggBeam: {
    width: 14,
    height: 2,
    backgroundColor: 'rgba(245,197,24,0.35)',
    position: 'absolute',
    bottom: 33,
    alignSelf: 'center',
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
