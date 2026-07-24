import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { submitVisitTime, getVisitTimeStats } from '../services/firestore';

interface EstimatedVisitTimeProps {
  time?: string;
  locationId?: string;
}

const TIME_OPTIONS = [
  { key: 'quick', label: 'Quick Stop', detail: '< 15 min' },
  { key: 'short', label: 'Short Visit', detail: '15–30 min' },
  { key: 'standard', label: 'Standard Visit', detail: '30–60 min' },
  { key: 'extended', label: 'Extended Visit', detail: '1–2 hrs' },
  { key: 'halfday', label: 'Half Day', detail: '2–4 hrs' },
];

export const EstimatedVisitTime: React.FC<EstimatedVisitTimeProps> = ({ time, locationId }) => {
  const { user } = useAuth();
  const [liveTime, setLiveTime] = useState<string | null>(null);
  const [userSelection, setUserSelection] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!locationId) return;
    getVisitTimeStats(locationId).then((t) => {
      if (t) setLiveTime(t);
    }).catch(() => {});
  }, [locationId]);

  const handleSelect = useCallback(async (timeRange: string) => {
    if (!locationId || !user || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const mostCommon = await submitVisitTime(locationId, user.uid, timeRange);
      setLiveTime(mostCommon);
      setUserSelection(timeRange);
    } catch {}
    setIsSubmitting(false);
  }, [locationId, user, isSubmitting]);

  const display = liveTime ?? time;

  return (
    <View style={styles.container}>
      {display ? (
        <View>
          <Text style={styles.timeText}>⏱️ {display}</Text>
          <Text style={styles.subtext}>based on travelers</Text>
        </View>
      ) : (
        <Text style={styles.emptyText}>⏱️ No visit time data</Text>
      )}

      {/* Time selector */}
      <View style={styles.buttons}>
        {TIME_OPTIONS.map((opt) => {
          const isSelected = userSelection === opt.detail;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[styles.timePill, isSelected && styles.timePillSelected]}
              onPress={() => handleSelect(opt.detail)}
              activeOpacity={0.7}
              disabled={isSubmitting}
            >
              <Text style={[styles.timePillText, isSelected && styles.timePillTextSelected]}>
                {opt.label}
              </Text>
              <Text style={[styles.timePillDetail, isSelected && styles.timePillTextSelected]}>
                {opt.detail}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 10 },
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
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timePill: {
    backgroundColor: 'rgba(245,197,24,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,197,24,0.25)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignItems: 'center',
  },
  timePillSelected: {
    backgroundColor: 'rgba(245,197,24,0.25)',
    borderColor: theme.colors.gold,
  },
  timePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(245,197,24,0.85)',
  },
  timePillDetail: {
    fontSize: 10,
    fontWeight: '400',
    color: 'rgba(245,197,24,0.6)',
    marginTop: 2,
  },
  timePillTextSelected: {
    color: theme.colors.gold,
  },
});
