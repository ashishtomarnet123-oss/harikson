import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

export function withAuth(WrappedComponent) {
  return function ProtectedRoute(props) {
    const router = useRouter();
    const { isAuthenticated, isEmailVerified, isLoading } = useAuth();

    useEffect(() => {
      if (!isLoading) {
        if (!isAuthenticated) {
          router.replace('/login');
        } else if (!isEmailVerified && router.pathname !== '/verify-email') {
          router.replace('/verify-email');
        }
      }
    }, [isLoading, isAuthenticated, isEmailVerified, router]);

    if (isLoading) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#030712',
          color: '#f9fafb',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            border: '3px solid rgba(99, 102, 241, 0.2)',
            borderTopColor: '#6366f1',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '16px'
          }} />
          <p style={{ color: '#9ca3af', fontSize: '14px' }}>Authenticating session…</p>
          <style jsx>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      );
    }

    if (!isAuthenticated || (!isEmailVerified && router.pathname !== '/verify-email')) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
}

export default withAuth;
