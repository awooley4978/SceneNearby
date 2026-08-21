import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { theme } from '../theme';
import {
  PhotoAttributionData,
  licenseUrlFor,
} from '../utils/photoAttribution';

interface Props {
  attribution: PhotoAttributionData | null | undefined;
  /** Where the pill is rendered — affects text size/contrast. */
  variant?: 'hero' | 'card';
}

/**
 * Reusable, compact photo attributribution treatment for any location photo:
 *   📷 Gerardo Orlando · CC BY-SA 4.0
 *   📷 Community contributor
 * The license name is tappable and opens that photo's official license page.
 * When the license requires it, a changes-made indicator is appended.
 * The raw URL is never shown — only the short license name.
 */
export const PhotoAttribution: React.FC<Props> = ({ attribution, variant = 'hero' }) => {
  if (!attribution) return null;
  const { photographer, license, licenseUrl, modified } = attribution;
  // No license and no way to know a creator → nothing to show.
  if (!license && !photographer) return null;

  const url = licenseUrlFor(license, licenseUrl);
  const openLicense = () => {
    if (url) Linking.openURL(url).catch(() => {});
  };

  // The creator is recognition for a contributed photo. Anonymous contributors
  // (no name) show "Community contributor" instead.
  const creator = photographer && photographer.trim().length > 0
    ? photographer.trim()
    : 'Community contributor';

  const modifiedLabel =
    modified === 'cropped' ? 'modified: cropped'
    : modified === 'edited' ? 'modified: edited'
    : modified ? `modified: ${modified}`
    : null;

  const small = variant === 'card';

  return (
    <View style={[styles.row, small && styles.rowSmall]}>
      <Text style={[styles.cam, small && styles.camSmall]}>📷</Text>
      <Text style={[styles.creator, small && styles.textSmall]} numberOfLines={1}>
        {creator}
      </Text>
      {license ? (
        <>
          <Text style={[styles.dot, small && styles.dotSmall]}> · </Text>
          {url ? (
            <TouchableOpacity onPress={openLicense} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
              <Text style={[styles.creator, styles.license, small && styles.textSmall]} numberOfLines={1}>
                {license}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.creator, small && styles.textSmall]} numberOfLines={1}>{license}</Text>
          )}
        </>
      ) : null}
      {modifiedLabel ? (
        <>
          <Text style={[styles.dot, small && styles.dotSmall]}> · </Text>
          <Text style={[styles.creator, styles.modified, small && styles.textSmall]} numberOfLines={1}>
            {modifiedLabel}
          </Text>
        </>
      ) : null}
    </View>
  );
};

export default PhotoAttribution;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: '100%',
  },
  rowSmall: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  cam: {
    fontSize: 11,
    marginRight: 4,
  },
  camSmall: {
    fontSize: 10,
    marginRight: 3,
  },
  creator: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 11,
  },
  license: {
    color: theme.colors.goldLight,
    textDecorationLine: 'underline',
  },
  dot: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
  },
  dotSmall: {
    fontSize: 10,
  },
  textSmall: {
    fontSize: 10,
  },
  modified: {
    color: 'rgba(255,255,255,0.7)',
    fontStyle: 'italic',
  },
});
