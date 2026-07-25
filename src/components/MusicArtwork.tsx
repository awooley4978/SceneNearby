import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface MusicArtworkProps {
  title: string;
  emoji?: string;
  size?: 'mini' | 'small' | 'medium' | 'large' | 'hero';
  isAlbum?: boolean;
  category?: string;
}

const posterSizes = {
  mini: { width: 28, height: 40, fontSize: 14 },
  small: { width: 40, height: 56, fontSize: 20 },
  medium: { width: 60, height: 84, fontSize: 28 },
  large: { width: 80, height: 112, fontSize: 36 },
  hero: { width: 100, height: 140, fontSize: 44 },
};

export const MusicArtwork: React.FC<MusicArtworkProps> = ({
  title,
  emoji = '🎵',
  size = 'medium',
  isAlbum = true,
}) => {
  const dims = posterSizes[size];
  const showGroove = size === 'medium' || size === 'large' || size === 'hero';

  return (
    <View style={[styles.artwork, { width: dims.width, height: dims.height }]}>
      <Text style={{ fontSize: dims.fontSize }}>{emoji}</Text>
      {showGroove && (
        <View style={styles.groove} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  artwork: {
    borderRadius: 12,
    backgroundColor: theme.colors.surface2,
    borderWidth: 1,
    borderColor: theme.colors.gold + '30',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  groove: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.gold,
  },
});
