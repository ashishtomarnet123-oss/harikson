import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { withAuth } from '../components/withAuth';
import DashboardShell from '../components/layout/DashboardShell';
import { Shield } from 'lucide-react';

function SecurityPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard?settings=security_compliance');
  }, []);

  return (
    <DashboardShell title="Security & Compliance">
      <Head><title>Security — Xarwiz</title></Head>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '12px' }}>
        <Shield size={32} color="var(--shell-text-muted)" />
        <p style={{ fontSize: '14px', color: 'var(--shell-text-muted)' }}>
          Redirecting to Settings → Security & Compliance...
        </p>
      </div>
    </DashboardShell>
  );
}

export default withAuth(SecurityPage);
