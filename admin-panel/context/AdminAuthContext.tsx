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
      const token =
        getCookie('admin_token') ||
        (typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null);

      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      const res = await fetch(`${apiBase}/v1/admin/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
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
        if (typeof window !== 'undefined') {
          localStorage.setItem('admin_user', JSON.stringify(adminUserData));
        }
      } else {
        deleteCookie('admin_token');
        if (typeof window !== 'undefined') {
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_user');
        }
        setUser(null);
      }
    } catch (err) {
      console.warn('Error checking admin auth session:', err);
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
      const res = await fetch(`${apiBase}/v1/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      setCookie('admin_token', data.token, { maxAge: 24 * 60 * 60 });
      if (typeof window !== 'undefined') {
        localStorage.setItem('admin_token', data.token);
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
      const token =
        getCookie('admin_token') ||
        (typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null);
      await fetch(`${apiBase}/v1/admin/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    } finally {
      deleteCookie('admin_token');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
      }
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
