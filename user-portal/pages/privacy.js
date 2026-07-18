import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, Shield, Lock, FileText, Scale, UserCheck, HelpCircle } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div style={{
      backgroundColor: '#0b0f19',
      color: '#f3f4f6',
      minHeight: '100vh',
      fontFamily: "'Outfit', sans-serif",
      padding: '40px 20px 80px 20px'
    }}>
      <Head>
        <title>Privacy Policy | Harikson AI Platform</title>
        <meta name="description" content="Harikson AI privacy policy compliant with Indian DPDP Act 2023 and global privacy norms." />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
      </Head>

      <div style={{
        maxWidth: '900px',
        margin: '0 auto'
      }}>
        {/* Navigation / Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '50px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '20px'
        }}>
          <Link href="/">
            <a style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#9ca3af',
              textDecoration: 'none',
              fontSize: '14.5px',
              fontWeight: '500',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent, #3b82f6)'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
            >
              <ArrowLeft size={16} />
              Back to Home
            </a>
          </Link>
          <div style={{
            fontSize: '13px',
            color: '#64748b',
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '4px 12px',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            Last Updated: July 19, 2026
          </div>
        </div>

        {/* Hero Section */}
        <div style={{ marginBottom: '50px' }}>
          <h1 style={{
            fontSize: '42px',
            fontWeight: '800',
            margin: '0 0 16px 0',
            background: 'linear-gradient(135deg, #60a5fa, #3b82f6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.5px'
          }}>
            Privacy Policy
          </h1>
          <p style={{
            fontSize: '17px',
            color: '#9ca3af',
            margin: 0,
            lineHeight: '1.6',
            fontWeight: '300'
          }}>
            Harikson AI Technologies Pvt. Ltd. (“Harikson”, “we”, “our”, or “us”) is committed to protecting the privacy of our users. This policy outlines our compliance with India&apos;s <strong>Digital Personal Data Protection (DPDP) Act, 2023</strong> and global data protection norms.
          </p>
        </div>

        {/* Quick Highlights / Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '50px'
        }}>
          <div style={{
            background: 'rgba(17, 24, 39, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            padding: '20px',
            backdropFilter: 'blur(10px)'
          }}>
            <Shield style={{ color: '#3b82f6', marginBottom: '12px' }} size={24} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>Tenant Isolation</h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af', lineHeight: '1.5' }}>
              Your workspace data and RAG document libraries are logically isolated using secure row-level security (RLS) in our database.
            </p>
          </div>
          <div style={{
            background: 'rgba(17, 24, 39, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            padding: '20px',
            backdropFilter: 'blur(10px)'
          }}>
            <Lock style={{ color: '#10b981', marginBottom: '12px' }} size={24} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>No Model Training</h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af', lineHeight: '1.5' }}>
              We do not use customer conversation logs or document embeddings to train or fine-tune public foundation AI models.
            </p>
          </div>
          <div style={{
            background: 'rgba(17, 24, 39, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            padding: '20px',
            backdropFilter: 'blur(10px)'
          }}>
            <Scale style={{ color: '#f59e0b', marginBottom: '12px' }} size={24} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>DPDP 2023 Compliant</h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af', lineHeight: '1.5' }}>
              Fully aligned with Indian regulatory norms, providing clear mechanisms for user consent, data erasure, and grievance redressal.
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div style={{
          lineHeight: '1.75',
          fontSize: '15.5px',
          color: '#d1d5db'
        }}>
          
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '600', color: '#f3f4f6', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={20} color="#3b82f6" /> 1. Nature of Data Collected
            </h2>
            <p style={{ marginBottom: '12px' }}>
              We collect only the personal and workspace data necessary to deploy and maintain your AI infrastructure. This includes:
            </p>
            <ul style={{ paddingLeft: '20px', marginBottom: '16px' }}>
              <li style={{ marginBottom: '8px' }}><strong>Profile Information:</strong> Name, professional email address, phone number, and encrypted passwords.</li>
              <li style={{ marginBottom: '8px' }}><strong>Workspace Data:</strong> Text documents, PDF libraries, schema designs, and files uploaded to RAG knowledge bases.</li>
              <li style={{ marginBottom: '8px' }}><strong>AI Activity Logs:</strong> Model metrics, prompt tokens input/output, execution latencies, and status codes for billing and audit reporting.</li>
              <li style={{ marginBottom: '8px' }}><strong>Billing Metadata:</strong> Encrypted Stripe credentials, subscription logs, and transaction status codes. We do not store raw card numbers.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '600', color: '#f3f4f6', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <UserCheck size={20} color="#10b981" /> 2. User Consent and Choice
            </h2>
            <p style={{ marginBottom: '12px' }}>
              Under section 6 of the DPDP Act, 2023, data processing must be based on a free, specific, informed, unconditional, and unambiguous consent:
            </p>
            <ul style={{ paddingLeft: '20px', marginBottom: '16px' }}>
              <li style={{ marginBottom: '8px' }}>You give explicit consent when signing up and establishing a tenant workspace.</li>
              <li style={{ marginBottom: '8px' }}>You have the right to withdraw consent at any time. Withdrawal of consent will result in the suspension of access to the platform and deletion of workspace databases.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '600', color: '#f3f4f6', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Scale size={20} color="#f59e0b" /> 3. Your Rights as a Data Principal
            </h2>
            <p style={{ marginBottom: '12px' }}>
              Under the DPDP Act 2023, Indian citizens (Data Principals) are granted the following legal rights:
            </p>
            <ul style={{ paddingLeft: '20px', marginBottom: '16px' }}>
              <li style={{ marginBottom: '8px' }}><strong>Right to Access:</strong> Request details about what personal data is being processed and a summary of processing activities.</li>
              <li style={{ marginBottom: '8px' }}><strong>Right to Correction &amp; Erasure:</strong> Correct, update, or completely delete your personal profile data and workspace document databases.</li>
              <li style={{ marginBottom: '8px' }}><strong>Right to Nominate:</strong> Nominate another individual to exercise your privacy rights in the event of death or incapacity.</li>
              <li style={{ marginBottom: '8px' }}><strong>Right to Grievance Redressal:</strong> Register grievances regarding any data processing non-compliance.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '600', color: '#f3f4f6', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Lock size={20} color="#3b82f6" /> 4. Data Security and Isolation
            </h2>
            <p style={{ marginBottom: '16px' }}>
              Harikson AI implements state-of-the-art security measures to safeguard corporate assets:
            </p>
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              padding: '16px',
              fontSize: '14px',
              color: '#9ca3af'
            }}>
              <strong>Technical Measures:</strong> All data is isolated in PostgreSQL using Row-Level Security (RLS). Communication is encrypted in transit using TLS 1.3 and at rest using AES-256-GCM. We maintain dedicated isolated Redis key ranges to enforce strict rate-limiting per tenant.
            </div>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '600', color: '#f3f4f6', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <HelpCircle size={20} color="#8b5cf6" /> 5. Grievance Redressal Officer
            </h2>
            <p style={{ marginBottom: '12px' }}>
              If you have any questions, concerns, or grievances regarding our data handling procedures, or if you want to exercise your rights under the DPDP Act, you can contact our designated Grievance Officer:
            </p>
            <div style={{
              background: 'rgba(139, 92, 246, 0.05)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              borderRadius: '8px',
              padding: '20px',
              fontSize: '14.5px'
            }}>
              <strong style={{ color: '#a78bfa' }}>Grievance Officer / DPO:</strong><br />
              Ashish Pratap Singh Tomar<br />
              Harikson AI Technologies Pvt. Ltd.<br />
              Email: <a href="mailto:grievance@harikson.ai" style={{ color: '#c084fc', textDecoration: 'none' }}>grievance@harikson.ai</a><br />
              Address: Sector 62, Noida, Uttar Pradesh, India - 201301
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
