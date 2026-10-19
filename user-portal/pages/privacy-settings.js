import Head from 'next/head';
import { withAuth } from '../components/withAuth';
import DashboardShell from '../components/layout/DashboardShell';
import DataPrivacySettings from '../components/settings/privacy';

function PrivacySettingsPage() {
  return (
    <>
      <Head>
        <title>Privacy &amp; Consent Settings - Xarwiz</title>
        <meta name="description" content="Manage DPDP purpose-based consent and privacy rights preferences in Xarwiz" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <DashboardShell activeSection="settings">
        <div style={{ padding: '32px 24px', maxWidth: '900px', margin: '0 auto' }}>
          <DataPrivacySettings />
        </div>
      </DashboardShell>
    </>
  );
}

export default withAuth(PrivacySettingsPage);
