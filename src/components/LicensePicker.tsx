// ── LicensePicker ──
// Reusable license selector for community photo uploads.
// Owner rule (08-23): for ALL photo uploads the license must be captured so it
// can render clickable to open the license. This picker surfaces the common
// Creative Commons / public-domain licenses and pairs each with its official
// license URL (via licenseUrlFor).
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { theme } from '../theme';
import { licenseUrlFor } from '../utils/photoAttribution';

// The selectable license short-names. Each derives a resolvable URL through
// licenseUrlFor (official CC / public-domain page). Order = display order.
export const LICENSE_OPTIONS: string[] = [
  'CC BY 4.0',
  'CC BY-SA 4.0',
  'CC BY-NC 4.0',
  'CC BY-NC-SA 4.0',
  'CC BY-ND 4.0',
  'CC BY-NC-ND 4.0',
  'CC0 1.0',
  'Public Domain',
];

interface LicensePickerProps {
  value: string | null;
  onChange: (license: string | null, licenseUrl: string | null) => void;
}

export const LicensePicker: React.FC<LicensePickerProps> = ({ value, onChange }) => {
  const handleSelect = (license: string) => {
    const already = license === value;
    if (already) {
      onChange(null, null);
      return;
    }
    onChange(license, licenseUrlFor(license));
  };

  return (
    <View>
      <Text style={styles.label}>Photo license</Text>
      <Text style={styles.hint}>
        Choose the license your photo is shared under. It appears as a link so
        anyone can open the license.
      </Text>
      <View style={styles.grid}>
        {LICENSE_OPTIONS.map((license) => {
          const selected = license === value;
          return (
            <TouchableOpacity
              key={license}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => handleSelect(license)}
              activeOpacity={0.7}
            >
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                {license}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {value ? (
        <TouchableOpacity
          style={styles.previewRow}
          onPress={() => {
            const url = licenseUrlFor(value);
            if (url) Linking.openURL(url);
          }}
        >
          <Text style={styles.previewText}>
            Open license: {value}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 8,
    marginTop: 20,
  },
  hint: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    lineHeight: 18,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surface3,
  },
  optionSelected: {
    borderColor: theme.colors.gold,
    backgroundColor: theme.colors.gold + '18',
  },
  optionText: {
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  optionTextSelected: {
    color: theme.colors.gold,
    fontWeight: '600',
  },
  previewRow: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: theme.colors.surface2,
  },
  previewText: {
    fontSize: 13,
    color: theme.colors.gold,
    textDecorationLine: 'underline',
  },
});
