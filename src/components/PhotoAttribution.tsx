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
/**
 * Hosting-site prefixes that are NOT part of a real credit. Per owner rule
 * (08-23): always leave the source word (Wikimedia, Flickr, Unsplash, Pixabay)
 * off the attribution and only show what immediately follows it.
 */
const SOURCE_PREFIX =
  /^(?:wikimedia\s*commons|commons\.wikimedia\.org|wikimedia|flickr|unsplash|pixabay)(?:\s*[-–—:;]\s*|\s+)?/i;
/** A bare host word with nothing meaningful after it (no credit at all). */
const BARE_SOURCE = /^(?:wikimedia\s*commons|commons\.wikimedia\.org|wikimedia|flickr|unsplash|pixabay)$/i;

/** Strip a leading hosting-site prefix, returning only the real credit. */
function cleanCreator(raw: string | null | undefined): string {
  if (!raw) return '';
  let s = raw.trim();
  // Repeatedly strip while a host prefix leads (e.g. "Flickr - Wikimedia - Name").
  while (s) {
    const stripped = s.replace(SOURCE_PREFIX, '');
    if (stripped === s) break;
    s = stripped.trim();
  }
  if (BARE_SOURCE.test(s)) return '';
  return s;
}

export const PhotoAttribution: React.FC<Props> = ({ attribution, variant = 'hero' }) => {
  if (!attribution) return null;
  const { photographer, license, licenseUrl, modified } = attribution;
  const creatorName = cleanCreator(photographer);
  // No license and no verifiable creator → nothing to show. A bare host word
  // like "Wikimedia" (or a prefix leaving nothing) is not a creator, so it does
  // not count as attribution.
  if (!license && !creatorName) return null;

  const url = licenseUrlFor(license, licenseUrl);
  const openLicense = () => {
    if (url) Linking.openURL(url).catch(() => {});
  };

  // The creator is recognition for a contributed photo. Anonymous contributors
  // (no name) show "Community contributor" instead.
  const creator = creatorName || 'Community contributor';

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
