import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { FadeInView } from './FadeInView';

type CardVariant = 'standard' | 'quote' | 'fact' | 'trivia' | 'story' | 'gallery';

interface SectionCardProps {
  icon?: string;
  title?: string;
  children: React.ReactNode;
  variant?: CardVariant;
  elevated?: boolean;
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
        variant === 'trivia' && styles.cardTrivia,
        variant === 'story' && styles.cardStory,
        variant === 'gallery' && styles.cardGallery,
        elevated && styles.elevated,
      ]}
    >
      {/* ── Quote: gold bar + open + close marks ── */}
      {variant === 'quote' && (
        <>
          <View style={styles.quoteAccent} />
          <Text style={styles.quoteOpenMark}>"</Text>
          <Text style={styles.quoteCloseMark}>"</Text>
        </>
      )}

      {/* ── Trivia: floating ? watermark ── */}
      {variant === 'trivia' && (
        <Text style={styles.triviaWatermark}>?</Text>
      )}

      {/* ── Fact (Then & Now): photo-frame inner border ── */}
      {variant === 'fact' && (
        <View style={styles.factInnerFrame} />
      )}

      {hasHeader && (
        <View style={[
          styles.header,
          variant === 'story' && styles.headerStory,
          variant === 'quote' && styles.headerQuote,
          variant === 'trivia' && styles.headerTrivia,
        ]}>
          {icon ? (
            <Text style={[
              styles.icon,
              variant === 'story' && styles.iconStory,
              variant === 'fact' && styles.iconFact,
              variant === 'trivia' && styles.iconTrivia,
            ]}>{icon}</Text>
          ) : null}
          {title ? (
            <Text
              style={[
                styles.title,
                variant === 'fact' && styles.titleFact,
                variant === 'trivia' && styles.titleTrivia,
                variant === 'story' && styles.titleStory,
                variant === 'quote' && styles.titleQuote,
              ]}
            >
              {title}
            </Text>
          ) : null}
        </View>
      )}

      <View style={[
        variant === 'story' && styles.storyContent,
        variant === 'trivia' && styles.triviaContent,
      ]}>
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

  // ── Quote — dramatic, theatrical ──
  cardQuote: {
    backgroundColor: 'rgba(245,197,24,0.05)',
    borderColor: 'rgba(245,197,24,0.12)',
    paddingLeft: 32,
    paddingTop: 28,
    paddingBottom: 28,
    paddingRight: 24,
  },
  quoteAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: theme.colors.gold,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  quoteOpenMark: {
    position: 'absolute',
    top: 6,
    left: 16,
    fontSize: 56,
    color: 'rgba(245,197,24,0.12)',
    fontWeight: '900',
    lineHeight: 60,
    fontFamily: 'Georgia',
  },
  quoteCloseMark: {
    position: 'absolute',
    bottom: -8,
    right: 18,
    fontSize: 56,
    color: 'rgba(245,197,24,0.08)',
    fontWeight: '900',
    lineHeight: 60,
    fontFamily: 'Georgia',
  },
  headerQuote: {
    marginBottom: 16,
    paddingLeft: 4,
  },
  titleQuote: {
    color: theme.colors.gold,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },

  // ── Fact (Then & Now) — photo-documentary feel ──
  cardFact: {
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    padding: 20,
  },
  factInnerFrame: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
    pointerEvents: 'none' as const,
  },
  iconFact: {
    fontSize: 20,
  },
  titleFact: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.1,
  },

  // ── Trivia (Did You Know?) — playful quiz-card ──
  cardTrivia: {
    backgroundColor: 'rgba(245,197,24,0.04)',
    borderColor: 'rgba(245,197,24,0.15)',
    borderWidth: 1,
    borderStyle: 'dashed' as const,
    padding: 20,
  },
  triviaWatermark: {
    position: 'absolute',
    top: -4,
    right: 14,
    fontSize: 64,
    color: 'rgba(245,197,24,0.06)',
    fontWeight: '900',
    lineHeight: 68,
    fontFamily: 'Georgia',
  },
  headerTrivia: {
    marginBottom: 14,
  },
  iconTrivia: {
    fontSize: 20,
  },
  titleTrivia: {
    color: theme.colors.gold,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  triviaContent: {
    paddingRight: 8,
  },

  // ── Story ──
  cardStory: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: 'rgba(255,255,255,0.04)',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  storyContent: {
    marginTop: 4,
  },

  // ── Gallery ──
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
  titleStory: {
    fontSize: 22,
    color: theme.colors.textPrimary,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});
