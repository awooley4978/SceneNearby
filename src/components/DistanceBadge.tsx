import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface DistanceBadgeProps {
  /** Distance in miles */
  distanceMiles: number;
}

/** Format a distance in miles to a human-readable string */
const formatMiles = (miles: number): string => {
  if (!isFinite(miles) || isNaN(miles)) {
    return '';
  }
  if (miles < 0.1) {
    const feet = Math.round(miles * 5280);
    return `${feet}ft`;
  }
  return `${miles.toFixed(1)}mi`;
};

export const DistanceBadge: React.FC<DistanceBadgeProps> = ({ distanceMiles }) => {
  const formatted = formatMiles(distanceMiles);
  return (
    <View style={styles.badge}>
      <Text style={styles.distance}>{formatted}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: theme.colors.surface3 + 'E6',
    borderRadius: 8,
  },
  distance: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
});