// ── IAP service (T-M3 client) — StoreKit via expo-iap (OpenIAP) ──
// Server-to-server verification (owner 08-28): the client never self-grants.
// It sends the Apple transaction to our backend /api/entitlement/verify, which
// validates it server-to-server (App Store Server API) and confirms it is for
// Scene Nearby's com.cairn.scenenearby.lifetime. Only then is the entitlement
// persisted (via entitlement.ts) and the transaction finished.

import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  restorePurchases as expoRestorePurchases,
  getAvailablePurchases,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  type Purchase,
} from 'expo-iap';
import {
  PRODUCT_ID,
  grantUnlock,
  setPendingGrant,
  clearPendingGrant,
} from './entitlement';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
const FETCH_TIMEOUT_MS = 10000;

export type PurchaseOutcome =
  | { type: 'purchased' | 'restored'; transactionId: string }
  | { type: 'pending' }
  | { type: 'cancelled' }
  | { type: 'failed'; error?: string };
type PurchaseListener = (outcome: PurchaseOutcome) => void;

const listeners = new Set<PurchaseListener>();
let initialized = false;

export function onPurchase(listener: PurchaseListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function emit(outcome: PurchaseOutcome): void {
  listeners.forEach((l) => {
    try {
      l(outcome);
    } catch {}
  });
}

// iOS has richer fields (environmentIOS, required transactionId); Android's are
// optional. The app is iOS-first, so we read the iOS fields with safe optional
// access via casts. `tid` returns a non-empty string id for either platform.
function tid(p: Purchase): string {
  const anyP = p as { transactionId?: string | null; id?: string };
  return anyP.transactionId ?? anyP.id ?? '';
}
function iosEnvironment(p: Purchase): string | undefined {
  return (p as { environmentIOS?: string }).environmentIOS ?? undefined;
}

/** Verify a transaction server-to-server. True only for a valid Scene Nearby lifetime purchase. */
async function verifyOnServer(transactionId: string, environment?: string): Promise<boolean> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}/api/entitlement/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept-Encoding': 'identity' },
      body: JSON.stringify({ transactionId, environment: environment || 'Production' }),
      signal: ctrl.signal,
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { valid?: boolean };
    return data?.valid === true;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

async function handleVerifiedTransaction(purchase: Purchase): Promise<void> {
  const transactionId = tid(purchase);
  const environment = iosEnvironment(purchase);
  // DIAGNOSTIC: trace each persistence step so the physical-device console
  // shows exactly where the grant fails (owner 08-28, T-M5 grant blocker).
  try {
    await setPendingGrant(transactionId);
    console.log(`[iap] handleVerifiedTransaction: setPendingGrant ok (tid=${transactionId}, env=${environment})`);
  } catch (err) {
    console.warn('[iap] handleVerifiedTransaction: setPendingGrant FAILED', err);
  }
  const granted = await grantUnlock(transactionId);
  console.log(`[iap] handleVerifiedTransaction: grantUnlock=${granted} (tid=${transactionId}, env=${environment})`);
  if (!granted) {
    // Keep the pending marker — verified purchase must not be lost.
    console.warn('[iap] handleVerifiedTransaction: grantUnlock returned false — emitting save-failure, pending marker kept');
    emit({ type: 'failed', error: 'Could not save your purchase — it will be restored automatically.' });
    return;
  }
  try {
    await clearPendingGrant();
    console.log('[iap] handleVerifiedTransaction: clearPendingGrant ok');
  } catch (err) {
    console.warn('[iap] handleVerifiedTransaction: clearPendingGrant FAILED', err);
  }
  try {
    await finishTransaction({ purchase, isConsumable: false });
  } catch {
    // iOS unfinished transactions replay next launch; we've already granted.
  }
  emit({ type: 'purchased', transactionId });
}

export async function initializeIAP(): Promise<void> {
  if (initialized) return;
  try {
    await initConnection();
  } catch (err) {
    // Never cache a failed init as "initialized": a later purchase/restore must
    // retry the connection. Surface the real error so callers can log it.
    initialized = false;
    throw err;
  }

  purchaseUpdatedListener(async (purchase) => {
    try {
      if (purchase.productId !== PRODUCT_ID) {
        // Not ours — don't hold up the queue.
        try {
          await finishTransaction({ purchase, isConsumable: false });
        } catch {}
        return;
      }
      const state = (purchase.purchaseState ?? '').toString();
      if (/pending|deferred/i.test(state) || state === 'DEFERRED') {
        emit({ type: 'pending' });
        return;
      }
      if (/cancel/i.test(state)) {
        emit({ type: 'cancelled' });
        return;
      }
      // Completed (purchased/restored): verify server-side before granting.
      const ok = await verifyOnServer(tid(purchase), iosEnvironment(purchase));
      if (!ok) {
        // Not a verifiable Scene Nearby lifetime purchase — no grant.
        try {
          await finishTransaction({ purchase, isConsumable: false });
        } catch {}
        emit({ type: 'failed', error: 'Purchase could not be verified.' });
        return;
      }
      await handleVerifiedTransaction(purchase);
    } catch (err) {
      emit({ type: 'failed', error: err instanceof Error ? err.message : 'Purchase error' });
    }
  });

  purchaseErrorListener((error) => {
    const code = (error as { code?: string }).code ?? '';
    if (/cancel|user_cancel/i.test(code)) {
      emit({ type: 'cancelled' });
    } else {
      emit({ type: 'failed', error: error.message || 'Purchase failed' });
    }
  });

  initialized = true;
}

export async function loadProduct(): Promise<{ product?: unknown; price?: string | null }> {
  await initializeIAP().catch(() => {});
  try {
    const products = await fetchProducts({ skus: [PRODUCT_ID], type: 'in-app' });
    const p = products?.[0] as { localizedPrice?: string | null } | undefined;
    return { product: p, price: p?.localizedPrice ?? null };
  } catch {
    return {};
  }
}

export async function startPurchase(): Promise<void> {
  // No catch here: a failed init or request must propagate so the caller can
  // surface (and log) the real expo-iap error instead of a generic message.
  await initializeIAP();
  await requestPurchase({
    request: { apple: { sku: PRODUCT_ID }, google: { skus: [PRODUCT_ID] } },
    type: 'in-app',
  });
}

export async function restorePurchases(): Promise<void> {
  await initializeIAP().catch(() => {});
  try {
    await expoRestorePurchases();
  } catch {}
  // Honor anything already owned either way.
  const owned = await getAvailablePurchases().catch(() => []);
  const mine = owned.filter((p) => p.productId === PRODUCT_ID);
  for (const purchase of mine) {
    try {
      const ok = await verifyOnServer(tid(purchase), iosEnvironment(purchase));
      if (ok) await handleVerifiedTransaction(purchase);
    } catch {}
  }
}

export function shutdownIAP(): void {
  endConnection().catch(() => {});
  initialized = false;
}
