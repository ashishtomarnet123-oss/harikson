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

        {/* Full 92-clause mapped details */}
        <div style={{
          lineHeight: '1.8',
          fontSize: '15.5px',
          color: '#374151'
        }}>
          
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '600', color: '#111827', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={20} color="#3b82f6" /> 1. Introduction, Eligibility &amp; Accounts
            </h2>
            <p style={{ marginBottom: '12px' }}>
              These Terms constitute a legally binding agreement between the Customer and Harikson AI Technologies Private Limited.
            </p>
            <ul style={{ paddingLeft: '20px' }}>
              <li style={{ marginBottom: '8px' }}><strong>Definitions:</strong> &ldquo;Workspace Data&rdquo; designates prompts and indexes; &ldquo;AI Output&rdquo; covers model-generated content.</li>
              <li style={{ marginBottom: '8px' }}><strong>Eligibility:</strong> Users must be at least 18 years of age and hold absolute contracting capacity under the Indian Contract Act, 1872.</li>
              <li style={{ marginBottom: '8px' }}><strong>Account Security:</strong> You are responsible for safeguarding API keys. Know-Your-Customer (KYC) verification applies under AML rules of India.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '600', color: '#111827', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Shield size={20} color="#10b981" /> 2. Permitted &amp; Prohibited Platform Uses
            </h2>
            <p style={{ marginBottom: '12px' }}>
              We grant a revocable, limited license to access our platform. You agree to adhere to the following conditions:
            </p>
            <ul style={{ paddingLeft: '20px' }}>
              <li style={{ marginBottom: '8px' }}>No prompt injections, boundaries jailbreaking, or automated crawler indexing.</li>
              <li style={{ marginBottom: '8px' }}>No sharing of developer API private keys or unauthorized reverse engineering of RAG index structures.</li>
              <li style={{ marginBottom: '8px' }}>No uploading of spyware, trojans, or malware.</li>
              <li style={{ marginBottom: '8px' }}>Under IT Rules 2021, you must not store, modify, or transmit racially objectionable or copyright-infringing content.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '600', color: '#111827', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Key size={20} color="#f59e0b" /> 3. Intellectual Property, Inputs &amp; Outputs
            </h2>
            <ul style={{ paddingLeft: '20px' }}>
              <li style={{ marginBottom: '8px' }}><strong>Prompt Ownership:</strong> Users retain absolute ownership of prompt inputs, documentation, and database assets.</li>
              <li style={{ marginBottom: '8px' }}><strong>Generated Output:</strong> Subject to subscription payments, Harikson transfers all rights in generated output to the user.</li>
              <li style={{ marginBottom: '8px' }}><strong>Model Training:</strong> Harikson does **not** utilize user inputs or vectors to train public foundation language models.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '600', color: '#111827', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CreditCard size={20} color="#3b82f6" /> 4. Pricing, GST, Wallet &amp; Cancellations
            </h2>
            <ul style={{ paddingLeft: '20px' }}>
              <li style={{ marginBottom: '8px' }}><strong>GST Levies:</strong> 18% GST is added to all invoices for Indian companies. Enter a valid GSTIN to apply for Input Tax Credit.</li>
              <li style={{ marginBottom: '8px' }}><strong>Prepaid Wallet:</strong> Prepaid wallet credits have a twelve (12) month validity window and are non-refundable.</li>
              <li style={{ marginBottom: '8px' }}><strong>Auto-Renewal &amp; Cancel:</strong> Cancellations must be registered 48 hours before renewal. Cancelled statuses remain in a <code>canceling</code> state until the cycle expires.</li>
              <li style={{ marginBottom: '8px' }}><strong>Refunds:</strong> Payments are non-refundable except as mandated by the Consumer Protection Act, 2019.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '600', color: '#111827', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Lock size={20} color="#10b981" /> 5. Data Isolation &amp; Security Compliance
            </h2>
            <p style={{ marginBottom: '12px' }}>
              We adhere strictly to the Digital Personal Data Protection (DPDP) Act, 2023:
            </p>
            <ul style={{ paddingLeft: '20px' }}>
              <li style={{ marginBottom: '8px' }}>Workspace and RAG isolation are enforced through Row-Level Security (RLS).</li>
              <li style={{ marginBottom: '8px' }}>Data localization: All servers storing database records are located within the geographical borders of India.</li>
              <li style={{ marginBottom: '8px' }}>Retention: System access audit logs are retained for 180 days according to national security norms.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '600', color: '#111827', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle size={20} color="#ef4444" /> 6. Disclaimer of Accuracy &amp; Liability Cap
            </h2>
            <p style={{ marginBottom: '12px' }}>
              <strong>Hallucination Notice:</strong> Outputs represent predicted heuristics. Customers are required to perform human verification on all outputs before reliance. High-risk diagnostic or legal uses are prohibited.
            </p>
            <p style={{ marginBottom: '12px' }}>
              <strong>Liability Limitation:</strong> Total liability for any damages shall not exceed the subscription fees paid by you in the immediately preceding three (3) months.
            </p>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '600', color: '#111827', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Phone size={20} color="#8b5cf6" /> 7. Governing Law, Arbitration &amp; Redressal
            </h2>
            <p style={{ marginBottom: '12px' }}>
              These terms are governed by the laws of India. Any dispute will be resolved exclusively through arbitration in Noida under the Arbitration and Conciliation Act, 1996.
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
