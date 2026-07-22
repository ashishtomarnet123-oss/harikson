/**
 * Frontend security helper module for user-portal.
 * Handles auth state cleanup and device fingerprint mismatch redirects.
 */

export function clearAuthState() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('hk_user');
    localStorage.removeItem('hk_refresh_token');
    localStorage.removeItem('hk_access_token');
  }
}

export function handleDeviceMismatch(customMessage) {
  clearAuthState();
  if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
    const msg = customMessage || 'For your security, please log in again on this device.';
    window.location.href = `/login?reason=device_mismatch&msg=${encodeURIComponent(msg)}`;
  }
}

export function handleRefreshSecurityError(res, data) {
  if (res.status === 403 || data?.code === 'DEVICE_MISMATCH') {
    handleDeviceMismatch(data?.error);
    return true;
  }
  return false;
}
