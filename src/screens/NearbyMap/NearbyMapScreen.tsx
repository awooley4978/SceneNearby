import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  FlatList,
  Animated,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { theme } from '../../theme';
import { allLocations, mockRatings } from '../../data/sampleData';
import { categoryColors } from '../../models';
import { LocationCard } from '../../components/LocationCard';
import { StarRating } from '../../components/StarRating';
import { CategoryBadge } from '../../components/CategoryBadge';
import { MoviePoster } from '../../components/MoviePoster';
import { getOnboardingData } from '../../services/StorageService';
import type { FilmingLocation } from '../../models';

const { width, height } = Dimensions.get('window');

export const NearbyMapScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [selectedLocation, setSelectedLocation] = useState<FilmingLocation | null>(null);
  const [showList, setShowList] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set(['nyc-002', 'nyc-007', 'la-001', 'ldn-006']));
  const mapRef = useRef<MapView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [region, setRegion] = useState<Region | null>(null);
  const [userCity, setUserCity] = useState<string>('');

  // Load user coordinates from onboarding data
  useEffect(() => {
    (async () => {
      try {
        const data = await getOnboardingData();
        if (data?.activeCityLat && data?.activeCityLng) {
          const newRegion: Region = {
            latitude: data.activeCityLat,
            longitude: data.activeCityLng,
            latitudeDelta: 0.5,
            longitudeDelta: 0.5,
          };
          setRegion(newRegion);
        }
        if (data?.activeCity) {
          setUserCity(data.activeCity);
        }
      } catch {}
    })();
  }, []);

  const handleMarkerPress = (location: FilmingLocation) => {
    setSelectedLocation(location);
    // Animated region transition
    mapRef.current?.animateToRegion(
      {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      },
      600,
    );
    Animated.spring(fadeAnim, {
      toValue: 1,
      tension: 40,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handleViewDetails = (location: FilmingLocation) => {
    navigation.navigate('LocationDetail', { locationId: location.id });
  };

  const handleDismissCallout = () => {
    setSelectedLocation(null);
    fadeAnim.setValue(0);
  };

  const handleSaveToggle = (id: string) => {
    const next = new Set(savedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSavedIds(next);
    setSelectedLocation(selectedLocation?.id === id ? { ...selectedLocation! } : selectedLocation);
  };

  const toggleList = () => {
    setShowList(!showList);
    setSelectedLocation(null);
  };

  const renderCluster = (loc: FilmingLocation, index: number) => {
    const catColor = categoryColors[loc.category];
    const rating = mockRatings[loc.id];
    const isSaved = savedIds.has(loc.id);
    return (
      <Marker
        key={loc.id}
        coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
        pinColor={catColor}
        onPress={() => handleMarkerPress(loc)}
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Map — only render once region is loaded */}
      {region ? (
      <MapView
        ref={mapRef}
        style={styles.map}
        region={region}
        showsUserLocation
        showsCompass
        mapPadding={{ top: 60, right: 16, bottom: showList ? 280 : 120, left: 16 }}
      >
        {allLocations.map(renderCluster)}
      </MapView>
      ) : (
        <View style={styles.map} />
      )}

      {/* Header — descriptive only */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📍 Nearby</Text>
        {userCity ? (
          <Text style={styles.headerSubtitle}>Exploring locations near {userCity}</Text>
        ) : (
          <Text style={styles.headerSubtitle}>{allLocations.length} filming locations worldwide</Text>
        )}
      </View>

      {/* List/Map toggle */}
      <TouchableOpacity style={styles.toggleButton} onPress={toggleList}>
        <Text style={styles.toggleText}>{showList ? '🗺️ Map' : '📋 List'}</Text>
      </TouchableOpacity>

      {/* Rich callout */}
      {selectedLocation && !showList && (() => {
        const isSaved = savedIds.has(selectedLocation.id);
        return (
        <Animated.View style={[styles.callout, { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }] }]}>
          <TouchableOpacity style={styles.calloutClose} onPress={handleDismissCallout}>
            <Text style={styles.calloutCloseText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.calloutContentRow}>
            <MoviePoster title={selectedLocation.movieOrShow} size="small" />
            <TouchableOpacity style={styles.calloutTextContent} onPress={() => handleViewDetails(selectedLocation)}>
            <Text style={styles.calloutShow}>{selectedLocation.movieOrShow}</Text>
            <Text style={styles.calloutTitle}>{selectedLocation.title}</Text>
            <View style={styles.calloutTags}>
              <CategoryBadge category={selectedLocation.category} />
              <View style={styles.calloutYearBadge}>
                <Text style={styles.calloutYearText}>{selectedLocation.year}</Text>
              </View>
            </View>
            {mockRatings[selectedLocation.id] && (
              <View style={styles.calloutRating}>
                <StarRating rating={mockRatings[selectedLocation.id].average} size={12} showCount />
              </View>
            )}
          </TouchableOpacity>
          </View>
          <View style={styles.calloutActions}>
            <TouchableOpacity
              style={styles.calloutDetailBtn}
              onPress={() => handleViewDetails(selectedLocation)}
            >
              <Text style={styles.calloutDetailText}>View Details</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.calloutSaveBtn, isSaved && styles.calloutSavedBtn]}
              onPress={() => handleSaveToggle(selectedLocation.id)}
            >
              <Text style={[styles.calloutSaveText, isSaved && styles.calloutSavedText]}>
                {isSaved ? '✓ Saved' : '+ Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
        );
      })()}

      {/* List view */}
      {showList && (
        <View style={styles.listPanel}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>📍 {allLocations.length} filming locations</Text>
            <TouchableOpacity onPress={toggleList}>
              <Text style={styles.listClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={allLocations}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <LocationCard
                location={item}
                onPress={() => {
                  handleMarkerPress(item);
                  setShowList(false);
                }}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  map: { flex: 1 },
  header: { position: 'absolute', top: 50, left: 16, zIndex: 10 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: theme.colors.textPrimary },
  headerSubtitle: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 2 },
  toggleButton: {
    position: 'absolute',
    top: 110,
    right: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.surface3,
    zIndex: 10,
  },
  toggleText: { fontSize: 13, fontWeight: '600', color: theme.colors.gold },
  callout: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  calloutClose: { position: 'absolute', top: 12, right: 12, zIndex: 1, width: 24, height: 24, borderRadius: 12, backgroundColor: theme.colors.surface3, justifyContent: 'center', alignItems: 'center' },
  calloutCloseText: { fontSize: 12, color: theme.colors.textSecondary },
  calloutContentRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  calloutTextContent: { flex: 1 },
  calloutShow: { fontSize: 15, fontWeight: '700', color: theme.colors.gold, marginBottom: 2 },
  calloutTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: 8 },
  calloutTags: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  calloutYearBadge: { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: theme.colors.surface2, borderRadius: 6 },
  calloutYearText: { fontSize: 11, color: theme.colors.textSecondary },
  calloutRating: { marginBottom: 10 },
  calloutActions: { flexDirection: 'row', gap: 10 },
  calloutDetailBtn: { flex: 1, backgroundColor: theme.colors.gold, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  calloutDetailText: { color: theme.colors.black, fontWeight: '700', fontSize: 14 },
  calloutSaveBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: theme.colors.surface3, alignItems: 'center' },
  calloutSaveText: { color: theme.colors.gold, fontWeight: '600', fontSize: 13 },
  calloutSavedBtn: { backgroundColor: theme.colors.gold + '20', borderWidth: 1, borderColor: theme.colors.gold },
  calloutSavedText: { color: theme.colors.gold },
  listPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, height: height * 0.45, backgroundColor: theme.colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderTopColor: theme.colors.surface3 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  listTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary },
  listClose: { fontSize: 18, color: theme.colors.textTertiary, padding: 4 },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
});
