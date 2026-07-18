import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, Cookie, Shield, RefreshCw, Lock, Eye, AlertCircle } from 'lucide-react';

export default function CookiePolicyPage() {
  return (
    <div style={{
      backgroundColor: '#f9fafb',
      color: '#1f2937',
      minHeight: '100vh',
      fontFamily: "'Outfit', sans-serif",
      padding: '60px 20px 100px 20px',
      lineHeight: '1.8'
    }}>
      <Head>
        <title>Cookie Policy | Harikson AI</title>
        <meta name="description" content="Harikson AI Cookie Policy - detailed disclosures compliant with DPDP Act 2023, GDPR, and ePrivacy Directive." />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet" />
      </Head>

      <div style={{
        maxWidth: '960px',
        margin: '0 auto'
      }}>
        {/* Navigation Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '50px',
          borderBottom: '1px solid #e5e7eb',
          paddingBottom: '20px'
        }}>
          <Link href="/">
            <a style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#4b5563',
              textDecoration: 'none',
              fontSize: '14.5px',
              fontWeight: '500',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent, #3b82f6)'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#4b5563'}
            >
              <ArrowLeft size={16} />
              Back to Home
            </a>
          </Link>
          <div style={{
            fontSize: '13px',
            color: '#4b5563',
            background: '#f3f4f6',
            padding: '4px 12px',
            borderRadius: '20px',
            border: '1px solid #e5e7eb'
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
            background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.5px'
          }}>
            Cookie Policy
          </h1>
          <p style={{
            fontSize: '18px',
            color: '#4b5563',
            margin: '0 0 24px 0',
            lineHeight: '1.6',
            fontWeight: '300'
          }}>
            This Cookie Policy describes how **Harikson AI Technologies Private Limited** uses cookies and similar tracking technologies when you use our Platform.
          </p>
          <div style={{
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            padding: '16px',
            fontSize: '14px',
            color: '#1e40af',
            lineHeight: '1.5'
          }}>
            <strong>Consent Framework:</strong> We implement cookie banners that comply with GDPR guidelines and the **Digital Personal Data Protection (DPDP) Act, 2023** of India, ensuring your preferences are strictly respected.
          </div>
        </div>

        {/* Core Categories Card Deck */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          marginBottom: '50px'
        }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <Cookie style={{ color: '#3b82f6', marginBottom: '12px' }} size={26} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', fontWeight: '600', color: '#111827' }}>Essential Cookies</h3>
            <p style={{ margin: 0, fontSize: '13.5px', color: '#4b5563', lineHeight: '1.5' }}>
              Necessary for security validation, login tokens, and API authentication. These cannot be disabled.
            </p>
          </div>
          <div style={{
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <Shield style={{ color: '#10b981', marginBottom: '12px' }} size={26} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', fontWeight: '600', color: '#111827' }}>Preference Cookies</h3>
            <p style={{ margin: 0, fontSize: '13.5px', color: '#4b5563', lineHeight: '1.5' }}>
              Remembers theme settings, workspace layouts, and model selections across sessions.
            </p>
          </div>
          <div style={{
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <RefreshCw style={{ color: '#f59e0b', marginBottom: '12px' }} size={26} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', fontWeight: '600', color: '#111827' }}>Analytics &amp; Performance</h3>
            <p style={{ margin: 0, fontSize: '13.5px', color: '#4b5563', lineHeight: '1.5' }}>
              Aggregates metrics like tokens consumed, prompt processing latencies, and error diagnostics.
            </p>
          </div>
        </div>

        {/* Detailed Sections */}
        <div style={{
          lineHeight: '1.8',
          fontSize: '15.5px',
          color: '#374151'
        }}>
          
          <section style={{ marginBottom: '45px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#111827', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Eye size={22} color="#3b82f6" /> 1. Tracking Technologies We Use
            </h2>
            <p style={{ marginBottom: '16px' }}>
              Besides standard HTTP cookies, the platform uses several browser-based data stores to maintain optimal rendering efficiency:
            </p>
            <ul style={{ paddingLeft: '22px', marginBottom: '20px' }}>
              <li style={{ marginBottom: '10px' }}><strong>Local &amp; Session Storage:</strong> Used to temporarily store workspace settings and session details.</li>
              <li style={{ marginBottom: '10px' }}><strong>IndexedDB:</strong> Browser databases used to cache vector indices or complex data schemas for fast workspace switching.</li>
              <li style={{ marginBottom: '10px' }}><strong>Secure Cookies:</strong> Auth cookies are always set with the <code>Secure</code>, <code>HttpOnly</code>, and <code>SameSite=Strict</code> flags to prevent cross-site scripting (XSS) and cross-site request forgery (CSRF).</li>
            </ul>
          </section>

          <section style={{ marginBottom: '45px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#111827', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Lock size={22} color="#10b981" /> 2. AI-Specific Cookies &amp; Model Memory
            </h2>
            <p style={{ marginBottom: '16px' }}>
              To support natural language prediction and local vector indexing, we store operational parameters:
            </p>
            <ul style={{ paddingLeft: '22px', marginBottom: '20px' }}>
              <li style={{ marginBottom: '10px' }}><strong>Conversation Context:</strong> Ties your current chat interface to active prompt history arrays.</li>
              <li style={{ marginBottom: '10px' }}><strong>Workspace Context:</strong> Identifies which Postgres tenant RLS context is active for document queries.</li>
              <li style={{ marginBottom: '10px' }}><strong>Rate Limiting:</strong> Monitors query counts per user session to prevent API resource abuse.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '45px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#111827', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertCircle size={22} color="#f59e0b" /> 3. Consent Management
            </h2>
            <p style={{ marginBottom: '16px' }}>
              In compliance with global ePrivacy rules and the Indian DPDP Act, we implement strict consent mechanisms:
            </p>
            <ul style={{ paddingLeft: '22px', marginBottom: '20px' }}>
              <li style={{ marginBottom: '10px' }}><strong>Opt-in:</strong> No non-essential (analytics or marketing) cookies are set before you select &quot;Accept All&quot; or enable them in custom choices.</li>
              <li style={{ marginBottom: '10px' }}><strong>GPC Signal:</strong> We honor the <strong>Global Privacy Control (GPC)</strong> broadcast by browsers and auto-restrict non-essential trackers in response.</li>
              <li style={{ marginBottom: '10px' }}><strong>Withdrawal:</strong> You can click the &quot;Cookie Preferences&quot; tab at the footer of the portal to alter or revoke consent settings instantly.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '45px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#111827', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Cookie size={22} color="#8b5cf6" /> 4. Contact Information &amp; Officer Details
            </h2>
            <p style={{ marginBottom: '16px' }}>
              If you have any questions or complaints regarding our tracking policies, contact our privacy desk:
            </p>
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '24px',
              fontSize: '15px',
              lineHeight: '1.6',
              color: '#166534'
            }}>
              <strong style={{ color: '#15803d', fontSize: '16px' }}>Designated Grievance Redressal Officer / DPO:</strong><br />
              <strong>Ashish Pratap Singh Tomar</strong><br />
              Harikson AI Technologies Private Limited<br />
              Email: <a href="mailto:grievance@harikson.ai" style={{ color: '#16a34a', textDecoration: 'none', fontWeight: '600' }}>grievance@harikson.ai</a><br />
              Office Address: Sector 62, Noida, Uttar Pradesh, India - 201301
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
