import { getApiBaseUrl, getTenantSlug } from '../../lib/api-config';
import { handleDeviceMismatch, clearAuthState } from '../../lib/security';

/**
 * Shared API helper for all settings components.
 * Automatically injects x-tenant-slug headers and passes credentials.
 */

export function getApiConfig() {
  const apiBase = getApiBaseUrl();
  const tenantSlug = getTenantSlug();
  return { apiBase, tenantSlug };
}

export function apiHeaders(extra = {}) {
  const { tenantSlug } = getApiConfig();
  return {
    'x-tenant-slug': tenantSlug,
    ...extra,
  };
}

/**
 * Call POST /api/auth/refresh to rotate access & refresh tokens.
 * Handles updated refresh tokens returned in JSON body and HttpOnly cookies.
 */
export async function refreshAuthToken() {
  const { apiBase, tenantSlug } = getApiConfig();
  const storedRefreshToken =
    typeof window !== 'undefined' ? localStorage.getItem('hk_refresh_token') : null;

  try {
    const res = await fetch(`${apiBase}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-slug': tenantSlug,
      },
      credentials: 'include',
      body: JSON.stringify({ refreshToken: storedRefreshToken || undefined }),
    });

    if (!res.ok) {
      if (res.status === 403) {
        let errorData = null;
        try {
          errorData = await res.json();
        } catch (e) {}
        handleDeviceMismatch(errorData?.error || 'For your security, please log in again on this device.');
      } else {
        clearAuthState();
      }
      return null;
    }

    const data = await res.json();
    const tokenToSave = data.accessToken || data.token;
    if (tokenToSave && typeof window !== 'undefined') {
      localStorage.setItem('hk_access_token', tokenToSave);
    }
    if (data.refreshToken && typeof window !== 'undefined') {
      localStorage.setItem('hk_refresh_token', data.refreshToken);
    }
    return tokenToSave || true;
  } catch (err) {
    console.error('Failed to refresh auth token:', err);
    return null;
  }
}

/**
 * Wrapper around fetch that automatically handles auth headers and token refresh on 401.
 */
export async function authenticatedFetch(url, options = {}) {
  const { tenantSlug } = getApiConfig();
  const headers = new Headers(options.headers || {});
  headers.set('x-tenant-slug', tenantSlug);

  const token = typeof window !== 'undefined' ? localStorage.getItem('hk_access_token') : null;
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Rewrite unreachable localhost:3008 URLs to relative paths on remote host
  let targetUrl = url;
  if (
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1' &&
    targetUrl.startsWith('http://localhost:3008')
  ) {
    targetUrl = targetUrl.replace('http://localhost:3008', '');
  }

  let res = await fetch(targetUrl, { ...options, headers, credentials: 'include' });

  // If 401 Unauthenticated, attempt token refresh once
  if (res.status === 401) {
    const newToken = await refreshAuthToken();
    if (newToken) {
      const retryHeaders = new Headers(options.headers || {});
      retryHeaders.set('x-tenant-slug', tenantSlug);
      retryHeaders.set('Authorization', `Bearer ${newToken}`);
      res = await fetch(url, { ...options, headers: retryHeaders, credentials: 'include' });
    } else {
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login?session_expired=true';
      }
    }
  }

  return res;
}
