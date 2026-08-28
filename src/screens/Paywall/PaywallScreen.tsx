// ── Paywall screen (T-M4) ──
// Full-screen unlock gate + purchase surface. Shown when a user's 7-day trial has
// expired (locked). Always reachable: purchase, Restore Purchases, sign-in/account,
// and privacy/support. Uses the Entitlement context + expo-iap purchase flow.
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { useEntitlement } from '../../context/EntitlementContext';

interface Props {
  navigation?: any;
  route?: any;
  /** When true, emit a "close" affordance (e.g. from a modal). Omitted on full gate. */
  canClose?: boolean;
  onClose?: () => void;
}

const PRIVACY_URL = 'https://scenenearby.web.app/privacy';
const SUPPORT_EMAIL = 'scenenearbysupport@gmail.com';

export const PaywallScreen: React.FC<Props> = ({ navigation, route, canClose, onClose }) => {
  const insets = useSafeAreaInsets();
  const { price, ui, message, purchase, restore, status, daysLeft } = useEntitlement();

  // When presented as a navigation modal, canClose comes via route params.
  const closeable = canClose === true || (navigation && route?.params?.canClose === true);
  const dismiss = onClose ?? (() => navigation?.goBack?.());

  const priceDisplay = price ?? '$4.99';
  const busy = ui === 'purchasing' || ui === 'restoring' || ui === 'pending';

  const openSupport = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {});
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }]}
    >
      {closeable && (
        <View style={styles.closeRow}>
          <TouchableOpacity onPress={dismiss} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.hero}>
        <Text style={styles.heroEmoji}>🎬</Text>
        <Text style={styles.heroTitle}>Unlock Scene Nearby</Text>
        <Text style={styles.heroSub}>
          Your 7-day free trial has ended. Unlock every filming location, list, and
          surprise near you — for good.
        </Text>
      </View>

      <View style={styles.priceCard}>
        <Text style={styles.priceAmount}>{priceDisplay}</Text>
        <Text style={styles.priceNote}>One-time · Lifetime access · No subscription</Text>
      </View>

      {status === 'trialActive' && typeof daysLeft === 'number' && daysLeft > 0 && (
        <Text style={styles.trialNote}>
          Your trial is still active — you have {daysLeft} day{daysLeft === 1 ? '' : 's'} left.
        </Text>
      )}

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <TouchableOpacity
        style={[styles.primaryButton, busy && styles.buttonDisabled]}
        onPress={purchase}
        disabled={busy}
        accessibilityRole="button"
      >
        {busy ? (
          <ActivityIndicator color={theme.colors.black} />
        ) : (
          <Text style={styles.primaryButtonText}>Continue — {priceDisplay}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.restoreButton}
        onPress={restore}
        disabled={busy}
        accessibilityRole="button"
      >
        <Text style={styles.restoreText}>
          {ui === 'restoring' ? 'Restoring…' : 'Restore Purchases'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.legal}>
        Payment is processed by Apple. This is a one-time purchase that gives you
        lifetime access on this and, with sign-in, your other devices.
      </Text>

      <View style={styles.links}>
        <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}>
          <Text style={styles.linkText}>Privacy Policy</Text>
        </TouchableOpacity>
        <Text style={styles.linkDot}>·</Text>
        <TouchableOpacity onPress={openSupport}>
          <Text style={styles.linkText}>Support</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingHorizontal: 24 },
  closeRow: { alignItems: 'flex-end', marginBottom: 8 },
  closeText: { color: theme.colors.textSecondary, fontSize: 16, fontWeight: '600' },
  hero: { alignItems: 'center', marginBottom: 32 },
  heroEmoji: { fontSize: 56, marginBottom: 16 },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.gold,
    textAlign: 'center',
    marginBottom: 12,
  },
  heroSub: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  priceCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.gold + '30',
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  priceAmount: { fontSize: 40, fontWeight: '800', color: theme.colors.textPrimary, marginBottom: 6 },
  priceNote: { fontSize: 14, color: theme.colors.textSecondary },
  trialNote: {
    fontSize: 13,
    color: theme.colors.goldLight,
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 14,
    color: theme.colors.success,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: theme.colors.gold,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: { color: theme.colors.black, fontSize: 18, fontWeight: '800' },
  buttonDisabled: { opacity: 0.6 },
  restoreButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  restoreText: { color: theme.colors.textSecondary, fontSize: 15, fontWeight: '600' },
  legal: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 24,
  },
  links: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkText: { color: theme.colors.textSecondary, fontSize: 14, fontWeight: '600' },
  linkDot: { color: theme.colors.textTertiary, marginHorizontal: 10 },
});
