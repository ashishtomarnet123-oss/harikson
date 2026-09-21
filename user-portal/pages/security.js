import { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Shield } from 'lucide-react';

export default function SecurityPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/security-policy');
  }, [router]);

  return (
    <>
      <Head><title>Security Policy — Xarwiz</title></Head>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px' }}>
        <Shield size={32} color="#6b7280" />
        <p style={{ fontSize: '14px', color: '#6b7280' }}>
          Redirecting to Security Policy...
        </p>
      </div>
    </>
  );
}
