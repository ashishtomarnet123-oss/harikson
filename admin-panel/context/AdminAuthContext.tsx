'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { deleteCookie } from 'cookies-next';

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

// ─────────────────────────────────────────────────────────────
//  Safe JSON fetch helper — never throws on HTML or invalid JSON
// ─────────────────────────────────────────────────────────────
async function safeFetchJson(
  url: string,
  options: RequestInit = {}
): Promise<{ res: Response | null; data: any }> {
  try {
    const res = await fetch(url, { ...options, credentials: 'include' });
    const text = await res.text().catch(() => '');
    let data: any = {};
    if (text && text.trim()) {
      try {
        data = JSON.parse(text);
      } catch {
        // Server returned plain-text or HTML (e.g. 500 Internal Server Error)
        data = {
          error: res.status >= 500
            ? 'Authentication service error. Please check server status.'
            : text.substring(0, 120),
        };
      }
    }
    return { res, data };
  } catch {
    return { res: null, data: { error: 'Network connection failure.' } };
  }
}

// ─────────────────────────────────────────────────────────────
//  Clear all auth cookies from browser
// ─────────────────────────────────────────────────────────────
function clearAuthCookies() {
  deleteCookie('admin_token');
  deleteCookie('admin_access_token');
  deleteCookie('admin_refresh_token');
}

// ─────────────────────────────────────────────────────────────
//  Normalise user object from either /api/auth/* or /admin/auth/me
// ─────────────────────────────────────────────────────────────
function parseUser(data: any): AdminUser | null {
  const u = data?.user ?? data;
  if (!u?.id && !u?.email) return null;

  const allowedRoles = ['admin', 'superadmin', 'founder'];
  if (!allowedRoles.includes(u.role)) return null;

  const isAdmin =
    u.role === 'admin' || u.role === 'superadmin' || u.role === 'founder' || u.isAdmin === true;
  const isFounder =
    u.role === 'founder' ||
    u.role === 'superadmin' ||
    u.email === 'founder@neuravolt.cloud' ||
    u.isFounder === true;

  return {
    id: u.id,
    email: u.email,
    role: u.role,
    name: u.email ? u.email.split('@')[0] : 'Administrator',
    isAdmin,
    isFounder,
  };
}

export const AdminAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  // ── checkAuth: try direct internal API first, then proxy fallback ──
  const checkAuth = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
    }

    try {
      // PRIMARY: /api/auth/me — internal Next.js API route (direct DB, no proxy needed)
      const { res: r1, data: d1 } = await safeFetchJson('/api/auth/me');
      if (r1?.ok) {
        const u = parseUser(d1);
        if (u) { setUser(u); return; }
      }

      // FALLBACK: /api-proxy/v1/admin/auth/me — proxy to admin-api
      const { res: r2, data: d2 } = await safeFetchJson('/api-proxy/v1/admin/auth/me');
      if (r2?.ok) {
        const u = parseUser(d2);
        if (u) { setUser(u); return; }
      }

      // Not authenticated
      clearAuthCookies();
      setUser(null);
    } catch {
      clearAuthCookies();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── login: try direct internal API first, then proxy fallback ──
  const login = async (email: string, password: string) => {
    setLoading(true);
    const body = JSON.stringify({ email: email.trim().toLowerCase(), password });
    const headers = { 'Content-Type': 'application/json' };

    try {
      // PRIMARY: /api/auth/login — internal Next.js route (direct DB)
      const { res: r1, data: d1 } = await safeFetchJson('/api/auth/login', {
        method: 'POST',
        headers,
        body,
      });

      if (r1 && r1.ok) {
        await checkAuth();
        router.replace('/admin/dashboard');
        return;
      }

      // If direct route returned a 4xx error (e.g. 401 Invalid credentials, 403 Suspended)
      if (r1 && r1.status >= 400 && r1.status < 500) {
        if (d1?.requirePasswordChange) {
          throw new Error(
            'You must change your password before accessing the dashboard. Please use the first-login reset link.'
          );
        }
        throw new Error(d1?.error || d1?.message || `Login failed (${r1.status})`);
      }

      // FALLBACK: try proxy /api-proxy/v1/admin/login
      const { res: r2, data: d2 } = await safeFetchJson('/api-proxy/v1/admin/login', {
        method: 'POST',
        headers,
        body,
      });

      if (r2 && r2.ok) {
        await checkAuth();
        router.replace('/admin/dashboard');
        return;
      }

      if (r2 && r2.status >= 400 && r2.status < 500) {
        if (d2?.requirePasswordChange) {
          throw new Error(
            'You must change your password before accessing the dashboard. Please use the first-login reset link.'
          );
        }
        throw new Error(d2?.error || d2?.message || `Login failed (${r2.status})`);
      }

      // Both paths failed (5xx error or unreachable)
      const serverErrMsg = d1?.error || d1?.message || d2?.error || d2?.message || 'Authentication service error (500). Please check backend database and API server.';
      throw new Error(serverErrMsg);
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
      await fetch('/api-proxy/v1/admin/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    } finally {
      clearAuthCookies();
      setUser(null);
      router.replace('/admin/login');
    }
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.isAdmin || false;
  const isFounder = user?.isFounder || false;

  return (
    <AdminAuthContext.Provider value={{ user, loading, isAuthenticated, isAdmin, isFounder, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => useContext(AdminAuthContext);
