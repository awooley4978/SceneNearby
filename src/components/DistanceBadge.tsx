import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface DistanceBadgeProps {
  distance: string;
}

export const DistanceBadge: React.FC<DistanceBadgeProps> = ({ distance }) => {
  return (
    <View style={styles.badge}>
      <Text style={styles.distance}>{distance}</Text>
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
