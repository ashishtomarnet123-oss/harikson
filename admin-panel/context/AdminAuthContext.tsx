'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCookie, setCookie, deleteCookie } from 'cookies-next';

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  name?: string;
  isAdmin: boolean;
  isFounder: boolean;
}

interface AdminAuthContextType {
  user: AdminUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isFounder: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  isAdmin: false,
  isFounder: false,
  login: async () => {},
  logout: async () => {},
});

export const AdminAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();
  const apiBase = '/api-proxy';

  const checkAuth = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
      }

      let res = await fetch(`${apiBase}/v1/admin/auth/me`, {
        credentials: 'include',
      }).catch(() => null);

      if (!res || !res.ok) {
        // Fallback to internal Next.js auth endpoint if proxy fails
        res = await fetch(`/api/auth/me`, {
          credentials: 'include',
        }).catch(() => null);
      }

      if (res && res.status === 401) {
        const refreshRes = await fetch(`${apiBase}/v1/admin/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        }).catch(() => null);

        if (refreshRes && refreshRes.ok) {
          res = await fetch(`${apiBase}/v1/admin/auth/me`, {
            credentials: 'include',
          }).catch(() => null);
        }
      }

      if (res && res.ok) {
        const text = await res.text();
        let data: any = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          data = {};
        }

        if (data.user) {
          const u = data.user;
          const isAdmin =
            u.role === 'admin' ||
            u.role === 'superadmin' ||
            u.role === 'founder' ||
            u.isAdmin === true;
          const isFounder =
            u.role === 'founder' ||
            u.role === 'superadmin' ||
            u.email === 'founder@neuravolt.cloud' ||
            u.isFounder === true;

          const adminUserData: AdminUser = {
            id: u.id,
            email: u.email,
            role: u.role,
            name: u.email ? u.email.split('@')[0] : 'Administrator',
            isAdmin,
            isFounder,
          };

          setUser(adminUserData);
          return;
        }
      }

      deleteCookie('admin_token');
      deleteCookie('admin_access_token');
      deleteCookie('admin_refresh_token');
      setUser(null);
    } catch (err) {
      console.warn('Error checking admin auth session:', err);
      deleteCookie('admin_token');
      deleteCookie('admin_access_token');
      deleteCookie('admin_refresh_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      let res: Response | null = null;
      let isProxyError = false;

      try {
        res = await fetch(`${apiBase}/v1/admin/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
          credentials: 'include',
        });
      } catch (e) {
        isProxyError = true;
      }

      // If gateway returns 500/502/503/504 or network error, fallback to native route
      if (isProxyError || !res || (res.status >= 500 && res.status <= 504)) {
        res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
          credentials: 'include',
        }).catch(() => null);
      }

      if (!res) {
        throw new Error('Unable to reach authentication service. Please check network connection.');
      }

      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (jsonErr) {
        if (!res.ok) {
          throw new Error('Authentication gateway error (500). Please try again in a few moments.');
        }
        data = {};
      }

      if (!res.ok) {
        if (data.requirePasswordChange) {
          throw new Error('First login password change required. Please use the reset link or first-login page.');
        }
        throw new Error(data.error || data.message || `Authentication failed (${res.status})`);
      }

      await checkAuth();
      router.replace('/admin/dashboard');
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await fetch(`${apiBase}/v1/admin/logout`, {
        method: 'POST',
        credentials: 'include',
      }).catch(() => {});
    } finally {
      deleteCookie('admin_token');
      deleteCookie('admin_access_token');
      deleteCookie('admin_refresh_token');
      setUser(null);
      router.replace('/admin/login');
    }
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.isAdmin || false;
  const isFounder = user?.isFounder || false;

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        isAdmin,
        isFounder,
        login,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => useContext(AdminAuthContext);
