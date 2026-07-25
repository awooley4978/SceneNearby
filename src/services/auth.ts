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
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from './firebase';

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
