/**
 * Shared API helper for all settings components.
 * Automatically injects x-tenant-slug headers and passes credentials.
 */

export function getApiConfig() {
  const apiBase = localStorage.getItem('hk_api_base') || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3008';
  const tenantSlug = localStorage.getItem('hk_tenant') || 'neuravolt';
  return { apiBase, tenantSlug };
}

export function apiHeaders(extra = {}) {
  const { tenantSlug } = getApiConfig();
  return {
    'x-tenant-slug': tenantSlug,
    ...extra
  };
}

export async function apiFetch(path, options = {}) {
  const { apiBase } = getApiConfig();
  const { headers = {}, ...rest } = options;
  return fetch(`${apiBase}${path}`, {
    headers: { ...apiHeaders(), ...headers },
    credentials: 'include',
    ...rest
  });
}
