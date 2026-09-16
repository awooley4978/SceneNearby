import { useEffect, useRef } from 'react';
import { Linking, AppState } from 'react-native';
import { useEntitlement } from '../context/EntitlementContext';
import {
  isReviewerAccessUrl,
  activateReviewerAccess,
} from '../services/reviewerAccess';

/**
 * Listens for the Google Play reviewer-access deep link and grants
 * lifetime-equivalent access when the correct code is present. Mirrors the
 * magic-link hook's cold/warm/foreground coverage so a fresh install that is
 * first opened via the deep link is handled.
 */
export function useReviewerAccess() {
  const { refresh } = useEntitlement();
  const processedRef = useRef(false);
  const lastUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const handle = async (url: string) => {
      if (!mounted) return;
      if (!isReviewerAccessUrl(url)) return;
      if (url === lastUrlRef.current) return;
      lastUrlRef.current = url;
      const granted = await activateReviewerAccess(url);
      if (granted) {
        processedRef.current = true;
        await refresh();
      }
    };

    // Cold start
    Linking.getInitialURL()
      .then((u) => { if (u) handle(u); })
      .catch(() => {});

    // Warm start
    const sub = Linking.addEventListener('url', (e) => { handle(e.url); });

    // Return to foreground (re-check initial URL once)
    const appStateSub = AppState.addEventListener('change', (next) => {
      if (next === 'active' && !processedRef.current) {
        Linking.getInitialURL()
          .then((u) => { if (u) handle(u); })
          .catch(() => {});
      }
    });

    return () => {
      mounted = false;
      sub.remove();
      appStateSub.remove();
    };
  }, [refresh]);
}
