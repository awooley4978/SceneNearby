import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { theme } from '../../theme';
import {
  fetchResearchCandidates,
  fetchResearchPhotoCandidates,
  updateCandidateStatus,
  STATUS_META,
  PHOTO_STATUS_META,
  STATUS_SORT_ORDER,
  confidenceColor,
  formatDate,
  type ResearchCandidate,
  type ResearchPhotoCandidate,
  type VerificationStatus,
} from '../../services/research';

type StatusFilterKey = 'all' | VerificationStatus;

const STATUS_FILTERS: { key: StatusFilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'ready_for_review', label: 'Ready' },
  { key: 'verified', label: 'Verified' },
  { key: 'approved', label: 'Approved' },
  { key: 'needs_research', label: 'Needs Research' },
  { key: 'rejected', label: 'Rejected' },
];

export const AdminResearchScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [candidates, setCandidates] = useState<ResearchCandidate[]>([]);
  const [photos, setPhotos] = useState<ResearchPhotoCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilterKey>('all');
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [detailCandidate, setDetailCandidate] = useState<ResearchCandidate | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, p] = await Promise.all([
        fetchResearchCandidates(),
        fetchResearchPhotoCandidates(),
      ]);
      setCandidates(c);
      setPhotos(p);
    } catch (err) {
      const e = err as { code?: string; message?: string };
      const msg = e.message || String(err);
      const permissionDenied =
        e.code === 'permission-denied' ||
        /permission|insufficient/i.test(msg);
      setError(
        permissionDenied
          ? 'Firestore denied read access to the research_* collections. The app needs rules that allow authenticated admins to read them (report the gap — do not loosen rules unilaterally).'
          : `Failed to load research data: ${msg}`,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, retryTick]);

  const photoByCandidate = useMemo(() => {
    const map = new Map<string, ResearchPhotoCandidate[]>();
    for (const p of photos) {
      const list = map.get(p.candidate_id) ?? [];
      list.push(p);
      map.set(p.candidate_id, list);
    }
    return map;
  }, [photos]);

  const filtered = useMemo(() => {
    const list = filter === 'all' ? candidates : candidates.filter((c) => c.verification_status === filter);
    return [...list].sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      return STATUS_SORT_ORDER[a.verification_status] - STATUS_SORT_ORDER[b.verification_status];
    });
  }, [candidates, filter]);

  const decide = async (candidate: ResearchCandidate, status: VerificationStatus) => {
    setActingOn(candidate.id);
    try {
      await updateCandidateStatus(candidate.id, status);
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === candidate.id
            ? { ...c, verification_status: status, updated_at: new Date().toISOString() }
            : c,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActingOn(null);
    }
  };

  const stats = useMemo(() => {
    const count = (s: VerificationStatus) => candidates.filter((c) => c.verification_status === s).length;
    return {
      ready: count('ready_for_review'),
      verified: count('verified'),
      approved: count('approved'),
      needs: count('needs_research'),
      rejected: count('rejected'),
    };
  }, [candidates]);

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Location Research</Text>
        <Text style={styles.headerCount}>{filtered.length}</Text>
      </View>

      {error && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>⚠️ {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => setRetryTick((t) => t + 1)}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.gold} />
        </View>
      ) : (
        <>
          {/* Status summary chips */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryChip}><Text style={styles.summaryChipText}>✅ {stats.verified + stats.approved} done</Text></View>
            <View style={styles.summaryChip}><Text style={styles.summaryChipText}>🟡 {stats.ready} ready</Text></View>
            <View style={styles.summaryChip}><Text style={styles.summaryChipText}>🟠 {stats.needs} needs</Text></View>
            <View style={styles.summaryChip}><Text style={styles.summaryChipText}>❌ {stats.rejected} rejected</Text></View>
          </View>

          {/* Quick status filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {STATUS_FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setFilter(f.key)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {filtered.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🔬</Text>
                <Text style={styles.emptyTitle}>No research candidates</Text>
                <Text style={styles.emptySub}>
                  {candidates.length === 0
                    ? 'Nothing in research_candidates yet. Load demo data from the web Admin (staging /admin → Location Research → "Load demo data") — this app reads the same Firestore collections.'
                    : 'No candidates match this status filter.'}
                </Text>
              </View>
            ) : (
              filtered.map((c) => {
                const statusMeta = STATUS_META[c.verification_status];
                const confColor = confidenceColor(c.confidence);
                const candPhotos = photoByCandidate.get(c.id) ?? [];
                const photoMeta = candPhotos[0] ? PHOTO_STATUS_META[candPhotos[0].use_status] : null;
                return (
                  <View key={c.id} style={styles.row}>
                    <TouchableOpacity
                      style={styles.rowMain}
                      onPress={() => setDetailCandidate(c)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.rowHeaderLine}>
                        <Text style={styles.rowMovie} numberOfLines={1}>
                          {c.movie_or_show}{c.year ? ` (${c.year})` : ''}
                        </Text>
                        <View
                          style={[styles.badge, { backgroundColor: confColor + '1a', borderColor: confColor + '40' }]}
                        >
                          <Text style={[styles.badgeText, { color: confColor }]}>{c.confidence}%</Text>
                        </View>
                      </View>
                      <Text style={styles.rowTitle} numberOfLines={1}>{c.name}</Text>
                      <Text style={styles.rowSub} numberOfLines={1}>
                        {c.city}{c.country ? `, ${c.country}` : ''}
                        {c.episode ? ` • ${c.episode}` : ''}
                      </Text>
                      <View style={styles.badgeRow}>
                        <View style={[styles.badge, { backgroundColor: statusMeta.color + '1a', borderColor: statusMeta.color + '40' }]}>
                          <Text style={[styles.badgeText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
                        </View>
                        {photoMeta && (
                          <View style={[styles.badge, { backgroundColor: photoMeta.color + '1a', borderColor: photoMeta.color + '40' }]}>
                            <Text style={[styles.badgeText, { color: photoMeta.color }]} numberOfLines={1}>
                              📷 {photoMeta.label}
                            </Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.approveButton]}
                        onPress={() => decide(c, 'approved')}
                        disabled={actingOn === c.id}
                      >
                        <Text style={styles.actionText}>✓</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButton]}
                        onPress={() => decide(c, 'rejected')}
                        disabled={actingOn === c.id}
                      >
                        <Text style={styles.actionText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </>
      )}

      {/* Candidate detail modal */}
      <Modal
        visible={detailCandidate !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailCandidate(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {detailCandidate && (
              <>
                <ScrollView style={styles.modalScroll}>
                  <Text style={styles.modalMovie}>
                    {detailCandidate.movie_or_show}{detailCandidate.year ? ` (${detailCandidate.year})` : ''}
                  </Text>
                  <Text style={styles.modalTitle}>{detailCandidate.name}</Text>
                  <View style={styles.badgeRow}>
                    <View style={[styles.badge, { backgroundColor: confidenceColor(detailCandidate.confidence) + '1a', borderColor: confidenceColor(detailCandidate.confidence) + '40' }]}>
                      <Text style={[styles.badgeText, { color: confidenceColor(detailCandidate.confidence) }]}>
                        {detailCandidate.confidence}% confident
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: STATUS_META[detailCandidate.verification_status].color + '1a', borderColor: STATUS_META[detailCandidate.verification_status].color + '40' }]}>
                      <Text style={[styles.badgeText, { color: STATUS_META[detailCandidate.verification_status].color }]}>
                        {STATUS_META[detailCandidate.verification_status].label}
                      </Text>
                    </View>
                  </View>
                  <DetailLine label="City / Country" value={`${detailCandidate.city}, ${detailCandidate.country}`} />
                  <DetailLine label="Proposed address" value={detailCandidate.proposed_address} />
                  <DetailLine label="Coordinates" value={`${detailCandidate.latitude}, ${detailCandidate.longitude}`} />
                  {detailCandidate.episode ? <DetailLine label="Episode" value={detailCandidate.episode} /> : null}
                  <DetailLine label="Scene description" value={detailCandidate.scene_description} />
                  <DetailLine label="Fun fact" value={detailCandidate.fun_fact} />
                  <DetailLine label="Research notes" value={detailCandidate.research_notes} />
                  {(photoByCandidate.get(detailCandidate.id) ?? []).length > 0 && (
                    <View style={styles.detailBlock}>
                      <Text style={styles.detailLabel}>Photos</Text>
                      {(photoByCandidate.get(detailCandidate.id) ?? []).map((p) => (
                        <View key={p.id} style={styles.photoLine}>
                          <Text style={styles.photoLineText} numberOfLines={1}>🖼 {p.url}</Text>
                          <View style={[styles.badge, { backgroundColor: PHOTO_STATUS_META[p.use_status].color + '1a', borderColor: PHOTO_STATUS_META[p.use_status].color + '40' }]}>
                            <Text style={[styles.badgeText, { color: PHOTO_STATUS_META[p.use_status].color }]}>
                              {PHOTO_STATUS_META[p.use_status].label}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                  <DetailLine label="Created" value={formatDate(detailCandidate.created_at)} />
                  <DetailLine label="Updated" value={formatDate(detailCandidate.updated_at)} />
                </ScrollView>
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton, styles.modalAction]}
                    onPress={() => {
                      const c = detailCandidate;
                      setDetailCandidate(null);
                      if (c) decide(c, 'approved');
                    }}
                  >
                    <Text style={styles.actionText}>✓ Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton, styles.modalAction]}
                    onPress={() => {
                      const c = detailCandidate;
                      setDetailCandidate(null);
                      if (c) decide(c, 'rejected');
                    }}
                  >
                    <Text style={styles.actionText}>✕ Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.closeButton, styles.modalAction]}
                    onPress={() => setDetailCandidate(null)}
                  >
                    <Text style={styles.actionText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const DetailLine: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.detailBlock}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value || '—'}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
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
  banner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.colors.surface2, borderWidth: 1, borderColor: '#F59E0B' + '66',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginHorizontal: 16, marginTop: 12,
  },
  bannerText: { flex: 1, fontSize: 12, color: theme.colors.textPrimary, marginRight: 12, lineHeight: 16 },
  retryButton: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: theme.colors.gold,
  },
  retryButtonText: { fontSize: 12, fontWeight: '700', color: theme.colors.black },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  summaryChip: {
    backgroundColor: theme.colors.surface2,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  summaryChipText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  chipRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: theme.colors.surface2,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.colors.surface3,
  },
  chipActive: { backgroundColor: theme.colors.gold + '20', borderColor: theme.colors.gold },
  chipText: { fontSize: 13, fontWeight: '500', color: theme.colors.textSecondary },
  chipTextActive: { color: theme.colors.gold, fontWeight: '700' },
  list: { flex: 1 },
  listContent: { paddingBottom: 40 },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 6 },
  emptySub: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 19 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surface3 + '60',
  },
  rowMain: { flex: 1, marginRight: 10 },
  rowHeaderLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  rowMovie: { flex: 1, fontSize: 13, fontWeight: '700', color: theme.colors.gold },
  rowTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary, marginTop: 2 },
  rowSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  badge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8 },
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '85%',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.gold + '40',
  },
  modalScroll: { flexShrink: 1 },
  modalMovie: { fontSize: 13, fontWeight: '700', color: theme.colors.gold },
  modalTitle: { fontSize: 20, fontWeight: '800', color: theme.colors.textPrimary, marginTop: 2, marginBottom: 8 },
  detailBlock: { marginTop: 12 },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  detailValue: { fontSize: 14, color: theme.colors.textPrimary, lineHeight: 20 },
  photoLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  photoLineText: { flex: 1, fontSize: 12, color: theme.colors.textSecondary },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 16 },
  modalAction: { flex: 1, alignItems: 'center' },
});
