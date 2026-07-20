// ── RemoteDestinationBadge ──
// Warning badge for isolated/difficult-to-reach filming locations.
// Tap to open an info sheet with location-specific guidance.
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { theme } from '../theme';
import type { RemoteDestinationInfo } from '../models';

interface RemoteDestinationBadgeProps {
  info: RemoteDestinationInfo;
}

export const RemoteDestinationBadge: React.FC<RemoteDestinationBadgeProps> = ({ info }) => {
  const [sheetVisible, setSheetVisible] = useState(false);

  const handlePress = () => {
    setSheetVisible(true);
  };

  const handleClose = () => {
    setSheetVisible(false);
  };

  const warnings = info.warnings || [];
  const details = info.details || [];
  const label = info.label || 'Remote Destination';

  return (
    <>
      <TouchableOpacity
        style={styles.badge}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Text style={styles.badgeIcon}>🏜️</Text>
        <Text style={styles.badgeText}>{label}</Text>
        <Text style={styles.badgeChevron}>›</Text>
      </TouchableOpacity>

      <Modal
        visible={sheetVisible}
        transparent
        animationType="slide"
        onRequestClose={handleClose}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {}}
            style={styles.sheet}
          >
            <View style={styles.handleBar} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetIcon}>🏜️</Text>
              <Text style={styles.sheetTitle}>Remote Destination</Text>
              <Text style={styles.sheetSubtitle}>
                This location is isolated and may have limited services. Plan ahead.
              </Text>
            </View>
            <ScrollView style={styles.warningsList} showsVerticalScrollIndicator={false}>
              {warnings.map((warning, i) => (
                <View key={i} style={styles.warningRow}>
                  <Text style={styles.warningBullet}>⚠️</Text>
                  <Text style={styles.warningText}>{warning}</Text>
                </View>
              ))}
              {details.length > 0 && (
                <>
                  <View style={styles.divider} />
                  {details.map((detail, i) => (
                    <View key={i} style={styles.detailRow}>
                      <Text style={styles.detailText}>• {detail}</Text>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
            <View style={styles.sheetFooter}>
              <Text style={styles.footerText}>
                🏜️ Remote Destination badges help you prepare before visiting.
              </Text>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FF6B35' + '20',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF6B35' + '40',
    gap: 6,
  },
  badgeIcon: { fontSize: 14 },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#FF6B35' },
  badgeChevron: { fontSize: 14, color: '#FF6B3599', marginLeft: 2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '70%',
  },
  handleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.surface3, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  sheetHeader: { alignItems: 'center', marginBottom: 20 },
  sheetIcon: { fontSize: 40, marginBottom: 8 },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 6 },
  sheetSubtitle: { fontSize: 13, color: theme.colors.textTertiary, textAlign: 'center', lineHeight: 18, paddingHorizontal: 10 },
  warningsList: { maxHeight: 300 },
  warningRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.surface3 + '30' },
  warningBullet: { fontSize: 14, marginTop: 1 },
  warningText: { fontSize: 14, color: theme.colors.textPrimary, lineHeight: 20, flex: 1 },
  divider: { height: 1, backgroundColor: theme.colors.surface3 + '50', marginVertical: 8 },
  detailRow: { paddingVertical: 6, paddingLeft: 4 },
  detailText: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18 },
  sheetFooter: { marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.surface3 + '30', alignItems: 'center' },
  footerText: { fontSize: 11, color: theme.colors.textTertiary, textAlign: 'center' },
});
