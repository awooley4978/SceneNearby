import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
} from 'react-native';
import { theme } from '../../theme';
import {
  defaultNotificationPreferences,
  PROXIMITY_PRESETS,
  DISCOVERY_FREQUENCIES,
} from '../../models';
import type {
  NotificationPreferences,
  DiscoveryFrequency,
  ProximityMode,
} from '../../models';
import { NotificationService } from '../../services/NotificationService';

export const NotificationPreferencesScreen: React.FC = () => {
  const [prefs, setPrefs] = useState<NotificationPreferences>(defaultNotificationPreferences);

  const updatePref = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K],
  ) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
    if (key === 'proximityMode') {
      NotificationService.setProximityMode(value as ProximityMode);
    }
  };

  const toggleQuietHours = () => {
    setPrefs((prev) => ({
      ...prev,
      quietHours: { ...prev.quietHours, enabled: !prev.quietHours.enabled },
    }));
  };

  const adjustDailyMax = (delta: number) => {
    setPrefs((prev) => ({
      ...prev,
      maxNotificationsPerDay: Math.max(1, Math.min(30, prev.maxNotificationsPerDay + delta)),
    }));
  };

  const frequencyOptions = Object.entries(DISCOVERY_FREQUENCIES) as [DiscoveryFrequency, typeof DISCOVERY_FREQUENCIES['calm']][];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ──── Notification Types ──── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔔 Notification Types</Text>

        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>Saved Locations</Text>
            <Text style={styles.toggleDesc}>Alert when near a filming location on your watchlist</Text>
          </View>
          <Switch
            value={prefs.savedLocationsEnabled}
            onValueChange={(v) => updatePref('savedLocationsEnabled', v)}
            trackColor={{ false: theme.colors.surface3, true: theme.colors.gold + '66' }}
            thumbColor={prefs.savedLocationsEnabled ? theme.colors.gold : theme.colors.textTertiary}
          />
        </View>

        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>Discovery Mode</Text>
            <Text style={styles.toggleDesc}>Discover great spots not on your list</Text>
          </View>
          <Switch
            value={prefs.discoveryModeEnabled}
            onValueChange={(v) => updatePref('discoveryModeEnabled', v)}
            trackColor={{ false: theme.colors.surface3, true: theme.colors.gold + '66' }}
            thumbColor={prefs.discoveryModeEnabled ? theme.colors.gold : theme.colors.textTertiary}
          />
        </View>
      </View>

      {/* ──── Discovery Frequency ──── */}
      {prefs.discoveryModeEnabled && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Discovery Frequency</Text>
          <Text style={styles.sectionSubtitle}>
            Choose your discovery personality
          </Text>

          {frequencyOptions.map(([mode, freq]) => {
            const active = prefs.discoveryFrequency === mode;
            return (
              <TouchableOpacity
                key={mode}
                style={[styles.freqCard, active && styles.freqCardActive]}
                onPress={() => updatePref('discoveryFrequency', mode)}
                activeOpacity={0.7}
              >
                <View style={styles.freqHeader}>
                  <Text style={styles.freqEmoji}>{freq.emoji}</Text>
                  <View style={styles.freqInfo}>
                    <Text style={[styles.freqLabel, active && styles.freqLabelActive]}>
                      {freq.label}
                    </Text>
                    {mode === 'essentials' && <Text style={styles.defaultBadge}>Default</Text>}
                    {active && <Text style={styles.freqBadge}>Selected</Text>}
                  </View>
                  <View style={[styles.freqRadio, active && styles.freqRadioActive]}>
                    {active && <View style={styles.freqRadioDot} />}
                  </View>
                </View>
                <Text style={styles.freqDesc}>{freq.fullDesc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ──── Smart Limits ──── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧠 Smart Limits</Text>

        {/* Max notifications per day */}
        <View style={styles.limitRow}>
          <Text style={styles.limitLabel}>Max notifications / day</Text>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => adjustDailyMax(-1)}
            >
              <Text style={styles.stepperBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{prefs.maxNotificationsPerDay}</Text>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => adjustDailyMax(1)}
            >
              <Text style={styles.stepperBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quiet hours */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>Quiet Hours</Text>
            <Text style={styles.toggleDesc}>
              {prefs.quietHours.enabled
                ? `${prefs.quietHours.from} → ${prefs.quietHours.to}`
                : 'Pause notifications during set hours'}
            </Text>
          </View>
          <Switch
            value={prefs.quietHours.enabled}
            onValueChange={toggleQuietHours}
            trackColor={{ false: theme.colors.surface3, true: theme.colors.gold + '66' }}
            thumbColor={prefs.quietHours.enabled ? theme.colors.gold : theme.colors.textTertiary}
          />
        </View>

        {prefs.quietHours.enabled && (
          <View style={styles.quietHoursRow}>
            <View style={styles.timePicker}>
              <Text style={styles.timeLabel}>From</Text>
              <Text style={styles.timeValue}>{prefs.quietHours.from}</Text>
            </View>
            <Text style={styles.timeArrow}>→</Text>
            <View style={styles.timePicker}>
              <Text style={styles.timeLabel}>To</Text>
              <Text style={styles.timeValue}>{prefs.quietHours.to}</Text>
            </View>
          </View>
        )}
      </View>

      {/* ──── Travel Mode ──── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚗 Travel Mode</Text>
        <Text style={styles.sectionSubtitle}>
          How far ahead should we alert you?
        </Text>

        <View style={styles.modeRow}>
          {(Object.entries(PROXIMITY_PRESETS) as [ProximityMode, typeof PROXIMITY_PRESETS['walking']][]).map(([mode, preset]) => {
            const active = prefs.proximityMode === mode;
            const icons = { walking: '🚶', biking: '🚲', driving: '🚗' };
            return (
              <TouchableOpacity
                key={mode}
                style={[styles.modeChip, active && styles.modeChipActive]}
                onPress={() => updatePref('proximityMode', mode)}
              >
                <Text style={styles.modeIcon}>{icons[mode]}</Text>
                <Text style={[styles.modeLabel, active && styles.modeLabelActive]}>
                  {preset.label}
                </Text>
                <Text style={[styles.modeDist, active && styles.modeDistActive]}>
                  {Math.round(preset.meters / 1609)} mi
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Preferences are saved locally and sync across your devices.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: 60 },
  section: { paddingHorizontal: 16, paddingTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 12 },
  sectionSubtitle: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 12, marginTop: -8 },

  // Toggle rows
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surface3 + '60',
  },
  toggleInfo: { flex: 1, marginRight: 12 },
  toggleLabel: { fontSize: 15, fontWeight: '500', color: theme.colors.textPrimary },
  toggleDesc: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 2, lineHeight: 16 },

  // Frequency cards
  freqCard: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: theme.colors.surface3,
  },
  freqCardActive: { borderColor: theme.colors.gold, backgroundColor: theme.colors.gold + '08' },
  freqHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  freqEmoji: { fontSize: 20, marginRight: 10 },
  freqInfo: { flex: 1 },
  freqLabel: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  freqLabelActive: { color: theme.colors.gold },
  freqBadge: { fontSize: 10, fontWeight: '600', color: theme.colors.gold, marginTop: 1 },
  defaultBadge: { fontSize: 9, fontWeight: '500', color: theme.colors.textTertiary, marginTop: 1 },
  freqDesc: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 16, marginLeft: 30 },
  freqRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.surface3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  freqRadioActive: { borderColor: theme.colors.gold },
  freqRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.gold },

  // Stepper
  limitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surface3 + '60',
  },
  limitLabel: { fontSize: 15, color: theme.colors.textPrimary },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surface3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperBtnText: { fontSize: 18, fontWeight: '600', color: theme.colors.textPrimary },
  stepperValue: { fontSize: 18, fontWeight: '700', color: theme.colors.gold, minWidth: 24, textAlign: 'center' },

  // Quiet hours
  quietHoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 14,
  },
  timePicker: { alignItems: 'center' },
  timeLabel: { fontSize: 12, color: theme.colors.textTertiary, marginBottom: 4 },
  timeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.gold,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: theme.colors.surface2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  timeArrow: { fontSize: 18, color: theme.colors.textTertiary, marginTop: 16 },

  // Travel mode chips
  modeRow: { flexDirection: 'row', gap: 8 },
  modeChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.surface2,
    borderWidth: 1.5,
    borderColor: theme.colors.surface3,
    gap: 4,
  },
  modeChipActive: { borderColor: theme.colors.gold, backgroundColor: theme.colors.gold + '12' },
  modeIcon: { fontSize: 24 },
  modeLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  modeLabelActive: { color: theme.colors.gold },
  modeDist: { fontSize: 11, fontWeight: '500', color: theme.colors.textTertiary },
  modeDistActive: { color: theme.colors.gold },

  // Footer
  footer: { paddingHorizontal: 16, paddingTop: 32, paddingBottom: 40, alignItems: 'center' },
  footerText: { fontSize: 12, color: theme.colors.textTertiary, textAlign: 'center', lineHeight: 18 },
});