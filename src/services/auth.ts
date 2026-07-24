import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithEmailLink as firebaseSignInWithEmailLink,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  ActionCodeSettings,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from './firebase';

// ── Types ──

export type AuthMethod = 'magicLink' | 'otp' | 'password';

export interface MagicLinkState {
  status: 'idle' | 'sending' | 'sent' | 'error' | 'verifying' | 'invalid';
  email?: string;
  error?: string;
}

// ── Action code settings for magic link ──

const MAGIC_LINK_STORAGE_KEY = 'scene_nearby_magic_link_email';

export const actionCodeSettings: ActionCodeSettings = {
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

// ── Existing password auth (kept) ──

export async function signUp(email: string, password: string): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signInWithPassword(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

// Backwards-compat alias — existing callers use this
export const signIn = signInWithPassword;

export async function signOut(): Promise<void> {
  await AsyncStorage.removeItem(MAGIC_LINK_STORAGE_KEY);
  await firebaseSignOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}

// ── Magic Link ──

/** Send a sign-in link to the user's email */
export async function sendMagicLink(email: string): Promise<void> {
  // Store email so we can retrieve it when the link is clicked
  await AsyncStorage.setItem(MAGIC_LINK_STORAGE_KEY, email);
  // Let the Firebase error propagate with its code intact
  await sendSignInLinkToEmail(auth, email, actionCodeSettings);
}

/** Complete magic link sign-in using the URL from the deep link */
export async function signInWithMagicLink(url: string): Promise<User> {
  const email = await AsyncStorage.getItem(MAGIC_LINK_STORAGE_KEY);

  if (!email) {
    throw new Error(
      'Could not find the email used to request this link. Please request a new magic link.'
    );
  }

  const cred = await firebaseSignInWithEmailLink(auth, email, url);
  await AsyncStorage.removeItem(MAGIC_LINK_STORAGE_KEY);
  return cred.user;
}

/** Check if a URL is a Firebase sign-in link */
export function isMagicLink(url: string): boolean {
  return isSignInWithEmailLink(auth, url);
}

/** Get the stored pending email (for showing in "check your email" UI) */
export async function getPendingMagicLinkEmail(): Promise<string | null> {
  return AsyncStorage.getItem(MAGIC_LINK_STORAGE_KEY);
}

/** Clear pending magic link email */
export async function clearPendingMagicLinkEmail(): Promise<void> {
  await AsyncStorage.removeItem(MAGIC_LINK_STORAGE_KEY);
}
