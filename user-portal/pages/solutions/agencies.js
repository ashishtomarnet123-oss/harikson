import React, { useState } from 'react';
import Link from 'next/link';
import HeaderNav from '../../components/layout/HeaderNav';
import FooterSection from '../../components/FooterSection';
import SEOHead, {
  defaultOrganizationSchema,
  defaultSoftwareApplicationSchema,
} from '../../components/SEOHead';
import {
  Layers,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Check,
  ChevronDown,
  Users,
  Building2,
  Lock,
  Workflow,
  Key,
  BarChart3,
  Bot,
} from 'lucide-react';

export default function SolutionsAgenciesPage() {
  const [activeFaq, setActiveFaq] = useState(null);

  const toggleFaq = (idx) => {
    setActiveFaq(activeFaq === idx ? null : idx);
  };

  const FAQS = [
    {
      q: 'How does Xarwiz prevent data cross-contamination between different agency clients?',
      a: 'Xarwiz employs hard multi-tenant isolation. Each client operates in a dedicated tenant partition with separate PostgreSQL row-level security boundaries, distinct AES-256 encrypted vector index schemas, and independent API keys. A query or agent in Client A can never access data belonging to Client B.',
    },
    {
      q: 'Can agencies track AI message usage and billing individually per client?',
      a: 'Yes. The Xarwiz multi-tenant dashboard breaks down AI message consumption, document storage quotas, and webhook executions per tenant workspace. This makes client rebilling and margin tracking straightforward.',
    },
    {
      q: 'Can we package our proprietary workflows as reusable blueprints for new client onboarding?',
      a: 'Yes. Agencies can export tested DAG workflow definitions and agent configurations as blueprints, allowing you to spin up turnkey solutions for new client accounts in minutes.',
    },
    {
      q: 'Does Xarwiz support client-specific custom model endpoints?',
      a: 'Yes. If an enterprise client requires their own private vLLM or fine-tuned open-source model instance, you can configure custom model endpoints specifically for that tenant workspace while standard clients utilize sovereign Ollama hosting.',
    },
  ];

  return (
    <div className="solution-detail-page">
      <SEOHead
        title="AI Solutions for Agencies & Consultancies - Xarwiz"
        description="Deliver bespoke AI agents and workflow automations to clients with multi-tenant workspace isolation, granular API keys, and independent usage tracking."
        canonicalPath="/solutions/agencies"
        jsonLd={[
          defaultOrganizationSchema,
          defaultSoftwareApplicationSchema,
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Xarwiz AI Solutions for Agencies & Consultancies',
            url: 'https://xarwiz.com/solutions/agencies',
            description:
              'Multi-tenant AI agent and workflow orchestration platform built for agencies to deliver secure, compartmentalized client automations.',
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
                <Layers size={14} />
                <span>Multi-Tenant Agency Infrastructure</span>
              </div>
              <h1 className="hero-title">
                Deliver Enterprise AI Solutions with <span className="blue-gradient">Strict Tenant Isolation</span>
              </h1>
              <p className="hero-subtitle">
                Scale your agency&apos;s automation revenue. Deploy custom AI agents, visual DAG workflows, and document intelligence for dozens of clients with zero data cross-contamination.
              </p>
              <div className="hero-cta-group">
                <Link href="/signup" className="btn-primary">
                  <span>Create Agency Workspace</span>
                  <ArrowRight size={16} />
                </Link>
                <Link href="/signup?source=book_demo" className="btn-secondary">
                  <span>Schedule Agency Partner Demo</span>
                </Link>
              </div>

              <div className="hero-stats-row">
                <div className="hero-stat">
                  <span className="stat-num">100%</span>
                  <span className="stat-label">Isolated Client Partitions</span>
                </div>
                <div className="hero-stat-sep" />
                <div className="hero-stat">
                  <span className="stat-num">Turnkey</span>
                  <span className="stat-label">Reusable Workflow Blueprints</span>
                </div>
                <div className="hero-stat-sep" />
                <div className="hero-stat">
                  <span className="stat-num">Granular</span>
                  <span className="stat-label">Per-Client Usage Tracking</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3 CORE AGENCY CHALLENGES */}
        <section className="usecases-section">
          <div className="container">
            <div className="section-head">
              <span className="section-eyebrow">Agency Architecture</span>
              <h2 className="section-title">Built for Modern AI Consultancies</h2>
              <p className="section-subtitle">
                Solve the security, governance, and billing challenges of managing multiple external client deployments.
              </p>
            </div>

            <div className="usecases-grid">
              <div className="usecase-card">
                <div className="uc-header">
                  <div className="uc-icon">
                    <Lock size={22} />
                  </div>
                  <span className="uc-pill">Client Data Security</span>
                </div>
                <h3>Zero Cross-Client Contamination Risk</h3>
                <p className="uc-problem">
                  <strong>The Problem:</strong> Storing multiple client documents or vector embeddings in shared, loosely scoped databases creates severe data leak liabilities.
                </p>
                <p className="uc-solution">
                  <strong>The Xarwiz Solution:</strong> Multi-tenant PostgreSQL architecture enforces strict tenant_id scoping at the database engine level, with separate AES-256 encryption keys per workspace.
                </p>
                <div className="uc-features">
                  <span>✓ Row-level tenant partitioning</span>
                  <span>✓ Encrypted vector indexes</span>
                  <span>✓ Isolated file sandbox paths</span>
                </div>
              </div>

              <div className="usecase-card">
                <div className="uc-header">
                  <div className="uc-icon">
                    <BarChart3 size={22} />
                  </div>
                  <span className="uc-pill">Commercial Tracking</span>
                </div>
                <h3>Transparent Per-Client Billing &amp; Quotas</h3>
                <p className="uc-problem">
                  <strong>The Problem:</strong> When agencies deploy AI agents for clients, tracking which client consumed which LLM tokens or API calls requires tedious manual reconciliation.
                </p>
                <p className="uc-solution">
                  <strong>The Xarwiz Solution:</strong> Granular workspace metrics record AI messages, tool invocations, and document storage separately per client organization, simplifying invoicing.
                </p>
                <div className="uc-features">
                  <span>✓ Per-workspace usage analytics</span>
                  <span>✓ Configurable monthly caps</span>
                  <span>✓ Safety fallback protections</span>
                </div>
              </div>

              <div className="usecase-card">
                <div className="uc-header">
                  <div className="uc-icon">
                    <Workflow size={22} />
                  </div>
                  <span className="uc-pill">Delivery Velocity</span>
                </div>
                <h3>Turnkey Blueprints &amp; Rapid Client Onboarding</h3>
                <p className="uc-problem">
                  <strong>The Problem:</strong> Rebuilding the same triage agents, webhook listeners, and document ingestion pipelines from scratch for every client slows delivery margins.
                </p>
                <p className="uc-solution">
                  <strong>The Xarwiz Solution:</strong> Build your agency&apos;s proprietary workflow template library once, and clone it into new client environments with custom API credentials in seconds.
                </p>
                <div className="uc-features">
                  <span>✓ One-click blueprint cloning</span>
                  <span>✓ Client-specific credential injection</span>
                  <span>✓ Faster time-to-revenue</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* AGENCY WORKSPACE DIAGRAM */}
        <section className="blueprint-section">
          <div className="container">
            <div className="blueprint-card">
              <div className="bp-text">
                <span className="section-eyebrow">Multi-Tenant Governance</span>
                <h2>One Master Console. Complete Client Segregation.</h2>
                <p>
                  Maintain full administrative control while granting clients restricted access to their dedicated analytics and approval feeds.
                </p>

                <div className="bp-pipeline-list">
                  <div className="bp-step">
                    <span className="bp-step-num">01</span>
                    <div>
                      <strong>Master Agency Console:</strong> Manage all client contracts, overall quota consumption, and blueprint updates.
                    </div>
                  </div>
                  <div className="bp-step">
                    <span className="bp-step-num">02</span>
                    <div>
                      <strong>Client Workspace A:</strong> Isolated RAG index for legal client, independent webhooks, dedicated Slack channel.
                    </div>
                  </div>
                  <div className="bp-step">
                    <span className="bp-step-num">03</span>
                    <div>
                      <strong>Client Workspace B:</strong> E-commerce client with custom Ollama models and daily invoice reconciliation DAG.
                    </div>
                  </div>
                </div>
              </div>

              <div className="bp-visual">
                <div className="bp-box">
                  <div className="bp-box-header">
                    <Layers size={16} />
                    <span>agency-tenant-topology.map</span>
                  </div>
                  <div className="bp-box-body">
                    <div className="bp-node active">
                      <span className="n-badge">ROOT</span>
                      <span className="n-name">Apex Agency Master Account</span>
                    </div>
                    <div className="bp-arrow">&darr;</div>
                    <div className="bp-branch-row">
                      <div className="bp-node sub-node">
                        <span className="n-badge">TENANT A</span>
                        <span className="n-name">Fintech Client &bull; Isolated DB</span>
                      </div>
                      <div className="bp-node sub-node">
                        <span className="n-badge">TENANT B</span>
                        <span className="n-name">Retail Client &bull; Custom Model</span>
                      </div>
                    </div>
                    <div className="bp-arrow">&darr;</div>
                    <div className="bp-node success">
                      <span className="n-badge">AUDIT</span>
                      <span className="n-name">Per-Tenant DPDP &amp; RLS Verified</span>
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
              <h2 className="section-title">Agency Solutions FAQs</h2>
              <p className="section-subtitle">
                Technical details on multi-tenancy, partner programs, and client management.
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
              <h2>Empower Your Agency with Enterprise AI Infrastructure</h2>
              <p>
                Deliver high-margin, compliant AI automations to your clients with Xarwiz.
              </p>
              <div className="cta-actions">
                <Link href="/signup" className="btn-primary">
                  <span>Start Partner Onboarding</span>
                  <ArrowRight size={16} />
                </Link>
                <Link href="/contact" className="btn-secondary">
                  <span>Contact Agency Lead</span>
                </Link>
                <Link href="/platform" className="btn-tertiary">
                  <span>Explore Platform Specs</span>
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
          gap: 12px;
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

        .bp-branch-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          width: 100%;
        }

        .sub-node {
          font-size: 0.76rem;
          padding: 8px 10px;
        }

        .bp-node.active {
          border-color: rgba(59, 130, 246, 0.4);
          background: rgba(59, 130, 246, 0.08);
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
