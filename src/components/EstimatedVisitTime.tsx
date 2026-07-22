import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface EstimatedVisitTimeProps {
  time?: string;
  locationId?: string;
}

export const EstimatedVisitTime: React.FC<EstimatedVisitTimeProps> = ({ time, locationId }) => {
  const [liveTime, setLiveTime] = useState<string | null>(null);

  useEffect(() => {
    if (!locationId) return;
    import('../services/firestore').then(({ getVisitTimeStats }) => {
      getVisitTimeStats(locationId).then((t) => {
        if (t) setLiveTime(t);
      }).catch(() => {});
    });
  }, [locationId]);

  const display = liveTime ?? time;

  // No data
  if (!display) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>⏱️ No visit time data</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.timeText}>⏱️ {display}</Text>
      <Text style={styles.subtext}>based on travelers</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  timeText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  subtext: {
    fontSize: 10,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textTertiary,
  },
});
