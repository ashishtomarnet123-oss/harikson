import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('hk_token') : null;
    router.replace(token ? '/chat' : '/login');
  }, [router]);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#0f0f11', color: '#666',
      fontFamily: 'Inter, sans-serif', fontSize: '14px'
    }}>
      Loading Harikson…
    </div>
  );
}
