import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../theme';

interface ArrivalBannerProps {
  cityName: string;
  visible: boolean;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 6000;

const CITY_FLAGS: Record<string, string> = {
  'London': '🇬🇧',
  'Paris': '🇫🇷',
  'New York City': '🇺🇸',
  'Los Angeles': '🇺🇸',
  'Chicago': '🇺🇸',
  'Dallas': '🇺🇸',
  'San Francisco': '🇺🇸',
  'Boston': '🇺🇸',
  'Seattle': '🇺🇸',
  'New Orleans': '🇺🇸',
  'Washington DC': '🇺🇸',
  'Toronto': '🇨🇦',
  'Sydney': '🇦🇺',
  'Tokyo': '🇯🇵',
  'Dublin': '🇮🇪',
  'Albuquerque': '🇺🇸',
};

function getFlag(cityName: string): string {
  return CITY_FLAGS[cityName] || '📍';
}

/**
 * Subtle informational banner that slides down when the user arrives
 * in a city where they have saved filming locations. Auto-dismisses
 * after 6 seconds or on tap. No action buttons — purely reassuring.
 */
export const ArrivalBanner: React.FC<ArrivalBannerProps> = ({ cityName, visible, onDismiss }) => {
  const translateY = useRef(new Animated.Value(-120)).current;

  useEffect(() => {
    if (visible) {
      // Slide in
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();

      // Auto-dismiss
      const timer = setTimeout(() => {
        dismiss();
      }, AUTO_DISMISS_MS);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const dismiss = () => {
    Animated.timing(translateY, {
      toValue: -120,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onDismiss());
  };

  if (!visible) return null;

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY }] }]}>
      <TouchableOpacity style={styles.touchable} onPress={dismiss} activeOpacity={0.9}>
        <Text style={styles.emoji}>{getFlag(cityName)}</Text>
        <View style={styles.textBlock}>
          <Text style={styles.title}>Welcome to {cityName}!</Text>
          <Text style={styles.body}>
            Scene Nearby is watching for filming locations around you. We'll
            let you know when there's something nearby you won't want to miss.
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 60,
    left: 12,
    right: 12,
    zIndex: 100,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(245,197,24,0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  touchable: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  emoji: {
    fontSize: 28,
    marginRight: 12,
    marginTop: 2,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
});
