import { getApiBaseUrl, getTenantSlug } from './api-config';

type EventName =
  | 'signup_completed'
  | 'login_success'
  | 'chat_message_sent'
  | 'model_selected'
  | 'rag_file_uploaded'
  | 'onboarding_completed'
  | 'onboarding_skipped'
  | 'page_viewed';

export function trackEvent(event: EventName, properties?: Record<string, string | number | boolean>): void {
  if (typeof window === 'undefined') return;

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
}
