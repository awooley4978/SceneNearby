import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface WorthTheVisitProps {
  percentage?: number;
  votes?: number;
}

export const WorthTheVisit: React.FC<WorthTheVisitProps> = ({ percentage, votes }) => {
  // No data — show inviting empty state
  if (percentage === undefined || votes === undefined) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>👍 Worth the Visit</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            No community votes yet for this location.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>👍 Worth the Visit</Text>
      <View style={styles.ratingRow}>
        <View style={styles.percentageContainer}>
          <Text style={styles.percentage}>{percentage}%</Text>
          <Text style={styles.sublabel}>say it's worth a stop</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.percentageContainer}>
          <Text style={styles.voteCount}>{votes.toLocaleString()}</Text>
          <Text style={styles.sublabel}>Scene Nearby votes</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginTop: 24 },
  heading: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 12 },
  ratingRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.surface2, borderRadius: 12, padding: 14,
  },
  percentageContainer: { flex: 1, alignItems: 'center' },
  percentage: { fontSize: 28, fontWeight: '800', color: theme.colors.gold },
  voteCount: { fontSize: 22, fontWeight: '700', color: theme.colors.textPrimary },
  sublabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 4, textAlign: 'center' },
  divider: { width: 1, height: 36, backgroundColor: theme.colors.surface3 },
  emptyState: {
    backgroundColor: theme.colors.surface2, borderRadius: 12, padding: 20, alignItems: 'center',
  },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyText: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
