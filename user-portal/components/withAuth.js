import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

export function withAuth(WrappedComponent) {
  return function ProtectedRoute(props) {
    const router = useRouter();
    const { user, isAuthenticated, isEmailVerified, isLoading } = useAuth();

    const isPending = user?.status === 'pending' || user?.status === 'pending_approval';

    useEffect(() => {
      if (!isLoading) {
        if (!isAuthenticated || isPending) {
          router.replace('/login');
        } else if (!isEmailVerified && router.pathname !== '/verify-email') {
          router.replace('/verify-email');
        }
      }
      // router itself isn't guaranteed referentially stable across renders
      // in the Pages Router (same issue already fixed in login.js/chat.js) —
      // depending on the whole object turned a single redirect into a tight
      // loop of repeated /api/auth/me calls. router.replace is a stable
      // method regardless, so only the pathname needs to be a dependency.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoading, isAuthenticated, isPending, isEmailVerified, router.pathname]);

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

    if (!isAuthenticated || isPending || (!isEmailVerified && router.pathname !== '/verify-email')) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
}

export default withAuth;
