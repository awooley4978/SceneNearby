import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithEmailLink as firebaseSignInWithEmailLink,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInAnonymously as firebaseSignInAnonymously,
  User,
  ActionCodeSettings,
} from '@firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { doc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from './firebase';
import { clearAllLocalUserData, getInteractedLocationIds } from './StorageService';
import { getLastAuthNetworkFailure } from './diagnostics';

// ── Types ──

export type AuthMethod = 'magicLink' | 'otp' | 'password';

export interface MagicLinkState {
  status: 'idle' | 'sending' | 'sent' | 'error' | 'verifying' | 'invalid' | 'needEmail';
  email?: string;
  error?: string;
}

// ── Action code settings for magic link ──

const MAGIC_LINK_STORAGE_KEY = 'scene_nearby_magic_link_email';

export const actionCodeSettings: ActionCodeSettings = {
  // Continue URL must be an HTTPS URL on a Firebase-authorized domain. The
  // project's own default Hosting domain (scenenearby.firebaseapp.com) is
  // auto-authorized, and its /__/auth/action handler is reserved by Firebase
  // for email-auth actions (verified HTTP 200). A bare custom scheme
  // (e.g. scenenearby://auth) is NOT an authorized-domain HTTPS URL, so Firebase
  // rejects it server-side with auth/unauthorized-continue-uri BEFORE the email
  // sends. With handleCodeInApp + iOS.bundleId, Firebase emits a mobile link on
  // this domain, which is registered as the app's Associated Domain
  // (ios.associatedDomains in app.json), so iOS hands the HTTPS link to the app
  // and the Linking listener (useMagicLink) parses oobCode/mode to finish.
  url: 'https://scenenearby.firebaseapp.com/__/auth/action',
  handleCodeInApp: true,
  iOS: {
    bundleId: 'com.cairn.scenenearby',
  },
  android: {
    packageName: 'com.cairn.scenenearby',
    installApp: true,
  },
};

// ── Password auth ──

export async function signUp(email: string, password: string): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signInWithPassword(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export const signIn = signInWithPassword;

export async function signOut(): Promise<void> {
  await AsyncStorage.removeItem(MAGIC_LINK_STORAGE_KEY);
  await firebaseSignOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

/** Anonymous sign-in — no email required, works immediately */
export async function signInAnonymously(): Promise<User> {
  const cred = await firebaseSignInAnonymously(auth);
  return cred.user;
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}

// ── Magic Link ──

export async function sendMagicLink(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  await AsyncStorage.setItem(MAGIC_LINK_STORAGE_KEY, normalized);
  await sendSignInLinkToEmail(auth, normalized, actionCodeSettings);
}

export async function signInWithMagicLink(url: string): Promise<User> {
  const email = await AsyncStorage.getItem(MAGIC_LINK_STORAGE_KEY);
  if (!email) {
    throw new Error('Could not find the email used to request this link.');
  }

  // Network-retry (owner 09-07): retry ONLY a pure transport failure of the
  // magic-link HTTPS call — i.e. `auth/network-request-failed` AND the native
  // layer received no HTTP response for that attempt (the oobCode was almost
  // certainly not consumed). Semantic errors (invalid/expired action code,
  // quota, etc.) are never retried and always propagate immediately. The email
  // and URL are kept intact across attempts; the caller's existing friendly
  // error path runs unchanged if all attempts fail.
  const RETRY_DELAYS_MS = [750, 2000];
  let lastError: any;
  for (let attempt = 0; ; attempt++) {
    try {
      const cred = await firebaseSignInWithEmailLink(auth, email, url);
      await AsyncStorage.removeItem(MAGIC_LINK_STORAGE_KEY);
      return cred.user;
    } catch (err: any) {
      lastError = err;
      const isNetworkError = err?.code === 'auth/network-request-failed';
      const failure = getLastAuthNetworkFailure();
      const canRetry =
        isNetworkError && !!failure && failure.responded === false && attempt < RETRY_DELAYS_MS.length;
      if (!canRetry) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }
  }
  // Unreachable — the loop either returns or throws. Satisfies TS exhaustiveness.
  throw lastError;
}

export function isMagicLink(url: string): boolean {
  return isSignInWithEmailLink(auth, url);
}

export async function getPendingMagicLinkEmail(): Promise<string | null> {
  return AsyncStorage.getItem(MAGIC_LINK_STORAGE_KEY);
}

export async function clearPendingMagicLinkEmail(): Promise<void> {
  await AsyncStorage.removeItem(MAGIC_LINK_STORAGE_KEY);
}

// ── Account deletion ──
// Permanently deletes the signed-in account and all associated data:
//   - server-side (Turso submissions + R2 objects + Firestore) via POST /api/account/delete
//   - Firestore uid-keyed subdocs (worthItVotes/visitTimes) that the server can't
//     enumerate without a locations scan — deleted client-side for the location
//     IDs this device knows about
//   - Firebase Auth user
//   - local AsyncStorage + entitlement Keychain

const ACCOUNT_DELETE_API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://scene-nearby-api.fly.dev';

/** Delete all Firestore docs in `collectionName` where `field === value`. */
async function deleteFirestoreWhere(collectionName: string, field: string, value: string): Promise<void> {
  const q = query(collection(db, collectionName), where(field, '==', value));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d: any) => deleteDoc(d.ref)));
}

