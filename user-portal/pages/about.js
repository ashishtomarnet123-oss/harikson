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
        <title>About Xarwiz — Building the Future of AI-Powered Business</title>
        <meta name="description" content="Discover Xarwiz: an AI-native business operating system that empowers startups, agencies, and enterprises to automate operations, collaborate intelligently, and scale with AI." />
        <meta property="og:title" content="About Xarwiz — Building the Future of AI-Powered Business" />
        <meta property="og:description" content="Learn why Xarwiz exists, our vision, technology architecture, ecosystem products, and DPDP-compliant sovereign AI cloud platform." />
        <meta property="og:type" content="website" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      {/* HEADER */}
      <header className="header" style={{ position: 'sticky', top: 0, zIndex: 100, background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '14px 0' }}>
        <div className="container" style={{ maxWidth: '1360px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" className="logo-container" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <img src="/assets/xarwiz-logo.png" alt="Xarwiz" className="logo-img" style={{ height: '30px', width: 'auto' }} />
            <span className="logo-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '20px', background: '#EFF6FF', border: '1px solid #BFDBFE', fontSize: '0.72rem', color: '#1E40AF', fontWeight: '700' }}>
              🛡️ AI Cloud Platform
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

      {/* SECTION 1 — HERO */}
      <section style={{
        position: 'relative',
        background: 'radial-gradient(circle at 50% 0%, #1e293b 0%, #0f172a 70%)',
        color: '#ffffff',
        padding: '100px 20px 120px 20px',
        textAlign: 'center',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 5, maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '20px', background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(59,130,246,0.25)', color: '#3b82f6', fontSize: '0.85rem', fontWeight: '700', marginBottom: '20px' }}>
            ⚡ 🇮🇳 The AI-Native Business Operating System
          </div>

          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '3.5rem', fontWeight: 800, lineHeight: 1.1, marginBottom: '20px', letterSpacing: '-0.03em' }}>
            Building the Future of <span style={{ background: 'linear-gradient(90deg, #60a5fa, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI-Powered Business</span>.
          </h1>

          <p style={{ fontSize: '1.2rem', color: '#94a3b8', lineHeight: 1.6, maxWidth: '780px', margin: '0 auto 36px auto' }}>
            Xarwiz is an AI-native business operating system that empowers startups, agencies, enterprises, and growing businesses to automate operations, collaborate intelligently, and scale with AI.
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" style={{ padding: '14px 32px', fontSize: '1rem', background: '#2563eb', color: '#ffffff', borderRadius: '8px', textDecoration: 'none', fontWeight: '700' }}>Get Started Free</Link>
            <Link href="/login" style={{ padding: '14px 32px', fontSize: '1rem', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff', borderRadius: '8px', textDecoration: 'none', fontWeight: '600' }}>Book a Demo</Link>
          </div>
        </div>
      </section>

      {/* SECTION 2 — WHO WE ARE */}
      <section style={{ padding: '90px 20px', background: '#ffffff' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', padding: '4px 14px', borderRadius: '20px', background: '#eff6ff', color: '#2563eb', fontSize: '0.82rem', fontWeight: '700', marginBottom: '16px' }}>🏢 Who We Are</div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>An Operating System Built for the AI Era</h2>
            <p style={{ fontSize: '1.1rem', color: '#475569', maxWidth: '720px', margin: '0 auto 40px auto' }}>Xarwiz is a unified, sovereign AI Cloud Infrastructure engineered to replace fragmented enterprise SaaS tools with intelligent, autonomous AI workflows.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '32px' }}>
              <div style={{ width: '48px', height: '48px', background: '#eff6ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', marginBottom: '20px', fontSize: '24px' }}>🤖</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px' }}>What is Xarwiz?</h3>
              <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.6 }}>An end-to-end AI operating system combining autonomous AI agents, RAG knowledge management, visual workflow automation, and agentic coding in a single DPDP-compliant cloud environment.</p>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '32px' }}>
              <div style={{ width: '48px', height: '48px', background: '#eff6ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', marginBottom: '20px', fontSize: '24px' }}>🧩</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px' }}>Why was it created?</h3>
              <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.6 }}>To eliminate AI fragmentation. Instead of stitching together 10 different tools with fragile APIs, Xarwiz provides a unified data layer with PostgreSQL Row-Level Security (RLS).</p>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '32px' }}>
              <div style={{ width: '48px', height: '48px', background: '#eff6ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', marginBottom: '20px', fontSize: '24px' }}>👥</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px' }}>Who is it built for?</h3>
              <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.6 }}>Built for modern startups, digital agencies, enterprise engineering teams, and regulated industries requiring 100% data sovereignty within Indian cloud borders.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4 — MISSION */}
      <section style={{ padding: '90px 20px', background: '#fafafc', borderTop: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', padding: '4px 14px', borderRadius: '20px', background: '#eff6ff', color: '#2563eb', fontSize: '0.82rem', fontWeight: '700', marginBottom: '16px' }}>🎯 Our Mission</div>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.3, marginBottom: '24px' }}>
            "To democratize autonomous AI infrastructure for every business on earth while upholding absolute data sovereignty and privacy."
          </h2>
          <p style={{ fontSize: '1.1rem', color: '#475569', lineHeight: 1.7 }}>
            We believe that artificial intelligence should augment human creativity, automate mechanical work, and allow teams to focus on strategy, breakthrough innovation, and customer relationships.
          </p>
        </div>
      </section>

      {/* SECTION 9 — ECOSYSTEM */}
      <section style={{ padding: '90px 20px', background: '#ffffff' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', padding: '4px 14px', borderRadius: '20px', background: '#eff6ff', color: '#2563eb', fontSize: '0.82rem', fontWeight: '700', marginBottom: '16px' }}>🌐 The Xarwiz Ecosystem</div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>Integrated Products Under One Roof</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginTop: '36px' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '24px', borderRadius: '14px' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#2563eb', marginBottom: '8px' }}>🤖 AI Platform</div>
              <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0 }}>Autonomous agent builder, prompt studio, and multi-tenant RAG knowledge base center.</p>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '24px', borderRadius: '14px' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#2563eb', marginBottom: '8px' }}>💬 WhatsWiz</div>
              <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0 }}>WhatsApp API business automation, AI customer support, and instant conversational commerce.</p>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '24px', borderRadius: '14px' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#2563eb', marginBottom: '8px' }}>⚡ Gigawiz</div>
              <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0 }}>High-frequency automated API execution engine for developer pipelines and background tasks.</p>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '24px', borderRadius: '14px' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#2563eb', marginBottom: '8px' }}>🎨 BrandzWiz</div>
              <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0 }}>AI brand asset generator, multi-channel marketing copywriter, and social media manager.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 23 — FAQS */}
      <section style={{ padding: '90px 20px', background: '#fafafc', borderTop: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ display: 'inline-flex', padding: '4px 14px', borderRadius: '20px', background: '#eff6ff', color: '#2563eb', fontSize: '0.82rem', fontWeight: '700', marginBottom: '16px' }}>❓ FAQ</div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '2.5rem', fontWeight: 800, color: '#0f172a' }}>Frequently Asked Questions</h2>
          </div>

          {[
            { q: "What is Xarwiz?", a: "Xarwiz is an AI-native business operating system that unifies autonomous AI agents, workflow automation, agentic coding, and DPDP-compliant RAG knowledge bases in one platform." },
            { q: "Is my customer data secure and stored in India?", a: "Yes. All database volumes, vector indices, and backup snapshots for Indian accounts reside inside tier-4 data centers within India's borders in full compliance with the DPDP Act 2023." },
            { q: "Do you train public AI models on my data?", a: "Never. We enforce a strict Zero AI Training Guarantee. Your documents, prompts, and vector embeddings are cryptographically isolated under PostgreSQL Row-Level Security (RLS)." },
            { q: "How can I get started with Xarwiz?", a: "You can register for a free account immediately or book a live product demonstration with our solutions engineering team." }
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

      {/* SECTION 25 — FINAL CALL TO ACTION */}
      <section style={{ background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)', color: '#ffffff', padding: '90px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '3rem', fontWeight: 800, marginBottom: '20px', lineHeight: 1.15 }}>
            The Future of Business is AI.<br />Build it with Xarwiz.
          </h2>
          <p style={{ fontSize: '1.15rem', color: 'rgba(255,255,255,0.9)', marginBottom: '36px', lineHeight: 1.6 }}>
            Join thousands of forward-thinking teams automating operations, building AI agents, and scaling securely.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" style={{ background: '#ffffff', color: '#1e40af', fontWeight: 700, padding: '14px 32px', borderRadius: '8px', textDecoration: 'none', fontSize: '1rem' }}>Start Free Trial</Link>
            <Link href="/login" style={{ border: '1px solid rgba(255,255,255,0.4)', color: '#ffffff', padding: '14px 32px', borderRadius: '8px', textDecoration: 'none', fontSize: '1rem', fontWeight: 600 }}>Book a Demo</Link>
          </div>
        </div>
      </section>

      {/* SECTION 26 — EXACT REUSED SHARED GLOBAL FOOTER */}
      <FooterSection />
    </div>
  );
}
