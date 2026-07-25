import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import { theme } from '../theme';

const { width: screenWidth } = Dimensions.get('window');

interface SkeletonLoaderProps {
  height?: number;
  width?: number | string;
  borderRadius?: number;
  style?: any;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  height = 20,
  width = '100%',
  borderRadius = 8,
  style,
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-screenWidth, screenWidth],
  });

  return (
    <View
      style={[
        styles.skeleton,
        {
          height,
          width: width as any,
          borderRadius,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
};

export const CardSkeleton: React.FC = () => (
  <View style={styles.card}>
    <SkeletonLoader height={180} borderRadius={18} style={styles.heroSkeleton} />
    <View style={styles.contentSkeleton}>
      <SkeletonLoader height={12} width="40%" borderRadius={4} style={{ marginBottom: 8 }} />
      <SkeletonLoader height={22} width="80%" borderRadius={4} style={{ marginBottom: 6 }} />
      <SkeletonLoader height={14} width="100%" borderRadius={4} style={{ marginBottom: 4 }} />
      <SkeletonLoader height={14} width="65%" borderRadius={4} style={{ marginBottom: 12 }} />
      <View style={styles.bottomRow}>
        <SkeletonLoader height={14} width={120} borderRadius={4} />
        <SkeletonLoader height={14} width={100} borderRadius={4} />
      </View>
    </View>
  </View>
);

export const HeroSkeleton: React.FC = () => (
  <View style={styles.heroContainer}>
    <SkeletonLoader height={260} borderRadius={0} />
    <View style={styles.heroOverlaySkeleton}>
      <SkeletonLoader height={28} width="60%" borderRadius={4} style={{ marginBottom: 8 }} />
      <SkeletonLoader height={18} width="40%" borderRadius={4} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: theme.colors.surface3,
    overflow: 'hidden',
    position: 'relative',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.08)',
    width: screenWidth * 0.5,
  },
  card: {
    marginBottom: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    overflow: 'hidden',
  },
  heroSkeleton: {
    margin: 0,
  },
  contentSkeleton: {
    padding: 16,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surface3 + '60',
  },
  heroContainer: {
    position: 'relative',
  },
  heroOverlaySkeleton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
});