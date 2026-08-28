import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../theme';
import type { FilmingLocation } from '../models';

/**
 * Render-time secondary titles for a grouped physical location. Uses the same
 * visual language as Discover's "More to Discover" rows (🎬 movie + optional
 * distance). Each title is independently tappable and opens the record's own
 * location detail — it never mutates the underlying records.
 */
interface Props {
  others: FilmingLocation[];
  onPressTitle: (loc: FilmingLocation) => void;
  /** Show a distance suffix per row (Discover feed); omit for map list. */
  showDistance?: boolean;
  getDistance?: (loc: FilmingLocation) => number | null;
}

export const AlsoFilmedHere: React.FC<Props> = ({
  others,
  onPressTitle,
  showDistance = false,
  getDistance,
}) => {
  if (!others || others.length === 0) return null;
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Also filmed here</Text>
      {others.map((loc) => {
        const distance = showDistance && getDistance ? getDistance(loc) : null;
        return (
          <TouchableOpacity
            key={loc.id}
            style={styles.row}
            onPress={() => onPressTitle(loc)}
            activeOpacity={0.7}
          >
            <Text style={styles.movie} numberOfLines={1}>
              🎬 {loc.movieOrShow}
            </Text>
            {distance != null && (
              <Text style={styles.distance}>{Math.round(distance)} mi away</Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    paddingHorizontal: 16,
    paddingBottom: 6,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: theme.colors.surface3,
    marginTop: -1,
    marginBottom: 0,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surface2,
  },
  movie: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginRight: 12,
  },
  distance: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
});
