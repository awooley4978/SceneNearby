import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  ONBOARDING_COMPLETE: '@scenenearby/onboarding_complete',
  ONBOARDING_DATA: '@scenenearby/onboarding_data',
  SAVED_IDS: '@scenenearby/saved_ids',
  NOTIFICATION_PREFS: '@scenenearby/notification_prefs',
  USER_SETTINGS: '@scenenearby/settings',
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