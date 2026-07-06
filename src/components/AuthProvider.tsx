/**
 * src/components/AuthProvider.tsx — minimal token store for the dashboard.
 *
 * In demo mode the provider boots with a `dev-bootstrap` token issued by
 * the backend on first need. In live mode the operator pastes a token from
 * `POST /api/auth/tokens` into the input.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

interface AuthState {
  token: string | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  setToken: (token: string | null) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "miro-workflows.auth.token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    if (typeof window === "undefined") return { token: null, loading: false, error: null };
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return { token: stored, loading: false, error: null };
  });

  const setToken = useCallback((token: string | null) => {
    setState((s) => ({ ...s, token }));
    if (typeof window === "undefined") return;
    if (token) window.localStorage.setItem(STORAGE_KEY, token);
    else window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  useEffect(() => {
    // If we already have a token in storage, nothing to do. The dashboard's
    // request layer reads it from localStorage and injects the Authorization
    // header; no separate "login" call is necessary in demo mode.
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    ...state,
    setToken,
    isAuthenticated: Boolean(state.token),
  }), [state, setToken]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
