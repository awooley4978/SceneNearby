import React, { useState, useEffect } from 'react';
import { StatusBar, Text, View, ScrollView, Pressable } from 'react-native';
import { installDiagnostics, setPhase, subscribe, getState } from './src/services/diagnostics';
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

// Diagnostics tracer (diagnostic-only): install before App renders so the
// heartbeat, event log, and fatal overlay cover the whole session.
installDiagnostics();

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
      // SPLASH_BISECT KNOB: force full flow for e2e validation
      const complete = false; // await getOnboardingComplete();
      const nextPhase = complete ? 'main' : 'splash';
      console.log(`[STARTUP] onboarding complete=%s → phase=%s`, complete, nextPhase);
      if (complete) {
        const data = await getOnboardingData();
        setOnboardingResult(data);
        setPhase('main');
        setAppPhase('main');
      } else {
        setPhase('splash');
        setAppPhase('splash');
      }
    })();
  }, []);

  const handleSplashFinish = () => {
    setPhase('onboarding');
    setAppPhase('onboarding');
  };

  const handleOnboardingComplete = async (data: any) => {
    setOnboardingResult(data);
    setPhase('locationSetup');
    setAppPhase('locationSetup');
  };

  const handleLocationSetupComplete = async (locationData: { activeCity: string; activeCityLat: number; activeCityLng: number }) => {
    const fullData = { ...onboardingResult, ...locationData };
    await setOnboardingData(fullData);
    await setOnboardingComplete(true);
    setPhase('main');
    setAppPhase('main');
  };

  // ── Diagnostics overlay: live event log + heartbeat + fatal screen ──
  const DiagnosticsOverlay = () => {
    const [, forceRender] = useState(0);
    const [expanded, setExpanded] = useState(false);
    useEffect(() => subscribe(() => forceRender((t) => t + 1)), []);

    const state = getState();
    const aliveAgo = state.lastHeartbeat
      ? Math.max(0, Math.round((Date.now() - state.lastHeartbeat) / 1000))
      : -1;
    const lastEvent = state.events[state.events.length - 1];

    if (state.fatal) {
      return (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: '#7f1d1d', zIndex: 99999, paddingTop: 90, paddingHorizontal: 20,
        }}>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 8 }}>
            JS FATAL{state.fatal.isFatal ? ' (fatal)' : ''}
          </Text>
          <ScrollView style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 14, marginBottom: 12 }}>{state.fatal.message}</Text>
            {state.fatal.stack ? (
              <Text style={{ color: '#fecaca', fontSize: 11, fontFamily: 'monospace' }}>{state.fatal.stack}</Text>
            ) : null}
          </ScrollView>
        </View>
      );
    }

    return (
      <Pressable
        onPress={() => setExpanded((e) => !e)}
        style={{
          position: 'absolute', bottom: 20, left: 10, right: 10, alignSelf: 'center',
          backgroundColor: expanded ? 'rgba(20,20,20,0.96)' : 'rgba(255,50,50,0.85)',
          paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, zIndex: 9999,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
          JS alive {aliveAgo}s ago · phase: {state.phase} · last: {lastEvent ? lastEvent.tag : '-'}
        </Text>
        {expanded && (
          <View style={{ marginTop: 8, maxHeight: 260 }}>
            {state.lastSessionSnapshot ? (
              <View style={{ marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#555', paddingBottom: 6 }}>
                <Text style={{ color: '#fbbf24', fontWeight: '800', fontSize: 11 }}>
                  LAST SESSION END ({new Date(state.lastSessionSnapshot.t).toLocaleTimeString()} · phase{' '}
                  {state.lastSessionSnapshot.phase} · events {state.lastSessionSnapshot.events.length})
                </Text>
                <Text style={{ color: '#fde68a', fontSize: 10, fontFamily: 'monospace' }}>
                  {state.lastSessionSnapshot.events.join(' → ')}
                </Text>
              </View>
            ) : (
              <Text style={{ color: '#888', fontSize: 11, marginBottom: 6 }}>No previous-session snapshot.</Text>
            )}
            <ScrollView>
              {state.events.slice(-30).map((e, i) => (
                <Text key={i} style={{ color: '#ddd', fontSize: 10, fontFamily: 'monospace' }}>
                  {new Date(e.t).toLocaleTimeString()} {e.tag}
                  {e.detail ? `: ${e.detail}` : ''}
                </Text>
              ))}
            </ScrollView>
          </View>
        )}
      </Pressable>
    );
  };

  if (appPhase === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <SafeAreaProvider>
          <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
          <DiagnosticsOverlay />
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
          <DiagnosticsOverlay />
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
          <DiagnosticsOverlay />
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
          <DiagnosticsOverlay />
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
        <DiagnosticsOverlay />
      </SafeAreaProvider>
    </View>
  );
};

export default App;