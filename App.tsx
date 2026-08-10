import React, { useState, useEffect } from 'react';
import { StatusBar } from 'react-native';
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

// Prevent native splash screen from auto-hiding — we control it
// based on startup initialization completing.
ExpoSplashScreen.preventAutoHideAsync();

export const resetOnboarding = async () => {
  await resetStorageOnboarding();
};

/** Inner component — mounts useMagicLink inside AuthProvider context */
const MagicLinkListener: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useMagicLink();
  return <>{children}</>;
};

const App: React.FC = () => {
  const [appPhase, setAppPhase] = useState<'loading' | 'splash' | 'onboarding' | 'locationSetup' | 'main'>('loading');
  const [onboardingResult, setOnboardingResult] = useState<any>(null);

  // ── Notification setup ──
  useEffect(() => {
    // Show notifications while app is in the foreground
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    // Request permission
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('[Notifications] Permission not granted');
      }
    })();
  }, []);

  useEffect(() => {
    let resolved = false;

    // Safety timeout: if the async init hangs for any reason, force-
    // dismiss the native splash after 8s so the user isn't stuck forever.
    const timeout = setTimeout(() => {
      if (!resolved) {
        ExpoSplashScreen.hideAsync();
      }
    }, 8000);

    (async () => {
      try {
        const complete = await getOnboardingComplete();
        if (complete) {
          const data = await getOnboardingData();
          setOnboardingResult(data);
          setAppPhase('main');
        } else {
          setAppPhase('splash');
        }
      } catch {
        // Even if storage fails, show the splash — don't lock the user out.
        setAppPhase('splash');
      } finally {
        resolved = true;
        clearTimeout(timeout);
        ExpoSplashScreen.hideAsync();
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

  if (appPhase === 'loading') {
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <SafeAreaProvider>
          <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
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

export default App;