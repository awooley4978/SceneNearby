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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { LicensePicker } from '../../components/LicensePicker';
import {
  fetchTitles,
  fetchLocationsForTitle,
  submitContribution,
} from '../../services/contributionService';
import type {
  ContributionTitle,
  ContributionLocationOption,
} from '../../services/contributionService';

// Guided community contribution flow (fast path for someone on vacation):
//   Photo -> Movie/Show -> Location -> Last Step -> Submitted
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
  proposeCity: string; // "City & state/province", e.g. "Arlington, TX"
  proposeExactLocation: string; // "Exact location or address", e.g. "AT&T Stadium, 1 AT&T Way"
  // last step
  anonymous: boolean;
  displayName: string;
  // license captured at upload time (owner rule 08-23): renders clickable
  license: string | null;
  licenseUrl: string | null;
}

const emptyDraft: Draft = {
  photo: null,
  movieTitle: '',
  locationId: '',
  locationName: '',
  proposeMovieTitle: '',
  proposeMovieYear: '',
  proposeMovieType: 'movie',
  proposeCity: '',
  proposeExactLocation: '',
  anonymous: false,
  displayName: '',
  license: null as string | null,
  licenseUrl: null as string | null,
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
  const hasMovieSelection = !!draft.movieTitle;
  const canContinueMovie =
    !!draft.movieTitle || !!draft.proposeMovieTitle.trim();
  const hasLocationSelection = !!draft.locationId;
  const hasNewLocation = !!draft.proposeCity.trim() || !!draft.proposeExactLocation.trim();
  const canContinueLocation = hasLocationSelection || hasNewLocation;

  // Final step can submit only when the permission is confirmed, a license is
  // chosen (owner rule 08-23: every upload must carry a clickable license), and
  // the user has chosen how to be shown (a name, or anonymous).
  const canSubmit =
    rightsConfirmed && !!draft.license && (!!draft.displayName.trim() || draft.anonymous) && !!draft.photo;

  // If the user picks anonymous, drop the entered name so it isn't sent.
  const toggleAnonymous = () => {
    setDraft((d) => ({
      ...d,
      anonymous: !d.anonymous,
      displayName: !d.anonymous ? '' : d.displayName,
    }));
  };

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
        !draft.locationId && hasNewLocation
          ? {
              place_name: draft.proposeExactLocation.trim() || draft.proposeCity.trim() || undefined,
              city: draft.proposeCity.trim() || undefined,
            }
          : undefined;
      const res = await submitContribution({
        location_id: draft.locationId || undefined,
        location_name: draft.locationName || proposedLocation?.place_name || undefined,
        movie_or_show: draft.movieTitle || undefined,
        proposed_movie_json: proposedMovie,
        proposed_location_json: proposedLocation,
        submitter_uid: user?.uid || undefined,
        display_name: draft.anonymous ? undefined : draft.displayName.trim() || user?.displayName || undefined,
        // anonymous users don't get a public credit; named users do
        allow_public_credit: !draft.anonymous,
        rights_confirmed: true,
        license: draft.license || undefined,
        license_url: draft.licenseUrl || undefined,
        community_permission: 'display',
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

  const close = useCallback(() => navigation.goBack(), [navigation]);

  // The success state is a brief confirmation: after a short pause we
  // automatically return to Scene Nearby. Tapping "Add another" restarts
  // the flow before the auto-dismiss fires.
  useEffect(() => {
    if (step !== 'success') return;
    const t = setTimeout(close, 4000);
    return () => clearTimeout(t);
  }, [step, close]);

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
        {/* ── STEP 1: PHOTO ── */}
        {step === 'photo' && (
          <View>
            <Text style={styles.title}>Show us the spot 📸</Text>
            <Text style={styles.subtitle}>Snap or choose a photo of the filming location.</Text>
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

        {/* ── STEP 2: MOVIE OR SHOW ── */}
        {step === 'movie' && (
          <View>
            <Text style={styles.title}>🎞️ Which movie or show?</Text>
            <Text style={styles.subtitle}>
              Pick an existing title, or add one we haven't listed yet.
            </Text>

            {hasMovieSelection ? (
              // Selected title — clear feedback that the tap worked.
              <View>
                <Text style={styles.label}>Movie or show</Text>
                <View style={styles.selectedCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectedCheck}>✓ {draft.movieTitle}</Text>
                    <Text style={styles.selectedSub}>Existing title in Scene Nearby</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      set({ movieTitle: '' });
                      setTitleQuery('');
                    }}
                    style={styles.changeButton}
                  >
                    <Text style={styles.changeButtonText}>Change</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  onPress={() => set({ movieTitle: '', proposeMovieTitle: '' })}
                  style={styles.linkButton}
                >
                  <Text style={styles.linkText}>Add a different/new title instead</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => setStep('location')}
                >
                  <Text style={styles.primaryButtonText}>Continue</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
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
                    {titles.map((t) => (
                      <TouchableOpacity
                        key={t.title}
                        style={styles.optionRow}
                        onPress={() => {
                          set({ movieTitle: t.title, proposeMovieTitle: '' });
                          setTitleQuery('');
                        }}
                      >
                        <Text style={styles.optionText}>{t.title}</Text>
                      </TouchableOpacity>
                    ))}
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

                <TouchableOpacity
                  style={[styles.primaryButton, !canContinueMovie && styles.disabled]}
                  disabled={!canContinueMovie}
                  onPress={() => setStep('location')}
                >
                  <Text style={styles.primaryButtonText}>Continue</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ── STEP 3: LOCATION ── */}
        {step === 'location' && (
          <View>
            <Text style={styles.title}>📍 Where was this filmed?</Text>

            {draft.movieTitle ? (
              <Text style={styles.subtitle}>
                Pick a {draft.movieTitle} location we already have, or tell us about one we missed.
              </Text>
            ) : (
              <Text style={styles.subtitle}>Tell us where the location is.</Text>
            )}

            {hasLocationSelection ? (
              <View>
                <View style={styles.selectedCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectedCheck}>✓ {draft.locationName}</Text>
                    <Text style={styles.selectedSub}>Known Scene Nearby location</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => set({ locationId: '', locationName: '' })}
                    style={styles.changeButton}
                  >
                    <Text style={styles.changeButtonText}>Change</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  onPress={() => set({ locationId: '', locationName: '' })}
                  style={styles.linkButton}
                >
                  <Text style={styles.linkText}>Tell us about a different spot instead</Text>
                </TouchableOpacity>
              </View>
            ) : (
              draft.movieTitle && (
                <View>
                  {locations.length > 0 && (
                    <ScrollView style={styles.titleList} nestedScrollEnabled>
                      {locations.map((loc) => (
                        <TouchableOpacity
                          key={loc.locationId}
                          style={styles.optionRow}
                          onPress={() =>
                            set({ locationId: loc.locationId, locationName: loc.title, proposeCity: '', proposeExactLocation: '' })
                          }
                        >
                          <Text style={styles.optionText}>{loc.title}</Text>
                          {!!loc.city && <Text style={styles.optionSub}>{loc.city}</Text>}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                  {loadingLocations && (
                    <ActivityIndicator color={theme.colors.gold} style={{ marginVertical: 12 }} />
                  )}
                  {locations.length > 0 && (
                    <View style={styles.dividerOr}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>or a spot we missed</Text>
                      <View style={styles.dividerLine} />
                    </View>
                  )}
                </View>
              )
            )}

            {/* New-spot fields */}
            <Text style={styles.label}>City & state/province</Text>
            <TextInput
              style={styles.input}
              placeholder="Arlington, TX  ·  Lyon, France"
              placeholderTextColor={theme.colors.textTertiary}
              value={draft.proposeCity}
              onChangeText={(v) => set({ proposeCity: v })}
            />
            <Text style={styles.label}>Exact location or address (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="AT&T Stadium, 1 AT&T Way"
              placeholderTextColor={theme.colors.textTertiary}
              value={draft.proposeExactLocation}
              onChangeText={(v) => set({ proposeExactLocation: v, locationName: v })}
            />

            <TouchableOpacity
              style={[styles.primaryButton, !canContinueLocation && styles.disabled]}
              disabled={!canContinueLocation}
              onPress={() => setStep('details')}
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP 4: LAST STEP (permission + how to show the photo) ── */}
        {step === 'details' && (
          <View>
            <Text style={styles.title}>Almost done!</Text>

            <Text style={styles.label}>Photo permission</Text>
            <TouchableOpacity style={styles.affirmationRow} onPress={() => setRightsConfirmed((v) => !v)}>
              <View style={[styles.checkbox, rightsConfirmed && styles.checkboxChecked]}>
                {rightsConfirmed && <Text style={styles.checkboxMark}>✓</Text>}
              </View>
              <Text style={styles.affirmationText}>I took this photo or have permission to share it.</Text>
            </TouchableOpacity>

            <Text style={styles.label}>How should we show your photo?</Text>

            {/* Anonymous toggle */}
            <TouchableOpacity style={styles.affirmationRow} onPress={toggleAnonymous}>
              <View style={[styles.checkbox, draft.anonymous && styles.checkboxChecked]}>
                {draft.anonymous && <Text style={styles.checkboxMark}>✓</Text>}
              </View>
              <Text style={styles.affirmationText}>Keep me anonymous</Text>
            </TouchableOpacity>

            <Text style={styles.label}>Name to show (optional)</Text>
            <TextInput
              style={[styles.input, draft.anonymous && styles.disabledInput]}
              placeholder="Your name"
              placeholderTextColor={theme.colors.textTertiary}
              value={draft.anonymous ? '' : draft.displayName}
              onChangeText={(v) => set({ displayName: v })}
              editable={!draft.anonymous}
            />
            <Text style={styles.hint}>Example: “Photo by Linda”</Text>

            <LicensePicker
              value={draft.license}
              onChange={(lic, url) => set({ license: lic, licenseUrl: url })}
            />

            {!!submitError && <Text style={styles.errorText}>{submitError}</Text>}

            {/* Reveal the submit action only once the final step is complete. */}
            {canSubmit && (
              <TouchableOpacity
                style={styles.primaryButton}
                disabled={submitting}
                onPress={handleSubmit}
              >
                {submitting ? (
                  <ActivityIndicator color={theme.colors.black} />
                ) : (
                  <Text style={styles.primaryButtonText}>Submit for Review</Text>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.linkButton} onPress={() => setStep('location')}>
              <Text style={styles.linkText}>← Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── SUCCESS — submission is the finish line, no separate Done ── */}
        {step === 'success' && (
          <View style={styles.centered}>
            <Text style={styles.successEmoji}>🎉</Text>
            <Text style={styles.title}>Submitted!</Text>
            <Text style={styles.subtitle}>
              Thanks — your photo is in our review queue. Once approved, it'll be shown on the
              {draft.locationName ? ` ${draft.locationName}` : ''} location.
            </Text>
            {/* Add another is a small opportunity, never a required action.
                Submission is the finish line — exit happens via the header ✕. */}
            <TouchableOpacity
              style={styles.anotherButton}
              onPress={() => { setDraft({ ...emptyDraft }); setRightsConfirmed(false); setStep('photo'); }}
            >
              <Text style={styles.anotherButtonText}>＋ Contribute another</Text>
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
  disabledInput: { opacity: 0.4 },
  titleList: { maxHeight: 220 },
  optionRow: {
    backgroundColor: theme.colors.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 6, borderWidth: 1, borderColor: theme.colors.surface3,
  },
  optionText: { fontSize: 15, color: theme.colors.textPrimary },
  optionSub: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 },
  hint: { color: theme.colors.textTertiary, marginVertical: 8 },
  selectedCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: theme.colors.gold,
  },
  selectedCheck: { fontSize: 17, fontWeight: '700', color: theme.colors.goldLight },
  selectedSub: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 3 },
  changeButton: { paddingHorizontal: 10, paddingVertical: 6 },
  changeButtonText: { fontSize: 14, color: theme.colors.textTertiary, textDecorationLine: 'underline' },
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
  affirmationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 8 },
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
    alignSelf: 'stretch',
  },
  primaryButtonText: { fontSize: 16, fontWeight: '700', color: theme.colors.black },
  disabled: { opacity: 0.45 },
  successEmoji: { fontSize: 64 },
  anotherButton: {
    marginTop: 32, alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 20,
    borderRadius: 20, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.surface3,
  },
  anotherButtonText: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },
});
