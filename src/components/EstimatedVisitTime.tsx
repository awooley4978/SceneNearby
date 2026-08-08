import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { BottomSheet } from './BottomSheet';
import { isGateAnswered, markLocationVisited, markLocationDismissed, getUserVisitTime, setUserVisitTime } from '../services/StorageService';
import { BucketListSheet } from './BucketListSheet';

interface EstimatedVisitTimeProps {
  time?: string;
  locationId?: string;
}

const TIME_OPTIONS = [
  { key: 'quick', label: 'Quick Stop', emoji: '⚡' },
  { key: 'short', label: 'Short Visit', emoji: '🚶' },
  { key: 'standard', label: 'Standard Visit', emoji: '📸' },
  { key: 'extended', label: 'Extended Visit', emoji: '🏛' },
  { key: 'halfday', label: 'Half Day', emoji: '🌄' },
  { key: 'fullday', label: 'Full Day', emoji: '🌞' },
];

export const EstimatedVisitTime: React.FC<EstimatedVisitTimeProps> = ({ time, locationId }) => {
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  // Gate & time state
  const [loaded, setLoaded] = useState(false);
  const [hasVisited, setHasVisited] = useState(false);
  const [savedTime, setSavedTime] = useState<string | null>(null);
  const [showGate, setShowGate] = useState(false);
  const [showBucketList, setShowBucketList] = useState(false);

  useEffect(() => {
    if (!locationId) return;
    Promise.all([
      isGateAnswered(locationId),
      getUserVisitTime(locationId),
    ]).then(([visited, visitTime]) => {
      setHasVisited(visited);
      if (visitTime) {
        setSavedTime(visitTime);
        setSelectedTime(visitTime);
      }
      setLoaded(true);
    });
  }, [locationId]);

  const cleanTime = (t?: string) => {
    if (!t) return t;
    const idx = t.indexOf('\nVisitor Tip:');
    if (idx >= 0) return t.substring(0, idx).trim();
    const idx2 = t.indexOf('\\nVisitor Tip:');
    if (idx2 >= 0) return t.substring(0, idx2).trim();
    return t;
  };

  const handleTimeSelect = (label: string) => {
    setSelectedTime(label);
    setSavedTime(label);
    if (locationId) {
      setUserVisitTime(locationId, label);
    }
  };

  const handleSummaryTap = () => {
    if (!loaded || !locationId) return;
    if (!hasVisited) {
      setShowGate(true);
    } else {
      setSheetVisible(true);
    }
  };

  const handleVisited = () => {
    if (locationId) {
      markLocationVisited(locationId);
      setHasVisited(true);
    }
    setShowGate(false);
    setSheetVisible(true);
  };

  const handleNotVisited = () => {
    if (locationId) {
      markLocationDismissed(locationId);
      setHasVisited(true);
    }
    setShowGate(false);
    setShowBucketList(true);
  };

  // Summary: user time → default time → prompt
  const summaryText = savedTime
    ? `⏱ You suggested: ${savedTime}`
    : cleanTime(time)
      ? `⏱️ ${cleanTime(time)} · based on travelers`
      : '⏱️ Add visit time';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.summaryRow}
        onPress={handleSummaryTap}
        activeOpacity={0.7}
      >
        <Text style={styles.timeText}>{summaryText}</Text>
      </TouchableOpacity>

      {/* Gate sheet */}
      <BottomSheet
        visible={showGate}
        onClose={() => setShowGate(false)}
        title="Visit Time"
      >
        <View style={styles.gateBody}>
          <Text style={styles.gateText}>Share your experience to help future travelers.</Text>
          <TouchableOpacity
            style={styles.gateVisitedBtn}
            onPress={handleVisited}
            activeOpacity={0.7}
          >
            <Text style={styles.gateVisitedBtnText}>✅ I've Visited</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.gateNotVisitedBtn}
            onPress={handleNotVisited}
            activeOpacity={0.7}
          >
            <Text style={styles.gateNotVisitedBtnText}>🔮 Haven't Been Yet</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* Bucket List Sheet */}
      <BucketListSheet
        visible={showBucketList}
        onClose={() => setShowBucketList(false)}
      />

      {/* Content sheet */}
      <BottomSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        title="How Long to Spend?"
      >
        <View style={styles.buttons}>
          {TIME_OPTIONS.map((opt) => {
            const isSelected = selectedTime === opt.label;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.timePill, isSelected && styles.timePillSelected]}
                onPress={() => handleTimeSelect(opt.label)}
                activeOpacity={0.7}
              >
                <Text style={styles.timePillEmoji}>{opt.emoji}</Text>
                <Text style={[styles.timePillText, isSelected && styles.timePillTextSelected]}>
                  {opt.label}
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
  summaryRow: { paddingVertical: 4 },
  timeText: { fontSize: 14, fontWeight: '500', color: theme.colors.gold },
  // Gate
  gateBody: { alignItems: 'center', gap: 16 },
  gateText: { fontSize: 15, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  gateVisitedBtn: { backgroundColor: theme.colors.gold, paddingVertical: 14, borderRadius: 14, alignItems: 'center', width: '100%' },
  gateVisitedBtnText: { color: theme.colors.black, fontWeight: '700', fontSize: 14 },
  gateNotVisitedBtn: { backgroundColor: theme.colors.surface3, paddingVertical: 14, borderRadius: 14, alignItems: 'center', width: '100%', borderWidth: 1, borderColor: 'rgba(245,197,24,0.2)' },
  gateNotVisitedBtnText: { color: theme.colors.gold, fontWeight: '600', fontSize: 14 },
  // Content
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timePill: {
    backgroundColor: 'rgba(245,197,24,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,197,24,0.25)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 100,
  },
  timePillSelected: { backgroundColor: 'rgba(245,197,24,0.25)', borderColor: theme.colors.gold },
  timePillEmoji: { fontSize: 18, marginBottom: 4 },
  timePillText: { fontSize: 12, fontWeight: '600', color: 'rgba(245,197,24,0.85)' },
  timePillTextSelected: { color: theme.colors.gold },
});
