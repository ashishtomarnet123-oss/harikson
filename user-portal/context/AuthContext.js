import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { getApiConfig } from '../components/settings/apiHelper';

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

  const checkAuth = useCallback(async () => {
    if (typeof window === 'undefined') return;

    const { apiBase, tenantSlug } = getApiConfig();
    const isPublicPage = ['/login', '/signup', '/verify-email', '/aup', '/privacy', '/terms', '/cookies', '/neuravolt', '/'].includes(router.pathname);
    const storedToken = localStorage.getItem('hk_access_token');
    const storedUser = localStorage.getItem('hk_user');

    try {
      setIsLoading(true);
      const headers = {
        'x-tenant-slug': tenantSlug,
      };
      if (storedToken) {
        headers['Authorization'] = `Bearer ${storedToken}`;
      }

      const res = await fetch(`${apiBase}/api/auth/me`, {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      if (res.status === 200) {
        const data = await res.json();
        if (data.status === 'pending' || data.status === 'pending_approval') {
          clearAuthData();
          if (!isPublicPage && router.pathname !== '/impersonate') {
            router.replace('/login');
          }
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
          if (!isPublicPage && router.pathname !== '/impersonate') {
            router.replace('/login');
          }
          return;
        }
        // Email not verified
        setUser(data.user || null);
        setIsAuthenticated(true);
        setIsEmailVerified(false);
        if (router.pathname !== '/verify-email') {
          router.replace('/verify-email');
        }
      } else if (res.status === 401) {
        if (!storedToken && !storedUser) {
          clearAuthData();
          if (!isPublicPage && router.pathname !== '/impersonate') {
            router.replace('/login');
          }
        } else if (!isPublicPage) {
          clearAuthData();
          router.replace('/login?session_expired=true');
        }
      } else {
        if (storedUser && storedToken) {
          try {
            const parsedUser = JSON.parse(storedUser);
            if (parsedUser.status === 'pending' || parsedUser.status === 'pending_approval') {
              clearAuthData();
            } else {
              setUser(parsedUser);
              setIsAuthenticated(true);
            }
          } catch {
            clearAuthData();
          }
        } else {
          clearAuthData();
        }
      }
    } catch (err) {
      console.error('Auth verification error:', err);
      if (storedUser && storedToken) {
        try {
          setUser(JSON.parse(storedUser));
          setIsAuthenticated(true);
        } catch (e) {
          clearAuthData();
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [router, clearAuthData]);

  useEffect(() => {
    checkAuth();
  }, []);

  const logout = useCallback(async () => {
    const { apiBase, tenantSlug } = getApiConfig();
    try {
      await fetch(`${apiBase}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'x-tenant-slug': tenantSlug,
        },
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
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        isEmailVerified,
        error,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
