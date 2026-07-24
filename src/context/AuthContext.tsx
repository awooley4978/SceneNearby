import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from 'firebase/auth';
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
  MagicLinkState,
} from '../services/auth';

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

// Dev bypass: skip Firebase auth entirely during development
const DEV_BYPASS = true; // Always on for dev client testing

const DEV_USER = {
  uid: 'dev-user-001',
  email: 'dev@scenenearby.app',
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
      console.error('Magic link error:', code, msg);
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
