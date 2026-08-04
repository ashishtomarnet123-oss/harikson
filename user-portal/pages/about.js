import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import FooterSection from '../components/FooterSection';

export default function AboutPage() {
  const [activeFaq, setActiveFaq] = useState(null);

  const toggleFaq = (idx) => {
    setActiveFaq(activeFaq === idx ? null : idx);
  };

  return (
    <div style={{
      backgroundColor: '#ffffff',
      color: '#0f172a',
      minHeight: '100vh',
      fontFamily: "'Inter', sans-serif"
    }}>
      <Head>
        <title>About Xarwiz — India's AI Business Operating System</title>
        <meta name="description" content="Running a business shouldn't mean juggling dozens of disconnected tools. Xarwiz brings everything together—from AI agents and workflow automation to knowledge management, collaboration, cloud services, and enterprise security." />
        <meta property="og:title" content="About Xarwiz — India's AI Business Operating System" />
        <meta property="og:description" content="Running a business shouldn't mean juggling dozens of disconnected tools. Xarwiz brings everything together—from AI agents and workflow automation to knowledge management, collaboration, cloud services, and enterprise security." />
        <meta property="og:type" content="website" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      {/* HEADER */}
      <header className="header" style={{ position: 'sticky', top: 0, zIndex: 100, background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '14px 0' }}>
        <div className="container" style={{ maxWidth: '1360px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" className="logo-container" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <img src="/assets/xarwiz-logo.png" alt="Xarwiz" className="logo-img" style={{ height: '30px', width: 'auto' }} />
            <span className="logo-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '20px', background: '#EFF6FF', border: '1px solid #BFDBFE', fontSize: '0.72rem', color: '#1E40AF', fontWeight: '700' }}>
              AI Cloud Platform
            </span>
          </Link>

          <nav>
            <ul style={{ display: 'flex', gap: '28px', listStyle: 'none', fontSize: '0.92rem', fontWeight: '600', color: '#475569' }}>
              <li><Link href="/neuravolt" style={{ textDecoration: 'none', color: '#475569' }}>Platform</Link></li>
              <li><Link href="/neuravolt#solutions" style={{ textDecoration: 'none', color: '#475569' }}>Solutions</Link></li>
              <li><Link href="/pricing" style={{ textDecoration: 'none', color: '#475569' }}>Pricing</Link></li>
              <li><Link href="/about" style={{ textDecoration: 'none', color: '#2563eb', fontWeight: '700' }}>About Xarwiz</Link></li>
            </ul>
          </nav>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Link href="/login" style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', textDecoration: 'none', color: '#0f172a', fontSize: '0.88rem', fontWeight: '600' }}>Book a Demo</Link>
            <Link href="/signup" style={{ padding: '8px 16px', borderRadius: '8px', background: '#2563eb', color: '#ffffff', textDecoration: 'none', fontSize: '0.88rem', fontWeight: '600' }}>Start Free Trial</Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section style={{
        position: 'relative',
        background: 'radial-gradient(circle at 50% 0%, #1e293b 0%, #0f172a 70%)',
        color: '#ffffff',
        padding: '100px 20px 120px 20px',
        textAlign: 'center',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 5, maxWidth: '920px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 18px', borderRadius: '20px', background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(59,130,246,0.25)', color: '#3b82f6', fontSize: '0.88rem', fontWeight: '700', marginBottom: '20px' }}>
            India's AI Business Operating System
          </div>

          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '3.4rem', fontWeight: 800, lineHeight: 1.15, marginBottom: '20px', letterSpacing: '-0.03em' }}>
            Everything Your Business Needs.<br />
            <span style={{ background: 'linear-gradient(90deg, #60a5fa, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>One Intelligent Platform.</span>
          </h1>

          <p style={{ fontSize: '1.2rem', color: '#94a3b8', lineHeight: 1.65, maxWidth: '840px', margin: '0 auto 36px auto' }}>
            Running a business shouldn't mean juggling dozens of disconnected tools. Xarwiz brings everything together—from AI agents and workflow automation to knowledge management, collaboration, cloud services, and enterprise security—so your team can focus on building, growing, and delivering better results.
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" style={{ padding: '14px 32px', fontSize: '1rem', background: '#2563eb', color: '#ffffff', borderRadius: '8px', textDecoration: 'none', fontWeight: '700' }}>Start Free Trial</Link>
            <Link href="/login" style={{ padding: '14px 32px', fontSize: '1rem', border: '1px solid rgba(255,255,255,0.4)', color: '#0f172a', background: '#ffffff', borderRadius: '8px', textDecoration: 'none', fontWeight: '600' }}>Book a Demo</Link>
          </div>
        </div>
      </section>

      {/* CORE CARDS SECTION */}
      <section style={{ padding: '90px 20px', background: '#ffffff' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', padding: '4px 14px', borderRadius: '20px', background: '#eff6ff', color: '#2563eb', fontSize: '0.82rem', fontWeight: '700', marginBottom: '16px' }}>Platform Pillars</div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>Everything Works Together in One Platform</h2>
            <p style={{ fontSize: '1.1rem', color: '#475569', maxWidth: '780px', margin: '0 auto 40px auto' }}>Eliminate software complexity with a unified AI architecture engineered for operational speed, intelligence, and ironclad enterprise security.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px' }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '32px' }}>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>AI Agents &amp; Automation</h3>
              <p style={{ color: '#475569', fontSize: '0.98rem', lineHeight: 1.65 }}>Let AI handle the repetitive work. Create intelligent agents that automate routine tasks, simplify complex workflows, and help your team get more done with less effort.</p>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '32px' }}>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>Enterprise Knowledge Hub</h3>
              <p style={{ color: '#475569', fontSize: '0.98rem', lineHeight: 1.65 }}>Turn your company's documents, websites, databases, and internal resources into a centralized knowledge hub where anyone can find accurate answers in seconds using AI.</p>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '32px' }}>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>Enterprise Security &amp; Compliance</h3>
              <p style={{ color: '#475569', fontSize: '0.98rem', lineHeight: 1.65 }}>Your data deserves the highest level of protection. Xarwiz is built with enterprise-grade security, role-based access controls, encryption, audit logs, and compliance-ready architecture to keep your business secure at every step.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQS SECTION */}
      <section style={{ padding: '90px 20px', background: '#fafafc', borderTop: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ display: 'inline-flex', padding: '4px 14px', borderRadius: '20px', background: '#eff6ff', color: '#2563eb', fontSize: '0.82rem', fontWeight: '700', marginBottom: '16px' }}>FAQ</div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '2.5rem', fontWeight: 800, color: '#0f172a' }}>Frequently Asked Questions</h2>
          </div>

          {[
            { q: "What is Xarwiz?", a: "Xarwiz is India's AI Business Operating System. Running a business shouldn't mean juggling dozens of disconnected tools. Xarwiz brings everything together—from AI agents and workflow automation to knowledge management, collaboration, cloud services, and enterprise security." },
            { q: "How does Xarwiz protect our enterprise data?", a: "Xarwiz is built with enterprise-grade security, role-based access controls (RBAC), end-to-end encryption, audit logs, and compliance-ready architecture keeping your business secure at every step." }
          ].map((item, idx) => (
            <div key={idx} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', marginBottom: '12px', background: '#ffffff', overflow: 'hidden' }}>
              <div
                onClick={() => toggleFaq(idx)}
                style={{ padding: '20px 24px', fontWeight: 700, fontSize: '1.05rem', color: '#0f172a', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span>{item.q}</span>
                <span>{activeFaq === idx ? '▲' : '▼'}</span>
              </div>
              {activeFaq === idx && (
                <div style={{ padding: '0 24px 20px 24px', fontSize: '0.95rem', color: '#475569', lineHeight: 1.6 }}>
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CALL TO ACTION SECTION */}
      <section style={{ background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)', color: '#ffffff', padding: '90px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '3rem', fontWeight: 800, marginBottom: '20px', lineHeight: 1.15 }}>
            Everything Your Business Needs.<br />One Intelligent Platform.
          </h2>
          <p style={{ fontSize: '1.15rem', color: 'rgba(255,255,255,0.9)', marginBottom: '36px', lineHeight: 1.6 }}>
            Build, grow, and deliver better results with India's AI Business Operating System.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" style={{ background: '#ffffff', color: '#1e40af', fontWeight: 700, padding: '14px 32px', borderRadius: '8px', textDecoration: 'none', fontSize: '1rem' }}>Start Free Trial</Link>
            <Link href="/login" style={{ border: '1px solid rgba(255,255,255,0.4)', color: '#ffffff', padding: '14px 32px', borderRadius: '8px', textDecoration: 'none', fontSize: '1rem', fontWeight: 600 }}>Book a Demo</Link>
          </div>
        </div>
      </section>

      {/* EXACT REUSED SHARED GLOBAL FOOTER */}
      <FooterSection />
    </div>
  );
}
