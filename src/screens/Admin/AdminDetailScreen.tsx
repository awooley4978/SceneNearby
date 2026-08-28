import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { theme } from '../../theme';
import type { FilmingLocation } from '../../models';
import { apiClient, submissionPhotoUrl, REJECTION_REASONS, type PhotoSubmission } from '../../services/api';
import {
  EMPTY_FILTERS,
  applyDetailFilters,
  getUniqueValues,
  getUniqueRegions,
  getTitleFirstLetters,
  type DetailFilters,
} from '../../services/AdminService';

interface AdminDetailParams {
  type: string;
  label: string;
  items: any[];
}

type FilterChip = { value: string; label: string };

/** A labeled detail row in the full submission preview. */
const Field: React.FC<{ label: string; value: string; italic?: boolean }> = ({
  label,
  value,
  italic,
}) => (
  <View style={styles.fieldRow}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <Text style={[styles.fieldValue, italic && styles.fieldValueItalic]}>{value}</Text>
  </View>
);

export const AdminDetailScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { type, label, items = [] } = (route.params ?? {}) as AdminDetailParams;
  // Photo-approval rows are PhotoSubmission objects — they have no address,
  // city, or title, so location filters are meaningless there AND would crash
  // (deriveRegion/applyDetailFilters read fields that don't exist). Gate them
  // off so the approval screen renders without touching location fields.
  const isApproval = type === 'pendingApproval';
  const locationItems = useMemo(
    () => (isApproval ? [] : (items as FilmingLocation[])),
    [isApproval, items],
  );
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [filters, setFilters] = useState<DetailFilters>(EMPTY_FILTERS);

  // Derive filter options from the (unfiltered) location items
  const cities = useMemo(() => getUniqueValues(locationItems, 'city'), [locationItems]);
  const countries = useMemo(() => getUniqueValues(locationItems, 'country'), [locationItems]);
  const regions = useMemo(() => getUniqueRegions(locationItems), [locationItems]);
  const firstLetters = useMemo(() => getTitleFirstLetters(locationItems), [locationItems]);

  // Apply filters
  const filteredItems = useMemo(
    () => applyDetailFilters(locationItems, filters),
    [locationItems, filters],
  );

  const activeFilterCount = [
    filters.search.trim(),
    filters.city,
    filters.country,
    filters.region,
    filters.firstLetter,
  ].filter(Boolean).length;

  const setFilter = (key: keyof DetailFilters, value: string | null) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // ── Pending photo approvals (type === 'pendingApproval') ──
  const [localPending, setLocalPending] = useState<PhotoSubmission[] | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [previewSub, setPreviewSub] = useState<PhotoSubmission | null>(null);
  const [rejectSub, setRejectSub] = useState<PhotoSubmission | null>(null);
  const [rejectReason, setRejectReason] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  // Load/error state for the queue's own fetch. The dashboard pre-fetches the
  // pending list and passes it via route params, but that call can fail
  // silently and leave a misleading "All caught up". This screen therefore
  // re-fetches the pending submissions itself on mount so the REAL pending
  // items are always shown, with an explicit error + Retry when the network
  // call fails instead of a fake empty state.
  const [queueLoading, setQueueLoading] = useState(isApproval);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [queueAttempt, setQueueAttempt] = useState(0);
  useEffect(() => {
    if (!isApproval) return;
    let cancelled = false;
    setQueueLoading(true);
    setQueueError(null);
    apiClient
      .getPendingContributions()
      .then((subs) => {
        if (cancelled) return;
        setLocalPending(subs);
        setQueueLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setQueueError(err instanceof Error ? err.message : String(err));
        setQueueLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isApproval, queueAttempt]);
  const retryQueue = () => setQueueAttempt((n) => n + 1);
  const pendingItems = localPending ?? (items as PhotoSubmission[]);
  const removeFromPending = (id: string) =>
    setLocalPending((prev) => (prev ?? (items as PhotoSubmission[])).filter((s) => s.id !== id));
  const decide = async (sub: PhotoSubmission, decision: 'approve' | 'reject') => {
    setActingOn(sub.id);
    try {
      if (decision === 'approve') await apiClient.approveSubmission(sub.id);
      else await apiClient.rejectSubmission(sub.id, rejectReason || 'Other');
      removeFromPending(sub.id);
    } catch (err) {
      Alert.alert('Action failed', err instanceof Error ? err.message : String(err));
    } finally {
      setActingOn(null);
    }
  };
  /** Open the required-reason rejection modal for a submission. */
  const openReject = (sub: PhotoSubmission) => {
    setPreviewSub(null);
    setRejectSub(sub);
    setRejectReason(null);
    setRejectNote('');
  };
  /** Finalize a rejection once the admin has picked a reason. */
  const confirmReject = async () => {
    if (!rejectSub || !rejectReason) return;
    setActingOn(rejectSub.id);
    try {
      const res = await apiClient.rejectSubmission(
        rejectSub.id,
        rejectReason,
        rejectReason === 'Other' && rejectNote.trim() ? rejectNote.trim() : undefined,
      );
      removeFromPending(rejectSub.id);
      setRejectSub(null);
      setRejectReason(null);
      setRejectNote('');
      Alert.alert(
        'Photo rejected',
        res.email_sent
          ? `Reason saved. The submitter was emailed at ${rejectSub.user_info}.`
          : 'Reason saved. No email was sent (no submitter email on file).',
      );
    } catch (err) {
      Alert.alert('Action failed', err instanceof Error ? err.message : String(err));
    } finally {
      setActingOn(null);
    }
  };

  const clearAllFilters = () => setFilters(EMPTY_FILTERS);

  const renderChips = (
    options: string[],
    selected: string | null,
    onSelect: (v: string | null) => void,
  ) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
      <TouchableOpacity
        style={[styles.chip, !selected && styles.chipActive]}
        onPress={() => onSelect(null)}
      >
        <Text style={[styles.chipText, !selected && styles.chipTextActive]}>All</Text>
      </TouchableOpacity>
      {options.map((opt) => {
        const isActive = selected === opt;
        return (
          <TouchableOpacity
            key={opt}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => onSelect(isActive ? null : opt)}
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  if (isApproval) {
    return (
      <View style={styles.container}>
        {/* Header bar */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{label}</Text>
          <Text style={styles.headerCount}>{pendingItems.length}</Text>
        </View>
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {queueLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={theme.colors.gold} />
              <Text style={styles.emptySub}>Loading pending photos…</Text>
            </View>
          ) : queueError ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>⚠️</Text>
              <Text style={styles.emptyTitle}>Couldn't load the queue</Text>
              <Text style={styles.emptySub}>{queueError}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={retryQueue} activeOpacity={0.7}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : pendingItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>✅</Text>
              <Text style={styles.emptyTitle}>All caught up</Text>
              <Text style={styles.emptySub}>No photos awaiting approval.</Text>
            </View>
          ) : (
            pendingItems.map((sub) => {
              const photoUrl = submissionPhotoUrl(sub);
              return (
                <View key={sub.id} style={styles.row}>
                  {/* Tappable row + thumbnail → opens the full preview modal */}
                  <TouchableOpacity
                    style={styles.rowPreview}
                    onPress={() => setPreviewSub(sub)}
                    activeOpacity={0.7}
                  >
                    {photoUrl ? (
                      <Image source={{ uri: photoUrl }} style={styles.thumb} />
                    ) : (
                      <View style={[styles.thumb, styles.thumbEmpty]}>
                        <Text style={styles.thumbEmptyText}>🖼</Text>
                      </View>
                    )}
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {sub.location_name || sub.location_id}
                      </Text>
                      <Text style={styles.rowSub}>
                        {sub.status} • {sub.id} •{' '}
                        {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : ''}
                      </Text>
                      {sub.comment ? (
                        <Text style={styles.rowComment} numberOfLines={1}>
                          “{sub.comment}”
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.rowChevron}>👁</Text>
                  </TouchableOpacity>
                  <View style={styles.approvalActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.approveButton]}
                      onPress={() => decide(sub, 'approve')}
                      disabled={actingOn === sub.id}
                    >
                      <Text style={styles.actionText}>✓ Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => openReject(sub)}
                      disabled={actingOn === sub.id}
                    >
                      <Text style={styles.actionText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Full preview of the tapped submission photo + actions */}
        <Modal
          visible={previewSub !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewSub(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle} numberOfLines={2}>
                {previewSub?.location_name || previewSub?.location_id || 'Submission'}
              </Text>
              <Text style={styles.modalMeta}>
                {previewSub?.id} •{' '}
                {previewSub?.submitted_at
                  ? new Date(previewSub.submitted_at).toLocaleString()
                  : ''}
              </Text>
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator>
                {previewSub && submissionPhotoUrl(previewSub) ? (
                  <Image
                    source={{ uri: submissionPhotoUrl(previewSub)! }}
                    style={styles.modalImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.modalNoImage}>
                    <Text style={styles.modalNoImageText}>No image on file for this submission</Text>
                  </View>
                )}
                {/* ── Full submitted detail ── */}
                {previewSub?.movie_or_show ? (
                  <Field label="Movie / Show" value={previewSub.movie_or_show} />
                ) : null}
                {previewSub?.proposed_movie_json ? (
                  <Field
                    label="Proposed New Title"
                    value={
                      previewSub.proposed_movie_json.movie_title
                        ? `${previewSub.proposed_movie_json.movie_title}${
                            previewSub.proposed_movie_json.year
                              ? ` (${previewSub.proposed_movie_json.year})`
                              : ''
                          }${
                            previewSub.proposed_movie_json.type
                              ? ` — ${previewSub.proposed_movie_json.type}`
                              : ''
                          }`
                        : JSON.stringify(previewSub.proposed_movie_json)
                    }
                  />
                ) : null}
                {previewSub?.location_name ? (
                  <Field label="Location / Name" value={previewSub.location_name} />
                ) : null}
                {previewSub?.proposed_location_json ? (
                  <Field
                    label="Proposed Location"
                    value={
                      [
                        previewSub.proposed_location_json.title,
                        previewSub.proposed_location_json.address,
                        previewSub.proposed_location_json.city,
                      ]
                        .filter(Boolean)
                        .join(' · ') || JSON.stringify(previewSub.proposed_location_json)
                    }
                  />
                ) : null}
                {previewSub?.comment ? (
                  <Field label="Notes" value={previewSub.comment} italic />
                ) : null}
                {previewSub?.description ? (
                  <Field label="Scene / Description" value={previewSub.description} italic />
                ) : null}
                {previewSub?.display_name ? (
                  <Field label="Contributor" value={previewSub.display_name} />
                ) : null}
                {previewSub?.allow_public_credit === false || (previewSub && !previewSub.display_name) ? (
                  <Field label="Contributor" value="Anonymous community contributor" />
                ) : null}
                <Field
                  label="Photo rights"
                  value={
                    previewSub?.rights_confirmed
                      ? 'Confirmed rights to share this photo'
                      : 'Not confirmed'
                  }
                />
                {previewSub?.submitter_uid ? (
                  <Field label="Submitter UID" value={previewSub.submitter_uid} />
                ) : null}
              </ScrollView>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.approveButton, styles.modalAction]}
                  onPress={() => {
                    const sub = previewSub;
                    setPreviewSub(null);
                    if (sub) decide(sub, 'approve');
                  }}
                  disabled={previewSub ? actingOn === previewSub.id : false}
                >
                  <Text style={styles.actionText}>✓ Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton, styles.modalAction]}
                  onPress={() => {
                    if (previewSub) openReject(previewSub);
                  }}
                  disabled={previewSub ? actingOn === previewSub.id : false}
                >
                  <Text style={styles.actionText}>✕ Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.closeButton, styles.modalAction]}
                  onPress={() => setPreviewSub(null)}
                >
                  <Text style={styles.actionText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Reject photo — required reason before finalizing */}
        <Modal
          visible={rejectSub !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setRejectSub(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle} numberOfLines={2}>
                Reject photo
              </Text>
              <Text style={styles.modalMeta}>
                {rejectSub?.location_name || rejectSub?.location_id || 'Submission'}
                {rejectSub?.user_info ? ` • by ${rejectSub.user_info}` : ''}
              </Text>
              <Text style={styles.rejectHint}>Select a reason — required to finalize the rejection.</Text>
              <ScrollView style={styles.rejectList} nestedScrollEnabled>
                {REJECTION_REASONS.map((reason) => {
                  const selected = rejectReason === reason;
                  return (
                    <TouchableOpacity
                      key={reason}
                      style={[styles.rejectOption, selected && styles.rejectOptionActive]}
                      onPress={() => setRejectReason(reason)}
                    >
                      <View style={[styles.rejectDot, selected && styles.rejectDotActive]}>
                        {selected ? <Text style={styles.rejectDotCheck}>✓</Text> : null}
                      </View>
                      <Text style={[styles.rejectOptionText, selected && styles.rejectOptionTextActive]}>
                        {reason}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                {rejectReason === 'Other' ? (
                  <TextInput
                    style={styles.rejectNoteInput}
                    placeholder="Short note for the submitter (optional)"
                    placeholderTextColor={theme.colors.textTertiary}
                    value={rejectNote}
                    onChangeText={setRejectNote}
                    maxLength={500}
                    multiline
                  />
                ) : null}
              </ScrollView>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.closeButton, styles.modalAction]}
                  onPress={() => setRejectSub(null)}
                >
                  <Text style={styles.actionText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.rejectButton,
                    styles.modalAction,
                    !rejectReason && styles.actionDisabled,
                  ]}
                  onPress={confirmReject}
                  disabled={!rejectReason || (rejectSub ? actingOn === rejectSub.id : false)}
                >
                  <Text style={styles.actionText}>✕ Reject Photo</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{label}</Text>
        <Text style={styles.headerCount}>{filteredItems.length}</Text>
      </View>

      {/* Filter toggle + search */}
      <View style={styles.filterBar}>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search title, movie, or address…"
            placeholderTextColor={theme.colors.textTertiary}
            value={filters.search}
            onChangeText={(t) => setFilter('search', t || null)}
            autoCorrect={false}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.filterToggle, filtersExpanded && styles.filterToggleActive]}
            onPress={() => setFiltersExpanded(!filtersExpanded)}
          >
            <Text style={styles.filterToggleIcon}>🔍</Text>
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Expandable chip filters */}
        {filtersExpanded && (
          <View style={styles.filterPanel}>
            {activeFilterCount > 0 && (
              <TouchableOpacity style={styles.clearButton} onPress={clearAllFilters}>
                <Text style={styles.clearButtonText}>Clear all filters</Text>
              </TouchableOpacity>
            )}

            {/* City */}
            {cities.length > 1 && (
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>City</Text>
                {renderChips(cities, filters.city, (v) => setFilter('city', v))}
              </View>
            )}

            {/* Region (State/Country) */}
            {regions.length > 1 && (
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Region</Text>
                {renderChips(regions, filters.region, (v) => setFilter('region', v))}
              </View>
            )}

            {/* Country */}
            {countries.length > 1 && (
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Country</Text>
                {renderChips(countries, filters.country, (v) => setFilter('country', v))}
              </View>
            )}

            {/* First letter */}
            {firstLetters.length > 1 && (
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>First Letter</Text>
                {renderChips(firstLetters, filters.firstLetter, (v) => setFilter('firstLetter', v))}
              </View>
            )}
          </View>
        )}
      </View>

      {/* Empty state */}
      {filteredItems.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyTitle}>No matches</Text>
          <Text style={styles.emptySub}>
            {items.length > 0
              ? 'Try adjusting your filters or search term.'
              : 'No items need attention here.'}
          </Text>
          {activeFilterCount > 0 && (
            <TouchableOpacity style={styles.clearButtonLarge} onPress={clearAllFilters}>
              <Text style={styles.clearButtonText}>Clear all filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* List */}
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {filteredItems.map((loc) => (
          <TouchableOpacity
            key={loc.id}
            style={styles.row}
            onPress={() => navigation.navigate('LocationDetail', { locationId: loc.id })}
            activeOpacity={0.7}
          >
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>{loc.title}</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('MovieDetail', { movieTitle: loc.movieOrShow })}
                activeOpacity={0.6}
                hitSlop={{ top: 4, bottom: 4 }}
              >
                <Text style={styles.rowMovie}>
                  {loc.movieOrShow}{loc.year ? ` (${loc.year})` : ''}
                </Text>
              </TouchableOpacity>
              <Text style={styles.rowSub}>
                {loc.city}, {loc.country}
              </Text>
            </View>
            <Text style={styles.rowChevron}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surface3,
  },
  backButton: { paddingRight: 12 },
  backText: { fontSize: 16, color: theme.colors.gold, fontWeight: '600' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },
  headerCount: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    backgroundColor: theme.colors.surface2,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },

  // Filter bar
  filterBar: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surface3,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: theme.colors.surface2,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  filterToggle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: theme.colors.surface2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterToggleActive: {
    backgroundColor: theme.colors.gold + '20',
  },
  filterToggleIcon: { fontSize: 18 },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: theme.colors.gold,
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: { fontSize: 10, fontWeight: '700', color: '#000' },
  filterPanel: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surface3,
    paddingTop: 10,
  },
  clearButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: theme.colors.surface3 + '80',
    marginBottom: 8,
  },
  clearButtonLarge: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: theme.colors.gold + '20',
    marginTop: 14,
  },
  clearButtonText: { fontSize: 12, fontWeight: '600', color: theme.colors.gold },
  filterSection: { marginBottom: 12 },
  filterLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginLeft: 4,
  },
  chipRow: { flexDirection: 'row', marginBottom: 2 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: theme.colors.surface2,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: theme.colors.gold,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  chipTextActive: {
    color: '#000',
    fontWeight: '700',
  },

  // Empty
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 4 },
  emptySub: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center' },
  retryButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 24,
    backgroundColor: theme.colors.gold,
  },
  retryButtonText: { color: theme.colors.white, fontSize: 15, fontWeight: '700' },

  // List
  list: { flex: 1 },
  listContent: { paddingBottom: 40 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surface3 + '60',
  },
  rowPreview: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: theme.colors.surface2,
    marginRight: 12,
  },
  thumbEmpty: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbEmptyText: { fontSize: 18 },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  rowComment: {
    fontSize: 12,
    fontStyle: 'italic',
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  rowMovie: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.gold,
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  rowSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  rowChevron: { fontSize: 18, color: theme.colors.textTertiary },
  approvalActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionButton: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
  },
  approveButton: { backgroundColor: '#22C55E22', borderColor: '#22C55E' },
  rejectButton: { backgroundColor: '#EF444422', borderColor: '#EF4444' },
  closeButton: { backgroundColor: theme.colors.surface2, borderColor: theme.colors.surface3 },
  actionText: { fontSize: 12, fontWeight: '700', color: theme.colors.textPrimary },

  // Photo preview modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.gold + '40',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  modalMeta: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  modalScroll: { maxHeight: 420, marginTop: 4 },
  fieldRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.textSecondary + '33',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: theme.colors.textSecondary,
    marginBottom: 3,
  },
  fieldValue: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    lineHeight: 20,
  },
  fieldValueItalic: {
    fontStyle: 'italic',
    color: theme.colors.textSecondary,
  },
  modalImage: {
    width: '100%',
    height: 320,
    borderRadius: 12,
    backgroundColor: theme.colors.surface2,
    marginTop: 14,
  },
  modalNoImage: {
    height: 160,
    borderRadius: 12,
    backgroundColor: theme.colors.surface2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  modalNoImageText: { fontSize: 13, color: theme.colors.textSecondary },
  modalComment: {
    fontSize: 14,
    fontStyle: 'italic',
    color: theme.colors.textPrimary,
    marginTop: 12,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 16,
  },
  modalAction: { flex: 1, alignItems: 'center' },
  actionDisabled: { opacity: 0.4 },

  // Reject reason modal
  rejectHint: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 10 },
  rejectList: { marginTop: 10, maxHeight: 340 },
  rejectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.surface3,
    marginBottom: 8,
    backgroundColor: theme.colors.surface2,
  },
  rejectOptionActive: { borderColor: '#EF4444', backgroundColor: '#EF444412' },
  rejectDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.colors.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectDotActive: { borderColor: '#EF4444', backgroundColor: '#EF4444' },
  rejectDotCheck: { fontSize: 12, fontWeight: '900', color: '#FFFFFF' },
  rejectOptionText: { fontSize: 14, color: theme.colors.textPrimary, flex: 1 },
  rejectOptionTextActive: { fontWeight: '700', color: '#FCA5A5' },
  rejectNoteInput: {
    borderWidth: 1,
    borderColor: theme.colors.surface3,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.colors.textPrimary,
    fontSize: 14,
    minHeight: 64,
    textAlignVertical: 'top',
    marginBottom: 8,
    backgroundColor: theme.colors.surface2,
  },
});
