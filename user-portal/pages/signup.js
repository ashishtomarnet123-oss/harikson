import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import SEOHead from '../components/SEOHead';

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
  const [tenantSlug, setTenantSlug] = useState('default');
  const [privacyNoticeAcknowledged, setPrivacyNoticeAcknowledged] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem('hk_user');
    if (user) {
      router.replace('/chat');
      return;
    }

    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        // Relative path - Next.js's rewrites() proxies /api/* to tenant-api
        // server-side, same origin, regardless of what domain is actually
        // being visited or whether it has an explicit port.
        setApiBase('');
        const parts = hostname.split('.');
        const isIP = !isNaN(parts[0]);
        // A genuine tenant subdomain needs at least 3 labels
        // (acme.xarwiz.com) - a bare domain (xarwiz.com) only has 2, and
        // its first label isn't a tenant slug, it's just the domain name.
        const hasSubdomain = parts.length >= 3;
        if (!isIP && hasSubdomain && parts[0] !== 'www') {
          setTenantSlug(parts[0]);
        } else {
          const urlParams = new URLSearchParams(window.location.search);
          setTenantSlug('default');
        }
      } else {
        setApiBase('');
      }
    }
  }, [router]);

  const requestSource =
    (typeof router.query?.source === 'string' ? router.query.source : '') ||
    (typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('source') || ''
      : '');

  const isDemo = requestSource === 'book_demo';
  const isLiveDemo = requestSource === 'book_live_demo';

  const pageTitle = isLiveDemo
    ? 'Book a Live Demo / Request Access'
    : isDemo
    ? 'Book a Demo / Request Access'
    : 'Sign Up / Request Access';

  const formHeading = isLiveDemo
    ? 'Book a Live Demo'
    : isDemo
    ? 'Book a Demo'
    : 'Request Access';

  const formSubtitle = isLiveDemo
    ? 'Schedule a live demonstration and request access to Xarwiz Cloud'
    : isDemo
    ? 'Schedule a product walkthrough and request access to Xarwiz Cloud'
    : 'Request access to Xarwiz Cloud AI Platform';

  const submitText = loading
    ? 'Submitting request…'
    : isLiveDemo
    ? 'Book Live Demo'
    : isDemo
    ? 'Book a Demo'
    : 'Request Access';

  const successHeading = isLiveDemo
    ? 'Live Demo Request Received'
    : isDemo
    ? 'Demo Request Received'
    : 'Access Request Received';

  const successMessage = isLiveDemo
    ? "Thanks for requesting a live demo of Xarwiz Cloud.\n\nYour details have been submitted and your account is currently awaiting administrator review. Our team will reach out shortly to schedule your live walkthrough session.\n\nAs soon as an administrator approves your access, you will also be able to sign in and use the platform directly."
    : isDemo
    ? "Thanks for requesting a demo of Xarwiz Cloud.\n\nYour details have been submitted and your account is currently awaiting administrator review. Our team will reach out shortly to schedule your product walkthrough.\n\nAs soon as an administrator approves your access, you will also be able to sign in and use the platform directly."
    : "Thanks for requesting access to Xarwiz Cloud.\n\nYou have been added to our invitation list. Your account is currently awaiting administrator approval.\n\nAs soon as an administrator approves your access, you'll be able to sign in and use the platform.\n\nWe'll notify you once your account has been approved.";

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

    if (!privacyNoticeAcknowledged) {
      setError('Please review and acknowledge the Xarwiz Privacy Policy to continue.');
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
        body: JSON.stringify({
          name,
          email,
          password,
          phone,
          privacyNoticeAcknowledged,
          marketingConsent,
          source: requestSource || 'request_access',
        }),
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
        setSuccess(
          data.message ||
            (isLiveDemo
              ? 'Your live demo request has been received.'
              : isDemo
              ? 'Your demo request has been received.'
              : 'Your access request has been received.')
        );
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
      <SEOHead
        title={pageTitle}
        description="Request access to your Xarwiz AI Platform workspace. Deploy autonomous AI agents, automate workflows, and connect enterprise data sources."
        canonicalPath="/signup"
      />

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
                {successHeading}
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
                marginBottom: '24px',
                whiteSpace: 'pre-line'
              }}>
                {successMessage}
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
              <h1 className="login-title">{formHeading}</h1>
              <p className="login-subtitle">{formSubtitle}</p>

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

                {/* DPDP Act 2023 Compliant Notice & Unbundled Consent */}
                <div style={{ margin: '16px 0 12px 0', fontSize: '12.5px', color: '#475569', lineHeight: 1.45 }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', textAlign: 'left' }}>
                    <input
                      type="checkbox"
                      id="privacyNoticeAck"
                      checked={privacyNoticeAcknowledged}
                      onChange={(e) => setPrivacyNoticeAcknowledged(e.target.checked)}
                      style={{ marginTop: '2px', accentColor: '#2563eb' }}
                      required
                    />
                    <span>
                      I have reviewed and acknowledge the{' '}
                      <Link href="/privacy" target="_blank" style={{ color: '#2563eb', textDecoration: 'underline' }}>
                        Privacy Policy (DPDP 2023)
                      </Link>{' '}
                      and agree to the{' '}
                      <Link href="/terms" target="_blank" style={{ color: '#2563eb', textDecoration: 'underline' }}>
                        Terms of Service
                      </Link>.
                    </span>
                  </label>
                </div>

                <div style={{ marginBottom: '18px', fontSize: '12.5px', color: '#475569', lineHeight: 1.45 }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', textAlign: 'left' }}>
                    <input
                      type="checkbox"
                      id="marketingConsent"
                      checked={marketingConsent}
                      onChange={(e) => setMarketingConsent(e.target.checked)}
                      style={{ marginTop: '2px', accentColor: '#2563eb' }}
                    />
                    <span>
                      (Optional) Send me product updates, new AI model releases, and promotional webinars. You can withdraw anytime in Settings.
                    </span>
                  </label>
                </div>

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading && <span className="login-spinner" />}
                  {submitText}
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
