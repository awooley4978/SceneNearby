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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(getCurrentUser());
  const [loading, setLoading] = useState(true);
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
      const isQuota = code.includes('quota') || code.includes('too-many');
      setMagicLinkState({
        status: 'error',
        email,
        error: isQuota
          ? "Email temporarily unavailable\n\nWe've reached today's email sign-in limit for our testing environment. Please try again tomorrow."
          : err?.message || 'Could not send link. Check your email and try again.',
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
      const msg = err?.message || '';
      if (msg.includes('expired') || msg.includes('already used')) {
        setMagicLinkState({ status: 'invalid', error: 'This sign-in link has expired or was already used.' });
      } else if (msg.includes('different device')) {
        setMagicLinkState({ status: 'error', error: 'Open this link on the same device where you requested it.' });
      } else {
        setMagicLinkState({ status: 'error', error: msg || 'Could not verify sign-in link.' });
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
