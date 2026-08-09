import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface StarRatingProps {
  rating: number;
  count?: number;
  size?: number;
  interactive?: boolean;
  onRate?: (rating: number) => void;
  showCount?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  count,
  size = 16,
  interactive = false,
  onRate,
  showCount = true,
}) => {
  const [hoveredStar, setHoveredStar] = useState(0);
  const displayRating = hoveredStar || rating;

  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const filled = i <= Math.round(displayRating);
    stars.push(
      <TouchableOpacity
        key={i}
        onPress={() => interactive && onRate?.(i)}
        onPressIn={() => interactive && setHoveredStar(i)}
        disabled={!interactive}
        activeOpacity={0.6}
      >
        <Text style={[styles.star, { fontSize: size }, filled ? styles.starFilled : styles.starEmpty]}>
          ★
        </Text>
      </TouchableOpacity>,
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.starsRow}>{stars}</View>
      {showCount && count !== undefined && (
        <Text style={styles.count}>({count})</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  star: {
    color: theme.colors.textTertiary,
  },
  starFilled: {
    color: theme.colors.gold,
  },
  starEmpty: {
    color: theme.colors.surface3,
  },
  count: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    fontWeight: '500',
  },
});
