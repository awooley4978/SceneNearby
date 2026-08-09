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
import { useAllLocations } from '../../services/hooks';

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
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    // Try to fetch pending photo count from Turso, fall back to 0
    fetchPendingPhotos()
      .then((count) => setStats(computeAdminStats(count)))
      .catch(() => setStats(computeAdminStats(0)))
      .finally(() => setLoading(false));
  }, [isAdmin]);

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
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.gold} />
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
          onPress={() => navigation.navigate('Profile')}
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

const NEARBY_API = 'http://localhost:3000';

async function fetchPendingPhotos(): Promise<number> {
  try {
    const res = await fetch(`${NEARBY_API}/api/stats`);
    if (!res.ok) return 0;
    const data = await res.json();
    return data?.pending_moderation ?? 0;
  } catch {
    return 0;
  }
}

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

  // Footer
  footer: { alignItems: 'center', paddingVertical: 24 },
  footerText: { fontSize: 12, color: theme.colors.textTertiary },
});
