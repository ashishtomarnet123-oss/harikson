import React, { useState } from 'react';
import Link from 'next/link';
import HeaderNav from '../../components/layout/HeaderNav';
import FooterSection from '../../components/FooterSection';
import SEOHead, {
  defaultOrganizationSchema,
  defaultSoftwareApplicationSchema,
} from '../../components/SEOHead';
import {
  Rocket,
  ArrowRight,
  Sparkles,
  Bot,
  Workflow,
  Database,
  CheckCircle2,
  Check,
  ChevronDown,
  ShieldCheck,
  Zap,
  Terminal,
  Code2,
  Clock,
  TrendingUp,
} from 'lucide-react';

export default function SolutionsStartupsPage() {
  const [activeFaq, setActiveFaq] = useState(null);

  const toggleFaq = (idx) => {
    setActiveFaq(activeFaq === idx ? null : idx);
  };

  const FAQS = [
    {
      q: 'How does Xarwiz help early-stage startups conserve cash and runway?',
      a: 'Instead of hiring full-time personnel for repetitive tasks like tier-1 customer inquiries, manual documentation search, or basic QA linting, startups deploy Xarwiz AI agents and DAG workflows. You pay a transparent, predictable SaaS subscription with safety quota fallbacks, avoiding sudden bill shock.',
    },
    {
      q: 'How quickly can our team get started?',
      a: 'Startups can sign up and deploy their first automated support agent or document index in under 15 minutes. We provide pre-configured blueprints for GitHub PR review, customer inquiry triage, and Notion knowledge base synchronization.',
    },
    {
      q: 'Can we transition from public frontier models to local models as we scale?',
      a: 'Yes. Xarwiz provides full model flexibility. You can start with cloud LLMs like GPT-4o, and seamlessly switch to local Ollama open-source models (such as Qwen 2.5 Coder or Llama 3.2) hosted in Indian cloud regions to lower unit economics and preserve data privacy.',
    },
    {
      q: 'How does Xarwiz handle spikes in customer inquiries during product launches?',
      a: 'The Xarwiz asynchronous DAG orchestrator and webhook listeners queue and process incoming events with built-in concurrency controls and retries, ensuring no customer request or webhook drops during traffic spikes.',
    },
  ];

  return (
    <div className="solution-detail-page">
      <SEOHead
        title="AI Solutions for Startups & Growth Teams - Xarwiz"
        description="Scale startup output without linear hiring. Automate customer support triage, continuous GitHub code audits, and document intelligence with Xarwiz."
        canonicalPath="/solutions/startups"
        jsonLd={[
          defaultOrganizationSchema,
          defaultSoftwareApplicationSchema,
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Xarwiz AI Solutions for Startups',
            url: 'https://xarwiz.com/solutions/startups',
            description:
              'Autonomous AI agents and workflow automation engineered to accelerate early-stage startup execution and reduce operational overhead.',
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
                <Rocket size={14} />
                <span>Engineered for High-Growth Teams</span>
              </div>
              <h1 className="hero-title">
                Scale Your Startup Without <span className="blue-gradient">Linear Headcount</span>
              </h1>
              <p className="hero-subtitle">
                Early-stage founders and small engineering squads can now operate with the operational breadth of enterprise organizations. Automate user onboarding, code audits, and customer operations on day one.
              </p>
              <div className="hero-cta-group">
                <Link href="/signup" className="btn-primary">
                  <span>Start on Free / Starter Plan</span>
                  <ArrowRight size={16} />
                </Link>
                <Link href="/signup?source=book_demo" className="btn-secondary">
                  <span>Book Startup Architecture Demo</span>
                </Link>
              </div>

              <div className="hero-stats-row">
                <div className="hero-stat">
                  <span className="stat-num">24/7</span>
                  <span className="stat-label">Automated Triage Coverage</span>
                </div>
                <div className="hero-stat-sep" />
                <div className="hero-stat">
                  <span className="stat-num">&lt; 15 min</span>
                  <span className="stat-label">Blueprint Setup Time</span>
                </div>
                <div className="hero-stat-sep" />
                <div className="hero-stat">
                  <span className="stat-num">100%</span>
                  <span className="stat-label">Predictable Quotas &amp; Safety</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3 CORE PAIN POINTS & SOLUTIONS */}
        <section className="usecases-section">
          <div className="container">
            <div className="section-head">
              <span className="section-eyebrow">Real Operational Bottlenecks</span>
              <h2 className="section-title">Where Startups Lose Velocity &amp; How Xarwiz Solves It</h2>
              <p className="section-subtitle">
                Eliminate the operational chores that distract core engineering and founding teams from building core product.
              </p>
            </div>

            <div className="usecases-grid">
              <div className="usecase-card">
                <div className="uc-header">
                  <div className="uc-icon">
                    <Bot size={22} />
                  </div>
                  <span className="uc-pill">Customer Operations</span>
                </div>
                <h3>24/7 Support Inquiries Draining Engineering Time</h3>
                <p className="uc-problem">
                  <strong>The Problem:</strong> Founders and lead engineers spend hours answering repetitive onboarding questions, API integration queries, and password resets instead of writing code.
                </p>
                <p className="uc-solution">
                  <strong>The Xarwiz Solution:</strong> Deploy an autonomous customer support agent grounded in your knowledge base via hybrid pgvector + BM25 search. Accurate, cited responses are drafted instantly, escalating only edge cases to Slack.
                </p>
                <div className="uc-features">
                  <span>✓ Hybrid RAG accuracy</span>
                  <span>✓ Verified source citations</span>
                  <span>✓ Slack escalation alerts</span>
                </div>
              </div>

              <div className="usecase-card">
                <div className="uc-header">
                  <div className="uc-icon">
                    <Terminal size={22} />
                  </div>
                  <span className="uc-pill">Engineering Velocity</span>
                </div>
                <h3>Continuous PR Review &amp; Code Quality Checks</h3>
                <p className="uc-problem">
                  <strong>The Problem:</strong> Code reviews bottleneck product releases when senior engineers are in meetings or offline, delaying rapid deployment cycles.
                </p>
                <p className="uc-solution">
                  <strong>The Xarwiz Solution:</strong> Connect GitHub webhooks to an autonomous coding agent running sandboxed Qwen 2.5 Coder. The agent inspects modified diffs, checks test suites via bash sandbox, and posts structured feedback.
                </p>
                <div className="uc-features">
                  <span>✓ Sandboxed bash execution</span>
                  <span>✓ Automated lint verification</span>
                  <span>✓ Instant GitHub PR comments</span>
                </div>
              </div>

              <div className="usecase-card">
                <div className="uc-header">
                  <div className="uc-icon">
                    <Workflow size={22} />
                  </div>
                  <span className="uc-pill">Lead &amp; User Onboarding</span>
                </div>
                <h3>Fragmented User Onboarding &amp; Webhook Dropouts</h3>
                <p className="uc-problem">
                  <strong>The Problem:</strong> Signups, payment gateway events, and CRM updates are wired together with brittle Zapier connections that break unpredictably without retry logs.
                </p>
                <p className="uc-solution">
                  <strong>The Xarwiz Solution:</strong> Reliable DAG-based webhook ingestion with cryptographic HMAC validation, automated exponential backoff retries, and comprehensive error logging in PostgreSQL.
                </p>
                <div className="uc-features">
                  <span>✓ HMAC-SHA256 signature checks</span>
                  <span>✓ Exponential backoff retries</span>
                  <span>✓ Dead letter failure tracking</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* WORKFLOW BLUEPRINT SPOTLIGHT */}
        <section className="blueprint-section">
          <div className="container">
            <div className="blueprint-card">
              <div className="bp-text">
                <span className="section-eyebrow">Ready-to-Deploy Architecture</span>
                <h2>The Startup Growth Autopilot Blueprint</h2>
                <p>
                  Deploy this pre-built pipeline in one click to automate inbound user inquiries and lead qualification across your product.
                </p>

                <div className="bp-pipeline-list">
                  <div className="bp-step">
                    <span className="bp-step-num">01</span>
                    <div>
                      <strong>Inbound Webhook Received:</strong> User submits contact query or signs up on portal.
                    </div>
                  </div>
                  <div className="bp-step">
                    <span className="bp-step-num">02</span>
                    <div>
                      <strong>Hybrid RAG Document Lookup:</strong> Agent queries technical docs and pricing FAQs.
                    </div>
                  </div>
                  <div className="bp-step">
                    <span className="bp-step-num">03</span>
                    <div>
                      <strong>Structured Triage &amp; Classification:</strong> Model scores urgency and flags commercial intent.
                    </div>
                  </div>
                  <div className="bp-step">
                    <span className="bp-step-num">04</span>
                    <div>
                      <strong>Automated Action:</strong> Sends personalized answer to customer and notifies team on Slack.
                    </div>
                  </div>
                </div>
              </div>

              <div className="bp-visual">
                <div className="bp-box">
                  <div className="bp-box-header">
                    <Sparkles size={16} />
                    <span>startup-autopilot-flow.json</span>
                  </div>
                  <div className="bp-box-body">
                    <div className="bp-node active">
                      <span className="n-badge">STEP 1</span>
                      <span className="n-name">Inbound Webhook Trigger</span>
                    </div>
                    <div className="bp-arrow">&darr;</div>
                    <div className="bp-node">
                      <span className="n-badge">STEP 2</span>
                      <span className="n-name">pgvector Semantic Match</span>
                    </div>
                    <div className="bp-arrow">&darr;</div>
                    <div className="bp-node">
                      <span className="n-badge">STEP 3</span>
                      <span className="n-name">Agent Response Synthesis</span>
                    </div>
                    <div className="bp-arrow">&darr;</div>
                    <div className="bp-node success">
                      <span className="n-badge">STEP 4</span>
                      <span className="n-name">Dispatch Customer Email &amp; Slack Alert</span>
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
              <h2 className="section-title">Startup Solutions FAQs</h2>
              <p className="section-subtitle">
                Clear technical answers on pricing, scale, and deployment.
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
              <h2>Accelerate Your Startup Velocity Today</h2>
              <p>
                Get started on our free plan or upgrade seamlessly as your traffic expands.
              </p>
              <div className="cta-actions">
                <Link href="/signup" className="btn-primary">
                  <span>Sign Up Free</span>
                  <ArrowRight size={16} />
                </Link>
                <Link href="/pricing" className="btn-secondary">
                  <span>View Pricing &amp; Quotas</span>
                </Link>
                <Link href="/contact" className="btn-tertiary">
                  <span>Talk to Sales</span>
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
