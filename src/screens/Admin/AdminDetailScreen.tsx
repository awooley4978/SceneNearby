import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { theme } from '../../theme';
import type { FilmingLocation } from '../../models';

interface AdminDetailParams {
  type: string;
  label: string;
  items: FilmingLocation[];
}

export const AdminDetailScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { type, label, items = [] } = (route.params ?? {}) as AdminDetailParams;
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const checkedCount = checkedIds.size;

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{label}</Text>
        <Text style={styles.headerCount}>{items.length}</Text>
      </View>

      {/* Checked counter */}
      {checkedCount > 0 && (
        <View style={styles.checkedBar}>
          <Text style={styles.checkedText}>☑ {checkedCount} selected</Text>
        </View>
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>✅</Text>
          <Text style={styles.emptyTitle}>All clear!</Text>
          <Text style={styles.emptySub}>No items need attention here.</Text>
        </View>
      )}

      {/* List */}
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {items.map((loc) => {
          const isChecked = checkedIds.has(loc.id);
          return (
            <TouchableOpacity
              key={loc.id}
              style={[styles.row, isChecked && styles.rowChecked]}
              onPress={() => toggleCheck(loc.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                {isChecked ? '☑' : '☐'}
              </Text>
              <View style={styles.rowInfo}>
                <Text style={styles.rowTitle}>{loc.title}</Text>
                <Text style={styles.rowSub}>
                  {loc.movieOrShow}{loc.year ? ` (${loc.year})` : ''} — {loc.city}
                </Text>
              </View>
              <Text style={styles.rowChevron}>›</Text>
            </TouchableOpacity>
          );
        })}
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

  // Checked bar
  checkedBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: theme.colors.gold + '15',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gold + '30',
  },
  checkedText: { fontSize: 13, fontWeight: '600', color: theme.colors.gold },

  // Empty
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 4 },
  emptySub: { fontSize: 14, color: theme.colors.textSecondary },

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
  rowChecked: {
    backgroundColor: theme.colors.gold + '08',
  },
  checkbox: {
    fontSize: 20,
    marginRight: 12,
    color: theme.colors.textTertiary,
    width: 28,
    textAlign: 'center',
  },
  checkboxChecked: {
    color: theme.colors.gold,
  },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  rowSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  rowChevron: { fontSize: 20, color: theme.colors.textTertiary },
});
