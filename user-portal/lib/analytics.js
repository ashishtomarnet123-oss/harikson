import { getApiBaseUrl, getTenantSlug } from './api-config';

export function trackEvent(event, properties) {
  if (typeof window === 'undefined') return;

  try {
    const token = localStorage.getItem('hk_access_token');
    if (!token) return;

    const baseUrl = getApiBaseUrl();
    const tenantSlug = getTenantSlug();

    const payload = {
      action: event,
      details: properties ? JSON.stringify(properties) : null,
    };

    fetch(`${baseUrl}/api/v1/analytics/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-tenant-slug': tenantSlug,
      },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch (e) {
    // Analytics must never crash the app
  }
}
