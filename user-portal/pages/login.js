import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [apiBase, setApiBase] = useState('http://localhost:3008');
  const [tenantSlug, setTenantSlug] = useState(
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG) || 'neuravolt'
  );
  const [requires2FA, setRequires2FA] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);
  const [deviceMismatch, setDeviceMismatch] = useState(false);
  const [accountLocked, setAccountLocked] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [unlockMsg, setUnlockMsg] = useState('');
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);
  const [requireVerification, setRequireVerification] = useState(false);
  const [userId, setUserId] = useState('');
  const [resendStatus, setResendStatus] = useState('');

  useEffect(() => {
    if (!accountLocked || lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setAccountLocked(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [accountLocked, lockoutSeconds]);

  const handleUnlockRequest = async () => {
    if (!email) {
      setError('Please enter your email address above to receive an unlock link.');
      return;
    }
    setUnlockMsg('Sending unlock link...');
    try {
      const res = await fetch(`${apiBase}/api/auth/unlock-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setUnlockMsg(data.message || 'Unlock email sent if account is locked.');
    } catch (err) {
      setUnlockMsg('Failed to send unlock email.');
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('session_expired') === 'true' || router.query.session_expired === 'true') {
        setSessionExpired(true);
      }
      if (urlParams.get('reason') === 'device_mismatch' || router.query.reason === 'device_mismatch') {
        setDeviceMismatch(true);
      }
      if (urlParams.get('verified') === 'true' || router.query.verified === 'true') {
        setVerifiedSuccess(true);
      }
    }
  }, [router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const impersonateToken = urlParams.get('impersonate_token') || urlParams.get('token');
      if (impersonateToken) {
        router.replace(`/impersonate?token=${impersonateToken}`);
        return;
      }
    }

    // Resolve API base and tenant slug from URL
    // Default slug: env var > localStorage last-known > 'neuravolt'
    const defaultTenantSlug =
      process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG ||
      (typeof window !== 'undefined' && localStorage.getItem('hk_tenant')) ||
      'neuravolt';
    let resolvedApiBase = 'http://localhost:3008';
    let resolvedTenantSlug = defaultTenantSlug;
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        if (window.location.port) {
          resolvedApiBase = `http://${hostname}:3008`;
        } else {
          resolvedApiBase =
            process.env.NEXT_PUBLIC_API_URL ||
              `${window.location.protocol}//api.${hostname.split('.').slice(1).join('.')}`;
        }
        const parts = hostname.split('.');
        const isIP = !isNaN(Number(parts[0]));
        const urlParams = new URLSearchParams(window.location.search);
        if (!isIP && parts[0] !== 'www') {
          // Subdomain-based routing: e.g., acme.neuravolt.cloud → slug=acme
          resolvedTenantSlug = parts[0];
        } else if (urlParams.get('tenant')) {
          // Explicit ?tenant= param takes precedence over default
          resolvedTenantSlug = urlParams.get('tenant');
        }
        // else: keep defaultTenantSlug (IP access, no subdomain, no ?tenant=)
      }
      setApiBase(resolvedApiBase);
      setTenantSlug(resolvedTenantSlug);
    }

    // Only attempt auto-redirect if not explicitly session_expired
    const isSessionExpired =
      (typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).get('session_expired') === 'true') ||
      router.query.session_expired === 'true';

    if (!isSessionExpired) {
      fetch(`${resolvedApiBase}/api/auth/me`, {
        credentials: 'include',
        headers: {
          'x-tenant-slug': resolvedTenantSlug,
        },
      })
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error('Not authenticated');
        })
        .then((data) => {
          localStorage.setItem(
            'hk_user',
            JSON.stringify({
              id: data.id,
              email: data.email,
              role: data.role,
              tenantSlug: resolvedTenantSlug,
            })
          );
          localStorage.setItem('hk_tenant', resolvedTenantSlug);
          localStorage.setItem('hk_api_base', resolvedApiBase);
          router.replace('/chat');
        })
        .catch(() => {
          localStorage.removeItem('hk_user');
          localStorage.removeItem('hk_access_token');
          localStorage.removeItem('hk_refresh_token');
        });
    } else {
      localStorage.removeItem('hk_user');
      localStorage.removeItem('hk_access_token');
      localStorage.removeItem('hk_refresh_token');
    }
  }, [router]);

  const handleResendVerification = async () => {
    if (!email) {
      setError('Please enter your email address above to resend verification link.');
      return;
    }
    setResendStatus('Sending verification email...');
    try {
      const res = await fetch(`${apiBase}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setResendStatus(data.message || 'Verification email resent if account exists.');
    } catch (err) {
      setResendStatus('Failed to resend verification email.');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setRequireVerification(false);
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.status === 429 && data.locked) {
        setAccountLocked(true);
        setLockoutSeconds(data.retryAfter || 3600);
        setError(data.error || 'Account is temporarily locked due to multiple failed login attempts.');
        setLoading(false);
        return;
      }

      if (res.status === 403 && data.requireVerification) {
        setRequireVerification(true);
        setError('Email verification required. Please check your inbox or resend verification link.');
        setLoading(false);
        return;
      }

      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      if (data.requires2FA) {
        setRequires2FA(true);
        setUserId(data.userId);
        setLoading(false);
        return;
      }

      if (data.refreshToken) {
        localStorage.setItem('hk_refresh_token', data.refreshToken);
      }
      if (data.accessToken) {
        localStorage.setItem('hk_access_token', data.accessToken);
      }
      localStorage.setItem('hk_user', JSON.stringify({ ...data.user, tenantSlug }));
      localStorage.setItem('hk_tenant', tenantSlug);
      localStorage.setItem('hk_api_base', apiBase);
      router.replace('/chat');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handle2FAVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/auth/login/2fa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
        },
        credentials: 'include',
        body: JSON.stringify({ userId, code: totpCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      if (data.refreshToken) {
        localStorage.setItem('hk_refresh_token', data.refreshToken);
      }
      if (data.accessToken) {
        localStorage.setItem('hk_access_token', data.accessToken);
      }
      localStorage.setItem('hk_user', JSON.stringify({ ...data.user, tenantSlug }));
      localStorage.setItem('hk_tenant', tenantSlug);
      localStorage.setItem('hk_api_base', apiBase);
      router.replace('/chat');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Login — Harikson AI</title>
        <meta name="description" content="Sign in to Harikson AI Platform" />
      </Head>

      <div className="login-root">
        {/* Decorative orbs */}
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
        <div className="login-orb login-orb-3" />

        <div className="login-card">
          {/* Logo */}
          <div className="login-logo">
            <div className="login-logo-icon">⚡</div>
            <div className="login-logo-text">Harikson AI</div>
          </div>

          <h1 className="login-title">{requires2FA ? 'Two-Factor Verification' : 'Welcome back'}</h1>
          <p className="login-subtitle">
            {requires2FA ? 'Enter your 6-digit authenticator code or backup code' : 'Sign in to your Harikson workspace'}
          </p>

          {verifiedSuccess && (
            <div style={{
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34d399',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              marginBottom: '20px',
            }}>
              ✓ Email verified successfully! You may now sign in to your workspace.
            </div>
          )}

          {requireVerification && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              marginBottom: '20px',
            }}>
              <p style={{ margin: 0, fontWeight: 'bold' }}>Email Verification Required</p>
              <p style={{ margin: '4px 0 10px 0', fontSize: '13px' }}>Please check your email inbox for the verification link.</p>
              <button
                type="button"
                onClick={handleResendVerification}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                Resend Verification Email
              </button>
              {resendStatus && (
                <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#93c5fd' }}>{resendStatus}</p>
              )}
            </div>
          )}

          {accountLocked && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              marginBottom: '20px',
            }}>
              <p style={{ margin: 0, fontWeight: 'bold' }}>Account Temporarily Locked</p>
              <p style={{ margin: '4px 0 8px 0', fontSize: '13px' }}>
                Auto-unlock in: <strong>{Math.floor(lockoutSeconds / 60)}m {lockoutSeconds % 60}s</strong>
              </p>
              <button
                type="button"
                onClick={handleUnlockRequest}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                Send Unlock Email
              </button>
              {unlockMsg && (
                <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#fca5a5' }}>{unlockMsg}</p>
              )}
            </div>
          )}

          {sessionExpired && (
            <div style={{
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#fbbf24',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>⚠️</span>
              <span>Your session has expired. Please log in again.</span>
            </div>
          )}

          {deviceMismatch && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>🛡️</span>
              <span>For your security, please log in again on this device.</span>
            </div>
          )}

          {requires2FA ? (
            <form onSubmit={handle2FAVerify}>
              <div className="form-group">
                <label className="form-label" htmlFor="totpCode">
                  Verification Code
                </label>
                <input
                  id="totpCode"
                  type="text"
                  className="form-input"
                  placeholder="Enter code"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading && <span className="login-spinner" />}
                {loading ? 'Verifying…' : 'Verify'}
              </button>

              <button
                type="button"
                className="btn-secondary"
                style={{ width: '100%', marginTop: '10px', background: 'transparent', border: '1px solid var(--border)' }}
                onClick={() => {
                  setRequires2FA(false);
                  setTotpCode('');
                  setUserId('');
                }}
              >
                Back to Login
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} autoComplete="on">
              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" htmlFor="password" style={{ margin: 0 }}>
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    style={{ fontSize: '12px', color: '#6366f1', textDecoration: 'none', fontWeight: '500' }}
                  >
                    Forgot password?
                  </Link>
                </div>
                <input
                  id="password"
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading && <span className="login-spinner" />}
                {loading ? 'Signing in…' : 'Sign in'}
              </button>

              <div style={{ margin: '20px 0', textAlign: 'center', position: 'relative' }}>
                <hr style={{ borderColor: 'var(--border, #334155)', margin: 0 }} />
                <span style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: 'var(--surface, #1e293b)', padding: '0 10px', fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
                  OR CONTINUE WITH
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <a
                  href={`${apiBase}/api/auth/google`}
                  className="btn-secondary"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', fontSize: '13px', textDecoration: 'none', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border, #334155)', borderRadius: '8px', color: '#fff' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#ea4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.3 8.9 5 12 5z"/><path fill="#4285f4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/><path fill="#fbbc05" d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.6 7.2C.6 9.2 0 11.5 0 14s.6 4.8 1.6 6.8l3.7-2.9z"/><path fill="#34a853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.3-6.7-5.3L1.6 16C3.5 19.8 7.4 23 12 23z"/></svg>
                  Google
                </a>
                <a
                  href={`${apiBase}/api/auth/microsoft`}
                  className="btn-secondary"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', fontSize: '13px', textDecoration: 'none', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border, #334155)', borderRadius: '8px', color: '#fff' }}
                >
                  <svg width="16" height="16" viewBox="0 0 23 23"><path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M12 1h10v10H12z"/><path fill="#05a6f0" d="M1 12h10v10H1z"/><path fill="#ffba08" d="M12 12h10v10H12z"/></svg>
                  Microsoft
                </a>
              </div>
            </form>
          )}

          {error && <div className="login-error">⚠ {error}</div>}

          <p
            style={{
              marginTop: '20px',
              fontSize: '12px',
              color: 'var(--text-muted)',
              textAlign: 'center',
            }}
          >
            Secured by Harikson · Enterprise AI Platform
          </p>

          <p
            style={{
              marginTop: '10px',
              fontSize: '13px',
              color: 'var(--text-secondary)',
              textAlign: 'center',
            }}
          >
            Don&apos;t have an account?{' '}
            <Link href="/signup" passHref legacyBehavior>
              <a
                style={{
                  color: 'var(--accent)',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                Sign up
              </a>
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
