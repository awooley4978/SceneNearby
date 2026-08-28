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
import { defaultUserSettings } from '../../models';
import { resetOnboarding, getUserSettings, setUserSettings, getVisitedLocations } from '../../services/StorageService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useSaved } from '../../context/SavedContext';
import { useEntitlement } from '../../context/EntitlementContext';
import { getUserAlbum } from '../../services/albumService';

const ADMIN_EMAILS = ['awooley4978@gmail.com', 'scenenearbysupport@gmail.com'];

export const ProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, signOut: authSignOut } = useAuth();
  const { savedIds } = useSaved();
  const { status, daysLeft, price, restore, ui } = useEntitlement();
  const [settings, setSettings] = useState(defaultUserSettings);
  const [navApp, setNavApp] = useState<string | null>(null);
  const [photoCount, setPhotoCount] = useState(0);
  const [visitedCount, setVisitedCount] = useState(0);

  // Load saved nav preference
  React.useEffect(() => {
    getUserSettings(defaultUserSettings).then((s) => setNavApp(s.navApp));
  }, []);

  // Genuine per-user counts only — no placeholder/demo numbers. Saved comes from
  // the SavedContext (AsyncStorage-backed); Photos from the user's Firestore
  // album (0 / hidden when signed out); Visited from the visit-gate storage list
  // (getVisitedLocations — the source the "I've Visited" gate writes to).
  React.useEffect(() => {
    if (!user?.uid) {
      setPhotoCount(0);
      return;
    }
    let active = true;
    getUserAlbum(user.uid)
      .then(({ photos }) => {
        if (active) setPhotoCount(photos.length);
      })
      .catch(() => {
        if (active) setPhotoCount(0);
      });
    return () => {
      active = false;
    };
  }, [user?.uid]);

  React.useEffect(() => {
    let active = true;
    getVisitedLocations()
      .then((ids) => {
        if (active) setVisitedCount(ids.length);
      })
      .catch(() => {
        if (active) setVisitedCount(0);
      });
    return () => {
      active = false;
    };
  }, []);

  const stats = {
    saves: savedIds.size,
    photos: photoCount,
    visited: visitedCount,
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top }]}
    >
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
          <Text style={styles.statValue}>{stats.photos}</Text>
          <Text style={styles.statLabel}>Photos</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.visited}</Text>
          <Text style={styles.statLabel}>Visited</Text>
        </View>
      </View>

      {/* Account */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 Account</Text>
        {user ? (
          <View style={styles.authRow}>
            <View style={styles.authInfo}>
              <Text style={styles.authEmail}>{user.email ?? 'Signed in'}</Text>
              <Text style={styles.authStatus}>Firebase Auth</Text>
            </View>
            <TouchableOpacity style={styles.authButton} onPress={() => authSignOut()}>
              <Text style={styles.authButtonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.authButton}
            onPress={() => navigation.navigate('Auth')}
          >
            <Text style={styles.authButtonText}>Sign In</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Album */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📸 Album</Text>
        <TouchableOpacity
          style={styles.navLinkRow}
          onPress={() => navigation.navigate('Album')}
        >
          <View style={styles.navLinkInfo}>
            <Text style={styles.navLinkDesc}>Photos you've taken at filming locations</Text>
          </View>
          <Text style={styles.navLinkChevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Lifetime access — real entitlement status from the verified IAP flow */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⭐ Scene Nearby</Text>
        {status === 'unlocked' ? (
          <View style={styles.lifetimeCard}>
            <Text style={styles.lifetimeEmoji}>🏆</Text>
            <Text style={styles.lifetimeTitle}>Lifetime Unlocked</Text>
            <Text style={styles.lifetimeDesc}>
              You have full access to every location, list, and surprise — for good.
            </Text>
          </View>
        ) : (
          <View style={styles.lifetimeCard}>
            <Text style={styles.lifetimeEmoji}>⏳</Text>
            <Text style={styles.lifetimeTitle}>
              {status === 'locked'
                ? 'Trial ended'
                : typeof daysLeft === 'number'
                ? `Trial active — ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`
                : 'Free trial'}
            </Text>
            <Text style={styles.lifetimeDesc}>
              {status === 'locked'
                ? 'Unlock lifetime access for all filming locations.'
                : `Start with 7 days free, then unlock lifetime access for a one-time purchase of $4.99.`}
            </Text>
            <TouchableOpacity
              style={styles.lifetimeButton}
              onPress={() => navigation.navigate('Paywall')}
              disabled={ui === 'restoring'}
            >
              <Text style={styles.lifetimeButtonText}>
                {status === 'locked' ? `Unlock — ${price ?? '$4.99'}` : 'See plans'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.restoreButton}
              onPress={restore}
              disabled={ui === 'restoring'}
            >
              <Text style={styles.restoreText}>
                {ui === 'restoring' ? 'Restoring…' : 'Restore Purchases'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
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

        {user?.email && ADMIN_EMAILS.includes(user.email) && (
          <TouchableOpacity
            style={styles.navLinkRow}
            onPress={() => navigation.navigate('AdminDashboard')}
          >
            <View style={styles.navLinkInfo}>
              <Text style={styles.navLinkLabel}>🔐 Admin Dashboard</Text>
              <Text style={styles.navLinkDesc}>Content health, photo approvals, stats</Text>
            </View>
            <Text style={styles.navLinkChevron}>›</Text>
          </TouchableOpacity>
        )}

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

        {/* Default Navigation App */}
        <TouchableOpacity
          style={styles.navLinkRow}
          onPress={() => {
            const apps = [
              { label: '📍 Google Maps', value: 'googlemaps' },
              { label: '🗺️ Apple Maps', value: 'applemaps' },
              { label: '🚗 Waze', value: 'waze' },
              { label: 'Always ask', value: null },
            ];
            Alert.alert(
              'Default Navigation App',
              'Choose which app to use when navigating to locations.',
              apps.map((a) => ({
                text: a.label + (navApp === a.value ? ' ✓' : ''),
                onPress: async () => {
                  const settings = await getUserSettings(defaultUserSettings);
                  const updated = { ...settings, navApp: a.value };
                  await setUserSettings(updated);
                  setNavApp(a.value);
                },
              })).concat([{ text: 'Cancel' } as any]),
            );
          }}
        >
          <View style={styles.navLinkInfo}>
            <Text style={styles.navLinkLabel}>🧭 Default Navigation App</Text>
            <Text style={styles.navLinkDesc}>
              {navApp === 'waze' ? 'Waze' :
               navApp === 'applemaps' ? 'Apple Maps' :
               navApp === 'googlemaps' ? 'Google Maps' :
               'Always ask'}
            </Text>
          </View>
          <Text style={styles.navLinkChevron}>›</Text>
        </TouchableOpacity>

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
  lifetimeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.gold + '30',
    padding: 20,
    alignItems: 'center',
  },
  lifetimeEmoji: { fontSize: 40, marginBottom: 10 },
  lifetimeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.gold,
    marginBottom: 8,
    textAlign: 'center',
  },
  lifetimeDesc: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  lifetimeButton: {
    backgroundColor: theme.colors.gold,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  lifetimeButtonText: { color: theme.colors.black, fontWeight: '700', fontSize: 16 },
  restoreButton: { paddingVertical: 10, marginTop: 4 },
  restoreText: { color: theme.colors.textSecondary, fontSize: 14, fontWeight: '600' },
  authRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.colors.surface2, padding: 14, borderRadius: 12 },
  authInfo: { flex: 1 },
  authEmail: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  authStatus: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 },
  authButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: theme.colors.gold },
  authButtonText: { fontSize: 13, fontWeight: '700', color: theme.colors.black },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 12, marginTop: 4 },

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