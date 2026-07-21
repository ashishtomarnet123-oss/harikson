/**
 * Shared API helper for all settings components.
 * Automatically injects x-tenant-slug headers and passes credentials.
 */

export function getApiConfig() {
  const apiBase =
    (typeof window !== 'undefined' && localStorage.getItem('hk_api_base')) ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3008';
  const tenantSlug =
    (typeof window !== 'undefined' && localStorage.getItem('hk_tenant')) ||
    'neuravolt';
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
      if (typeof window !== 'undefined') {
        localStorage.removeItem('hk_user');
        localStorage.removeItem('hk_refresh_token');
        localStorage.removeItem('hk_access_token');
      }
      return null;
    }

    const data = await res.json();
    if (data.refreshToken && typeof window !== 'undefined') {
      localStorage.setItem('hk_refresh_token', data.refreshToken);
    }
    if (data.accessToken && typeof window !== 'undefined') {
      localStorage.setItem('hk_access_token', data.accessToken);
    }
    return data;
  } catch (err) {
    console.error('Failed to refresh auth token:', err);
    return null;
  }
}

export async function apiFetch(path, options = {}) {
  const { apiBase } = getApiConfig();
  const { headers = {}, ...rest } = options;

  let res = await fetch(`${apiBase}${path}`, {
    headers: { ...apiHeaders(), ...headers },
    credentials: 'include',
    ...rest,
  });

  // Handle 401 response with automatic token rotation retry
  if (
    res.status === 401 &&
    !path.includes('/auth/login') &&
    !path.includes('/auth/refresh')
  ) {
    const refreshedData = await refreshAuthToken();
    if (refreshedData) {
      res = await fetch(`${apiBase}${path}`, {
        headers: { ...apiHeaders(), ...headers },
        credentials: 'include',
        ...rest,
      });
    }

    if (res.status === 401 && typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('hk_user');
      localStorage.removeItem('hk_access_token');
      localStorage.removeItem('hk_refresh_token');
      localStorage.removeItem('is_impersonating');
      window.location.href = '/login?session_expired=true';
    }
  }

  return res;
}
