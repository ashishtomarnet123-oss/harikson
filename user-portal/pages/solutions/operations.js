import React, { useState } from 'react';
import Link from 'next/link';
import HeaderNav from '../../components/layout/HeaderNav';
import FooterSection from '../../components/FooterSection';
import SEOHead, {
  defaultOrganizationSchema,
  defaultSoftwareApplicationSchema,
} from '../../components/SEOHead';
import {
  Briefcase,
  ArrowRight,
  Sparkles,
  Workflow,
  ShieldCheck,
  FileText,
  CheckCircle2,
  Check,
  ChevronDown,
  Clock,
  Layers,
  Database,
  Lock,
  Zap,
} from 'lucide-react';

export default function SolutionsOperationsPage() {
  const [activeFaq, setActiveFaq] = useState(null);

  const toggleFaq = (idx) => {
    setActiveFaq(activeFaq === idx ? null : idx);
  };

  const FAQS = [
    {
      q: 'How does Xarwiz automate invoice and receipt processing?',
      a: 'Operations teams connect an incoming document folder (via Google Drive or webhook). Xarwiz extracts line items, tax numbers, and dates using hybrid OCR and RAG parsing, validates the totals against purchase orders, and logs the records into your accounting database.',
    },
    {
      q: 'What prevents an automated agent from making unauthorized payments or refunds?',
      a: 'Every high-stakes workflow can be protected by a Human-in-the-Loop Approval gate. If an invoice or refund exceeds a configured threshold, the workflow enters a PAUSED state and dispatches an approval request to a designated manager on Slack or email with a signed token.',
    },
    {
      q: 'How does Xarwiz maintain compliance with the Digital Personal Data Protection (DPDP) Act 2023?',
      a: 'Xarwiz logs every data access, transformation, and retrieval event in an immutable PostgreSQL audit trail. Furthermore, our built-in Data Principal Rights portal allows operations teams to automatically fulfill citizen data access, correction, and deletion requests within statutory timeframes.',
    },
    {
      q: 'Can Xarwiz synchronize data between Google Sheets, Notion, and our internal CRM?',
      a: 'Yes. With native connectors for Google Drive, Notion, Slack, and REST APIs, Xarwiz executes scheduled or event-driven sync jobs that update customer databases and project boards with zero manual copy-pasting.',
    },
  ];

  return (
    <div className="solution-detail-page">
      <SEOHead
        title="AI Solutions for Business Operations & Back-Office - Xarwiz"
        description="Streamline enterprise operations, invoice reconciliation, human-in-the-loop approvals, and DPDP Act 2023 statutory compliance with Xarwiz."
        canonicalPath="/solutions/operations"
        jsonLd={[
          defaultOrganizationSchema,
          defaultSoftwareApplicationSchema,
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Xarwiz AI Solutions for Business Operations',
            url: 'https://xarwiz.com/solutions/operations',
            description:
              'Workflow automation and AI document intelligence designed to eliminate repetitive back-office operations and ensure DPDP statutory compliance.',
          },
        ]}
      />

      <HeaderNav activePath="/solutions" />

      <main className="solution-main">
        {/* HERO SECTION */}
        <section className="detail-hero">
          <div className="container">
            <div className="hero-content">
              <div className="hero-badge">
                <Briefcase size={14} />
                <span>Enterprise Operations &amp; Back-Office</span>
              </div>
              <h1 className="hero-title">
                Automate Repetitive Operations with <span className="blue-gradient">Auditable Precision</span>
              </h1>
              <p className="hero-subtitle">
                Replace brittle manual spreadsheets, copy-paste invoice processing, and delayed email sign-offs with deterministic DAG workflows and human-in-the-loop approvals.
              </p>
              <div className="hero-cta-group">
                <Link href="/signup" className="btn-primary">
                  <span>Modernize Your Operations</span>
                  <ArrowRight size={16} />
                </Link>
                <Link href="/signup?source=book_demo" className="btn-secondary">
                  <span>Schedule Operations Walkthrough</span>
                </Link>
              </div>

              <div className="hero-stats-row">
                <div className="hero-stat">
                  <span className="stat-num">80%</span>
                  <span className="stat-label">Reduction in Manual Data Entry</span>
                </div>
                <div className="hero-stat-sep" />
                <div className="hero-stat">
                  <span className="stat-num">100%</span>
                  <span className="stat-label">Immutable Audit Trail</span>
                </div>
                <div className="hero-stat-sep" />
                <div className="hero-stat">
                  <span className="stat-num">DPDP</span>
                  <span className="stat-label">Statutory Compliance Ready</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3 CORE OPERATIONS BOTTLENECKS */}
        <section className="usecases-section">
          <div className="container">
            <div className="section-head">
              <span className="section-eyebrow">Operational Excellence</span>
              <h2 className="section-title">Eliminate Back-Office Overhead</h2>
              <p className="section-subtitle">
                Automate multi-step business procedures while enforcing enterprise security and financial governance.
              </p>
            </div>

            <div className="usecases-grid">
              <div className="usecase-card">
                <div className="uc-header">
                  <div className="uc-icon">
                    <FileText size={22} />
                  </div>
                  <span className="uc-pill">Finance &amp; AP</span>
                </div>
                <h3>Manual Invoice Extraction &amp; Reconciliation</h3>
                <p className="uc-problem">
                  <strong>The Problem:</strong> Accounts payable teams manually transcribe GST numbers, line item prices, and invoice totals from multi-format vendor PDFs into accounting systems.
                </p>
                <p className="uc-solution">
                  <strong>The Xarwiz Solution:</strong> Automated DAG pipeline parses PDF attachments from Google Drive or email, extracts line items via hybrid RAG intelligence, validates GST numbers, and updates Notion or Google Sheets.
                </p>
                <div className="uc-features">
                  <span>✓ Multi-format PDF line-item parsing</span>
                  <span>✓ Razorpay ledger matching</span>
                  <span>✓ Duplicate invoice detection</span>
                </div>
              </div>

              <div className="usecase-card">
                <div className="uc-header">
                  <div className="uc-icon">
                    <ShieldCheck size={22} />
                  </div>
                  <span className="uc-pill">Governance &amp; Controls</span>
                </div>
                <h3>Approval Bottlenecks &amp; Lack of Auditability</h3>
                <p className="uc-problem">
                  <strong>The Problem:</strong> Sensitive approvals for vendor payouts or customer refunds get stuck in email threads, leaving no verifiable compliance paper trail.
                </p>
                <p className="uc-solution">
                  <strong>The Xarwiz Solution:</strong> Workflows pause before payment dispatch. A cryptographically signed approval card is routed to the authorized manager in Slack, resuming only upon two-factor confirmation.
                </p>
                <div className="uc-features">
                  <span>✓ Slack one-click signed approvals</span>
                  <span>✓ Configurable timeout &amp; escalation</span>
                  <span>✓ Tamper-proof audit logs</span>
                </div>
              </div>

              <div className="usecase-card">
                <div className="uc-header">
                  <div className="uc-icon">
                    <Database size={22} />
                  </div>
                  <span className="uc-pill">Statutory Privacy</span>
                </div>
                <h3>DPDP Act 2023 Compliance &amp; Data Rights Requests</h3>
                <p className="uc-problem">
                  <strong>The Problem:</strong> Indian enterprises must fulfill Data Principal requests for data access, correction, or erasure within statutory timeframes or risk substantial penalties.
                </p>
                <p className="uc-solution">
                  <strong>The Xarwiz Solution:</strong> Use our integrated Data Principal Rights portal. Requests trigger automated database lookups across isolated tenant schemas and generate certified compliance reports.
                </p>
                <div className="uc-features">
                  <span>✓ Purpose-specific consent tracking</span>
                  <span>✓ Automated erasure across vector indexes</span>
                  <span>✓ Self-service Data Principal portal</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* RECONCILIATION WORKFLOW DEMO */}
        <section className="blueprint-section">
          <div className="container">
            <div className="blueprint-card">
              <div className="bp-text">
                <span className="section-eyebrow">Enterprise Pipeline</span>
                <h2>Automated Invoice Reconciliation &amp; Approval</h2>
                <p>
                  A real-world production workflow orchestrating incoming vendor bills with human sign-off and ledger recording.
                </p>

                <div className="bp-pipeline-list">
                  <div className="bp-step">
                    <span className="bp-step-num">01</span>
                    <div>
                      <strong>Google Drive File Sync:</strong> Vendor uploads invoice PDF to designated partner folder.
                    </div>
                  </div>
                  <div className="bp-step">
                    <span className="bp-step-num">02</span>
                    <div>
                      <strong>OCR &amp; RAG Extraction:</strong> Xarwiz parses vendor GSTIN, invoice date, and total line amount.
                    </div>
                  </div>
                  <div className="bp-step">
                    <span className="bp-step-num">03</span>
                    <div>
                      <strong>Human Approval Gate:</strong> If amount &gt; ₹50,000, send interactive Slack approval card to Finance Lead.
                    </div>
                  </div>
                  <div className="bp-step">
                    <span className="bp-step-num">04</span>
                    <div>
                      <strong>Ledger Sync:</strong> Upon approval, append entry to Notion Accounts Payable database and archive PDF.
                    </div>
                  </div>
                </div>
              </div>

              <div className="bp-visual">
                <div className="bp-box">
                  <div className="bp-box-header">
                    <Workflow size={16} />
                    <span>invoice-approval-pipeline.dag</span>
                  </div>
                  <div className="bp-box-body">
                    <div className="bp-node active">
                      <span className="n-badge">DRIVE</span>
                      <span className="n-name">Drive Ingestion Trigger</span>
                    </div>
                    <div className="bp-arrow">&darr;</div>
                    <div className="bp-node">
                      <span className="n-badge">RAG</span>
                      <span className="n-name">Hybrid GSTIN &amp; Line Extraction</span>
                    </div>
                    <div className="bp-arrow">&darr;</div>
                    <div className="bp-node paused">
                      <span className="n-badge">GATE</span>
                      <span className="n-name">Manager Slack Approval (Pending)</span>
                    </div>
                    <div className="bp-arrow">&darr;</div>
                    <div className="bp-node success">
                      <span className="n-badge">SYNC</span>
                      <span className="n-name">Notion DB Ledger Export</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section className="faq-section">
          <div className="container">
            <div className="section-head">
              <span className="section-eyebrow">Frequently Asked Questions</span>
              <h2 className="section-title">Operations Solutions FAQs</h2>
              <p className="section-subtitle">
                Technical details on integrations, human approvals, and compliance.
              </p>
            </div>

            <div className="faq-list">
              {FAQS.map((faq, idx) => (
                <div
                  key={idx}
                  className={`faq-item ${activeFaq === idx ? 'expanded' : ''}`}
                >
                  <button
                    type="button"
                    className="faq-question"
                    onClick={() => toggleFaq(idx)}
                    aria-expanded={activeFaq === idx}
                  >
                    <span>{faq.q}</span>
                    <ChevronDown size={18} className="faq-icon" />
                  </button>
                  {activeFaq === idx && (
                    <div className="faq-answer">
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA SECTION */}
        <section className="cta-banner-section">
          <div className="container">
            <div className="cta-box">
              <h2>Bring Modern Automation to Your Operations</h2>
              <p>
                Empower your business teams with reliable, auditable AI pipelines.
              </p>
              <div className="cta-actions">
                <Link href="/signup" className="btn-primary">
                  <span>Request Access</span>
                  <ArrowRight size={16} />
                </Link>
                <Link href="/data-rights" className="btn-secondary">
                  <span>Data Principal Rights Portal</span>
                </Link>
                <Link href="/contact" className="btn-tertiary">
                  <span>Contact Sales</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <FooterSection />

      <style jsx>{`
        .solution-detail-page {
          min-height: 100vh;
          background-color: #0b1120;
          color: #f8fafc;
          font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .blue-gradient {
          background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* HERO */
        .detail-hero {
          padding: 80px 0 60px 0;
          position: relative;
          background: radial-gradient(circle at 50% 20%, rgba(37, 99, 235, 0.12) 0%, transparent 60%);
        }

        .hero-content {
          text-align: center;
          max-width: 860px;
          margin: 0 auto 50px auto;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 9999px;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.25);
          color: #93c5fd;
          font-size: 0.82rem;
          font-weight: 600;
          margin-bottom: 24px;
        }

        .hero-title {
          font-size: clamp(2.4rem, 4.8vw, 3.8rem);
          font-weight: 800;
          line-height: 1.15;
          letter-spacing: -0.03em;
          margin-bottom: 20px;
          color: #ffffff;
        }

        .hero-subtitle {
          font-size: clamp(1.05rem, 1.8vw, 1.22rem);
          line-height: 1.6;
          color: #94a3b8;
          margin-bottom: 36px;
        }

        .hero-cta-group {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 48px;
        }

        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: #2563eb;
          color: #ffffff;
          padding: 14px 28px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.95rem;
          text-decoration: none;
          box-shadow: 0 4px 20px rgba(37, 99, 235, 0.35);
          transition: all 0.2s ease;
        }

        .btn-primary:hover {
          background: #1d4ed8;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(37, 99, 235, 0.5);
        }

        .btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
          padding: 14px 28px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.95rem;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
        }

        .hero-stats-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 32px;
          padding-top: 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .hero-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .stat-num {
          font-size: 1.4rem;
          font-weight: 800;
          color: #60a5fa;
        }

        .stat-label {
          font-size: 0.8rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .hero-stat-sep {
          width: 1px;
          height: 32px;
          background: rgba(255, 255, 255, 0.1);
        }

        /* USE CASES */
        .usecases-section {
          padding: 90px 0;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .section-head {
          text-align: center;
          max-width: 720px;
          margin: 0 auto 60px auto;
        }

        .section-eyebrow {
          display: inline-block;
          font-size: 0.8rem;
          font-weight: 700;
          color: #3b82f6;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 12px;
        }

        .section-title {
          font-size: clamp(1.8rem, 3.2vw, 2.5rem);
          font-weight: 800;
          color: #ffffff;
          line-height: 1.25;
          margin-bottom: 16px;
          letter-spacing: -0.02em;
        }

        .section-subtitle {
          font-size: 1.02rem;
          color: #94a3b8;
          line-height: 1.6;
        }

        .usecases-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }

        .usecase-card {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 32px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          transition: all 0.25s ease;
        }

        .usecase-card:hover {
          border-color: rgba(59, 130, 246, 0.3);
          transform: translateY(-2px);
          background: rgba(15, 23, 42, 0.85);
        }

        .uc-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .uc-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: rgba(59, 130, 246, 0.12);
          color: #60a5fa;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .uc-pill {
          font-size: 0.72rem;
          font-weight: 700;
          color: #38bdf8;
          background: rgba(56, 189, 248, 0.1);
          padding: 4px 8px;
          border-radius: 6px;
          text-transform: uppercase;
        }

        .usecase-card h3 {
          font-size: 1.15rem;
          font-weight: 700;
          color: #ffffff;
          line-height: 1.35;
        }

        .uc-problem {
          font-size: 0.86rem;
          color: #94a3b8;
          line-height: 1.55;
          margin: 0;
        }

        .uc-problem strong {
          color: #f87171;
        }

        .uc-solution {
          font-size: 0.86rem;
          color: #cbd5e1;
          line-height: 1.55;
          margin: 0;
          flex-grow: 1;
        }

        .uc-solution strong {
          color: #4ade80;
        }

        .uc-features {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 0.78rem;
          color: #93c5fd;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        /* BLUEPRINT */
        .blueprint-section {
          padding: 80px 0;
          background: rgba(15, 23, 42, 0.35);
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .blueprint-card {
          background: #0f172a;
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 20px;
          padding: 40px;
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 40px;
          align-items: center;
        }

        .bp-text h2 {
          font-size: clamp(1.6rem, 2.8vw, 2.2rem);
          font-weight: 800;
          color: #ffffff;
          line-height: 1.25;
          margin-bottom: 16px;
        }

        .bp-text p {
          font-size: 0.95rem;
          color: #94a3b8;
          line-height: 1.6;
          margin-bottom: 24px;
        }

        .bp-pipeline-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .bp-step {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          font-size: 0.88rem;
          color: #cbd5e1;
        }

        .bp-step-num {
          font-family: monospace;
          font-size: 0.82rem;
          font-weight: 700;
          color: #60a5fa;
          background: rgba(59, 130, 246, 0.15);
          padding: 2px 6px;
          border-radius: 4px;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .bp-step strong {
          color: #ffffff;
        }

        .bp-box {
          background: #090e1a;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          overflow: hidden;
        }

        .bp-box-header {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #0d1527;
          padding: 10px 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          font-family: monospace;
          font-size: 0.78rem;
          color: #94a3b8;
        }

        .bp-box-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: center;
        }

        .bp-node {
          width: 100%;
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .bp-node.active {
          border-color: rgba(59, 130, 246, 0.4);
          background: rgba(59, 130, 246, 0.08);
        }

        .bp-node.paused {
          border-color: rgba(234, 179, 8, 0.4);
          background: rgba(234, 179, 8, 0.08);
        }

        .bp-node.success {
          border-color: rgba(34, 197, 94, 0.4);
          background: rgba(34, 197, 94, 0.08);
        }

        .n-badge {
          font-size: 0.68rem;
          font-weight: 700;
          color: #60a5fa;
          font-family: monospace;
        }

        .n-name {
          font-size: 0.82rem;
          color: #ffffff;
          font-weight: 600;
        }

        .bp-arrow {
          color: #475569;
          font-size: 1rem;
          line-height: 1;
        }

        /* FAQ */
        .faq-section {
          padding: 90px 0;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .faq-list {
          max-width: 800px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .faq-item {
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.2s;
        }

        .faq-item.expanded {
          border-color: rgba(59, 130, 246, 0.3);
        }

        .faq-question {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 22px;
          background: none;
          border: none;
          color: #f1f5f9;
          font-size: 0.96rem;
          font-weight: 700;
          text-align: left;
          cursor: pointer;
        }

        .faq-icon {
          color: #64748b;
          transition: transform 0.2s;
          flex-shrink: 0;
        }

        .faq-item.expanded .faq-icon {
          transform: rotate(180deg);
          color: #60a5fa;
        }

        .faq-answer {
          padding: 0 22px 20px 22px;
          color: #94a3b8;
          font-size: 0.9rem;
          line-height: 1.6;
        }

        /* CTA */
        .cta-banner-section {
          padding: 60px 0 90px 0;
        }

        .cta-box {
          background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #1d4ed8 100%);
          border-radius: 20px;
          padding: 48px;
          text-align: center;
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 25px 50px -12px rgba(29, 78, 216, 0.3);
        }

        .cta-box h2 {
          font-size: clamp(1.8rem, 3.2vw, 2.4rem);
          font-weight: 800;
          color: #ffffff;
          margin-bottom: 12px;
        }

        .cta-box p {
          font-size: 1.05rem;
          color: #dbeafe;
          margin-bottom: 32px;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }

        .cta-actions {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .btn-tertiary {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: transparent;
          color: #ffffff;
          padding: 14px 28px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.95rem;
          text-decoration: underline;
          text-underline-offset: 4px;
        }

        @media (max-width: 1024px) {
          .usecases-grid {
            grid-template-columns: 1fr;
          }
          .blueprint-card {
            grid-template-columns: 1fr;
            padding: 32px;
          }
        }

        @media (max-width: 768px) {
          .hero-stats-row {
            flex-direction: column;
            gap: 16px;
          }
          .hero-stat-sep {
            display: none;
          }
          .cta-box {
            padding: 32px 20px;
          }
          .cta-actions {
            flex-direction: column;
            width: 100%;
          }
          .btn-primary, .btn-secondary, .btn-tertiary {
            width: 100%;
            justify-content: center;
            box-sizing: border-box;
          }
        }
      `}</style>
    </div>
  );
}
