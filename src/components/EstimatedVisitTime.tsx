import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { BottomSheet } from './BottomSheet';
import { VisitGateSheet } from './VisitGateSheet';
import { BucketListSheet } from './BucketListSheet';
import { isLocationVisited, markLocationVisited, getUserVote, setUserVote } from '../services/StorageService';

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

  // Gate state
  const [gateLoaded, setGateLoaded] = useState(false);
  const [hasVisited, setHasVisited] = useState(false);
  const [suggestedTime, setSuggestedTime] = useState<string | null>(null);
  const [showGate, setShowGate] = useState(false);
  const [showBucketList, setShowBucketList] = useState(false);

  // Load gate answer and existing vote on mount
  useEffect(() => {
    if (!locationId) return;
    Promise.all([
      isLocationVisited(locationId),
      getUserVote(locationId),
    ]).then(([visited, voteData]) => {
      setHasVisited(visited);
      if (voteData?.visitTime) {
        setSelectedTime(voteData.visitTime);
        setSuggestedTime(voteData.visitTime);
      }
      setGateLoaded(true);
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
    setSuggestedTime(label);
    if (locationId) {
      setUserVote(locationId, { visitTime: label });
    }
  };

  const handleSummaryTap = () => {
    if (!gateLoaded || !locationId) return;

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
    setSheetVisible(true);
  };

  const handleNotVisited = () => {
    setShowBucketList(true);
  };

  // Summary: show own suggestion if set, else default time or prompt
  const summaryText = suggestedTime
    ? `⏱ You suggested: ${suggestedTime}`
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

      {/* Gate Sheet */}
      <VisitGateSheet
        visible={showGate}
        onClose={() => setShowGate(false)}
        title="Visit Time"
        onVisited={handleVisited}
        onNotVisited={handleNotVisited}
      />

      {/* Bucket List Sheet */}
      <BucketListSheet
        visible={showBucketList}
        onClose={() => setShowBucketList(false)}
      />

      {/* Content Bottom Sheet */}
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
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 100,
  },
  timePillSelected: {
    backgroundColor: 'rgba(245,197,24,0.25)',
    borderColor: theme.colors.gold,
  },
  timePillEmoji: {
    fontSize: 18,
    marginBottom: 4,
  },
  timePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(245,197,24,0.85)',
  },
  timePillTextSelected: {
    color: theme.colors.gold,
  },
});
