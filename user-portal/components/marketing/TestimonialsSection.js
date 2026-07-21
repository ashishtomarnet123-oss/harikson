import React from 'react';
import { Star, ShieldCheck, Building } from 'lucide-react';

export default function TestimonialsSection() {
  const testimonials = [
    {
      quote: 'Neuravolt Cloud enabled our engineering team to deploy custom fine-tuned AI agents while meeting strict DPDP Act data residency requirements.',
      author: 'Rajesh Kumar',
      role: 'Head of Infrastructure, Enterprise Fintech',
      company: 'Fintech Corp'
    },
    {
      quote: 'The row-level security and local multi-model fabric gave us full confidence to run AI-powered document extraction on sensitive customer files.',
      author: 'Ananya Sharma',
      role: 'Principal Architect, Healthcare Systems',
      company: 'HealthTech Global'
    },
    {
      quote: 'Deploying private LLMs on Neuravolt reduced our OpenAI API costs by 65% while providing faster RAG vector search across our codebase.',
      author: 'Vikram Singh',
      role: 'VP Engineering, SaaS Enterprise',
      company: 'DevFlow Systems'
    }
  ];

  return (
    <section style={{ padding: '80px 24px', backgroundColor: 'rgba(17, 24, 39, 0.6)', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <span style={{
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#34d399',
            backgroundColor: 'rgba(52, 211, 153, 0.1)',
            padding: '6px 14px',
            borderRadius: '20px',
            border: '1px solid rgba(52, 211, 153, 0.3)'
          }}>
            Trusted Security
          </span>
          <h2 style={{ fontSize: '36px', fontWeight: 800, color: '#ffffff', marginTop: '16px', letterSpacing: '-0.02em' }}>
            Trusted by Enterprise Engineering Teams
          </h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px'
        }}>
          {testimonials.map((item, idx) => (
            <div key={idx} style={{
              backgroundColor: 'rgba(31, 41, 55, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} color="#fbbf24" fill="#fbbf24" />
                  ))}
                </div>
                <p style={{ fontSize: '15px', color: '#e5e7eb', lineHeight: 1.6, fontStyle: 'italic', marginBottom: '24px' }}>
                  "{item.quote}"
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                  {item.author}
                </h4>
                <p style={{ fontSize: '13px', color: '#9ca3af', margin: '4px 0 0 0' }}>
                  {item.role}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
