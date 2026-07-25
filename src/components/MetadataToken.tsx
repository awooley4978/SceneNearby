import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

/**
 * Premium variants for metadata tokens. Each has a distinct personality
 * inspired by cinema, theater, and film production design.
 *
 *   filmFrame      — Notched corners like a clapperboard slate frame
 *   marquee        — Warm inner glow, theater-light sign
 *   slate          — Diagonal two-tone split, clapperboard-inspired
 *   ticketStub     — Perforated edge, vintage cinema ticket
 *   scriptDirection— Typewriter-style label above value, screenplay format
 *   pin            — Geometric diamond shape, map-marker inspired
 */
export type TokenVariant =
  | 'filmFrame'
  | 'marquee'
  | 'slate'
  | 'ticketStub'
  | 'scriptDirection'
  | 'pin';

interface MetadataTokenProps {
  variant: TokenVariant;
  value: string;
  label?: string;
  icon?: string;
  accentColor?: string;
}

export const MetadataToken: React.FC<MetadataTokenProps> = ({
  variant,
  value,
  label,
  icon,
  accentColor = theme.colors.gold,
}) => {
  const accent = accentColor;

  switch (variant) {

    // ── Film Frame — notched corners ──
    case 'filmFrame':
      return (
        <View style={[filmStyles.wrapper, { borderColor: accent + '40' }]}>
          {/* Notch overlays */}
          <View style={[filmStyles.notch, filmStyles.notchTL, { borderRightColor: accent + '50' }]} />
          <View style={[filmStyles.notch, filmStyles.notchTR, { borderLeftColor: accent + '50' }]} />
          <View style={[filmStyles.notch, filmStyles.notchBL, { borderRightColor: accent + '50' }]} />
          <View style={[filmStyles.notch, filmStyles.notchBR, { borderLeftColor: accent + '50' }]} />
          <View style={filmStyles.content}>
            {icon ? <Text style={filmStyles.icon}>{icon}</Text> : null}
            <Text style={[filmStyles.value, { color: accent }]}>{value}</Text>
          </View>
        </View>
      );

    // ── Marquee — warm glow ──
    case 'marquee':
      return (
        <View style={marqueeStyles.outer}>
          <View style={[marqueeStyles.glow, { backgroundColor: accent + '18' }]} />
          <View style={marqueeStyles.inner}>
            {icon ? <Text style={marqueeStyles.icon}>{icon}</Text> : null}
            <Text style={[marqueeStyles.value, { color: accent, textShadowColor: accent + '40' }]}>
              {value}
            </Text>
          </View>
        </View>
      );

    // ── Slate — diagonal split ──
    case 'slate':
      return (
        <View style={slateStyles.wrapper}>
          <View style={[slateStyles.diagonal, { borderBottomColor: accent + '15' }]} />
          <View style={slateStyles.content}>
            {icon ? <Text style={slateStyles.icon}>{icon}</Text> : null}
            <Text style={[slateStyles.value, { color: accent }]}>{value}</Text>
          </View>
        </View>
      );

    // ── Ticket Stub — perforated edge ──
    case 'ticketStub':
      return (
        <View style={[ticketStyles.wrapper, { borderColor: accent + '30' }]}>
          {/* Left perf dots */}
          <View style={ticketStyles.perfColumn}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[ticketStyles.perfDot, { backgroundColor: accent + '20' }]} />
            ))}
          </View>
          <View style={ticketStyles.content}>
            {icon ? <Text style={ticketStyles.icon}>{icon}</Text> : null}
            <Text style={[ticketStyles.value, { color: accent }]}>{value}</Text>
          </View>
          {/* Right perf dots */}
          <View style={ticketStyles.perfColumn}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[ticketStyles.perfDot, { backgroundColor: accent + '20' }]} />
            ))}
          </View>
        </View>
      );

    // ── Script Direction — typewriter label ──
    case 'scriptDirection':
      return (
        <View style={scriptStyles.wrapper}>
          {label ? (
            <Text style={[scriptStyles.label, { color: accent + '80' }]}>
              {label.toUpperCase()}
            </Text>
          ) : null}
          <View style={scriptStyles.valueRow}>
            {icon ? <Text style={scriptStyles.icon}>{icon}</Text> : null}
            <Text style={[scriptStyles.value, { color: accent }]}>{value}</Text>
          </View>
        </View>
      );

    // ── Pin — geometric diamond ──
    case 'pin':
      return (
        <View style={pinStyles.wrapper}>
          <View style={[pinStyles.point, { borderBottomColor: accent + '20' }]} />
          <View style={pinStyles.body}>
            {icon ? <Text style={pinStyles.icon}>{icon}</Text> : null}
            <Text style={[pinStyles.value, { color: accent }]}>{value}</Text>
          </View>
          <View style={[pinStyles.pointBottom, { borderTopColor: accent + '20' }]} />
        </View>
      );

    default:
      return null;
  }
};

// ──────────────────────────────────
//  FILM FRAME — notched corners
// ──────────────────────────────────
const filmStyles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 4,
    borderWidth: 0.5,
  },
  notch: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  notchTL: { top: -1, left: -1, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 2 },
  notchTR: { top: -1, right: -1, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 2 },
  notchBL: { bottom: -1, left: -1, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 2 },
  notchBR: { bottom: -1, right: -1, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 2 },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  icon: { fontSize: 12 },
  value: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

// ──────────────────────────────────
//  MARQUEE — warm glow
// ──────────────────────────────────
const marqueeStyles = StyleSheet.create({
  outer: {
    position: 'relative',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    overflow: 'hidden',
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 6,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  icon: { fontSize: 12 },
  value: {
    fontSize: 12,
    fontWeight: '700',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
});

// ──────────────────────────────────
//  SLATE — diagonal split
// ──────────────────────────────────
const slateStyles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  diagonal: {
    position: 'absolute',
    top: -1,
    left: 0,
    right: 0,
    height: 0,
    borderBottomWidth: 28,
    borderBottomColor: 'transparent',
    borderLeftWidth: 0,
    borderRightWidth: 200,
    borderRightColor: 'transparent',
    transform: [{ skewY: '-3deg' }],
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  icon: { fontSize: 12 },
  value: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

// ──────────────────────────────────
//  TICKET STUB — perforated edge
// ──────────────────────────────────
const ticketStyles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: 'dashed' as const,
    gap: 0,
  },
  perfColumn: {
    justifyContent: 'space-between',
    height: 22,
    paddingVertical: 2,
    gap: 2,
  },
  perfDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 6,
  },
  icon: { fontSize: 12 },
  value: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

// ──────────────────────────────────
//  SCRIPT DIRECTION — typewriter
// ──────────────────────────────────
const scriptStyles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.8,
    marginBottom: 2,
    fontFamily: 'Courier',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  icon: { fontSize: 12 },
  value: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

// ──────────────────────────────────
//  PIN — geometric diamond
// ──────────────────────────────────
const pinStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  point: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    marginBottom: 0,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  pointBottom: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'transparent',
  },
  icon: { fontSize: 11 },
  value: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
