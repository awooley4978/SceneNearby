import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@firebase/auth';
import {
  onAuthChange,
  signInWithPassword,
  signUp,
  signOut,
  getCurrentUser,
  sendMagicLink,
  signInWithMagicLink,
  isMagicLink,
  getPendingMagicLinkEmail,
  signInAnonymously,
  MagicLinkState,
} from '../services/auth';
import { logEvent } from '../services/diagnostics';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  // Password auth (kept)
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
  // Magic Link
  magicLinkState: MagicLinkState;
  sendMagicLink: (email: string) => Promise<void>;
  handleMagicLink: (url: string) => Promise<boolean>;
  resetMagicLinkState: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => { throw new Error('AuthProvider not mounted'); },
  signUp: async () => { throw new Error('AuthProvider not mounted'); },
  signOut: async () => {},
  magicLinkState: { status: 'idle' },
  sendMagicLink: async () => {},
  handleMagicLink: async () => false,
  resetMagicLinkState: () => {},
});

// Dev bypass: skip Firebase auth entirely during development.
// DEV-builds only. In release/TestFlight builds real Firebase auth runs so that
// the signed-in email is genuine and email-gated features (admin dashboard,
// test-notification preview) are truly restricted to allowlisted accounts —
// not faked for every user as the owner.
const DEV_BYPASS = __DEV__;

const DEV_USER = {
  uid: 'dev-user-001',
  email: 'awooley4978@gmail.com',
  emailVerified: true,
  isAnonymous: false,
  metadata: {},
  providerData: [],
  refreshToken: '',
  tenantId: null,
  delete: async () => {},
  getIdToken: async () => 'dev-token',
  getIdTokenResult: async () => ({ token: 'dev-token', claims: {}, authTime: '', issuedAtTime: '', expirationTime: '', signInProvider: null, signInSecondFactor: null }),
  reload: async () => {},
  toJSON: () => ({}),
  displayName: 'Dev Tester',
  phoneNumber: null,
  photoURL: null,
  providerId: 'password',
} as unknown as User;

/**
 * DIAGNOSTIC (owner 09-07, auth/network-request-failed on cellular): Firebase's
 * @firebase/auth SDK throws `auth/network-request-failed` by wrapping a
 * non-FirebaseError in its fetch handler, but the SDK stores the ORIGINAL
 * underlying error string in `err.customData.message` — while the visible
 * `err.message` stays the generic "A network AuthError…" text. This helper pulls
 * that raw cause (plus a few other fields) out so the NEXT reproduction tells us
 * whether the failure was a fetch rejection (RN "TypeError: Network request
 * failed" / DNS / TLS) vs the SDK's 30–60s timeout. The result goes ONLY into the
 * diagnostics ring buffer (admin overlay) and console — it is never shown in the
 * user-visible error string, which is unchanged from before this diagnostic.
 */
function describeAuthError(err: any): string {
  const seg: string[] = [];
  const custom = err?.customData;
  if (custom && typeof custom === 'object') {
    if (custom.message != null) seg.push(`cause=${custom.message}`);
    if (custom.serverResponse?.error?.message) seg.push(`server=${custom.serverResponse.error.message}`);
  }
  if (err?.cause != null) seg.push(`errCause=${String(err.cause)}`);
  if (err?.name && err?.name !== 'Error') seg.push(`name=${err.name}`);
  if (err?.nativeErrorCode != null) seg.push(`nativeErrorCode=${err.nativeErrorCode}`);
  return seg.join(' | ');
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(
    DEV_BYPASS ? DEV_USER : getCurrentUser()
  );
  const [loading, setLoading] = useState(DEV_BYPASS ? false : true);
  const [magicLinkState, setMagicLinkState] = useState<MagicLinkState>({ status: 'idle' });

  // Restore pending email on mount
  useEffect(() => {
    getPendingMagicLinkEmail().then((email) => {
      if (email) {
        setMagicLinkState({ status: 'sent', email });
      }
    });
  }, []);

  // Auto-sign-in anonymously for dev testing
  useEffect(() => {
    if (DEV_BYPASS) return;
    const u = getCurrentUser();
    if (!u) {
      signInAnonymously().then((user) => {
        setUser(user);
        setLoading(false);
      }).catch(() => {
        setLoading(false);
      });
    }
  }, []);

  useEffect(() => {
    if (DEV_BYPASS) return;
    const unsub = onAuthChange((u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        // User signed in — clear magic link state
        setMagicLinkState({ status: 'idle' });
      }
    });
    return unsub;
  }, []);

  const handleSendMagicLink = useCallback(async (email: string) => {
    setMagicLinkState({ status: 'sending', email });
    try {
      await sendMagicLink(email);
      setMagicLinkState({ status: 'sent', email });
    } catch (err: any) {
      const code = err?.code || '';
      const msg = err?.message || '';
      const detail = describeAuthError(err);
      // Diagnostic detail stays in the ring buffer (admin overlay only), NOT in
      // the user-visible error string.
      logEvent('authError', `send code=${code} msg=${msg}${detail ? ` | ${detail}` : ''}`);
      console.error(`Magic link error: code=${code} msg=${msg}${detail ? ` | ${detail}` : ''}`, err);
      const isQuota = code.includes('quota') || code.includes('too-many');
      setMagicLinkState({
        status: 'error',
        email,
        error: isQuota
          ? `[${code}] Firebase daily email quota exceeded. Upgrade to Blaze plan or try again tomorrow.\n\n${msg}`
          : `[${code}] ${msg}`,
      });
    }
  }, []);

  const handleMagicLink = useCallback(async (url: string) => {
    if (!isMagicLink(url)) return false;

    setMagicLinkState((prev) => ({ ...prev, status: 'verifying' }));
    try {
      await signInWithMagicLink(url);
      // onAuthChange will handle clearing state when user updates
      return true;
    } catch (err: any) {
      const code = err?.code || '';
      const msg = err?.message || '';
      const detail = describeAuthError(err);
      // Diagnostic detail stays in the ring buffer (admin overlay only), NOT in
      // the user-visible error string.
      logEvent('authError', `verify code=${code} msg=${msg}${detail ? ` | ${detail}` : ''}`);
      console.error(`Magic link verify error: code=${code} msg=${msg}${detail ? ` | ${detail}` : ''}`, err);
      if (code === 'auth/missing-email' || msg.includes('missing-email') || msg.includes('Could not find the email')) {
        setMagicLinkState({ status: 'needEmail', error: 'Please enter the email you used to request the link.' });
      } else if (msg.includes('expired') || msg.includes('already used')) {
        setMagicLinkState({ status: 'invalid', error: 'This sign-in link has expired or was already used.' });
      } else if (msg.includes('different device')) {
        setMagicLinkState({ status: 'error', error: 'Open this link on the same device where you requested it.' });
      } else {
        setMagicLinkState({ status: 'error', error: `[${code}] ${msg}` || 'Could not verify sign-in link.' });
      }
      return false;
    }
  }, []);

  const resetMagicLinkState = useCallback(() => {
    setMagicLinkState({ status: 'idle' });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn: signInWithPassword,
        signUp,
        signOut,
        magicLinkState,
        sendMagicLink: handleSendMagicLink,
        handleMagicLink,
        resetMagicLinkState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
