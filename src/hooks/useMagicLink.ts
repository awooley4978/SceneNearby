import { useEffect, useRef } from 'react';
import { Linking, AppState } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { isMagicLink } from '../services/auth';

/**
 * Hook that listens for incoming magic link deep links.
 * Handles both cold-start (getInitialURL) and warm-start (Linking.addEventListener).
 * Also re-checks the initial URL when the app returns to foreground.
 */
export function useMagicLink() {
  const { handleMagicLink } = useAuth();
  const processedRef = useRef(false);
  const lastUrlRef = useRef<string | null>(null);

  useEffect(() => {
    // Dev bypass: skip magic link handling entirely
    if (__DEV__) return;
    let mounted = true;

    // ── Cold start: check initial URL ──
    const checkInitial = async () => {
      try {
        const url = await Linking.getInitialURL();
        if (url && mounted && isMagicLink(url)) {
          lastUrlRef.current = url;
          await handleMagicLink(url);
          processedRef.current = true;
        }
      } catch {}
    };
    checkInitial();

    // ── Warm start: listen for new URLs ──
    const subscription = Linking.addEventListener('url', async (event) => {
      if (!mounted) return;
      const url = event.url;
      if (url && isMagicLink(url) && url !== lastUrlRef.current) {
        lastUrlRef.current = url;
        await handleMagicLink(url);
        processedRef.current = true;
      }
    });

    // ── App returns to foreground: re-check initial URL ──
    // (Firebase might have processed the link in the background)
    const appStateSub = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'active' && mounted && !processedRef.current) {
        try {
          const url = await Linking.getInitialURL();
          if (url && isMagicLink(url) && url !== lastUrlRef.current) {
            lastUrlRef.current = url;
            await handleMagicLink(url);
            processedRef.current = true;
          }
        } catch {}
      }
    });

    return () => {
      mounted = false;
      subscription.remove();
      appStateSub.remove();
    };
  }, [handleMagicLink]);
}
