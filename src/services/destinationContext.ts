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
 *  - OR resets onboarding.
 * When no destination is active, all consumers fall back to their normal
 * behavior (home-city / GPS fallback) — unchanged.
 *
 * Persisted so a destination survives navigating between tabs/stacks (the
 * Destination screen stays mounted under the map tab) and process restarts.
 * This is deliberately small and isolated: a module-level singleton + a thin
 * hook, with no new React context tree.
 */

const DESTINATION_CONTEXT_KEY = 'scene_nearby_destination_context';

export interface DestinationContext {
  city: string;
  latitude: number;
  longitude: number;
}

let cached: DestinationContext | null | undefined;
const listeners = new Set<(ctx: DestinationContext | null) => void>();

/** Read the current active destination (async-safe, cached). */
export async function getDestinationContext(): Promise<DestinationContext | null> {
  if (cached !== undefined) return cached;
  try {
    const raw = await AsyncStorage.getItem(DESTINATION_CONTEXT_KEY);
    cached = raw ? (JSON.parse(raw) as DestinationContext) : null;
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
      await AsyncStorage.setItem(DESTINATION_CONTEXT_KEY, JSON.stringify(ctx));
    } else {
      await AsyncStorage.removeItem(DESTINATION_CONTEXT_KEY);
    }
  } catch {
    /* non-fatal */
  }
  listeners.forEach((l) => {
    try {
      l(ctx);
    } catch {
      /* ignore */
    }
  });
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

