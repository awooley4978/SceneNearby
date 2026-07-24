import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Share,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { theme } from '../../theme';
import { locationById, photosByLocation, calculateDistance } from '../../data/sampleData';
import { categoryColors, STORAGE_KEYS, defaultUserSettings, communityPhotoToGallery } from '../../models';
import { getUserSettings, setUserSettings } from '../../services/StorageService';
import { useSaved } from '../../context/SavedContext';
import { useUserLocation } from '../../hooks/useUserLocation';
import { CategoryBadge } from '../../components/CategoryBadge';
import { MapPlaceholder } from '../../components/MapPlaceholder';
import { SmartHeroImage } from '../../components/SmartHeroImage';
import { getLocalAsset } from '../../data/assetMap';
import { RatingSection } from '../../components/RatingSection';
import { WorthTheVisit } from '../../components/WorthTheVisit';
import { EstimatedVisitTime } from '../../components/EstimatedVisitTime';
import { VisitorTips } from '../../components/VisitorTips';
import { RemoteDestinationBadge } from '../../components/RemoteDestinationBadge';
import { LocationPhotoGallery, GalleryPhoto } from '../../components/LocationPhotoGallery';
import { logLocationViewed, logLocationSaved, logLocationUnsaved, logLocationNavigate, logLocationShared, logUserRating } from '../../services/analytics';

