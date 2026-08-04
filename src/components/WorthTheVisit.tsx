import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { submitWorthItVote, getWorthItStats, WorthItVote, WorthItStats } from '../services/firestore';
import { BottomSheet } from './BottomSheet';
import { VisitGateSheet } from './VisitGateSheet';
import { BucketListSheet } from './BucketListSheet';
import { isLocationVisited, markLocationVisited, getUserVote, setUserVote } from '../services/StorageService';

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
  const [userVote, setUserVoteState] = useState<WorthItVote | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);

  // Gate state
  const [gateLoaded, setGateLoaded] = useState(false);
  const [hasVisited, setHasVisited] = useState(false);
  const [votedLabel, setVotedLabel] = useState<string | null>(null);
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
      if (voteData?.worthItVote) {
        setUserVoteState(voteData.worthItVote as WorthItVote);
        setVotedLabel(voteData.worthItLabel ?? null);
      }
      setGateLoaded(true);
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
    setUserVoteState(vote);
    const label = VOTE_OPTIONS.find((o) => o.key === vote)?.label ?? '';
    setVotedLabel(label);

    // Persist vote locally
    setUserVote(locationId, { worthItVote: vote, worthItLabel: label });

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
    // Never persist 'not_visited' — gate re-appears next time
    setShowBucketList(true);
  };

  const hasData = liveStats && liveStats.total > 0;

  // Summary text: show own contribution if voted, else community stat
  const summaryText = votedLabel
    ? `👍 You voted: ${votedLabel}`
    : hasData
      ? `👍 ${liveStats!.worthItPercent}% worth it · ${liveStats!.total.toLocaleString()} votes`
      : '👍 No ratings yet · Tap to rate';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.summaryRow}
        onPress={handleSummaryTap}
        activeOpacity={0.7}
      >
        <Text style={styles.summaryText}>{summaryText}</Text>
      </TouchableOpacity>

      {/* Gate Sheet */}
      <VisitGateSheet
        visible={showGate}
        onClose={() => setShowGate(false)}
        title="Worth the Visit"
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
  divider: {
    height: 1,
    backgroundColor: theme.colors.surface3,
    marginVertical: 8,
  },
  rateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
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
