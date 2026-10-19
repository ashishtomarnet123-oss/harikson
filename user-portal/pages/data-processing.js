import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, Shield, Check, Lock, Server, Cpu, Database, FileCheck, ExternalLink } from 'lucide-react';
import FooterSection from '../components/FooterSection';
import SEOHead, { defaultOrganizationSchema } from '../components/SEOHead';

export default function DataProcessingPage() {
  return (
    <>
      <SEOHead
        title="Data Processing Addendum & Architecture"
        description="Enterprise Data Processing Agreement (DPA), technical & organizational security measures (TOMs), Indian data localization, and AI model isolation at Xarwiz."
        canonicalPath="/data-processing"
        jsonLd={[
          defaultOrganizationSchema,
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Data Processing Addendum - Xarwiz AI Platform',
            url: 'https://xarwiz.com/data-processing',
          },
        ]}
      />

      <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          padding: '48px 24px 60px 24px',
          textAlign: 'center'
        }}>
          <div style={{ maxWidth: '960px', margin: '0 auto', textAlign: 'left', marginBottom: '24px' }}>
            <Link href="/privacy">
              <a style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                color: 'rgba(255,255,255,0.8)',
                textDecoration: 'none',
                fontSize: '14px',
                background: 'rgba(255,255,255,0.1)',
                padding: '6px 14px',
                borderRadius: '20px',
              }}>
                <ArrowLeft size={16} />
                Back to Privacy Policy
              </a>
            </Link>
          </div>

          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '20px',
              background: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              color: '#93c5fd',
              fontSize: '13px',
              fontWeight: '500',
              marginBottom: '16px'
            }}>
              <FileCheck size={16} />
              Enterprise Data Processing Addendum (DPA)
            </div>
            <h1 style={{ fontSize: '38px', fontWeight: '800', margin: '0 0 12px 0', letterSpacing: '-0.75px' }}>
              Data Processing &amp; Architecture Standards
            </h1>
            <p style={{ fontSize: '16px', color: '#94a3b8', lineHeight: '1.6', margin: 0 }}>
              Transparent breakdown of enterprise data flows, model inference isolation, Indian data localization, sub-processors, and Technical &amp; Organizational Measures (TOMs).
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ maxWidth: '960px', margin: '-24px auto 60px auto', padding: '0 20px', position: 'relative', zIndex: 10 }}>
          {/* Summary Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '36px' }}>
            <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#2563eb', marginBottom: '10px' }}>
                <Server size={22} />
                <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>Indian Data Localization</h3>
              </div>
              <p style={{ margin: 0, fontSize: '13.5px', color: '#64748b', lineHeight: '1.5' }}>
                Primary database clusters, vector embeddings, and tenant assets are hosted within the sovereign territory of India, aligned with MeitY and DPDP guidelines.
              </p>
            </div>

            <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#10b981', marginBottom: '10px' }}>
                <Cpu size={22} />
                <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>Zero Public AI Model Training</h3>
              </div>
              <p style={{ margin: 0, fontSize: '13.5px', color: '#64748b', lineHeight: '1.5' }}>
                Customer prompts, conversation history, and uploaded knowledge base documents are strictly segregated and NEVER used to train or refine public baseline AI models.
              </p>
            </div>

            <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#8b5cf6', marginBottom: '10px' }}>
                <Lock size={22} />
                <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>PostgreSQL RLS Isolation</h3>
              </div>
              <p style={{ margin: 0, fontSize: '13.5px', color: '#64748b', lineHeight: '1.5' }}>
                Multi-tenant architecture enforces PostgreSQL Row-Level Security (RLS) dynamically locked to <code>app.current_tenant</code> on every single database transaction.
              </p>
            </div>
          </div>

          {/* DPA Section Cards */}
          <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '36px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '24px', color: '#0f172a', margin: '0 0 16px 0' }}>
              1. Scope &amp; Processing Roles
            </h2>
            <p style={{ fontSize: '14.5px', color: '#475569', lineHeight: '1.6', margin: '0 0 24px 0' }}>
              For enterprise workspaces, the Customer acts as the <strong>Data Fiduciary</strong> determining the purposes and lawful bases of its team members' data. Xarwiz Technologies LLP acts as the <strong>Data Processor</strong> executing operations strictly on documented instructions from the Customer.
            </p>

            <h2 style={{ fontSize: '24px', color: '#0f172a', margin: '0 0 16px 0' }}>
              2. Technical &amp; Organizational Measures (TOMs)
            </h2>
            <div style={{ display: 'grid', gap: '12px', marginBottom: '28px' }}>
              {[
                'Encryption in Transit: Mandatory TLS 1.3 encryption across all public APIs and internal microservice channels.',
                'Encryption at Rest: AES-256 storage volume encryption and AES-GCM envelope encryption for stored workspace credentials.',
                'Multi-Tenant Scoping: PostgreSQL Row-Level Security (RLS) policies enforced on all user, conversation, document, and consent tables.',
                'Access Control: Role-Based Access Control (RBAC), multi-factor authentication (MFA), and automated session timeout policies.',
                'Vulnerability Management: Automated dependency auditing, regular static code analysis (SAST), and independent penetration testing.',
                'Incident Notification: Mandatory reporting to CERT-In within 6 hours and customer breach notification without undue delay.'
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '14px', color: '#334155' }}>
                  <Check size={18} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <h2 style={{ fontSize: '24px', color: '#0f172a', margin: '0 0 16px 0' }}>
              3. Verified Sub-Processors
            </h2>
            <div style={{ overflowX: 'auto', marginBottom: '28px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '10px 12px', color: '#1e293b' }}>Sub-Processor</th>
                    <th style={{ padding: '10px 12px', color: '#1e293b' }}>Purpose</th>
                    <th style={{ padding: '10px 12px', color: '#1e293b' }}>Location</th>
                    <th style={{ padding: '10px 12px', color: '#1e293b' }}>Data Transferred</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontWeight: '600' }}>Google Cloud Platform (GCP)</td>
                    <td style={{ padding: '10px 12px' }}>Cloud VM &amp; Database Hosting</td>
                    <td style={{ padding: '10px 12px' }}>India (asia-south2)</td>
                    <td style={{ padding: '10px 12px' }}>Encrypted application data &amp; database volumes</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontWeight: '600' }}>Ollama Local Inference</td>
                    <td style={{ padding: '10px 12px' }}>On-Premise / Local LLM Inference</td>
                    <td style={{ padding: '10px 12px' }}>India (Self-Hosted)</td>
                    <td style={{ padding: '10px 12px' }}>Ephemeral prompt inputs (zero persistent storage)</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontWeight: '600' }}>Razorpay / Cashfree / PhonePe</td>
                    <td style={{ padding: '10px 12px' }}>Payment Processing &amp; Invoicing</td>
                    <td style={{ padding: '10px 12px' }}>India</td>
                    <td style={{ padding: '10px 12px' }}>Billing customer name, email, order amount</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontWeight: '600' }}>Resend</td>
                    <td style={{ padding: '10px 12px' }}>Transactional Email Delivery</td>
                    <td style={{ padding: '10px 12px' }}>Cloud (Global)</td>
                    <td style={{ padding: '10px 12px' }}>Recipient email, verification &amp; privacy alert links</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ textAlign: 'center', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
              <Link href="/data-rights">
                <a style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  background: '#2563eb',
                  color: '#ffffff',
                  borderRadius: '8px',
                  fontWeight: '600',
                  textDecoration: 'none',
                  fontSize: '15px'
                }}>
                  Access Data Principal Rights Portal &rarr;
                </a>
              </Link>
            </div>
          </div>
        </div>

        <FooterSection />
      </div>
    </>
  );
}
