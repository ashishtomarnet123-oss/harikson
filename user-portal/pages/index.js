import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';

// ─── DESIGN SYSTEM ───────────────────────────────────────────────────────────
const DS = {
  bgDark: '#09090B',
  bgLight: '#FFFFFF',
  surfaceDark: '#111217',
  surfaceLight: '#F8FAFC',
  primary: '#4F8CFF',
  secondary: '#8B7FFF',
  success: '#22C55E',
  warning: '#F4B740',
  error: '#FF5D73',
  textHeadingDark: '#FFFFFF',
  textHeadingLight: '#0F172A',
  textBodyDark: '#E5E7EB',
  textBodyLight: '#334155',
  textMutedDark: '#A1A1AA',
  textMutedLight: '#64748B',
  borderDark: '#26272D',
  borderLight: '#E2E8F0',
};

// ─── TERMINAL ANIMATION COMPONENT ─────────────────────────────────────────────
const TerminalAnimation = () => {
  const [lines, setLines] = useState([]);
  const [currentText, setCurrentText] = useState('');
  const [cursorVisible, setCursorVisible] = useState(true);
  const [step, setStep] = useState(0); // 0: typing, 1: loading model, 2: RAG index, 3: tenant isolation, 4: DPDP compliance, 5: completed (pause)

  const command = 'harikson deploy --model Llama3-8B --region india-mum';

  // Cursor blinking
  useEffect(() => {
    const interval = setInterval(() => {
      setCursorVisible((v) => !v);
    }, 500); // Fixed interval crash (reduced from 500000000000000 to standard 500ms)
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let timer;
    if (step === 0) {
      // Typing animation
      if (currentText.length < command.length) {
        timer = setTimeout(() => {
          setCurrentText(command.slice(0, currentText.length + 1));
        }, 50);
      } else {
        // Finished typing command
        timer = setTimeout(() => {
          setStep(1);
          setLines((l) => [...l, { text: '✓ Model loaded in 4.2s', status: 'success' }]);
        }, 600);
      }
    } else if (step >= 1 && step <= 3) {
      // Staggered output lines
      const messages = [
        { text: '✓ Model loaded in 4.2s', status: 'success' },
        { text: '✓ RAG index: 50,000 documents', status: 'success' },
        { text: '✓ Tenant isolation: ACTIVE', status: 'success' },
        { text: '✓ DPDP compliance: VERIFIED', status: 'success' }
      ];
      timer = setTimeout(() => {
        const msg = messages[step];
        if (msg) setLines((l) => [...l, msg]);
        setStep((s) => s + 1);
      }, 700);
    } else if (step === 4) {
      // Pause and restart loop
      timer = setTimeout(() => {
        setLines([]);
        setCurrentText('');
        setStep(0);
      }, 5000);
    }

    return () => clearTimeout(timer);
  }, [step, currentText]);

  return (
    <div className="terminal-box">
      <div className="terminal-header">
        <span className="dot dot-red" />
        <span className="dot dot-yellow" />
        <span className="dot dot-green" />
        <span className="terminal-title">Sovereign Shell</span>
      </div>
      <div className="terminal-body font-mono">
        <div className="terminal-row">
          <span className="terminal-prompt">$</span>
          <span className="terminal-command">{currentText}</span>
          <span className={`terminal-cursor ${cursorVisible ? 'visible' : ''}`}>_</span>
        </div>
        {lines.map((l, i) => (
          <div key={i} className="terminal-row-output animate-fade-in" style={{ color: l.status === 'success' ? '#22C55E' : '#FFFFFF' }}>
            {l.text}
          </div>
        ))}
      </div>
      <style jsx>{`
        .terminal-box {
          background: #090A0F;
          border: 1px solid #26272D;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
          width: 100%;
          max-width: 480px;
          min-height: 220px;
          text-align: left;
        }
        .terminal-header {
          background: #111217;
          border-bottom: 1px solid #26272D;
          padding: 8px 16px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }
        .dot-red { background: #FF5D73; }
        .dot-yellow { background: #F4B740; }
        .dot-green { background: #22C55E; }
        .terminal-title {
          font-size: 11px;
          color: #A1A1AA;
          margin-left: 8px;
        }
        .terminal-body {
          padding: 16px;
          font-size: 13px;
          line-height: 1.6;
        }
        .terminal-prompt {
          color: #8B7FFF;
          margin-right: 8px;
        }
        .terminal-command {
          color: #E5E7EB;
        }
        .terminal-cursor {
          color: #4F8CFF;
          font-weight: bold;
          animation: cursor-blink 1s step-end infinite;
        }
        @keyframes cursor-blink {
          from, to { opacity: 1; }
          50% { opacity: 0; }
        }
        .terminal-row-output {
          margin-top: 6px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default function LandingPage() {
  const [activeCapability, setActiveCapability] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const capabilities = [
    {
      id: 'llm',
      title: '🤖 Private LLM Deployment',
      desc: 'Deploy Qwen3, Llama, Mistral on your infrastructure. No data leaves your VPC.',
      details: 'With Harikson AI, we support deployment inside AWS, GCP, Azure India regions, or your own on-premise air-gapped bare metal servers. You get complete control of model weights, inference speed, and local privacy boundaries.'
    },
    {
      id: 'tenant',
      title: '🏢 Multi-Tenant AI Platform',
      desc: 'One deployment. Hundreds of teams. Complete isolation. Row-level security, per-tenant billing, custom models.',
      details: 'Isolate distinct corporate clients or internal business units perfectly. Each tenant gets distinct configuration tables, storage folders, custom models, and isolated RAG knowledge layers.'
    },
    {
      id: 'rag',
      title: '📚 Enterprise RAG System',
      desc: 'Upload 50,000 documents. Auto-chunk. Embed. Query. Source attribution in every response.',
      details: 'High-speed ingestion pipeline specifically optimized for enterprise document repositories, PDFs, wikis, and legal catalogs. Native integrations guarantee strict access control and real-time indexing.'
    },
    {
      id: 'agent',
      title: '🧠 AI Agent Orchestration',
      desc: 'Build agents with memory, tools, multi-step reasoning. Deploy to WhatsApp, Slack, web, mobile.',
      details: 'Deploy intelligent autonomous agents that call external system APIs, access user profiles, process natural language in Indic regional dialects, and escalate to humans seamlessly.'
    },
    {
      id: 'gov',
      title: '📊 Governance & Compliance',
      desc: 'DPDP-ready. Audit trails. Data principal rights. BIS/MeitY empanelment support.',
      details: 'Built-in security audits map all data transformations and model queries. Includes tools to handle right-to-erasure and right-to-access under India\'s DPDP Act 2023.'
    },
    {
      id: 'api',
      title: '🔌 Developer-First API',
      desc: 'OpenAI-compatible. One-line migration. SDKs for Python, Node.js, Go, Java.',
      details: 'Just swap your existing base URL to target Harikson and your codebase works immediately. Supports streaming tokens, system prompts, structured JSON output formats, and batch offline evaluations.'
    }
  ];

  return (
    <>
      <Head>
        <title>Harikson AI — India's Sovereign LLM Infrastructure Platform</title>
        <meta name="description" content="Deploy private LLMs, AI agents, and RAG systems on Indian soil. DPDP-compliant, multi-tenant, enterprise-grade AI infrastructure." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        {/* Plausible Analytics (Privacy-First) */}
        <script defer data-domain="harikson.ai" src="https://plausible.io/js/script.js"></script>

        {/* Structured Schema.org Markup */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Harikson AI",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Linux, Cloud, Self-Hosted",
              "description": "Sovereign enterprise AI infrastructure for private LLM deployment, multi-tenant workspace routing, and RAG architecture.",
              "offers": {
                "@type": "Offer",
                "price": "0.00",
                "priceCurrency": "INR"
              }
            })
          }}
        />
      </Head>
 
      <div className="landing-container">
        
        {/* ─── HERO SECTION ─── */}
        <section className="section-hero">
          <div className="radial-glow-hero" />
          
          <div className="hero-content-wrapper">
            {/* Header / Nav */}
            <header className="hero-nav">
              <div className="logo-section">
                <span className="logo-icon">⚡</span>
                <span className="logo-text">Harikson AI</span>
              </div>
              <div className="nav-links-desktop">
                <a href="#capabilities" className="nav-link">Features</a>
                <a href="#developers" className="nav-link">Docs</a>
                <a href="#pricing" className="nav-link">Pricing</a>
                <Link href="/login" passHref legacyBehavior><a className="nav-link">Sign In</a></Link>
                <Link href="/signup" passHref legacyBehavior><a className="nav-link-btn">Start Free</a></Link>
              </div>
              <button className="hamburger-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                <span className="bar"></span>
                <span className="bar"></span>
                <span className="bar"></span>
              </button>
            </header>

            {/* Mobile Navigation Drawer */}
            {mobileMenuOpen && (
              <div className="mobile-nav-drawer">
                <a href="#capabilities" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Features</a>
                <a href="#developers" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Docs</a>
                <a href="#pricing" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
                <Link href="/login" passHref legacyBehavior><a className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Sign In</a></Link>
                <Link href="/signup" passHref legacyBehavior><a className="mobile-nav-link highlighted" onClick={() => setMobileMenuOpen(false)}>Start Free</a></Link>
              </div>
            )}

            {/* Core Hero Content */}
            <div className="hero-body">
              <div className="hero-left">
                <div className="sovereign-tag">
                  <span className="flag-icon">🇮🇳</span> 100% Indian Data Sovereignty
                </div>
                <h1 className="hero-title">
                  India's Sovereign<br />AI Infrastructure
                </h1>
                <p className="hero-sub">
                  Deploy private LLMs, AI agents, and RAG systems on Indian soil. DPDP-compliant. Fully controlled.
                </p>

                <div className="hero-ctas">
                  <Link href="/signup" passHref legacyBehavior><a className="btn-primary">🚀 Start Free — ₹0</a></Link>
                  <a href="#founders-contact" className="btn-secondary">📅 Book Demo</a>
                </div>
                <p className="hero-cta-caption">
                  No credit card. 100K tokens free.
                </p>

                {/* Trust Partners */}
                <div className="trust-partners">
                  <span className="trust-label">Trusted by:</span>
                  <div className="trust-logos-row">
                    <span className="trust-logo">IIT Bombay</span>
                    <span className="trust-logo">ISRO Partner</span>
                    <span className="trust-logo">NIC</span>
                    <span className="trust-logo">Ministry of IT</span>
                    <span className="trust-logo">State Bank</span>
                  </div>
                </div>

                <div className="scroll-indicator">
                  <span className="arrow-down">↓</span> Scroll to explore
                </div>
              </div>

              <div className="hero-right">
                <TerminalAnimation />

                {/* Local Badges */}
                <div className="hero-badges-row">
                  <div className="badge-card">
                    <span className="badge-icon">🇮🇳</span>
                    <div>
                      <div className="badge-title">100% Hosted in India</div>
                      <div className="badge-desc">Data residency guaranteed</div>
                    </div>
                  </div>
                  <div className="badge-card">
                    <span className="badge-icon">🛡️</span>
                    <div>
                      <div className="badge-title">DPDP 2023 Compliant</div>
                      <div className="badge-desc">Data protection ready</div>
                    </div>
                  </div>
                  <div className="badge-card">
                    <span className="badge-icon">⚡</span>
                    <div>
                      <div className="badge-title">BIS Certified</div>
                      <div className="badge-desc">Indian standards certified</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── PROBLEM SECTION ─── */}
        <section className="section-problem" id="problem">
          <div className="content-inner">
            <div className="tag-line">THE CHALLENGE</div>
            <h2 className="section-heading dark-text">WHY INDIAN ENTERPRISES NEED SOVEREIGN AI</h2>
            
            <div className="problem-comparison-grid">
              <div className="comparison-card card-problem">
                <h3 className="comp-title text-red">🚨 The Foreign AI Problem</h3>
                <ul className="comp-list">
                  <li><strong>Data leaves India:</strong> Passing through US/EU clouds violates local compliance laws.</li>
                  <li><strong>No control over model behavior:</strong> Blindly dependent on foreign provider weights.</li>
                  <li><strong>Premium dollar pricing:</strong> High costs calculated in USD, exposing you to rupee fluctuations.</li>
                  <li><strong>English-only bias:</strong> Extremely poor processing of regional Indian contexts.</li>
                  <li><strong>Generic models:</strong> Lacks specific domain knowledge of local regulations and business stack.</li>
                </ul>
              </div>

              <div className="comparison-card card-fix">
                <h3 className="comp-title text-emerald">🛡️ The Sovereign Fix</h3>
                <ul className="comp-list">
                  <li><strong>100% India-hosted:</strong> Deployed in local cloud data centers or on-premises.</li>
                  <li><strong>Your weights, your rules:</strong> Control parameters and fine-tune models explicitly.</li>
                  <li><strong>60% cheaper:</strong> Priced natively in INR with optimized inference engines.</li>
                  <li><strong>22 regional languages:</strong> Full native support for Hindi, Tamil, Kannada, Marathi, etc.</li>
                  <li><strong>Fine-tune on your data:</strong> Customized context specific to your local industry standards.</li>
                </ul>
              </div>
            </div>

            <div className="center-action">
              <button className="btn-problem-report" onClick={() => setShowReport(true)}>
                📄 See Compliance Report
              </button>
            </div>
          </div>
        </section>

        {/* ─── CAPABILITIES SECTION ─── */}
        <section className="section-capabilities" id="capabilities">
          <div className="content-inner">
            <div className="tag-line tag-blue">CAPABILITIES</div>
            <h2 className="section-heading white-text">ONE PLATFORM. COMPLETE AI CONTROL.</h2>
            
            <div className="capabilities-grid">
              {capabilities.map((c) => (
                <div key={c.id} className="cap-card">
                  <div className="cap-header">
                    <h3 className="cap-title">{c.title}</h3>
                  </div>
                  <p className="cap-desc">{c.desc}</p>
                  <button className="cap-link" onClick={() => setActiveCapability(c)}>
                    Learn more →
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── PROOF SECTION ─── */}
        <section className="section-proof" id="proof">
          <div className="content-inner">
            <div className="tag-line">VERIFIABLE PROOF</div>
            <h2 className="section-heading dark-text">BUILT FOR INDIAN SCALE</h2>
            
            <div className="proof-grid">
              {/* Performance */}
              <div className="proof-card">
                <div className="proof-card-header">
                  <span className="proof-icon">📈</span>
                  <h3>Performance</h3>
                </div>
                <ul className="proof-list">
                  <li><strong>50,000+</strong> concurrent users per cluster deployment</li>
                  <li><strong>&lt; 200ms</strong> p99 token latency on Qwen3-8B</li>
                  <li><strong>99.99%</strong> enterprise-level uptime SLA guaranteed</li>
                </ul>
              </div>

              {/* Compliance */}
              <div className="proof-card">
                <div className="proof-card-header">
                  <span className="proof-icon">🏛️</span>
                  <h3>Compliance</h3>
                </div>
                <ul className="proof-list">
                  <li><strong>DPDP Act 2023</strong> fully ready architecture</li>
                  <li><strong>Data localization:</strong> 100% hosted on Indian soil</li>
                  <li><strong>Encryption:</strong> AES-256 at rest, TLS 1.3 in transit</li>
                  <li><strong>BIS/MeitY empanelment:</strong> In progress</li>
                </ul>
              </div>

              {/* Customer Voice */}
              <div className="proof-card">
                <div className="proof-card-header">
                  <span className="proof-icon">💬</span>
                  <h3>Customer Voice</h3>
                </div>
                <div className="testimonial">
                  <p className="testimonial-quote">
                    "We migrated from OpenAI to Harikson in 2 days. Our legal team finally approved AI usage."
                  </p>
                  <p className="testimonial-author">— CTO, ₹500Cr Indian NBFC</p>
                </div>
                <div className="testimonial mt-4">
                  <p className="testimonial-quote">
                    "The multi-tenant RLS is bulletproof. Each of our 40 clients thinks they have their own AI."
                  </p>
                  <p className="testimonial-author">— Founder, LegalTech Startup</p>
                </div>
              </div>
            </div>

            <div className="center-action">
              <a href="#founders-contact" className="btn-secondary-light">Read Case Studies →</a>
            </div>
          </div>
        </section>

        {/* ─── HOW IT WORKS SECTION ─── */}
        <section className="section-howitworks" id="how-it-works">
          <div className="content-inner">
            <div className="tag-line tag-purple">DEPLOYMENT FLOW</div>
            <h2 className="section-heading white-text">FROM SIGNUP TO PRODUCTION IN 10 MINUTES</h2>

            <div className="horizontal-timeline">
              <div className="timeline-step">
                <div className="step-num">1</div>
                <h3 className="step-title">Create Account</h3>
                <p className="step-desc">
                  Email + OTP verification. No credit card required for Starter plan. Choose hosting region: Mumbai, Delhi, Bangalore, or Hyderabad.
                </p>
              </div>
              <div className="timeline-step">
                <div className="step-num">2</div>
                <h3 className="step-title">Select Your AI Stack</h3>
                <p className="step-desc">
                  Pick model: Llama3-8B / 70B, Qwen3-8B / 72B. Upload documents for RAG indexing. Configure granular tenant isolation rules.
                </p>
              </div>
              <div className="timeline-step">
                <div className="step-num">3</div>
                <h3 className="step-title">Deploy & Integrate</h3>
                <p className="step-desc">
                  Instantly obtain secure API endpoints. Simply swap your existing OpenAI SDK base_url and start querying. Done.
                </p>
              </div>
            </div>

            <div className="center-action">
              <Link href="/signup" passHref legacyBehavior><a className="btn-primary">Start Step 1 Now →</a></Link>
            </div>
          </div>
        </section>

        {/* ─── PRICING SECTION ─── */}
        <section className="section-pricing" id="pricing">
          <div className="content-inner">
            <div className="tag-line tag-blue">PRICING</div>
            <h2 className="section-heading white-text">PRICING THAT RESPECTS INDIAN BUDGETS</h2>

            <div className="pricing-grid">
              {/* Starter */}
              <div className="price-card">
                <div className="price-plan">FREE</div>
                <h3 className="price-title">STARTER</h3>
                <div className="price-amount">₹0<span className="price-period">/month</span></div>
                <hr className="price-divider" />
                <ul className="price-features">
                  <li>100K free tokens / month</li>
                  <li>Qwen3-8B model access only</li>
                  <li>1 isolated tenant workspace</li>
                  <li>Developer dashboard & API access</li>
                  <li>Community Slack support</li>
                </ul>
                <Link href="/signup" passHref legacyBehavior><a className="price-btn">Start Free</a></Link>
              </div>

              {/* Professional */}
              <div className="price-card highlighted">
                <div className="best-tag">RECOMMENDED</div>
                <div className="price-plan">GROWTH</div>
                <h3 className="price-title">PROFESSIONAL</h3>
                <div className="price-amount">₹4,999<span className="price-period">/month</span></div>
                <hr className="price-divider" />
                <ul className="price-features">
                  <li><strong>5 Million</strong> tokens / month</li>
                  <li>All models (8B, 32B, 72B)</li>
                  <li>Up to 10 isolated tenants</li>
                  <li>API access + webhook logging</li>
                  <li>Priority email & Slack support</li>
                </ul>
                <Link href="/signup" passHref legacyBehavior><a className="price-btn btn-highlighted">Start Pro</a></Link>
              </div>

              {/* Enterprise */}
              <div className="price-card">
                <div className="price-plan">CUSTOM</div>
                <h3 className="price-title">ENTERPRISE</h3>
                <div className="price-amount">Custom Pricing</div>
                <hr className="price-divider" />
                <ul className="price-features">
                  <li>Unlimited tokens & tenants</li>
                  <li>On-premise / air-gapped deployment</li>
                  <li>Custom model fine-tuning</li>
                  <li>Dedicated engineer + strict SLA</li>
                  <li>DPDP compliance audit support</li>
                </ul>
                <a href="#founders-contact" className="price-btn">Contact Sales</a>
              </div>
            </div>

            <p className="pricing-footer-note">
              💡 All plans include: DPDP compliance, India hosting, row-level tenant security, API access, and webhook logging.
            </p>
          </div>
        </section>

        {/* ─── FINAL CTA SECTION ─── */}
        <section className="section-final-cta" id="founders-contact">
          <div className="radial-glow-cta" />
          <div className="content-inner">
            <h2 className="cta-heading">READY TO OWN YOUR AI?</h2>
            <p className="cta-sub">
              Join 200+ Indian enterprises building on sovereign AI.
            </p>

            <div className="cta-buttons">
              <Link href="/signup" passHref legacyBehavior><a className="btn-primary">🚀 Start Free — No Credit Card</a></Link>
              <a href="mailto:founders@harikson.ai" className="btn-secondary">📅 Talk to Founder</a>
            </div>

            <div className="founder-info">
              Questions? <a href="mailto:founders@harikson.ai" className="footer-link">founders@harikson.ai</a> | <span className="tel-text">+91-9876543210</span>
            </div>

            <div className="footer-links-row">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="footer-link">GitHub</a>
              <a href="#developers" className="footer-link">Docs</a>
              <a href="#problem" className="footer-link">Blog</a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="footer-link">LinkedIn</a>
              <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="footer-link">Twitter/X</a>
            </div>

            <div className="footer-copy">
              © 2026 Harikson AI Technologies Pvt. Ltd. <br />
              <span className="sovereign-made">Made in India. For India.</span>
            </div>
          </div>
        </section>

        {/* ─── DETAIL POPUPS / MODALS (Phase 2 Placeholder/Interactive) ─── */}
        {activeCapability && (
          <div className="modal-overlay" onClick={() => setActiveCapability(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3 className="modal-title">{activeCapability.title}</h3>
              <p className="modal-desc">{activeCapability.details}</p>
              <button className="btn-modal-close" onClick={() => setActiveCapability(null)}>Close</button>
            </div>
          </div>
        )}

        {showReport && (
          <div className="modal-overlay" onClick={() => setShowReport(false)}>
            <div className="modal-content text-left" onClick={(e) => e.stopPropagation()}>
              <h3 className="modal-title">🇮🇳 DPDP Compliance Report</h3>
              <div className="report-body" style={{ maxHeight: '300px', overflowY: 'auto', fontSize: '13px', lineHeight: '1.6', color: '#334155' }}>
                <p style={{ marginBottom: '12px' }}><strong>Section 3: Sovereign Cloud Architecture</strong><br />
                All database layers, tenant schemas, and vector chunks reside in local VPC storage inside Indian geographical borders. Zero data leaves for foreign processing nodes.</p>
                <p style={{ marginBottom: '12px' }}><strong>Section 6: Consent Manager & Principal Rights</strong><br />
                Built-in APIs easily export all queries, parameters, and indexes scoped under user-requested identification to comply with legal principal rights requests.</p>
                <p><strong>Section 9: Complete Deletion</strong><br />
                Instant RLS purge triggers guarantee immediate hard deletion of files, models, and embeddings on tenant workspace retirement.</p>
              </div>
              <button className="btn-modal-close" onClick={() => setShowReport(false)}>Close</button>
            </div>
          </div>
        )}

      </div>

      <style jsx>{`
        /* Reset and main wrapper */
        .landing-container {
          font-family: 'Inter', -apple-system, sans-serif;
          color: #334155;
          background: #FFFFFF;
          margin: 0;
          padding: 0;
          overflow-x: hidden;
        }

        /* ─── HERO SECTION ─── */
        .section-hero {
          position: relative;
          min-height: 100vh;
          background: linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 100%);
          display: flex;
          flex-direction: column;
          color: #334155;
          overflow: hidden;
        }
        .radial-glow-hero {
          position: absolute;
          width: 800px;
          height: 800px;
          background: radial-gradient(circle, rgba(79, 140, 255, 0.06) 0%, transparent 70%);
          top: -200px;
          left: -200px;
          pointer-events: none;
        }
        .hero-content-wrapper {
          max-width: 1180px;
          margin: 0 auto;
          padding: 0 24px;
          width: 100%;
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .hero-nav {
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #E2E8F0;
          z-index: 10;
        }
        .logo-section {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .logo-icon {
          font-size: 20px;
        }
        .logo-text {
          font-weight: 800;
          font-size: 16px;
          color: #0F172A;
          letter-spacing: -0.3px;
        }
        .nav-links-desktop {
          display: flex;
          align-items: center;
          gap: 24px;
        }
        .nav-link {
          color: #475569;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          padding: 8px 16px;
          border-radius: 8px;
          transition: all 0.2s ease-in-out;
        }
        .nav-link:hover {
          color: #0F172A;
          background: #F1F5F9;
        }
        .nav-link-btn {
          background: linear-gradient(135deg, #4F8CFF 0%, #3B82F6 100%);
          color: #FFF;
          font-size: 13px;
          font-weight: 700;
          padding: 10px 22px;
          border-radius: 10px;
          text-decoration: none;
          transition: all 0.2s ease-in-out;
          box-shadow: 0 4px 12px rgba(79, 140, 255, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .nav-link-btn:hover {
          background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
          transform: translateY(-1.5px);
          box-shadow: 0 6px 20px rgba(79, 140, 255, 0.35);
        }
        .hamburger-btn {
          display: none;
          flex-direction: column;
          gap: 4px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          z-index: 20;
        }
        .hamburger-btn .bar {
          width: 20px;
          height: 2px;
          background: #0F172A;
          border-radius: 99px;
          transition: all 0.2s;
        }
        .mobile-nav-drawer {
          position: absolute;
          top: 80px;
          left: 0;
          right: 0;
          background: #FFFFFF;
          border-bottom: 1px solid #E2E8F0;
          display: flex;
          flex-direction: column;
          padding: 20px 24px;
          gap: 16px;
          z-index: 90;
          box-shadow: 0 10px 20px rgba(0,0,0,0.05);
        }
        .mobile-nav-link {
          color: #A1A1AA;
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
        }
        .mobile-nav-link.highlighted {
          background: #4F8CFF;
          color: #FFF;
          padding: 10px;
          border-radius: 8px;
          text-align: center;
          font-weight: 700;
        }
        
        .hero-body {
          flex: 1;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          align-items: center;
          gap: 48px;
          padding: 40px 0 80px;
        }
        .sovereign-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(79, 140, 255, 0.08);
          border: 1px solid rgba(79, 140, 255, 0.25);
          color: #4F8CFF;
          font-size: 11px;
          font-weight: 700;
          padding: 6px 14px;
          border-radius: 99px;
          margin-bottom: 24px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .hero-title {
          font-size: 52px;
          font-weight: 900;
          color: #0F172A;
          line-height: 1.1;
          letter-spacing: -2px;
          margin-bottom: 16px;
        }
        .hero-sub {
          font-size: 17px;
          color: #475569;
          line-height: 1.6;
          margin-bottom: 32px;
          max-width: 480px;
        }
        .hero-ctas {
          display: flex;
          gap: 12px;
          margin-bottom: 10px;
        }
        .btn-primary {
          background: #4F8CFF;
          color: #FFF;
          font-size: 14px;
          font-weight: 700;
          padding: 13px 28px;
          border-radius: 12px;
          text-decoration: none;
          transition: all 0.2s ease-in-out;
          box-shadow: 0 4px 14px rgba(79, 140, 255, 0.25);
          border: none;
        }
        .btn-primary:hover {
          transform: translateY(-1.5px);
          background: #3B82F6;
          box-shadow: 0 8px 20px rgba(79, 140, 255, 0.35);
        }
        .btn-secondary {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          color: #0F172A;
          font-size: 14px;
          font-weight: 600;
          padding: 13px 28px;
          border-radius: 12px;
          text-decoration: none;
          transition: all 0.2s ease-in-out;
          box-shadow: 0 2px 6px rgba(0,0,0,0.03);
        }
        .btn-secondary:hover {
          background: #F8FAFC;
          border-color: #CBD5E1;
          transform: translateY(-1px);
        }
        .hero-cta-caption {
          font-size: 12px;
          color: #64748B;
          margin-bottom: 40px;
        }

        /* Trust Partners */
        .trust-partners {
          border-top: 1px solid #E2E8F0;
          padding-top: 24px;
        }
        .trust-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #64748B;
          display: block;
          margin-bottom: 12px;
        }
        .trust-logos-row {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
        }
        .trust-logo {
          font-size: 12px;
          font-weight: 700;
          color: #4F8CFF;
          background: rgba(79, 140, 255, 0.08);
          border: 1px solid rgba(79, 140, 255, 0.15);
          padding: 4px 10px;
          border-radius: 6px;
        }
        .scroll-indicator {
          font-size: 12px;
          color: #64748B;
          margin-top: 40px;
        }

        .hero-right {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }
        .hero-badges-row {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
          max-width: 480px;
        }
        .badge-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
        }
        .badge-icon {
          font-size: 20px;
        }
        .badge-title {
          font-size: 12px;
          font-weight: 700;
          color: #0F172A;
        }
        .badge-desc {
          font-size: 10px;
          color: #64748B;
        }

        /* ─── PROBLEM SECTION ─── */
        .section-problem {
          background: #FFFFFF;
          padding: 100px 0;
          border-bottom: 1px solid #E2E8F0;
        }
        .content-inner {
          max-width: 1180px;
          margin: 0 auto;
          padding: 0 24px;
        }
        .tag-line {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.5px;
          color: #64748B;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .tag-blue { color: #4F8CFF; }
        .tag-purple { color: #8B7FFF; }
        .section-heading {
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -1px;
          margin-bottom: 48px;
          line-height: 1.2;
        }
        .dark-text { color: #0F172A; }
        .white-text { color: #0F172A; }
        .problem-comparison-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 32px;
        }
        .comparison-card {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 32px;
        }
        .card-problem {
          border-left: 4px solid #FF5D73;
        }
        .card-fix {
          border-left: 4px solid #22C55E;
          background: rgba(34, 197, 94, 0.02);
        }
        .comp-title {
          font-size: 18px;
          font-weight: 800;
          margin-bottom: 20px;
        }
        .text-red { color: #FF5D73; }
        .text-emerald { color: #22C55E; }
        .comp-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .comp-list li {
          font-size: 14px;
          color: #334155;
          margin-bottom: 14px;
          line-height: 1.6;
          padding-left: 14px;
          position: relative;
        }
        .comp-list li::before {
          content: "•";
          position: absolute;
          left: 0;
          color: #64748B;
        }
        .center-action {
          display: flex;
          justify-content: center;
          margin-top: 32px;
        }
        .btn-problem-report {
          background: transparent;
          border: 1px solid #E2E8F0;
          color: #334155;
          font-size: 13px;
          font-weight: 600;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-problem-report:hover {
          background: #F8FAFC;
        }

        /* ─── CAPABILITIES SECTION ─── */
        .section-capabilities {
          background: #FFFFFF;
          padding: 100px 0;
          border-bottom: 1px solid #E2E8F0;
        }
        .capabilities-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .cap-card {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 28px;
          display: flex;
          flex-direction: column;
          min-height: 200px;
          transition: transform 0.2s, border-color 0.2s;
        }
        .cap-card:hover {
          transform: translateY(-2px);
          border-color: rgba(79, 140, 255, 0.4);
        }
        .cap-title {
          font-size: 15px;
          font-weight: 700;
          color: #0F172A;
          margin-bottom: 12px;
        }
        .cap-desc {
          font-size: 13px;
          color: #475569;
          line-height: 1.6;
          margin-bottom: 24px;
          flex: 1;
        }
        .cap-link {
          color: #4F8CFF;
          font-size: 13px;
          font-weight: 600;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          text-align: left;
        }
        .cap-link:hover {
          text-decoration: underline;
        }

        /* ─── PROOF SECTION ─── */
        .section-proof {
          background: #FFFFFF;
          padding: 100px 0;
          border-bottom: 1px solid #E2E8F0;
        }
        .proof-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-bottom: 32px;
        }
        .proof-card {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 28px;
        }
        .proof-card-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 18px;
        }
        .proof-icon {
          font-size: 20px;
        }
        .proof-card-header h3 {
          font-size: 16px;
          font-weight: 700;
          color: #0F172A;
        }
        .proof-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .proof-list li {
          font-size: 13px;
          color: #334155;
          margin-bottom: 10px;
          line-height: 1.5;
        }
        .testimonial {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 12px;
        }
        .testimonial-quote {
          font-size: 12px;
          font-style: italic;
          color: #334155;
          line-height: 1.5;
          margin-bottom: 6px;
        }
        .testimonial-author {
          font-size: 11px;
          font-weight: 700;
          color: #64748B;
        }
        .btn-secondary-light {
          background: transparent;
          border: 1px solid #E2E8F0;
          color: #334155;
          font-size: 13px;
          font-weight: 600;
          padding: 12px 24px;
          border-radius: 10px;
          text-decoration: none;
          transition: background 0.2s;
        }
        .btn-secondary-light:hover {
          background: #F8FAFC;
        }

        /* ─── HOW IT WORKS SECTION ─── */
        .section-howitworks {
          background: #F8FAFC;
          padding: 100px 0;
          border-bottom: 1px solid #E2E8F0;
        }
        .horizontal-timeline {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 32px;
          margin-bottom: 48px;
        }
        .timeline-step {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 32px;
          position: relative;
        }
        .step-num {
          position: absolute;
          top: -16px;
          left: 32px;
          width: 32px;
          height: 32px;
          background: #8B7FFF;
          color: #FFF;
          font-weight: 800;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          box-shadow: 0 4px 10px rgba(139, 127, 255, 0.2);
        }
        .step-title {
          font-size: 15px;
          font-weight: 700;
          color: #0F172A;
          margin: 8px 0 12px;
        }
        .step-desc {
          font-size: 13px;
          color: #475569;
          line-height: 1.6;
        }

        /* ─── PRICING SECTION ─── */
        .section-pricing {
          background: #FFFFFF;
          padding: 100px 0;
          border-bottom: 1px solid #E2E8F0;
        }
        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-bottom: 32px;
          align-items: stretch;
        }
        .price-card {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 32px;
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .price-card.highlighted {
          border-color: #4F8CFF;
          box-shadow: 0 0 40px rgba(79, 140, 255, 0.08);
          background: #FFFFFF;
        }
        .best-tag {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background: #4F8CFF;
          color: #FFF;
          font-size: 10px;
          font-weight: 800;
          padding: 4px 12px;
          border-radius: 99px;
          letter-spacing: 0.5px;
        }
        .price-plan {
          font-size: 11px;
          font-weight: 700;
          color: #64748B;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .price-title {
          font-size: 18px;
          font-weight: 800;
          color: #0F172A;
          margin-bottom: 12px;
        }
        .price-amount {
          font-size: 32px;
          font-weight: 900;
          color: #0F172A;
          margin-bottom: 18px;
        }
        .price-period {
          font-size: 13px;
          color: #64748B;
          font-weight: 500;
        }
        .price-divider {
          border: none;
          border-top: 1px solid #E2E8F0;
          margin: 0 0 20px;
        }
        .price-features {
          list-style: none;
          padding: 0;
          margin: 0 0 32px;
          flex: 1;
        }
        .price-features li {
          font-size: 13px;
          color: #334155;
          margin-bottom: 12px;
          padding-left: 18px;
          position: relative;
        }
        .price-features li::before {
          content: "✓";
          position: absolute;
          left: 0;
          color: #22C55E;
          font-weight: bold;
        }
        .price-btn {
          display: block;
          text-align: center;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          color: #0F172A;
          font-weight: 600;
          font-size: 14px;
          padding: 12px;
          border-radius: 10px;
          text-decoration: none;
          transition: background 0.2s;
        }
        .price-btn:hover {
          background: #F8FAFC;
        }
        .price-btn.btn-highlighted {
          background: #4F8CFF;
          border-color: transparent;
          color: #FFF;
        }
        .price-btn.btn-highlighted:hover {
          background: #3B82F6;
        }
        .pricing-footer-note {
          font-size: 13px;
          color: #64748B;
          text-align: center;
          margin-top: 24px;
        }

        /* ─── FINAL CTA SECTION ─── */
        .section-final-cta {
          position: relative;
          background: linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 100%);
          padding: 100px 0;
          color: #334155;
          text-align: center;
          overflow: hidden;
          border-top: 1px solid #E2E8F0;
        }
        .radial-glow-cta {
          position: absolute;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(139, 127, 255, 0.04) 0%, transparent 70%);
          bottom: -100px;
          right: -100px;
          pointer-events: none;
        }
        .cta-heading {
          font-size: 40px;
          font-weight: 900;
          color: #0F172A;
          letter-spacing: -1.5px;
          margin-bottom: 12px;
        }
        .cta-sub {
          font-size: 16px;
          color: #475569;
          margin-bottom: 32px;
        }
        .cta-buttons {
          display: flex;
          justify-content: center;
          gap: 12px;
          margin-bottom: 24px;
        }
        .founder-info {
          font-size: 13px;
          color: #64748B;
          margin-bottom: 48px;
        }
        .tel-text {
          color: #0F172A;
          font-weight: 600;
        }
        .footer-links-row {
          display: flex;
          justify-content: center;
          gap: 28px;
          border-top: 1px solid #E2E8F0;
          padding-top: 32px;
          margin-bottom: 24px;
        }
        .footer-link {
          color: #64748B;
          font-size: 13px;
          text-decoration: none;
          transition: color 0.2s;
        }
        .footer-link:hover {
          color: #0F172A;
        }
        .footer-copy {
          font-size: 12px;
          color: #64748B;
          line-height: 1.8;
        }
        .sovereign-made {
          color: #4F8CFF;
          font-weight: 700;
        }

        /* ─── MODAL OVERLAY ─── */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
        }
        .modal-content {
          background: #FFFFFF;
          border-radius: 16px;
          padding: 32px;
          width: 90%;
          max-width: 480px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          color: #334155;
        }
        .modal-title {
          font-size: 18px;
          font-weight: 800;
          color: #0F172A;
          margin-bottom: 16px;
        }
        .modal-desc {
          font-size: 14px;
          line-height: 1.6;
          color: #334155;
          margin-bottom: 24px;
        }
        .btn-modal-close {
          background: #09090B;
          color: #FFF;
          font-size: 13px;
          font-weight: 600;
          padding: 10px 20px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          width: 100%;
          text-align: center;
        }

        /* Responsive Layout fixes */
        @media (max-width: 1024px) {
          .hero-title {
            font-size: 42px;
          }
          .capabilities-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .pricing-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .pricing-grid > div:last-child {
            grid-column: span 2;
          }
          .proof-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .proof-grid > div:last-child {
            grid-column: span 2;
          }
        }

        @media (max-width: 768px) {
          .nav-links-desktop {
            display: none;
          }
          .hamburger-btn {
            display: flex;
          }
          .hero-body {
            grid-template-columns: 1fr;
            text-align: center;
            padding-bottom: 40px;
            gap: 32px;
          }
          .hero-left {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .hero-title {
            font-size: 34px;
          }
          .hero-ctas {
            justify-content: center;
            width: 100%;
            flex-direction: column;
            gap: 12px;
          }
          .btn-primary, .btn-secondary {
            width: 100%;
            text-align: center;
          }
          .trust-logos-row {
            justify-content: center;
            gap: 12px;
          }
          .problem-comparison-grid,
          .capabilities-grid,
          .proof-grid,
          .horizontal-timeline,
          .pricing-grid {
            grid-template-columns: 1fr !important;
          }
          .pricing-grid > div:last-child,
          .proof-grid > div:last-child {
            grid-column: span 1 !important;
          }
          .timeline-step {
            margin-top: 16px;
          }
          .step-num {
            left: 50%;
            transform: translateX(-50%);
          }
          .cta-buttons {
            flex-direction: column;
            width: 100%;
            max-width: 320px;
            margin: 0 auto 24px;
            gap: 12px;
          }
          .cta-buttons .btn-primary,
          .cta-buttons .btn-secondary {
            width: 100%;
            box-sizing: border-box;
          }
          .section-heading {
            font-size: 26px;
            margin-bottom: 32px;
          }
        }
      `}</style>
    </>
  );
}
