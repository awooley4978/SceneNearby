import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface EstimatedVisitTimeProps {
  time?: string;
}

export const EstimatedVisitTime: React.FC<EstimatedVisitTimeProps> = ({ time }) => {
  // No data — show inviting empty state
  if (!time) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>⏱️ Estimated Visit Time</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>⏱️</Text>
          <Text style={styles.emptyText}>
            No visit time data available yet for this location.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>⏱️ Estimated Visit Time</Text>
      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{time}</Text>
        <Text style={styles.timeSub}>based on traveler reports</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginTop: 24 },
  heading: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 12 },
  timeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.colors.surface2, borderRadius: 12, padding: 14,
  },
  timeText: { fontSize: 22, fontWeight: '700', color: theme.colors.gold },
  timeSub: { fontSize: 12, color: theme.colors.textSecondary },
  emptyState: {
    backgroundColor: theme.colors.surface2, borderRadius: 12, padding: 20, alignItems: 'center',
  },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyText: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
