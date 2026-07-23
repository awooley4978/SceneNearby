import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, Image, Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

const PLACEHOLDER_IMAGE = require('../../assets/missing-photo-placeholder.png');

interface MapPlaceholderProps {
  locationId?: string;
  locationName?: string;
  hasPhotos?: boolean;
}

export const MapPlaceholder: React.FC<MapPlaceholderProps> = ({ locationId, locationName, hasPhotos }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation<any>();

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleUpload = useCallback(() => {
    navigation.navigate('Upload', { locationId, locationName });
  }, [navigation, locationId, locationName]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Image
        source={PLACEHOLDER_IMAGE}
        style={styles.image}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['rgba(6,9,18,0.10)', 'rgba(6,9,18,0.25)']}
        style={styles.overlay}
      />
      <View style={styles.copyContainer}>
        <TouchableOpacity
          style={[styles.pill, hasPhotos && styles.pillWide]}
          onPress={handleUpload}
          activeOpacity={0.7}
        >
          <Text style={[styles.pillText, hasPhotos && styles.pillTextSmall]}>
            {hasPhotos
              ? "Someone already submitted the first photo — we'd still love yours! More angles help future travelers."
              : '📸 Be the first to upload a photo'}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#060912',
    overflow: 'hidden',
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(6,9,18,0.45)',
  },
  copyContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    backgroundColor: 'rgba(245,197,24,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245,197,24,0.3)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(245,197,24,0.9)',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  pillTextSmall: {
    fontSize: 12,
    lineHeight: 18,
  },
  pillWide: {
    maxWidth: '85%',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
});
