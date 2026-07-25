import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { FadeInView } from './FadeInView';

type CardVariant = 'standard' | 'quote' | 'fact' | 'story' | 'gallery';

interface SectionCardProps {
  icon?: string;
  title?: string;
  children: React.ReactNode;
  variant?: CardVariant;
  elevated?: boolean;
  /** Stagger delay in ms for cascading fade-in (0 = instant) */
  fadeDelay?: number;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  icon,
  title,
  children,
  variant = 'standard',
  elevated,
  fadeDelay = 0,
}) => {
  const hasHeader = !!(icon || title);

  const card = (
    <View
      style={[
        styles.card,
        variant === 'quote' && styles.cardQuote,
        variant === 'fact' && styles.cardFact,
        variant === 'story' && styles.cardStory,
        variant === 'gallery' && styles.cardGallery,
        elevated && styles.elevated,
      ]}
    >
      {/* Quote: oversized decorative quotes + gold accent */}
      {variant === 'quote' && (
        <>
          <View style={styles.quoteAccent} />
          <Text style={styles.quoteOpenMark}>"</Text>
        </>
      )}

      {hasHeader && (
        <View style={[styles.header, variant === 'story' && styles.headerStory]}>
          {icon ? <Text style={[styles.icon, variant === 'story' && styles.iconStory]}>{icon}</Text> : null}
          {title ? (
            <Text
              style={[
                styles.title,
                variant === 'fact' && styles.titleFact,
                variant === 'story' && styles.titleStory,
                variant === 'quote' && styles.titleQuote,
              ]}
            >
              {title}
            </Text>
          ) : null}
        </View>
      )}

      <View style={variant === 'story' && styles.storyContent}>
        {children}
      </View>
    </View>
  );

  if (fadeDelay > 0) {
    return <FadeInView delay={fadeDelay}>{card}</FadeInView>;
  }
  return card;
};

const styles = StyleSheet.create({
  // ── Base card ──
  card: {
    marginHorizontal: 16,
    marginTop: 20,
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },

  elevated: {
    backgroundColor: theme.colors.surface,
    borderColor: 'rgba(255,255,255,0.08)',
    ...theme.shadows.sm,
  },

  // ── Variant: quote ──
  cardQuote: {
    backgroundColor: 'rgba(245,197,24,0.04)',
    borderColor: 'rgba(245,197,24,0.10)',
    paddingLeft: 28,
    paddingTop: 24,
    paddingBottom: 24,
    paddingRight: 20,
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
  quoteOpenMark: {
    position: 'absolute',
    top: 4,
    left: 14,
    fontSize: 48,
    color: 'rgba(245,197,24,0.15)',
    fontWeight: '900',
    lineHeight: 52,
    fontFamily: 'Georgia',
  },
  titleQuote: {
    color: theme.colors.gold,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
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
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  storyContent: {
    marginTop: 4,
  },

  // ── Variant: gallery ──
  cardGallery: {
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: 'rgba(255,255,255,0.05)',
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  headerStory: {
    marginBottom: 16,
  },
  icon: {
    fontSize: 18,
  },
  iconStory: {
    fontSize: 22,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -0.2,
  },
  titleFact: {
    color: theme.colors.gold,
    fontSize: 15,
  },
  titleStory: {
    fontSize: 22,
    color: theme.colors.textPrimary,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});
