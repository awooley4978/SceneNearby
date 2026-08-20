import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  ScrollView,
  Alert,
  Linking,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import {
  fetchTitles,
  fetchLocationsForTitle,
  submitContribution,
} from '../../services/contributionService';
import type {
  ContributionTitle,
  ContributionLocationOption,
} from '../../services/contributionService';

// Guided community contribution flow:
//   Photo -> Movie/Show -> Filming Location -> Details -> Submit
// Every submission lands PENDING-ONLY and goes through admin moderation.

type Step = 'photo' | 'movie' | 'location' | 'details' | 'success';

interface Draft {
  photo: ImagePicker.ImagePickerAsset | null;
  // existing selection
  movieTitle: string;
  locationId: string;
  locationName: string;
  // proposed (new) title/location
  proposeMovieTitle: string;
  proposeMovieYear: string;
  proposeMovieType: 'movie' | 'show';
  proposePlaceName: string;
  proposeAddress: string;
  proposeScene: string;
  // details
  description: string;
  allowPublicCredit: boolean;
  displayName: string;
}

const emptyDraft: Draft = {
  photo: null,
  movieTitle: '',
  locationId: '',
  locationName: '',
  proposeMovieTitle: '',
  proposeMovieYear: '',
  proposeMovieType: 'movie',
  proposePlaceName: '',
  proposeAddress: '',
  proposeScene: '',
  description: '',
  allowPublicCredit: true,
  displayName: '',
};

