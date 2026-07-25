import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface MoviePosterProps {
  title: string;
  emoji?: string;
  size?: 'mini' | 'small' | 'medium' | 'large' | 'hero';
  isMovie?: boolean;
  category?: string;
}

const posterSizes = {
  mini: { width: 28, height: 40, fontSize: 14 },
  small: { width: 40, height: 56, fontSize: 20 },
  medium: { width: 60, height: 84, fontSize: 28 },
  large: { width: 80, height: 112, fontSize: 36 },
  hero: { width: 100, height: 140, fontSize: 44 },
};

export const MoviePoster: React.FC<MoviePosterProps> = ({
  title,
  emoji = '🎬',
  size = 'medium',
}) => {
  const dims = posterSizes[size];
  return (
    <View style={[styles.poster, { width: dims.width, height: dims.height }]}>
      <Text style={{ fontSize: dims.fontSize }}>{emoji}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  poster: {
    borderRadius: 8,
    backgroundColor: theme.colors.surface3,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
});
