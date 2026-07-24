import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { BottomSheet } from './BottomSheet';

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

export const EstimatedVisitTime: React.FC<EstimatedVisitTimeProps> = ({ time }) => {
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const display = selectedTime ?? time;

  return (
    <View style={styles.container}>
      {/* Compact summary row */}
      <TouchableOpacity
        style={styles.summaryRow}
        onPress={() => setSheetVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.timeText}>
          {display ? `⏱️ ${display} · based on travelers` : '⏱️ Add visit time'}
        </Text>
      </TouchableOpacity>

      {/* Bottom Sheet */}
      <BottomSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        title="How Long to Spend?"
      >
        <View style={styles.buttons}>
          {TIME_OPTIONS.map((opt) => {
            const isSelected = selectedTime === opt.detail;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.timePill, isSelected && styles.timePillSelected]}
                onPress={() => setSelectedTime(opt.detail)}
                activeOpacity={0.7}
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
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  summaryRow: {
    paddingVertical: 4,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.gold,
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
    paddingVertical: 8,
    alignItems: 'center',
  },
  timePillSelected: {
    backgroundColor: 'rgba(245,197,24,0.25)',
    borderColor: theme.colors.gold,
  },
  timePillText: {
    fontSize: 13,
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
