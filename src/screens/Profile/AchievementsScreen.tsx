import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../theme';
import { BackButton } from '../components/BackButton';
import {
  getAchievements,
  markAchievementsSeen,
  type Achievement,
} from '../services/AchievementService';

export const AchievementsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const list = await getAchievements();
        setAchievements(list);
        setLoading(false);
        // Mark seen so badges don't show "new" indicator next time
        const hasNew = list.some((a) => a.isNew);
        if (hasNew) {
          await markAchievementsSeen();
        }
      })();
    }, []),
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.gold} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BackButton />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>🏆 Achievements</Text>
        <Text style={styles.sub}>
          {achievements.length > 0
            ? `${achievements.length} badge${achievements.length !== 1 ? 's' : ''} earned`
            : 'Visit filming locations to earn badges!'}
        </Text>

        {achievements.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🎬</Text>
            <Text style={styles.emptyTitle}>No badges yet</Text>
            <Text style={styles.emptySub}>
              Mark locations as visited to start earning achievements.
            </Text>
          </View>
        )}

        <View style={styles.grid}>
          {achievements.map((a) => (
            <View key={a.id} style={[styles.badge, a.isNew && styles.badgeNew]}>
              <Text style={styles.badgeEmoji}>{a.emoji}</Text>
              <Text style={styles.badgeTitle}>{a.title}</Text>
              <Text style={styles.badgeDesc}>{a.description}</Text>
              {a.isNew && <Text style={styles.newPill}>NEW</Text>}
              <Text style={styles.badgeDate}>
                {new Date(a.earnedAt).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  content: { padding: 20, paddingBottom: 40 },
  header: { fontSize: 28, fontWeight: '800', color: theme.colors.textPrimary },
  sub: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4, marginBottom: 20 },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },
  emptySub: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badge: {
    width: '47%',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.surface3,
  },
  badgeNew: {
    borderColor: theme.colors.gold,
    backgroundColor: theme.colors.gold + '08',
  },
  badgeEmoji: { fontSize: 32, marginBottom: 8 },
  badgeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  badgeDesc: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  newPill: {
    marginTop: 8,
    fontSize: 10,
    fontWeight: '700',
    color: '#000',
    backgroundColor: theme.colors.gold,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  badgeDate: {
    fontSize: 10,
    color: theme.colors.textTertiary,
    marginTop: 8,
  },
});
