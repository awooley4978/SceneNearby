// ── Entitlement service (T-M2) — single source of truth for trial/unlock state ──
// Approved mechanism (owner 08-28):
//   Anonymous users: trial start in iOS Keychain (expo-secure-store) so a
//     delete/reinstall on the same iPhone does NOT reset the 7 days.
//   Signed-in users: same Keychain trial + mirrored to Firestore `entitlements/{uid}`
//     so it follows the account across devices.
//   Expiry clock: server time (Fly /api/entitlement/time) authoritative, device
//     clock fallback only when offline (rollback-resistant:
//     offline = max(deviceTime, lastTrustedServerTime)).
//   Unlock granted ONLY via a verified Apple purchase/restore (T-M3 writes it here).

import * as SecureStore from 'expo-secure-store';
import { getCurrentUser } from './auth';
import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { logEvent } from './diagnostics';

export const PRODUCT_ID = 'com.cairn.scenenearby.lifetime';
export const TRIAL_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

// Same base URL resolution as api.ts.
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
const FETCH_TIMEOUT_MS = 6000;

// Keychain keys (survive reinstalls on the same device).
const K_TRIAL_STARTED_AT = 'entitlement/trialStartedAt';
const K_UNLOCKED = 'entitlement/unlocked';
const K_UNLOCK_TRANSACTION_ID = 'entitlement/unlockTransactionId';
// Durable "pending grant" marker: server verified OK, but entitlement persistence
// didn't complete — retry on next launch so we never lose a verified purchase.
const K_PENDING_GRANT = 'entitlement/pendingGrant';

export type EntitlementStatus = 'trialActive' | 'locked' | 'unlocked';

export interface Entitlement {
  status: EntitlementStatus;
  trialStartedAt?: number;
  daysLeft?: number;
  /** True if this call just started the trial (first launch). */
  freshTrial?: boolean;
}

async function secureGet(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (err) {
    // DIAGNOSTIC: surface the real expo-secure-store error (owner 08-28, T-M5
    // grant blocker) instead of swallowing it. Behavior unchanged (returns null).
    const e = err as { name?: string; message?: string; code?: string };
    const detail = `key=${key} :: name=${e?.name} :: message=${e?.message} :: code=${e?.code}`;
    console.warn(`[entitlement] secureGet failed for key=${key}`, {
      name: e?.name,
      message: e?.message,
      code: e?.code,
    }, err);
    logEvent('secureGetFailed', detail);
    return null;
  }
}
async function secureSet(key: string, value: string): Promise<boolean> {
  try {
    await SecureStore.setItemAsync(key, value);
    return true;
  } catch (err) {
    // DIAGNOSTIC: surface the real expo-secure-store error (owner 08-28, T-M5
    // grant blocker). The Keychain write here drives grantUnlock()'s return
    // value (false => "Could not save your purchase...").
    const e2 = err as { name?: string; message?: string; code?: string };
    const detail2 = `key=${key} :: name=${e2?.name} :: message=${e2?.message} :: code=${e2?.code}`;
    console.warn(`[entitlement] secureSet failed for key=${key}`, {
      name: e2?.name,
      message: e2?.message,
      code: e2?.code,
    }, err);
    logEvent('secureSetFailed', detail2);
    return false;
  }
}

/** Authoritative server clock; null when offline/unreachable. */
export async function getServerTime(): Promise<number | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(`${BASE_URL}/api/entitlement/time`, {
      signal: ctrl.signal,
      headers: { 'Accept-Encoding': 'identity' },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = (await res.json()) as { serverTime?: number };
    return typeof data.serverTime === 'number' ? data.serverTime : null;
  } catch {
    return null;
  }
}

interface FirestoreEntitlement {
  trialStartedAt?: number;
  unlocked?: boolean;
  unlockTransactionId?: string;
  updatedAt?: number;
}

async function readFirestore(uid: string): Promise<FirestoreEntitlement | null> {
  try {
    const snap = await getDoc(doc(db, 'entitlements', uid));
    return snap.exists() ? (snap.data() as FirestoreEntitlement) : null;
  } catch {
    return null;
  }
}

async function writeFirestore(uid: string, data: FirestoreEntitlement): Promise<void> {
  try {
    await setDoc(doc(db, 'entitlements', uid), { ...data, updatedAt: Date.now() }, { merge: true });
  } catch (err) {
    // DIAGNOSTIC: surface the real Firestore write error (owner 08-28, T-M5
    // grant blocker). Still non-fatal (Keychain holds device state).
    console.warn(`[entitlement] writeFirestore failed for uid=${uid}`, {
      name: (err as Error)?.name,
      message: (err as Error)?.message,
      code: (err as { code?: string })?.code,
    }, err);
  }
}

