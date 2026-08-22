import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  FlatList,
  Animated,
  Linking,
  Platform,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import Constants from 'expo-constants';
import { theme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { useAllLocations } from '../../services/hooks';
import { categoryColors } from '../../models';
import { LocationCard } from '../../components/LocationCard';
import { StarRating } from '../../components/StarRating';
import { CategoryBadge } from '../../components/CategoryBadge';
import { MoviePoster } from '../../components/MoviePoster';
import { DiscoveryNotificationCard } from '../../components/DiscoveryNotificationCard';
import { getOnboardingData } from '../../services/StorageService';
import { useSaved } from '../../context/SavedContext';
import { useCityDetection } from '../../hooks/useCityDetection';
import { CityWelcomeModal } from '../../components/CityWelcomeModal';
import { calculateDistance } from '../../services/geo';
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

  // ── Visible-region tracking ──────────────────────────────────────────────
  // The controlled `region` state only changes programmatically (onboarding
  // center, target-location center). `onRegionChangeComplete` keeps a separate
  // copy of the region the user ACTUALLY sees so the List can mirror the
  // visible map. It is deliberately NOT fed back into `region` — the map keeps
  // its current controlled behavior, and city-welcome detection stays keyed to
  // the programmatic region (no welcome-modal side effects on pan/zoom).
  const [visibleRegion, setVisibleRegion] = useState<Region | null>(null);

  // ── Dev-only: trigger notification card with mock proximity data ──
  // Cycle through real locations: each triple-tap shows the next one.
  const [devNotifVisible, setDevNotifVisible] = useState(false);
  const [devNotifLocation, setDevNotifLocation] = useState<FilmingLocation | null>(null);
  const devNotifVisibleRef = useRef(false);
  const devCycleIndex = useRef(0);
  const devTapCount = useRef(0);
  const devTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep ref in sync with state so the handler never goes stale
  useEffect(() => { devNotifVisibleRef.current = devNotifVisible; }, [devNotifVisible]);

// Only the owner's main emails can preview the proximity-notification card —
// even in release/TestFlight builds (same allowlist that gates the Admin
// Dashboard). Testers / other users get nothing.
const ADMIN_EMAILS = ['awooley4978@gmail.com', 'scenenearbysupport@gmail.com'];
const TEST_NOTIFICATION_ENABLED =
  ((Constants.expoConfig?.extra ??
    Constants.manifest?.extra) as Record<string, unknown> | undefined)?.
    enableTestNotification === true;
  const { user } = useAuth();
  const canPreviewTestNotification =
    TEST_NOTIFICATION_ENABLED &&
    !!user?.email &&
    ADMIN_EMAILS.includes(user.email);

  const handleDevNotificationTrigger = () => {
    if (!canPreviewTestNotification) return;
    if (devTapTimer.current) clearTimeout(devTapTimer.current);
    devTapCount.current += 1;
    if (devTapCount.current >= 3) {
      devTapCount.current = 0;
      if (devNotifVisibleRef.current) {
        // Dismiss current alert, then show the next one after animation
        setDevNotifVisible(false);
        setTimeout(() => {
          const locs = allLocations;
          if (locs.length > 0) {
            devCycleIndex.current = (devCycleIndex.current + 1) % locs.length;
            setDevNotifLocation(locs[devCycleIndex.current]);
            setDevNotifVisible(true);
          }
        }, 250);
      } else {
        const locs = allLocations;
        if (locs.length === 0) return;
        // First show: start with Friends if found, otherwise index 0
        const friendsIdx = locs.findIndex(
          (l) =>
            l.movieOrShow.toLowerCase().includes('friends') ||
            l.title.toLowerCase().includes('friend') ||
            l.title.toLowerCase().includes('monica'),
        );
        devCycleIndex.current = friendsIdx >= 0 ? friendsIdx : 0;
        setDevNotifLocation(locs[devCycleIndex.current]);
        setDevNotifVisible(true);
      }
    }
    devTapTimer.current = setTimeout(() => { devTapCount.current = 0; }, 600);
  };

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

  // ── List scope = the visible map region ──────────────────────────────────
  // The List mirrors the geography the map currently represents: only
  // locations whose coordinates fall inside the current viewport are listed,
  // ordered nearest-first from the user's location.
  //
  // This deliberately avoids BOTH failure modes seen in the field:
  //  · metro-label matching (the `city` column is a metro grouping — e.g.
  //    AT&T Stadium has city="Dallas" — so an exact-label match returned
  //    "0 in Arlington" while the pin rendered 4.1 mi away), and
  //  · the unfiltered global array (the R9 fix returned all 210 worldwide).
  //
  // The viewport is the screen's own designed geographic context: the map is
  // centered on the user's active city (delta 0.5) on load, and the List
  // follows pan/zoom via `visibleRegion`. No new radius model is introduced.
  const visibleLocations = useMemo(() => {
    const base = visibleRegion ?? region;
    const latMin = base.latitude - base.latitudeDelta / 2;
    const latMax = base.latitude + base.latitudeDelta / 2;
    const lngMin = base.longitude - base.longitudeDelta / 2;
    const lngMax = base.longitude + base.longitudeDelta / 2;
    const inView = allLocations.filter(
      (l) =>
        l.latitude >= latMin &&
        l.latitude <= latMax &&
        l.longitude >= lngMin &&
        l.longitude <= lngMax,
    );
    const origin = userCoords ?? { lat: base.latitude, lng: base.longitude };
    return [...inView].sort(
      (a, b) =>
        calculateDistance(origin.lat, origin.lng, a.latitude, a.longitude) -
        calculateDistance(origin.lat, origin.lng, b.latitude, b.longitude),
    );
  }, [allLocations, userCoords, region, visibleRegion]);

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

  const renderCluster = (loc: FilmingLocation, index: number) => {
    const catColor = categoryColors[loc.category];
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
      {/* Map — renders immediately with default region */}
      <MapView
        ref={mapRef}
        style={styles.map}
        region={region}
        onRegionChangeComplete={setVisibleRegion}
        showsUserLocation
        showsCompass
        mapPadding={{ top: 60, right: 16, bottom: showList ? 280 : 120, left: 16 }}
      >
        {allLocations.map(renderCluster)}
      </MapView>

      {/* Header — descriptive only */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleDevNotificationTrigger} activeOpacity={0.7}>
          <Text style={styles.headerTitle}>📍 Nearby</Text>
        </TouchableOpacity>
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
            <Text style={styles.listTitle}>
              📍 {visibleLocations.length} location{visibleLocations.length !== 1 ? 's' : ''} —{' '}
              {userCoords ? 'nearest first' : 'in view'}
            </Text>
            <TouchableOpacity onPress={toggleList}>
              <Text style={styles.listClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={visibleLocations}
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

      {/* Dev-only: proximity notification card triggered by triple-tap on header */}
      {devNotifLocation && (
        <DiscoveryNotificationCard
          visible={devNotifVisible}
          onDismiss={() => setDevNotifVisible(false)}
          movieTitle={devNotifLocation.movieOrShow}
          locationName={devNotifLocation.title}
          city={devNotifLocation.city}
          description={devNotifLocation.sceneDescription || `A filming location from ${devNotifLocation.movieOrShow}`}
          distance="0.3 mi"
          imageUrl={devNotifLocation.imageUrl}
          rating={devNotifLocation.rating?.average?.toFixed(1)}
          visitTime={devNotifLocation.estimatedVisitTime}
          onNavigate={() => {
            const { latitude, longitude } = devNotifLocation;
            const label = encodeURIComponent(devNotifLocation.title);
            const mapsUrl = Platform.select({
              ios: `maps://app?ll=${latitude},${longitude}&q=${label}`,
              android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`,
              default: `https://www.google.com/maps?q=${latitude},${longitude}`,
            });
            Linking.openURL(mapsUrl).catch(() => {});
          }}
          onViewDetails={() => {
            navigation.navigate('LocationDetail', { locationId: devNotifLocation.id });
          }}
        />
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
