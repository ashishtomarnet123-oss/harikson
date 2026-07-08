import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [apiBase, setApiBase] = useState('http://localhost:3008');
  const [tenantSlug, setTenantSlug] = useState('system');

  useEffect(() => {
    // Check if already logged in
    const token = localStorage.getItem('hk_token');
    if (token) {
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
          setApiBase(process.env.NEXT_PUBLIC_API_URL || `${window.location.protocol}//api.${hostname.split('.').slice(1).join('.')}`);
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
      const res = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      localStorage.setItem('hk_token', data.token);
      localStorage.setItem('hk_user', JSON.stringify(data.user));
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

          <h1 className="login-title">Welcome back</h1>
          <p className="login-subtitle">Sign in to your Harikson workspace</p>

          <form onSubmit={handleLogin} autoComplete="on">
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email address</label>
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
              <label className="form-label" htmlFor="password">Password</label>
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

          {error && (
            <div className="login-error">
              ⚠ {error}
            </div>
          )}

          <p style={{ marginTop: '20px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
            Secured by Harikson · Enterprise AI Platform
          </p>
        </div>
      </div>
    </>
  );
}
