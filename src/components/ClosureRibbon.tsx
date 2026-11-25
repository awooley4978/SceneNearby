import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/** Brand red used for every closure / announcement treatment. */
export const CLOSURE_RED = '#C62828';

interface ClosureRibbonProps {
  /** Text shown across the corner. Rendered uppercase + bold + white. */
  label: string;
  /** Length of each side of the clipped corner box. */
  size?: number;
  /** Font size of the ribbon text. */
  fontSize?: number;
}

/**
 * Diagonal corner ribbon pinned to the top-right of its (position: relative)
 * parent. The band is rotated 45° and clipped by a square overflow-hidden box,
 * so it never spills past the corner. Always pointerEvents="none" so anything
 * underneath (e.g. the detail screen's BackButton) stays tappable.
 */
export const ClosureRibbon: React.FC<ClosureRibbonProps> = ({
  label,
  size = 124,
  fontSize = 12,
}) => {
  const bandHeight = Math.round(fontSize * 2.3);
  const bandWidth = Math.round(size * 1.5);

  return (
    <View
      style={[styles.clip, { width: size, height: size }]}
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <View
        style={[
          styles.band,
          {
            width: bandWidth,
            height: bandHeight,
            top: (size - bandHeight) / 2,
            left: (size - bandWidth) / 2,
          },
        ]}
      >
        <Text
          style={[styles.label, { fontSize, lineHeight: bandHeight }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.55}
          allowFontScaling={false}
        >
          {label.toUpperCase()}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  clip: {
    position: 'absolute',
    top: 0,
    right: 0,
    overflow: 'hidden',
    zIndex: 4,
  },
  band: {
    position: 'absolute',
    backgroundColor: CLOSURE_RED,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '45deg' }],
  },
  label: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.8,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
});