export const ContributeScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('photo');
  const [draft, setDraft] = useState<Draft>({ ...emptyDraft });
  const [titleQuery, setTitleQuery] = useState('');
  const [titles, setTitles] = useState<ContributionTitle[]>([]);
  const [locations, setLocations] = useState<ContributionLocationOption[]>([]);
  const [loadingTitles, setLoadingTitles] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [rightsConfirmed, setRightsConfirmed] = useState(false);

  const set = useCallback((patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
  }, []);

  // ── Photo picker (mirrors existing UploadPhotoScreen) ──
  const pickPhoto = useCallback(async (useCamera: boolean) => {
    try {
      const permStatus = useCamera
        ? await ImagePicker.getCameraPermissionsAsync()
        : await ImagePicker.getMediaLibraryPermissionsAsync();
      if (!permStatus.granted && !permStatus.canAskAgain) {
        Alert.alert('Permission needed', 'Photo access was previously denied. Please enable it in Settings.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]);
        return;
      }
      const permResult = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permResult.granted) {
        Alert.alert('Permission needed', `Please grant ${useCamera ? 'camera' : 'photo library'} access in Settings.`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]);
        return;
      }
      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.85 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.85 });
      if (!result.canceled && result.assets?.length) {
        set({ photo: result.assets[0] });
      }
    } catch {
      Alert.alert('Error', 'Could not open the photo picker.');
    }
  }, [set]);

  // ── Title search ──
  useEffect(() => {
    if (step !== 'movie') return;
    const t = setTimeout(async () => {
      setLoadingTitles(true);
      try {
        setTitles(await fetchTitles(titleQuery));
      } catch {
        setTitles([]);
      } finally {
        setLoadingTitles(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [titleQuery, step]);

  // ── Locations for selected title ──
  useEffect(() => {
    if (step !== 'location' || !draft.movieTitle) {
      setLocations([]);
      return;
    }
    let active = true;
    (async () => {
      setLoadingLocations(true);
      try {
        const opts = await fetchLocationsForTitle(draft.movieTitle);
        if (active) setLocations(opts);
      } catch {
        if (active) setLocations([]);
      } finally {
        if (active) setLoadingLocations(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [step, draft.movieTitle]);

  const canContinuePhoto = !!draft.photo;
  const canContinueMovie =
    !!(draft.movieTitle || draft.proposeMovieTitle.trim()) &&
    (!!draft.movieTitle || true); // new-title path fine with just a name
  const canContinueLocation =
    !!draft.locationId ||
    !!draft.proposePlaceName.trim();
  const canSubmit =
    rightsConfirmed &&
    !!draft.photo &&
    (!!draft.movieTitle || !!draft.proposeMovieTitle.trim()) &&
    (!!draft.locationId || !!draft.proposePlaceName.trim());

  const goDetailsNext = canContinueLocation;

  const handleSubmit = async () => {
    if (!rightsConfirmed) {
      Alert.alert('Almost there', 'Please confirm you have permission to share this photo.');
      return;
    }
    if (!draft.photo) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const proposedMovie =
        !draft.movieTitle && draft.proposeMovieTitle.trim()
          ? {
              movie_title: draft.proposeMovieTitle.trim(),
              year: draft.proposeMovieYear ? Number(draft.proposeMovieYear) || null : null,
              type: draft.proposeMovieType,
            }
          : undefined;
      const proposedLocation =
        !draft.locationId && draft.proposePlaceName.trim()
          ? {
              place_name: draft.proposePlaceName.trim(),
              address: draft.proposeAddress.trim() || undefined,
              scene_description: draft.proposeScene.trim() || undefined,
            }
          : undefined;
      const res = await submitContribution({
        location_id: draft.locationId || undefined,
        location_name: draft.locationName || undefined,
        movie_or_show: draft.movieTitle || undefined,
        proposed_movie_json: proposedMovie,
        proposed_location_json: proposedLocation,
        description: draft.description.trim() || undefined,
        submitter_uid: user?.uid || undefined,
        display_name: draft.displayName.trim() || user?.displayName || undefined,
        allow_public_credit: draft.allowPublicCredit,
        rights_confirmed: true,
        photo: {
          uri: draft.photo.uri,
          type: draft.photo.mimeType || 'image/jpeg',
          fileName: draft.photo.fileName || `contribution-${Date.now()}.jpg`,
        },
      });
      if (res.success) {
        setStep('success');
      }
    } catch (e: any) {
      setSubmitError(e?.message || 'Could not submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const close = () => navigation.goBack();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Contribute to Scene Nearby</Text>
        <TouchableOpacity onPress={close} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.closeBtn}>✕</Text>
        </TouchableOpacity>
      </View>
      {/* Progress */}
      <View style={styles.progressRow}>
        {(['photo', 'movie', 'location', 'details'] as Step[]).map((s) => {
          const activeIdx = ['photo', 'movie', 'location', 'details'].indexOf(s);
          const curIdx = ['photo', 'movie', 'location', 'details'].indexOf(step);
          const done = activeIdx < curIdx;
          const isCurrent = activeIdx === curIdx;
          return (
            <View key={s} style={[styles.progressDot, done && styles.progressDone, isCurrent && styles.progressCurrent]} />
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* ── STEP: PHOTO ── */}
        {step === 'photo' && (
          <View>
            <Text style={styles.title}>📸 Show us the spot</Text>
            <Text style={styles.subtitle}>
              Snap or pick a photo of the filming location. This is the one thing we always need.
            </Text>
            {draft.photo ? (
              <Image source={{ uri: draft.photo.uri }} style={styles.previewImage} resizeMode="cover" />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoPlaceholderEmoji}>🎬</Text>
                <Text style={styles.photoPlaceholderText}>No photo yet</Text>
              </View>
            )}
            <View style={styles.rowButtons}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => pickPhoto(false)}>
                <Text style={styles.secondaryButtonText}>Choose Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => pickPhoto(true)}>
                <Text style={styles.secondaryButtonText}>📷 Take Photo</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.primaryButton, !canContinuePhoto && styles.disabled]}
              disabled={!canContinuePhoto}
              onPress={() => setStep('movie')}
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP: MOVIE ── */}
        {step === 'movie' && (
          <View>
            <Text style={styles.title}>🎞️ Which movie or show?</Text>
            <Text style={styles.subtitle}>
              Pick an existing title, or add one we haven't listed yet.
            </Text>

            <Text style={styles.label}>Search Scene Nearby</Text>
            <TextInput
              style={styles.input}
              placeholder="Type a movie or TV show…"
              placeholderTextColor={theme.colors.textTertiary}
              value={titleQuery}
              onChangeText={setTitleQuery}
            />
            {loadingTitles ? (
              <ActivityIndicator color={theme.colors.gold} style={{ marginVertical: 12 }} />
            ) : (
              <ScrollView style={styles.titleList} nestedScrollEnabled>
                {titles.map((t) => {
                  const selected = draft.movieTitle === t.title;
                  return (
                    <TouchableOpacity
                      key={t.title}
                      style={[styles.optionRow, selected && styles.optionRowSelected]}
                      onPress={() => {
                        set({ movieTitle: t.title, proposeMovieTitle: '' });
                        setTitleQuery('');
                      }}
                    >
                      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                        {selected ? '✓ ' : ''}{t.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                {titles.length === 0 && !loadingTitles && (
                  <Text style={styles.hint}>No matching titles yet.</Text>
                )}
              </ScrollView>
            )}

            <View style={styles.dividerOr}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or add a new one</Text>
              <View style={styles.dividerLine} />
            </View>

            {!draft.movieTitle ? (
              <View>
                <Text style={styles.label}>Title</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. The Goonies"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={draft.proposeMovieTitle}
                  onChangeText={(v) => set({ proposeMovieTitle: v })}
                />
                <Text style={styles.label}>Year (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 1985"
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="number-pad"
                  value={draft.proposeMovieYear}
                  onChangeText={(v) => set({ proposeMovieYear: v })}
                />
                <View style={styles.rowButtons}>
                  {(['movie', 'show'] as const).map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.pill, draft.proposeMovieType === t && styles.pillSelected]}
                      onPress={() => set({ proposeMovieType: t })}
                    >
                      <Text style={[styles.pillText, draft.proposeMovieType === t && styles.pillTextSelected]}>
                        {t === 'movie' ? '🎬 Movie' : '📺 TV Show'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              <TouchableOpacity onPress={() => set({ movieTitle: '' })} style={styles.linkButton}>
                <Text style={styles.linkText}>Add a different/new title instead</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.primaryButton, !canContinueMovie && styles.disabled]}
              disabled={!canContinueMovie}
              onPress={() => setStep('location')}
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP: LOCATION ── */}
        {step === 'location' && (
          <View>
            <Text style={styles.title}>📍 Where was it filmed?</Text>
            <Text style={styles.subtitle}>
              {draft.movieTitle
                ? `Pick a ${draft.movieTitle} location, or tell us about one we missed.`
                : 'Tell us about the filming location.'}
            </Text>

            {draft.movieTitle && locations.length > 0 && (
              <ScrollView style={styles.titleList} nestedScrollEnabled>
                {locations.map((loc) => {
                  const selected = draft.locationId === loc.locationId;
                  return (
                    <TouchableOpacity
                      key={loc.locationId}
                      style={[styles.optionRow, selected && styles.optionRowSelected]}
                      onPress={() =>
                        set({ locationId: loc.locationId, locationName: loc.title, proposePlaceName: '' })
                      }
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                          {selected ? '✓ ' : ''}{loc.title}
                        </Text>
                        {!!loc.city && <Text style={styles.optionSub}>{loc.city}</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
            {draft.movieTitle && loadingLocations && (
              <ActivityIndicator color={theme.colors.gold} style={{ marginVertical: 12 }} />
            )}

            {!draft.locationId ? (
              <View>
                {draft.movieTitle && locations.length > 0 && (
                  <View style={styles.dividerOr}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or a spot we missed</Text>
                    <View style={styles.dividerLine} />
                  </View>
                )}
                <Text style={styles.label}>Place / address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Astoria Column, Oregon"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={draft.proposePlaceName}
                  onChangeText={(v) => set({ proposePlaceName: v, locationName: v })}
                />
                <Text style={styles.label}>Street address (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 1 Columbia River Scenic Hwy"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={draft.proposeAddress}
                  onChangeText={(v) => set({ proposeAddress: v })}
                />
                <Text style={styles.label}>What happens there in the scene? (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. The kids race bikes up the hill"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={draft.proposeScene}
                  onChangeText={(v) => set({ proposeScene: v })}
                  multiline
                />
              </View>
            ) : (
              <TouchableOpacity onPress={() => set({ locationId: '', locationName: '' })} style={styles.linkButton}>
                <Text style={styles.linkText}>Tell us about a different spot instead</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.primaryButton, !goDetailsNext && styles.disabled]}
              disabled={!goDetailsNext}
              onPress={() => setStep('details')}
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP: DETAILS ── */}
        {step === 'details' && (
          <View>
            <Text style={styles.title}>✍️ A few final touches</Text>
            <Text style={styles.subtitle}>
              Add context and choose how you'd like to appear. Then submit — it goes to our review queue.
            </Text>

            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.multiInput]}
              placeholder="What should visitors know about this spot?"
              placeholderTextColor={theme.colors.textTertiary}
              value={draft.description}
              onChangeText={(v) => set({ description: v })}
              multiline
            />

            <Text style={styles.label}>Display name (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder={user?.displayName || 'Your name'}
              placeholderTextColor={theme.colors.textTertiary}
              value={draft.displayName}
              onChangeText={(v) => set({ displayName: v })}
            />

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Give me credit publicly</Text>
                <Text style={styles.switchHint}>Show my display name with the photo</Text>
              </View>
              <Switch
                value={draft.allowPublicCredit}
                onValueChange={(v) => set({ allowPublicCredit: v })}
                trackColor={{ true: theme.colors.gold, false: theme.colors.surface3 }}
                thumbColor={theme.colors.black}
              />
            </View>

            {/* Rights affirmation */}
            <TouchableOpacity style={styles.affirmationRow} onPress={() => setRightsConfirmed((v) => !v)}>
              <View style={[styles.checkbox, rightsConfirmed && styles.checkboxChecked]}>
                {rightsConfirmed && <Text style={styles.checkboxMark}>✓</Text>}
              </View>
              <Text style={styles.affirmationText}>
                I took this photo or have permission to share it, and it's my own work.
              </Text>
            </TouchableOpacity>

            {!!submitError && <Text style={styles.errorText}>{submitError}</Text>}

            <TouchableOpacity
              style={[styles.primaryButton, !canSubmit && styles.disabled]}
              disabled={!canSubmit}
              onPress={handleSubmit}
            >
              {submitting ? (
                <ActivityIndicator color={theme.colors.black} />
              ) : (
                <Text style={styles.primaryButtonText}>Submit for review</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkButton} onPress={() => setStep('location')}>
              <Text style={styles.linkText}>← Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP: SUCCESS ── */}
        {step === 'success' && (
          <View style={styles.centered}>
            <Text style={styles.successEmoji}>🎉</Text>
            <Text style={styles.title}>Thank you!</Text>
            <Text style={styles.subtitle}>
              Your photo is in our review queue. Once approved, it'll appear with credit on the
              {draft.locationName ? ` ${draft.locationName}` : ''} location.
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={close}>
              <Text style={styles.primaryButtonText}>Done</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkButton} onPress={() => { setDraft({ ...emptyDraft }); setRightsConfirmed(false); setStep('photo'); }}>
              <Text style={styles.linkText}>Contribute another photo</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },
  closeBtn: { fontSize: 18, color: theme.colors.textTertiary, paddingHorizontal: 6 },
  progressRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingBottom: 8,
  },
  progressDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.surface3,
  },
  progressDone: { backgroundColor: theme.colors.gold },
  progressCurrent: { backgroundColor: theme.colors.goldLight, width: 14 },
  scrollContent: { padding: 20, paddingBottom: 48 },
  centered: { alignItems: 'center', paddingTop: 40 },
  title: { fontSize: 24, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 21, marginBottom: 24 },
  previewImage: { width: '100%', height: 260, borderRadius: 14, backgroundColor: theme.colors.surface2, marginBottom: 16 },
  photoPlaceholder: {
    width: '100%', height: 260, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.surface3, marginBottom: 16,
  },
  photoPlaceholderEmoji: { fontSize: 56 },
  photoPlaceholderText: { color: theme.colors.textTertiary, marginTop: 8 },
  rowButtons: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  secondaryButton: {
    flex: 1, backgroundColor: theme.colors.surface, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1, borderColor: theme.colors.surface3,
  },
  secondaryButtonText: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: theme.colors.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, color: theme.colors.textPrimary, borderWidth: 1, borderColor: theme.colors.surface3,
  },
  multiInput: { minHeight: 80, textAlignVertical: 'top' },
  titleList: { maxHeight: 220 },
  optionRow: {
    backgroundColor: theme.colors.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 6, borderWidth: 1, borderColor: theme.colors.surface3,
  },
  optionRowSelected: { borderColor: theme.colors.gold, backgroundColor: theme.colors.surface2 },
  optionText: { fontSize: 15, color: theme.colors.textPrimary },
  optionTextSelected: { color: theme.colors.goldLight },
  optionSub: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 },
  hint: { color: theme.colors.textTertiary, marginVertical: 8 },
  dividerOr: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.colors.surface3 },
  dividerText: { fontSize: 12, color: theme.colors.textTertiary },
  pill: {
    flex: 1, backgroundColor: theme.colors.surface, borderRadius: 12, paddingVertical: 12,
    alignItems: 'center', borderWidth: 1, borderColor: theme.colors.surface3,
  },
  pillSelected: { borderColor: theme.colors.gold, backgroundColor: theme.colors.surface2 },
  pillText: { fontSize: 15, color: theme.colors.textSecondary },
  pillTextSelected: { color: theme.colors.goldLight, fontWeight: '700' },
  linkButton: { paddingVertical: 12, alignItems: 'center' },
  linkText: { fontSize: 14, color: theme.colors.textTertiary, textDecorationLine: 'underline' },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface,
    borderRadius: 12, padding: 14, marginTop: 20, borderWidth: 1, borderColor: theme.colors.surface3,
  },
  switchLabel: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  switchHint: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 },
  affirmationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 20 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: theme.colors.surface3,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  checkboxChecked: { borderColor: theme.colors.gold, backgroundColor: theme.colors.gold },
  checkboxMark: { color: theme.colors.black, fontWeight: '900', fontSize: 14 },
  affirmationText: { flex: 1, fontSize: 13, color: theme.colors.textSecondary, lineHeight: 19 },
  errorText: { fontSize: 14, color: '#ff6b6b', textAlign: 'center', marginTop: 16 },
  primaryButton: {
    backgroundColor: theme.colors.gold, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24,
  },
  primaryButtonText: { fontSize: 16, fontWeight: '700', color: theme.colors.black },
  disabled: { opacity: 0.45 },
  successEmoji: { fontSize: 64 },
});
