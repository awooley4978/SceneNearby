import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { submitWorthItVote, getWorthItStats, WorthItVote, WorthItStats } from '../services/firestore';

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

  useEffect(() => {
    if (!locationId) return;
    getWorthItStats(locationId).then((stats) => {
      if (stats) setLiveStats(stats);
    }).catch(() => {});
  }, [locationId]);

  const handleVote = useCallback(async (vote: WorthItVote) => {
    if (!locationId || !user || isVoting) return;
    setIsVoting(true);
    try {
      const stats = await submitWorthItVote(locationId, user.uid, vote);
      setLiveStats(stats);
      setUserVote(vote);
    } catch {}
    setIsVoting(false);
  }, [locationId, user, isVoting]);

  const hasData = liveStats && liveStats.total > 0;

  return (
    <View style={styles.container}>
      {/* Summary line */}
      {hasData ? (
        <Text style={styles.summaryText}>
          👍 {liveStats!.worthItPercent}% Worth the Visit · {liveStats!.total.toLocaleString()} votes
        </Text>
      ) : (
        <Text style={styles.emptyText}>👍 No votes yet</Text>
      )}

      {/* Breakdown */}
      {hasData && (
        <View style={styles.breakdown}>
          <Text style={styles.breakdownText}>
            🌟 {liveStats!.absolutely}% Absolutely
          </Text>
          <Text style={styles.breakdownText}>
            👍 {liveStats!.nearby}% Worth It If Nearby
          </Text>
          <Text style={styles.breakdownText}>
            🎬 {liveStats!.bigFan}% Only If a Big Fan
          </Text>
        </View>
      )}

      {/* Vote buttons */}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 10 },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.gold,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textTertiary,
  },
  breakdown: {
    gap: 3,
  },
  breakdownText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  votePill: {
    backgroundColor: 'rgba(245,197,24,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,197,24,0.25)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  votePillSelected: {
    backgroundColor: 'rgba(245,197,24,0.25)',
    borderColor: theme.colors.gold,
  },
  votePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(245,197,24,0.85)',
  },
  votePillTextSelected: {
    color: theme.colors.gold,
  },
});
