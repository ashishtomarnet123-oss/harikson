import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [apiBase, setApiBase] = useState('http://localhost:3008');

  useEffect(() => {
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
      }
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${apiBase}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.status === 429) {
        setError('Too many attempts. Please wait a while before requesting another reset link.');
        setLoading(false);
        return;
      }

      const data = await res.json();

      if (res.ok) {
        setSuccess('If an account with that email exists, we have sent a password reset link. Please check your email inbox and spam folder.');
        setEmail('');
      } else {
        // Generic security response
        setSuccess('If an account with that email exists, we have sent a password reset link. Please check your email inbox and spam folder.');
      }
    } catch (err) {
      setError('An error occurred while sending reset email. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Forgot Password - Neuravolt</title>
        <meta name="description" content="Reset your Neuravolt AI account password" />
      </Head>

      <div className="login-container">
        <div className="login-card">
          <div className="login-logo">
            <div className="logo-icon">⚡</div>
            <span className="logo-text">Neuravolt</span>
          </div>

          <h1 className="login-title">Reset Your Password</h1>
          <p className="login-subtitle">
            Enter your registered email address and we'll send you instructions to reset your password.
          </p>

          {success ? (
            <div
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#34d399',
                padding: '16px',
                borderRadius: '8px',
                fontSize: '14px',
                marginBottom: '20px',
                lineHeight: '1.5',
              }}
            >
              ✅ {success}
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
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
                  autoFocus
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading && <span className="login-spinner" />}
                {loading ? 'Sending link…' : 'Send Reset Link'}
              </button>
            </form>
          )}

          {error && <div className="login-error" style={{ marginTop: '16px' }}>⚠ {error}</div>}

          <p
            style={{
              marginTop: '24px',
              fontSize: '13px',
              color: 'var(--text-muted, #94a3b8)',
              textAlign: 'center',
            }}
          >
            Remember your password?{' '}
            <Link href="/login" style={{ color: 'var(--accent, #6366f1)', textDecoration: 'none', fontWeight: '600' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
