// ── Google Play reviewer access (App Access) ──
// Google Play's App Access declaration does not allow reviewers to rely on a
// free trial to reach gated/paid content. Scene Nearby has no password login,
// so instead of credentials we expose a private deep link carrying a reusable
// review code that grants lifetime-equivalent access WITHOUT a purchase.
//
// Mechanism:
//   scenenearby://reviewer-access?code=<REVIEWER_ACCESS_CODE>
// When the app receives that link (cold start, warm start, or return-to-
// foreground), it calls grantUnlock(REVIEWER_TRANSACTION_ID) — the SAME
// permanent unlock a verified Apple lifetime purchase writes. No IAP, no
// account, no trial, and it never expires. Normal users see no change: the
// path only fires on an exact URL + code match.
//
// The code is a private static value shared only via Play Console's App Access
// instructions. It is stored here as a plain constant (a reusable review code
// by design). It is NOT a substitute for the real paywall — the verified
// purchase/restore path in entitlement.ts/iap.ts is unchanged.
import { grantUnlock } from './entitlement';

/** Distinct transaction id so reviewer-granted unlocks are traceable. */
export const REVIEWER_TRANSACTION_ID = 'google-play-reviewer-access';

const REVIEWER_ACCESS_CODE = '8a8eac7c0e39aaadce8ce14ac76eba195e5b3dbb7755331d';

const REVIEWER_URL_PREFIX = 'scenenearby://reviewer-access';

/** True when the URL targets the reviewer-access deep link. */
export function isReviewerAccessUrl(url: string): boolean {
  return typeof url === 'string' && url.startsWith(REVIEWER_URL_PREFIX);
}

/** Extract the `code` query parameter from the deep link (no URL global needed). */
export function getReviewerCodeFromUrl(url: string): string | null {
  const m = url.match(/[?&]code=([^&]+)/);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

/** Whether a supplied code matches the private reusable review code. */
export function isValidReviewerCode(code: string | null | undefined): boolean {
  return code === REVIEWER_ACCESS_CODE;
}

/**
 * Grant lifetime-equivalent access when the URL carries the correct code.
 * Returns true only when a grant was attempted and persisted successfully.
 */
export async function activateReviewerAccess(url: string): Promise<boolean> {
  if (!isReviewerAccessUrl(url)) return false;
  const code = getReviewerCodeFromUrl(url);
  if (!isValidReviewerCode(code)) return false;
  return grantUnlock(REVIEWER_TRANSACTION_ID);
}
