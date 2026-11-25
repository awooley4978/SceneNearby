import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

/**
 * Sticky destination browsing context (T-DST, owner-approved 08-28).
 *
 * A selected destination ("View on Map" from DestinationScreen) is a STICKY
 * browsing context: while it is active it overrides the home-city fallback
 * (and GPS-fallback path) so the app stays on that destination across the map,
 * Discover feed, Near You and More to Discover.
 *
 * Clearing semantics (approved):
 *  - cleared only when the user EXPLICITLY exits destination browsing (pops the
 *    Destination screen back to normal local browsing),
 *  - OR selects a DIFFERENT destination (replaces the context),
 *  - OR resets onboarding,
 *  - OR the app is relaunched (cold start) — see SESSION_ID below.
 * When no destination is active, all consumers fall back to their normal
 * behavior (home-city / GPS fallback) — unchanged.
 *
 * Persisted so a destination survives navigating between tabs/stacks (the
 * Destination screen stays mounted under the map tab) within one app run.
 *
 * COLD-START FIX (owner-reported bug): the context used to survive process
 * restarts, so a destination the user once browsed (e.g. Monument Valley, Utah)
 * became the app's "current location" on every later launch — the Destination
 * screen that owns the context is gone, so its unmount cleanup never ran and
 * the stale record outlived the browsing session. The persisted record now
 * carries the SESSION_ID of the process that wrote it; a record from an earlier
 * process is discarded on first read, so a cold start falls back to real GPS /
 * home city. A destination chosen in the CURRENT run stays sticky as before.
 *
 * This is deliberately small and isolated: a module-level singleton + a thin
 * hook, with no new React context tree.
 */

const DESTINATION_CONTEXT_KEY = 'scene_nearby_destination_context';

/**
 * Identifier of this app process. Generated once per launch, so a value loaded
 * from storage can be told apart from one written by the running session.
 */
const SESSION_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export interface DestinationContext {
  city: string;
  latitude: number;
  longitude: number;
}

interface PersistedDestinationContext extends DestinationContext {
  sessionId?: string;
}

let cached: DestinationContext | null | undefined;
const listeners = new Set<(ctx: DestinationContext | null) => void>();

function notify(ctx: DestinationContext | null) {
  listeners.forEach((l) => {
    try {
      l(ctx);
    } catch {
      /* ignore */
    }
  });
}

/** Read the current active destination (async-safe, cached). */
export async function getDestinationContext(): Promise<DestinationContext | null> {
  if (cached !== undefined) return cached;
  try {
    const raw = await AsyncStorage.getItem(DESTINATION_CONTEXT_KEY);
    const stored = raw ? (JSON.parse(raw) as PersistedDestinationContext) : null;
    if (!stored) {
      cached = null;
    } else if (stored.sessionId !== SESSION_ID) {
      // Written by a previous app run — that browsing session is over. Drop it
      // so the app falls back to real GPS / home city on this cold start.
      cached = null;
      await AsyncStorage.removeItem(DESTINATION_CONTEXT_KEY);
    } else {
      cached = {
        city: stored.city,
        latitude: stored.latitude,
        longitude: stored.longitude,
      };
    }
  } catch {
    cached = null;
  }
  return cached;
}

/** Synchronous view of the cached context (null if not yet loaded/set). */
export function getDestinationContextSync(): DestinationContext | null {
  return cached ?? null;
}

/** Set (or clear with null) the active destination context. */
export async function setDestinationContext(ctx: DestinationContext | null): Promise<void> {
  cached = ctx;
  try {
    if (ctx) {
      const persisted: PersistedDestinationContext = { ...ctx, sessionId: SESSION_ID };
      await AsyncStorage.setItem(DESTINATION_CONTEXT_KEY, JSON.stringify(persisted));
    } else {
      await AsyncStorage.removeItem(DESTINATION_CONTEXT_KEY);
    }
  } catch {
    /* non-fatal */
  }
  notify(ctx);
}

/** Subscribe to context changes. Returns an unsubscribe fn. */
export function subscribeDestinationContext(fn: (ctx: DestinationContext | null) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * React hook — returns the current sticky destination context, updating on
 * set/clear. Loads the persisted value once on mount and tracks changes.
 */
export function useDestinationContext(): DestinationContext | null {
  const [ctx, setCtx] = useState<DestinationContext | null>(getDestinationContextSync());
  useEffect(() => {
    let active = true;
    getDestinationContext().then((c) => {
      if (active) setCtx(c);
    });
    const unsub = subscribeDestinationContext((c) => {
      if (active) setCtx(c);
    });
    return () => {
      active = false;
      unsub();
    };
  }, []);
  return ctx;
}
