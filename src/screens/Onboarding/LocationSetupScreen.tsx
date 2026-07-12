import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { theme } from '../../theme';
import { CITIES } from '../../models';

const { width } = Dimensions.get('window');

interface LocationSetupScreenProps {
  onboardingData: any;
  onComplete: (data: { activeCity: string; activeCityLat: number; activeCityLng: number }) => void;
}

const POPULAR_CITIES = [
  { name: 'Los Angeles', emoji: '🎬' },
  { name: 'New York', emoji: '🗽' },
  { name: 'Chicago', emoji: '🏙️' },
  { name: 'London', emoji: '🎭' },
  { name: 'Paris', emoji: '🗼' },
  { name: 'Tokyo', emoji: '🗾' },
  { name: 'Sydney', emoji: '🦘' },
  { name: 'Rome', emoji: '🏛️' },
  { name: 'San Francisco', emoji: '🌉' },
  { name: 'Boston', emoji: '📚' },
  { name: 'Seattle', emoji: '☕' },
  { name: 'Dublin', emoji: '🍀' },
  { name: 'Berlin', emoji: '🐻' },
  { name: 'Vancouver', emoji: '🌲' },
  { name: 'Toronto', emoji: '🏛️' },
  { name: 'Dallas', emoji: '🤠' },
];

