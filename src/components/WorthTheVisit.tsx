import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface WorthTheVisitProps {
  percentage?: number;
  votes?: number;
  locationId?: string;
}

export const WorthTheVisit: React.FC<WorthTheVisitProps> = ({ percentage, votes, locationId }) => {
  const [liveStats, setLiveStats] = useState<{ percentage: number; votes: number } | null>(null);

  useEffect(() => {
    if (!locationId) return;
    import('../services/firestore').then(({ getWorthItStats }) => {
      getWorthItStats(locationId).then((stats) => {
        if (stats) setLiveStats(stats);
      }).catch(() => {});
    });
  }, [locationId]);

  const display = liveStats ?? (percentage !== undefined && votes !== undefined ? { percentage, votes } : null);

  // No data
  if (!display) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>👍 No votes yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.rowText}>
        👍 {display.percentage}% Worth the Visit · {display.votes.toLocaleString()} votes
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  rowText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textTertiary,
  },
});
