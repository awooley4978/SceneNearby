import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Modal,
  TouchableWithoutFeedback,
  Pressable,
} from 'react-native';
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
  const [open, setOpen] = useState(false);
  if (!attribution) return null;
  const { photographer, license, licenseUrl, sourceUrl, modified } = attribution;
  const creatorName = cleanCreator(photographer);
  // No license and no verifiable creator → nothing to show. A bare host word
  // like "Wikimedia" (or a prefix leaving nothing) is not a creator, so it does
  // not count as attribution.
  if (!license && !creatorName) return null;

  const url = licenseUrlFor(license, licenseUrl);
  // Owner rule (08-24): tapping the license never leaves the app directly.
  // It opens an easily-dismissed in-app sheet with explicit actions instead.
  const openSheet = () => setOpen(true);
  const openExternal = (target: string | null) => {
    setOpen(false);
    if (target) Linking.openURL(target).catch(() => {});
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
    <>
      {/* Owner rule: the visible pill is CREATOR-NAME ONLY. License and
          modified details live in the tappable in-app sheet — never inline,
          so nothing overlaps/competes with the hero or card content. Tapping
          the pill opens the sheet (which holds the license, modified note,
          and View source / View license actions). */}
      <TouchableOpacity
        onPress={openSheet}
        activeOpacity={0.75}
        style={[styles.row, small && styles.rowSmall]}
        accessibilityRole="button"
        accessibilityLabel={`Photo credit: ${creator}. Tap for license details.`}
      >
        <Text style={[styles.cam, small && styles.camSmall]}>📷</Text>
        <Text style={[styles.creator, small && styles.textSmall]} numberOfLines={1}>
          {creator}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={styles.backdrop}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.sheet}>
                <View style={styles.grabber} />
                <Text style={styles.sheetTitle}>Photo credit</Text>
                <Text style={styles.sheetCreator} numberOfLines={2}>{creator}</Text>
                {license ? (
                  <Text style={styles.sheetLicense} numberOfLines={2}>{license}</Text>
                ) : null}
                {modifiedLabel ? (
                  <Text style={styles.sheetModified} numberOfLines={1}>{modifiedLabel}</Text>
                ) : null}

                {sourceUrl ? (
                  <Pressable
                    style={({ pressed }) => [styles.sheetAction, pressed && styles.sheetActionPressed]}
                    onPress={() => openExternal(sourceUrl)}
                  >
                    <Text style={styles.sheetActionText}>View source</Text>
                  </Pressable>
                ) : null}
                {url ? (
                  <Pressable
                    style={({ pressed }) => [styles.sheetAction, pressed && styles.sheetActionPressed]}
                    onPress={() => openExternal(url)}
                  >
                    <Text style={styles.sheetActionText}>View license</Text>
                  </Pressable>
                ) : null}

                <Pressable
                  style={({ pressed }) => [styles.sheetClose, pressed && styles.sheetActionPressed]}
                  onPress={() => setOpen(false)}
                >
                  <Text style={styles.sheetCloseText}>Close</Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
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
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 34,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginBottom: 16,
  },
  sheetTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  sheetCreator: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  sheetLicense: {
    color: theme.colors.goldLight,
    fontSize: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  sheetModified: {
    color: 'rgba(255,255,255,0.7)',
    fontStyle: 'italic',
    fontSize: 13,
    marginTop: -10,
    marginBottom: 16,
  },
  sheetAction: {
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sheetActionPressed: {
    opacity: 0.6,
  },
  sheetActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  sheetClose: {
    marginTop: 4,
    paddingVertical: 12,
  },
  sheetCloseText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    textAlign: 'center',
  },
});
