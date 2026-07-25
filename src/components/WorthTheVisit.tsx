import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { submitWorthItVote, getWorthItStats, WorthItVote, WorthItStats } from '../services/firestore';
import { BottomSheet } from './BottomSheet';

interface WorthTheVisitProps {
  percentage?: number;
  votes?: number;
  locationId?: string;
}

const VOTE_OPTIONS: { key: WorthItVote; label: string; emoji: string }[] = [
  { key: 'absolutely', label: 'Absolutely!', emoji: '🌟' },
  { key: 'nearby', label: 'Worth It If Nearby', emoji: '👍' },
  { key: 'big_fan', label: 'Only If a Big Fan', emoji: '🎬' },
];

export const WorthTheVisit: React.FC<WorthTheVisitProps> = ({ percentage, votes, locationId }) => {
  const { user } = useAuth();
  const [liveStats, setLiveStats] = useState<WorthItStats | null>(null);
  const [userVote, setUserVote] = useState<WorthItVote | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);

  useEffect(() => {
    if (!locationId) return;
    getWorthItStats(locationId).then((stats) => {
      if (stats) setLiveStats(stats);
    }).catch((e) => { console.error('WorthIt stats:', e); });
  }, [locationId]);

  const handleVote = useCallback(async (vote: WorthItVote) => {
    if (!locationId || !user || isVoting) return;
    setIsVoting(true);
    // Optimistic: update UI instantly
    setUserVote(vote);
    const optimisticStats = liveStats
      ? { ...liveStats, total: liveStats.total + 1, worthItPercent: Math.round(((liveStats.absolutely + liveStats.nearby + (vote === 'absolutely' ? 1 : vote === 'nearby' ? 1 : 0)) / (liveStats.total + 1)) * 100) }
      : { absolutely: vote === 'absolutely' ? 100 : 0, nearby: vote === 'nearby' ? 100 : 0, bigFan: vote === 'big_fan' ? 100 : 0, total: 1, worthItPercent: vote === 'big_fan' ? 0 : 100 };
    setLiveStats(optimisticStats);
    try {
      const stats = await submitWorthItVote(locationId, user.uid, vote);
      setLiveStats(stats);
    } catch (e) { console.error('WorthIt vote:', e); }
    setIsVoting(false);
  }, [locationId, user, isVoting, liveStats]);

  const hasData = liveStats && liveStats.total > 0;

  return (
    <View style={styles.container}>
      {/* Compact summary row */}
      <TouchableOpacity
        style={styles.summaryRow}
        onPress={() => setSheetVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.summaryText}>
          {hasData
            ? `👍 ${liveStats!.worthItPercent}% worth it · ${liveStats!.total.toLocaleString()} votes`
            : '👍 No ratings yet · Tap to rate'}
        </Text>
      </TouchableOpacity>

      {/* Bottom Sheet */}
      <BottomSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        title="Is This Worth the Visit?"
      >
        {hasData && (
          <View style={styles.breakdown}>
            <Text style={styles.breakdownText}>🌟 {liveStats!.absolutely}% Absolutely</Text>
            <Text style={styles.breakdownText}>👍 {liveStats!.nearby}% Worth It If Nearby</Text>
            <Text style={styles.breakdownText}>🎬 {liveStats!.bigFan}% Only If a Big Fan</Text>
          </View>
        )}
        <View style={styles.buttons}>
          {VOTE_OPTIONS.map((opt) => {
            const isSelected = userVote === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.votePill, isSelected && styles.votePillSelected]}
                onPress={() => handleVote(opt.key)}
                activeOpacity={0.7}
                disabled={isVoting}
              >
                <Text style={[styles.votePillText, isSelected && styles.votePillTextSelected]}>
                  {opt.emoji} {opt.label}
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
  summaryText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.gold,
  },
  breakdown: {
    gap: 4,
    marginBottom: 4,
  },
  breakdownText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  votePill: {
    backgroundColor: 'rgba(245,197,24,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,197,24,0.25)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  votePillSelected: {
    backgroundColor: 'rgba(245,197,24,0.25)',
    borderColor: theme.colors.gold,
  },
  votePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(245,197,24,0.85)',
  },
  votePillTextSelected: {
    color: theme.colors.gold,
  },
});
