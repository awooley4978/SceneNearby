import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface SectionCardProps {
  icon?: string;
  title?: string;
  children: React.ReactNode;
  /** Slightly elevated variant with stronger surface */
  elevated?: boolean;
}

/**
 * Clean Apple-like section card — rounded container with subtle glass
 * surface, icon + heading, and generous internal padding.
 */
export const SectionCard: React.FC<SectionCardProps> = ({ icon, title, children, elevated }) => {
  if (!icon && !title) {
    // Bare card — just the container
    return (
      <View style={[styles.card, elevated && styles.elevated]}>
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.card, elevated && styles.elevated]}>
      {icon || title ? (
        <View style={styles.header}>
          {icon ? <Text style={styles.icon}>{icon}</Text> : null}
          {title ? <Text style={styles.title}>{title}</Text> : null}
        </View>
      ) : null}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  elevated: {
    backgroundColor: theme.colors.surface,
    borderColor: 'rgba(255,255,255,0.08)',
    ...theme.shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  icon: {
    fontSize: 18,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -0.2,
  },
});
