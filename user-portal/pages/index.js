import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Enterprise', href: '#enterprise' },
];

const FEATURES = [
  {
    icon: '🤖',
    title: 'AI Agent Fleet',
    desc: 'Deploy autonomous agents with custom personalities, tools, and knowledge — at any scale.',
    color: '#6366f1',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
  },
  {
    icon: '📚',
    title: 'RAG Knowledge Bases',
    desc: 'Index your docs, PDFs, and databases. Ground every response in your proprietary data.',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
  },
  {
    icon: '⚡',
    title: 'Real-Time Streaming',
    desc: 'Sub-second token delivery with WebSocket streaming. Users feel the speed instantly.',
    color: '#06b6d4',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
  },
  {
    icon: '🏢',
    title: 'Multi-Tenant Architecture',
    desc: 'Isolated workspaces per customer. Data never crosses tenant boundaries — ever.',
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  },
  {
    icon: '🔒',
    title: 'Enterprise Security',
    desc: 'Role-based access, audit trails, IP allowlists, and SSO out of the box.',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  },
  {
    icon: '📊',
    title: 'Full Observability',
    desc: 'Live GPU metrics, token usage, latency analytics, and cost tracking in one dashboard.',
    color: '#ec4899',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
  },
];

const STEPS = [
  { step: '01', title: 'Create Your Workspace', desc: 'Sign up and get a fully isolated tenant environment in 30 seconds.' },
  { step: '02', title: 'Configure Your AI Agent', desc: 'Pick a model, write a system prompt, and connect your knowledge base.' },
  { step: '03', title: 'Deploy via API or UI', desc: 'Embed your AI into any product with our REST API or hosted chat interface.' },
  { step: '04', title: 'Monitor & Scale', desc: 'Watch live usage, optimize performance, and scale to millions of requests.' },
];

const PLANS = [
  {
    name: 'Starter', price: '₹999', period: '/month',
    desc: 'Perfect for indie developers and small projects.',
    features: ['1 AI Agent', '50K tokens/month', '1 Knowledge Base (5 docs)', 'Community support', 'Harikson Plus model'],
    cta: 'Start Free Trial', primary: false,
  },
  {
    name: 'Growth', price: '₹4,999', period: '/month',
    desc: 'For growing teams shipping AI-powered products.',
    features: ['10 AI Agents', '500K tokens/month', '10 Knowledge Bases', 'Workflows & Automations', 'Priority support', 'All models (8B–32B)'],
    cta: 'Get Started', primary: true, badge: 'Most Popular',
  },
  {
    name: 'Enterprise', price: 'Custom', period: '',
    desc: 'Full control, SLAs, and dedicated infrastructure.',
    features: ['Unlimited Agents', 'Unlimited tokens', 'On-premise deployment', 'Custom model fine-tuning', 'Dedicated support', 'SLA guarantees'],
    cta: 'Contact Sales', primary: false,
  },
];

