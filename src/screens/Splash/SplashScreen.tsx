import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
  Dimensions,
} from 'react-native';
import { theme } from '../../theme';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
}

const SPARKLE_POSITIONS = [
  { x: -40, y: -40, size: 4 },
  { x: 40, y: -35, size: 3 },
  { x: -50, y: 20, size: 5 },
  { x: 50, y: 25, size: 3 },
  { x: -30, y: 50, size: 4 },
  { x: 30, y: -50, size: 3 },
  { x: -60, y: -10, size: 2 },
  { x: 60, y: 10, size: 4 },
];

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const goldPulse = useRef(new Animated.Value(0)).current;
  const sparkleAnims = useRef(SPARKLE_POSITIONS.map(() => new Animated.Value(0))).current;
  const tapPulse = useRef(new Animated.Value(0)).current;
  const taglinePulse = useRef(new Animated.Value(0)).current;
  const bottomSpring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Gold glow pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(goldPulse, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(goldPulse, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        }),
      ]),
    ).start();

    // Sparkle animations — staggered
    sparkleAnims.forEach((anim, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 400),
          Animated.timing(anim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.delay(2000),
        ]),
      ).start();
    });

    // Tagline pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(taglinePulse, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(taglinePulse, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Bottom dots spring entrance
    Animated.spring(bottomSpring, {
      toValue: 1,
      damping: 12,
      stiffness: 100,
      useNativeDriver: true,
    }).start();

    // "Tap to begin" pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(tapPulse, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(tapPulse, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Main entrance sequence
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 40,
          friction: 4,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.delay(1500),
    ]).start(() => {
      onFinish();
    });
  }, []);

  const goldGlowOpacity = goldPulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.2, 0.5, 0.2],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />

      {/* Logo area */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        {/* Gold glow ring */}
        <Animated.View
          style={[
            styles.glowRing,
            {
              opacity: goldGlowOpacity,
              transform: [{ scale: goldPulse.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.08],
              }) }],
            },
          ]}
        />

        {/* Sparkles around logo */}
        {SPARKLE_POSITIONS.map((pos, i) => (
          <Animated.View
            key={i}
            style={[
              styles.sparkle,
              {
                width: pos.size * 2,
                height: pos.size * 2,
                borderRadius: pos.size,
                left: pos.x,
                top: pos.y,
                opacity: sparkleAnims[i],
                transform: [{
                  scale: sparkleAnims[i].interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.5, 1.5, 0.5],
                  }),
                }],
              },
            ]}
          />
        ))}

        <View style={styles.logoCircle}>
          <Text style={styles.logoIcon}>🎬</Text>
        </View>
        <Text style={styles.appName}>Scene Nearby</Text>
      </Animated.View>

      {/* Tagline */}
      <Animated.View style={[styles.taglineContainer, { opacity: taglineOpacity }]}>
        <Animated.Text
          style={[
            styles.tagline,
            {
              transform: [{
                scale: taglinePulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.02],
                }),
              }],
            },
          ]}
        >
          Discover the movies{'\n'}
          <Text style={styles.taglineGold}>playing all around you</Text>
        </Animated.Text>
      </Animated.View>

      {/* Subtitle */}
      <Animated.View style={[styles.subtitleContainer, { opacity: subtitleOpacity }]}>
        <Text style={styles.subtitle}>
          Turn your everyday surroundings into{'\n'}
          a treasure hunt of cinematic history
        </Text>
      </Animated.View>

      {/* "Tap to begin" pulsing indicator */}
      <Animated.View
        style={[
          styles.tapIndicator,
          {
            opacity: tapPulse.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.3, 1, 0.3],
            }),
          },
        ]}
      >
        <View style={styles.tapLine} />
        <Text style={styles.tapText}>Tap to begin</Text>
        <View style={styles.tapLine} />
      </Animated.View>

      {/* Bottom decoration */}
      <Animated.View style={[styles.bottomRow, {
        opacity: bottomSpring,
        transform: [{ translateY: bottomSpring.interpolate({
          inputRange: [0, 1],
          outputRange: [20, 0],
        }) }],
      }]}>
        <View style={styles.goldDot} />
        <View style={styles.goldLine} />
        <View style={styles.goldDot} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
    position: 'relative',
  },
  glowRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: theme.colors.gold + '15',
    borderWidth: 1,
    borderColor: theme.colors.gold + '30',
  },
  sparkle: {
    position: 'absolute',
    backgroundColor: theme.colors.gold,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: theme.colors.gold + '40',
    // Gold gradient border effect via shadow
    shadowColor: theme.colors.goldLight,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoIcon: {
    fontSize: 48,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.white,
    letterSpacing: 1,
  },
  taglineContainer: {
    marginBottom: 16,
  },
  tagline: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    lineHeight: 36,
  },
  taglineGold: {
    color: theme.colors.gold,
  },
  subtitleContainer: {
    marginBottom: 40,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  tapIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 80,
  },
  tapLine: {
    width: 20,
    height: 1,
    backgroundColor: theme.colors.gold + '50',
  },
  tapText: {
    fontSize: 13,
    color: theme.colors.gold,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  bottomRow: {
    position: 'absolute',
    bottom: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goldDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.gold,
  },
  goldLine: {
    width: 60,
    height: 1,
    backgroundColor: theme.colors.gold + '50',
  },
});