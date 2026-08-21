import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { theme } from '../theme';
import {
  PhotoAttributionData,
  licenseUrlFor,
} from '../utils/photoAttribution';

/**
 * Compact photo-attribution line, e.g. "Photo: Gerardo Orlando · CC BY-SA 4.0".
 * The license name is tappable and opens that photo's official license page.
 * When the license requires it, a changes-made indicator is appended.
 * The raw URL is never shown — only the short license name.
 */
export const PhotoAttribution: React.FC<{ attribution: PhotoAttributionData | null | undefined }> = ({
  attribution,
}) => {
  if (!attribution) return null;
  const { photographer, license, licenseUrl, modified } = attribution;
  // Nothing to show if there is neither a photographer nor a license.
  if (!photographer && !license) return null;

  const url = licenseUrlFor(license, licenseUrl);
  const openLicense = () => {
    if (url) Linking.openURL(url).catch(() => {});
  };

  const modifiedLabel =
    modified === 'cropped' ? 'modified: cropped'
    : modified === 'edited' ? 'modified: edited'
    : modified ? `modified: ${modified}`
    : null;

  return (
    <View style={styles.row} pointerEvents="box-none">
      <Text style={styles.text} numberOfLines={1}>
        {attribution.photographer ? `Photo: ${attribution.photographer}` : 'Photo'}
      </Text>
      {license ? (
        <>
          <Text style={styles.dot}> · </Text>
          {url ? (
            <TouchableOpacity onPress={openLicense} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
              <Text style={[styles.text, styles.license]} numberOfLines={1}>{license}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.text} numberOfLines={1}>{license}</Text>
          )}
        </>
      ) : null}
      {modifiedLabel ? (
        <>
          <Text style={styles.dot}> · </Text>
          <Text style={[styles.text, styles.modified]} numberOfLines={1}>{modifiedLabel}</Text>
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
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: '100%',
  },
  text: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
  },
  dot: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
  },
  license: {
    color: theme.colors.goldLight,
    textDecorationLine: 'underline',
  },
  modified: {
    color: 'rgba(255,255,255,0.65)',
    fontStyle: 'italic',
  },
});
