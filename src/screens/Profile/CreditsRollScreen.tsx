import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../theme';
import { locationsByMovie } from '../data/sampleData';
import { BackButton } from '../components/BackButton';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const CREDITS_DURATION = 20000; // 20-second scroll

interface Props {
  route: any;
  navigation: any;
}

export const CreditsRollScreen: React.FC<Props> = ({ route, navigation }) => {
  const { movieTitle, visitedCount, totalCount } = route.params;
  const locations = locationsByMovie(movieTitle);
  const scrollY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in the header
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Scroll the credits up
    Animated.timing(scrollY, {
      toValue: -locations.length * 80 - 200,
      duration: CREDITS_DURATION,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleDone = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      {/* Dark background */}
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={['#0a0a0a', '#111111', '#0a0a0a']}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Top fade overlay */}
      <LinearGradient
        colors={['rgba(10,10,10,0.95)', 'transparent']}
        style={styles.topFade}
        pointerEvents="none"
      />

      {/* Bottom fade overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(10,10,10,0.95)']}
        style={styles.bottomFade}
        pointerEvents="none"
      />

      {/* Fixed header */}
      <Animated.View style={[styles.header, { opacity: fadeIn }]}>
        <BackButton />
        <Text style={styles.headerEmoji}>🎬</Text>
        <Text style={styles.headerTitle}>Credits Roll</Text>
        <Text style={styles.movieTitle}>{movieTitle}</Text>
        <View style={styles.completionBadge}>
          <Text style={styles.completionText}>
            {visitedCount} of {totalCount} locations visited
          </Text>
        </View>
        <View style={styles.stars}>
          {Array.from({ length: totalCount }).map((_, i) => (
            <Text key={i} style={styles.star}>⭐</Text>
          ))}
        </View>
      </Animated.View>

      {/* Scrolling credits */}
      <Animated.View style={[styles.creditsContainer, { transform: [{ translateY: scrollY }] }]}>
        {locations.map((loc, i) => (
          <View key={loc.id} style={styles.creditRow}>
            <View style={styles.creditNumber}>
              <Text style={styles.creditNumberText}>{i + 1}</Text>
            </View>
            <View style={styles.creditContent}>
              <Text style={styles.creditLocation}>{loc.title}</Text>
              <Text style={styles.creditCity}>
                {loc.city}, {loc.country}
              </Text>
            </View>
          </View>
        ))}

        {/* Closing text */}
        <View style={styles.closingSection}>
          <Text style={styles.closingEmoji}>🎥</Text>
          <Text style={styles.closingText}>All locations explored</Text>
          <Text style={styles.closingSub}>Directed by you</Text>
          <Text style={styles.closingApp}>Scene Nearby</Text>
        </View>
      </Animated.View>

      {/* Done button */}
      <TouchableOpacity style={styles.doneButton} onPress={handleDone} activeOpacity={0.8}>
        <Text style={styles.doneText}>Continue Exploring</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    zIndex: 2,
  },
  bottomFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    zIndex: 2,
  },

  // Header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 3,
    alignItems: 'center',
    paddingTop: 70,
    paddingBottom: 24,
  },
  headerEmoji: { fontSize: 40, marginBottom: 8 },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.gold,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  movieTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.white,
    marginBottom: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  completionBadge: {
    backgroundColor: theme.colors.gold + '20',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.gold + '40',
    marginBottom: 12,
  },
  completionText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.gold,
  },
  stars: {
    flexDirection: 'row',
    gap: 4,
  },
  star: { fontSize: 16 },

  // Credits scroll
  creditsContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  creditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    maxWidth: 400,
  },
  creditNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.gold + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: theme.colors.gold + '30',
  },
  creditNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.gold,
  },
  creditContent: {
    flex: 1,
  },
  creditLocation: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.white,
  },
  creditCity: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },

  // Closing
  closingSection: {
    alignItems: 'center',
    marginTop: 48,
    paddingVertical: 32,
  },
  closingEmoji: { fontSize: 36, marginBottom: 12 },
  closingText: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.gold,
    marginBottom: 4,
  },
  closingSub: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 16,
  },
  closingApp: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // Done button
  doneButton: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    zIndex: 4,
    backgroundColor: theme.colors.gold,
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 14,
  },
  doneText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
});
