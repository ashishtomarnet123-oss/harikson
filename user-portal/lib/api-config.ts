/**
 * Centralized API Resolution Configuration for User Portal
 */

export function getApiBaseUrl(): string {
  // 1. Browser Environment Resolution — takes priority over the env var
  // below. Any non-localhost browser access (a raw VM IP like
  // 154.201.127.68:3028, or a bare production domain like xarwiz.com with
  // no explicit port) must go through *this* Next.js server's own
  // rewrites() proxy (same origin) rather than a separate absolute API
  // domain — that domain can be renamed/migrated (as happened moving from
  // api.neuravolt.cloud to xarwiz.com) without ever needing a matching
  // frontend code change, since the browser never needs to know it exists.
  // This used to also require window.location.port to be set, which meant
  // bare-domain access (no port, e.g. https://xarwiz.com) fell through to
  // the stale NEXT_PUBLIC_API_BASE_URL env var below instead.
  if (typeof window !== 'undefined') {
    const isDirectAccess =
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1';

    const saved = localStorage.getItem('hk_api_base');
    if (saved && saved.trim()) {
      const trimmed = saved.trim();
      // Discard a stale cached value: either the old tenant-api-fixed-port
      // bug (:3008, no longer valid — see docker-compose.yml), or any
      // absolute URL cached while this same priority bug was still active
      // (this function used to always return the env var first, so
      // hk_api_base may already hold `https://api.neuravolt.cloud` from
      // before this fix).
      const isStale = /:3008$/.test(trimmed) || (isDirectAccess && /^https?:\/\//.test(trimmed));
      if (!isStale) {
        return trimmed;
      }
    }

    if (isDirectAccess) {
      return '';
    }
  }

  // 2. Explicit Environment Variable Override — only reached for bare
  // production-domain access (no explicit port) or during SSR.
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim();
  }

  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return '';
  }

  // 3. Local Development Fallback
  return 'http://localhost:3008';
}

/**
 * Tenant Slug Resolution Engine
 */
export function getTenantSlug(): string {
  if (typeof window === 'undefined') {
    return 'default';
  }

  // 1. Read from localStorage
  const storedTenant = localStorage.getItem('hk_tenant');
  if (storedTenant && storedTenant.trim()) {
    return storedTenant.trim();
  }

  // 2. Read from ?tenant= URL Query Parameter
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const paramTenant = urlParams.get('tenant');
    if (paramTenant && paramTenant.trim()) {
      return paramTenant.trim();
    }
  } catch (err) {
    // Ignore URL search params error
  }

  // 3. Extract from Subdomain (first segment)
  const hostname = window.location.hostname;
  if (hostname.includes('.') && !hostname.startsWith('localhost') && !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    const firstSegment = hostname.split('.')[0];
    const reservedSubdomains = ['app', 'www', 'api', 'admin', 'neuravolt'];
    if (firstSegment && !reservedSubdomains.includes(firstSegment.toLowerCase())) {
      return firstSegment.toLowerCase();
    }
  }

  // 4. Default Fallback with Warning
  console.warn('⚠️ [API Config Warning] Tenant not configured. Falling back to "default".');
  return 'default';
}

/**
 * Centralized Fetch Wrapper with Error Validation and Auth/Tenant Headers
 */
export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const baseUrl = getApiBaseUrl();
  const tenantSlug = getTenantSlug();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${baseUrl}${cleanEndpoint}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Attach Tenant Header
  if (!headers.has('x-tenant-slug')) {
    headers.set('x-tenant-slug', tenantSlug);
  }

  // Attach Auth Token if available
  if (typeof window !== 'undefined' && !headers.has('Authorization')) {
    const token = localStorage.getItem('hk_access_token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers,
    });

    // Handle Unauthenticated (401) Gracefully
    if (response.status === 401 && typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('hk_access_token');
      localStorage.removeItem('hk_user');
      window.location.href = '/login?session_expired=true';
    }

    return response;
  } catch (error: any) {
    console.error(`❌ [API Fetch Error] Failed request to ${fullUrl}:`, error);

    if (error.name === 'TypeError' || error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      throw new Error('Cannot connect to API server. Please verify network connection or DNS settings.');
    }

    throw error;
  }
}
