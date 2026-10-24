import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import SEOHead from '../components/SEOHead';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(5);
  const [apiBase, setApiBase] = useState('http://localhost:3008');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        // Next.js rewrites() proxies /api/* to tenant-api
        setApiBase('');
      }
    }
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    const queryToken = router.query.token;
    if (queryToken && typeof queryToken === 'string') {
      setToken(queryToken);
    } else {
      setError('Missing password reset token. Please check your reset link or request a new one.');
    }
  }, [router.isReady, router.query]);

  // Countdown timer for automatic redirect on success
  useEffect(() => {
    if (!success) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          router.replace('/login?reset=true');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [success, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Password reset token is missing. Please use the link provided in your email.');
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${apiBase}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(data.message || 'Password has been reset successfully! You can now log in.');
      } else {
        setError(data.error || 'Failed to reset password. The link may have expired or already been used.');
      }
    } catch (err) {
      setError('Network error occurred. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEOHead
        title="Reset Password"
        description="Set a new password for your Xarwiz AI account"
        canonicalPath="/reset-password"
        noindex={true}
      />

      <div className="login-root">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />

        <div className="login-card">
          <div className="login-logo">
            <img src="/assets/xarwiz-logo.png" alt="Xarwiz" className="brand-logo-img" />
          </div>

          <h1 className="login-title">Set New Password</h1>
          <p className="login-subtitle">
            Enter your new password below to regain access to your workspace.
          </p>

          {success ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px 0', textAlign: 'center' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  margin: '0 auto',
                  borderRadius: '50%',
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                }}
              >
                ✓
              </div>
              <p style={{ fontSize: '14px', color: '#059669', fontWeight: 600 }}>{success}</p>
              <p style={{ fontSize: '13px', color: '#64748b' }}>
                Redirecting to login in <strong style={{ color: '#0f172a' }}>{countdown}</strong> seconds...
              </p>
              <Link href="/login?reset=true" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block', textAlign: 'center' }}>
                Sign In Now
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="login-form">
              {error && (
                <div
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#dc2626',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    marginBottom: '16px',
                    lineHeight: '1.4',
                  }}
                >
                  {error}
                </div>
              )}

              <div className="login-field">
                <label className="login-label">New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="login-input"
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={loading || !token}
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="login-field">
                <label className="login-label">Confirm New Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="login-input"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading || !token}
                />
              </div>

              <button
                type="submit"
                className="btn-primary login-btn"
                disabled={loading || !token}
                style={{ width: '100%', marginTop: '8px' }}
              >
                {loading ? 'Updating Password...' : 'Reset Password'}
              </button>

              <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
                Remember your password?{' '}
                <Link href="/login" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
                  Sign in
                </Link>
                {' · '}
                <Link href="/forgot-password" style={{ color: '#64748b', textDecoration: 'none' }}>
                  Request new link
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
