import React, { useState } from 'react';
import Link from 'next/link';
import HeaderNav from '../components/layout/HeaderNav';
import FooterSection from '../components/FooterSection';
import SEOHead from '../components/SEOHead';
import {
  Check,
  HelpCircle,
  Sparkles,
  Zap,
  ShieldCheck,
  Building2,
  ChevronDown,
  ArrowRight,
  Calculator,
} from 'lucide-react';

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'annual'
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (idx) => {
    setOpenFaq((prev) => (prev === idx ? null : idx));
  };

  const isAnnual = billingCycle === 'annual';

  const PLANS = [
    {
      id: 'starter',
      name: 'Starter',
      badge: null,
      desc: 'Ideal for indie developers, researchers, and early experiments with AI agents.',
      monthlyPrice: '₹149',
      annualPrice: '₹119',
      period: 'per user / month',
      ctaText: 'Start with Starter',
      ctaHref: '/signup?plan=starter',
      popular: false,
      features: [
        '5,000 monthly AI Messages (approx. 100K tokens)',
        '20 GB Vector Knowledge Storage (up to 50 docs)',
        'Up to 3 Autonomous Agents',
        'Standard Workflow Automation & Webhooks',
        'Community & Email Support',
        'DPDP statutory compliance safeguards',
      ],
    },
    {
      id: 'professional',
      name: 'Professional',
      badge: 'Most Popular',
      desc: 'Complete power suite for fast-growing businesses, startups, and product teams.',
      monthlyPrice: '₹999',
      annualPrice: '₹799',
      period: 'per user / month',
      ctaText: 'Start 14-Day Trial',
      ctaHref: '/signup?plan=professional',
      popular: true,
      features: [
        '10,000 monthly AI Messages (approx. 1M tokens)',
        '100 GB Document Storage (up to 500 docs)',
        'Unlimited Autonomous Agents',
        'Advanced Drag-and-Drop Workflow DAGs',
        'Custom Webhooks & REST API Access',
        'Priority 24/7 Slack & Email Support',
        'GST invoice with input tax credit (ITC)',
      ],
    },
    {
      id: 'enterprise',
      name: 'Enterprise Custom',
      badge: 'Sovereign Cloud',
      desc: 'Dedicated private VPC, custom fine-tuned LLMs, and stringent compliance for BFSI & Healthcare.',
      monthlyPrice: '₹2,499',
      annualPrice: '₹1,999',
      period: 'per user / month (custom)',
      ctaText: 'Book Enterprise Demo',
      ctaHref: '/signup?source=book_demo',
      popular: false,
      features: [
        'Unlimited AI Messages (Custom token pools)',
        '1 TB Document Storage (Unlimited docs)',
        'Private VPC / Dedicated sovereign deployment',
        'Custom enterprise endpoints & private models',
        'Dedicated Enterprise Solutions Architect',
        'DPDP Act 2023 statutory alignment & audit logging',
        'Enterprise IAM & Dedicated Role-Based Access Controls',
        'High-availability deployment with dedicated support engineer',
      ],
    },
  ];

  const FAQS = [
    {
      q: 'Do you provide GST invoices with Input Tax Credit (ITC)?',
      a: 'Yes, 100%. All transactions generate an automated GST compliant tax invoice through Razorpay with your company’s GSTIN and state code, allowing full Input Tax Credit reconciliation.',
    },
    {
      q: 'Is my data hosted within India in compliance with the DPDP Act 2023?',
      a: 'Yes. All user documents, knowledge bases, vectors, and execution logs reside exclusively in secure, encrypted cloud data centers in India. No customer data leaves the jurisdiction.',
    },
    {
      q: 'Can I change or cancel my plan at any time?',
      a: 'Yes. You can upgrade, downgrade, or cancel your subscription at any time directly from the settings panel. If you cancel, your account remains active until the end of the current billing cycle.',
    },
    {
      q: 'What payment methods do you support in India?',
      a: 'We support all major Indian payment methods powered by Razorpay: UPI (GPay, PhonePe, Paytm), NetBanking across 50+ banks, Credit & Debit Cards (RuPay, Visa, MasterCard), and Corporate Cards.',
    },
    {
      q: 'Can we deploy Xarwiz inside our own private cloud (AWS/GCP/Azure) or on-premise?',
      a: 'Yes. Our Enterprise tier offers dedicated VPC peering and air-gapped on-premise deployments with custom Docker/Kubernetes container sets.',
    },
  ];

  return (
    <div className="pricing-page">
      <SEOHead
        title="Pricing Plans & Packages - Xarwiz AI Cloud Platform"
        description="Explore transparent pricing plans for Xarwiz AI Platform. Starter ₹149, Pro ₹999, Enterprise ₹2499 with Indian GST invoices, DPDP compliance, and 24/7 support."
        canonicalPath="/pricing"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: 'Xarwiz AI Platform Subscription',
          description:
            "India's all-in-one sovereign AI business operating system for autonomous agents, workflow automations, and document intelligence.",
          offers: {
            '@type': 'AggregateOffer',
            priceCurrency: 'INR',
            lowPrice: '149',
            highPrice: '2499',
            offerCount: '3',
          },
        }}
      />

      <HeaderNav activePath="/pricing" />

      <main className="pricing-main">
        {/* Hero Section */}
        <section className="pricing-hero">
          <div className="container">
            <div className="hero-content">
              <span className="hero-badge">
                <Sparkles size={14} /> Transparent Sovereign AI Pricing
              </span>
              <h1 className="hero-title">
                Predictable plans for <span className="blue-text">teams of every size</span>
              </h1>
              <p className="hero-subtitle">
                Scale from your first autonomous AI agent to enterprise-wide workflow automation.
                All plans include statutory DPDP Act 2023 compliance safeguards and localized Indian hosting.
              </p>

              {/* Billing Toggle */}
              <div className="billing-toggle-container">
                <div className="billing-toggle-pill">
                  <button
                    type="button"
                    className={`toggle-option ${!isAnnual ? 'active' : ''}`}
                    onClick={() => setBillingCycle('monthly')}
                  >
                    Monthly Billing
                  </button>
                  <button
                    type="button"
                    className={`toggle-option ${isAnnual ? 'active' : ''}`}
                    onClick={() => setBillingCycle('annual')}
                  >
                    Annual Billing
                    <span className="discount-badge">Save 20%</span>
                  </button>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#64748B', marginTop: 10, textAlign: 'center' }}>
                  {isAnnual
                    ? 'Annual commitment rates shown (Save 20%). Online checkout is monthly recurring (₹149 / ₹999); annual invoicing available via sales.'
                    : 'Flexible month-to-month plans. Cancel or change plans anytime from account settings.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="plans-section">
          <div className="container">
            <div className="plans-grid">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`plan-card ${plan.popular ? 'popular-card' : ''}`}
                >
                  {plan.badge && (
                    <div className="plan-badge-wrapper">
                      <span className="plan-popular-badge">{plan.badge}</span>
                    </div>
                  )}

                  <div className="plan-header">
                    <h3 className="plan-name">{plan.name}</h3>
                    <p className="plan-desc">{plan.desc}</p>
                  </div>

                  <div className="plan-pricing-row">
                    <span className="plan-price">
                      {isAnnual ? plan.annualPrice : plan.monthlyPrice}
                    </span>
                    <span className="plan-period">/ month</span>
                  </div>
                  {isAnnual && (
                    <div className="annual-subtext">Annual commitment rate (Save 20%) • Online billing monthly</div>
                  )}

                  <Link
                    href={plan.ctaHref}
                    className={`btn-plan-cta ${plan.popular ? 'btn-popular' : 'btn-standard'}`}
                  >
                    {plan.ctaText}
                  </Link>

                  <div className="plan-features-divider" />

                  <div className="plan-features-list">
                    <div className="features-label">Included in this plan:</div>
                    {plan.features.map((feat, fIdx) => (
                      <div key={fIdx} className="feature-item">
                        <Check size={16} className="feature-check" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature Comparison Matrix */}
        <section className="comparison-section">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">Detailed Feature Matrix</h2>
              <p className="section-subtitle">
                Compare every capability across Starter, Pro, and Enterprise tiers.
              </p>
            </div>

            <div className="table-responsive-wrapper">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th className="th-feature">Feature</th>
                    <th className="th-tier">Starter</th>
                    <th className="th-tier popular-th">Pro</th>
                    <th className="th-tier">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="table-section-row">
                    <td colSpan={4}>AI Agents & Compute</td>
                  </tr>
                  <tr>
                    <td>Monthly Message / Token Allowance</td>
                    <td>5,000 Messages (~100K tokens)</td>
                    <td>10,000 Messages (~1M tokens)</td>
                    <td>Custom / Unlimited</td>
                  </tr>
                  <tr>
                    <td>Autonomous Agent Limits</td>
                    <td>Up to 3</td>
                    <td>Unlimited</td>
                    <td>Unlimited + Multi-tenant</td>
                  </tr>
                  <tr>
                    <td>Model Gateway</td>
                    <td>Llama 3, Mistral</td>
                    <td>All Open & Cloud LLMs</td>
                    <td>Custom Private LLMs</td>
                  </tr>

                  <tr className="table-section-row">
                    <td colSpan={4}>Knowledge Base & Workflows</td>
                  </tr>
                  <tr>
                    <td>Vector Knowledge Storage & Uploads</td>
                    <td>20 GB (Up to 50 Docs)</td>
                    <td>100 GB (Up to 500 Docs)</td>
                    <td>1 TB (Unlimited)</td>
                  </tr>
                  <tr>
                    <td>Workflow DAG Editor</td>
                    <td>Standard</td>
                    <td>Advanced Visual Nodes</td>
                    <td>Full Enterprise Engine</td>
                  </tr>
                  <tr>
                    <td>Webhooks & REST API</td>
                    <td>Read-only</td>
                    <td>Full Read/Write</td>
                    <td>Custom Gateways</td>
                  </tr>

                  <tr className="table-section-row">
                    <td colSpan={4}>Security & Compliance</td>
                  </tr>
                  <tr>
                    <td>Indian Data Residency</td>
                    <td>Yes (Encrypted)</td>
                    <td>Yes (Encrypted)</td>
                    <td>Dedicated VPC / On-Prem</td>
                  </tr>
                  <tr>
                    <td>DPDP Act 2023 Compliance</td>
                    <td>Standard</td>
                    <td>Standard</td>
                    <td>Statutory Alignment &amp; Audit Logs</td>
                  </tr>
                  <tr>
                    <td>Access Control &amp; IAM</td>
                    <td>Workspace Scoped</td>
                    <td>Workspace Scoped</td>
                    <td>Enterprise IAM &amp; Dedicated RBAC</td>
                  </tr>
                  <tr>
                    <td>Support Tier</td>
                    <td>Email (24-48h)</td>
                    <td>Priority Slack (2-4h)</td>
                    <td>24/7 Priority Support &amp; Dedicated Lead</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="faq-section">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">Frequently Asked Questions</h2>
              <p className="section-subtitle">
                Everything you need to know about billing, compliance, and deployment options.
              </p>
            </div>

            <div className="faq-accordion-list">
              {FAQS.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={idx} className="faq-item">
                    <button
                      type="button"
                      className="faq-question-btn"
                      onClick={() => toggleFaq(idx)}
                      aria-expanded={isOpen}
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        size={18}
                        className={`faq-chevron ${isOpen ? 'rotated' : ''}`}
                      />
                    </button>
                    {isOpen && <div className="faq-answer-box">{faq.a}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <FooterSection />

      <style jsx>{`
        .pricing-page {
          min-height: 100vh;
          background: #f8fafc;
          display: flex;
          flex-direction: column;
        }

        .pricing-main {
          flex: 1;
        }

        .container {
          max-width: 1240px;
          margin: 0 auto;
          padding: 0 24px;
        }

        /* Hero */
        .pricing-hero {
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          padding: 56px 0 44px;
          text-align: center;
        }

        .hero-content {
          max-width: 780px;
          margin: 0 auto;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #2563eb;
          font-size: 0.8rem;
          font-weight: 600;
          border-radius: 20px;
          margin-bottom: 16px;
        }

        .hero-title {
          font-size: 2.7rem;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.2;
          margin-bottom: 16px;
          letter-spacing: -0.02em;
        }

        .blue-text {
          color: #2563eb;
        }

        .hero-subtitle {
          font-size: 1.05rem;
          color: #64748b;
          line-height: 1.6;
          margin: 0 0 32px;
        }

        /* Billing Toggle */
        .billing-toggle-container {
          display: flex;
          justify-content: center;
        }

        .billing-toggle-pill {
          display: inline-flex;
          align-items: center;
          background: #f1f5f9;
          padding: 4px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

        .toggle-option {
          background: transparent;
          border: none;
          padding: 8px 18px;
          font-size: 0.9rem;
          font-weight: 600;
          color: #64748b;
          border-radius: 9px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
        }

        .toggle-option.active {
          background: #ffffff;
          color: #0f172a;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
        }

        .discount-badge {
          font-size: 0.7rem;
          font-weight: 700;
          background: #f0fdf4;
          color: #16a34a;
          border: 1px solid #bbf7d0;
          padding: 2px 6px;
          border-radius: 10px;
        }

        /* Plans Section */
        .plans-section {
          padding: 56px 0 80px;
        }

        .plans-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 28px;
          align-items: stretch;
        }

        .plan-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 32px 28px;
          display: flex;
          flex-direction: column;
          position: relative;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.03);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .plan-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 14px 30px -8px rgba(15, 23, 42, 0.08);
        }

        .plan-card.popular-card {
          border-color: #3b82f6;
          box-shadow: 0 10px 25px -4px rgba(37, 99, 235, 0.12), 0 0 0 2px #3b82f6;
        }

        .plan-badge-wrapper {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
        }

        .plan-popular-badge {
          background: #2563eb;
          color: #ffffff;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 4px 14px;
          border-radius: 12px;
          letter-spacing: 0.02em;
        }

        .plan-name {
          font-size: 1.45rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 8px;
        }

        .plan-desc {
          font-size: 0.88rem;
          color: #64748b;
          line-height: 1.5;
          margin: 0 0 20px;
          min-height: 48px;
        }

        .plan-pricing-row {
          display: flex;
          align-items: baseline;
          gap: 6px;
          margin-bottom: 4px;
        }

        .plan-price {
          font-size: 2.4rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
        }

        .plan-period {
          font-size: 0.88rem;
          color: #64748b;
        }

        .annual-subtext {
          font-size: 0.78rem;
          color: #16a34a;
          font-weight: 600;
          margin-bottom: 20px;
        }

        .btn-plan-cta {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px;
          border-radius: 10px;
          font-size: 0.92rem;
          font-weight: 600;
          text-decoration: none;
          margin: 16px 0 24px;
          transition: all 0.2s ease;
        }

        .btn-popular {
          background: #2563eb;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }

        .btn-popular:hover {
          background: #1d4ed8;
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
        }

        .btn-standard {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #0f172a;
        }

        .btn-standard:hover {
          background: #f8fafc;
          border-color: #94a3b8;
        }

        .plan-features-divider {
          height: 1px;
          background: #f1f5f9;
          margin-bottom: 20px;
        }

        .plan-features-list {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .features-label {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #94a3b8;
          margin-bottom: 4px;
        }

        .feature-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 0.86rem;
          color: #334155;
          line-height: 1.45;
        }

        .feature-check {
          color: #16a34a;
          flex-shrink: 0;
          margin-top: 2px;
        }

        /* Comparison Section */
        .comparison-section {
          padding: 60px 0;
          background: #ffffff;
          border-top: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
        }

        .section-header {
          text-align: center;
          max-width: 680px;
          margin: 0 auto 40px;
        }

        .section-title {
          font-size: 1.9rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 10px;
        }

        .section-subtitle {
          font-size: 0.95rem;
          color: #64748b;
          margin: 0;
          line-height: 1.5;
        }

        .table-responsive-wrapper {
          overflow-x: auto;
        }

        .comparison-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9rem;
        }

        .comparison-table th,
        .comparison-table td {
          padding: 14px 18px;
          text-align: left;
          border-bottom: 1px solid #f1f5f9;
        }

        .th-feature {
          width: 40%;
          font-weight: 700;
          color: #0f172a;
        }

        .th-tier {
          width: 20%;
          font-weight: 700;
          color: #0f172a;
        }

        .popular-th {
          color: #2563eb;
        }

        .table-section-row td {
          background: #f8fafc;
          font-weight: 700;
          color: #0f172a;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 10px 18px;
        }

        /* FAQs */
        .faq-section {
          padding: 70px 0 90px;
        }

        .faq-accordion-list {
          max-width: 760px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .faq-item {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
        }

        .faq-question-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 20px;
          background: transparent;
          border: none;
          font-size: 1rem;
          font-weight: 600;
          color: #0f172a;
          text-align: left;
          cursor: pointer;
        }

        .faq-chevron {
          color: #94a3b8;
          transition: transform 0.2s ease;
          flex-shrink: 0;
        }

        .faq-chevron.rotated {
          transform: rotate(180deg);
          color: #2563eb;
        }

        .faq-answer-box {
          padding: 0 20px 20px;
          font-size: 0.92rem;
          color: #475569;
          line-height: 1.6;
        }

        @media (max-width: 900px) {
          .plans-grid {
            grid-template-columns: 1fr;
          }
          .hero-title {
            font-size: 2.1rem;
          }
        }
      `}</style>
    </div>
  );
}
