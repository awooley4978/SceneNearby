import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../../theme';
import { uploadPhoto } from '../../services/photoService';
import { useAuth } from '../../context/AuthContext';

export const UploadPhotoScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { locationId, locationName } = route.params || {};
  const { user } = useAuth();

  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState<'idle' | 'picking' | 'preview' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Request permissions and pick photo
  const pickPhoto = useCallback(async (useCamera: boolean) => {
    setStatus('picking');
    try {
      const permResult = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permResult.granted) {
        Alert.alert('Permission needed', `Please grant ${useCamera ? 'camera' : 'photo library'} access in Settings.`);
        setStatus('idle');
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.85,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.85,
          });

      if (!result.canceled && result.assets?.length > 0) {
        setPhoto(result.assets[0]);
        setStatus('preview');
      } else {
        setStatus('idle');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to pick image.');
      setStatus('error');
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!photo) return;
    setStatus('uploading');
    setErrorMsg('');

    try {
      const ext = photo.fileName?.split('.').pop() || 'jpg';
      const mimeType = photo.mimeType || `image/${ext === 'png' ? 'png' : 'jpeg'}`;

      await uploadPhoto({
        app_name: 'Scene Nearby',
        location_id: locationId || 'unknown',
        location_name: locationName || 'Unknown location',
        user_info: user?.email || 'anonymous',
        comment: comment.trim() || undefined as any,
        photo: {
          uri: photo.uri,
          type: mimeType,
          fileName: photo.fileName || `photo.${ext}`,
        },
      });

      setStatus('success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Upload failed. Please try again.');
      setStatus('error');
    }
  }, [photo, comment, locationId, locationName, user]);

  const reset = useCallback(() => {
    setPhoto(null);
    setComment('');
    setStatus('idle');
    setErrorMsg('');
  }, []);

  const showPickerSheet = () => {
    Alert.alert('Choose Photo', '', [
      { text: 'Camera', onPress: () => pickPhoto(true) },
      { text: 'Photo Library', onPress: () => pickPhoto(false) },
      { text: 'Cancel', style: 'cancel', onPress: () => setStatus('idle') },
    ]);
  };

  // ── Idle: Show picker options ──
  if (status === 'idle' || status === 'picking') {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.heroEmoji}>📸</Text>
          <Text style={styles.title}>Share a Photo</Text>
          <Text style={styles.subtitle}>
            Help other film fans discover this location.
          </Text>

          {status === 'picking' ? (
            <ActivityIndicator size="large" color={theme.colors.gold} />
          ) : (
            <>
              <TouchableOpacity style={styles.primaryButton} onPress={showPickerSheet}>
                <Text style={styles.primaryButtonText}>Choose Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.linkButton} onPress={() => navigation.goBack()}>
                <Text style={styles.linkText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  // ── Preview: Show selected photo with caption ──
  if (status === 'preview') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Preview</Text>

        {photo && (
          <Image source={{ uri: photo.uri }} style={styles.previewImage} resizeMode="cover" />
        )}

        <Text style={styles.label}>Caption (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="What scene was filmed here?"
          placeholderTextColor={theme.colors.textTertiary}
          value={comment}
          onChangeText={setComment}
          multiline
          maxLength={200}
        />

        <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit}>
          <Text style={styles.primaryButtonText}>Submit Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={reset}>
          <Text style={styles.linkText}>Choose a different photo</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── Uploading ──
  if (status === 'uploading') {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.gold} />
          <Text style={styles.statusText}>Uploading your photo...</Text>
        </View>
      </View>
    );
  }

  // ── Success ──
  if (status === 'success') {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.heroEmoji}>✅</Text>
          <Text style={styles.title}>Thanks!</Text>
          <Text style={styles.subtitle}>
            Your photo is under review. We'll add it to the collection once approved.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Error ──
  return (
    <View style={styles.container}>
      <View style={styles.centered}>
        <Text style={styles.heroEmoji}>⚠️</Text>
        <Text style={styles.title}>Upload failed</Text>
        <Text style={styles.errorText}>{errorMsg || 'Something went wrong.'}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={reset}>
          <Text style={styles.primaryButtonText}>Try again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkButton} onPress={() => navigation.goBack()}>
          <Text style={styles.linkText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  heroEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 8,
    marginTop: 20,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.surface3,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  previewImage: {
    width: '100%',
    height: 260,
    borderRadius: 14,
    backgroundColor: theme.colors.surface2,
  },
  primaryButton: {
    backgroundColor: theme.colors.gold,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginTop: 16,
    minWidth: 200,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.black,
  },
  linkButton: {
    paddingVertical: 12,
  },
  linkText: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    textDecorationLine: 'underline',
  },
  statusText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: 16,
  },
  errorText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
});
