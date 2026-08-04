import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { BottomSheet } from './BottomSheet';

interface VisitGateSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  onVisited: () => void;
  onNotVisited: () => void;
}

export const VisitGateSheet: React.FC<VisitGateSheetProps> = ({
  visible,
  onClose,
  title,
  onVisited,
  onNotVisited,
}) => {
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <View style={styles.container}>
        <Text style={styles.body}>
          Share your experience to help future travelers.
        </Text>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.visitedButton}
            onPress={() => {
              onClose();
              onVisited();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.visitedButtonText}>✅ I've Visited</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.notVisitedButton}
            onPress={() => {
              onClose();
              onNotVisited();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.notVisitedButtonText}>🔮 Haven't Been Yet</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 20,
  },
  body: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  visitedButton: {
    flex: 1,
    backgroundColor: theme.colors.gold,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  visitedButtonText: {
    color: theme.colors.black,
    fontWeight: '700',
    fontSize: 14,
  },
  notVisitedButton: {
    flex: 1,
    backgroundColor: theme.colors.surface3,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245,197,24,0.2)',
  },
  notVisitedButtonText: {
    color: theme.colors.gold,
    fontWeight: '600',
    fontSize: 14,
  },
});
