import React, { useState, useEffect } from 'react';
import { StatusBar, Text, View, StyleSheet } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { SplashScreen } from './src/screens/Splash/SplashScreen';
import { OnboardingScreen } from './src/screens/Onboarding/OnboardingScreen';
import { LocationSetupScreen } from './src/screens/Onboarding/LocationSetupScreen';
import { AuthProvider } from './src/context/AuthContext';
import { UserLocationProvider } from './src/context/UserLocationContext';
import { useMagicLink } from './src/hooks/useMagicLink';
import './src/tasks/backgroundLocation'; // registers background location task
import { theme } from './src/theme';
import {
  getOnboardingComplete,
  setOnboardingComplete,
  getOnboardingData,
  setOnboardingData,
  resetOnboarding as resetStorageOnboarding,
} from './src/services/StorageService';

// ── Module-level safety net: if JS loads but React never mounts ──
// (e.g. a crash during component render), this timeout fires
// independently and dismisses the native splash so the user isn't
// trapped behind it forever. Set BEFORE preventAutoHideAsync so the
// native splash has a guaranteed escape hatch.
let _splashHidden = false;
const _forceHideSplash = () => {
  if (!_splashHidden) {
    _splashHidden = true;
    ExpoSplashScreen.hideAsync();
  }
};
setTimeout(_forceHideSplash, 10000);

// ── Prevent auto-hide: we'll dismiss when React is ready ──
// Wrapped in an IIFE so a failure here doesn't crash the module.
(function () {
  try {
    ExpoSplashScreen.preventAutoHideAsync();
  } catch (_) {
    // If this fails, the native splash will auto-hide on first frame.
    // That's a minor visual glitch — not a hang.
  }
})();

export const resetOnboarding = async () => {
  await resetStorageOnboarding();
};

/** Inner component — mounts useMagicLink inside AuthProvider context */
const MagicLinkListener: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useMagicLink();
  return <>{children}</>;
};

type InitStep =
  | 'module-loaded'
  | 'component-mounted'
  | 'storage-read'
  | 'phase-set'
  | 'splash-hidden'
  | 'error';

const App: React.FC = () => {
  const [appPhase, setAppPhase] = useState<'loading' | 'splash' | 'onboarding' | 'locationSetup' | 'main'>('loading');
  const [onboardingResult, setOnboardingResult] = useState<any>(null);
  const [initStep, setInitStep] = useState<InitStep>('module-loaded');
  const [initError, setInitError] = useState<string | null>(null);

  // ── Notification setup ──
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    (async () => {
      try {
        await Notifications.requestPermissionsAsync();
      } catch (_) {}
    })();
  }, []);

  // ── Startup init ──
  useEffect(() => {
    setInitStep('component-mounted');
    let resolved = false;

    // Per-effect safety: force-hide native splash after 8s if we
    // haven't resolved yet. Redundant with the module-level 10s
    // timeout, but covers the case where this effect hangs.
    const timeout = setTimeout(() => {
      if (!resolved) {
        _forceHideSplash();
      }
    }, 8000);

    (async () => {
      try {
        const complete = await getOnboardingComplete();
        setInitStep('storage-read');

        if (complete) {
          const data = await getOnboardingData();
          setOnboardingResult(data);
          setAppPhase('main');
        } else {
          setAppPhase('splash');
        }
        setInitStep('phase-set');
      } catch (err: any) {
        setInitStep('error');
        setInitError(err?.message || String(err));
        setAppPhase('splash');
      } finally {
        resolved = true;
        clearTimeout(timeout);
        try {
          await ExpoSplashScreen.hideAsync();
          _splashHidden = true;
          setInitStep('splash-hidden');
        } catch (_) {}
      }
    })();

    return () => {
      resolved = true;
      clearTimeout(timeout);
    };
  }, []);

  const handleSplashFinish = () => {
    setAppPhase('onboarding');
  };

  const handleOnboardingComplete = async (data: any) => {
    setOnboardingResult(data);
    setAppPhase('locationSetup');
  };

  const handleLocationSetupComplete = async (locationData: { activeCity: string; activeCityLat: number; activeCityLng: number }) => {
    const fullData = { ...onboardingResult, ...locationData };
    await setOnboardingData(fullData);
    await setOnboardingComplete(true);
    setAppPhase('main');
  };

  // ── Loading phase with debug indicator ──
  if (appPhase === 'loading') {
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <SafeAreaProvider>
          <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
          {/* Debug: tiny text at bottom to prove JS loaded and which step we reached */}
          <View style={debugStyles.container}>
            <Text style={debugStyles.text}>init: {initStep}</Text>
            {initError ? <Text style={debugStyles.error}>err: {initError}</Text> : null}
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  if (appPhase === 'splash') {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
          <SplashScreen onFinish={handleSplashFinish} />
          {/* Debug overlay on splash too, so we can tell it's our JS splash */}
          <View style={debugStyles.container}>
            <Text style={debugStyles.text}>splash-js | {initStep}</Text>
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  if (appPhase === 'onboarding') {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
          <OnboardingScreen onComplete={handleOnboardingComplete} />
          <View style={debugStyles.container}>
            <Text style={debugStyles.text}>onboarding-js</Text>
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  if (appPhase === 'locationSetup') {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
          <LocationSetupScreen
            onboardingData={onboardingResult}
            onComplete={handleLocationSetupComplete}
          />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
        <AuthProvider>
          <UserLocationProvider>
            <MagicLinkListener>
              <AppNavigator />
            </MagicLinkListener>
          </UserLocationProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const debugStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  text: {
    color: '#555',
    fontSize: 10,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  error: {
    color: '#e55',
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 2,
  },
});

export default App;
