import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, Shield, Lock, FileText, Scale, UserCheck, HelpCircle, Eye, RefreshCw, AlertCircle, Phone, BookOpen, CreditCard, Key } from 'lucide-react';

export default function TermsOfServicePage() {
  return (
    <div style={{
      backgroundColor: '#f9fafb',
      color: '#1f2937',
      minHeight: '100vh',
      fontFamily: "'Outfit', sans-serif",
      padding: '60px 20px 100px 20px'
    }}>
      <Head>
        <title>Terms of Service | Harikson AI Platform</title>
        <meta name="description" content="Harikson AI Platform terms of service compliant with Indian Contract Act, Information Technology Rules, and DPDP Act 2023." />
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
            Terms of Service
          </h1>
          <p style={{
            fontSize: '18px',
            color: '#4b5563',
            margin: '0 0 24px 0',
            lineHeight: '1.6',
            fontWeight: '300'
          }}>
            These Terms of Service govern the access and use of the Services provided by **Harikson AI Technologies Private Limited** (hereinafter referred to as &ldquo;Harikson&rdquo;, &ldquo;Company&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), a company incorporated under the Companies Act, 2013 of India.
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
            <strong>Legal Notice:</strong> This document represents a binding electronic contract under the **Information Technology Act, 2000** and rules made thereunder. Please read these terms carefully before creating a workspace.
          </div>
        </div>

        {/* Key Pillars */}
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
            <BookOpen style={{ color: '#3b82f6', marginBottom: '12px' }} size={26} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', fontWeight: '600', color: '#111827' }}>Indian Contract Act</h3>
            <p style={{ margin: 0, fontSize: '13.5px', color: '#4b5563', lineHeight: '1.5' }}>
              All subscriptions and workspace allocations constitute valid commercial contracts governed by Indian laws.
            </p>
          </div>
          <div style={{
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <CreditCard style={{ color: '#10b981', marginBottom: '12px' }} size={26} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', fontWeight: '600', color: '#111827' }}>GST &amp; RBI Compliance</h3>
            <p style={{ margin: 0, fontSize: '13.5px', color: '#4b5563', lineHeight: '1.5' }}>
              All invoices display appropriate CGST/SGST breakdowns. Recurring auto-debits comply with RBI mandate guidelines.
            </p>
          </div>
          <div style={{
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <Key style={{ color: '#f59e0b', marginBottom: '12px' }} size={26} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', fontWeight: '600', color: '#111827' }}>IP &amp; Input Ownership</h3>
            <p style={{ margin: 0, fontSize: '13.5px', color: '#4b5563', lineHeight: '1.5' }}>
              Customers retain full ownership of uploaded data, queries, and resultant AI outputs under the Indian Copyright Act, 1957.
            </p>
          </div>
        </div>

        {/* Contents */}
        <div style={{
          lineHeight: '1.8',
          fontSize: '15.5px',
          color: '#374151'
        }}>
          
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '600', color: '#111827', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={20} color="#3b82f6" /> 1. Definitions &amp; Eligibility
            </h2>
            <ul style={{ paddingLeft: '20px' }}>
              <li style={{ marginBottom: '8px' }}><strong>&ldquo;Workspace Data&rdquo;:</strong> Customer data, vector index entries, and schema uploads.</li>
              <li style={{ marginBottom: '8px' }}><strong>&ldquo;AI Output&rdquo;:</strong> Natural language responses and model completions.</li>
              <li style={{ marginBottom: '8px' }}><strong>Eligibility:</strong> You must be at least 18 years old and qualified to enter contracts under the Indian Contract Act, 1872.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '600', color: '#111827', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Shield size={20} color="#10b981" /> 2. Permitted &amp; Prohibited Platform Uses
            </h2>
            <p style={{ marginBottom: '12px' }}>
              You are granted a revocable, limited license to access our platform. You explicitly agree not to:
            </p>
            <ul style={{ paddingLeft: '20px' }}>
              <li style={{ marginBottom: '8px' }}>Perform prompt injection, jailbreaking, or automated scraping.</li>
              <li style={{ marginBottom: '8px' }}>Use bots to bypass vector query rates or API execution limits.</li>
              <li style={{ marginBottom: '8px' }}>Upload malware, spyware, or malicious code.</li>
              <li style={{ marginBottom: '8px' }}>Reverse engineer the indexing algorithms or prompt optimization scripts.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '600', color: '#111827', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Scale size={20} color="#f59e0b" /> 3. Data Privacy and Indian DPDP Act, 2023
            </h2>
            <p style={{ marginBottom: '12px' }}>
              We adhere strictly to the Digital Personal Data Protection Act, 2023:
            </p>
            <ul style={{ paddingLeft: '20px' }}>
              <li style={{ marginBottom: '8px' }}>All operational workspace logs are protected under multi-tenant database rules.</li>
              <li style={{ marginBottom: '8px' }}>You retain the right to correct data principal records, register nominees, and request complete database erasure.</li>
              <li style={{ marginBottom: '8px' }}>Your uploads and prompts are **never** utilized for public training without distinct written authorization.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '600', color: '#111827', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CreditCard size={20} color="#3b82f6" /> 4. Billing, Invoices, and GST
            </h2>
            <ul style={{ paddingLeft: '20px' }}>
              <li style={{ marginBottom: '8px' }}><strong>GST Levies:</strong> Standard Goods and Services Tax (GST) at 18% is applied to all invoices generated for Indian tax residents.</li>
              <li style={{ marginBottom: '8px' }}><strong>Auto-Renewal:</strong> Subscription plans renew automatically. You can cancel at any time via the self-serve dashboard, transitioning your plan status to <code>canceling</code> until the end of the paid cycle.</li>
              <li style={{ marginBottom: '8px' }}><strong>Refunds:</strong> All transaction payments are non-refundable except as required under the Consumer Protection Act, 2019.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '600', color: '#111827', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle size={20} color="#ef4444" /> 5. Disclaimers &amp; Limitations of Liability
            </h2>
            <p style={{ marginBottom: '12px' }}>
              **Accuracy disclaimer:** Outputs are generated via natural language prediction models and can contain errors or hallucinations. All outputs must undergo human verification before business use.
            </p>
            <p style={{ marginBottom: '12px' }}>
              **Liability Cap:** To the maximum extent permitted by Indian law, our total liability for any claim shall not exceed the subscription fees paid by you in the preceding three (3) months.
            </p>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '600', color: '#111827', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Phone size={20} color="#8b5cf6" /> 6. Arbitration &amp; Grievance Redressal
            </h2>
            <p style={{ marginBottom: '12px' }}>
              Any dispute arising out of this agreement shall be referred to arbitration in Noida, Uttar Pradesh, India, under the Arbitration and Conciliation Act, 1996.
            </p>
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '24px',
              fontSize: '15px',
              lineHeight: '1.6',
              color: '#166534',
              marginTop: '16px'
            }}>
              <strong style={{ color: '#15803d', fontSize: '16px' }}>Designated Grievance Officer:</strong><br />
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
