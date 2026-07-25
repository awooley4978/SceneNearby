import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

type CardVariant = 'standard' | 'quote' | 'fact' | 'story';

interface SectionCardProps {
  icon?: string;
  title?: string;
  children: React.ReactNode;
  /** Presentation variant — changes the card's visual treatment */
  variant?: CardVariant;
  /** Slightly elevated variant with stronger surface */
  elevated?: boolean;
}

/**
 * Section card with 4 presentation variants to create visual rhythm:
 * - standard: clean glass card with icon + heading (default)
 * - quote: left gold accent bar, warm tinted background
 * - fact: subtle gold-border inset with sparkle feel
 * - story: softer surface, minimal heading — lets content breathe
 */
export const SectionCard: React.FC<SectionCardProps> = ({
  icon,
  title,
  children,
  variant = 'standard',
  elevated,
}) => {
  const hasHeader = !!(icon || title);
  const bare = !hasHeader;

  return (
    <View
      style={[
        styles.card,
        variant === 'quote' && styles.cardQuote,
        variant === 'fact' && styles.cardFact,
        variant === 'story' && styles.cardStory,
        elevated && styles.elevated,
      ]}
    >
      {/* Quote variant: gold accent bar on the left edge */}
      {variant === 'quote' && <View style={styles.quoteAccent} />}

      {hasHeader && (
        <View style={styles.header}>
          {icon ? <Text style={styles.icon}>{icon}</Text> : null}
          {title ? (
            <Text
              style={[
                styles.title,
                variant === 'fact' && styles.titleFact,
                variant === 'story' && styles.titleStory,
              ]}
            >
              {title}
            </Text>
          ) : null}
        </View>
      )}

      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  // ── Base card ──
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },

  // ── Elevated ──
  elevated: {
    backgroundColor: theme.colors.surface,
    borderColor: 'rgba(255,255,255,0.08)',
    ...theme.shadows.sm,
  },

  // ── Variant: quote ──
  cardQuote: {
    backgroundColor: 'rgba(245,197,24,0.04)',
    borderColor: 'rgba(245,197,24,0.10)',
    paddingLeft: 22, // room for accent bar
  },
  quoteAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: theme.colors.gold,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },

  // ── Variant: fact ──
  cardFact: {
    backgroundColor: 'rgba(245,197,24,0.03)',
    borderColor: 'rgba(245,197,24,0.12)',
    borderWidth: 1,
  },

  // ── Variant: story ──
  cardStory: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: 'rgba(255,255,255,0.04)',
    paddingVertical: 20,
  },

  // ── Header ──
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
  titleFact: {
    color: theme.colors.gold,
  },
  titleStory: {
    fontSize: 20,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
});
