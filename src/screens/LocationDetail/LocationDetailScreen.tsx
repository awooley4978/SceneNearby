import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Linking,
  Share,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../theme';
import { locationById, photosByLocation, calculateDistance } from '../../data/sampleData';
import { STORAGE_KEYS, defaultUserSettings, communityPhotoToGallery } from '../../models';
import { getUserSettings, setUserSettings } from '../../services/StorageService';
import { useSaved } from '../../context/SavedContext';
import { useUserLocation } from '../../hooks/useUserLocation';
import { MapPlaceholder } from '../../components/MapPlaceholder';
import { SmartHeroImage } from '../../components/SmartHeroImage';
import { RatingSection } from '../../components/RatingSection';
import { WorthTheVisit } from '../../components/WorthTheVisit';
import { EstimatedVisitTime } from '../../components/EstimatedVisitTime';
import { VisitorTips } from '../../components/VisitorTips';
import { RemoteDestinationBadge } from '../../components/RemoteDestinationBadge';
import { LocationPhotoGallery, GalleryPhoto } from '../../components/LocationPhotoGallery';
import { SectionCard } from '../../components/SectionCard';
import { SpotlightOverlay, LocationFrame, BrandDivider } from '../../components/BrandElements';
import { logLocationViewed, logLocationSaved, logLocationUnsaved, logLocationNavigate, logLocationShared, logUserRating } from '../../services/analytics';

