import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface CityWelcomeModalProps {
  visible: boolean;
  cityName: string;
  savedCount: number;
  onSavedPlaces: () => void;
  onSavedDiscover: () => void;
  onDiscoverAll: () => void;
}

export const CityWelcomeModal: React.FC<CityWelcomeModalProps> = ({
  visible,
  cityName,
  savedCount,
  onSavedPlaces,
  onSavedDiscover,
  onDiscoverAll,
}) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={styles.overlay}>
      <View style={styles.card}>
        {/* Icon */}
        <Text style={styles.icon}>📍</Text>

        {/* Welcome */}
        <Text style={styles.welcome}>Welcome to{'\n'}{cityName}!</Text>

        {/* Saved count */}
        <Text style={styles.savedInfo}>
          We see you've saved{' '}
          <Text style={styles.savedBold}>{savedCount} location{savedCount !== 1 ? 's' : ''}</Text>
          {' '}nearby.
        </Text>

        <Text style={styles.prompt}>How would you like to explore?</Text>

        {/* Option 1 — Saved Places */}
        <TouchableOpacity
          style={[styles.option, styles.optionSaved]}
          onPress={onSavedPlaces}
          activeOpacity={0.7}
        >
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>⭐ My Saved Places</Text>
            <Text style={styles.optionSub}>Show only the locations I've planned.</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        {/* Option 2 — Saved + Discover (recommended) */}
        <TouchableOpacity
          style={[styles.option, styles.optionRecommended]}
          onPress={onSavedDiscover}
          activeOpacity={0.7}
        >
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>
              ✨ Saved + Discover{' '}
              <Text style={styles.recommendedBadge}>Recommended</Text>
            </Text>
            <Text style={styles.optionSub}>
              Visit my saved places while discovering unexpected filming locations along the way.
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        {/* Option 3 — Discover Everything */}
        <TouchableOpacity
          style={[styles.option, styles.optionDiscover]}
          onPress={onDiscoverAll}
          activeOpacity={0.7}
        >
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>🎬 Discover Everything</Text>
            <Text style={styles.optionSub}>Show all nearby filming locations.</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  icon: {
    fontSize: 36,
    textAlign: 'center',
    marginBottom: 12,
  },
  welcome: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 30,
  },
  savedInfo: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 4,
  },
  savedBold: {
    color: theme.colors.gold,
    fontWeight: '700',
  },
  prompt: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  optionSaved: {
    backgroundColor: 'rgba(245,197,24,0.06)',
    borderColor: 'rgba(245,197,24,0.15)',
  },
  optionRecommended: {
    backgroundColor: 'rgba(245,197,24,0.10)',
    borderColor: 'rgba(245,197,24,0.25)',
  },
  optionDiscover: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 3,
  },
  recommendedBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.gold,
    backgroundColor: 'rgba(245,197,24,0.20)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  optionSub: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 17,
  },
  chevron: {
    fontSize: 22,
    color: theme.colors.textTertiary,
    marginLeft: 8,
  },
});
