import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const router = useRouter();
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('Verifying your email address...');
  const [countdown, setCountdown] = useState(5);
  const [apiBase, setApiBase] = useState('http://localhost:3008');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        // Relative path — Next.js's rewrites() proxies /api/* to tenant-api
        // server-side, same origin, regardless of what domain is actually
        // being visited or whether it has an explicit port.
        setApiBase('');
      }
    }
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    const { token } = router.query;

    if (!token) {
      setStatus('error');
      setMessage('Missing verification token. Please check your verification link.');
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await fetch(`${apiBase}/api/auth/verify-email?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (res.ok) {
          setStatus('success');
          setMessage(data.message || 'Email verified successfully! You can now log in.');
        } else {
          setStatus('error');
          setMessage(data.error || 'Verification link is invalid or has expired.');
        }
      } catch (err) {
        setStatus('error');
        setMessage('Network error verifying email. Please try again later.');
      }
    };

    verifyToken();
  }, [router.isReady, router.query, apiBase]);

  // Countdown timer for automatic redirect on success
  useEffect(() => {
    if (status !== 'success') return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          router.replace('/login?verified=true');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status, router]);

  return (
    <>
      <Head>
        <title>Email Verification — Xarwiz AI</title>
      </Head>

      <div className="login-root">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />

        <div className="login-card" style={{ textAlign: 'center' }}>
          <div className="login-logo" style={{ justifyContent: 'center' }}>
            <img src="/assets/xarwiz-logo.png" alt="Xarwiz" className="brand-logo-img" />
          </div>

          <h1 className="login-title" style={{ fontSize: '20px', marginBottom: '16px' }}>
            Email Verification
          </h1>

          {status === 'verifying' && (
            <div style={{ padding: '20px 0' }}>
              <div className="login-spinner" style={{ margin: '0 auto 12px auto', width: '24px', height: '24px' }} />
              <p style={{ fontSize: '14px', color: '#64748b' }}>{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px 0' }}>
              <div style={{
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
                fontSize: '20px'
              }}>
                ✓
              </div>
              <p style={{ fontSize: '14px', color: '#059669', fontWeight: 600 }}>{message}</p>
              <p style={{ fontSize: '13px', color: '#64748b' }}>
                Redirecting to login in <strong style={{ color: '#0f172a' }}>{countdown}</strong> seconds...
              </p>
              <Link href="/login?verified=true" className="btn-primary" style={{ textDecoration: 'none' }}>
                Go to Login Immediately
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px 0' }}>
              <div style={{
                width: '48px',
                height: '48px',
                margin: '0 auto',
                borderRadius: '50%',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>
                ✕
              </div>
              <p style={{ fontSize: '14px', color: '#dc2626', fontWeight: 600 }}>{message}</p>
              <Link href="/login" className="btn-primary" style={{ textDecoration: 'none', background: '#475569' }}>
                Back to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
