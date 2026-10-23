import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi } from '../api/endpoints';
import { UNAUTHORIZED_EVENT } from '../api/client';
import type { RegisterInput, User } from '../api/types';

interface AuthState {
  user: User | null;
  /** True while the app checks whether a login cookie already exists. */
  loading: boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  /** Re-reads the signed-in user from the API (after a profile change). */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/** Where each role lands after signing in. */
export const homeFor = (user: User) => (user.role === 'Admin' ? '/admin' : '/dashboard');

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On first load, ask the API who is signed in (the cookie is sent automatically).
  useEffect(() => {
    let cancelled = false;
    authApi.me()
      .then((u) => { if (!cancelled) setUser(u); })
      .catch(() => { if (!cancelled) setUser(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // The API said 401 on a normal request: the session ended, so reflect that in the UI.
  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe: boolean) => {
    const res = await authApi.login(email, password, rememberMe);
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback((input: RegisterInput) => authApi.register(input), []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* already signed out on the server */ }
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try { setUser(await authApi.me()); } catch { /* keep the current user */ }
  }, []);

  const value = useMemo(() => ({ user, loading, login, register, logout, refreshUser }),
    [user, loading, login, register, logout, refreshUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