const STATS = [
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '<500ms', label: 'Avg Response' },
  { value: '10M+', label: 'Tokens Served' },
  { value: '128-bit', label: 'AES Encryption' },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const heroRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <Head>
        <title>Harikson AI — Enterprise AI Platform for Builders</title>
        <meta name="description" content="Deploy private AI agents with RAG, multi-tenant isolation, and real-time streaming. Built for serious products." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </Head>

      <div className="landing-root">
        {/* ─── NAVBAR ─── */}
        <nav className={`landing-nav ${scrolled ? 'landing-nav--scrolled' : ''}`}>
          <div className="landing-nav-inner">
            <Link href="/" className="landing-logo">
              <span className="landing-logo-icon">⚡</span>
              <span className="landing-logo-text">Harikson AI</span>
            </Link>

            <div className="landing-nav-links">
              {NAV_LINKS.map(l => (
                <a key={l.href} href={l.href} className="landing-nav-link">{l.label}</a>
              ))}
            </div>

            <div className="landing-nav-actions">
              <Link href="/login" className="landing-btn-ghost">Log in</Link>
              <Link href="/signup" className="landing-btn-primary">Get Started Free</Link>
            </div>

            <button className="landing-mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <span /><span /><span />
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="landing-mobile-menu">
              {NAV_LINKS.map(l => (
                <a key={l.href} href={l.href} className="landing-mobile-link" onClick={() => setMobileMenuOpen(false)}>{l.label}</a>
              ))}
              <hr className="landing-mobile-hr" />
              <Link href="/login" className="landing-mobile-link" onClick={() => setMobileMenuOpen(false)}>Log in</Link>
              <Link href="/signup" className="landing-mobile-cta" onClick={() => setMobileMenuOpen(false)}>Get Started Free →</Link>
            </div>
          )}
        </nav>

        {/* ─── HERO ─── */}
        <section className="landing-hero" ref={heroRef}>
          <div className="landing-hero-glow landing-hero-glow-1" />
          <div className="landing-hero-glow landing-hero-glow-2" />
          <div className="landing-hero-glow landing-hero-glow-3" />

          <div className="landing-container">
            <div className="landing-badge">
              <span className="landing-badge-dot" />
              Now with Qwen3-32B · 128K Context Window
            </div>

            <h1 className="landing-hero-title">
              The AI Platform<br />
              <span className="landing-hero-gradient">Built for Builders</span>
            </h1>

            <p className="landing-hero-subtitle">
              Deploy private AI agents with RAG knowledge bases, multi-tenant isolation,
              and real-time streaming — all from a single platform. Ship in days, not months.
            </p>

            <div className="landing-hero-actions">
              <Link href="/signup" className="landing-hero-cta">
                Start Building Free
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </Link>
              <a href="#how-it-works" className="landing-hero-secondary">
                <span className="landing-play-btn">▶</span>
                See how it works
              </a>
            </div>

            <div className="landing-stats-row">
              {STATS.map(s => (
                <div key={s.label} className="landing-stat">
                  <div className="landing-stat-value">{s.value}</div>
                  <div className="landing-stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Terminal preview */}
            <div className="landing-terminal">
              <div className="landing-terminal-header">
                <span className="landing-terminal-dot" style={{ background: '#ff5f57' }} />
                <span className="landing-terminal-dot" style={{ background: '#febc2e' }} />
                <span className="landing-terminal-dot" style={{ background: '#28c840' }} />
                <span className="landing-terminal-title">harikson-ai · chat stream</span>
              </div>
              <div className="landing-terminal-body">
                <div className="landing-terminal-line"><span className="landing-terminal-dim">$</span> curl -X POST https://api.harikson.ai/api/chat \</div>
                <div className="landing-terminal-line landing-terminal-indent">-H <span className="landing-terminal-green">"x-api-key: hk_live_..."</span> \</div>
                <div className="landing-terminal-line landing-terminal-indent">-d <span className="landing-terminal-green">'{"{"}"message": "Summarize Q4 report"{"}"}'</span></div>
                <div className="landing-terminal-line" style={{ marginTop: '12px', color: '#94a3b8' }}>⟵ streaming response...</div>
                <div className="landing-terminal-line"><span className="landing-terminal-purple">assistant</span>: Q4 revenue grew 34% YoY driven by enterprise expansion...</div>
                <div className="landing-terminal-cursor" />
              </div>
            </div>
          </div>
        </section>

        {/* ─── FEATURES ─── */}
        <section className="landing-section" id="features">
          <div className="landing-container">
            <div className="landing-section-header">
              <div className="landing-section-badge">Features</div>
              <h2 className="landing-section-title">Everything you need to ship AI</h2>
              <p className="landing-section-sub">No stitching together 10 tools. One platform that handles everything from inference to observability.</p>
            </div>

            <div className="landing-features-grid">
              {FEATURES.map(f => (
                <div key={f.title} className="landing-feature-card">
                  <div className="landing-feature-icon" style={{ background: f.gradient }}>
                    <span style={{ fontSize: '22px' }}>{f.icon}</span>
                  </div>
                  <h3 className="landing-feature-title">{f.title}</h3>
                  <p className="landing-feature-desc">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── HOW IT WORKS ─── */}
        <section className="landing-section landing-section--alt" id="how-it-works">
          <div className="landing-container">
            <div className="landing-section-header">
              <div className="landing-section-badge">How it Works</div>
              <h2 className="landing-section-title">From zero to production in 4 steps</h2>
            </div>

            <div className="landing-steps">
              {STEPS.map((s, i) => (
                <div key={s.step} className="landing-step">
                  <div className="landing-step-number">{s.step}</div>
                  <div className="landing-step-connector" style={{ display: i === STEPS.length - 1 ? 'none' : undefined }} />
                  <div className="landing-step-content">
                    <h3 className="landing-step-title">{s.title}</h3>
                    <p className="landing-step-desc">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── PRICING ─── */}
        <section className="landing-section" id="pricing">
          <div className="landing-container">
            <div className="landing-section-header">
              <div className="landing-section-badge">Pricing</div>
              <h2 className="landing-section-title">Simple, transparent pricing</h2>
              <p className="landing-section-sub">Start free, scale as you grow. No hidden fees, no per-seat pricing madness.</p>
            </div>

            <div className="landing-pricing-grid">
              {PLANS.map(p => (
                <div key={p.name} className={`landing-pricing-card ${p.primary ? 'landing-pricing-card--primary' : ''}`}>
                  {p.badge && <div className="landing-pricing-badge">{p.badge}</div>}
                  <div className="landing-pricing-name">{p.name}</div>
                  <div className="landing-pricing-price">
                    <span className="landing-pricing-amount">{p.price}</span>
                    <span className="landing-pricing-period">{p.period}</span>
                  </div>
                  <p className="landing-pricing-desc">{p.desc}</p>
                  <ul className="landing-pricing-features">
                    {p.features.map(f => (
                      <li key={f} className="landing-pricing-feature">
                        <span className="landing-pricing-check">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/signup" className={`landing-pricing-cta ${p.primary ? 'landing-pricing-cta--primary' : ''}`}>
                    {p.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── ENTERPRISE ─── */}
        <section className="landing-section landing-section--alt" id="enterprise">
          <div className="landing-container">
            <div className="landing-enterprise">
              <div className="landing-enterprise-glow" />
              <div className="landing-enterprise-content">
                <div className="landing-section-badge">Enterprise</div>
                <h2 className="landing-enterprise-title">Ready for enterprise scale?</h2>
                <p className="landing-enterprise-sub">
                  On-premise deployment, custom model fine-tuning, SSO, dedicated infrastructure,
                  and a 99.9% uptime SLA. We work with you directly.
                </p>
                <div className="landing-enterprise-actions">
                  <a href="mailto:enterprise@harikson.ai" className="landing-hero-cta">Contact Sales</a>
                  <Link href="/login" className="landing-hero-secondary" style={{ color: '#e2e8f0' }}>
                    View Admin Demo →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── FOOTER ─── */}
        <footer className="landing-footer">
          <div className="landing-container">
            <div className="landing-footer-top">
              <div className="landing-footer-brand">
                <Link href="/" className="landing-logo">
                  <span className="landing-logo-icon">⚡</span>
                  <span className="landing-logo-text">Harikson AI</span>
                </Link>
                <p className="landing-footer-tagline">Enterprise AI infrastructure for builders who care about reliability.</p>
              </div>
              <div className="landing-footer-links">
                <div className="landing-footer-col">
                  <div className="landing-footer-col-title">Product</div>
                  {['Features', 'Pricing', 'Changelog', 'Roadmap'].map(l => (
                    <a key={l} href="#" className="landing-footer-link">{l}</a>
                  ))}
                </div>
                <div className="landing-footer-col">
                  <div className="landing-footer-col-title">Company</div>
                  {['About', 'Blog', 'Careers', 'Contact'].map(l => (
                    <a key={l} href="#" className="landing-footer-link">{l}</a>
                  ))}
                </div>
                <div className="landing-footer-col">
                  <div className="landing-footer-col-title">Legal</div>
                  {['Privacy Policy', 'Terms of Service', 'Security', 'GDPR'].map(l => (
                    <a key={l} href="#" className="landing-footer-link">{l}</a>
                  ))}
                </div>
              </div>
            </div>
            <div className="landing-footer-bottom">
              <div className="landing-footer-copy">© 2026 Harikson AI. All rights reserved.</div>
              <div className="landing-footer-made">Built with ⚡ in India</div>
            </div>
          </div>
        </footer>
      </div>

      <style jsx>{`
        /* ─── RESET & BASE ─── */
        .landing-root { font-family: 'Inter', -apple-system, sans-serif; background: #030712; color: #e2e8f0; min-height: 100vh; overflow-x: hidden; }
        .landing-container { max-width: 1180px; margin: 0 auto; padding: 0 24px; }

        /* ─── NAV ─── */
        .landing-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          padding: 18px 0; transition: all 0.3s ease;
        }
        .landing-nav--scrolled {
          background: rgba(3, 7, 18, 0.85); backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,0.06); padding: 12px 0;
        }
        .landing-nav-inner { max-width: 1180px; margin: 0 auto; padding: 0 24px; display: flex; align-items: center; gap: 32px; }
        .landing-logo { display: flex; align-items: center; gap: 8px; text-decoration: none; }
        .landing-logo-icon { font-size: 22px; }
        .landing-logo-text { font-weight: 800; font-size: 17px; letter-spacing: -0.3px; background: linear-gradient(135deg, #a5b4fc, #818cf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .landing-nav-links { display: flex; align-items: center; gap: 2px; margin-left: auto; }
        .landing-nav-link { color: #94a3b8; font-size: 14px; font-weight: 500; padding: 6px 14px; border-radius: 8px; text-decoration: none; transition: color 0.2s, background 0.2s; }
        .landing-nav-link:hover { color: #e2e8f0; background: rgba(255,255,255,0.05); }
        .landing-nav-actions { display: flex; align-items: center; gap: 8px; }
        .landing-btn-ghost { color: #94a3b8; font-size: 14px; font-weight: 500; padding: 8px 16px; border-radius: 10px; text-decoration: none; border: 1px solid rgba(255,255,255,0.1); transition: all 0.2s; }
        .landing-btn-ghost:hover { color: #e2e8f0; border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); }
        .landing-btn-primary { background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; font-size: 14px; font-weight: 600; padding: 8px 18px; border-radius: 10px; text-decoration: none; transition: all 0.2s; box-shadow: 0 4px 12px rgba(99,102,241,0.3); }
        .landing-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(99,102,241,0.4); }
        .landing-mobile-toggle { display: none; flex-direction: column; gap: 5px; padding: 6px; background: none; border: none; cursor: pointer; margin-left: auto; }
        .landing-mobile-toggle span { display: block; width: 22px; height: 2px; background: #94a3b8; border-radius: 2px; }
        .landing-mobile-menu { background: rgba(10,10,20,0.98); border-top: 1px solid rgba(255,255,255,0.06); padding: 16px 24px 20px; }
        .landing-mobile-link { display: block; color: #94a3b8; font-size: 15px; padding: 10px 0; text-decoration: none; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .landing-mobile-cta { display: block; margin-top: 12px; background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; font-size: 14px; font-weight: 600; padding: 12px 20px; border-radius: 10px; text-decoration: none; text-align: center; }
        .landing-mobile-hr { border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 8px 0; }

        /* ─── HERO ─── */
        .landing-hero { position: relative; padding: 160px 0 100px; overflow: hidden; }
        .landing-hero-glow { position: absolute; border-radius: 50%; filter: blur(100px); pointer-events: none; }
        .landing-hero-glow-1 { width: 600px; height: 600px; background: rgba(99,102,241,0.18); top: -100px; left: -100px; }
        .landing-hero-glow-2 { width: 500px; height: 500px; background: rgba(139,92,246,0.12); top: 0; right: -50px; }
        .landing-hero-glow-3 { width: 400px; height: 400px; background: rgba(6,182,212,0.08); bottom: -50px; left: 50%; transform: translateX(-50%); }
        .landing-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.3); color: #a5b4fc; font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: 100px; margin-bottom: 28px; letter-spacing: 0.3px; }
        .landing-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: #6366f1; animation: pulse 2s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .landing-hero-title { font-size: clamp(44px, 7vw, 80px); font-weight: 900; line-height: 1.05; letter-spacing: -2px; color: #f8fafc; margin: 0 0 24px; }
        .landing-hero-gradient { background: linear-gradient(135deg, #a5b4fc 0%, #818cf8 40%, #6366f1 70%, #4f46e5 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .landing-hero-subtitle { font-size: clamp(16px, 2.5vw, 20px); color: #64748b; line-height: 1.7; max-width: 560px; margin: 0 0 40px; }
        .landing-hero-actions { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 60px; }
        .landing-hero-cta { display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; font-size: 15px; font-weight: 700; padding: 14px 28px; border-radius: 14px; text-decoration: none; transition: all 0.25s; box-shadow: 0 8px 30px rgba(99,102,241,0.35); }
        .landing-hero-cta:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(99,102,241,0.45); }
        .landing-hero-secondary { display: inline-flex; align-items: center; gap: 10px; color: #94a3b8; font-size: 15px; font-weight: 500; text-decoration: none; transition: color 0.2s; }
        .landing-hero-secondary:hover { color: #e2e8f0; }
        .landing-play-btn { width: 38px; height: 38px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; transition: background 0.2s; }
        .landing-hero-secondary:hover .landing-play-btn { background: rgba(255,255,255,0.12); }
        .landing-stats-row { display: flex; gap: 40px; flex-wrap: wrap; margin-bottom: 60px; padding: 28px 0; border-top: 1px solid rgba(255,255,255,0.06); border-bottom: 1px solid rgba(255,255,255,0.06); }
        .landing-stat-value { font-size: 26px; font-weight: 800; color: #f1f5f9; letter-spacing: -0.5px; }
        .landing-stat-label { font-size: 12px; color: #475569; margin-top: 2px; font-weight: 500; }

        /* ─── TERMINAL ─── */
        .landing-terminal { background: #0d1117; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; overflow: hidden; max-width: 640px; box-shadow: 0 30px 80px rgba(0,0,0,0.5); }
        .landing-terminal-header { display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.06); }
        .landing-terminal-dot { width: 12px; height: 12px; border-radius: 50%; }
        .landing-terminal-title { font-size: 12px; color: #475569; margin-left: auto; font-family: monospace; }
        .landing-terminal-body { padding: 20px 20px 24px; font-family: 'Courier New', monospace; font-size: 13px; line-height: 1.8; }
        .landing-terminal-line { color: #94a3b8; }
        .landing-terminal-indent { padding-left: 16px; }
        .landing-terminal-dim { color: #475569; margin-right: 8px; }
        .landing-terminal-green { color: #86efac; }
        .landing-terminal-purple { color: #a5b4fc; }
        .landing-terminal-cursor { width: 8px; height: 16px; background: #6366f1; display: inline-block; border-radius: 2px; animation: blink 1s steps(1) infinite; margin-top: 4px; }
        @keyframes blink { 50% { opacity: 0; } }

        /* ─── SECTIONS ─── */
        .landing-section { padding: 100px 0; }
        .landing-section--alt { background: rgba(255,255,255,0.015); border-top: 1px solid rgba(255,255,255,0.04); border-bottom: 1px solid rgba(255,255,255,0.04); }
        .landing-section-header { text-align: center; margin-bottom: 60px; }
        .landing-section-badge { display: inline-block; background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.25); color: #a5b4fc; font-size: 11px; font-weight: 700; padding: 5px 14px; border-radius: 100px; margin-bottom: 16px; letter-spacing: 1px; text-transform: uppercase; }
        .landing-section-title { font-size: clamp(28px, 4vw, 44px); font-weight: 800; color: #f1f5f9; letter-spacing: -1px; margin: 0 0 16px; }
        .landing-section-sub { font-size: 17px; color: #64748b; max-width: 500px; margin: 0 auto; line-height: 1.7; }

        /* ─── FEATURES ─── */
        .landing-features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .landing-feature-card { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.06); border-radius: 20px; padding: 28px; transition: all 0.3s; }
        .landing-feature-card:hover { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.1); transform: translateY(-4px); }
        .landing-feature-icon { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; margin-bottom: 18px; }
        .landing-feature-title { font-size: 17px; font-weight: 700; color: #f1f5f9; margin: 0 0 10px; }
        .landing-feature-desc { font-size: 14px; color: #64748b; line-height: 1.65; margin: 0; }

        /* ─── HOW IT WORKS ─── */
        .landing-steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; position: relative; }
        .landing-step { position: relative; text-align: center; padding: 0 20px; }
        .landing-step-number { width: 56px; height: 56px; background: linear-gradient(135deg, #6366f1, #4f46e5); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; color: white; margin: 0 auto 20px; position: relative; z-index: 2; box-shadow: 0 8px 24px rgba(99,102,241,0.3); }
        .landing-step-connector { position: absolute; top: 28px; left: 50%; width: 100%; height: 2px; background: linear-gradient(90deg, rgba(99,102,241,0.4), rgba(99,102,241,0.1)); z-index: 1; }
        .landing-step-title { font-size: 15px; font-weight: 700; color: #f1f5f9; margin: 0 0 10px; }
        .landing-step-desc { font-size: 13px; color: #64748b; line-height: 1.6; }

        /* ─── PRICING ─── */
        .landing-pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; align-items: start; }
        .landing-pricing-card { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; padding: 32px; position: relative; transition: all 0.3s; }
        .landing-pricing-card:hover { border-color: rgba(255,255,255,0.12); }
        .landing-pricing-card--primary { background: rgba(99,102,241,0.1); border-color: rgba(99,102,241,0.4); box-shadow: 0 0 60px rgba(99,102,241,0.15); }
        .landing-pricing-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; font-size: 11px; font-weight: 700; padding: 4px 14px; border-radius: 100px; white-space: nowrap; }
        .landing-pricing-name { font-size: 13px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
        .landing-pricing-price { display: flex; align-items: baseline; gap: 4px; margin-bottom: 12px; }
        .landing-pricing-amount { font-size: 40px; font-weight: 900; color: #f1f5f9; letter-spacing: -1px; }
        .landing-pricing-period { font-size: 14px; color: #64748b; }
        .landing-pricing-desc { font-size: 14px; color: #64748b; margin: 0 0 24px; line-height: 1.5; }
        .landing-pricing-features { list-style: none; padding: 0; margin: 0 0 28px; }
        .landing-pricing-feature { display: flex; align-items: center; gap: 10px; font-size: 14px; color: #94a3b8; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .landing-pricing-check { color: #10b981; font-weight: 700; font-size: 13px; shrink: 0; }
        .landing-pricing-cta { display: block; text-align: center; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: #e2e8f0; font-size: 14px; font-weight: 600; padding: 12px; border-radius: 12px; text-decoration: none; transition: all 0.2s; }
        .landing-pricing-cta:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.16); }
        .landing-pricing-cta--primary { background: linear-gradient(135deg, #6366f1, #4f46e5); border-color: transparent; box-shadow: 0 6px 20px rgba(99,102,241,0.3); }
        .landing-pricing-cta--primary:hover { box-shadow: 0 8px 28px rgba(99,102,241,0.4); background: linear-gradient(135deg, #818cf8, #6366f1); border-color: transparent; }

        /* ─── ENTERPRISE ─── */
        .landing-enterprise { position: relative; background: rgba(99,102,241,0.06); border: 1px solid rgba(99,102,241,0.2); border-radius: 28px; padding: 64px; overflow: hidden; text-align: center; }
        .landing-enterprise-glow { position: absolute; width: 600px; height: 600px; background: rgba(99,102,241,0.12); border-radius: 50%; filter: blur(80px); top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; }
        .landing-enterprise-content { position: relative; z-index: 1; }
        .landing-enterprise-title { font-size: clamp(28px, 4vw, 44px); font-weight: 800; color: #f1f5f9; letter-spacing: -1px; margin: 16px 0 20px; }
        .landing-enterprise-sub { font-size: 17px; color: #64748b; max-width: 540px; margin: 0 auto 36px; line-height: 1.7; }
        .landing-enterprise-actions { display: flex; align-items: center; justify-content: center; gap: 16px; flex-wrap: wrap; }

        /* ─── FOOTER ─── */
        .landing-footer { border-top: 1px solid rgba(255,255,255,0.06); padding: 60px 0 32px; }
        .landing-footer-top { display: flex; gap: 60px; justify-content: space-between; flex-wrap: wrap; margin-bottom: 48px; }
        .landing-footer-brand { max-width: 260px; }
        .landing-footer-tagline { font-size: 14px; color: #475569; margin-top: 12px; line-height: 1.6; }
        .landing-footer-links { display: flex; gap: 48px; flex-wrap: wrap; }
        .landing-footer-col { display: flex; flex-direction: column; gap: 10px; min-width: 120px; }
        .landing-footer-col-title { font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
        .landing-footer-link { font-size: 14px; color: #475569; text-decoration: none; transition: color 0.2s; }
        .landing-footer-link:hover { color: #94a3b8; }
        .landing-footer-bottom { display: flex; align-items: center; justify-content: space-between; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.06); }
        .landing-footer-copy { font-size: 13px; color: #334155; }
        .landing-footer-made { font-size: 13px; color: #334155; }

        /* ─── RESPONSIVE ─── */
        @media (max-width: 768px) {
          .landing-nav-links, .landing-nav-actions { display: none; }
          .landing-mobile-toggle { display: flex; }
          .landing-features-grid { grid-template-columns: 1fr 1fr; }
          .landing-steps { grid-template-columns: 1fr 1fr; gap: 32px; }
          .landing-step-connector { display: none; }
          .landing-pricing-grid { grid-template-columns: 1fr; }
          .landing-stats-row { gap: 24px; }
          .landing-enterprise { padding: 40px 24px; }
          .landing-footer-top { flex-direction: column; gap: 32px; }
        }
        @media (max-width: 480px) {
          .landing-features-grid { grid-template-columns: 1fr; }
          .landing-steps { grid-template-columns: 1fr; }
          .landing-hero-actions { flex-direction: column; align-items: flex-start; }
        }
      `}</style>
    </>
  );
}
