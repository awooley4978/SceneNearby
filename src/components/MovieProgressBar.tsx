import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface Props {
  visitedCount: number;
  totalCount: number;
  isComplete: boolean;
  previousComplete?: boolean;
  compact?: boolean;
}

export const MovieProgressBar: React.FC<Props> = ({
  visitedCount,
  totalCount,
  isComplete,
  previousComplete = false,
  compact = false,
}) => {
  const pct = totalCount > 0 ? Math.round((visitedCount / totalCount) * 100) : 0;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.row, compact && styles.rowCompact]}>
        <Text style={[styles.label, compact && styles.labelCompact]}>
          {isComplete ? '🎉' : previousComplete ? '⚠️' : '🎥'}
        </Text>
        <Text style={[styles.count, compact && styles.countCompact]}>
          {visitedCount} / {totalCount}
        </Text>
        <Text style={[styles.suffix, compact && styles.suffixCompact]}>
          {isComplete ? ' Complete' : ' Visited'}
        </Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${pct}%`,
              backgroundColor: isComplete
                ? theme.colors.gold
                : previousComplete
                ? '#F59E0B'
                : theme.colors.gold + '60',
            },
          ]}
        />
      </View>
      {previousComplete && !isComplete && !compact && (
        <Text style={styles.regression}>
          A new location was added! Visit one more to regain 100%.
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowCompact: { gap: 4 },
  label: { fontSize: 14 },
  labelCompact: { fontSize: 12 },
  count: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  countCompact: { fontSize: 12 },
  suffix: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  suffixCompact: { fontSize: 11 },
  track: {
    height: 6,
    backgroundColor: theme.colors.surface3,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  regression: {
    fontSize: 12,
    color: '#F59E0B',
    fontStyle: 'italic',
    marginTop: 2,
  },
});
