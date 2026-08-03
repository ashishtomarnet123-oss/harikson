import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [valDetails, setValDetails] = useState([]);
  const [success, setSuccess] = useState('');
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const [apiBase, setApiBase] = useState('');
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
        // Relative path — Next.js's rewrites() proxies /api/* to tenant-api
        // server-side, same origin, regardless of what domain is actually
        // being visited or whether it has an explicit port.
        setApiBase('');
        const parts = hostname.split('.');
        const isIP = !isNaN(parts[0]);
        // A genuine tenant subdomain needs at least 3 labels
        // (acme.xarwiz.com) — a bare domain (xarwiz.com) only has 2, and
        // its first label isn't a tenant slug, it's just the domain name.
        const hasSubdomain = parts.length >= 3;
        if (!isIP && hasSubdomain && parts[0] !== 'www') {
          setTenantSlug(parts[0]);
        } else {
          const urlParams = new URLSearchParams(window.location.search);
          setTenantSlug(urlParams.get('tenant') || 'system');
        }
      } else {
        setApiBase('');
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
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
        },
        credentials: 'include',
        body: JSON.stringify({ name, email, password, phone }),
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

      if (data.requiresApproval || data.status === 'pending_approval' || data.success) {
        setIsPendingApproval(true);
        setSuccess(data.message || 'Your access request has been received.');
      } else {
        setSuccess(data.message || 'Registration successful!');
      }
      setLoading(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Request Access — Xarwiz Cloud</title>
        <meta name="description" content="Request access to your Xarwiz Cloud workspace" />
      </Head>

      <div className="login-root">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
        <div className="login-orb login-orb-3" />

        <div className="login-card" style={{ maxWidth: '460px' }}>
          {/* Logo */}
          <div className="login-logo">
            <img src="/assets/xarwiz-logo.png" alt="Xarwiz" className="brand-logo-img" />
          </div>

          {isPendingApproval ? (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{
                width: '60px',
                height: '60px',
                margin: '0 auto 16px auto',
                borderRadius: '50%',
                background: 'rgba(59, 130, 246, 0.12)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem'
              }}>
                ✨
              </div>

              <h1 className="login-title" style={{ fontSize: '1.4rem', marginBottom: '16px', color: '#0f172a' }}>
                Access Request Received
              </h1>
              
              <div style={{
                padding: '20px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '14px',
                fontSize: '0.88rem',
                lineHeight: '1.75',
                color: 'var(--text-secondary)',
                textAlign: 'left',
                marginBottom: '24px'
              }}>
                Thanks for requesting access to Xarwiz Cloud.
                <br /><br />
                You have been added to our invitation list. Your account is currently awaiting administrator approval.
                <br /><br />
                As soon as an administrator approves your access, you'll be able to sign in and use the platform.
                <br /><br />
                We'll notify you once your account has been approved.
              </div>

              <Link href="/login" passHref legacyBehavior>
                <a className="btn-primary" style={{ display: 'inline-flex', textDecoration: 'none', justifyContent: 'center', width: '100%', marginBottom: '16px' }}>
                  Back to Login
                </a>
              </Link>

              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', margin: 0 }}>
                Already approved?{' '}
                <Link href="/login" passHref legacyBehavior>
                  <a style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
                    Sign in
                  </a>
                </Link>
              </p>
            </div>
          ) : (
            <>
              <h1 className="login-title">Request Access</h1>
              <p className="login-subtitle">Request access to Xarwiz Cloud AI Platform</p>

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
                  <label className="form-label" htmlFor="phone">
                    Phone number
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    className="form-input"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
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
                  {loading ? 'Submitting request…' : 'Request Access'}
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

              <p
                style={{
                  marginTop: '20px',
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  textAlign: 'center',
                }}
              >
                Already approved?{' '}
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
            </>
          )}
        </div>
      </div>
    </>
  );
}