const HERO_HEIGHT = 420;

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

    const canOpenGoogleMaps = await Linking.canOpenURL('comgooglemaps://');
    const canOpenWaze = await Linking.canOpenURL('waze://');
    const canOpenAppleMaps = await Linking.canOpenURL('maps://');

    const settings = await getUserSettings(defaultUserSettings);
    const pref = settings.navApp;

    const openApp = (app: string) => {
      if (app === 'googlemaps') Linking.openURL(canOpenGoogleMaps ? googleMapsUrl : googleMapsFallback);
      else if (app === 'applemaps') Linking.openURL(appleMapsUrl);
      else if (app === 'waze') Linking.openURL(canOpenWaze ? wazeUrl : wazeFallback);
    };

    if (pref && (
      (pref === 'googlemaps' && canOpenGoogleMaps) ||
      (pref === 'applemaps' && canOpenAppleMaps) ||
      (pref === 'waze' && canOpenWaze)
    )) {
      logLocationNavigate({ locationId: location.id, appName: pref });
      openApp(pref);
      return;
    }

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
        setUserSettings({ ...settings, navApp: o.app });
      }),
      ...(pref ? [() => {
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
      '--- Location ---%0D%0A' + `${location.title}%0D%0A%0D%0A` +
      '--- Movie/TV ---%0D%0A' + `${location.movieOrShow}%0D%0A%0D%0A` +
      '--- City ---%0D%0A' + `${location.city}, ${location.country}%0D%0A%0D%0A` +
      '--- Location ID ---%0D%0A' + `${location.id}%0D%0A%0D%0A` +
      '--- Issue ---%0D%0A(e.g. Incorrect location, Incorrect photo, Duplicate location, Closed location)%0D%0A%0D%0A' +
      '--- Details ---%0D%0A%0D%0A%0D%0A--- Supporting source (optional) ---%0D%0A%0D%0A%0D%0A' +
      'Thank you for helping keep Scene Nearby accurate!'
    );
    Linking.openURL(`mailto:scenenearbysupport@gmail.com?subject=${subject}&body=${body}`).catch(() => {
      Alert.alert('Error', 'Could not open email app. Please contact scenenearbysupport@gmail.com directly.');
    });
  };

  const handleContentRequest = () => {
    const subject = encodeURIComponent('Content Request');
    const body = encodeURIComponent(
      'Hello Scene Nearby Team,%0D%0A%0D%0A' +
      'I would like to suggest adding a new filming location.%0D%0A%0D%0A' +
      '--- Location ---%0D%0A%0D%0A%0D%0A--- Movie/TV Show ---%0D%0A%0D%0A%0D%0A' +
      '--- City / Country ---%0D%0A%0D%0A%0D%0A--- Scene Description ---%0D%0A%0D%0A%0D%0A' +
      '--- Why it should be featured ---%0D%0A%0D%0A%0D%0A--- Supporting source (link) ---%0D%0A%0D%0A%0D%0A' +
      'Thank you for considering my request!'
    );
    Linking.openURL(`mailto:scenenearbysupport@gmail.com?subject=${subject}&body=${body}`).catch(() => {
      Alert.alert('Error', 'Could not open email app. Please contact scenenearbysupport@gmail.com directly.');
    });
  };

  const handleFeatureSuggestion = () => {
    const subject = encodeURIComponent('Feature Suggestion');
    const body = encodeURIComponent(
      'Hello Scene Nearby Team,%0D%0A%0D%0A' +
      'I have an idea for a feature!%0D%0A%0D%0A' +
      '--- Feature Description ---%0D%0A%0D%0A%0D%0A--- How it would work ---%0D%0A%0D%0A%0D%0A' +
      '--- Why it would be useful ---%0D%0A%0D%0A%0D%0A' +
      'Thank you for making Scene Nearby better!'
    );
    Linking.openURL(`mailto:scenenearbysupport@gmail.com?subject=${subject}&body=${body}`).catch(() => {
      Alert.alert('Error', 'Could not open email app. Please contact scenenearbysupport@gmail.com directly.');
    });
  };

  const handleBugReport = () => {
    const subject = encodeURIComponent('Bug Report');
    const body = encodeURIComponent(
      'Hello Scene Nearby Team,%0D%0A%0D%0A' +
      'I encountered a bug while using the app.%0D%0A%0D%0A' +
      '--- What happened ---%0D%0A%0D%0A%0D%0A--- Steps to reproduce ---%0D%0A%0D%0A%0D%0A' +
      '--- What I expected to happen ---%0D%0A%0D%0A%0D%0A--- Device / OS ---%0D%0A%0D%0A%0D%0A' +
      '--- App version ---%0D%0A1.0.0%0D%0A%0D%0A' +
      'Thank you for your help!'
    );
    Linking.openURL(`mailto:scenenearbysupport@gmail.com?subject=${subject}&body=${body}`).catch(() => {
      Alert.alert('Error', 'Could not open email app. Please contact scenenearbysupport@gmail.com directly.');
    });
  };

  // ── Static hero — no parallax ──

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <View style={styles.heroImageWrap}>
            {location.imageUrl && !imageError ? (
              <SmartHeroImage
                imageUrl={location.imageUrl}
                focalPoint={location.focalPoint}
                onError={() => setImageError(true)}
              />
            ) : (
              <MapPlaceholder locationId={location.id} locationName={location.title} hasPhotos={galleryPhotos.length > 0} />
            )}
          </View>

          {/* Spotlight glow — follows image focal point */}
          <SpotlightOverlay
            focalPoint={location.focalPoint ?? { x: 0.5, y: 0.4 }}
            intensity={0.04}
          />

          {/* Gradient overlay: dark at bottom, fading into page */}
          <View style={styles.heroOverlay}>
            <LinearGradient
              colors={['transparent', 'rgba(10,10,10,0.4)', theme.colors.background]}
              locations={[0, 0.45, 1]}
              style={StyleSheet.absoluteFill}
            />
          </View>

          {/* Corner brackets — featured-location frame */}
          <LocationFrame />

          {/* Hero content */}
          <View style={styles.heroContent}>
            <Pressable onPress={handleViewMovie} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
              <Text style={styles.showName}>{location.movieOrShow}</Text>
            </Pressable>
            <Text style={styles.locationTitle}>{location.title}</Text>
          </View>

          {/* Clean metadata row — dark strip at hero bottom */}
          <View style={styles.metadataStrip}>
            <Text style={styles.metadataRow}>
              <Text style={styles.metadataItem}>{location.category}</Text>
              <Text style={styles.metadataSep}>  •  </Text>
              <Text style={styles.metadataItem}>{location.year}</Text>
              {distanceFromUser !== undefined && (
                <>
                  <Text style={styles.metadataSep}>  •  </Text>
                  <Text style={styles.metadataDistance}>
                    {distanceFromUser < 1
                      ? `${(distanceFromUser * 5280).toFixed(0)} ft`
                      : `${distanceFromUser.toFixed(1)} mi`}
                  </Text>
                </>
              )}
            </Text>
          </View>
        </View>

        {/* ── Cards — staggered fade-in cascade ── */}

        {/* Ratings */}
        <SectionCard fadeDelay={80}>
          <RatingSection googleRating={location.googleRating} placeId={location.googleRating?.placeId} />
        </SectionCard>

        {/* Remote Destination Warning */}
        {location.remoteDestination && (
          <RemoteDestinationBadge info={location.remoteDestination} />
        )}

        {/* Worth the Visit */}
        <SectionCard icon="⭐" title="Worth the Visit" fadeDelay={120}>
          <WorthTheVisit
            percentage={location.worthItPercentage}
            votes={location.worthItVotes}
            locationId={location.id}
          />
        </SectionCard>

        {/* Estimated Visit Time */}
        <SectionCard icon="⏱️" title="Visit Time" fadeDelay={160}>
          <EstimatedVisitTime time={location.estimatedVisitTime} locationId={location.id} />
        </SectionCard>

        {/* What Happened Here — story variant */}
        <SectionCard icon="🎬" title="What Happened Here" variant="story" fadeDelay={200}>
          <Text style={styles.storyText}>{location.sceneDescription}</Text>
        </SectionCard>

        {/* Iconic Quote — quote variant */}
        {location.quote && (
          <SectionCard title="Iconic Quote" variant="quote" fadeDelay={240}>
            <Text style={styles.quoteText}>"{location.quote}"</Text>
            {location.quoteAttribution && (
              <Text style={styles.quoteAttr}>— {location.quoteAttribution}</Text>
            )}
          </SectionCard>
        )}

        {/* Then & Now — fact variant */}
        {location.thenAndNow && (
          <SectionCard icon="📸" title="Then & Now" variant="fact" fadeDelay={280}>
            <Text style={styles.bodyText}>{location.thenAndNow}</Text>
          </SectionCard>
        )}

        {/* Did You Know? — trivia variant */}
        <SectionCard icon="✨" title="Did You Know?" variant="trivia" fadeDelay={320}>
          <Text style={styles.bodyText}>{location.funFact}</Text>
        </SectionCard>

        {/* Community Photos — gallery variant */}
        <SectionCard icon="📷" title="Community Photos" variant="gallery" fadeDelay={360}>
          {galleryPhotos.length > 0 ? (
            <LocationPhotoGallery photos={galleryPhotos} showAddButton={false} />
          ) : (
            <View style={styles.emptyCommunity}>
              <Text style={styles.emptyCommunityIcon}>🎬</Text>
              <Text style={styles.emptyCommunityTitle}>Be the first visitor to recreate this scene</Text>
              <Text style={styles.emptyCommunitySub}>
                Snap a photo from the same angle and share your moment with fellow film lovers.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.uploadPill, pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }]}
                onPress={() => navigation.navigate('Upload', { locationId: location.id, locationName: location.title })}
              >
                <Text style={styles.uploadPillText}>📸 Upload your photo</Text>
              </Pressable>
            </View>
          )}
        </SectionCard>

        {/* Visitor Tips */}
        {location && (
          <SectionCard icon="💡" title="Visitor Tips" fadeDelay={400}>
            <VisitorTips locationId={location.id} estimatedVisitTime={location.estimatedVisitTime} />
          </SectionCard>
        )}

        {/* Location info */}
        <SectionCard icon="📍" title="Location" elevated fadeDelay={440}>
          <Text style={styles.bodyText}>{location.address}</Text>
          <Text style={styles.bodyText}>{location.city}, {location.country}</Text>
          <Text style={styles.coords}>
            {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
          </Text>
        </SectionCard>

        {/* Actions — Pressable with scale */}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
            onPress={handleNavigate}
          >
            <Text style={styles.primaryButtonText}>🗺️ Directions</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              saved && styles.savedButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleSave}
          >
            <Text style={[styles.secondaryButtonText, saved && styles.savedButtonText]}>
              {saved ? '✅ Saved' : '💾 Save'}
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
            onPress={handleShare}
          >
            <Text style={styles.secondaryButtonText}>📤 Share</Text>
          </Pressable>
        </View>

        <BrandDivider opacity={0.08} />

        {/* Support section */}
        <SectionCard fadeDelay={480}>
          <Text style={styles.supportTitle}>📬 Support</Text>
          <View style={styles.supportLinks}>
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
          </View>
          <Text style={styles.supportFooter}>scenenearbysupport@gmail.com</Text>
        </SectionCard>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flex: 1 },
  content: { paddingBottom: 40 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  errorText: { fontSize: 18, color: theme.colors.textSecondary },

  // ── Hero ──
  hero: { height: HERO_HEIGHT, justifyContent: 'flex-end', overflow: 'hidden', position: 'relative' },
  heroImageWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  heroContent: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    position: 'relative',
    zIndex: 3,
  },
  showName: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.gold,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  locationTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.white,
    marginBottom: 16,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },

  // ── Metadata strip ──
  metadataStrip: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 4,
  },
  metadataRow: {
    textAlign: 'center',
  },
  metadataItem: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.70)',
    letterSpacing: 0.2,
  },
  metadataSep: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.25)',
  },
  metadataDistance: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.90)',
    letterSpacing: 0.2,
  },

  // ── Chips row (unused — retained for MetadataToken elsewhere) ──
  chips: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    alignItems: 'center',
  },

  // ── Story text (larger, more spaced) ──
  storyText: {
    fontSize: 17,
    color: theme.colors.textSecondary,
    lineHeight: 28,
    letterSpacing: 0.1,
  },

  // ── Body text ──
  bodyText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },

  // ── Quote ──
  quoteText: {
    fontSize: 20,
    fontStyle: 'italic',
    color: theme.colors.textPrimary,
    lineHeight: 30,
    marginTop: 4,
  },
  quoteAttr: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    marginTop: 10,
    fontWeight: '500',
  },

  // ── Empty Community ──
  emptyCommunity: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  emptyCommunityIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyCommunityTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyCommunitySub: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  uploadPill: {
    backgroundColor: 'rgba(245,197,24,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,197,24,0.30)',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  uploadPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.gold,
    letterSpacing: 0.2,
  },

  // ── Coords ──
  coords: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // ── Actions ──
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 28,
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: theme.colors.gold,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: theme.colors.black,
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: theme.colors.surface3,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  secondaryButtonText: {
    color: theme.colors.gold,
    fontWeight: '600',
    fontSize: 14,
  },
  savedButton: {
    backgroundColor: theme.colors.gold + '20',
    borderColor: theme.colors.gold,
  },
  savedButtonText: {
    color: theme.colors.gold,
  },
  buttonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.85,
  },

  // ── Support ──
  supportLinks: {
    alignItems: 'center',
  },
  supportTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textTertiary,
    marginBottom: 12,
    textAlign: 'center',
  },
  supportLink: { paddingVertical: 8 },
  supportLinkText: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    textDecorationLine: 'underline',
  },
  supportFooter: {
    fontSize: 11,
    color: theme.colors.textTertiary + '60',
    marginTop: 12,
    textAlign: 'center',
  },

  remoteWarningSection: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 14,
    backgroundColor: '#F5C5180c',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F5C51830',
  },
});
