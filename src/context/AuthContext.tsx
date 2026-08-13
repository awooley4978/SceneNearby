// BISECT P1 STUB — replaces real AuthContext (firebase subtree) to isolate
// the production import graph. Real file restored in P2.
import React from 'react';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;

export const useAuth = () => ({ user: null, isAuthenticated: false, loading: false });
