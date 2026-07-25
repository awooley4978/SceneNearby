import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../theme';

// ═══════════════════════════════════════════════
//  Music Nearby Design Language
//  Premium travel-guide aesthetic — lightweight,
//  no heavy effects, every location is the star.
// ═══════════════════════════════════════════════

// ── SpotlightOverlay ──────────────────────────
//  Subtle warm radial glow behind the hero, centered
//  on the image focal point. Simulates a spotlight
//  picking out the location without heavy shaders.
//  Uses a large blurred circle — zero perf cost.

interface SpotlightOverlayProps {
  /** Normalised focal point (0–1). Defaults to center. */
  focalPoint?: { x: number; y: number };
  /** Gold intensity: 0.02–0.08. Default 0.04. */
  intensity?: number;
}

export const SpotlightOverlay: React.FC<SpotlightOverlayProps> = ({
  focalPoint = { x: 0.5, y: 0.5 },
  intensity = 0.04,
}) => {
  // Position the glow circle so its center aligns with the focal point.
  // The circle is 160px wide; we offset by -80px to center, then shift
  // proportionally within the available space (hero is ~420px).
  const glowSize = 180;
  const halfGlow = glowSize / 2;

  return (
    <View style={spotStyles.container} pointerEvents="none">
      {/* Primary glow */}
      <View
        style={[
          spotStyles.glow,
          {
            width: glowSize,
            height: glowSize,
            borderRadius: halfGlow,
            backgroundColor: `rgba(245,197,24,${intensity})`,
            shadowColor: '#F5C518',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: intensity * 2,
            shadowRadius: 40,
            // Position: center the circle on the focal point
            left: `${focalPoint.x * 100}%`,
            top: `${focalPoint.y * 100}%`,
            marginLeft: -halfGlow,
            marginTop: -halfGlow,
          },
        ]}
      />
      {/* Inner brighter core */}
      <View
        style={[
          spotStyles.glow,
          {
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: `rgba(255,255,255,${intensity * 0.6})`,
            shadowColor: '#FFFFFF',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: intensity,
            shadowRadius: 20,
            left: `${focalPoint.x * 100}%`,
            top: `${focalPoint.y * 100}%`,
            marginLeft: -30,
            marginTop: -30,
          },
        ]}
      />
    </View>
  );
};

const spotStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
  },
});

// ── LocationFrame ─────────────────────────────
//  Four L-shaped corner brackets that frame a hero
//  image — like a viewfinder or gallery frame.
//  Whisper-light, 1px strokes, subtle opacity.

export const LocationFrame: React.FC = () => {
  const arm = 16; // arm length
  const gap = 10; // inset from edge

  return (
    <View style={frameStyles.container} pointerEvents="none">
      {/* Top-left */}
      <View style={[frameStyles.bracket, { top: gap, left: gap }]}>
        <View style={frameStyles.armH} />
        <View style={frameStyles.armV} />
      </View>
      {/* Top-right */}
      <View style={[frameStyles.bracket, { top: gap, right: gap }]}>
        <View style={frameStyles.armH} />
        <View style={[frameStyles.armV, { alignSelf: 'flex-end' }]} />
      </View>
      {/* Bottom-left */}
      <View style={[frameStyles.bracket, { bottom: gap, left: gap }]}>
        <View style={[frameStyles.armV, { alignSelf: 'flex-start' }]} />
        <View style={[frameStyles.armH, { alignSelf: 'flex-end' }]} />
      </View>
      {/* Bottom-right */}
      <View style={[frameStyles.bracket, { bottom: gap, right: gap }]}>
        <View style={[frameStyles.armV, { alignSelf: 'flex-end' }]} />
        <View style={[frameStyles.armH, { alignSelf: 'flex-start' }]} />
      </View>
    </View>
  );
};

const armSize = { width: 16, height: 1 };
const armSizeV = { width: 1, height: 16 };

const frameStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  bracket: {
    position: 'absolute',
    width: 20,
    height: 20,
  },
  armH: {
    position: 'absolute',
    top: 0,
    left: 0,
    ...armSize,
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderRadius: 0.5,
  },
  armV: {
    position: 'absolute',
    top: 0,
    left: 0,
    ...armSizeV,
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderRadius: 0.5,
  },
});

// ── BrandDivider ──────────────────────────────
//  Ornamented horizontal divider: thin gold line
//  with a small diamond at center. Separates major
//  sections without dominating the page.

interface BrandDividerProps {
  /** Gold line opacity. Default 0.12. */
  opacity?: number;
}

export const BrandDivider: React.FC<BrandDividerProps> = ({
  opacity = 0.12,
}) => (
  <View style={divStyles.wrapper}>
    <View style={[divStyles.line, { backgroundColor: `rgba(245,197,24,${opacity})` }]} />
    <View style={divStyles.diamondOuter}>
      <View style={divStyles.diamond} />
    </View>
    <View style={[divStyles.line, { backgroundColor: `rgba(245,197,24,${opacity})` }]} />
  </View>
);

const divStyles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginVertical: 16,
    gap: 10,
  },
  line: {
    flex: 1,
    height: 0.5,
  },
  diamondOuter: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(245,197,24,0.15)',
    borderRadius: 3,
    transform: [{ rotate: '45deg' }],
  },
  diamond: {
    width: 6,
    height: 6,
    backgroundColor: 'rgba(245,197,24,0.25)',
    borderRadius: 1,
  },
});