export const LocationDetailScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { locationId } = route.params;
  const location = locationById(locationId);
  const communityPhotos = location ? photosByLocation(location.id) : [];
  const { isSaved: checkSaved, toggleSave: toggleSaved } = useSaved();
  const saved = checkSaved(locationId);
  const [imageError, setImageError] = useState(false);
  const userLocation = useUserLocation();

  const distanceFromUser = React.useMemo(() => {
    if (userLocation.latitude === null || userLocation.longitude === null || !location) return undefined;
    return calculateDistance(userLocation.latitude, userLocation.longitude, location.latitude, location.longitude) / 1609.34;
  }, [userLocation.latitude, userLocation.longitude, location]);

  // Map community photos to gallery format with location hero as fallback
  const galleryPhotos: GalleryPhoto[] = React.useMemo(() => {
    return communityPhotos
      .map((p) => communityPhotoToGallery(p, location?.imageUrl))
      .filter((p) => p.imageUrl);
  }, [communityPhotos, location?.imageUrl]);

  if (!location) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Location not found</Text>
      </View>
    );
  }

  const catColor = categoryColors[location.category];

  const handleNavigate = async () => {
    const lat = location.latitude;
    const lng = location.longitude;
    const appleMapsUrl = Platform.OS === 'ios'
      ? `maps://?daddr=${lat},${lng}`
      : `https://maps.apple.com/?daddr=${lat},${lng}`;
    const wazeUrl = `waze://?ll=${lat},${lng}&navigate=yes`;
    const wazeFallback = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
    const googleMapsUrl = `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`;
    const googleMapsFallback = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    // Check availability
    const canOpenGoogleMaps = await Linking.canOpenURL('comgooglemaps://');
    const canOpenWaze = await Linking.canOpenURL('waze://');
    const canOpenAppleMaps = await Linking.canOpenURL('maps://');

    // Check saved preference
    const settings = await getUserSettings(defaultUserSettings);
    const pref = settings.navApp;

    const openApp = (app: string) => {
      if (app === 'googlemaps') Linking.openURL(canOpenGoogleMaps ? googleMapsUrl : googleMapsFallback);
      else if (app === 'applemaps') Linking.openURL(appleMapsUrl);
      else if (app === 'waze') Linking.openURL(canOpenWaze ? wazeUrl : wazeFallback);
    };

    // Direct open if preference is set and available
    if (pref && (
      (pref === 'googlemaps' && canOpenGoogleMaps) ||
      (pref === 'applemaps' && canOpenAppleMaps) ||
      (pref === 'waze' && canOpenWaze)
    )) {
      logLocationNavigate({ locationId: location.id, appName: pref });
      openApp(pref);
      return;
    }

    // Show action sheet
    const options: { label: string; app: string; available: boolean }[] = [
      { label: '📍 Google Maps', app: 'googlemaps', available: canOpenGoogleMaps },
      { label: '🗺️ Apple Maps', app: 'applemaps', available: canOpenAppleMaps },
      { label: '🚗 Waze', app: 'waze', available: canOpenWaze },
    ];

    const sheetOptions: string[] = [
      ...options.map((o) => o.available ? o.label : o.label + ' (web)'),
      ...(pref ? ['Choose another app'] : []),
      'Cancel',
    ];

    const sheetActions: (() => void)[] = [
      ...options.map((o) => () => {
        logLocationNavigate({ locationId: location.id, appName: o.app });
        openApp(o.app);
        // Save selection as preference
        setUserSettings({ ...settings, navApp: o.app });
      }),
      ...(pref ? [() => {
        // "Choose another app" — show full picker without saving
        const pickerOptions: string[] = options.map((o) => o.available ? o.label : o.label + ' (web)');
        pickerOptions.push('Cancel');
        const pickerActions: (() => void)[] = [
          ...options.map((o) => () => {
            logLocationNavigate({ locationId: location.id, appName: o.app });
            openApp(o.app);
            setUserSettings({ ...settings, navApp: o.app });
          }),
          () => {},
        ];
        Alert.alert('Navigate With', location.title, pickerOptions.map((opt, i) => ({
          text: opt,
          onPress: pickerActions[i],
          style: opt === 'Cancel' ? 'cancel' : 'default' as const,
        })));
      }] : []),
      () => {},
    ];

    Alert.alert('Navigate To', location.title, sheetOptions.map((opt, i) => ({
      text: opt,
      onPress: sheetActions[i],
      style: opt === 'Cancel' ? 'cancel' : 'default' as const,
    })));
  };

  const handleShare = async () => {
    logLocationShared({ locationId: location.id, movieTitle: location.movieOrShow });
    try {
      await Share.share({
        message: `🎬 Check out ${location.movieOrShow} filming location: ${location.title}\n${location.address}, ${location.city}\n\nvia Scene Nearby`,
      });
    } catch {}
  };

  const handleSave = async () => {
    await toggleSaved(locationId);
  };


  const handleViewMovie = () => {
    navigation.navigate('MovieDetail', { movieTitle: location.movieOrShow });
  };


  const handleCorrection = () => {
    const subject = encodeURIComponent('Location Correction');
    const body = encodeURIComponent(
      'Hello Scene Nearby Team,%0D%0A%0D%0AI found something that may need updating.%0D%0A%0D%0A' +
      '--- Location ---%0D%0A' +
      `${location.title}%0D%0A%0D%0A` +
      '--- Movie/TV ---%0D%0A' +
      `${location.movieOrShow}%0D%0A%0D%0A` +
      '--- City ---%0D%0A' +
      `${location.city}, ${location.country}%0D%0A%0D%0A` +
      '--- Location ID ---%0D%0A' +
      `${location.id}%0D%0A%0D%0A` +
      '--- Issue ---%0D%0A' +
      '(e.g. Incorrect location, Incorrect photo, Duplicate location, Closed location)%0D%0A%0D%0A' +
      '--- Details ---%0D%0A%0D%0A%0D%0A' +
      '--- Supporting source (optional) ---%0D%0A%0D%0A%0D%0A' +
      'Thank you for helping keep Scene Nearby accurate!'
    );
    const mailto = `mailto:scenenearbysupport@gmail.com?subject=${subject}&body=${body}`;
    Linking.openURL(mailto).catch(() => {
      Alert.alert('Error', 'Could not open email app. Please contact scenenearbysupport@gmail.com directly.');
    });
  };

  const handleContentRequest = () => {
    const subject = encodeURIComponent('Content Request');
    const body = encodeURIComponent(
      'Hello Scene Nearby Team,%0D%0A%0D%0A' +
      'I would like to suggest adding a new filming location.%0D%0A%0D%0A' +
      '--- Location ---%0D%0A%0D%0A%0D%0A' +
      '--- Movie/TV Show ---%0D%0A%0D%0A%0D%0A' +
      '--- City / Country ---%0D%0A%0D%0A%0D%0A' +
      '--- Scene Description ---%0D%0A%0D%0A%0D%0A' +
      '--- Why it should be featured ---%0D%0A%0D%0A%0D%0A' +
      '--- Supporting source (link) ---%0D%0A%0D%0A%0D%0A' +
      'Thank you for considering my request!'
    );
    const mailto = `mailto:scenenearbysupport@gmail.com?subject=${subject}&body=${body}`;
    Linking.openURL(mailto).catch(() => {
      Alert.alert('Error', 'Could not open email app. Please contact scenenearbysupport@gmail.com directly.');
    });
  };

  const handleFeatureSuggestion = () => {
    const subject = encodeURIComponent('Feature Suggestion');
    const body = encodeURIComponent(
      'Hello Scene Nearby Team,%0D%0A%0D%0A' +
      'I have an idea for a feature!%0D%0A%0D%0A' +
      '--- Feature Description ---%0D%0A%0D%0A%0D%0A' +
      '--- How it would work ---%0D%0A%0D%0A%0D%0A' +
      '--- Why it would be useful ---%0D%0A%0D%0A%0D%0A' +
      'Thank you for making Scene Nearby better!'
    );
    const mailto = `mailto:scenenearbysupport@gmail.com?subject=${subject}&body=${body}`;
    Linking.openURL(mailto).catch(() => {
      Alert.alert('Error', 'Could not open email app. Please contact scenenearbysupport@gmail.com directly.');
    });
  };

  const handleBugReport = () => {
    const subject = encodeURIComponent('Bug Report');
    const body = encodeURIComponent(
      'Hello Scene Nearby Team,%0D%0A%0D%0A' +
      'I encountered a bug while using the app.%0D%0A%0D%0A' +
      '--- What happened ---%0D%0A%0D%0A%0D%0A' +
      '--- Steps to reproduce ---%0D%0A%0D%0A%0D%0A' +
      '--- What I expected to happen ---%0D%0A%0D%0A%0D%0A' +
      '--- Device / OS ---%0D%0A%0D%0A%0D%0A' +
      '--- App version ---%0D%0A1.0.0%0D%0A%0D%0A' +
      'Thank you for your help!'
    );
    const mailto = `mailto:scenenearbysupport@gmail.com?subject=${subject}&body=${body}`;
    Linking.openURL(mailto).catch(() => {
      Alert.alert('Error', 'Could not open email app. Please contact scenenearbysupport@gmail.com directly.');
    });
  };


  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={{color:"gold",fontSize:10,textAlign:"center",paddingTop:4}}>build: 064328</Text>
        {location.imageUrl && !imageError ? (
          <SmartHeroImage
            imageUrl={location.imageUrl}
            focalPoint={location.focalPoint}
            onError={() => setImageError(true)}
          />
        ) : (
          <MapPlaceholder locationId={location.id} locationName={location.title} hasPhotos={galleryPhotos.length > 0} />
        )}
        <View style={styles.heroContent}>
          <TouchableOpacity onPress={handleViewMovie}>
            <Text style={styles.showName}>{location.movieOrShow} ›</Text>
          </TouchableOpacity>
          <Text style={styles.locationTitle}>{location.title}</Text>
          <View style={styles.badges}>
            <CategoryBadge category={location.category} />
            <View style={styles.yearBadge}><Text style={styles.yearText}>{location.year}</Text></View>
            {distanceFromUser !== undefined && (
              <View style={styles.distanceBadge}>
                <Text style={styles.distanceText}>
                  📍 {distanceFromUser < 1
                    ? `${(distanceFromUser * 5280).toFixed(0)}ft`
                    : `${distanceFromUser.toFixed(1)}mi`} away
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Ratings & Reviews */}
      <View style={styles.compactSection}>
        <RatingSection googleRating={location.googleRating} placeId={location.googleRating?.placeId} />
      </View>

      {/* Remote Destination Warning */}
      {location.remoteDestination && (
        <RemoteDestinationBadge info={location.remoteDestination} />
      )}

      {/* Worth the Visit — Scene Nearby community */}
      <View style={styles.compactSection}>
        <WorthTheVisit
          percentage={location.worthItPercentage}
          votes={location.worthItVotes}
          locationId={location.id}
        />
      </View>

      {/* Estimated Visit Time */}
      <View style={styles.compactSection}>
        <EstimatedVisitTime time={location.estimatedVisitTime} locationId={location.id} />
      </View>

      {/* What Happened Here */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎬 What Happened Here</Text>
        <Text style={styles.bodyText}>{location.sceneDescription}</Text>
      </View>

      {/* Iconic Quote */}
      {location.quote && (
        <View style={styles.quoteSection}>
          <Text style={styles.quoteIcon}>💬</Text>
          <Text style={styles.quoteText}>"{location.quote}"</Text>
          {location.quoteAttribution && (
            <Text style={styles.quoteAttr}>— {location.quoteAttribution}</Text>
          )}
        </View>
      )}

      {/* Then & Now */}
      {location.thenAndNow && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📸 Then & Now</Text>
          <Text style={styles.bodyText}>{location.thenAndNow}</Text>
        </View>
      )}

      {/* Fun Fact */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🤔 Did You Know?</Text>
        <Text style={styles.bodyText}>{location.funFact}</Text>
      </View>

      {/* Community Photos */}
      {galleryPhotos.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Community Photos</Text>
          <LocationPhotoGallery
            photos={galleryPhotos}
            showAddButton={false}
          />
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Community Photos</Text>
          <Text style={styles.emptyStateText}>No community photos yet.</Text>
          <TouchableOpacity
            style={styles.uploadPill}
            onPress={() => navigation.navigate('Upload', { locationId: location.id, locationName: location.title })}
            activeOpacity={0.7}
          >
            <Text style={styles.uploadPillText}>📸 Upload the first photo</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Visitor Tips */}
      {location && (
        <View style={styles.section}>
          <VisitorTips locationId={location.id} estimatedVisitTime={location.estimatedVisitTime} />
        </View>
      )}

      {/* Location info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📍 Location</Text>
        <Text style={styles.bodyText}>{location.address}</Text>
        <Text style={styles.bodyText}>{location.city}, {location.country}</Text>
        <Text style={styles.coords}>
          {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleNavigate}>
          <Text style={styles.primaryButtonText}>🗺️ Navigate</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryButton, saved && styles.savedButton]}
          onPress={handleSave}
        >
          <Text style={[styles.secondaryButtonText, saved && styles.savedButtonText]}>
            {saved ? '✅ Saved' : '💾 Save'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleShare}>
          <Text style={styles.secondaryButtonText}>📤 Share</Text>
        </TouchableOpacity>
      </View>

      {/* Support section */}
      <View style={styles.supportSection}>
        <Text style={styles.supportTitle}>📬 Support</Text>
        <TouchableOpacity style={styles.supportLink} onPress={handleCorrection}>
          <Text style={styles.supportLinkText}>📍 Location Correction</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.supportLink} onPress={handleContentRequest}>
          <Text style={styles.supportLinkText}>➕ Suggest a Location</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.supportLink} onPress={handleFeatureSuggestion}>
          <Text style={styles.supportLinkText}>💡 Feature Suggestion</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.supportLink} onPress={handleBugReport}>
          <Text style={styles.supportLinkText}>🐛 Report a Bug</Text>
        </TouchableOpacity>
        <Text style={styles.supportFooter}>scenenearbysupport@gmail.com</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: 40 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  errorText: { fontSize: 18, color: theme.colors.textSecondary },
  hero: { height: 360, justifyContent: 'flex-end', paddingBottom: 20, position: 'relative', overflow: 'hidden' },
  heroContent: { paddingHorizontal: 20, position: 'relative', zIndex: 2 },
  heroGradientOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    opacity: 0.12,
  },
  showName: { fontSize: 16, fontWeight: '700', color: theme.colors.gold, marginBottom: 4 },
  locationTitle: { fontSize: 26, fontWeight: '700', color: theme.colors.white, marginBottom: 12 },
  badges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  yearBadge: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: theme.colors.surface3 + 'CC', borderRadius: 8 },
  yearText: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '500' },
  distanceBadge: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: theme.colors.surface3 + 'CC', borderRadius: 8 },
  distanceText: { fontSize: 12, color: theme.colors.gold, fontWeight: '500' },
  ratingSection: { paddingHorizontal: 20, paddingTop: 20 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  ratingAverage: { fontSize: 22, fontWeight: '700', color: theme.colors.gold },
  ratingCount: { fontSize: 13, color: theme.colors.textTertiary },
  ratePrompt: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 4 },
  section: { paddingHorizontal: 20, paddingTop: 24 },
  compactSection: { paddingHorizontal: 20, paddingTop: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 10 },
  bodyText: { fontSize: 15, color: theme.colors.textSecondary, lineHeight: 24 },
  emptyStateText: { fontSize: 15, color: theme.colors.textTertiary, lineHeight: 24, fontStyle: 'italic' },
  uploadPill: {
    marginTop: 12,
    backgroundColor: 'rgba(245,197,24,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245,197,24,0.3)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  uploadPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(245,197,24,0.9)',
    letterSpacing: 0.2,
  },
  coords: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 6, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  quoteSection: { marginHorizontal: 20, marginTop: 24, padding: 20, backgroundColor: theme.colors.surface, borderRadius: 16, borderLeftWidth: 3, borderLeftColor: theme.colors.gold },
  quoteIcon: { fontSize: 20, marginBottom: 8 },
  quoteText: { fontSize: 17, fontStyle: 'italic', color: theme.colors.textPrimary, lineHeight: 26 },
  quoteAttr: { fontSize: 13, color: theme.colors.textTertiary, marginTop: 8 },
  actions: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 28, gap: 10 },
  primaryButton: { flex: 1, backgroundColor: theme.colors.gold, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  primaryButtonText: { color: theme.colors.black, fontWeight: '700', fontSize: 12 },
  secondaryButton: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: theme.colors.surface3, borderWidth: 1, borderColor: 'transparent' },
  secondaryButtonText: { color: theme.colors.gold, fontWeight: '600', fontSize: 12 },
  savedButton: { backgroundColor: theme.colors.gold + '20', borderColor: theme.colors.gold },
  savedButtonText: { color: theme.colors.gold },
  supportSection: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.surface3 + '40',
    marginTop: 12,
  },
  supportTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.textTertiary, marginBottom: 12 },
  supportLink: { paddingVertical: 8 },
  supportLinkText: { fontSize: 13, color: theme.colors.textTertiary, textDecorationLine: 'underline' },
  supportFooter: { fontSize: 11, color: theme.colors.textTertiary + '60', marginTop: 12 },

  remoteWarningSection: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 14,
    backgroundColor: "#F5C5180c",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F5C51830",
  },
});
