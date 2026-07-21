import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { theme } from '../../theme';
import { availableCityPacks, defaultUserSettings } from '../../models';
import type { MapStyleOption } from '../../models';
import { resetOnboarding } from '../../services/StorageService';
import { logPremiumUpgrade } from '../../services/analytics';

export const ProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [settings, setSettings] = useState(defaultUserSettings);
  const [isPremium, setIsPremium] = useState(false);
  const [purchasedPacks, setPurchasedPacks] = useState<string[]>([]);

  const stats = {
    saves: 4,
    totalLocations: 27,
    citiesVisited: 3,
  };

  const handleBuyPremium = () => {
    logPremiumUpgrade();
    setIsPremium(true);
  };

  const handleBuyPack = (packId: string) => {
    setPurchasedPacks((prev) => [...prev, packId]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>🎬</Text>
        </View>
        <Text style={styles.username}>Film Explorer</Text>
        <Text style={styles.bio}>Discovering the cinematic world around you</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.saves}</Text>
          <Text style={styles.statLabel}>Saved</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.totalLocations}</Text>
          <Text style={styles.statLabel}>Locations</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.citiesVisited}</Text>
          <Text style={styles.statLabel}>Cities</Text>
        </View>
      </View>

      {/* Premium upgrade */}
      {!isPremium && (
        <View style={styles.premiumCard}>
          <Text style={styles.premiumEmoji}>⭐</Text>
          <Text style={styles.premiumTitle}>Go Premium</Text>
          <Text style={styles.premiumDesc}>
            Unlock unlimited location views, remove daily limits, and get early access to new City Packs.
          </Text>
          <TouchableOpacity style={styles.premiumButton} onPress={handleBuyPremium}>
            <Text style={styles.premiumButtonText}>Upgrade — $4.99</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* City Packs */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏙️ City Packs</Text>
        {availableCityPacks.map((pack) => {
          const owned = purchasedPacks.includes(pack.id);
          return (
            <View key={pack.id} style={styles.packRow}>
              <View style={styles.packInfo}>
                <Text style={styles.packEmoji}>{pack.emoji}</Text>
                <View style={styles.packText}>
                  <Text style={styles.packName}>{pack.cityName}</Text>
                  <Text style={styles.packDesc}>{pack.description}</Text>
                </View>
              </View>
              {owned ? (
                <View style={styles.ownedBadge}>
                  <Text style={styles.ownedText}>✓ Owned</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.buyButton}
                  onPress={() => handleBuyPack(pack.id)}
                >
                  <Text style={styles.buyText}>${pack.price}</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>

      {/* Settings — link to Notification Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚙️ Settings</Text>

        <TouchableOpacity
          style={styles.navLinkRow}
          onPress={() => navigation.navigate('NotificationPreferences')}
        >
          <View style={styles.navLinkInfo}>
            <Text style={styles.navLinkLabel}>🔔 Notifications</Text>
            <Text style={styles.navLinkDesc}>Alert types, range, quiet hours & more</Text>
          </View>
          <Text style={styles.navLinkChevron}>›</Text>
        </TouchableOpacity>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Metric Units</Text>
          <TouchableOpacity
            style={styles.unitToggle}
            onPress={() =>
              setSettings((prev) => ({
                ...prev,
                distanceUnit: prev.distanceUnit === 'metric' ? 'imperial' : 'metric',
              }))
            }
          >
            <Text style={styles.unitText}>
              {settings.distanceUnit === 'metric' ? 'km/m' : 'mi/ft'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Reset Onboarding */}
        <TouchableOpacity
          style={styles.resetButton}
          onPress={() => {
            Alert.alert(
              'Reset Onboarding',
              'This will show the welcome tour again so you can update your preferences.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Reset',
                  style: 'destructive',
                  onPress: async () => {
                    await resetOnboarding();
                    Alert.alert('Done!', 'Onboarding will show on next app launch.');
                  },
                },
              ],
            );
          }}
        >
          <Text style={styles.resetButtonText}>🔄 Reset Onboarding Tour</Text>
          <Text style={styles.resetButtonDesc}>Re-welcome yourself and update preferences</Text>
        </TouchableOpacity>
      </View>

      {/* App info */}
      <View style={styles.footer}>
        <Text style={styles.version}>Scene Nearby v1.0.0</Text>
        <Text style={styles.copyright}>© 2026 Cairn Studios. All rights reserved.</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: 100 },
  header: { alignItems: 'center', paddingVertical: 32 },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.surface,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    borderWidth: 2, borderColor: theme.colors.gold + '40',
  },
  avatarText: { fontSize: 36 },
  username: { fontSize: 22, fontWeight: '700', color: theme.colors.textPrimary },
  bio: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 },
  statsRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: 16, marginHorizontal: 16, backgroundColor: theme.colors.surface,
    borderRadius: 16, marginBottom: 20,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700', color: theme.colors.gold },
  statLabel: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: theme.colors.surface3 },
  premiumCard: {
    marginHorizontal: 16, padding: 20, backgroundColor: theme.colors.gold + '12',
    borderRadius: 16, borderWidth: 1, borderColor: theme.colors.gold + '30',
    marginBottom: 20, alignItems: 'center',
  },
  premiumEmoji: { fontSize: 40, marginBottom: 10 },
  premiumTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.gold, marginBottom: 8 },
  premiumDesc: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  premiumButton: { backgroundColor: theme.colors.gold, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12 },
  premiumButtonText: { color: theme.colors.black, fontWeight: '700', fontSize: 16 },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 12, marginTop: 4 },

  // Pack styles
  packRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.colors.surface, padding: 14, borderRadius: 12, marginBottom: 8,
  },
  packInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  packEmoji: { fontSize: 28, marginRight: 12 },
  packText: { flex: 1 },
  packName: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  packDesc: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  ownedBadge: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: theme.colors.success + '20', borderRadius: 8 },
  ownedText: { fontSize: 12, fontWeight: '600', color: theme.colors.success },
  buyButton: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: theme.colors.gold, borderRadius: 8 },
  buyText: { fontSize: 13, fontWeight: '700', color: theme.colors.black },

  // Settings link row
  navLinkRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.colors.surface, padding: 16, borderRadius: 12, marginBottom: 8,
    borderWidth: 1, borderColor: theme.colors.gold + '20',
  },
  navLinkInfo: { flex: 1 },
  navLinkLabel: { fontSize: 16, fontWeight: '600', color: theme.colors.gold, marginBottom: 2 },
  navLinkDesc: { fontSize: 12, color: theme.colors.textTertiary },
  navLinkChevron: { fontSize: 24, color: theme.colors.gold, fontWeight: '300' },

  // Unit toggle
  settingRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.surface3 + '60',
  },
  settingLabel: { fontSize: 15, color: theme.colors.textPrimary },
  unitToggle: {
    paddingHorizontal: 14, paddingVertical: 6, backgroundColor: theme.colors.surface2,
    borderRadius: 8, borderWidth: 1, borderColor: theme.colors.surface3,
  },
  unitText: { fontSize: 13, fontWeight: '600', color: theme.colors.gold },

  resetButton: {
    marginTop: 16, padding: 14, backgroundColor: theme.colors.surface2,
    borderRadius: 12, borderWidth: 1, borderColor: theme.colors.surface3, alignItems: 'center',
  },
  resetButtonText: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 2 },
  resetButtonDesc: { fontSize: 11, color: theme.colors.textTertiary },

  // Footer
  footer: { alignItems: 'center', paddingVertical: 24 },
  version: { fontSize: 13, color: theme.colors.textTertiary, marginBottom: 4 },
  copyright: { fontSize: 11, color: theme.colors.textTertiary },
});