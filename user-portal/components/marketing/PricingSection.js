import React from 'react';
import Link from 'next/link';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export default function PricingSection() {
  const plans = [
    {
      name: 'Starter Developer',
      price: '₹0',
      period: 'Forever Free',
      description: 'Ideal for developers testing private LLMs and building AI prototypes.',
      features: [
        '10,000 AI tokens / month',
        'Harikson-3B & Qwen3-8B access',
        '1 Private AI Workspace',
        'Community Support',
        'Standard Rate Limits'
      ],
      cta: 'Deploy Free',
      href: '/signup',
      highlighted: false
    },
    {
      name: 'Pro / Growth',
      price: '₹4,999',
      period: '/ month',
      description: 'For growing teams building production AI workflows and autonomous agents.',
      features: [
        '1,000,000 AI tokens / month',
        'Full Model Fabric (Qwen3-32B, Qwen3-72B)',
        'Unlimited AI Workspaces & Agents',
        'Enterprise Vector RAG Engine',
        'DPDP Act 2023 Compliance Package',
        'Priority 24/7 Email & Chat Support'
      ],
      cta: 'Start Pro Trial',
      href: '/signup?plan=pro',
      highlighted: true
    },
    {
      name: 'Enterprise AI OS',
      price: 'Custom',
      period: 'Billed Annually',
      description: 'Dedicated infrastructure, custom fine-tuned LLMs, and air-gapped deployments.',
      features: [
        'Unlimited Token Throughput',
        'Custom Fine-Tuned LLM Training',
        'Dedicated On-Prem or VPC Infrastructure',
        'Custom SLA & Dedicated Solutions Architect',
        'ISO 27001, SOC 2 Type II, RBI Cyber Security',
        'SSO / SAML & SCIM User Provisioning'
      ],
      cta: 'Contact Enterprise',
      href: 'mailto:enterprise@neuravolt.cloud',
      highlighted: false
    }
  ];

  return (
    <section id="pricing" style={{ padding: '80px 24px', backgroundColor: '#030712' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <span style={{
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            padding: '6px 14px',
            borderRadius: '20px',
            border: '1px solid rgba(99, 102, 241, 0.3)'
          }}>
            Transparent Pricing
          </span>
          <h2 style={{ fontSize: '36px', fontWeight: 800, color: '#ffffff', marginTop: '16px', letterSpacing: '-0.02em' }}>
            Scale From Prototype to Enterprise AI
          </h2>
          <p style={{ fontSize: '16px', color: '#9ca3af', maxWidth: '600px', margin: '12px auto 0' }}>
            No hidden costs. Predictable billing tailored for developers, startups, and enterprises.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px',
          alignItems: 'stretch'
        }}>
          {plans.map((plan, idx) => (
            <div key={idx} style={{
              backgroundColor: plan.highlighted ? 'rgba(31, 41, 55, 0.7)' : 'rgba(17, 24, 39, 0.5)',
              border: plan.highlighted ? '2px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              padding: '36px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              boxShadow: plan.highlighted ? '0 0 30px rgba(168, 85, 247, 0.2)' : 'none'
            }}>
              {plan.highlighted && (
                <div style={{
                  position: 'absolute',
                  top: '-14px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#a855f7',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '4px 16px',
                  borderRadius: '20px',
                  letterSpacing: '0.05em'
                }}>
                  Most Popular
                </div>
              )}

              <div>
                <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
                  {plan.name}
                </h3>
                <p style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '24px', minHeight: '40px' }}>
                  {plan.description}
                </p>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '28px' }}>
                  <span style={{ fontSize: '42px', fontWeight: 800, color: '#ffffff' }}>{plan.price}</span>
                  <span style={{ fontSize: '14px', color: '#9ca3af' }}>{plan.period}</span>
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {plan.features.map((feat, fIdx) => (
                    <li key={fIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#d1d5db' }}>
                      <CheckCircle2 size={18} color="#34d399" style={{ flexShrink: 0 }} />
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href={plan.href}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  backgroundColor: plan.highlighted ? '#a855f7' : 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  textDecoration: 'none',
                  fontSize: '15px',
                  fontWeight: 600,
                  textAlign: 'center',
                  transition: 'background-color 0.2s ease'
                }}
              >
                {plan.cta}
                <ArrowRight size={16} />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
