import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  ONBOARDING_COMPLETE: '@scenenearby/onboarding_complete',
  ONBOARDING_DATA: '@scenenearby/onboarding_data',
  SAVED_IDS: '@scenenearby/saved_ids',
  NOTIFICATION_PREFS: '@scenenearby/notification_prefs',
  USER_SETTINGS: '@scenenearby/settings',
  LAST_CITY: '@scenenearby/last_city',
  VISITED_LOCATIONS: '@scenenearby/visited_locations',
  USER_WORTHIT_VOTE: '@scenenearby/user_worthit_vote',
  USER_VISIT_TIME: '@scenenearby/user_visit_time',
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

// ── Gate: visited locations ──
// Only 'visited' is persisted. 'not_visited' never stored → gate re-appears.

export async function isLocationVisited(locationId: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.VISITED_LOCATIONS);
    if (!raw) return false;
    const visited: string[] = JSON.parse(raw);
    return visited.includes(locationId);
  } catch { return false; }
}

export async function markLocationVisited(locationId: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.VISITED_LOCATIONS);
    const visited: string[] = raw ? JSON.parse(raw) : [];
    if (!visited.includes(locationId)) {
      visited.push(locationId);
      await AsyncStorage.setItem(KEYS.VISITED_LOCATIONS, JSON.stringify(visited));
    }
  } catch {}
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
