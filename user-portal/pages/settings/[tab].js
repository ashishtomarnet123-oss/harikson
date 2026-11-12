import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function SettingsRedirectPage() {
  const router = useRouter();
  const { tab } = router.query;

  useEffect(() => {
    if (router.isReady) {
      const targetTab = typeof tab === 'string' && tab ? tab : 'billing';
      router.replace(`/chat?settings=${encodeURIComponent(targetTab)}`);
    }
  }, [router.isReady, tab, router]);

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
      <p>Redirecting to settings...</p>
    </div>
  );
}

