import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { BottomSheet } from './BottomSheet';

interface BucketListSheetProps {
  visible: boolean;
  onClose: () => void;
}

export const BucketListSheet: React.FC<BucketListSheetProps> = ({
  visible,
  onClose,
}) => {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Still on Your List">
      <View style={styles.container}>
        <Text style={styles.headline}>
          Looks like this one is still on your bucket list!
        </Text>

        <Text style={styles.subhead}>
          Once you've visited, you can help future travelers by:
        </Text>

        <View style={styles.perks}>
          <View style={styles.perkRow}>
            <Text style={styles.perkEmoji}>⭐</Text>
            <Text style={styles.perkText}>Rating whether it's worth the stop</Text>
          </View>
          <View style={styles.perkRow}>
            <Text style={styles.perkEmoji}>⏱</Text>
            <Text style={styles.perkText}>Sharing how long to plan</Text>
          </View>
          <View style={styles.perkRow}>
            <Text style={styles.perkEmoji}>📸</Text>
            <Text style={styles.perkText}>Uploading your own photos</Text>
          </View>
          <View style={styles.perkRow}>
            <Text style={styles.perkEmoji}>💬</Text>
            <Text style={styles.perkText}>Leaving helpful tips</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.gotItButton}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Text style={styles.gotItButtonText}>Got it</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 16,
  },
  headline: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    lineHeight: 24,
  },
  subhead: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  perks: {
    width: '100%',
    gap: 10,
    backgroundColor: theme.colors.surface2,
    borderRadius: 12,
    padding: 16,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  perkEmoji: {
    fontSize: 18,
    width: 28,
    textAlign: 'center',
  },
  perkText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  gotItButton: {
    backgroundColor: 'rgba(245,197,24,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,197,24,0.25)',
    borderRadius: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    marginTop: 4,
  },
  gotItButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.gold,
  },
});
