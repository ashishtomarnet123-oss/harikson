import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [valDetails, setValDetails] = useState([]);
  const [success, setSuccess] = useState('');
  const [apiBase, setApiBase] = useState('http://localhost:3008');
  const [tenantSlug, setTenantSlug] = useState('system');

  useEffect(() => {
    const user = localStorage.getItem('hk_user');
    if (user) {
      router.replace('/chat');
      return;
    }

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

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setValDetails([]);
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 12) {
      setError('Password must be at least 12 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
        },
        credentials: 'include',
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.details && Array.isArray(data.details)) {
          setError(data.error || 'Password validation failed');
          setValDetails(data.details);
          setLoading(false);
          return;
        }
        throw new Error(data.error || 'Registration failed');
      }

      // Auto-login after successful registration
      localStorage.removeItem('hk_token');
      localStorage.setItem('hk_user', JSON.stringify(data.user));
      localStorage.setItem('hk_tenant', tenantSlug);
      localStorage.setItem('hk_api_base', apiBase);
      setSuccess('Account created! Redirecting…');
      setTimeout(() => router.replace('/chat'), 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign Up — Harikson AI</title>
        <meta name="description" content="Create your Harikson AI account" />
      </Head>

      <div className="login-root">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
        <div className="login-orb login-orb-3" />

        <div className="login-card" style={{ maxWidth: '440px' }}>
          {/* Logo */}
          <div className="login-logo">
            <div className="login-logo-icon">⚡</div>
            <div className="login-logo-text">Harikson AI</div>
          </div>

          <h1 className="login-title">Create your account</h1>
          <p className="login-subtitle">Join your Harikson workspace today</p>

          <form onSubmit={handleSignup} autoComplete="on">
            <div className="form-group">
              <label className="form-label" htmlFor="name">
                Full name
              </label>
              <input
                id="name"
                type="text"
                className="form-input"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>
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
                placeholder="Min 12 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={12}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                className="form-input"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading && <span className="login-spinner" />}
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          {error && (
            <div className="login-error">
              <div style={{ fontWeight: 'bold' }}>⚠ {error}</div>
              {valDetails.length > 0 && (
                <ul
                  style={{
                    margin: '8px 0 0 16px',
                    padding: 0,
                    fontSize: '12px',
                    textAlign: 'left',
                  }}
                >
                  {valDetails.map((detail, idx) => (
                    <li
                      key={idx}
                      style={{ listStyleType: 'disc', marginTop: '4px' }}
                    >
                      {detail}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {success && (
            <div
              style={{
                marginTop: '14px',
                padding: '10px 14px',
                background: 'rgba(34,197,94,0.12)',
                border: '1px solid rgba(34,197,94,0.25)',
                borderRadius: '6px',
                color: '#86efac',
                fontSize: '13px',
              }}
            >
              ✓ {success}
            </div>
          )}

          <p
            style={{
              marginTop: '20px',
              fontSize: '13px',
              color: 'var(--text-secondary)',
              textAlign: 'center',
            }}
          >
            Already have an account?{' '}
            <Link href="/login" passHref legacyBehavior>
              <a
                style={{
                  color: 'var(--accent)',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                Sign in
              </a>
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
