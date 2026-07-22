import React, { useState, useRef, useCallback } from 'react';
import { Image, ImageBackground,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { theme } from '../../theme';
import { DISCOVERY_FREQUENCIES, STORAGE_KEYS } from '../../models';
import type { DiscoveryFrequency } from '../../models';

const { width, height } = Dimensions.get('window');

interface OnboardingScreenProps {
  onComplete: (data: any) => void;
}

const GENRE_GRADIENTS: Record<string, string[]> = {
  'Comedy': ['#F5C518', '#E8A800'],
  'Drama': ['#8B5CF6', '#6D28D9'],
  'Action': ['#EF4444', '#DC2626'],
  'Sci-Fi': ['#06B6D4', '#0891B2'],
  'Horror': ['#6B7280', '#4B5563'],
  'Romance': ['#EC4899', '#DB2777'],
  'Thriller': ['#F97316', '#EA580C'],
  'Fantasy': ['#22D3EE', '#0E7490'],
  'Animation': ['#A78BFA', '#7C3AED'],
  'Documentary': ['#10B981', '#059669'],
};

const GENRE_IMAGES: Record<string, any> = {
  'Comedy': require('../../../assets/genre-comedy.jpg'),
  'Drama': require('../../../assets/genre-drama.jpg'),
  'Action': require('../../../assets/genre-action.jpg'),
  'Sci-Fi': require('../../../assets/genre-scifi.jpg'),
  'Horror': require('../../../assets/genre-horror.jpg'),
  'Romance': require('../../../assets/genre-romance.jpg'),
  'Thriller': require('../../../assets/genre-thriller.jpg'),
  'Fantasy': require('../../../assets/genre-fantasy.jpg'),
  'Animation': require('../../../assets/genre-animation.jpg'),
  'Documentary': require('../../../assets/genre-documentary.jpg'),
};

const GENRES = Object.keys(GENRE_GRADIENTS).map((label) => ({
  label,
  gradient: GENRE_GRADIENTS[label],
}));

const TRAVEL_STYLES: { key: DiscoveryFrequency; emoji: string; label: string; desc: string }[] = [
  { key: 'essentials', emoji: '🌿', label: 'Essentials', desc: 'Only the must-see locations.' },
  { key: 'explorer', emoji: '🌟', label: 'Explorer', desc: 'Popular places plus hidden gems.' },
  { key: 'completionist', emoji: '🎬', label: 'Completionist', desc: 'Show me every verified filming location.' },
];

const TRAVEL_MODES = [
  { key: 'walking', emoji: '🚶', label: 'Mostly walking' },
  { key: 'driving', emoji: '🚗', label: 'Mostly driving' },
  { key: 'flying', emoji: '✈️', label: "I'm usually traveling" },
];

const MEDIA_INTERESTS = [
  { key: 'movies', emoji: '🎬', label: 'Movies', desc: 'Film locations' },
  { key: 'tv', emoji: '📺', label: 'TV', desc: 'TV show locations' },
  { key: 'music', emoji: '🎵', label: 'Music', desc: 'Music video spots', comingSoon: true },
];

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [travelStyle, setTravelStyle] = useState<DiscoveryFrequency>('essentials');
  const [contentLoves, setContentLoves] = useState<string[]>([]); // now genres
  const [travelMode, setTravelMode] = useState<string>('walking');
  const [mediaInterests, setMediaInterests] = useState<string[]>(['movies', 'tv']);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const totalPages = 8;

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false },
  );

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: any) => {
      if (viewableItems.length > 0) {
        setCurrentPage(viewableItems[0].index || 0);
      }
    },
    [],
  );

  const goToPage = (page: number) => {
    flatListRef.current?.scrollToIndex({ index: page, animated: true });
  };

  const handleComplete = () => {
    onComplete({
      travelStyle,
      contentLoves,
      travelMode,
      mediaInterests,
      completed: true,
    });
  };

  const toggleContentLove = (label: string) => {
    setContentLoves((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    );
  };

  const toggleMediaInterest = (key: string) => {
    setMediaInterests((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  // Page indicator dots
  const renderDots = () => (
    <View style={styles.dots}>
      {Array.from({ length: totalPages }).map((_, i) => {
        const isActive = currentPage === i;
        return (
          <TouchableOpacity
            key={i}
            onPress={() => goToPage(i)}
            style={[styles.dot, isActive && styles.dotActive]}
          />
        );
      })}
    </View>
  );

  // Each page renderer
  const renderPage = ({ index }: { index: number }) => {
    const isLast = index === totalPages - 1;

    const pageContent = () => {
      switch (index) {
        case 0: return (
          <View style={styles.page}>
            <View style={styles.gradientBg} />
            <Text style={styles.welcomeEmoji}>🎬</Text>
            <Text style={styles.welcomeTitle}>Your favorite scenes are closer than you think.</Text>
            <View style={styles.welcomeAccentLine} />
            <Text style={styles.welcomeSub}>Discover filming locations while you travel.</Text>
          </View>
        );
        case 1: return (
          <View style={styles.page}>
            <View style={styles.mapBg}>
              <View style={styles.mapGridOverlay} />
              <View style={styles.mapRoad} />
              <View style={styles.mapRoad2} />
            </View>
            {/* Friends apartment building image */}
            <View style={styles.notifBuildingContainer}>
              <Image source={require("../../assets/friends-apartment.png")} style={styles.notifBuildingImage} resizeMode="cover" />
              <View style={styles.notifBuildingGlow} />
            </View>
            {/* Notification card */}
            <View style={styles.notifCard}>
              {/* Header bar with drag handle */}
              <View style={styles.notifHandleBar} />
              {/* Location badge — gold app-icon style */}
              <View style={styles.notifLocationBadge}>
                <Text style={styles.notifLocationDot}>📍</Text>
                <Text style={styles.notifLocationLabel}>0.3 mi</Text>
              </View>
              {/* Title */}
              <Text style={styles.notifShowTitle}>Friends</Text>
              <Text style={styles.notifLocationTitle}>The Friends Apartment</Text>
              {/* Scene description */}
              <Text style={styles.notifBody}>
                "The one where you're standing right outside the iconic apartment building from Central Perk."
              </Text>
              {/* Divider */}
              <View style={styles.notifDivider} />
              {/* Action buttons */}
              <View style={styles.notifActions}>
                <TouchableOpacity style={styles.notifDetailBtn}>
                  <Text style={styles.notifDetailText}>View Details</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.notifNavigateBtn}>
                  <Text style={styles.notifNavigateText}>Navigate</Text>
                </TouchableOpacity>
              </View>
            </View>
            {/* Footer text */}
            <Text style={styles.notifFooterTitle}>Discover iconic locations</Text>
            <Text style={styles.notifFooterSub}>Found near you, in real time.</Text>
          </View>
        );
        case 2: return (
          <View style={styles.page}>
            <Text style={styles.pageEmoji}>❤️</Text>
            <Text style={styles.pageTitle}>Let's make this yours.</Text>
            <Text style={styles.pageSubtitle}>Tell us about yourself. This is where the app starts listening.</Text>
          </View>
        );
        case 3: return (
          <View style={styles.page}>
            <Text style={styles.pageTitle}>How do you like to travel?</Text>
            <View style={styles.cardsColumn}>
              {TRAVEL_STYLES.map((style) => {
                const active = travelStyle === style.key;
                return (
                  <TouchableOpacity
                    key={style.key}
                    style={[styles.bigCard, active && styles.bigCardActive]}
                    onPress={() => setTravelStyle(style.key)}
                  >
                    <Text style={styles.bigCardEmoji}>{style.emoji}</Text>
                    <View style={styles.bigCardText}>
                      <Text style={[styles.bigCardLabel, active && styles.bigCardLabelActive]}>
                        {style.label}
                      </Text>
                      <Text style={styles.bigCardDesc}>{style.desc}</Text>
                    </View>
                    {active && <Text style={styles.selectedBadge}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
        case 4: return (
          <View style={styles.page}>
            <Text style={styles.pageTitle}>What do you love?</Text>
            <Text style={styles.pageSubtitle}>Pick your favorites and we'll find scenes you'll love.</Text>
            <View style={styles.loveGrid}>
              {GENRES.map((item) => {
                const active = contentLoves.includes(item.label);
                return (
                  <TouchableOpacity
                    key={item.label}
                    style={[
                      styles.genreCard,
                      active && styles.genreCardActive,
                    ]}
                    onPress={() => toggleContentLove(item.label)}
                  >
                    <ImageBackground
                      source={GENRE_IMAGES[item.label]}
                      style={styles.genreImage}
                      imageStyle={styles.genreImageStyle}
                    >
                      <View style={styles.genreOverlay} />
                      <Text style={styles.genreIconText}>
                        {item.label === 'Comedy' ? '🎭' :
                         item.label === 'Drama' ? '🎬' :
                         item.label === 'Action' ? '💥' :
                         item.label === 'Sci-Fi' ? '🚀' :
                         item.label === 'Horror' ? '👻' :
                         item.label === 'Romance' ? '💕' :
                         item.label === 'Thriller' ? '🔍' :
                         item.label === 'Fantasy' ? '✨' :
                         item.label === 'Animation' ? '🎨' : '📖'}
                      </Text>
                    </ImageBackground>
                    <Text style={[styles.genreLabel, active && styles.genreLabelActive]}>
                      {item.label}
                    </Text>
                    {active && <View style={styles.genreCheck}>✓</View>}
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.genreFooter}>You can change this anytime.</Text>
          </View>
        );
        case 5: return (
          <View style={styles.page}>
            <Text style={styles.pageTitle}>How should we discover with you?</Text>
            <View style={styles.cardsColumn}>
              {TRAVEL_MODES.map((mode) => {
                const active = travelMode === mode.key;
                return (
                  <TouchableOpacity
                    key={mode.key}
                    style={[styles.bigCard, active && styles.bigCardActive]}
                    onPress={() => setTravelMode(mode.key)}
                  >
                    <Text style={styles.bigCardEmoji}>{mode.emoji}</Text>
                    <Text style={[styles.bigCardLabel, active && styles.bigCardLabelActive]}>
                      {mode.label}
                    </Text>
                    {active && <Text style={styles.selectedBadge}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
        case 6: return (
          <View style={styles.page}>
            <Text style={styles.pageTitle}>What interests you?</Text>
            <View style={styles.cardsColumn}>
              {MEDIA_INTERESTS.map((item) => {
                const active = mediaInterests.includes(item.key);
                return (item as any).comingSoon ? (
                    <View
                      key={item.key}
                      style={[styles.mediaCard, styles.mediaCardDisabled]}
                    >
                      <View style={styles.mediaRow}>
                        <Text style={[styles.mediaEmoji, { opacity: 0.4 }]}>{item.emoji}</Text>
                        <View style={styles.mediaInfo}>
                          <Text style={[styles.mediaLabel, { color: theme.colors.textTertiary }]}>
                            {item.label}
                          </Text>
                          <Text style={styles.mediaDesc}>{item.desc}</Text>
                        </View>
                        <View style={styles.comingSoonBadge}>
                          <Text style={styles.comingSoonText}>Coming soon</Text>
                        </View>
                      </View>
                    </View>
                  ) : (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.mediaCard, active && styles.mediaCardActive]}
                    onPress={() => toggleMediaInterest(item.key)}
                  >
                    <View style={styles.mediaRow}>
                      <Text style={styles.mediaEmoji}>{item.emoji}</Text>
                      <View style={styles.mediaInfo}>
                        <Text style={[styles.mediaLabel, active && styles.mediaLabelActive]}>
                          {item.label}
                        </Text>
                        <Text style={styles.mediaDesc}>{item.desc}</Text>
                      </View>
                      <View style={[styles.mediaToggle, active && styles.mediaToggleActive]}>
                        {active && <Text style={styles.mediaToggleCheck}>✓</Text>}
                      </View>
                    </View>
                  </TouchableOpacity>
                  );
              })}
            </View>

          </View>
        );
        case 7: return (
          <View style={styles.page}>
            <Text style={styles.pageEmoji}>🎉</Text>
            <Text style={styles.pageTitle}>You're ready.</Text>
            <Text style={styles.pageSubtitle}>Let's find something amazing.</Text>
            <TouchableOpacity style={styles.letsGoButton} onPress={handleComplete}>
              <Text style={styles.letsGoText}>Let's Go</Text>
            </TouchableOpacity>
          </View>
        );
        default: return null;
      }
    };

    return (
      <View style={styles.pageContainer}>
        {pageContent()}
{index > 0 && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => goToPage(index - 1)}
          >
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const pages = Array.from({ length: totalPages }, (_, i) => ({ key: `page-${i}`, index: i }));

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={pages}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => renderPage(item)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        scrollEventThrottle={16}
        bounces={false}
      />
      {renderDots()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  pageContainer: { width, flex: 1, justifyContent: 'center', alignItems: 'center' },
  page: { width, flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },

  // Gradient backgrounds
  gradientBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a0a0a',
    opacity: 0.8,
  },
  gradientBg2: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a0a0a',
    opacity: 0.6,
  },

  // Welcome page
  welcomeEmoji: { fontSize: 80, marginBottom: 24 },
  welcomeTitle: { fontSize: 28, fontWeight: '700', color: theme.colors.textPrimary, textAlign: 'center', lineHeight: 36, marginBottom: 12 },
  welcomeAccentLine: { width: 60, height: 3, backgroundColor: theme.colors.gold, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  welcomeSub: { fontSize: 16, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 22 },

  // Value prop
  valueCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface,
    padding: 20, borderRadius: 16, marginBottom: 12, width: '100%',
  },
  valueCardActive: { borderColor: theme.colors.gold, backgroundColor: theme.colors.gold + '08', borderWidth: 1.5 },
  valueEmoji: { fontSize: 32, marginRight: 16 },
  valueText: { fontSize: 20, fontWeight: '600', color: theme.colors.textPrimary, flex: 1 },
  continueButton: {
    backgroundColor: theme.colors.gold, paddingHorizontal: 40, paddingVertical: 14,
    borderRadius: 14, marginTop: 12, alignSelf: 'center',
  },
  continueButtonText: { fontSize: 16, fontWeight: '700', color: theme.colors.black },

  // Notification preview
  // Map background
  mapBg: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 300,
    backgroundColor: '#1a2e1a',
  },
  mapGridOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  mapRoad: {
    position: 'absolute', left: -20, right: -20, height: 8,
    backgroundColor: '#2a3a2a', top: 240, borderRadius: 4,
  },
  mapRoad2: {
    position: 'absolute', top: 180, bottom: 100, width: 8,
    backgroundColor: '#2a3a2a', left: '30%', borderRadius: 4,
  },
  // Building image
  notifBuildingContainer: {
    width: 180, height: 180, borderRadius: 24,
    marginBottom: -30, zIndex: 2,
    overflow: 'hidden',
    shadowColor: theme.colors.gold, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 10,
  },
  notifBuildingImage: {
    width: '100%', height: '100%',
    backgroundColor: '#8B7355',
    borderRadius: 24,
  },
  notifBuildingGlow: {
    position: 'absolute', bottom: -10, left: '20%', right: '20%', height: 20,
    backgroundColor: theme.colors.gold + '30',
    borderRadius: 10,
  },

  pageEmoji: { fontSize: 60, marginBottom: 20 },
  pageTitle: { fontSize: 24, fontWeight: '700', color: theme.colors.textPrimary, textAlign: 'center', marginBottom: 12 },
  pageSubtitle: { fontSize: 16, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  notifCard: {
    backgroundColor: theme.colors.surface, borderRadius: 20, padding: 20, paddingTop: 12,
    width: '100%', marginBottom: 16, borderWidth: 1, borderColor: theme.colors.gold + '20',
    shadowColor: theme.colors.gold, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
  },
  notifHandleBar: {
    width: 36, height: 4, backgroundColor: theme.colors.surface3,
    borderRadius: 2, alignSelf: 'center', marginBottom: 14,
  },
  notifLocationBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: theme.colors.gold + '15', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, alignSelf: 'flex-start', marginBottom: 10,
  },
  notifLocationDot: { fontSize: 12 },
  notifLocationLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.gold },
  notifShowTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.gold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  notifLocationTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 8, letterSpacing: -0.3 },
  notifBody: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18, marginBottom: 12, fontStyle: 'italic' },
  notifDivider: { height: 1, backgroundColor: theme.colors.surface3 + '60', marginBottom: 14 },
  notifActions: { flexDirection: 'row', gap: 10 },
  notifDetailBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: theme.colors.surface2, borderWidth: 1, borderColor: theme.colors.surface3,
    alignItems: 'center',
  },
  notifDetailText: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },
  notifNavigateBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: theme.colors.gold, alignItems: 'center',
    shadowColor: theme.colors.gold, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  notifNavigateText: { fontSize: 14, fontWeight: '700', color: theme.colors.black },
  notifCaption: { fontSize: 14, color: theme.colors.textSecondary, fontStyle: 'italic' },
  notifFooterTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary, textAlign: 'center', marginBottom: 6 },
  notifFooterSub: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center' },

  // Selection cards
  cardsColumn: { width: '100%', gap: 10 },
  bigCard: {
    flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 14,
    backgroundColor: theme.colors.surface, borderWidth: 1.5, borderColor: theme.colors.surface3,
  },
  bigCardActive: { borderColor: theme.colors.gold, backgroundColor: theme.colors.gold + '08', borderLeftWidth: 3, borderLeftColor: theme.colors.gold },
  bigCardEmoji: { fontSize: 28, marginRight: 14 },
  bigCardText: { flex: 1 },
  bigCardLabel: { fontSize: 15, color: theme.colors.textPrimary, fontWeight: '600' },
  bigCardLabelActive: { color: theme.colors.gold },
  bigCardDesc: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  selectedBadge: { fontSize: 18, color: theme.colors.gold, fontWeight: '700' },

  // Genre selection grid
  loveGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  genreCard: {
    width: (width - 80) / 3, aspectRatio: 1.1, borderRadius: 14,
    backgroundColor: theme.colors.surface, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: theme.colors.surface3,
    padding: 6,
  },
  genreCardActive: {
    borderColor: theme.colors.gold,
    borderWidth: 2,
    transform: [{ scale: 1.05 }],
    shadowColor: theme.colors.gold,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  genreImage: {
    width: '100%', aspectRatio: 1.6, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 6, overflow: 'hidden',
  },
  genreImageStyle: { borderRadius: 10 },
  genreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 10,
  },
  genreIconText: { fontSize: 28, zIndex: 1 },
  genreLabel: {
    fontSize: 11, fontWeight: '600', color: theme.colors.textSecondary,
    textAlign: 'center', marginTop: 2,
  },
  genreLabelActive: { color: theme.colors.gold, fontWeight: '700' },
  genreCheck: {
    position: 'absolute', top: 6, right: 6,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: theme.colors.gold,
    justifyContent: 'center', alignItems: 'center',
    fontSize: 12, fontWeight: '700', color: theme.colors.black,
    overflow: 'hidden',
  },
  genreFooter: {
    fontSize: 13, color: theme.colors.textTertiary,
    fontStyle: 'italic', textAlign: 'center',
    marginTop: 16,
  },

  // Media interest cards
  mediaCard: {
    backgroundColor: theme.colors.surface, borderRadius: 14, padding: 16,
    borderWidth: 1.5, borderColor: theme.colors.surface3,
  },
  mediaCardActive: { borderColor: theme.colors.gold, backgroundColor: theme.colors.gold + '08' },
  mediaRow: { flexDirection: 'row', alignItems: 'center' },
  mediaEmoji: { fontSize: 28, marginRight: 14 },
  mediaInfo: { flex: 1 },
  mediaLabel: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  mediaLabelActive: { color: theme.colors.gold },
  mediaDesc: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 },
  mediaToggle: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: theme.colors.surface3,
    justifyContent: 'center', alignItems: 'center',
  },
  mediaToggleActive: { borderColor: theme.colors.gold, backgroundColor: theme.colors.gold },
  mediaToggleCheck: { fontSize: 13, color: theme.colors.black, fontWeight: '700' },
  mediaCardDisabled: { opacity: 0.6, borderColor: theme.colors.surface3 },
  comingSoonBadge: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: theme.colors.gold + '20', borderRadius: 8 },
  comingSoonText: { fontSize: 11, color: theme.colors.gold, fontWeight: '600' },

  // Let's Go
  letsGoButton: {
    backgroundColor: theme.colors.gold, paddingHorizontal: 48, paddingVertical: 16,
    borderRadius: 16, marginTop: 20,
  },
  letsGoText: { fontSize: 18, fontWeight: '700', color: theme.colors.black },

  backBtn: { position: 'absolute', top: 50, left: 20 },
  backText: { fontSize: 16, color: theme.colors.textSecondary, fontWeight: '500' },

  // Page dots
  dots: {
    position: 'absolute', bottom: 40, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.surface3,
  },
  dotActive: { width: 28, backgroundColor: theme.colors.gold, borderRadius: 4 },
});
