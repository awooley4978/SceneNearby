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

type Step = 'signIn' | 'sent' | 'welcome' | 'error' | 'needEmail';

const RESEND_COOLDOWN_MS = 5_000;

export const AuthScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, sendMagicLink, magicLinkState, resetMagicLinkState } = useAuth();
  const [email, setEmail] = useState('');
  const [needEmailInput, setNeedEmailInput] = useState('');
  const [step, setStep] = useState<Step>('signIn');
  const [errorMessage, setErrorMessage] = useState('');
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [resendCooldown, setResendCooldown] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const welcomeAnim = useRef(new Animated.Value(0)).current;
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown > 0) {
      cooldownRef.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            if (cooldownRef.current) clearInterval(cooldownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (cooldownRef.current) clearInterval(cooldownRef.current);
      };
    }
  }, [resendCooldown > 0]);

  // Watch magicLinkState: only advance to 'sent' when the API confirms success
  useEffect(() => {
    if (magicLinkState.status === 'sent') {
      setStep('sent');
    } else if (magicLinkState.status === 'needEmail') {
      // Email wasn't stored — prompt user to re-enter it
      setErrorMessage(magicLinkState.error || 'Please enter your email to complete sign-in.');
      setStep('needEmail');
    } else if (magicLinkState.status === 'error' || magicLinkState.status === 'invalid') {
      const isVerifying = step === 'sent'; // deep-link verification error
      setErrorMessage(
        magicLinkState.error ||
          (isVerifying
            ? 'Could not verify sign-in link.'
            : 'Could not send link. Check your email and try again.')
      );
      setStep('error');
    }
  }, [magicLinkState.status, magicLinkState.error]);

  const handleSendLink = useCallback(async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setErrorMessage('');
    await sendMagicLink(trimmed);
    // Don't setStep here — the useEffect above watches magicLinkState.status
  }, [email, sendMagicLink]);

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0 || resendStatus === 'sending') return;
    setResendStatus('sending');
    setErrorMessage('');
    try {
      await sendMagicLink(email.trim());
      setResendStatus('sent');
      setResendCooldown(RESEND_COOLDOWN_MS / 1000);
      // Auto-clear "New link sent" after 3 seconds
      setTimeout(() => setResendStatus('idle'), 3000);
    } catch {
      setResendStatus('error');
      setTimeout(() => setResendStatus('idle'), 3000);
    }
  }, [email, sendMagicLink, resendCooldown, resendStatus]);

  const handleNeedEmailSubmit = useCallback(async () => {
    const trimmed = needEmailInput.trim();
    if (!trimmed) return;
    await sendMagicLink(trimmed);
  }, [needEmailInput, sendMagicLink]);

  const handleGoBack = useCallback(() => {
    resetMagicLinkState();
    setEmail('');
    setStep('signIn');
    setErrorMessage('');
    setResendStatus('idle');
    setResendCooldown(0);
  }, [resetMagicLinkState]);

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

          {magicLinkState.status === 'error' && (
            <Text style={styles.inlineError}>{magicLinkState.error}</Text>
          )}
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
          <Text style={styles.emailHighlight}>{magicLinkState.email || email.trim()}</Text>.
        </Text>
        <Text style={styles.expiryNote}>It expires in 15 minutes.</Text>

        <TouchableOpacity
          onPress={handleResend}
          style={styles.linkButton}
          disabled={resendCooldown > 0 || resendStatus === 'sending'}
        >
          {resendStatus === 'sending' ? (
            <ActivityIndicator size="small" color={theme.colors.gold} />
          ) : (
            <Text style={[styles.resendText, resendCooldown > 0 && styles.resendTextMuted]}>
              {resendCooldown > 0 ? `Resend Link (${resendCooldown}s)` : 'Resend Link'}
            </Text>
          )}
        </TouchableOpacity>

        {resendStatus === 'sent' && (
          <Text style={styles.resendConfirmation}>✓ New link sent</Text>
        )}
        {resendStatus === 'error' && (
          <Text style={styles.resendError}>Could not resend. Try again.</Text>
        )}

        <TouchableOpacity onPress={handleGoBack} style={styles.linkButton}>
          <Text style={styles.goBackText}>Wrong email? Go back</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // ── Need Email state ──
  if (step === 'needEmail') {
    return (
      <Animated.View style={[styles.container, styles.centered, { opacity: fadeAnim }]}>
        <Text style={styles.heroEmoji}>📧</Text>
        <Text style={styles.title}>Confirm your email</Text>
        <Text style={styles.errorText}>{errorMessage}</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          placeholderTextColor={theme.colors.textTertiary}
          value={needEmailInput}
          onChangeText={setNeedEmailInput}
          keyboardType="email-address"
          autoCapitalize="none"
          autoFocus
        />
        <TouchableOpacity
          style={[styles.primaryButton, !needEmailInput.trim() && styles.primaryButtonDisabled]}
          onPress={handleNeedEmailSubmit}
          disabled={!needEmailInput.trim()}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleGoBack} style={styles.linkButton}>
          <Text style={styles.goBackText}>Go back</Text>
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
  resendTextMuted: {
    color: theme.colors.textTertiary,
  },
  resendConfirmation: {
    fontSize: 13,
    color: theme.colors.gold,
    marginBottom: 4,
  },
  resendError: {
    fontSize: 13,
    color: theme.colors.error,
    marginBottom: 4,
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
  inlineError: {
    fontSize: 13,
    color: theme.colors.error,
    textAlign: 'center',
    marginTop: 16,
  },
  welcomeCard: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
});
