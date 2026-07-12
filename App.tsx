import React, { useState, useEffect } from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { SplashScreen } from './src/screens/Splash/SplashScreen';
import { OnboardingScreen } from './src/screens/Onboarding/OnboardingScreen';
import { LocationSetupScreen } from './src/screens/Onboarding/LocationSetupScreen';
import { theme } from './src/theme';
import {
  getOnboardingComplete,
  setOnboardingComplete,
  getOnboardingData,
  setOnboardingData,
  resetOnboarding as resetStorageOnboarding,
} from './src/services/StorageService';

export const resetOnboarding = async () => {
  await resetStorageOnboarding();
};

const App: React.FC = () => {
  const [appPhase, setAppPhase] = useState<'loading' | 'splash' | 'onboarding' | 'locationSetup' | 'main'>('loading');
  const [onboardingResult, setOnboardingResult] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const complete = await getOnboardingComplete();
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
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;