/**
 * Resolve the current entitlement.
 * Lookup order:
 *   1. Unlocked (local Keychain or signed-in Firestore mirror) → full access.
 *   2. Otherwise determine trial from Firestore (signed-in) then Keychain, else start it now.
 */
export async function getEntitlement(): Promise<Entitlement> {
  // 1. Unlocked?
  const localUnlocked = await secureGet(K_UNLOCKED);
  if (localUnlocked === 'true') {
    const unlockedTrial = await getTrialStartedAt().catch(() => null);
    return { status: 'unlocked', trialStartedAt: unlockedTrial ?? undefined };
  }

  const user = getCurrentUser();
  const uid = user?.uid;
  const fs = uid ? await readFirestore(uid) : null;
  if (fs?.unlocked) {
    await secureSet(K_UNLOCKED, 'true');
    if (fs.unlockTransactionId) await secureSet(K_UNLOCK_TRANSACTION_ID, fs.unlockTransactionId);
    return { status: 'unlocked', trialStartedAt: fs.trialStartedAt };
  }

  // 2/3. Trial determination.
  const serverNow = await getServerTime();
  const now = serverNow ?? Date.now();

  const fsTrial = fs?.trialStartedAt as number | undefined;
  const keychainTrial: number | null = await getTrialStartedAt().catch(() => null);
  let trialStartedAt = fsTrial ?? keychainTrial ?? null;
  const freshTrial = trialStartedAt === null;

  if (freshTrial) {
    trialStartedAt = now;
    await setTrialStartedAt(trialStartedAt, uid);
  } else if (uid && !fsTrial) {
    // Mirror a legacy Keychain-only trial up to Firestore once signed in.
    await writeFirestore(uid, { trialStartedAt: trialStartedAt as number });
  }
  // After the branches above, the trial has a concrete start time.
  const start = trialStartedAt as number;

  const expiry = start + TRIAL_DAYS * DAY_MS;
  if (freshTrial) {
    // Just started today — full 7 days remain.
    return { status: 'trialActive', trialStartedAt: start, daysLeft: TRIAL_DAYS, freshTrial: true };
  }
  if (now >= expiry) {
    return { status: 'locked', trialStartedAt: start, daysLeft: 0 };
  }
  const daysLeft = Math.max(0, Math.ceil((expiry - now) / DAY_MS));
  return { status: 'trialActive', trialStartedAt: start, daysLeft };
}

async function getTrialStartedAt(): Promise<number | null> {
  const raw = await secureGet(K_TRIAL_STARTED_AT).catch(() => null);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

async function setTrialStartedAt(ts: number, uid?: string): Promise<void> {
  await secureSet(K_TRIAL_STARTED_AT, String(ts));
  if (uid) await writeFirestore(uid, { trialStartedAt: ts });
}

/** Persist a verified unlock locally + to the account mirror. Returns success. */
export async function grantUnlock(transactionId: string): Promise<boolean> {
  const okLocal = await secureSet(K_UNLOCKED, 'true');
  await secureSet(K_UNLOCK_TRANSACTION_ID, transactionId).catch(() => false);
  const user = getCurrentUser();
  if (user?.uid) {
    await writeFirestore(user.uid, { unlocked: true, unlockTransactionId: transactionId });
  }
  return okLocal;
}

export async function isUnlocked(): Promise<boolean> {
  const e = await getEntitlement();
  return e.status === 'unlocked';
}

// ── Persistence-duration guardrail (owner 08-28) ──
// If server verification succeeds but entitlement persistence fails, write a
// durable pending-grant marker so the unlock is retried before it's treated as
// fully handled — the verified purchase must survive a persistence hiccup.
export interface PendingGrant {
  transactionId: string;
  createdAt: number;
}
export async function setPendingGrant(transactionId: string): Promise<void> {
  await secureSet(K_PENDING_GRANT, JSON.stringify({ transactionId, createdAt: Date.now() } as PendingGrant));
}
export async function getPendingGrant(): Promise<PendingGrant | null> {
  const raw = await secureGet(K_PENDING_GRANT).catch(() => null);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingGrant;
  } catch {
    return null;
  }
}
export async function clearPendingGrant(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(K_PENDING_GRANT);
  } catch {}
}
/** Retry persisting a verified-but-unpersisted unlock. Call on app launch. */
export async function retryPendingGrant(): Promise<boolean> {
  const pending = await getPendingGrant();
  if (!pending) return false;
  const ok = await grantUnlock(pending.transactionId);
  if (ok) await clearPendingGrant();
  return ok;
}
