import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { getApiConfig } from '../components/settings/apiHelper';

export default function ImpersonatePage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Verifying impersonation session…');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token') || router.query.token;

    // Immediately remove token from URL bar to prevent history/log leakage
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (!token) {
      setError('No impersonation token provided or session expired.');
      return;
    }

    const { apiBase, tenantSlug } = getApiConfig();

    const confirmImpersonation = async () => {
      try {
        setStatus('Authenticating impersonated workspace…');
        const res = await fetch(`${apiBase}/api/auth/impersonate/confirm`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-slug': tenantSlug,
          },
          credentials: 'include',
          body: JSON.stringify({ token }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to confirm impersonation session.');
        }

        // Store impersonation state securely in localStorage
        localStorage.setItem('hk_user', JSON.stringify(data.user));
        localStorage.setItem('hk_tenant', data.user.tenantSlug);
        localStorage.setItem('hk_api_base', apiBase);
        localStorage.setItem('is_impersonating', 'true');
        localStorage.setItem('impersonating_user_email', data.user.email);
        if (data.impersonatingAdminEmail) {
          localStorage.setItem('impersonating_admin_email', data.impersonatingAdminEmail);
        }

        setStatus('Access granted. Redirecting to workspace…');
        setTimeout(() => {
          router.replace('/chat');
        }, 500);
      } catch (err) {
        console.error('Impersonation confirmation error:', err);
        setError(err.message || 'Impersonation link invalid or expired.');
      }
    };

    confirmImpersonation();
  }, [router]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#030712',
      color: '#f9fafb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, system-ui, sans-serif',
      padding: '20px'
    }}>
      <Head>
        <title>Impersonation Session | Neuravolt AI</title>
      </Head>

      <div style={{
        maxWidth: '440px',
        width: '100%',
        backgroundColor: '#0b0f19',
        border: '1px solid #1f2937',
        borderRadius: '16px',
        padding: '32px',
        textAlign: 'center',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '12px',
          backgroundColor: error ? 'rgba(225, 29, 72, 0.1)' : 'rgba(99, 102, 241, 0.1)',
          color: error ? '#f43f5e' : '#818cf8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px auto',
          fontSize: '24px'
        }}>
          {error ? '⚠️' : '🔐'}
        </div>

        <h1 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
          {error ? 'Impersonation Failed' : 'Admin Impersonation'}
        </h1>

        {error ? (
          <div>
            <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
              {error}
            </p>
            <button
              onClick={() => router.replace('/login')}
              style={{
                width: '100%',
                padding: '12px 20px',
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '500',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Return to Login
            </button>
          </div>
        ) : (
          <div>
            <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '24px' }}>
              {status}
            </p>
            <div style={{
              display: 'inline-block',
              width: '24px',
              height: '24px',
              border: '3px solid rgba(255,255,255,0.2)',
              borderTopColor: '#6366f1',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <style jsx>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}
      </div>
    </div>
  );
}
