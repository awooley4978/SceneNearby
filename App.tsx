import React, { useState, useEffect } from 'react';
import { StatusBar, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { SplashScreen } from './src/screens/Splash/SplashScreen';
import { OnboardingScreen } from './src/screens/Onboarding/OnboardingScreen';
import { LocationSetupScreen } from './src/screens/Onboarding/LocationSetupScreen';
import { AuthProvider } from './src/context/AuthContext';
import { useMagicLink } from './src/hooks/useMagicLink';
import { theme } from './src/theme';
import {
  getOnboardingComplete,
  setOnboardingComplete,
  getOnboardingData,
  setOnboardingData,
  resetOnboarding as resetStorageOnboarding,
} from './src/services/StorageService';

// Keep native splash up until the initial JS UI is ready

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

  useEffect(() => {
    (async () => {
      console.log('[STARTUP] useEffect running');
      // SPLASH_BISECT KNOB: force splash for splash-render testing
      const complete = false; // await getOnboardingComplete();
      const nextPhase = complete ? 'main' : 'splash';
      console.log(`[STARTUP] onboarding complete=%s → phase=%s`, complete, nextPhase);
      if (complete) {
        const data = await getOnboardingData();
        setOnboardingResult(data);
        setAppPhase('main');
      } else {
        setAppPhase('splash');
      }
    })();
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

  // ── Debug banner: proves JS UI mounted ──
  const DebugPhaseBanner = ({ phase }: { phase: string }) => (
    <View style={{
      position: 'absolute', bottom: 20, alignSelf: 'center',
      backgroundColor: 'rgba(255,50,50,0.85)', paddingHorizontal: 14,
      paddingVertical: 6, borderRadius: 8, zIndex: 9999,
    }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
        JS MOUNTED — phase: {phase}
      </Text>
    </View>
  );

  if (appPhase === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <SafeAreaProvider>
          <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
          <DebugPhaseBanner phase="loading" />
        </SafeAreaProvider>
      </View>
    );
  }

  if (appPhase === 'splash') {
    return (
      <View style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
          <SplashScreen onFinish={handleSplashFinish} />
          <DebugPhaseBanner phase="splash" />
        </SafeAreaProvider>
      </View>
    );
  }

  if (appPhase === 'onboarding') {
    return (
      <View style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
          <OnboardingScreen onComplete={handleOnboardingComplete} />
          <DebugPhaseBanner phase="onboarding" />
        </SafeAreaProvider>
      </View>
    );
  }

  if (appPhase === 'locationSetup') {
    return (
      <View style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
          <LocationSetupScreen
            onboardingData={onboardingResult}
            onComplete={handleLocationSetupComplete}
          />
          <DebugPhaseBanner phase="locationSetup" />
        </SafeAreaProvider>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
        <AuthProvider>
          <MagicLinkListener>
            <AppNavigator />
          </MagicLinkListener>
        </AuthProvider>
        <DebugPhaseBanner phase="main" />
      </SafeAreaProvider>
    </View>
  );
};

export default App;