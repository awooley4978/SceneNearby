import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { submitWorthItVote, getWorthItStats, WorthItVote, WorthItStats } from '../services/firestore';
import { BottomSheet } from './BottomSheet';
import { isLocationVisited, markLocationVisited, getUserWorthItVote, setUserWorthItVote, WorthItVoteData } from '../services/StorageService';
import { BucketListSheet } from './BucketListSheet';

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

  // Gate & vote state
  const [loaded, setLoaded] = useState(false);
  const [hasVisited, setHasVisited] = useState(false);
  const [savedVote, setSavedVote] = useState<WorthItVoteData | null>(null);
  const [showGate, setShowGate] = useState(false);
  const [showBucketList, setShowBucketList] = useState(false);

  useEffect(() => {
    if (!locationId) return;
    Promise.all([
      isLocationVisited(locationId),
      getUserWorthItVote(locationId),
    ]).then(([visited, voteData]) => {
      setHasVisited(visited);
      if (voteData) {
        setSavedVote(voteData);
        setUserVote(voteData.key as WorthItVote);
      }
      setLoaded(true);
    });
  }, [locationId]);

  useEffect(() => {
    if (!locationId) return;
    getWorthItStats(locationId).then((stats) => {
      if (stats) setLiveStats(stats);
    }).catch((e) => { console.error('WorthIt stats:', e); });
  }, [locationId]);

  const handleVote = useCallback(async (vote: WorthItVote) => {
    if (!locationId || !user || isVoting) return;
    setIsVoting(true);

    const opt = VOTE_OPTIONS.find((o) => o.key === vote)!;
    setUserVote(vote);
    setSavedVote({ key: opt.key, label: opt.label, emoji: opt.emoji });
    setUserWorthItVote(locationId, { key: opt.key, label: opt.label, emoji: opt.emoji });

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
    // Never persist — gate re-appears next tap
    setShowGate(false);
    setShowBucketList(true);
  };

  const hasData = liveStats && liveStats.total > 0;

  // Summary: user vote → positive-only stat → empty state
  const summaryText = savedVote
    ? `👍 You voted: ${savedVote.label}`
    : hasData
      ? `⭐ ${liveStats!.absolutely}% say: Absolutely Worth It · ${liveStats!.total.toLocaleString()} votes`
      : '⭐ Be the first to vote';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.summaryRow}
        onPress={handleSummaryTap}
        activeOpacity={0.7}
      >
        <Text style={styles.summaryText}>{summaryText}</Text>
      </TouchableOpacity>

      {/* Gate sheet */}
      <BottomSheet
        visible={showGate}
        onClose={() => setShowGate(false)}
        title="Worth the Visit"
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
        title="Is This Worth the Visit?"
      >
        {hasData && (
          <View style={styles.breakdown}>
            <Text style={styles.breakdownText}>🌟 {liveStats!.absolutely}% Absolutely</Text>
            <Text style={styles.breakdownText}>👍 {liveStats!.nearby}% Worth It If Nearby</Text>
            <Text style={styles.breakdownText}>🎬 {liveStats!.bigFan}% Only If a Big Fan</Text>
          </View>
        )}

        <View style={styles.divider} />

        <Text style={styles.rateLabel}>How would YOU rate it?</Text>

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
  summaryRow: { paddingVertical: 4 },
  summaryText: { fontSize: 14, fontWeight: '500', color: theme.colors.gold },
  // Gate
  gateBody: { alignItems: 'center', gap: 16 },
  gateText: { fontSize: 15, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  gateVisitedBtn: { backgroundColor: theme.colors.gold, paddingVertical: 14, borderRadius: 14, alignItems: 'center', width: '100%' },
  gateVisitedBtnText: { color: theme.colors.black, fontWeight: '700', fontSize: 14 },
  gateNotVisitedBtn: { backgroundColor: theme.colors.surface3, paddingVertical: 14, borderRadius: 14, alignItems: 'center', width: '100%', borderWidth: 1, borderColor: 'rgba(245,197,24,0.2)' },
  gateNotVisitedBtnText: { color: theme.colors.gold, fontWeight: '600', fontSize: 14 },
  // Content
  breakdown: { gap: 4, marginBottom: 4 },
  breakdownText: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 22 },
  divider: { height: 1, backgroundColor: theme.colors.surface3, marginVertical: 8 },
  rateLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: 4 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  votePill: {
    backgroundColor: 'rgba(245,197,24,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,197,24,0.25)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  votePillSelected: { backgroundColor: 'rgba(245,197,24,0.25)', borderColor: theme.colors.gold },
  votePillText: { fontSize: 13, fontWeight: '600', color: 'rgba(245,197,24,0.85)' },
  votePillTextSelected: { color: theme.colors.gold },
});
