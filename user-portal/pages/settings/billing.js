import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function BillingSettingsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/chat?settings=billing');
  }, [router]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#64748b',
      background: '#0f172a'
    }}>
      <p>Redirecting to billing settings...</p>
    </div>
  );
}

