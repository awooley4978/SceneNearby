import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';
import {
  submitVisitorTip,
  fetchVisitorTips,
  VisitorTip,
} from '../services/firestore';

interface VisitorTipsProps {
  locationId?: string;
  estimatedVisitTime?: string;
}

export const VisitorTips: React.FC<VisitorTipsProps> = ({
  locationId,
  estimatedVisitTime,
}) => {
  const { user } = useAuth();
  const [tips, setTips] = useState<VisitorTip[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newTipText, setNewTipText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Parse embedded tip from estimatedVisitTime
  const embeddedTip = React.useMemo(() => {
    if (!estimatedVisitTime) return null;
    const parts = estimatedVisitTime.split('\nVisitor Tip:');
    if (parts.length > 1) return parts[1].trim();
    const parts2 = estimatedVisitTime.split('\nVisitor Tip: ');
    if (parts2.length > 1) return parts2[1].trim();
    return null;
  }, [estimatedVisitTime]);

  useEffect(() => {
    if (!locationId) return;
    setIsLoading(true);
    fetchVisitorTips(locationId)
      .then(setTips)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [locationId]);

  const handleSubmit = useCallback(async () => {
    if (!locationId || !user || !newTipText.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await submitVisitorTip(locationId, user.uid, newTipText.trim());
      setNewTipText('');
      setModalVisible(false);
      // Refetch tips
      const fresh = await fetchVisitorTips(locationId);
      setTips(fresh);
    } catch {}
    setIsSubmitting(false);
  }, [locationId, user, newTipText, isSubmitting]);

  // Nothing to show
  if (!embeddedTip && tips.length === 0 && !user) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>💡 Visitor Tips</Text>

      {/* Embedded tip from data */}
      {embeddedTip && tips.length === 0 && (
        <View style={styles.tipCard}>
          <Text style={styles.tipText}>{embeddedTip}</Text>
          <Text style={styles.tipAttribution}>from the Scene Nearby community</Text>
        </View>
      )}

      {/* Firestore tips */}
      {isLoading ? (
        <ActivityIndicator size="small" color={theme.colors.gold} style={{ marginVertical: 8 }} />
      ) : (
        tips.map((tip) => (
          <View key={tip.id} style={styles.tipCard}>
            <Text style={styles.tipText}>{tip.text}</Text>
            <Text style={styles.tipAttribution}>
              {new Date(tip.createdAt).toLocaleDateString()}
            </Text>
          </View>
        ))
      )}

      {/* Add Tip button */}
      {user && locationId && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.addButtonText}>✏️ Add a Tip</Text>
        </TouchableOpacity>
      )}

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Share a Tip</Text>
            <Text style={styles.modalSubtitle}>
              Help other film fans with advice about this location.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., Best time to visit is early morning..."
              placeholderTextColor={theme.colors.textTertiary}
              value={newTipText}
              onChangeText={setNewTipText}
              multiline
              maxLength={300}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => { setModalVisible(false); setNewTipText(''); }}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, (!newTipText.trim() || isSubmitting) && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={!newTipText.trim() || isSubmitting}
              >
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? 'Posting...' : 'Submit Tip'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  tipCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(245,197,24,0.15)',
    padding: 14,
    gap: 6,
  },
  tipText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    lineHeight: 21,
  },
  tipAttribution: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    fontStyle: 'italic',
  },
  addButton: {
    backgroundColor: 'rgba(245,197,24,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245,197,24,0.3)',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 9,
    alignSelf: 'flex-start',
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(245,197,24,0.9)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(245,197,24,0.2)',
    gap: 14,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.gold,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  modalInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.surface3,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: theme.colors.surface2,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: theme.colors.gold,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.black,
  },
});
