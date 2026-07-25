import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';
import {
  submitVisitorTip,
  fetchVisitorTips,
  VisitorTip,
} from '../services/firestore';

interface VisitorTipsInlineProps {
  locationId?: string;
  embeddedTip?: string | null;
  showAddButton?: boolean;
}

export const VisitorTipsInline: React.FC<VisitorTipsInlineProps> = ({
  locationId,
  embeddedTip,
  showAddButton = true,
}) => {
  const { user } = useAuth();
  const [tips, setTips] = useState<VisitorTip[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newTipText, setNewTipText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const fresh = await fetchVisitorTips(locationId);
      setTips(fresh);
    } catch {}
    setIsSubmitting(false);
  }, [locationId, user, newTipText, isSubmitting]);

  return (
    <View style={styles.container}>
      {/* Bullet list */}
      {embeddedTip && (
        <Text style={styles.bullet}>• {embeddedTip}</Text>
      )}
      {isLoading ? (
        <ActivityIndicator size="small" color={theme.colors.gold} style={{ marginVertical: 4 }} />
      ) : (
        tips.map((tip) => (
          <Text key={tip.id} style={styles.bullet}>• {tip.text}</Text>
        ))
      )}

      {/* Add Tip button — only when showAddButton is true */}
      {showAddButton !== false && user && locationId && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.addButtonText}>
            {embeddedTip || tips.length > 0 ? '✏️ Add a Tip' : '✏️ Be the first to add a tip'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Share a Tip</Text>
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
                  {isSubmitting ? 'Posting...' : 'Submit'}
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
    gap: 8,
    marginTop: 12,
  },
  bullet: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 24,
    paddingLeft: 4,
  },
  addButton: {
    backgroundColor: 'rgba(245,197,24,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245,197,24,0.3)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
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
