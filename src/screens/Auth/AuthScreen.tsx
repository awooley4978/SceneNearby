import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { theme } from '../../theme';
import { useAuth } from '../../context/AuthContext';

type Step = 'signIn' | 'sent' | 'welcome' | 'error';

export const AuthScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, sendMagicLink, magicLinkState, resetMagicLinkState } = useAuth();
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<Step>('signIn');
  const [errorMessage, setErrorMessage] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const welcomeAnim = useRef(new Animated.Value(0)).current;

  // If already signed in, jump to welcome
  useEffect(() => {
    if (user) {
      setStep('welcome');
    }
  }, []);

  // Watch for sign-in completion (from deep link)
  useEffect(() => {
    if (user && step === 'sent') {
      setStep('welcome');
    }
  }, [user, step]);

  // Animate on step change
  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [step]);

  // Welcome screen auto-dismiss
  useEffect(() => {
    if (step === 'welcome') {
      Animated.spring(welcomeAnim, {
        toValue: 1,
        damping: 12,
        stiffness: 150,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        navigation.goBack();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleSendLink = useCallback(async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setErrorMessage('');
    await sendMagicLink(trimmed);
    setStep('sent');
  }, [email, sendMagicLink]);

  const handleResend = useCallback(async () => {
    await sendMagicLink(email.trim());
  }, [email, sendMagicLink]);

  const handleGoBack = useCallback(() => {
    resetMagicLinkState();
    setEmail('');
    setStep('signIn');
    setErrorMessage('');
  }, [resetMagicLinkState]);

  // Watch for link verification errors from context
  useEffect(() => {
    if (magicLinkState.status === 'invalid') {
      setErrorMessage(magicLinkState.error || 'This sign-in link has expired. Please request a new one.');
      setStep('error');
    } else if (magicLinkState.status === 'error' && step !== 'signIn') {
      setErrorMessage(magicLinkState.error || 'Could not verify sign-in link.');
      setStep('error');
    }
  }, [magicLinkState.status]);

  // ── Step 1: Welcome / Sign In ──
  if (step === 'signIn') {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>
          <Text style={styles.heroEmoji}>🎬</Text>
          <Text style={styles.title}>Sign in to Scene Nearby</Text>
          <Text style={styles.subtitle}>
            Save your discoveries, photos, and progress across devices.
          </Text>

          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="you@email.com"
            placeholderTextColor={theme.colors.textTertiary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="send"
            onSubmitEditing={handleSendLink}
          />

          <TouchableOpacity
            style={[styles.button, !email.trim() && styles.buttonDisabled]}
            onPress={handleSendLink}
            disabled={!email.trim() || magicLinkState.status === 'sending'}
            activeOpacity={0.8}
          >
            {magicLinkState.status === 'sending' ? (
              <ActivityIndicator size="small" color={theme.colors.black} />
            ) : (
              <Text style={styles.buttonText}>🟡 Send Magic Link</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    );
  }

  // ── Step 2: Check Email ──
  if (step === 'sent') {
    return (
      <Animated.View style={[styles.container, styles.centered, { opacity: fadeAnim }]}>
        <Text style={styles.heroEmoji}>📬</Text>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          We sent a secure sign-in link to{' '}
          <Text style={styles.emailHighlight}>{email.trim()}</Text>.
        </Text>
        <Text style={styles.expiryNote}>It expires in 15 minutes.</Text>

        <TouchableOpacity onPress={handleResend} style={styles.linkButton}>
          <Text style={styles.resendText}>Resend Link</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleGoBack} style={styles.linkButton}>
          <Text style={styles.goBackText}>Wrong email? Go back</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // ── Error state ──
  if (step === 'error') {
    return (
      <Animated.View style={[styles.container, styles.centered, { opacity: fadeAnim }]}>
        <Text style={styles.heroEmoji}>⚠️</Text>
        <Text style={styles.title}>Sign-in issue</Text>
        <Text style={styles.errorText}>{errorMessage}</Text>

        <TouchableOpacity onPress={handleGoBack} style={styles.linkButton}>
          <Text style={styles.goBackText}>Go back</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // ── Step 3: Welcome Back ──
  return (
    <View style={[styles.container, styles.centered]}>
      <Animated.View
        style={[
          styles.welcomeCard,
          {
            opacity: welcomeAnim,
            transform: [
              {
                scale: welcomeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.heroEmoji}>🎉</Text>
        <Text style={styles.title}>
          Welcome back{user?.displayName ? `, ${user.displayName}` : ''}!
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
  },
  centered: {
    alignItems: 'center',
  },
  inner: {
    paddingHorizontal: 32,
  },
  heroEmoji: {
    fontSize: 56,
    textAlign: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.surface3,
    marginBottom: 20,
  },
  button: {
    backgroundColor: theme.colors.gold,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.black,
  },
  emailHighlight: {
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  expiryNote: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    marginTop: 4,
    marginBottom: 32,
  },
  linkButton: {
    paddingVertical: 10,
  },
  resendText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.gold,
  },
  goBackText: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    textDecorationLine: 'underline',
  },
  errorText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  welcomeCard: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
});
