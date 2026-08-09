import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { LocationCategory, categoryColors, categoryIcons } from '../models';

interface CategoryBadgeProps {
  category: LocationCategory;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category }) => {
  const color = categoryColors[category];
  return (
    <View style={[styles.badge, { backgroundColor: color + '26' }]}>
      <Text style={[styles.text, { color }]}>{category}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});
