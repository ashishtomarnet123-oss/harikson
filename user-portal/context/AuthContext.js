import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { getApiConfig } from '../components/settings/apiHelper';

// ─── Proactive Refresh Interval ───────────────────────────────────────────────
// Refresh 5 min before the 1h token expires = every 55 minutes.
// Keeps users logged in indefinitely without any action required.
const REFRESH_INTERVAL_MS = 55 * 60 * 1000;

const AuthContext = createContext({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isEmailVerified: true,
  error: null,
  logout: async () => {},
  checkAuth: async () => {},
});

export function AuthProvider({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(true);
  const [error, setError] = useState(null);

  // Ref so timer/focus callbacks can read current auth state without stale closure
  const isAuthenticatedRef = useRef(false);
  useEffect(() => { isAuthenticatedRef.current = isAuthenticated; }, [isAuthenticated]);

  const clearAuthData = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('hk_user');
      localStorage.removeItem('hk_access_token');
      localStorage.removeItem('hk_refresh_token');
      localStorage.removeItem('is_impersonating');
      localStorage.removeItem('impersonating_user_email');
      localStorage.removeItem('impersonating_admin_email');
    }
    setUser(null);
    setIsAuthenticated(false);
    setIsEmailVerified(true);
  }, []);

  /** Silent token refresh — returns new access token string or null on failure. */
  const tryRefresh = useCallback(async () => {
    if (typeof window === 'undefined') return null;
    const { apiBase, tenantSlug } = getApiConfig();
    try {
      const storedRefreshToken = localStorage.getItem('hk_refresh_token');
      const res = await fetch(`${apiBase}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-slug': tenantSlug },
        credentials: 'include', // also sends hk_refresh_token HttpOnly cookie
        body: JSON.stringify({ refreshToken: storedRefreshToken || undefined }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const newToken = data.accessToken || data.token;
      if (newToken) {
        localStorage.setItem('hk_access_token', newToken);
        if (data.refreshToken) localStorage.setItem('hk_refresh_token', data.refreshToken);
        return newToken;
      }
    } catch {
      // Network error — do nothing, will retry on next interval or tab focus
    }
    return null;
  }, []);

  const checkAuth = useCallback(async () => {
    if (typeof window === 'undefined') return;

    const { apiBase, tenantSlug } = getApiConfig();
    const isPublicPage = [
      '/login', '/signup', '/verify-email',
      '/aup', '/privacy', '/terms', '/cookies', '/neuravolt', '/',
    ].includes(router.pathname);
    const storedToken = localStorage.getItem('hk_access_token');
    const storedUser = localStorage.getItem('hk_user');

    try {
      setIsLoading(true);
      const headers = { 'x-tenant-slug': tenantSlug };
      if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;

      let res = await fetch(`${apiBase}/api/auth/me`, {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      // Access token expired → try silent refresh before doing anything else
      if (res.status === 401) {
        const newToken = await tryRefresh();
        if (newToken) {
          res = await fetch(`${apiBase}/api/auth/me`, {
            method: 'GET',
            headers: { 'x-tenant-slug': tenantSlug, Authorization: `Bearer ${newToken}` },
            credentials: 'include',
          });
        }
      }

      if (res.status === 200) {
        const data = await res.json();
        if (data.status === 'pending' || data.status === 'pending_approval') {
          clearAuthData();
          if (!isPublicPage && router.pathname !== '/impersonate') router.replace('/login');
          return;
        }
        setUser(data);
        setIsAuthenticated(true);
        setIsEmailVerified(data.emailVerified !== false);
        setError(null);
        localStorage.setItem('hk_user', JSON.stringify(data));
        localStorage.setItem('hk_tenant', data.tenantSlug || tenantSlug);

      } else if (res.status === 403) {
        const data = await res.json();
        if (data.pendingApproval || data.code === 'ACCOUNT_PENDING_APPROVAL' || data.status === 'pending') {
          clearAuthData();
          if (!isPublicPage && router.pathname !== '/impersonate') router.replace('/login');
          return;
        }
        // Email not verified
        setUser(data.user || null);
        setIsAuthenticated(true);
        setIsEmailVerified(false);
        if (router.pathname !== '/verify-email') router.replace('/verify-email');

      } else if (res.status === 401) {
        // Both /me AND /refresh returned 401 — session is genuinely over.
        if (!storedToken && !storedUser) {
          // No session ever existed — redirect if on protected page
          clearAuthData();
          if (!isPublicPage && router.pathname !== '/impersonate') router.replace('/login');
        } else if (!isPublicPage) {
          // Had a session but server-side revoked it (admin logout, account deleted, etc.)
          clearAuthData();
          router.replace('/login?session_expired=true');
        }

      } else {
        // 5xx or unexpected — DO NOT log user out. Preserve session from localStorage.
        if (storedUser && storedToken) {
          try {
            const parsedUser = JSON.parse(storedUser);
            if (parsedUser.status !== 'pending' && parsedUser.status !== 'pending_approval') {
              setUser(parsedUser);
              setIsAuthenticated(true);
            } else {
              clearAuthData();
            }
          } catch { clearAuthData(); }
        }
      }
    } catch (err) {
      // Network offline / DNS failure — preserve session, never auto-logout
      console.warn('[Auth] Network error, preserving existing session:', err);
      if (storedUser && storedToken) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setIsAuthenticated(true);
        } catch { clearAuthData(); }
      }
    } finally {
      setIsLoading(false);
    }
  }, [router, clearAuthData, tryRefresh]);

  // ─── Initial auth check on mount ─────────────────────────────────────────
  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Proactive background refresh every 55 minutes ───────────────────────
  // Token is valid 1h; we refresh at 55m so there's a 5-min buffer.
  // Only fires when the user actually has an active session.
  useEffect(() => {
    const timer = setInterval(async () => {
      if (!isAuthenticatedRef.current) return;
      const newToken = await tryRefresh();
      if (!newToken) {
        // Refresh truly failed — run full checkAuth to determine whether to sign out
        await checkAuth();
      }
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [tryRefresh, checkAuth]);

  // ─── Refresh when user returns to the tab after being away ───────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isAuthenticatedRef.current) {
        await tryRefresh(); // silent — no spinner, no state change on success
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [tryRefresh]);

  const logout = useCallback(async () => {
    const { apiBase, tenantSlug } = getApiConfig();
    try {
      await fetch(`${apiBase}/api/auth/logout`, {
        method: 'POST',
        headers: { 'x-tenant-slug': tenantSlug },
        credentials: 'include',
      });
    } catch (err) {
      console.warn('Logout request failed:', err);
    } finally {
      clearAuthData();
      router.replace('/login');
    }
  }, [clearAuthData, router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated, isEmailVerified, error, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

export default AuthContext;