export const LocationSetupScreen: React.FC<LocationSetupScreenProps> = ({
  onboardingData,
  onComplete,
}) => {
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Mock: default location is Times Square, NYC
  const mockCity = 'New York City';
  const mockState = 'NY';

  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return CITIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.state.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const handleExploreHere = () => {
    // Use Times Square as default center for NYC
    onComplete({
      activeCity: 'New York City',
      activeCityLat: 40.7580,
      activeCityLng: -73.9855,
    });
  };

  const handleCitySelect = (city: typeof CITIES[0]) => {
    // Map city names to match sample data city field
    const cityNameMap: Record<string, string> = {
      'New York': 'New York City',
      'Los Angeles': 'Los Angeles',
      'London': 'London',
      'Chicago': 'Chicago',
      'Atlanta': 'Atlanta',
      'San Francisco': 'San Francisco',
      'Boston': 'Boston',
      'Seattle': 'Seattle',
      'Vancouver': 'Vancouver',
      'Toronto': 'Toronto',
      'Paris': 'Paris',
      'Rome': 'Rome',
      'Sydney': 'Sydney',
      'Auckland': 'Auckland',
      'Tokyo': 'Tokyo',
      'Berlin': 'Berlin',
      'Dublin': 'Dublin',
      'New Orleans': 'New Orleans',
      'Washington DC': 'Washington DC',
      'Dallas': 'Dallas',
    };
    onComplete({
      activeCity: cityNameMap[city.name] || city.name,
      activeCityLat: city.lat,
      activeCityLng: city.lng,
    });
  };

  // If location not yet determined, ask
  if (locationGranted === null) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.emoji}>📍</Text>
          <Text style={styles.title}>Welcome to Scene Nearby!</Text>
          <Text style={styles.subtitle}>
            We'd love to show you what's nearby.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setLocationGranted(true)}
          >
            <Text style={styles.primaryButtonText}>Enable Location</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setLocationGranted(false)}
          >
            <Text style={styles.secondaryButtonText}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Location granted
  if (locationGranted) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.emoji}>🗺️</Text>
          <Text style={styles.title}>Welcome to Scene Nearby!</Text>
          <Text style={styles.locationText}>
            It looks like you're in{' '}
            <Text style={styles.locationHighlight}>{mockCity}</Text>.
          </Text>

          <TouchableOpacity style={styles.primaryButton} onPress={handleExploreHere}>
            <Text style={styles.primaryButtonText}>Yes, show me around!</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Text style={styles.planningText}>Planning a trip instead?</Text>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search any city to start exploring"
              placeholderTextColor={theme.colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {searchQuery.trim().length > 0 && filteredCities.length > 0 && (
            <View style={styles.searchResults}>
              {filteredCities.map((city) => (
                <TouchableOpacity
                  key={city.name}
                  style={styles.searchResultRow}
                  onPress={() => handleCitySelect(city)}
                >
                  <Text style={styles.searchResultName}>{city.name}</Text>
                  <Text style={styles.searchResultState}>{city.state}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  }

  // Location denied — show city search
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.emoji}>🔍</Text>
        <Text style={styles.title}>Where would you like to explore first?</Text>

        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search city..."
            placeholderTextColor={theme.colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {searchQuery.trim().length > 0 && filteredCities.length > 0 ? (
          <View style={styles.searchResults}>
            {filteredCities.map((city) => (
              <TouchableOpacity
                key={city.name}
                style={styles.searchResultRow}
                onPress={() => handleCitySelect(city)}
              >
                <Text style={styles.searchResultName}>{city.name}</Text>
                <Text style={styles.searchResultState}>{city.state}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <>
            <Text style={styles.suggestionsTitle}>Popular suggestions</Text>
            <View style={styles.suggestionsGrid}>
              {POPULAR_CITIES.map((city) => (
                <TouchableOpacity
                  key={city.name}
                  style={styles.suggestionCard}
                  onPress={() => {
                    const found = CITIES.find((c) => c.name === city.name);
                    if (found) {
                      const cityNameMap: Record<string, string> = {
                        'New York': 'New York City',
                        'Los Angeles': 'Los Angeles',
                        'London': 'London',
                        'Chicago': 'Chicago',
                        'Paris': 'Paris',
                      };
                      onComplete({
                        activeCity: cityNameMap[city.name] || city.name,
                        activeCityLat: found.lat,
                        activeCityLng: found.lng,
                      });
                    }
                  }}
                >
                  <Text style={styles.suggestionEmoji}>{city.emoji}</Text>
                  <Text style={styles.suggestionName}>{city.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emoji: { fontSize: 60, marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '700', color: theme.colors.textPrimary, textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 16, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  locationText: { fontSize: 18, color: theme.colors.textPrimary, textAlign: 'center', marginBottom: 28, lineHeight: 26 },
  locationHighlight: { color: theme.colors.gold, fontWeight: '700' },

  primaryButton: {
    backgroundColor: theme.colors.gold, paddingHorizontal: 40, paddingVertical: 16,
    borderRadius: 14, width: '100%', alignItems: 'center', marginBottom: 12,
  },
  primaryButtonText: { fontSize: 17, fontWeight: '700', color: theme.colors.black },
  secondaryButton: {
    paddingVertical: 14, paddingHorizontal: 40, borderRadius: 14,
    borderWidth: 1, borderColor: theme.colors.surface3, width: '100%', alignItems: 'center',
  },
  secondaryButtonText: { fontSize: 15, fontWeight: '600', color: theme.colors.textSecondary },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, width: '100%' },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.colors.surface3 },
  dividerText: { marginHorizontal: 12, fontSize: 13, color: theme.colors.textTertiary },

  planningText: { fontSize: 15, color: theme.colors.textSecondary, marginBottom: 12, alignSelf: 'flex-start' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface,
    borderRadius: 12, paddingHorizontal: 14, height: 48, width: '100%',
    borderWidth: 1, borderColor: theme.colors.surface3, marginBottom: 12,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, color: theme.colors.textPrimary, fontSize: 15 },

  searchResults: { width: '100%', backgroundColor: theme.colors.surface, borderRadius: 12, overflow: 'hidden' },
  searchResultRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.surface3 + '40',
  },
  searchResultName: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  searchResultState: { fontSize: 13, color: theme.colors.textTertiary },

  suggestionsTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 12, alignSelf: 'flex-start', marginTop: 8 },
  suggestionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  suggestionCard: {
    width: (width - 84) / 3, paddingVertical: 16, borderRadius: 14,
    backgroundColor: theme.colors.surface, alignItems: 'center',
    borderWidth: 1, borderColor: theme.colors.surface3,
  },
  suggestionEmoji: { fontSize: 28, marginBottom: 6 },
  suggestionName: { fontSize: 12, fontWeight: '600', color: theme.colors.textPrimary },
});