/**
 * Delete the signed-in user's account and associated data.
 * Throws on failure (surfaced to the caller for a clear completion/error state).
 *
 * Ordering is a careful trade-off between two failure modes:
 *   - A stale login must be DISCOVERED before any server data is touched, so we
 *     don't wipe data and then fail to delete the Auth account.
 *   - A server-data cleanup failure must leave the account INTACT so the user can
 *     re-auth and retry (if we deleted Auth first, they'd have no account to
 *     sign back into).
 *
 * So we: (1) ensure recent auth / re-authenticate, (2) delete server data
 * (retry-safe), (3) delete client-side attributable data, (4) delete the Auth
 * account LAST, (5) clear local state and sign out. A requires-recent-login
 * surfaces at step 1, before anything is deleted.
 *
 * Anonymous accounts have no Firebase Auth record to delete (and can't be
 * re-authenticated), so steps 1 and 4 are skipped for them.
 */
export async function deleteAccount(): Promise<void> {
  const user = getCurrentUser();
  if (!user) throw new Error('No signed-in account to delete.');

  const isAnonymous = !!user.isAnonymous;
  const uid = user.uid;

  // 1. Ensure recent authentication BEFORE touching any data. A stale login
  //    (auth/requires-recent-login) must be discovered here — not after we've
  //    already deleted server data.
  let idToken: string;
  if (isAnonymous) {
    idToken = await user.getIdToken();
  } else {
    idToken = await user.getIdToken();
    await ensureRecentAuth(user);
  }

  // 2. Delete server-side data (Turso + R2 + Firestore). Retry-safe on the
  //    backend: R2 objects are removed before their Turso reference rows, and it
  //    returns success:false (rather than success) when any subsystem failed.
  const res = await fetch(`${ACCOUNT_DELETE_API_BASE}/api/account/delete`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    let msg = 'Could not delete your account. Please try again.';
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {}
    throw new Error(msg);
  }
  const serverResult = (await res.json().catch(() => null)) as { success?: boolean } | null;
  if (serverResult && serverResult.success === false) {
    throw new Error('Could not delete all your data. Please try again.');
  }

  // 3. Delete Firestore uid-keyed subdocs for locations this device interacted
  //    with (worthItVotes/{uid} and visitTimes/{uid} have no userId field the
  //    server can query on without a full locations scan).
  try {
    const locationIds = await getInteractedLocationIds();
    await Promise.all(
      locationIds.map(async (locationId) => {
        await Promise.all([
          deleteDoc(doc(db, 'locations', locationId, 'worthItVotes', uid)).catch(() => {}),
          deleteDoc(doc(db, 'locations', locationId, 'visitTimes', uid)).catch(() => {}),
        ]);
      }),
    );
  } catch {}

  // 3b. Best-effort client-side deletion of Firestore docs the server also
  //     handles (defense in depth if the server Firestore pass failed).
  try {
    await Promise.all([
      deleteFirestoreWhere('photos', 'userId', uid),
      deleteFirestoreWhere('tips', 'userId', uid),
    ]);
  } catch {}

  // 4. Preserve + clear the entitlement Keychain BEFORE user.delete().
  //    user.delete() internally calls auth.signOut(), which fires
  //    onAuthStateChanged(null) and triggers the EntitlementContext refresh. If
  //    we cleared AFTER delete(), that refresh would read stale SecureStore state
  //    (the exact "Unlocked after deletion" race). Clearing first guarantees the
  //    refresh sees absent keys. We preserve the values so a FAILED
  //    user.delete() can restore them and never leave a still-existing user
  //    locally de-entitled.
  const entitlementKeys = [
    'entitlement.trialStartedAt',
    'entitlement.unlocked',
    'entitlement.unlockTransactionId',
    'entitlement.pendingGrant',
  ] as const;
  const savedEntitlements: Record<string, string | null> = {};
  for (const key of entitlementKeys) {
    try {
      savedEntitlements[key] = await SecureStore.getItemAsync(key);
    } catch (err) {
      savedEntitlements[key] = null;
      console.warn(`[account-deletion] preserve SecureStore.getItemAsync FAILED key=${key}`, err);
    }
    console.log(`[account-deletion] preserved key=${key} value=${JSON.stringify(savedEntitlements[key])}`);
  }
  for (const key of entitlementKeys) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (err) {
      console.warn(`[account-deletion] SecureStore.deleteItemAsync FAILED key=${key}`, err);
    }
    let readback: string | null = null;
    try {
      readback = await SecureStore.getItemAsync(key);
    } catch (err) {
      console.warn(`[account-deletion] SecureStore.getItemAsync (readback) FAILED key=${key}`, err);
    }
    console.log(`[account-deletion] entitlement key=${key} readback=${JSON.stringify(readback)}`);
  }
  // 5. Delete the Firebase Auth account (the requires-recent-login gate has
  //    already been satisfied at step 1). Anonymous accounts have no Auth record.
  if (!isAnonymous) {
    try {
      await user.delete();
    } catch (err: any) {
      // Auth deletion failed — restore the preserved entitlement so the still-
      // existing account isn't left de-entitled on this device.
      for (const key of entitlementKeys) {
        const value = savedEntitlements[key];
        if (value != null) {
          try {
            await SecureStore.setItemAsync(key, value);
            console.log(`[account-deletion] restored key=${key} value=${JSON.stringify(value)}`);
          } catch (restoreErr) {
            console.warn(`[account-deletion] restore SecureStore.setItemAsync FAILED key=${key}`, restoreErr);
          }
        }
      }
      if (err?.code === 'auth/requires-recent-login') {
        throw new Error('For your security, please sign out and sign back in, then delete your account.');
      }
      throw new Error('Could not delete your account. Please try again.');
    }
  }

  // 6. Clear local (AsyncStorage) state + pending magic-link email.
  await clearAllLocalUserData();
  await clearPendingMagicLinkEmail();
  // 7. Sign out (fires onAuthChange with user = null). After user.delete() the
  //    session is already invalid, but this clears any lingering local state.
  try {
    await firebaseSignOut(auth);
  } catch {}
}

/**
 * Detect a stale login (Firebase's `auth/requires-recent-login` condition)
 * BEFORE any destructive step, so we never wipe data and then fail to delete the
 * Auth account. Firebase's recent-login window is ~5 minutes: `lastSignInTime`
 * older than that means `user.delete()` will require re-authentication. The
 * caller surfaces the sentinel error as a "sign out and back in" prompt.
 *
 * Anonymous accounts have no meaningful `lastSignInTime` and can't be
 * re-authenticated, so this check is skipped for them.
 */
async function ensureRecentAuth(user: User): Promise<void> {
  if (user.isAnonymous) return;
  const lastSignIn = (user.metadata as { lastSignInTime?: string } | undefined)?.lastSignInTime;
  const last = lastSignIn ? Date.parse(lastSignIn) : 0;
  const RECENT_WINDOW_MS = 5 * 60 * 1000;
  if (!Number.isFinite(last) || Date.now() - last > RECENT_WINDOW_MS) {
    throw new Error('For your security, please sign out and sign back in, then delete your account.');
  }
}
