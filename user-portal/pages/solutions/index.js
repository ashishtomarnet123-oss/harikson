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
  Briefcase,
  Layers,
  Terminal,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Users,
  Building2,
  Clock,
  TrendingUp,
  Workflow,
  Bot,
  Database,
  ChevronDown,
} from 'lucide-react';

export default function SolutionsOverviewPage() {
  const [activeFaq, setActiveFaq] = useState(null);

  const toggleFaq = (idx) => {
    setActiveFaq(activeFaq === idx ? null : idx);
  };

  const FAQS = [
    {
      q: 'Which solution tier or configuration is best for an early-stage startup?',
      a: 'Startups typically begin on our Starter or Professional plan to deploy autonomous triage agents and automate customer onboarding. As your data volume grows or you require custom webhook integrations, upgrading is seamless with zero downtime or migration friction.',
    },
    {
      q: 'Can organizations manage separate departments and business units under one master account?',
      a: 'Yes. Enterprise accounts can configure isolated tenant workspaces. Each workspace features dedicated API keys, compartmentalized knowledge bases, separate webhook configurations, and independent message usage tracking to simplify internal billing and data governance.',
    },
    {
      q: 'How does Xarwiz ensure business operations teams remain compliant with DPDP Act 2023?',
      a: 'Xarwiz provides native sovereign compliance architecture: data localization within Indian cloud regions, purpose-specific consent logging, tamper-evident audit trails, and an automated Data Principal Rights portal for processing access and erasure requests.',
    },
    {
      q: 'Do non-technical team members need coding experience to operate Xarwiz?',
      a: 'No. While developers can write custom bash scripts and integrate REST APIs, operations and business teams configure agents and DAG workflows through intuitive visual node interfaces and natural language instructions.',
    },
    {
      q: 'How quickly can our team deploy an enterprise solution into production?',
      a: 'Pre-built solution templates (such as inbound ticket triage, Notion document sync, or PR review automation) can be connected and deployed in under 15 minutes. Custom multi-system enterprise integrations typically launch within days.',
    },
  ];

  return (
    <div className="solutions-page">
      <SEOHead
        title="AI Solutions for Startups, Operations & Technical Teams - Xarwiz"
        description="Discover how Xarwiz powers high-velocity startups, back-office operations, and technical teams with autonomous AI agents and resilient DAG workflows."
        canonicalPath="/solutions"
        jsonLd={[
          defaultOrganizationSchema,
          defaultSoftwareApplicationSchema,
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Xarwiz Enterprise & Team Solutions',
            url: 'https://xarwiz.com/solutions',
            description:
              'Tailored AI agent and workflow automation solutions designed for high-growth startups, business operations, and technical builders.',
          },
        ]}
      />

      <HeaderNav activePath="/solutions" />

      <main className="solutions-main">
        {/* HERO SECTION */}
        <section className="solutions-hero">
          <div className="container">
            <div className="hero-content">
              <div className="hero-badge">
                <Sparkles size={14} />
                <span>Engineered for Concrete Business Outcomes</span>
              </div>
              <h1 className="hero-title">
                AI Solutions Built for <span className="blue-gradient">High-Velocity Teams</span>
              </h1>
              <p className="hero-subtitle">
                Stop treating AI as a toy chatbot. Xarwiz provides purpose-engineered agent and workflow infrastructure designed to solve real operational bottlenecks across your organization.
              </p>
              <div className="hero-cta-group">
                <Link href="/signup" className="btn-primary">
                  <span>Explore Solutions</span>
                  <ArrowRight size={16} />
                </Link>
                <Link href="/signup?source=book_demo" className="btn-secondary">
                  <span>Book Custom Solution Demo</span>
                </Link>
              </div>

              <div className="hero-stats-row">
                <div className="hero-stat">
                  <span className="stat-num">3x</span>
                  <span className="stat-label">Execution Velocity</span>
                </div>
                <div className="hero-stat-sep" />
                <div className="hero-stat">
                  <span className="stat-num">0</span>
                  <span className="stat-label">Linear Headcount Bottlenecks</span>
                </div>
                <div className="hero-stat-sep" />
                <div className="hero-stat">
                  <span className="stat-num">100%</span>
                  <span className="stat-label">Indian Sovereign Compliance</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4 PRIMARY SOLUTION VERTICALS */}
        <section className="verticals-section">
          <div className="container">
            <div className="section-head">
              <span className="section-eyebrow">Targeted Business Applications</span>
              <h2 className="section-title">Choose Your Team&apos;s Solution Profile</h2>
              <p className="section-subtitle">
                Tailored architectures designed around the exact operational realities of your organization.
              </p>
            </div>

            <div className="verticals-grid">
              {/* VERTICAL 1: STARTUPS */}
              <div className="vertical-card">
                <div className="v-card-top">
                  <div className="v-icon-box">
                    <Rocket size={24} />
                  </div>
                  <span className="v-tag">High-Growth Startups</span>
                </div>
                <h3>Scale Output Without Adding Headcount</h3>
                <p>
                  Early-stage teams need to ship product, handle user onboarding, and respond to support inquiries without burning through runway on manual staffing.
                </p>
                <ul className="v-list">
                  <li><CheckCircle2 size={16} className="v-check" /> 24/7 automated tier-1 customer ticket triage</li>
                  <li><CheckCircle2 size={16} className="v-check" /> Continuous GitHub PR code audits &amp; test runs</li>
                  <li><CheckCircle2 size={16} className="v-check" /> Instant onboarding document indexing with RAG</li>
                </ul>
                <div className="v-card-footer">
                  <Link href="/solutions/startups" className="v-link">
                    <span>Explore Startup Solutions</span>
                    <ArrowRight size={15} />
                  </Link>
                </div>
              </div>

              {/* VERTICAL 2: OPERATIONS */}
              <div className="vertical-card">
                <div className="v-card-top">
                  <div className="v-icon-box">
                    <Briefcase size={24} />
                  </div>
                  <span className="v-tag">Business Operations</span>
                </div>
                <h3>Eliminate Repetitive Back-Office Friction</h3>
                <p>
                  Finance, HR, and operations teams spend hours manually extracting PDF invoices, reconciling payment gateway records, and routing approval requests.
                </p>
                <ul className="v-list">
                  <li><CheckCircle2 size={16} className="v-check" /> Razorpay and bank statement automated reconciliation</li>
                  <li><CheckCircle2 size={16} className="v-check" /> Human-in-the-loop one-click Slack approvals</li>
                  <li><CheckCircle2 size={16} className="v-check" /> Sovereign DPDP Act 2023 audit record generation</li>
                </ul>
                <div className="v-card-footer">
                  <Link href="/solutions/operations" className="v-link">
                    <span>Explore Operations Solutions</span>
                    <ArrowRight size={15} />
                  </Link>
                </div>
              </div>

              {/* VERTICAL 3: ENTERPRISE & MULTI-TENANT */}
              <div className="vertical-card">
                <div className="v-card-top">
                  <div className="v-icon-box">
                    <Layers size={24} />
                  </div>
                  <span className="v-tag">Enterprise &amp; Multi-Tenant</span>
                </div>
                <h3>Manage Isolated Workspaces with Strict Governance</h3>
                <p>
                  Deploy custom AI agents and workflow automations across independent teams while keeping proprietary data, vector databases, and API keys strictly compartmentalized.
                </p>
                <ul className="v-list">
                  <li><CheckCircle2 size={16} className="v-check" /> Multi-tenant workspace segregation with zero data leaks</li>
                  <li><CheckCircle2 size={16} className="v-check" /> Tenant-specific message tracking &amp; quota controls</li>
                  <li><CheckCircle2 size={16} className="v-check" /> Exportable audit reports for corporate compliance</li>
                </ul>
                <div className="v-card-footer">
                  <Link href="/security" className="v-link">
                    <span>Explore Enterprise Security</span>
                    <ArrowRight size={15} />
                  </Link>
                </div>
              </div>

              {/* VERTICAL 4: TECHNICAL TEAMS */}
              <div className="vertical-card">
                <div className="v-card-top">
                  <div className="v-icon-box">
                    <Terminal size={24} />
                  </div>
                  <span className="v-tag">Technical Teams &amp; Devs</span>
                </div>
                <h3>Programmable Infrastructure for AI Builders</h3>
                <p>
                  Engineers require deterministic API controls, sandboxed bash environments, signed webhooks, and local model inference rather than opaque black-box APIs.
                </p>
                <ul className="v-list">
                  <li><CheckCircle2 size={16} className="v-check" /> REST APIs &amp; Server-Sent Events (SSE) streaming</li>
                  <li><CheckCircle2 size={16} className="v-check" /> Sandboxed bash execution with strict path isolation</li>
                  <li><CheckCircle2 size={16} className="v-check" /> Local Ollama model hosting (Qwen 2.5 Coder, Llama 3.2)</li>
                </ul>
                <div className="v-card-footer">
                  <Link href="/developers" className="v-link">
                    <span>Explore Developer Hub</span>
                    <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW TEAMS SUCCEED ON XARWIZ */}
        <section className="architecture-overview-section">
          <div className="container">
            <div className="arch-card">
              <div className="arch-left">
                <span className="section-eyebrow">Enterprise Peace of Mind</span>
                <h2>Why Leading Teams Trust Xarwiz</h2>
                <p>
                  Consumer AI wrappers lack the auditability and data sovereignty required for enterprise compliance. Xarwiz is built from the ground up for Indian organizations and global security standards.
                </p>

                <div className="arch-points">
                  <div className="point-item">
                    <ShieldCheck size={20} className="p-ico" />
                    <div>
                      <strong>DPDP Act 2023 Statutory Safeguards</strong>
                      <p>Purpose-specific processing, explicit consent collection, and Data Principal Rights self-service portal.</p>
                    </div>
                  </div>

                  <div className="point-item">
                    <Database size={20} className="p-ico" />
                    <div>
                      <strong>AES-256-GCM Partitioned Storage</strong>
                      <p>Document chunks and vectors isolated by tenant ID with cryptographic encryption at rest.</p>
                    </div>
                  </div>

                  <div className="point-item">
                    <Workflow size={20} className="p-ico" />
                    <div>
                      <strong>Deterministic Execution Logs</strong>
                      <p>Every step, tool call, error backoff, and human approval is immutably timestamped in PostgreSQL.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="arch-right">
                <div className="comparison-box">
                  <div className="comp-col comp-trad">
                    <h4>Generic AI Wrappers</h4>
                    <ul>
                      <li>❌ Data sent to opaque foreign servers</li>
                      <li>❌ Chatbot-only interface without tools</li>
                      <li>❌ No DAG workflow branching or retries</li>
                      <li>❌ Split or hallucinated RAG citations</li>
                      <li>❌ No statutory DPDP compliance tools</li>
                    </ul>
                  </div>

                  <div className="comp-col comp-xarwiz">
                    <h4>Xarwiz Platform</h4>
                    <ul>
                      <li>✅ Sovereign Indian data center hosting</li>
                      <li>✅ Sandboxed bash, file I/O &amp; custom tools</li>
                      <li>✅ Resilient DAG engine with HMAC triggers</li>
                      <li>✅ Hybrid pgvector + BM25 verified search</li>
                      <li>✅ Built-in DPDP Data Principal Portal</li>
                    </ul>
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
              <span className="section-eyebrow">Common Questions</span>
              <h2 className="section-title">Solutions &amp; Implementation FAQs</h2>
              <p className="section-subtitle">
                Everything you need to know about adopting Xarwiz across your team.
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
              <h2>Ready to Modernize Your Team&apos;s Operations?</h2>
              <p>
                Join forward-thinking Indian businesses building compliant, high-leverage AI workflows with Xarwiz.
              </p>
              <div className="cta-actions">
                <Link href="/signup" className="btn-primary">
                  <span>Request Platform Access</span>
                  <ArrowRight size={16} />
                </Link>
                <Link href="/signup?source=book_demo" className="btn-secondary">
                  <span>Schedule Team Walkthrough</span>
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
        .solutions-page {
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
        .solutions-hero {
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

        /* VERTICALS */
        .verticals-section {
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

        .verticals-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }

        .vertical-card {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 32px;
          display: flex;
          flex-direction: column;
          transition: all 0.25s ease;
        }

        .vertical-card:hover {
          border-color: rgba(59, 130, 246, 0.3);
          transform: translateY(-2px);
          background: rgba(15, 23, 42, 0.85);
        }

        .v-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .v-icon-box {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: rgba(59, 130, 246, 0.12);
          color: #60a5fa;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .v-tag {
          font-size: 0.75rem;
          font-weight: 700;
          color: #38bdf8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background: rgba(56, 189, 248, 0.1);
          padding: 4px 10px;
          border-radius: 6px;
        }

        .vertical-card h3 {
          font-size: 1.3rem;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 12px;
        }

        .vertical-card p {
          font-size: 0.92rem;
          color: #94a3b8;
          line-height: 1.6;
          margin-bottom: 20px;
        }

        .v-list {
          list-style: none;
          padding: 0;
          margin: 0 0 24px 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex-grow: 1;
        }

        .v-list li {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.88rem;
          color: #cbd5e1;
        }

        .v-check {
          color: #3b82f6;
          flex-shrink: 0;
        }

        .v-card-footer {
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          padding-top: 18px;
        }

        .v-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #60a5fa;
          font-size: 0.9rem;
          font-weight: 700;
          text-decoration: none;
          transition: gap 0.2s;
        }

        .v-link:hover {
          gap: 12px;
          color: #93c5fd;
        }

        /* ARCHITECTURE / COMPARISON */
        .architecture-overview-section {
          padding: 90px 0;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .arch-card {
          background: #0f172a;
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 20px;
          padding: 40px;
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          gap: 40px;
          align-items: center;
        }

        .arch-left h2 {
          font-size: clamp(1.6rem, 2.8vw, 2.2rem);
          font-weight: 800;
          color: #ffffff;
          line-height: 1.25;
          margin-bottom: 16px;
        }

        .arch-left p {
          font-size: 0.95rem;
          color: #94a3b8;
          line-height: 1.6;
          margin-bottom: 24px;
        }

        .arch-points {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .point-item {
          display: flex;
          align-items: flex-start;
          gap: 14px;
        }

        .p-ico {
          color: #3b82f6;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .point-item strong {
          display: block;
          font-size: 0.92rem;
          color: #ffffff;
          margin-bottom: 4px;
        }

        .point-item p {
          font-size: 0.84rem;
          color: #94a3b8;
          margin: 0;
        }

        .comparison-box {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .comp-col {
          padding: 20px;
          border-radius: 12px;
        }

        .comp-trad {
          background: rgba(239, 68, 68, 0.05);
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .comp-trad h4 {
          font-size: 0.88rem;
          font-weight: 700;
          color: #f87171;
          margin-bottom: 14px;
        }

        .comp-xarwiz {
          background: rgba(34, 197, 94, 0.05);
          border: 1px solid rgba(34, 197, 94, 0.3);
        }

        .comp-xarwiz h4 {
          font-size: 0.88rem;
          font-weight: 700;
          color: #4ade80;
          margin-bottom: 14px;
        }

        .comp-col ul {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
          font-size: 0.8rem;
          color: #cbd5e1;
          line-height: 1.45;
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
          .verticals-grid {
            grid-template-columns: 1fr;
          }
          .arch-card {
            grid-template-columns: 1fr;
            padding: 32px;
          }
          .comparison-box {
            grid-template-columns: 1fr;
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
