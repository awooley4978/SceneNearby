import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  ONBOARDING_COMPLETE: '@scenenearby/onboarding_complete',
  ONBOARDING_DATA: '@scenenearby/onboarding_data',
  SAVED_IDS: '@scenenearby/saved_ids',
  NOTIFICATION_PREFS: '@scenenearby/notification_prefs',
  USER_SETTINGS: '@scenenearby/settings',
  LAST_CITY: '@scenenearby/last_city',
  VISITED_LOCATIONS: '@scenenearby/visited_locations',
  DISMISSED_LOCATIONS: '@scenenearby/dismissed_locations',
  USER_WORTHIT_VOTE: '@scenenearby/user_worthit_vote',
  USER_VISIT_TIME: '@scenenearby/user_visit_time',
  TRIAL_NOTICE_DISMISSED: '@scenenearby/trial_notice_dismissed',
};

// ── Onboarding ──

export async function getOnboardingComplete(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(KEYS.ONBOARDING_COMPLETE);
    return val === 'true';
  } catch { return false; }
}

export async function setOnboardingComplete(val: boolean): Promise<void> {
  try { await AsyncStorage.setItem(KEYS.ONBOARDING_COMPLETE, String(val)); } catch {}
}

export async function getOnboardingData(): Promise<any> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.ONBOARDING_DATA);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function setOnboardingData(data: any): Promise<void> {
  try { await AsyncStorage.setItem(KEYS.ONBOARDING_DATA, JSON.stringify(data)); } catch {}
}

export async function resetOnboarding(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([KEYS.ONBOARDING_COMPLETE, KEYS.ONBOARDING_DATA]);
  } catch {}
  // Clear any STICKY destination browsing context (T-DST) — onboarding reset
  // is one of the approved clearing conditions.
  try {
    const { setDestinationContext } = await import('./destinationContext');
    await setDestinationContext(null);
  } catch {}
}
// ── Trial notice (one-time post-onboarding modal over the map) ──
export async function getTrialNoticeDismissed(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(KEYS.TRIAL_NOTICE_DISMISSED);
    return val === 'true';
  } catch { return false; }
}
export async function setTrialNoticeDismissed(val: boolean): Promise<void> {
  try { await AsyncStorage.setItem(KEYS.TRIAL_NOTICE_DISMISSED, String(val)); } catch {}
}

// ── Saved Locations ──

export async function getSavedIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SAVED_IDS);
    return raw ? new Set(JSON.parse(raw)) : new Set<string>();
  } catch { return new Set<string>(); }
}

export async function setSavedIds(ids: Set<string>): Promise<void> {
  try { await AsyncStorage.setItem(KEYS.SAVED_IDS, JSON.stringify([...ids])); } catch {}
}

// ── Notification Preferences ──

export async function getNotificationPrefs<T>(defaults: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.NOTIFICATION_PREFS);
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch { return defaults; }
}

export async function setNotificationPrefs(prefs: any): Promise<void> {
  try { await AsyncStorage.setItem(KEYS.NOTIFICATION_PREFS, JSON.stringify(prefs)); } catch {}
}

// ── User Settings ──

export async function getUserSettings<T>(defaults: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.USER_SETTINGS);
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch { return defaults; }
}

export async function setUserSettings(settings: any): Promise<void> {
  try { await AsyncStorage.setItem(KEYS.USER_SETTINGS, JSON.stringify(settings)); } catch {}
}

// ── City Detection ──

export async function getLastCity(): Promise<string | null> {
  try { return await AsyncStorage.getItem(KEYS.LAST_CITY); } catch { return null; }
}

export async function setLastCity(city: string): Promise<void> {
  try { await AsyncStorage.setItem(KEYS.LAST_CITY, city); } catch {}
}

// ── Gate: visited + dismissed locations ──
// Both 'visited' and 'dismissed' are persisted so the gate only appears once per location.

async function isLocationInList(key: string, locationId: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return false;
    return (JSON.parse(raw) as string[]).includes(locationId);
  } catch { return false; }
}

async function addLocationToList(key: string, locationId: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(key);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(locationId)) {
      list.push(locationId);
      await AsyncStorage.setItem(key, JSON.stringify(list));
    }
  } catch {}
}

export async function isLocationVisited(locationId: string): Promise<boolean> {
  return isLocationInList(KEYS.VISITED_LOCATIONS, locationId);
}
/** All visited location IDs (the source populated by the visit gate). */
export async function getVisitedLocations(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.VISITED_LOCATIONS);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}

export async function isGateAnswered(locationId: string): Promise<boolean> {
  const [visited, dismissed] = await Promise.all([
    isLocationInList(KEYS.VISITED_LOCATIONS, locationId),
    isLocationInList(KEYS.DISMISSED_LOCATIONS, locationId),
  ]);
  return visited || dismissed;
}

export async function markLocationVisited(locationId: string): Promise<void> {
  await addLocationToList(KEYS.VISITED_LOCATIONS, locationId);
}

export async function markLocationDismissed(locationId: string): Promise<void> {
  await addLocationToList(KEYS.DISMISSED_LOCATIONS, locationId);
}

// ── User Worth-It Vote ──
// { [locationId]: { key, label, emoji } }

export interface WorthItVoteData {
  key: string;
  label: string;
  emoji: string;
}

export async function getUserWorthItVote(locationId: string): Promise<WorthItVoteData | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.USER_WORTHIT_VOTE);
    if (!raw) return null;
    const all: Record<string, WorthItVoteData> = JSON.parse(raw);
    return all[locationId] ?? null;
  } catch { return null; }
}

export async function setUserWorthItVote(locationId: string, data: WorthItVoteData): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.USER_WORTHIT_VOTE);
    const all: Record<string, WorthItVoteData> = raw ? JSON.parse(raw) : {};
    all[locationId] = data;
    await AsyncStorage.setItem(KEYS.USER_WORTHIT_VOTE, JSON.stringify(all));
  } catch {}
}

// ── User Visit Time ──
// { [locationId]: string }

export async function getUserVisitTime(locationId: string): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.USER_VISIT_TIME);
    if (!raw) return null;
    const all: Record<string, string> = JSON.parse(raw);
    return all[locationId] ?? null;
  } catch { return null; }
}

export async function setUserVisitTime(locationId: string, time: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.USER_VISIT_TIME);
    const all: Record<string, string> = raw ? JSON.parse(raw) : {};
    all[locationId] = time;
    await AsyncStorage.setItem(KEYS.USER_VISIT_TIME, JSON.stringify(all));
  } catch {}
}
