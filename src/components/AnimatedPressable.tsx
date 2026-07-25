import React, { useRef, useCallback } from 'react';
import {
  TouchableOpacity,
  Animated,
  StyleSheet,
  TouchableOpacityProps,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';

interface AnimatedPressableProps extends TouchableOpacityProps {
  scaleTo?: number;
  haptic?: boolean;
  hapticStyle?: Haptics.ImpactFeedbackStyle;
  containerStyle?: ViewStyle;
  children: React.ReactNode;
}

export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  scaleTo = 0.97,
  haptic = true,
  hapticStyle = Haptics.ImpactFeedbackStyle.Light,
  containerStyle,
  children,
  onPressIn,
  onPressOut,
  onPress,
  style,
  ...rest
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(
    (e: any) => {
      Animated.spring(scaleAnim, {
        toValue: scaleTo,
        damping: 20,
        stiffness: 300,
        useNativeDriver: true,
      }).start();
      if (haptic) {
        Haptics.impactAsync(hapticStyle).catch(() => {});
      }
      onPressIn?.(e);
    },
    [scaleAnim, scaleTo, haptic, hapticStyle, onPressIn],
  );

  const handlePressOut = useCallback(
    (e: any) => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        damping: 15,
        stiffness: 250,
        useNativeDriver: true,
      }).start();
      onPressOut?.(e);
    },
    [scaleAnim, onPressOut],
  );

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnim }] },
        containerStyle,
      ]}
    >
      <TouchableOpacity
        {...rest}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={style}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};