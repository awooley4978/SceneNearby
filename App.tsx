import React, { useState, useEffect } from 'react';
import { StatusBar, Text, View, ScrollView, Pressable } from 'react-native';
import { installDiagnostics, setPhase, subscribe, getState } from './src/services/diagnostics';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { SplashScreen } from './src/screens/Splash/SplashScreen';
import { OnboardingScreen } from './src/screens/Onboarding/OnboardingScreen';
import { LocationSetupScreen } from './src/screens/Onboarding/LocationSetupScreen';
import { AuthProvider, useAuth } from './src/context/AuthContext';
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

// Only the owner's/admin's signed-in emails see the on-screen diagnostics UI.
// The tracer itself (installDiagnostics) keeps recording for EVERY user — this
// allowlist only gates which accounts VISUALLY see the overlay. External
// TestFlight testers / anonymous users get nothing.
const DIAG_ADMIN_EMAILS = ['awooley4978@gmail.com', 'scenenearbysupport@gmail.com'];

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
      const complete = await getOnboardingComplete();
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
  // DEV-ONLY. The visible overlay is gated behind __DEV__, so it NEVER renders
  // in production/TestFlight release builds for ANY user (regardless of signed-in
  // email) — a hard removal from release UI, not merely an owner-email gate.
  // Within dev builds it is additionally restricted to the owner/admin allowlist.
  // The tracer itself (installDiagnostics) continues capturing snapshot data for
  // EVERY user in the background — only this on-screen overlay is removed from
  // release builds. (Persisted snapshots still record onboarding-crash data.)
  const DiagnosticsOverlay = () => {
    const { user } = useAuth();
    const isAdmin =
      !!user?.email && DIAG_ADMIN_EMAILS.includes(user.email.toLowerCase());
    const [, forceRender] = useState(0);
    const [expanded, setExpanded] = useState(false);
    const [showRaw, setShowRaw] = useState(false);
    useEffect(() => subscribe(() => forceRender((t) => t + 1)), []);
    if (!__DEV__ || !isAdmin) return null;
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
    if (expanded) {
      return (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(8,8,8,0.97)', zIndex: 99999, paddingTop: 64,
          paddingHorizontal: 12, paddingBottom: 12,
        }}>
          <Pressable
            onPress={() => setExpanded(false)}
            style={{ position: 'absolute', top: 58, right: 16, zIndex: 2 }}
          >
            <Text style={{ color: '#fbbf24', fontSize: 15, fontWeight: '800' }}>✕ CLOSE</Text>
          </Pressable>
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', marginBottom: 8 }}>
            SESSION LOG · JS alive {aliveAgo}s ago · phase {state.phase}
          </Text>
          <ScrollView style={{ flex: 1 }}>
            {/* Previous session (persisted — survives termination) */}
            <Text style={{ color: '#fbbf24', fontWeight: '800', fontSize: 12, marginTop: 4, marginBottom: 4 }}>
              LAST SESSION END (diag_prev_session — readable on every launch)
            </Text>
            {state.lastSessionSnapshot ? (
              <View style={{ borderLeftWidth: 3, borderLeftColor: '#fbbf24', paddingLeft: 8, marginBottom: 12 }}>
                <Text style={{ color: '#fde68a', fontSize: 10, fontFamily: 'monospace', marginBottom: 4 }}>
                  saved {new Date(state.lastSessionSnapshot.t).toLocaleTimeString()} · phase {state.lastSessionSnapshot.phase} · heartbeat {state.lastSessionSnapshot.heartbeat}
                </Text>
                {state.lastSessionSnapshot.events.map((ev, i) => (
                  <Text key={i} style={{ color: '#fde68a', fontSize: 10, fontFamily: 'monospace' }}>• {ev}</Text>
                ))}
                <Pressable onPress={() => setShowRaw((r) => !r)} style={{ marginTop: 4 }}>
                  <Text style={{ color: '#93c5fd', fontSize: 11, fontWeight: '700' }}>
                    {showRaw ? 'HIDE RAW JSON' : 'SHOW RAW JSON'}
                  </Text>
                </Pressable>
                {showRaw && (
                  <Text selectable style={{ color: '#93c5fd', fontSize: 9, fontFamily: 'monospace', marginTop: 4 }}>
                    {JSON.stringify(state.lastSessionSnapshot, null, 2)}
                  </Text>
                )}
              </View>
            ) : (
              <Text style={{ color: '#888', fontSize: 11, marginBottom: 12 }}>No previous-session snapshot (first launch on this install).</Text>
            )}
            {/* Live session */}
            <Text style={{ color: '#4ade80', fontWeight: '800', fontSize: 12, marginBottom: 4 }}>
              LIVE ({state.events.length} events)
            </Text>
            {state.events.slice(-40).map((e, i) => (
              <Text key={i} style={{ color: '#ddd', fontSize: 10, fontFamily: 'monospace' }}>
                {new Date(e.t).toLocaleTimeString()} {e.tag}
                {e.detail ? `: ${e.detail}` : ''}
              </Text>
            ))}
            <Text style={{ color: '#555', fontSize: 10, marginTop: 12, marginBottom: 20 }}>
              Tip: the LAST SESSION END block above is the final persisted snapshot from the previous run —
              it shows the last ~10 events before termination. If the app died with no red JS FATAL screen,
              the failure is native-side (freeze/termination), not a catchable JS error.
            </Text>
          </ScrollView>
        </View>
      );
    }
    return (
      <Pressable
        onPress={() => setExpanded(true)}
        style={{
          position: 'absolute', bottom: 20, left: 10, right: 10, alignSelf: 'center',
          backgroundColor: 'rgba(255,50,50,0.85)',
          paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, zIndex: 9999,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
          JS alive {aliveAgo}s ago · phase: {state.phase} · last: {lastEvent ? lastEvent.tag : '-'} · tap for log
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
          {appPhase === 'loading' && null}
          {appPhase === 'splash' && <SplashScreen onFinish={handleSplashFinish} />}
          {appPhase === 'onboarding' && <OnboardingScreen onComplete={handleOnboardingComplete} />}
          {appPhase === 'locationSetup' && (
            <LocationSetupScreen
              onboardingData={onboardingResult}
              onComplete={handleLocationSetupComplete}
            />
          )}
          {appPhase === 'main' && (
            <MagicLinkListener>
              <ErrorBoundary>
                <AppNavigator />
              </ErrorBoundary>
            </MagicLinkListener>
          )}
          <DiagnosticsOverlay />
        </AuthProvider>
      </SafeAreaProvider>
    </View>
  );
};
export default App;
