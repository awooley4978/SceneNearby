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
  if (!embeddedTip && tips.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>💡 Visitor Tips</Text>

      {/* Embedded tip from data */}
      {embeddedTip && (
        <Text style={styles.bullet}>• {embeddedTip}</Text>
      )}

      {/* Firestore tips */}
      {isLoading ? (
        <ActivityIndicator size="small" color={theme.colors.gold} style={{ marginVertical: 8 }} />
      ) : (
        tips.map((tip) => (
          <Text key={tip.id} style={styles.bullet}>• {tip.text}</Text>
        ))
      )}

      {/* Add Tip button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.addButtonText}>✏️ Add a Tip</Text>
      </TouchableOpacity>

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
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textTertiary,
    fontStyle: 'italic',
  },
  bullet: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    lineHeight: 22,
    paddingLeft: 4,
  },
