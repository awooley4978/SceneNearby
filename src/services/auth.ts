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
  const cred = await firebaseSignInWithEmailLink(auth, email, url);
  await AsyncStorage.removeItem(MAGIC_LINK_STORAGE_KEY);
  return cred.user;
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
 * Ordering matters: a stale login (`auth/requires-recent-login`) would otherwise
 * let us wipe server data and THEN fail at `user.delete()`, leaving the account
 * half-deleted (data gone, account still present). So the Auth account is
 * deleted FIRST — the `requires-recent-login` throw happens before any data is
 * touched. Anonymous accounts have no Firebase Auth record to delete (and can't
 * be re-authenticated), so we skip `user.delete()` for them.
 */
export async function deleteAccount(): Promise<void> {
  const user = getCurrentUser();
  if (!user) throw new Error('No signed-in account to delete.');

  const isAnonymous = !!user.isAnonymous;
  const uid = user.uid;

  // 0. Fetch the ID token now, while the session is valid — we still need it for
  //    the server-side data deletion after the Auth record is gone.
  const idToken = await user.getIdToken();

  // 1. Delete the Firebase Auth account FIRST (the requires-recent-login gate).
  //    If this throws, nothing has been deleted yet and the user can re-auth and
  //    retry cleanly.
  if (!isAnonymous) {
    try {
      await user.delete();
    } catch (err: any) {
      if (err?.code === 'auth/requires-recent-login') {
        throw new Error('For your security, please sign out and sign back in, then delete your account.');
      }
      throw new Error('Could not delete your account. Please try again.');
    }
  }

  // 2. Delete server-side data (Turso + R2 + Firestore). The ID token remains
  //    signature-valid until its expiry, which the backend verifies.
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

  // 4. Best-effort client-side deletion of Firestore docs the server also handles
  //    (defense in depth if the server Firestore pass failed).
  try {
    await Promise.all([
      deleteFirestoreWhere('photos', 'userId', uid),
      deleteFirestoreWhere('tips', 'userId', uid),
    ]);
  } catch {}

  // 5. Clear local state + entitlement Keychain.
  await clearAllLocalUserData();
  await Promise.all([
    SecureStore.deleteItemAsync('entitlement.trialStartedAt').catch(() => {}),
    SecureStore.deleteItemAsync('entitlement.unlocked').catch(() => {}),
    SecureStore.deleteItemAsync('entitlement.unlockTransactionId').catch(() => {}),
    SecureStore.deleteItemAsync('entitlement.pendingGrant').catch(() => {}),
  ]);
  await clearPendingMagicLinkEmail();

  // 6. Sign out (fires onAuthChange with user = null). After user.delete() the
  //    session is already invalid, but this clears any lingering local state.
  try {
    await firebaseSignOut(auth);
  } catch {}
}
