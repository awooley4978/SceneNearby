import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { theme } from '../../theme';
import type { FilmingLocation } from '../../models';
import { apiClient, type PhotoSubmission } from '../../services/api';
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

export const AdminDetailScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { type, label, items = [] } = (route.params ?? {}) as AdminDetailParams;
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [filters, setFilters] = useState<DetailFilters>(EMPTY_FILTERS);

  // Derive filter options from the (unfiltered) items
  const cities = useMemo(() => getUniqueValues(items, 'city'), [items]);
  const countries = useMemo(() => getUniqueValues(items, 'country'), [items]);
  const regions = useMemo(() => getUniqueRegions(items), [items]);
  const firstLetters = useMemo(() => getTitleFirstLetters(items), [items]);

  // Apply filters
  const filteredItems = useMemo(
    () => applyDetailFilters(items, filters),
    [items, filters],
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
  const isApproval = type === 'pendingApproval';
  const [localPending, setLocalPending] = useState<PhotoSubmission[] | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const pendingItems = localPending ?? (items as PhotoSubmission[]);
  const decide = async (sub: PhotoSubmission, decision: 'approve' | 'reject') => {
    setActingOn(sub.id);
    try {
      if (decision === 'approve') await apiClient.approveSubmission(sub.id);
      else await apiClient.rejectSubmission(sub.id);
      setLocalPending((prev) => (prev ?? (items as PhotoSubmission[])).filter((s) => s.id !== sub.id));
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
          {pendingItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>✅</Text>
              <Text style={styles.emptyTitle}>All caught up</Text>
              <Text style={styles.emptySub}>No photos awaiting approval.</Text>
            </View>
          ) : (
            pendingItems.map((sub) => (
              <View key={sub.id} style={styles.row}>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle}>{sub.location_name || sub.location_id}</Text>
                  <Text style={styles.rowSub}>
                    {sub.status} • {sub.id} •{' '}
                    {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : ''}
                  </Text>
                </View>
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
                    onPress={() => decide(sub, 'reject')}
                    disabled={actingOn === sub.id}
                  >
                    <Text style={styles.actionText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
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
              <Text style={styles.rowSub}>
                {loc.movieOrShow}{loc.year ? ` (${loc.year})` : ''} — {loc.city}, {loc.country}
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
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  rowSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  rowChevron: { fontSize: 20, color: theme.colors.textTertiary },
  approvalActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionButton: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
  },
  approveButton: { backgroundColor: '#22C55E22', borderColor: '#22C55E' },
  rejectButton: { backgroundColor: '#EF444422', borderColor: '#EF4444' },
  actionText: { fontSize: 12, fontWeight: '700', color: theme.colors.textPrimary },
});
