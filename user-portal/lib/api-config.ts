/**
 * Centralized API Resolution Configuration for User Portal
 */

export function getApiBaseUrl(): string {
  // 1. Explicit Environment Variable Override
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envUrl && envUrl.trim()) {
    const trimmed = envUrl.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('/')) {
      console.error(
        `❌ [API Config Error] Invalid NEXT_PUBLIC_API_BASE_URL "${trimmed}": must start with http://, https://, or /`
      );
    }
    return trimmed;
  }

  // 2. Subdomain Pattern matching (e.g. app.neuravolt.cloud -> api.neuravolt.cloud)
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    if (hostname.includes('.') && !hostname.startsWith('localhost') && !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      const parts = hostname.split('.');
      if (parts.length >= 2) {
        const domain = parts.slice(-2).join('.');
        return `${protocol}//api.${domain}`;
      }
    }
    // 3. Same-origin proxy fallback
    if (window.location.origin) {
      return `${window.location.origin}/api`;
    }
  }

  // 4. Local Development Fallback
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
