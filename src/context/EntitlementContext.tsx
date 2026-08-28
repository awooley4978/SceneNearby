// ── Entitlement context (T-M4) ──
// Exposes trial/unlock state + purchase/restore actions to the UI. This is the
// single reactive source the paywall, profile lifetime card, and app-wide gating
// read from. Backed by services/entitlement.ts (state) and services/iap.ts (Apple).
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {
  getEntitlement,
  type Entitlement,
  type EntitlementStatus,
} from '../services/entitlement';
import {
  loadProduct,
  startPurchase,
  restorePurchases as doRestore,
  onPurchase,
  type PurchaseOutcome,
} from '../services/iap';

export type PurchaseUIState = 'idle' | 'purchasing' | 'restoring' | 'pending';

interface EntitlementContextValue {
  status: EntitlementStatus | 'unknown';
  daysLeft?: number;
  freshTrial?: boolean;
  price?: string | null;
  ui: PurchaseUIState;
  message?: string;
  refresh: () => Promise<void>;
  purchase: () => Promise<void>;
  restore: () => Promise<void>;
}

const EntitlementContext = createContext<EntitlementContextValue>({
  status: 'unknown',
  ui: 'idle',
  refresh: async () => {},
  purchase: async () => {},
  restore: async () => {},
});

export const useEntitlement = () => useContext(EntitlementContext);

export const EntitlementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ent, setEnt] = useState<Entitlement | null>(null);
  const [price, setPrice] = useState<string | null>(null);
  const [ui, setUi] = useState<PurchaseUIState>('idle');
  const [message, setMessage] = useState<string | undefined>(undefined);

  const refresh = useCallback(async () => {
    const e = await getEntitlement();
    setEnt(e);
  }, []);

  // Initial load + price.
  useEffect(() => {
    refresh();
    loadProduct().then(({ price: p }) => setPrice(p ?? null));
  }, [refresh]);

  // Listen for purchase outcomes.
  useEffect(() => {
    const off = onPurchase((outcome: PurchaseOutcome) => {
      if (outcome.type === 'purchased' || outcome.type === 'restored') {
        setUi('idle');
        setMessage(outcome.type === 'purchased' ? 'Scene Nearby is unlocked — enjoy! 🎬' : 'Purchases restored.');
        refresh();
      } else if (outcome.type === 'pending') {
        setUi('pending');
        setMessage('Waiting for Apple to confirm your purchase…');
      } else if (outcome.type === 'cancelled') {
        setUi('idle');
        setMessage(undefined);
      } else if (outcome.type === 'failed') {
        setUi('idle');
        setMessage(outcome.error || 'Something went wrong. Please try again.');
      }
    });
    return off;
  }, [refresh]);

  const purchase = useCallback(async () => {
    setUi('purchasing');
    setMessage(undefined);
    try {
      await startPurchase();
      // Outcome arrives via listener; keep UI busy until it does.
    } catch (err) {
      setUi('idle');
      // Surface the real expo-iap error (code/message) — helps on-device QA
      // diagnose purchase-START failures rather than a generic message.
      console.warn('[iap] startPurchase failed:', err);
      const code = (err as { code?: string })?.code;
      const detail = err instanceof Error ? err.message : String(err ?? '');
      const shown = code && !/cancel/i.test(code) ? code : detail;
      setMessage(shown ? `Could not start the purchase (${shown}). Please try again.` : 'Could not start the purchase. Please try again.');
    }
  }, []);

  const restore = useCallback(async () => {
    setUi('restoring');
    setMessage(undefined);
    try {
      await doRestore();
    } catch {
      setUi('idle');
      setMessage('Restore did not complete. Please try again.');
    }
  }, []);

  const status = ent?.status ?? 'unknown';

  return (
    <EntitlementContext.Provider
      value={{
        status,
        daysLeft: ent?.daysLeft,
        freshTrial: ent?.freshTrial,
        price,
        ui,
        message,
        refresh,
        purchase,
        restore,
      }}
    >
      {children}
    </EntitlementContext.Provider>
  );
};
