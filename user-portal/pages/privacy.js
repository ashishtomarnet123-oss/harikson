import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, Shield, Lock, FileText, Scale, UserCheck, HelpCircle, Eye, RefreshCw, AlertCircle, Phone } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div style={{
      backgroundColor: '#0b0f19',
      color: '#f3f4f6',
      minHeight: '100vh',
      fontFamily: "'Outfit', sans-serif",
      padding: '60px 20px 100px 20px'
    }}>
      <Head>
        <title>Detailed Privacy Policy | Harikson AI Platform</title>
        <meta name="description" content="Harikson AI privacy policy compliant with Indian DPDP Act 2023 and global privacy norms." />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
      </Head>

      <div style={{
        maxWidth: '960px',
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
            Effective Date: July 19, 2026
          </div>
        </div>

        {/* Hero Section */}
        <div style={{ marginBottom: '50px' }}>
          <h1 style={{
            fontSize: '44px',
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
            fontSize: '18px',
            color: '#9ca3af',
            margin: '0 0 24px 0',
            lineHeight: '1.6',
            fontWeight: '300'
          }}>
            At Harikson AI, our mission is to deliver secure, high-performance, enterprise-grade AI agent coordination and Retrieval-Augmented Generation (RAG) technologies. We are strongly committed to keeping secure any information we obtain from you or about you, in strict compliance with the **Digital Personal Data Protection (DPDP) Act, 2023 (India)**.
          </p>
          <div style={{
            background: 'rgba(59, 130, 246, 0.05)',
            border: '1px solid rgba(59, 130, 246, 0.15)',
            borderRadius: '8px',
            padding: '16px',
            fontSize: '14px',
            color: '#93c5fd',
            lineHeight: '1.5'
          }}>
            <strong>Important Note:</strong> This Privacy Policy describes our practices with respect to personal data that we collect from or about you when you use our website, portal, and API. It does not apply to corporate content processed on behalf of our enterprise business agreements (e.g. customized multi-tenant indexers), which are strictly governed by our dedicated customer Service Level Agreements (SLAs).
          </div>
        </div>

        {/* Core Pillars */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          marginBottom: '50px'
        }}>
          <div style={{
            background: 'rgba(17, 24, 39, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            padding: '24px',
            backdropFilter: 'blur(10px)'
          }}>
            <Shield style={{ color: '#3b82f6', marginBottom: '12px' }} size={26} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', fontWeight: '600' }}>Tenant RLS Isolation</h3>
            <p style={{ margin: 0, fontSize: '13.5px', color: '#9ca3af', lineHeight: '1.5' }}>
              We enforce strict Row-Level Security (RLS) policies within PostgreSQL to isolate prompts, memories, and documents by tenant ID.
            </p>
          </div>
          <div style={{
            background: 'rgba(17, 24, 39, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            padding: '24px',
            backdropFilter: 'blur(10px)'
          }}>
            <Lock style={{ color: '#10b981', marginBottom: '12px' }} size={26} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', fontWeight: '600' }}>No External Training</h3>
            <p style={{ margin: 0, fontSize: '13.5px', color: '#9ca3af', lineHeight: '1.5' }}>
              Your private workspace contents, models parameters, and custom database integrations are never used to train public foundation models.
            </p>
          </div>
          <div style={{
            background: 'rgba(17, 24, 39, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            padding: '24px',
            backdropFilter: 'blur(10px)'
          }}>
            <Scale style={{ color: '#f59e0b', marginBottom: '12px' }} size={26} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', fontWeight: '600' }}>Indian DPDP Act</h3>
            <p style={{ margin: 0, fontSize: '13.5px', color: '#9ca3af', lineHeight: '1.5' }}>
              Fully structured to honor your rights as a Data Principal under Indian law, including consent withdrawal and nominee settings.
            </p>
          </div>
        </div>

        {/* Content Sections */}
        <div style={{
          lineHeight: '1.8',
          fontSize: '15.5px',
          color: '#d1d5db'
        }}>
          
          {/* Section 1 */}
          <section style={{ marginBottom: '45px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#f3f4f6', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FileText size={22} color="#3b82f6" /> 1. Personal Data We Collect
            </h2>
            <p style={{ marginBottom: '16px' }}>
              We collect information relating to you (“Personal Data”) through your interactions and account setup on the Harikson AI Platform:
            </p>

            <h3 style={{ fontSize: '18px', color: '#f3f4f6', margin: '20px 0 10px 0' }}>A. Personal Data You Provide</h3>
            <ul style={{ paddingLeft: '22px', marginBottom: '20px' }}>
              <li style={{ marginBottom: '12px' }}>
                <strong>Account Information:</strong> When you register or establish a workspace tenant, we collect Account Information including your name, professional email address, account credentials, phone number, organization name, and billing details (such as encrypted Stripe customer details and billing invoices history).
              </li>
              <li style={{ marginBottom: '12px' }}>
                <strong>User Content:</strong> We store prompts, message contexts, uploaded files, and document libraries used to seed your local RAG indexes.
              </li>
              <li style={{ marginBottom: '12px' }}>
                <strong>Communication details:</strong> If you contact us via support tickets or email, we collect the content of those messages.
              </li>
            </ul>

            <h3 style={{ fontSize: '18px', color: '#f3f4f6', margin: '20px 0 10px 0' }}>B. Personal Data We Automatically Log</h3>
            <ul style={{ paddingLeft: '22px', marginBottom: '20px' }}>
              <li style={{ marginBottom: '12px' }}>
                <strong>Log Data:</strong> Internet Protocol (IP) address, browser version, client-side viewport specifications, request time/dates, and request path logs.
              </li>
              <li style={{ marginBottom: '12px' }}>
                <strong>AI Usage Metrics:</strong> We track active job executions, model requests, prompt tokens (in/out counts), processing latency (ms), and status codes inside the <code>ai_activity</code> table for billing, rate-limiting, and resource allocation.
              </li>
              <li style={{ marginBottom: '12px' }}>
                <strong>Cookies:</strong> Session identification cookies are used to support authentication (HttpOnly cookies), preserve configuration settings, and prevent CSRF vulnerabilities.
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section style={{ marginBottom: '45px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#f3f4f6', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Eye size={22} color="#10b981" /> 2. How We Use Personal Data
            </h2>
            <p style={{ marginBottom: '16px' }}>
              We utilize your Personal Data to operate, analyze, and secure the Harikson AI Platform for the following purposes:
            </p>
            <ul style={{ paddingLeft: '22px', marginBottom: '20px' }}>
              <li style={{ marginBottom: '10px' }}>To provide, maintain, and upgrade the quality of our conversational and document search services.</li>
              <li style={{ marginBottom: '10px' }}>To manage billing structures (e.g. calculating active plans, invoices, and payment limits).</li>
              <li style={{ marginBottom: '10px' }}>To run background jobs (such as conversational summaries, RAG precomputations, and memory extraction via BullMQ and Redis).</li>
              <li style={{ marginBottom: '10px' }}>To protect against malicious activities, prevent service abuse, and enforce strict API rate limiting metrics per user and tenant.</li>
              <li style={{ marginBottom: '10px' }}>To comply with statutory legal requirements and maintain proper corporate audit trail trails.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section style={{ marginBottom: '45px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#f3f4f6', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertCircle size={22} color="#f59e0b" /> 3. Disclosure of Personal Data
            </h2>
            <p style={{ marginBottom: '16px' }}>
              We will only disclose your personal information under the following limited circumstances:
            </p>
            <ul style={{ paddingLeft: '22px', marginBottom: '20px' }}>
              <li style={{ marginBottom: '12px' }}>
                <strong>Workspace Administrators:</strong> If you join a corporate workspace, the administrator controls and monitors user activity logs and settings inside that tenant.
              </li>
              <li style={{ marginBottom: '12px' }}>
                <strong>Service Providers:</strong> We share essential data with payment gateways (Stripe) and email communication systems (Resend) only to fulfill functional billing and notice operations.
              </li>
              <li style={{ marginBottom: '12px' }}>
                <strong>Legal Compliance &amp; Authorities:</strong> In accordance with Indian laws, we may share information with government bodies or law enforcement if legally compelled to do so (such as under direction from Indian courts or Cert-In commands).
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section style={{ marginBottom: '45px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#f3f4f6', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <RefreshCw size={22} color="#8b5cf6" /> 4. Data Retention &amp; Erasure
            </h2>
            <p style={{ marginBottom: '12px' }}>
              In alignment with the Indian DPDP Act 2023, personal data is retained only for the duration necessary to satisfy the purpose of collection:
            </p>
            <ul style={{ paddingLeft: '22px', marginBottom: '20px' }}>
              <li style={{ marginBottom: '8px' }}><strong>User-Initiated Deletion:</strong> If you delete messages, RAG documents, or delete your user account, the associated rows will be permanently deleted from database tables within <strong>30 days</strong>.</li>
              <li style={{ marginBottom: '8px' }}><strong>Consent Withdrawal:</strong> Upon explicit withdrawal of consent, we will terminate your data processing and initiate database erasure scripts, unless preservation is required by applicable law (e.g. Indian accounting or audit guidelines).</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section style={{ marginBottom: '45px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#f3f4f6', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Scale size={22} color="#3b82f6" /> 5. Data Controls &amp; Rights (Indian Norms)
            </h2>
            <p style={{ marginBottom: '12px' }}>
              As a Data Principal under India&apos;s DPDP Act, 2023, you enjoy full sovereignty over your personal data:
            </p>
            <ul style={{ paddingLeft: '22px', marginBottom: '20px' }}>
              <li style={{ marginBottom: '10px' }}><strong>Right to Access:</strong> You can query details about what profile, logs, and RAG document data are processed.</li>
              <li style={{ marginBottom: '10px' }}><strong>Right to Rectification:</strong> You can edit and complete your profile, company information, and settings in your account options.</li>
              <li style={{ marginBottom: '10px' }}><strong>Right to Erasure:</strong> Request deletion of your personal account, database entries, and custom workspace integrations.</li>
              <li style={{ marginBottom: '10px' }}><strong>Right to Nominate:</strong> You have the right to nominate a person who can manage your data principal rights in the event of death or physical/mental incapacity.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section style={{ marginBottom: '45px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#f3f4f6', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Phone size={22} color="#10b981" /> 6. Grievance Redressal and DPO Contact
            </h2>
            <p style={{ marginBottom: '16px' }}>
              If you have any questions, concerns, or grievances regarding our data handling procedures, or if you want to exercise your rights under the DPDP Act, you can contact our designated Grievance Officer:
            </p>
            <div style={{
              background: 'rgba(16, 185, 129, 0.05)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '8px',
              padding: '24px',
              fontSize: '15px',
              lineHeight: '1.6'
            }}>
              <strong style={{ color: '#34d399', fontSize: '16px' }}>Designated Grievance Redressal Officer / DPO:</strong><br />
              <strong>Ashish Pratap Singh Tomar</strong><br />
              Harikson AI Technologies Pvt. Ltd.<br />
              Email: <a href="mailto:grievance@harikson.ai" style={{ color: '#6ee7b7', textDecoration: 'none', fontWeight: '600' }}>grievance@harikson.ai</a><br />
              Office Address: Sector 62, Noida, Uttar Pradesh, India - 201301<br />
              Grievance Response SLA: <strong>Within 72 Hours</strong>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
