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
  const [tenantSlug, setTenantSlug] = useState('system');
  const [requires2FA, setRequires2FA] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [userId, setUserId] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const impersonateToken = urlParams.get('impersonate_token');
      const tenant = urlParams.get('tenant') || 'system';
      if (impersonateToken) {
        localStorage.removeItem('hk_user');
        const host = window.location.host;
        const domainSuffix = host.includes('neuravolt.cloud')
          ? '; Domain=.neuravolt.cloud'
          : '';
        document.cookie = `hk_access_token=${impersonateToken}; Path=/; Max-Age=${5 * 60}${domainSuffix}`;
        
        const resolvedApiBase = window.location.port
          ? `http://${window.location.hostname}:3008`
          : (process.env.NEXT_PUBLIC_API_URL || `${window.location.protocol}//api.${window.location.hostname.split('.').slice(1).join('.')}`);

        fetch(`${resolvedApiBase}/api/v1/user/profile`, {
          headers: {
            'x-tenant-slug': tenant,
            'Authorization': `Bearer ${impersonateToken}`
          }
        })
          .then(res => res.json())
          .then(data => {
            localStorage.setItem('hk_user', JSON.stringify({
              id: data.id || 'impersonated-user-id',
              email: data.email,
              role: data.role || 'user',
              tenantSlug: tenant
            }));
            localStorage.setItem('hk_tenant', tenant);
            localStorage.setItem('hk_api_base', resolvedApiBase);
            localStorage.setItem('is_impersonating', 'true');
            localStorage.setItem('impersonating_user_email', data.email);
            router.replace('/chat');
          })
          .catch(err => {
            console.error('Failed to resolve impersonated profile:', err);
            setError('Impersonation failed: session expired or invalid.');
          });
        return;
      }
    }

    // Check if already logged in
    const user = localStorage.getItem('hk_user');
    if (user) {
      router.replace('/chat');
      return;
    }
    // Resolve API base and tenant slug from URL
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        if (window.location.port) {
          setApiBase(`http://${hostname}:3008`);
        } else {
          setApiBase(
            process.env.NEXT_PUBLIC_API_URL ||
              `${window.location.protocol}//api.${hostname.split('.').slice(1).join('.')}`
          );
        }
        const parts = hostname.split('.');
        const isIP = !isNaN(parts[0]);
        if (!isIP && parts[0] !== 'www') {
          setTenantSlug(parts[0]);
        } else {
          const urlParams = new URLSearchParams(window.location.search);
          setTenantSlug(urlParams.get('tenant') || 'system');
        }
      }
    }
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      if (data.requires2FA) {
        setRequires2FA(true);
        setUserId(data.userId);
        setLoading(false);
        return;
      }

      localStorage.setItem('hk_token', data.accessToken || '');
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
      const res = await fetch(`${apiBase}/api/v1/auth/login/2fa`, {
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

      localStorage.setItem('hk_token', data.accessToken || '');
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
                <label className="form-label" htmlFor="password">
                  Password
                </label>
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
