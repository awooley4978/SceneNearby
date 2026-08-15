import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { computeAdminStats, type AdminStats } from '../../services/AdminService';
import { useAllLocationsFull } from '../../services/hooks';
import { apiClient, type PhotoSubmission } from '../../services/api';

const ADMIN_EMAILS = ['awooley4978@gmail.com', 'scenenearbysupport@gmail.com'];

type StatKey = 'missingPhotos' | 'missingDescriptions' | 'pendingTips' | 'pendingApproval' | 'reportedPhotos';

interface StatCard {
  key: StatKey;
  emoji: string;
  label: string;
  value: number;
  color: string;
}

export const AdminDashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const {
    locations: allLocations,
    error: locationsError,
    refetch: refetchLocations,
  } = useAllLocationsFull();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingSubmissions, setPendingSubmissions] = useState<PhotoSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    // Compute stats from the location list (arrives via useAllLocations) plus
    // the pending-moderation count from the API. Re-runs when locations load
    // or when the user hits Retry.
    apiClient
      .getStats()
      .then((apiStats) => {
        if (cancelled) return;
        setStats(computeAdminStats(apiStats?.pending_moderation ?? 0, allLocations));
        setStatsError(null);
      })
      .catch(() => {
        if (cancelled) return;
        // Keep last-known-good numbers; a transient failure must never read as an empty database.
        setStats((prev) => prev ?? computeAdminStats(0, allLocations));
        setStatsError('Could not reach the server for live stats. Showing last-known-good numbers.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    // Fetch the pending submissions themselves so "Photos Awaiting Approval"
    // opens a real list instead of an empty one (server count = list length).
    apiClient
      .getSubmissions('pending')
      .then((subs) => {
        if (!cancelled) setPendingSubmissions(subs);
      })
      .catch(() => {
        /* count still comes from getStats; list just stays empty on failure */
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, allLocations, retryTick]);
  const handleRetry = () => {
    refetchLocations();
    setRetryTick((t) => t + 1);
  };

  if (!isAdmin) {
    return (
      <View style={styles.centered}>
        <Text style={styles.lockEmoji}>🔒</Text>
        <Text style={styles.deniedTitle}>Access Denied</Text>
        <Text style={styles.deniedText}>This area is restricted to administrators.</Text>
        {user?.email && (
          <Text style={styles.deniedEmail}>Signed in as: {user.email}</Text>
        )}
      </View>
    );
  }

  if (loading || !stats) {
    if (loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.gold} />
        </View>
      );
    }
    // No data at all — explicit error + Retry, never a fake zero grid.
    return (
      <View style={styles.centered}>
        <Text style={styles.lockEmoji}>📡</Text>
        <Text style={styles.deniedTitle}>Couldn't load the dashboard</Text>
        <Text style={styles.deniedText}>
          {locationsError || statsError || 'Something went wrong while loading stats.'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const cards: StatCard[] = [
    { key: 'missingPhotos', emoji: '📸', label: 'Missing Photos', value: stats.missingPhotos, color: '#EF4444' },
    { key: 'missingDescriptions', emoji: '📝', label: 'Missing Descriptions', value: stats.missingDescriptions, color: '#F59E0B' },
    { key: 'pendingTips', emoji: '💬', label: 'Pending Community Tips', value: stats.pendingTips, color: '#3B82F6' },
    { key: 'pendingApproval', emoji: '📷', label: 'Photos Awaiting Approval', value: stats.pendingApproval, color: '#8B5CF6' },
    { key: 'reportedPhotos', emoji: '👍', label: 'Reported Photos', value: stats.reportedPhotos, color: '#EC4899' },
  ];

  const handleDetail = (key: StatKey) => {
    let items: any[] = [];
    switch (key) {
      case 'missingPhotos':
        items = stats.missingPhotoItems;
        break;
      case 'missingDescriptions':
        items = stats.missingDescriptionItems;
        break;
      case 'pendingApproval':
        // Real pending submissions — the dashboard count (stats.pendingApproval)
        // and this list both come from the server's status='pending' query.
        items = pendingSubmissions;
        break;
      default:
        items = [];
    }
    navigation.navigate('AdminDetail', { type: key, label: cards.find((c) => c.key === key)?.label, items });
  };

  return (
    <View style={styles.container}>
      {/* Fixed header bar — keeps Back tappable and clear of the status bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Profile'))}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Admin</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>🛡️</Text>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSub}>Scene Nearby content health</Text>
        </View>

      {(locationsError || statsError) && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            ⚠️ {locationsError ? `Couldn't load locations: ${locationsError}` : statsError}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Completion bar */}
      <View style={styles.completionSection}>
        <View style={styles.completionHeader}>
          <Text style={styles.completionLabel}>Data Completeness</Text>
          <Text style={styles.completionPercent}>{stats.completionPercentage}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${stats.completionPercentage}%` }]} />
        </View>
        <Text style={styles.completionSub}>
          {stats.totalLocations} total locations • target 100%
        </Text>
      </View>

      {/* Total locations card */}
      <TouchableOpacity
        style={styles.totalCard}
        onPress={() =>
          navigation.navigate('AdminDetail', {
            type: 'allLocations',
            label: 'All Locations',
            items: allLocations,
          })
        }
      >
        <Text style={styles.totalEmoji}>📍</Text>
        <View>
          <Text style={styles.totalLabel}>Total Locations</Text>
          <Text style={styles.totalValue}>{stats.totalLocations}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      {/* Location Research entry — reads Firestore research_* collections (web
          Admin parity: staging /admin → Location Research) */}
      <TouchableOpacity
        style={styles.totalCard}
        onPress={() => navigation.navigate('AdminResearch')}
      >
        <Text style={styles.totalEmoji}>🔬</Text>
        <View>
          <Text style={styles.totalLabel}>Location Research</Text>
          <Text style={styles.totalSub}>Review & approve research candidates</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      {/* Stat cards grid */}
      <View style={styles.grid}>
        {cards.map((card) => (
          <TouchableOpacity
            key={card.key}
            style={[styles.card, { borderLeftColor: card.color }]}
            onPress={() => handleDetail(card.key)}
            activeOpacity={0.7}
          >
            <Text style={styles.cardEmoji}>{card.emoji}</Text>
            <Text style={[styles.cardValue, { color: card.color }]}>{card.value}</Text>
            <Text style={styles.cardLabel}>{card.label}</Text>
            <Text style={styles.cardHint}>Tap to view ›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Scene Nearby Admin • v1.0</Text>
      </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 16, paddingBottom: 40 },

  // Header
  header: { alignItems: 'center', paddingVertical: 24 },
  headerEmoji: { fontSize: 40, marginBottom: 8 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: theme.colors.gold },
  headerSub: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 },

  // Top bar (fixed header)
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surface3,
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 12,
  },
  backText: { fontSize: 16, color: theme.colors.gold, fontWeight: '600' },
  topBarTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.textSecondary },
  topBarSpacer: { width: 44 },

  // Completion
  completionSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.gold + '30',
  },
  completionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  completionLabel: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  completionPercent: { fontSize: 24, fontWeight: '800', color: theme.colors.gold },
  progressTrack: {
    height: 10,
    backgroundColor: theme.colors.surface3,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.gold,
    borderRadius: 5,
  },
  completionSub: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 8 },

  // Total card
  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.gold + '40',
  },
  totalEmoji: { fontSize: 32, marginRight: 14 },
  totalLabel: { fontSize: 13, color: theme.colors.textSecondary },
  totalSub: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 2 },
  totalValue: { fontSize: 28, fontWeight: '800', color: theme.colors.textPrimary },
  chevron: { fontSize: 28, color: theme.colors.gold, marginLeft: 'auto' },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  card: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    marginBottom: 4,
  },
  cardEmoji: { fontSize: 22, marginBottom: 8 },
  cardValue: { fontSize: 32, fontWeight: '800', marginBottom: 2 },
  cardLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  cardHint: { fontSize: 10, color: theme.colors.textTertiary, marginTop: 8 },

  // Centered / denied
  centered: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  lockEmoji: { fontSize: 64, marginBottom: 16 },
  deniedTitle: { fontSize: 22, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 8 },
  deniedText: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center' },
  deniedEmail: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 12 },
  banner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.colors.surface2, borderWidth: 1, borderColor: '#F59E0B' + '66',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16,
  },
  bannerText: { flex: 1, fontSize: 12, color: theme.colors.textPrimary, marginRight: 12, lineHeight: 16 },
  retryButton: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: theme.colors.gold,
    alignSelf: 'center', marginTop: 12,
  },
  retryButtonText: { fontSize: 13, fontWeight: '700', color: theme.colors.black },

  // Footer
  footer: { alignItems: 'center', paddingVertical: 24 },
  footerText: { fontSize: 12, color: theme.colors.textTertiary },
});
