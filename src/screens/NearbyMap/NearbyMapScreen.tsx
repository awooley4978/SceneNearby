import React, { useState, useRef, useEffect, useMemo } from 'react';
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
import { useAllLocations } from '../../services/hooks';
import { categoryColors } from '../../models';
import { LocationCard } from '../../components/LocationCard';
import { StarRating } from '../../components/StarRating';
import { CategoryBadge } from '../../components/CategoryBadge';
import { MoviePoster } from '../../components/MoviePoster';
import { getOnboardingData } from '../../services/StorageService';
import { useSaved } from '../../context/SavedContext';
import { useCityDetection } from '../../hooks/useCityDetection';
import { CityWelcomeModal } from '../../components/CityWelcomeModal';
import type { FilmingLocation } from '../../models';

const { width, height } = Dimensions.get('window');

export const NearbyMapScreen: React.FC<{ navigation: any; route?: any }> = ({ navigation, route }) => {
  const [selectedLocation, setSelectedLocation] = useState<FilmingLocation | null>(null);
  const [showList, setShowList] = useState(false);
  const { savedIds, toggleSave: toggleSaved } = useSaved();
  const { locations: allLocations } = useAllLocations();
  const mapRef = useRef<MapView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [region, setRegion] = useState<Region>({
    // Default world view — replaced by user city once loaded
    latitude: 34.0522,
    longitude: -118.2437,
    latitudeDelta: 40,
    longitudeDelta: 40,
  });
  const [userCity, setUserCity] = useState<string>('');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  // City welcome detection
  const { showWelcome, cityName, savedCount, dismiss } = useCityDetection({
    latitude: region.latitude,
    longitude: region.longitude,
    isGps: !!userCoords,
    isLoading: false,
    permissionDenied: false,
    error: null,
  });

  // If navigated from location detail, center on that location
  const targetLat = route?.params?.centerLat;
  const targetLng = route?.params?.centerLng;

  // Load user coordinates from onboarding data
  useEffect(() => {
    (async () => {
      try {
        const data = await getOnboardingData();
        if (data?.activeCityLat && data?.activeCityLng) {
          setUserCoords({ lat: data.activeCityLat, lng: data.activeCityLng });
          setUserCity(data.activeCity || '');
          // If no target provided, center on user
          if (!targetLat) {
            setRegion({
              latitude: data.activeCityLat,
              longitude: data.activeCityLng,
              latitudeDelta: 0.5,
              longitudeDelta: 0.5,
            });
          }
        }
      } catch {}
    })();
  }, []);

  // If target location provided, center map on it
  useEffect(() => {
    if (targetLat && targetLng) {
      const targetRegion = {
        latitude: targetLat,
        longitude: targetLng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      setRegion(targetRegion);
      setTimeout(() => {
        mapRef.current?.animateToRegion(targetRegion, 500);
      }, 300);
    }
  }, [targetLat, targetLng]);

  // Filter locations by current city
  const cityLocations = useMemo(() => {
    if (!userCity) return allLocations;
    const cityName = userCity.toLowerCase();
    return allLocations.filter((l) => l.city.toLowerCase().includes(cityName) || cityName.includes(l.city.toLowerCase()));
  }, [userCity]);

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

  const handleSaveToggle = async (id: string) => {
    await toggleSaved(id);
    setSelectedLocation(selectedLocation?.id === id ? { ...selectedLocation! } : selectedLocation);
  };

  const toggleList = () => {
    setShowList(!showList);
    setSelectedLocation(null);
  };

  const renderCluster = (loc: FilmingLocation) => {
    const catColor = categoryColors[loc.category];
    return (
      <Marker
        key={loc.id}
        coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
        onPress={() => handleMarkerPress(loc)}
      >
        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: catColor }} />
      </Marker>
    );
  };

  return (
    <View style={styles.container}>
      {/* Map — renders immediately with default region */}
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
            {selectedLocation.rating && (
              <View style={styles.calloutRating}>
                <StarRating rating={selectedLocation.rating.average} size={12} showCount />
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
            <Text style={styles.listTitle}>📍 {cityLocations.length} location{cityLocations.length !== 1 ? 's' : ''} in {userCity || 'your area'}</Text>
            <TouchableOpacity onPress={toggleList}>
              <Text style={styles.listClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={cityLocations}
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

      {/* City Welcome Modal */}
      <CityWelcomeModal
        visible={showWelcome}
        cityName={cityName}
        savedCount={savedCount}
        onSavedPlaces={() => {
          dismiss();
          navigation.navigate('Saved');
        }}
        onSavedDiscover={() => {
          dismiss();
          // Stay on map — saved locations are already visible as markers
        }}
        onDiscoverAll={() => {
          dismiss();
          // Stay on map — all locations are already shown
        }}
      />
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
  // Custom colored dot markers
  markerDot: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: 'white',
  },
});
