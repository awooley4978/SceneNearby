import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../../theme';
import { availableCityPacks, defaultUserSettings } from '../../models';
import type { MapStyleOption } from '../../models';
import { resetOnboarding, getUserSettings, setUserSettings } from '../../services/StorageService';
import { Linking, Platform } from 'react-native';
import { logPremiumUpgrade } from '../../services/analytics';
import { useAuth } from '../../context/AuthContext';

export const ProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const {
    user,
    signIn: authSignIn,
    signUp: authSignUp,
    signOut: authSignOut,
    magicLinkState,
    sendMagicLink,
    resetMagicLinkState,
  } = useAuth();
  const [email, setEmail] = useState('');
  const [settings, setSettings] = useState(defaultUserSettings);
  const [isPremium, setIsPremium] = useState(false);
  const [purchasedPacks, setPurchasedPacks] = useState<string[]>([]);
  const [navApp, setNavApp] = useState<string | null>(null);

  // Load saved nav preference
  React.useEffect(() => {
    getUserSettings(defaultUserSettings).then((s) => setNavApp(s.navApp));
  }, []);

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
          <View style={styles.magicLinkContainer}>
            {/* Idle / Error state — email input + send button */}
            {(magicLinkState.status === 'idle' || magicLinkState.status === 'error' || magicLinkState.status === 'invalid') && (
              <>
                {magicLinkState.status === 'error' && (
                  <Text style={styles.errorText}>{magicLinkState.error || 'Could not send link. Check your email and try again.'}</Text>
                )}
                {magicLinkState.status === 'invalid' && (
                  <Text style={styles.errorText}>{magicLinkState.error || 'This sign-in link has expired or was already used.'}</Text>
                )}
                <TextInput
                  style={styles.emailInput}
                  placeholder="you@email.com"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[styles.authButton, (!email.trim() || magicLinkState.status === 'sending') && styles.authButtonDisabled]}
                  onPress={() => sendMagicLink(email.trim())}
                  disabled={!email.trim() || magicLinkState.status === 'sending'}
                >
                  <Text style={styles.authButtonText}>Send Magic Link</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Sending state */}
            {magicLinkState.status === 'sending' && (
              <View style={styles.magicLinkState}>
                <ActivityIndicator size="small" color={theme.colors.gold} />
                <Text style={styles.magicLinkStateText}>Sending link...</Text>
              </View>
            )}

            {/* Sent state */}
            {magicLinkState.status === 'sent' && (
              <View style={styles.magicLinkState}>
                <Text style={styles.magicLinkIcon}>✉️</Text>
                <Text style={styles.magicLinkStateText}>
                  Check your email — tap the link we sent to{' '}
                  <Text style={styles.magicLinkEmail}>{magicLinkState.email}</Text> to sign in.
                </Text>
                <TouchableOpacity onPress={resetMagicLinkState}>
                  <Text style={styles.magicLinkReset}>Use a different email</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Verifying state */}
            {magicLinkState.status === 'verifying' && (
              <View style={styles.magicLinkState}>
                <ActivityIndicator size="small" color={theme.colors.gold} />
                <Text style={styles.magicLinkStateText}>Verifying link...</Text>
              </View>
            )}
          </View>
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
              })).concat([{ text: 'Cancel', style: 'cancel' as const }]),
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
  premiumCard: {
    marginHorizontal: 16, padding: 20, backgroundColor: theme.colors.gold + '12',
    borderRadius: 16, borderWidth: 1, borderColor: theme.colors.gold + '30',
    marginBottom: 20, alignItems: 'center',
  },
  premiumEmoji: { fontSize: 40, marginBottom: 10 },
  premiumTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.gold, marginBottom: 8 },
  authRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.colors.surface2, padding: 14, borderRadius: 12 },
  authInfo: { flex: 1 },
  authEmail: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  authStatus: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 },
  authButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: theme.colors.gold },
  authButtonDisabled: { opacity: 0.5 },
  authButtonText: { fontSize: 13, fontWeight: '700', color: theme.colors.black },

  // Magic link
  magicLinkContainer: { gap: 10 },
  emailInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.surface3,
  },
  errorText: {
    fontSize: 13,
    color: theme.colors.error,
    marginBottom: 4,
  },
  magicLinkState: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  magicLinkIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  magicLinkStateText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  magicLinkEmail: {
    fontWeight: '700',
    color: theme.colors.gold,
  },
  magicLinkReset: {
    fontSize: 13,
    color: theme.colors.gold,
    textDecorationLine: 'underline',
  },
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