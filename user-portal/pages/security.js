import React, { useState } from 'react';
import Link from 'next/link';
import HeaderNav from '../components/layout/HeaderNav';
import FooterSection from '../components/FooterSection';
import SEOHead, { defaultOrganizationSchema } from '../components/SEOHead';
import {
  Shield,
  ShieldCheck,
  Lock,
  Database,
  Server,
  Key,
  CheckCircle2,
  Check,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  FileText,
  AlertTriangle,
  Scale,
  RefreshCw,
  Cpu,
  Layers,
} from 'lucide-react';

export default function SecurityTrustCenterPage() {
  const [activeFaq, setActiveFaq] = useState(null);

  const toggleFaq = (idx) => {
    setActiveFaq(activeFaq === idx ? null : idx);
  };

  const FAQS = [
    {
      q: 'Where is customer data physically hosted?',
      a: 'All customer data, document vector indexes, PostgreSQL databases, and execution logs reside exclusively within sovereign Indian cloud availability zones. No user data leaves Indian jurisdiction.',
    },
    {
      q: 'How is data encrypted at rest and in transit?',
      a: 'Data in transit is secured using modern TLS 1.3 with strict cipher suites. Data at rest (including document chunks in pgvector and tenant storage) is encrypted using authenticated AES-256-GCM with tenant-derived master keys.',
    },
    {
      q: 'Can one tenant access or query another tenant’s vector knowledge base?',
      a: 'No. Multi-tenant isolation is enforced at the database engine level via PostgreSQL Row-Level Security (RLS) policies. Every query parameterizes tenant_id, ensuring cryptographically isolated partitions.',
    },
    {
      q: 'Does Xarwiz use customer data to train public foundation models?',
      a: 'Never. Customer prompts, documents, and tool execution logs are strictly protected by our data processing agreements and are never used to train or fine-tune public foundation models.',
    },
    {
      q: 'How does Xarwiz support compliance with the Indian DPDP Act 2023?',
      a: 'Xarwiz incorporates purpose-specific consent collection, tamper-evident audit logging, and an interactive Data Principal Rights portal allowing citizens and users to exercise rights of access, correction, and permanent erasure.',
    },
  ];

  return (
    <div className="security-page">
      <SEOHead
        title="Security & Trust Center - Xarwiz Sovereign AI Platform"
        description="Learn how Xarwiz protects enterprise data with sovereign Indian cloud hosting, AES-256 encryption at rest, PostgreSQL row-level security, and DPDP Act 2023 safeguards."
        canonicalPath="/security"
        jsonLd={[
          defaultOrganizationSchema,
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Xarwiz Security & Trust Center',
            url: 'https://xarwiz.com/security',
            description:
              'Enterprise security architecture, encryption specifications, tenant isolation, and DPDP Act 2023 safeguards for Xarwiz.',
          },
        ]}
      />

      <HeaderNav activePath="/security" />

      <main className="security-main">
        {/* HERO SECTION */}
        <section className="security-hero">
          <div className="container">
            <div className="hero-content">
              <div className="hero-badge">
                <ShieldCheck size={14} />
                <span>Enterprise Trust &amp; Sovereignty</span>
              </div>
              <h1 className="hero-title">
                Sovereign Security Architected for <span className="blue-gradient">Zero Compromise</span>
              </h1>
              <p className="hero-subtitle">
                Enterprise AI requires verifiable security boundaries. Xarwiz combines Indian cloud data residency, authenticated AES-256 encryption, database row-level security, and DPDP statutory alignment.
              </p>
              <div className="hero-cta-group">
                <Link href="/security-policy" className="btn-primary">
                  <span>View 35-Clause Security Policy</span>
                  <ArrowRight size={16} />
                </Link>
                <Link href="/privacy" className="btn-secondary">
                  <span>DPDP Privacy Notice</span>
                </Link>
              </div>

              <div className="hero-stats-row">
                <div className="hero-stat">
                  <span className="stat-num">100%</span>
                  <span className="stat-label">Indian Data Residency</span>
                </div>
                <div className="hero-stat-sep" />
                <div className="hero-stat">
                  <span className="stat-num">AES-256</span>
                  <span className="stat-label">GCM Encryption at Rest</span>
                </div>
                <div className="hero-stat-sep" />
                <div className="hero-stat">
                  <span className="stat-num">RLS</span>
                  <span className="stat-label">PostgreSQL Tenant Isolation</span>
                </div>
                <div className="hero-stat-sep" />
                <div className="hero-stat">
                  <span className="stat-num">DPDP</span>
                  <span className="stat-label">Statutory Safeguards Ready</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4 CORE SECURITY PILLARS */}
        <section className="pillars-section">
          <div className="container">
            <div className="section-head">
              <span className="section-eyebrow">Defense in Depth</span>
              <h2 className="section-title">Architectural Security Safeguards</h2>
              <p className="section-subtitle">
                A multi-layered defense model designed to protect enterprise data across compute, storage, and networking.
              </p>
            </div>

            <div className="pillars-grid">
              <div className="pillar-card">
                <div className="pillar-icon">
                  <Server size={22} />
                </div>
                <h3>Indian Sovereign Cloud Residency</h3>
                <p>
                  All databases, document chunks, vector embeddings, and execution logs reside exclusively within tier-3/4 data centers in India. No customer payload is routed to foreign jurisdictions.
                </p>
                <ul className="pillar-list">
                  <li><Check size={14} className="c-ico" /> 100% data localization in Indian regions</li>
                  <li><Check size={14} className="c-ico" /> Zero cross-border data transfer</li>
                  <li><Check size={14} className="c-ico" /> Dedicated VPC peering options for enterprise</li>
                </ul>
              </div>

              <div className="pillar-card">
                <div className="pillar-icon">
                  <Lock size={22} />
                </div>
                <h3>Cryptographic Encryption</h3>
                <p>
                  Document content chunks in pgvector and disk caches are encrypted using AES-256-GCM authenticated cipher with tenant master key derivation. Data in transit uses TLS 1.3 exclusively.
                </p>
                <ul className="pillar-list">
                  <li><Check size={14} className="c-ico" /> AES-256-GCM encryption at rest</li>
                  <li><Check size={14} className="c-ico" /> Enforced TLS 1.3 with forward secrecy</li>
                  <li><Check size={14} className="c-ico" /> Automated cryptographic secret rotation</li>
                </ul>
              </div>

              <div className="pillar-card">
                <div className="pillar-icon">
                  <Database size={22} />
                </div>
                <h3>PostgreSQL Row-Level Security (RLS)</h3>
                <p>
                  Multi-tenant isolation is enforced at the database engine level. Every SQL statement is scoped by tenant_id, preventing accidental cross-tenant data leakage or SQL injection bypass.
                </p>
                <ul className="pillar-list">
                  <li><Check size={14} className="c-ico" /> Hard schema and row isolation</li>
                  <li><Check size={14} className="c-ico" /> Dedicated vector search namespaces</li>
                  <li><Check size={14} className="c-ico" /> Role-based access control (RBAC)</li>
                </ul>
              </div>

              <div className="pillar-card">
                <div className="pillar-icon">
                  <Cpu size={22} />
                </div>
                <h3>Sandboxed Agent Tool Containment</h3>
                <p>
                  Autonomous AI agents executing bash commands, file manipulation, or code generation run inside non-root child process sandboxes with strict timeouts and path traversal prevention.
                </p>
                <ul className="pillar-list">
                  <li><Check size={14} className="c-ico" /> Workspace directory confinement</li>
                  <li><Check size={14} className="c-ico" /> Command execution timeouts (30s)</li>
                  <li><Check size={14} className="c-ico" /> Non-root process privilege limits</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* DPDP ACT 2023 STATUTORY SAFEGUARDS */}
        <section className="dpdp-section">
          <div className="container">
            <div className="dpdp-card">
              <div className="dpdp-left">
                <span className="section-eyebrow">Statutory Data Protection</span>
                <h2>Aligned with the Digital Personal Data Protection Act 2023</h2>
                <p>
                  As an Indian technology company, Xarwiz is architected in alignment with the statutory obligations of the DPDP Act 2023. We empower enterprise fiduciaries to maintain compliance with zero engineering friction.
                </p>

                <div className="dpdp-points">
                  <div className="d-point">
                    <CheckCircle2 size={18} className="d-ico" />
                    <div>
                      <strong>Purpose-Specific Consent Logging:</strong> Explicit consent records and privacy notice versioning stored with immutable timestamps.
                    </div>
                  </div>
                  <div className="d-point">
                    <CheckCircle2 size={18} className="d-ico" />
                    <div>
                      <strong>Data Principal Rights Portal:</strong> Self-service mechanism for citizens to access, correct, or erase their indexed personal data.
                    </div>
                  </div>
                  <div className="d-point">
                    <CheckCircle2 size={18} className="d-ico" />
                    <div>
                      <strong>Statutory Grievance Redressal:</strong> Designated Data Protection and Grievance Officer reachable with statutory response timeframes.
                    </div>
                  </div>
                </div>

                <div className="dpdp-actions">
                  <Link href="/privacy" className="btn-primary">
                    <span>DPDP Privacy Notice</span>
                    <ArrowRight size={15} />
                  </Link>
                  <Link href="/contact" className="btn-secondary">
                    <span>Contact Privacy Team</span>
                  </Link>
                </div>
              </div>

              <div className="dpdp-right">
                <div className="docs-nav-box">
                  <h4>Trust &amp; Legal Center Documents</h4>
                  <div className="doc-links-list">
                    <Link href="/security-policy" className="doc-link-item">
                      <FileText size={16} />
                      <div className="d-info">
                        <strong>Security Policy</strong>
                        <span>35 detailed operational security clauses</span>
                      </div>
                      <ArrowRight size={14} />
                    </Link>

                    <Link href="/privacy-policy" className="doc-link-item">
                      <FileText size={16} />
                      <div className="d-info">
                        <strong>Privacy Notice</strong>
                        <span>Purpose limitation, retention &amp; cookies</span>
                      </div>
                      <ArrowRight size={14} />
                    </Link>

                    <Link href="/data-processing" className="doc-link-item">
                      <FileText size={16} />
                      <div className="d-info">
                        <strong>Data Processing Agreement</strong>
                        <span>Sub-processor terms &amp; audit commitments</span>
                      </div>
                      <ArrowRight size={14} />
                    </Link>

                    <Link href="/terms" className="doc-link-item">
                      <Scale size={16} />
                      <div className="d-info">
                        <strong>Terms of Service</strong>
                        <span>Commercial agreement &amp; dispute resolution</span>
                      </div>
                      <ArrowRight size={14} />
                    </Link>

                    <Link href="/aup" className="doc-link-item">
                      <AlertTriangle size={16} />
                      <div className="d-info">
                        <strong>Acceptable Use Policy</strong>
                        <span>Permitted AI use &amp; prohibited activities</span>
                      </div>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECURITY FAQS */}
        <section className="faq-section">
          <div className="container">
            <div className="section-head">
              <span className="section-eyebrow">Frequently Asked Questions</span>
              <h2 className="section-title">Security &amp; Data Governance FAQs</h2>
              <p className="section-subtitle">
                Clear technical answers on encryption, multi-tenancy, and compliance.
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

        {/* CTA BANNER */}
        <section className="cta-banner-section">
          <div className="container">
            <div className="cta-box">
              <h2>Request an Enterprise Security Assessment</h2>
              <p>
                Schedule an architecture review with our security engineering team or request dedicated VPC deployment specifications.
              </p>
              <div className="cta-actions">
                <Link href="/contact" className="btn-primary">
                  <span>Contact Security Lead</span>
                  <ArrowRight size={16} />
                </Link>
                <Link href="/security-policy" className="btn-secondary">
                  <span>Read Full Security Policy</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <FooterSection />

      <style jsx>{`
        .security-page {
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
        .security-hero {
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
          flex-wrap: wrap;
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

        /* PILLARS */
        .pillars-section {
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

        .pillars-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }

        .pillar-card {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 32px;
          transition: all 0.25s ease;
        }

        .pillar-card:hover {
          border-color: rgba(59, 130, 246, 0.3);
          transform: translateY(-2px);
          background: rgba(15, 23, 42, 0.85);
        }

        .pillar-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: rgba(59, 130, 246, 0.12);
          color: #60a5fa;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }

        .pillar-card h3 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 12px;
        }

        .pillar-card p {
          font-size: 0.92rem;
          color: #94a3b8;
          line-height: 1.6;
          margin-bottom: 20px;
        }

        .pillar-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .pillar-list li {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.86rem;
          color: #cbd5e1;
        }

        .c-ico {
          color: #3b82f6;
          flex-shrink: 0;
        }

        /* DPDP SECTION */
        .dpdp-section {
          padding: 80px 0;
          background: rgba(15, 23, 42, 0.35);
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .dpdp-card {
          background: #0f172a;
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 20px;
          padding: 40px;
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 40px;
          align-items: center;
        }

        .dpdp-left h2 {
          font-size: clamp(1.6rem, 2.8vw, 2.2rem);
          font-weight: 800;
          color: #ffffff;
          line-height: 1.25;
          margin-bottom: 16px;
        }

        .dpdp-left p {
          font-size: 0.95rem;
          color: #94a3b8;
          line-height: 1.6;
          margin-bottom: 24px;
        }

        .dpdp-points {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 28px;
        }

        .d-point {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          font-size: 0.88rem;
          color: #cbd5e1;
          line-height: 1.5;
        }

        .d-ico {
          color: #34d399;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .d-point strong {
          color: #ffffff;
        }

        .dpdp-actions {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
        }

        .docs-nav-box {
          background: #090e1a;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 24px;
        }

        .docs-nav-box h4 {
          font-size: 0.96rem;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 16px;
        }

        .doc-links-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .doc-link-item {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(30, 41, 59, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.06);
          padding: 12px 16px;
          border-radius: 8px;
          text-decoration: none;
          color: #cbd5e1;
          transition: all 0.2s;
        }

        .doc-link-item:hover {
          border-color: rgba(59, 130, 246, 0.4);
          background: rgba(59, 130, 246, 0.08);
          color: #ffffff;
          transform: translateX(3px);
        }

        .d-info {
          display: flex;
          flex-direction: column;
          flex-grow: 1;
        }

        .d-info strong {
          font-size: 0.86rem;
          color: #ffffff;
        }

        .d-info span {
          font-size: 0.74rem;
          color: #64748b;
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

        @media (max-width: 1024px) {
          .pillars-grid {
            grid-template-columns: 1fr;
          }
          .dpdp-card {
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
          .btn-primary, .btn-secondary {
            width: 100%;
            justify-content: center;
            box-sizing: border-box;
          }
        }
      `}</style>
    </div>
  );
}
