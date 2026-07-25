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
        if (window.location.port) {
          setApiBase('');
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

      if (data.requiresApproval || data.status === 'pending') {
        setIsPendingApproval(true);
        setSuccess(data.message || 'Account created! Awaiting administrator approval.');
      } else {
        setSuccess(data.message || 'Registration successful! Please check your email to verify your account.');
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
        <title>Sign Up — Neuravolt Cloud</title>
        <meta name="description" content="Create your Neuravolt Cloud account" />
      </Head>

      <div className="login-root">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
        <div className="login-orb login-orb-3" />

        <div className="login-card" style={{ maxWidth: '460px' }}>
          {/* Logo */}
          <div className="login-logo">
            <div className="login-logo-icon">N</div>
            <div className="login-logo-text">NEURAVOLT</div>
          </div>

          {isPendingApproval ? (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{
                width: '64px',
                height: '64px',
                margin: '0 auto 16px auto',
                borderRadius: '50%',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem'
              }}>
                ⏳
              </div>

              <h1 className="login-title" style={{ fontSize: '1.4rem', marginBottom: '8px' }}>
                Account Request Submitted
              </h1>
              
              <div style={{
                fontSize: '0.85rem',
                color: '#F59E0B',
                fontWeight: 700,
                marginBottom: '16px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Awaiting Admin Approval
              </div>

              <div style={{
                padding: '16px',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                borderRadius: '12px',
                fontSize: '0.85rem',
                lineHeight: '1.6',
                color: 'var(--text-secondary)',
                textAlign: 'left',
                marginBottom: '24px'
              }}>
                Your registration request for <strong>{email}</strong> has been successfully recorded.
                <br /><br />
                Neuravolt Cloud is an <strong>invite-only platform</strong>. Your account must be approved by an administrator before access can be granted.
              </div>

              <Link href="/login" passHref legacyBehavior>
                <a className="btn-primary" style={{ display: 'inline-flex', textDecoration: 'none', justifyContent: 'center' }}>
                  Return to Login
                </a>
              </Link>
            </div>
          ) : (
            <>
              <h1 className="login-title">Create your account</h1>
              <p className="login-subtitle">Request access to Neuravolt Cloud AI Platform</p>

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
                  {loading ? 'Submitting request…' : 'Submit Access Request'}
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
                Already have an approved account?{' '}
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
