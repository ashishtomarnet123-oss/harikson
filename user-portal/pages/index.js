import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { 
  Cpu, Layers, Database, BrainCircuit, ShieldCheck, Code2, 
  Play, CheckCircle2, XCircle, CreditCard, Download, Shield, 
  Key, Clock, Webhook, Info, Star, Crown, Zap, Lock, Terminal,
  ExternalLink, ArrowRight, RefreshCw, Activity, ChevronDown, HelpCircle,
  MapPin, AlertTriangle, FileText, Settings
} from 'lucide-react';

// ─── CODE EXAMPLES FOR EDITOR ───
const CODE_TEMPLATES = {
  python: `from harikson import AI

client = AI(api_key="hk-free-xxx")
response = client.chat(
    model="harikson-qwen3-8b",
    messages=[{"role": "user", "content": "Explain DPDP in Hindi"}]
)
print(response.choices[0].message.content)`,
  node: `const { HariksonAI } = require('harikson');

const ai = new HariksonAI({ apiKey: 'hk-free-xxx' });
async function run() {
  const res = await ai.chat.completions.create({
    model: 'harikson-qwen3-8b',
    messages: [{ role: 'user', content: 'Explain DPDP in Hindi' }]
  });
  console.log(res.choices[0].message.content);
}
run();`,
  go: `package main

import (
    "context"
    "fmt"
    "github.com/harikson/sdk-go"
)

func main() {
    client := harikson.NewClient("hk-free-xxx")
    res, _ := client.Chat(context.Background(), &harikson.ChatRequest{
        Model: "harikson-qwen3-8b",
        Messages: []harikson.Message{
            {Role: "user", Content: "Explain DPDP in Hindi"},
        },
    })
    fmt.Println(res.Choices[0].Message.Content)
}`,
  curl: `curl https://api.harikson.ai/v1/chat/completions \\
  -H "Authorization: Bearer hk-free-xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "harikson-qwen3-8b",
    "messages": [{"role": "user", "content": "Explain DPDP in Hindi"}]
  }'`
};

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('python');
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  
  // Benchmark tabs
  const [benchmarkFilter, setBenchmarkFilter] = useState('latency'); // latency, cost, throughput
  const [selectedRegion, setSelectedRegion] = useState('mumbai');
  
  // FAQ Collapsible Category and Search
  const [faqCategory, setFaqCategory] = useState('sovereignty');
  const [openFaq, setOpenFaq] = useState(null);
  
  // Interactive Map Region Data
  const [hoveredRegion, setHoveredRegion] = useState(null);

  // View as Code toggle for architecture
  const [viewArchitectureCode, setViewArchitectureCode] = useState(false);
  const [activeArchStep, setActiveArchStep] = useState(0);

  // Typing simulator state
  const [terminalText, setTerminalText] = useState('');
  const [terminalLines, setTerminalLines] = useState([]);
  const terminalCommand = 'harikson deploy --model Qwen3-72B --region mumbai';
  
  // Reduced motion support state
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Respect reduced motion system preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setReducedMotion(true);
    }
  }, []);

  // Terminal Typing Simulation
  useEffect(() => {
    if (!mounted || reducedMotion) {
      setTerminalText(terminalCommand);
      setTerminalLines([
        { text: '✓ Tenant isolation initialized (namespace: neuravolt)', color: '#10B981' },
        { text: '✓ Secured model weights: Qwen3-72B loaded', color: '#10B981' },
        { text: '✓ Indian VPC Gateway: ACTIVE (<12ms)', color: '#10B981' },
        { text: '✓ Compliance verify: DPDP Act 2023 fully met', color: '#10B981' }
      ]);
      return;
    }

    let charIdx = 0;
    let textAccum = '';
    const interval = setInterval(() => {
      if (charIdx < terminalCommand.length) {
        textAccum += terminalCommand[charIdx];
        setTerminalText(textAccum);
        charIdx++;
      } else {
        clearInterval(interval);
        // Stagger output lines
        setTimeout(() => {
          setTerminalLines(prev => [...prev, { text: '✓ Tenant isolation initialized (namespace: neuravolt)', color: '#10B981' }]);
        }, 500);
        setTimeout(() => {
          setTerminalLines(prev => [...prev, { text: '✓ Secured model weights: Qwen3-72B loaded', color: '#10B981' }]);
        }, 1200);
        setTimeout(() => {
          setTerminalLines(prev => [...prev, { text: '✓ Indian VPC Gateway: ACTIVE (<12ms)', color: '#10B981' }]);
        }, 1900);
        setTimeout(() => {
          setTerminalLines(prev => [...prev, { text: '✓ Compliance verify: DPDP Act 2023 fully met', color: '#10B981' }]);
        }, 2600);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [mounted, reducedMotion]);

  const simulateCompile = () => {
    setIsRunning(true);
    setHasRun(false);
    setTimeout(() => {
      setIsRunning(false);
      setHasRun(true);
    }, 1200);
  };

  const mapRegions = {
    mumbai: { name: 'Mumbai (MH-1)', status: 'Active', latency: '12ms', gpus: '512 H100', cost: '₹0.001/token' },
    delhi: { name: 'Delhi NCR (DL-2)', status: 'Active', latency: '18ms', gpus: '256 H100', cost: '₹0.001/token' },
    bangalore: { name: 'Bangalore (KA-1)', status: 'Active', latency: '8ms', gpus: '384 H100', cost: '₹0.001/token' },
    hyderabad: { name: 'Hyderabad (TG-3)', status: 'Active', latency: '14ms', gpus: '256 H100', cost: '₹0.001/token' }
  };

  // FAQ Array (30 Questions)
  const faqData = {
    sovereignty: [
      { q: "Is my data ever stored outside India?", a: "No. All servers, caches, backup snapshots, and metadata database tables are strictly located in tier-4 Indian data centers. We guarantee 100% data residency under strict sovereign networks." },
      { q: "What happens to my data if I cancel?", a: "Your tenant partition is completely purged. We follow a military-grade zero-residual overwrite protocol. Your backups, vector embeddings, and logs are deleted within 72 hours of cancellation." },
      { q: "Can I request complete data deletion under DPDP?", a: "Yes. Harikson AI provides automated tools for Data Principal rights. You can trigger a complete erasure of personal data via API or admin panel in compliance with the DPDP Act 2023." },
      { q: "Do you support data principal rights requests?", a: "Yes, we provide automated workflows to retrieve, modify, or erase user data histories, allowing compliance teams to easily respond to individual audits." },
      { q: "Is my vector database isolated from other customers?", a: "Absolutely. Every workspace uses logical schema isolation and per-tenant cryptographic namespaces. Customer data never mingles or co-indexes in any scenario." }
    ],
    compliance: [
      { q: "Are you DPDP Act 2023 compliant?", a: "Yes. The entire platform architecture is DPDP-compliant by design, supporting localized consent management, immutable logs, and automated privacy audits." },
      { q: "When will ISO 27001 certification be complete?", a: "Our official ISO 27001 certification audit is fully scheduled for Q3 2026. We are currently implementing and testing the corresponding security controls." },
      { q: "Do you support BIS/MeitY empanelment requirements?", a: "Yes, our BIS validation is active, and our MeitY cloud service provider empanelment is currently in progress, expected to conclude in Q3 2026." },
      { q: "Can you sign a Data Processing Agreement?", a: "Yes. We offer standard DPDP-compliant DPAs tailored for Indian banks, healthcare systems, and government departments." },
      { q: "Are you prepared for SOC 2 Type II audit?", a: "We are in the preparation stage, with all automated evidence collection systems active. The official SOC 2 audit period commences in Q4 2026." }
    ],
    security: [
      { q: "What encryption standards do you use?", a: "We enforce AES-256-GCM encryption for all data at rest and secure TLS 1.3 tunnels for all data in transit. Password hashes are salted using robust bcrypt mechanisms." },
      { q: "Can I use my own encryption keys?", a: "Yes, our Enterprise tier supports Customer-Managed Encryption Keys (CMEK) via key managers in local clouds or HSMs." },
      { q: "How is tenant isolation enforced?", a: "We enforce rigid row-level security (RLS) policies at the database layer and isolate tenant namespaces at the gateway router. Request tokens are verified at every processing tier." },
      { q: "Do you support SSO/SAML/SCIM?", a: "Yes. Harikson supports SAML 2.0, OpenID Connect (OIDC), and enterprise directory integration (AD FS, Okta, Azure AD)." },
      { q: "What is your disaster recovery RPO/RTO?", a: "Our default configuration guarantees a Recovery Point Objective (RPO) of 4 hours and a Recovery Time Objective (RTO) of 24 hours via cross-region replication." }
    ],
    technical: [
      { q: "Which models do you support?", a: "We support Qwen3 (8B, 32B, 72B), Llama 3 (8B, 70B), Mistral-Large, and DeepSeek-V3 out of the box." },
      { q: "Can I bring my own fine-tuned model?", a: "Yes. You can upload custom model weights in safetensors or GGUF formats directly to your private cluster via our Model Builder tool." },
      { q: "Is your API fully compatible with OpenAI?", a: "Yes. Our endpoints map identically to OpenAI. You only need to swap the `base_url` parameter in your existing SDK scripts." },
      { q: "Do you support function calling and streaming?", a: "Yes, we support native JSON function calling, server-sent events (SSE) streaming, and structured schema validations." },
      { q: "What is the maximum context window?", a: "We support up to a 128K context window, depending on the model and hardware configuration selected for your cluster." }
    ],
    deployment: [
      { q: "Can you deploy on-premise or air-gapped?", a: "Yes, we offer fully air-gapped container distributions for high-security environments, financial institutions, and government infrastructure." },
      { q: "How long does deployment take?", a: "Cloud instances spin up in under 10 minutes. Custom VPC or on-premises server provisioning takes 2-3 business days." },
      { q: "Do you support Kubernetes and Docker?", a: "Yes. The control plane and model routers are packaged as standard Helm charts and Docker containers." },
      { q: "Can I deploy in my own AWS/Azure/GCP account?", a: "Yes. Our Terraform modules deploy securely inside your private cloud account, ensuring total infrastructure control." },
      { q: "What regions are available?", a: "Active regions are Mumbai, Delhi (NCR), Bangalore, and Hyderabad. You can select your region during tenant setup." }
    ],
    pricing: [
      { q: "How does token pricing work after limits?", a: "For our Professional plan, additional tokens are billed at a flat rate of ₹0.001 per token, billed monthly in INR." },
      { q: "Can I get invoicing instead of credit card?", a: "Yes, our Pro, Business, and Enterprise plans offer direct bank transfer (NEFT/RTGS) invoicing options." },
      { q: "Is there a minimum contract for Enterprise?", a: "Enterprise plans support monthly or annual terms, with substantial discounts offered on annual contracts." },
      { q: "Do you offer government pricing?", a: "Yes. We offer special sovereign discounts for Indian public sector units, educational labs, and state departments." },
      { q: "What happens if I exceed my token limit?", a: "We do not hard-block your access. If you exceed the plan limits, additional tokens are calculated on a pay-as-you-go basis in the next billing cycle." }
    ]
  };

  return (
    <>
      <Head>
        <title>Harikson AI — Sovereign AI Infrastructure for India</title>
        <meta name="description" content="Deploy private LLMs, AI agents, and RAG systems inside India. DPDP-compliant, OpenAI-compatible API. 100% data residency. Start free with 100K tokens." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href="https://harikson.ai" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://harikson.ai" />
        <meta property="og:title" content="Harikson AI — Sovereign AI Platform" />
        <meta property="og:description" content="Private LLMs, RAG, and AI agents. 100% India-hosted. DPDP-compliant." />
        <meta property="og:image" content="https://harikson.ai/og-image.jpg" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://harikson.ai" />
        <meta property="twitter:title" content="Harikson AI — Sovereign AI Platform" />
        <meta property="twitter:description" content="Private LLMs, RAG, and AI agents. 100% India-hosted. DPDP-compliant." />
        <meta property="twitter:image" content="https://harikson.ai/og-image.jpg" />

        {/* Structured Schema.org Markup */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Harikson AI",
              "applicationCategory": "AI Infrastructure Application",
              "operatingSystem": "Linux, Kubernetes, On-Premise",
              "description": "Sovereign enterprise AI infrastructure for private LLM deployment, multi-tenant workspace routing, and RAG architecture.",
              "offers": {
                "@type": "Offer",
                "price": "0.00",
                "priceCurrency": "INR"
              }
            })
          }}
        />
        
        {/* FAQ Page Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": Object.values(faqData).flat().map(item => ({
                "@type": "Question",
                "name": item.q,
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": item.a
                }
              }))
            })
          }}
        />
      </Head>

      <div className="landing-container">
        
        {/* ─── HEADER / NAVIGATION ─── */}
        <header className="hero-nav">
          <div className="logo-section">
            <span className="logo-icon">⚡</span>
            <span className="logo-text">Harikson AI</span>
          </div>
          <div className="nav-links-desktop">
            <a href="#scale" className="nav-link">Scale</a>
            <a href="#how-it-works" className="nav-link">Architecture</a>
            <a href="#features" className="nav-link">Features</a>
            <a href="#developer" className="nav-link">Developers</a>
            <a href="#security" className="nav-link">Security</a>
            <a href="#pricing" className="nav-link">Pricing</a>
            <Link href="/login" passHref legacyBehavior><a className="nav-link">Sign In</a></Link>
            <Link href="/signup" passHref legacyBehavior><a className="nav-link-btn">Start Free</a></Link>
          </div>
        </header>

        {/* ─── PROMPT 1: HERO SECTION ─── */}
        <section className="section-hero">
          <div className="mesh-gradient" />
          <div className="hero-grid">
            
            <div className="hero-left">
              {/* Trust Pills */}
              <div className="trust-pills-row">
                <span className="trust-pill">99.99% Uptime</span>
                <span className="trust-pill">&lt;150ms Latency</span>
                <span className="trust-pill">22+ Languages</span>
                <span className="trust-pill">100% India Residency</span>
              </div>
              
              <h1 className="hero-title">
                Deploy Private AI That Never Leaves India
              </h1>
              <p className="hero-sub">
                Run Qwen3, Llama, and Mistral inside your VPC. DPDP-compliant. OpenAI-compatible API. Priced in INR.
              </p>

              <div className="hero-ctas">
                <Link href="/signup" passHref legacyBehavior>
                  <a className="btn-hero-primary">Start Free — 100K Tokens</a>
                </Link>
                <a href="#developer" className="btn-hero-secondary">
                  <Play size={14} style={{ fill: 'currentColor' }} /> Watch Demo
                </a>
              </div>
            </div>

            <div className="hero-right">
              {/* 3D-tilted browser mockup */}
              <div className="mockup-perspective">
                <div className="mockup-browser">
                  <div className="browser-title-bar">
                    <span className="mock-dot red" />
                    <span className="mock-dot yellow" />
                    <span className="mock-dot green" />
                    <span className="browser-url">harikson.ai/dashboard</span>
                  </div>
                  <div className="browser-content-grid">
                    <aside className="browser-sidebar">
                      <div className="side-logo">⚡ Harikson</div>
                      <div className="side-item active"><Cpu size={12} /> Workspaces</div>
                      <div className="side-item"><Layers size={12} /> Model Router</div>
                      <div className="side-item"><Database size={12} /> Vector RAG</div>
                    </aside>
                    <main className="browser-chat-pane">
                      <header className="chat-header">
                        <div className="model-selector">harikson-qwen3-72b</div>
                        <span className="badge-active">ACTIVE</span>
                      </header>
                      <div className="chat-messages font-sans">
                        <div className="msg user">Explain DPDP Act in regional languages.</div>
                        <div className="msg assistant">
                          भारतीय नागरिकों के डेटा की सुरक्षा सुनिश्चित करने के लिए <strong>DPDP Act 2023</strong> को लागू किया गया है। यह डेटा स्थानीयकरण को बढ़ावा देता है...
                        </div>
                      </div>
                    </main>
                  </div>
                </div>

                {/* Animated Terminal */}
                <div className="mockup-terminal font-mono">
                  <div className="terminal-header">
                    <span className="term-dot" />
                    <span className="terminal-tab">Sovereign API</span>
                  </div>
                  <div className="terminal-body">
                    <div className="terminal-input">
                      <span className="prompt">$</span> {terminalText}
                      <span className="cursor">_</span>
                    </div>
                    {terminalLines.map((line, idx) => (
                      <div key={idx} className="terminal-row" style={{ color: line.color }}>
                        {line.text}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Floating Badges */}
                <div className="floating-badge badge-dpdp">DPDP Ready</div>
                <div className="floating-badge badge-price">₹0.001/token</div>
                <div className="floating-badge badge-region">Mumbai Region</div>
              </div>
            </div>

          </div>

          {/* Infinite Scrolling Logo Bar */}
          <div className="infinite-logo-wrap">
            <div className="logo-track">
              <span>IIT Bombay</span>
              <span>ISRO</span>
              <span>NIC</span>
              <span>State Bank</span>
              <span>Ministry of IT</span>
              {/* Duplicate track for seamless infinite scroll */}
              <span>IIT Bombay</span>
              <span>ISRO</span>
              <span>NIC</span>
              <span>State Bank</span>
              <span>Ministry of IT</span>
            </div>
          </div>
        </section>

        {/* ─── PROMPT 2: ENTERPRISE TRUST SECTION ─── */}
        <section className="section-scale" id="scale">
          <div className="content-inner">
            <div className="section-header text-center">
              <h2 className="title-scale">Built for Indian Scale</h2>
              <p className="sub-scale">From IIT Bombay research labs to ISRO mission control. Infrastructure that powers India's most critical systems.</p>
            </div>

            {/* Metrics Dashboard */}
            <div className="metrics-grid">
              <div className="metric-card card-glass">
                <div className="metric-val">50,000+</div>
                <div className="metric-label">Concurrent Users Per Cluster</div>
              </div>
              <div className="metric-card card-glass">
                <div className="metric-val">&lt;150ms</div>
                <div className="metric-label">P99 Token Latency</div>
                <div className="sparkline-wrapper">
                  <svg viewBox="0 0 100 30" className="sparkline">
                    <path d="M 0 25 Q 10 15 20 22 T 40 10 T 60 18 T 80 5 T 100 12" fill="none" stroke="#6366f1" strokeWidth="2.5" />
                  </svg>
                </div>
              </div>
              <div className="metric-card card-glass">
                <div className="metric-val">99.99%</div>
                <div className="metric-label">Enterprise Uptime SLA</div>
                <span className="pulse-green" />
              </div>
              <div className="metric-card card-glass">
                <div className="metric-val">₹0.001</div>
                <div className="metric-label">Per Token After Free Tier</div>
              </div>
            </div>

            {/* Customer Logos with use-case tooltips */}
            <div className="customer-logos-row">
              <div className="logo-item" data-tooltip="Deploying private LLMs for scientific report summarization">IIT Bombay</div>
              <div className="logo-item" data-tooltip="Hosting sovereign chat interfaces for launch checklists">ISRO</div>
              <div className="logo-item" data-tooltip="Empowering state departments with isolated document routers">NIC</div>
              <div className="logo-item" data-tooltip="Enforcing localized context analysis on security policies">Ministry of IT</div>
              <div className="logo-item" data-tooltip="Hosting on-premise models for secure transaction analysis">State Bank of India</div>
              <div className="logo-item" data-tooltip="Running row-isolated legal precedence lookups">LexAI Solutions</div>
              <div className="logo-item" data-tooltip="Powering localized customer support dialer agents">Indian NBFC</div>
              <div className="logo-item" data-tooltip="Structuring regional clinical record insights">Health Network</div>
            </div>

            {/* Deployment Map */}
            <div className="deployment-map-container">
              <div className="map-grid">
                <div className="map-visual">
                  <svg viewBox="0 0 400 450" className="india-map-svg">
                    <path d="M120,400 L90,360 L80,300 L70,240 L100,200 L95,140 L130,80 L180,50 L200,80 L230,120 L280,180 L290,240 L260,300 L200,380 Z" fill="#111827" stroke="#334155" strokeWidth="2" />
                    {/* Active Region Dots */}
                    <g className="map-dot-group" onMouseEnter={() => setHoveredRegion('mumbai')} onMouseLeave={() => setHoveredRegion(null)}>
                      <circle cx="120" cy="270" r="7" className="map-dot-pulse" />
                      <circle cx="120" cy="270" r="4" className="map-dot" />
                    </g>
                    <g className="map-dot-group" onMouseEnter={() => setHoveredRegion('delhi')} onMouseLeave={() => setHoveredRegion(null)}>
                      <circle cx="160" cy="140" r="7" className="map-dot-pulse" />
                      <circle cx="160" cy="140" r="4" className="map-dot" />
                    </g>
                    <g className="map-dot-group" onMouseEnter={() => setHoveredRegion('bangalore')} onMouseLeave={() => setHoveredRegion(null)}>
                      <circle cx="150" cy="360" r="7" className="map-dot-pulse" />
                      <circle cx="150" cy="360" r="4" className="map-dot" />
                    </g>
                    <g className="map-dot-group" onMouseEnter={() => setHoveredRegion('hyderabad')} onMouseLeave={() => setHoveredRegion(null)}>
                      <circle cx="180" cy="310" r="7" className="map-dot-pulse" />
                      <circle cx="180" cy="310" r="4" className="map-dot" />
                    </g>
                  </svg>
                  
                  {/* Interactive Popover */}
                  {hoveredRegion && (
                    <div className="map-popover">
                      <div className="pop-title">{mapRegions[hoveredRegion].name}</div>
                      <div>Status: <span className="text-success">{mapRegions[hoveredRegion].status}</span></div>
                      <div>Latency: {mapRegions[hoveredRegion].latency}</div>
                      <div>GPUs: {mapRegions[hoveredRegion].gpus}</div>
                      <div>Cost: {mapRegions[hoveredRegion].cost}</div>
                    </div>
                  )}
                </div>

                <div className="map-info flex flex-col justify-center">
                  <h3>Sovereign Local Regions</h3>
                  <p>Our clusters run inside certified tier-4 facilities in key metropolitan networks, bringing high-speed GPU power closer to your local services.</p>
                  <ul className="region-list">
                    <li><span className="dot active" /> Mumbai Region</li>
                    <li><span className="dot active" /> Delhi (NCR) Region</li>
                    <li><span className="dot active" /> Bangalore Region</li>
                    <li><span className="dot active" /> Hyderabad Region</li>
                  </ul>
                  <div>
                    <button className="btn-ghost" onClick={() => alert('Request logged. Our solutions team will reach out shortly.')}>Request New Region</button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ─── PROMPT 3: PRODUCT ARCHITECTURE ─── */}
        <section className="section-howitworks" id="how-it-works">
          <div className="content-inner">
            <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
              <div>
                <span className="tag-line tag-purple">HOW IT WORKS</span>
                <h2 className="section-heading white-text">Your Data. Your Models. Your Infrastructure.</h2>
              </div>
              <button 
                className="btn-ghost" 
                onClick={() => setViewArchitectureCode(!viewArchitectureCode)}
              >
                {viewArchitectureCode ? 'View Visual Diagram' : 'View as Code (Terraform)'}
              </button>
            </div>

            {viewArchitectureCode ? (
              <div className="code-editor-wrapper text-left font-mono">
                <div className="editor-header">
                  <span className="editor-tab">harikson_cluster.tf</span>
                </div>
                <pre className="p-6 text-xs leading-relaxed text-indigo-200 overflow-x-auto">
{`module "harikson_cluster" {
  source       = "harikson/sovereign-cluster/aws"
  version      = "1.2.0"
  
  region       = "ap-south-1" # Mumbai Region
  vpc_id       = var.vpc_id
  subnet_ids   = var.private_subnets
  
  model_deployments = [
    { model = "harikson-qwen3-72b", instances = 4 },
    { model = "harikson-llama3-70b", instances = 2 }
  ]
  
  data_residency_country = "IN"
  tenant_isolation        = "row-level-cryptographic"
  dpdp_audit_enabled     = true
}`}
                </pre>
              </div>
            ) : (
              <div className="arch-flow-grid">
                <div className="arch-steps-nav">
                  <div className={`arch-step-item ${activeArchStep === 0 ? 'active' : ''}`} onClick={() => setActiveArchStep(0)}>
                    <span className="num">1</span> Ingest
                  </div>
                  <div className={`arch-step-item ${activeArchStep === 1 ? 'active' : ''}`} onClick={() => setActiveArchStep(1)}>
                    <span className="num">2</span> Route
                  </div>
                  <div className={`arch-step-item ${activeArchStep === 2 ? 'active' : ''}`} onClick={() => setActiveArchStep(2)}>
                    <span className="num">3</span> Process
                  </div>
                  <div className={`arch-step-item ${activeArchStep === 3 ? 'active' : ''}`} onClick={() => setActiveArchStep(3)}>
                    <span className="num">4</span> Retrieve
                  </div>
                  <div className={`arch-step-item ${activeArchStep === 4 ? 'active' : ''}`} onClick={() => setActiveArchStep(4)}>
                    <span className="num">5</span> Deliver
                  </div>
                </div>

                <div className="arch-visual-card card-glass">
                  {activeArchStep === 0 && (
                    <div className="step-content">
                      <h4>STEP 1 — INGEST</h4>
                      <p className="text-secondary mb-4">Upload 50,000 documents. Auto-chunk. Auto-embed.</p>
                      <div className="svg-container">
                        <svg viewBox="0 0 200 100" className="w-full max-w-[240px] mx-auto">
                          <rect x="10" y="10" width="30" height="40" rx="4" fill="#1e293b" stroke="#6366f1" strokeWidth="1.5" />
                          <rect x="50" y="15" width="30" height="40" rx="4" fill="#1e293b" stroke="#6366f1" strokeWidth="1.5" />
                          <rect x="90" y="10" width="30" height="40" rx="4" fill="#1e293b" stroke="#6366f1" strokeWidth="1.5" />
                          <path d="M 130 30 L 170 30" stroke="#10b981" strokeWidth="2" strokeDasharray="4 4" />
                          <circle cx="175" cy="30" r="10" fill="#10b981" />
                        </svg>
                      </div>
                    </div>
                  )}
                  {activeArchStep === 1 && (
                    <div className="step-content">
                      <h4>STEP 2 — ROUTE</h4>
                      <p className="text-secondary mb-4">AI Gateway routes to the optimal model based on cost, latency, or quality specs.</p>
                      <div className="svg-container">
                        <svg viewBox="0 0 200 100" className="w-full max-w-[240px] mx-auto">
                          <circle cx="30" cy="50" r="15" fill="#1e293b" stroke="#6366f1" strokeWidth="1.5" />
                          <path d="M 45 50 L 100 20" stroke="#6366f1" strokeWidth="2" />
                          <path d="M 45 50 L 100 50" stroke="#6366f1" strokeWidth="2" />
                          <path d="M 45 50 L 100 80" stroke="#6366f1" strokeWidth="2" />
                          <rect x="105" y="10" width="60" height="20" rx="4" fill="#1e293b" stroke="#334155" />
                          <rect x="105" y="40" width="60" height="20" rx="4" fill="#10b981" stroke="#10b981" />
                          <rect x="105" y="70" width="60" height="20" rx="4" fill="#1e293b" stroke="#334155" />
                        </svg>
                      </div>
                    </div>
                  )}
                  {activeArchStep === 2 && (
                    <div className="step-content">
                      <h4>STEP 3 — PROCESS</h4>
                      <p className="text-secondary mb-4">Run any open model (Qwen3-72B, Llama-3-70B, Mistral-Large, DeepSeek-V3). Or bring your own weights.</p>
                      <div className="svg-container">
                        <svg viewBox="0 0 200 100" className="w-full max-w-[240px] mx-auto">
                          <circle cx="50" cy="50" r="25" fill="#1e293b" stroke="#10b981" strokeWidth="2" />
                          <circle cx="150" cy="50" r="25" fill="#1e293b" stroke="#334155" strokeWidth="1" />
                          <path d="M 75 50 L 125 50" stroke="#10b981" strokeWidth="2" strokeDasharray="4" />
                        </svg>
                      </div>
                    </div>
                  )}
                  {activeArchStep === 3 && (
                    <div className="step-content">
                      <h4>STEP 4 — RETRIEVE</h4>
                      <p className="text-secondary mb-4">RAG retrieves context securely from your private database.</p>
                      <div className="svg-container">
                        <svg viewBox="0 0 200 100" className="w-full max-w-[240px] mx-auto">
                          <rect x="20" y="20" width="40" height="60" rx="6" fill="#1e293b" stroke="#6366f1" strokeWidth="1.5" />
                          <path d="M 60 50 L 140 50" stroke="#10b981" strokeWidth="2.5" />
                          <circle cx="160" cy="50" r="18" fill="#10b981" />
                        </svg>
                      </div>
                    </div>
                  )}
                  {activeArchStep === 4 && (
                    <div className="step-content">
                      <h4>STEP 5 — DELIVER</h4>
                      <p className="text-secondary mb-4">OpenAI-compatible response returned directly with full verifiable source attributions.</p>
                      <div className="svg-container">
                        <svg viewBox="0 0 200 100" className="w-full max-w-[240px] mx-auto">
                          <path d="M 20 50 L 140 50" stroke="#10b981" strokeWidth="2" />
                          <rect x="145" y="35" width="45" height="30" rx="4" fill="#111827" stroke="#10b981" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ─── PROMPT 4: FEATURE SECTION ─── */}
        <section className="section-features" id="features">
          <div className="content-inner">
            <div className="section-header text-center">
              <span className="tag-line tag-blue">BUSINESS OUTCOMES</span>
              <h2 className="title-scale text-white">Why Harikson AI?</h2>
              <p className="sub-scale">Enterprise infrastructure that answers your compliance and cost targets before you deploy.</p>
            </div>

            <div className="features-grid-custom">
              {/* Card 1 */}
              <div className="feat-card border-glow-indigo">
                <div className="feat-icon text-indigo-500"><Code2 size={24} /></div>
                <h4>Go live in 10 minutes, not 10 weeks.</h4>
                <p>Migrate from OpenAI with one line of code. Our API is fully compatible.</p>
                <div className="feat-tech">base_url = "https://api.harikson.ai/v1"</div>
                <a href="#developer" className="feat-link">Learn more →</a>
              </div>

              {/* Card 2 */}
              <div className="feat-card border-glow-emerald">
                <div className="feat-icon text-emerald-500"><ShieldCheck size={24} /></div>
                <h4>Your data never crosses a border.</h4>
                <p>100% hosted in India. DPDP-compliant by default. Zero data residency risk.</p>
                <div className="feat-tech">Mumbai · Delhi · Bangalore · Hyderabad</div>
                <a href="#security" className="feat-link">Learn more →</a>
              </div>

              {/* Card 3 */}
              <div className="feat-card border-glow-amber">
                <div className="feat-icon text-amber-500"><CreditCard size={24} /></div>
                <h4>Cut AI spend by 60%.</h4>
                <p>Priced in INR. No dollar volatility. No hidden egress fees.</p>
                <div className="feat-tech">₹0.001 / token · ₹4,999 / month Pro</div>
                <a href="#pricing" className="feat-link">Learn more →</a>
              </div>

              {/* Card 4 */}
              <div className="feat-card border-glow-pink">
                <div className="feat-icon text-pink-500"><Layers size={24} /></div>
                <h4>One platform. Hundreds of teams. Zero leakage.</h4>
                <p>Row-level tenant isolation. Per-team billing. Custom models per workspace.</p>
                <div className="feat-tech">Multi-tenant · RBAC · SSO</div>
                <a href="#security" className="feat-link">Learn more →</a>
              </div>

              {/* Card 5 */}
              <div className="feat-card border-glow-purple">
                <div className="feat-icon text-purple-500"><Shield size={24} /></div>
                <h4>Compliance that audits itself.</h4>
                <p>DPDP-ready audit trails. Data principal rights. Automated compliance reports.</p>
                <div className="feat-tech">SOC2 Prep · ISO 27001 · DPDP 2023</div>
                <a href="#security" className="feat-link">Learn more →</a>
              </div>

              {/* Card 6 */}
              <div className="feat-card border-glow-cyan">
                <div className="feat-icon text-cyan-500"><BrainCircuit size={24} /></div>
                <h4>22 Indian languages. Native fluency.</h4>
                <p>Hindi, Tamil, Kannada, Marathi, Telugu, Bengali. Not translated. Truly understood.</p>
                <div className="feat-tech">Fine-tuned on Indic corpus</div>
                <a href="#how-it-works" className="feat-link">Learn more →</a>
              </div>
            </div>

          </div>
        </section>

        {/* ─── PROMPT 5: DEVELOPER EXPERIENCE (DX) ─── */}
        <section className="section-dx" id="developer">
          <div className="content-inner">
            <div className="section-header text-center">
              <span className="tag-line tag-purple">DEVELOPER EXPERIENCE</span>
              <h2 className="title-scale text-white">Try it in 30 seconds</h2>
            </div>

            <div className="dx-split-grid">
              {/* Left Panel: Code Editor */}
              <div className="dx-panel code-panel text-left font-mono">
                <div className="panel-tabs">
                  <button className={`tab-btn ${activeTab === 'python' ? 'active' : ''}`} onClick={() => { setActiveTab('python'); setHasRun(false); }}>Python</button>
                  <button className={`tab-btn ${activeTab === 'node' ? 'active' : ''}`} onClick={() => { setActiveTab('node'); setHasRun(false); }}>Node.js</button>
                  <button className={`tab-btn ${activeTab === 'go' ? 'active' : ''}`} onClick={() => { setActiveTab('go'); setHasRun(false); }}>Go</button>
                  <button className={`tab-btn ${activeTab === 'curl' ? 'active' : ''}`} onClick={() => { setActiveTab('curl'); setHasRun(false); }}>cURL</button>
                </div>
                <div className="code-editor-body">
                  <pre className="code-content">
                    {CODE_TEMPLATES[activeTab]}
                  </pre>
                </div>
                <div className="panel-footer">
                  <button className="btn-run" onClick={simulateCompile} disabled={isRunning}>
                    {isRunning ? 'Running...' : 'Run Code'}
                  </button>
                </div>
              </div>

              {/* Right Panel: Output Simulator */}
              <div className="dx-panel output-panel text-left">
                <div className="panel-header">
                  <span className="title">Terminal Output</span>
                  <span className="pulse-dot green" />
                </div>
                <div className="panel-body font-mono">
                  {isRunning && (
                    <div className="text-gray-400 animate-pulse">
                      Sending request to api.harikson.ai...
                    </div>
                  )}
                  {hasRun && !isRunning && (
                    <div className="output-content">
                      <div className="output-response text-emerald-400">
                        {`{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "डिजिटल व्यक्तिगत डेटा संरक्षण अधिनियम (DPDP Act) 2023 भारत में व्यक्तिगत डेटा के प्रसंस्करण को विनियमित करता है। यह नागरिकों (डेटा प्रिंसिपल) के अधिकारों की रक्षा करता है..."
    }
  }],
  "usage": {
    "prompt_tokens": 12,
    "completion_tokens": 156,
    "total_tokens": 168
  }
}`}
                      </div>
                      <div className="output-meta border-t border-gray-800 mt-4 pt-3 text-xs text-gray-400 grid grid-cols-2 gap-2">
                        <div>Latency: <span className="text-indigo-400">142ms</span></div>
                        <div>Cost: <span className="text-indigo-400">₹0.000168</span></div>
                        <div>Region: <span className="text-indigo-400">Mumbai-1</span></div>
                        <div>Status: <span className="text-emerald-400">200 OK</span></div>
                      </div>
                    </div>
                  )}
                  {!isRunning && !hasRun && (
                    <div className="text-gray-500 italic text-center py-12">
                      Click "Run Code" to compile request and inspect live token cost, response payload, and routing telemetry.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Integration snippet row */}
            <div className="integration-row grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 text-left">
              <div className="integ-card font-mono">
                <div className="text-[10px] text-gray-500 font-bold uppercase">Python SDK</div>
                <div className="text-xs text-indigo-400 mt-1">pip install harikson</div>
              </div>
              <div className="integ-card font-mono">
                <div className="text-[10px] text-gray-500 font-bold uppercase">Node SDK</div>
                <div className="text-xs text-indigo-400 mt-1">npm install harikson</div>
              </div>
              <div className="integ-card font-mono">
                <div className="text-[10px] text-gray-500 font-bold uppercase">CLI CLI</div>
                <div className="text-xs text-indigo-400 mt-1">harikson deploy --model qwen3</div>
              </div>
              <div className="integ-card font-mono">
                <div className="text-[10px] text-gray-500 font-bold uppercase">Docker pull</div>
                <div className="text-xs text-indigo-400 mt-1">docker pull harikson/ai-gateway</div>
              </div>
            </div>
            
            <div className="mt-8 text-center text-xs text-gray-500 flex justify-center items-center gap-2">
              <span className="green-status-dot pulse" /> OpenAI SDK compatible — Change only base_url. Status: All systems operational.
            </div>

          </div>
        </section>

        {/* ─── PROMPT 6: SECURITY & COMPLIANCE ─── */}
        <section className="section-security" id="security">
          <div className="content-inner">
            <div className="section-header text-center">
              <span className="tag-line tag-blue">ZERO TRUST BY DEFAULT</span>
              <h2 className="title-scale text-white">Security is not a feature. It is the foundation.</h2>
              <p className="sub-scale">DPDP-ready architecture. Zero-trust by default. Indian sovereignty guaranteed.</p>
            </div>

            <div className="security-grid">
              {/* Col 1: Compliance Badges */}
              <div className="sec-col flex flex-col gap-4 text-left">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Compliance Status</span>
                <div className="compliance-card">
                  <div className="badge-title"><CheckCircle2 size={16} className="text-emerald-500" /> DPDP Act 2023</div>
                  <p>Fully compliant database namespaces, cookie consent routers, and personal data audit trail managers.</p>
                </div>
                <div className="compliance-card">
                  <div className="badge-title"><CheckCircle2 size={16} className="text-emerald-500" /> BIS Certified</div>
                  <p>Valid certification matching Indian standard specifications for control hardware.</p>
                </div>
                <div className="compliance-card alert">
                  <div className="badge-title"><AlertTriangle size={16} className="text-amber-500" /> MeitY Empanelment</div>
                  <p> Empanelment process actively in progress. Projected completion: Q3 2026.</p>
                </div>
                <div className="compliance-card alert">
                  <div className="badge-title"><AlertTriangle size={16} className="text-amber-500" /> ISO 27001 / SOC 2</div>
                  <p>Controls implemented. Official security audits scheduled for Q3-Q4 2026.</p>
                </div>
              </div>

              {/* Col 2: Security Features */}
              <div className="sec-col text-left">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Security Features</span>
                <ul className="sec-features-list mt-4">
                  <li><strong>AES-256 / TLS 1.3:</strong> Strong encryption enforcement for data at rest and transit.</li>
                  <li><strong>VPC Isolation:</strong> Completely dedicated VPC partition for every corporate client workspace.</li>
                  <li><strong>Tenant Isolation:</strong> Strict row-level isolation policies enforced at the postgres database tier.</li>
                  <li><strong>Customer-Managed Keys:</strong> Options to host keys inside private Cloud HSMS.</li>
                  <li><strong>RBAC &amp; SSO:</strong> Enterprise logins integrated via SAML, SCIM, Okta, or Active Directory.</li>
                  <li><strong>Audit Logging:</strong> Write-once logs track model configuration updates and admin permissions.</li>
                </ul>
              </div>

              {/* Col 3: SVG Flow Diagram */}
              <div className="sec-col text-left">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Network Architecture</span>
                <div className="svg-diagram-card card-glass mt-4">
                  <svg viewBox="0 0 200 240" className="w-full">
                    {/* Nodes */}
                    <g transform="translate(10, 10)">
                      <rect width="180" height="20" rx="4" fill="#1e293b" stroke="#334155" />
                      <text x="90" y="14" fill="#fff" fontSize="8" textAnchor="middle">User Client Requests</text>
                    </g>
                    <g transform="translate(10, 40)">
                      <rect width="180" height="20" rx="4" fill="#1e293b" stroke="#6366f1" />
                      <text x="90" y="14" fill="#fff" fontSize="8" textAnchor="middle">WAF Shield &amp; Rate Limiter</text>
                    </g>
                    <g transform="translate(10, 70)">
                      <rect width="180" height="20" rx="4" fill="#1e293b" stroke="#334155" />
                      <text x="90" y="14" fill="#fff" fontSize="8" textAnchor="middle">Gateway &amp; Router</text>
                    </g>
                    <g transform="translate(10, 100)">
                      <rect width="180" height="20" rx="4" fill="#1e293b" stroke="#6366f1" />
                      <text x="90" y="14" fill="#fff" fontSize="8" textAnchor="middle">Tenant Isolation (RLS)</text>
                    </g>
                    <g transform="translate(10, 130)">
                      <rect width="180" height="20" rx="4" fill="#10b981" stroke="#10b981" />
                      <text x="90" y="14" fill="#fff" fontSize="8" textAnchor="middle">Private Model Cluster</text>
                    </g>
                    <g transform="translate(10, 160)">
                      <rect width="180" height="20" rx="4" fill="#1e293b" stroke="#334155" />
                      <text x="90" y="14" fill="#fff" fontSize="8" textAnchor="middle">Secure Vector Storage</text>
                    </g>

                    {/* Flow Lines */}
                    <line x1="100" y1="30" x2="100" y2="40" stroke="#6366f1" strokeWidth="1.5" />
                    <line x1="100" y1="60" x2="100" y2="70" stroke="#6366f1" strokeWidth="1.5" />
                    <line x1="100" y1="90" x2="100" y2="100" stroke="#6366f1" strokeWidth="1.5" />
                    <line x1="100" y1="120" x2="100" y2="130" stroke="#10b981" strokeWidth="1.5" />
                    <line x1="100" y1="150" x2="100" y2="160" stroke="#10b981" strokeWidth="1.5" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Compliance Timeline */}
            <div className="compliance-timeline-wrap mt-12 text-left">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-4">Compliance Timeline</span>
              <div className="horizontal-timeline-bar grid grid-cols-4 gap-4">
                <div className="timeline-node active">
                  <div className="node-date">CURRENT</div>
                  <div className="node-label">DPDP Ready</div>
                </div>
                <div className="timeline-node">
                  <div className="node-date">Q3 2026</div>
                  <div className="node-label">ISO 27001 Audit</div>
                </div>
                <div className="timeline-node">
                  <div className="node-date">Q4 2026</div>
                  <div className="node-label">SOC 2 Type II</div>
                </div>
                <div className="timeline-node">
                  <div className="node-date">2027</div>
                  <div className="node-label">MeitY Empanelment</div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ─── PROMPT 8: PERFORMANCE BENCHMARKS ─── */}
        <section className="section-benchmarks" id="benchmarks">
          <div className="content-inner">
            <div className="section-header text-center">
              <span className="tag-line tag-purple">SPEED &amp; EFFICIENCY</span>
              <h2 className="title-scale text-white">Performance Benchmarks</h2>
              <p className="sub-scale">Faster response latency and reduced costs compared to overseas endpoints.</p>
            </div>

            {/* Filter Toggle */}
            <div className="benchmark-toggle flex justify-center gap-2 mb-8 flex-wrap">
              <button className={`toggle-btn ${benchmarkFilter === 'latency' ? 'active' : ''}`} onClick={() => setBenchmarkFilter('latency')}>Latency Comparison</button>
              <button className={`toggle-btn ${benchmarkFilter === 'cost' ? 'active' : ''}`} onClick={() => setBenchmarkFilter('cost')}>Cost Comparison</button>
              <button className={`toggle-btn ${benchmarkFilter === 'throughput' ? 'active' : ''}`} onClick={() => setBenchmarkFilter('throughput')}>Throughput &amp; Scale</button>
            </div>

            {benchmarkFilter === 'latency' && (
              <div className="benchmark-details animate-fade-in text-left">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="chart-box card-glass p-6">
                    <span className="text-[10px] font-bold text-gray-500 uppercase block mb-4">TTFT (Time to First Token) - ms</span>
                    <div className="bar-row">
                      <div className="bar-label">Harikson Mumbai</div>
                      <div className="bar-track"><div className="bar-fill bg-indigo-500" style={{ width: '15%' }} /></div>
                      <div className="bar-val">45ms</div>
                    </div>
                    <div className="bar-row">
                      <div className="bar-label">Azure India</div>
                      <div className="bar-track"><div className="bar-fill bg-gray-600" style={{ width: '40%' }} /></div>
                      <div className="bar-val">120ms</div>
                    </div>
                    <div className="bar-row">
                      <div className="bar-label">OpenAI US</div>
                      <div className="bar-track"><div className="bar-fill bg-gray-600" style={{ width: '90%' }} /></div>
                      <div className="bar-val">280ms</div>
                    </div>
                  </div>
                  <div>
                    <h4>100% Indian Network Routing</h4>
                    <p className="text-secondary leading-relaxed">Because your request doesn't cross oceanic sub-sea cables to US data centers, we achieve Time to First Token under 45ms. Native regional languages are fine-tuned on local corpora, reducing execution delays.</p>
                  </div>
                </div>
              </div>
            )}

            {benchmarkFilter === 'cost' && (
              <div className="benchmark-details animate-fade-in text-left">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="table-box card-glass overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-gray-950/40 border-b border-gray-800 text-[10px] text-gray-500 font-bold uppercase">
                          <th className="p-3">Model Tier</th>
                          <th className="p-3">Harikson (INR)</th>
                          <th className="p-3">OpenAI (US)</th>
                          <th className="p-3">Azure (Global)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/40">
                        <tr>
                          <td className="p-3 font-semibold">8B-class</td>
                          <td className="p-3 text-indigo-400 font-bold">₹1,000 / 1M</td>
                          <td className="p-3">₹3,200 / 1M</td>
                          <td className="p-3">₹2,800 / 1M</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-semibold">70B-class</td>
                          <td className="p-3 text-indigo-400 font-bold">₹4,500 / 1M</td>
                          <td className="p-3">₹12,000 / 1M</td>
                          <td className="p-3">₹10,500 / 1M</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-semibold">RAG Ingestion</td>
                          <td className="p-3 text-indigo-400 font-bold">₹0.50 / query</td>
                          <td className="p-3">₹1.80 / query</td>
                          <td className="p-3">₹1.50 / query</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <h4>Save up to 60% with Zero Forex Exposure</h4>
                    <p className="text-secondary leading-relaxed">Overseas APIs charge premium USD rates subject to currency volatility. Harikson AI is priced natively in INR, saving corporate finance teams from FX risks and massive cross-border data transit surcharges.</p>
                  </div>
                </div>
              </div>
            )}

            {benchmarkFilter === 'throughput' && (
              <div className="benchmark-details animate-fade-in text-left">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
                    <div className="text-lg font-black text-indigo-400">50,000+</div>
                    <div className="text-[10px] text-gray-500 uppercase mt-1">Users Per Cluster</div>
                  </div>
                  <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
                    <div className="text-lg font-black text-indigo-400">2,400 T/s</div>
                    <div className="text-[10px] text-gray-500 uppercase mt-1">Throughput Qwen-72B</div>
                  </div>
                  <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
                    <div className="text-lg font-black text-indigo-400">512 H100</div>
                    <div className="text-[10px] text-gray-500 uppercase mt-1">GPUs Per Local Region</div>
                  </div>
                  <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
                    <div className="text-lg font-black text-indigo-400">&lt;30 Sec</div>
                    <div className="text-[10px] text-gray-500 uppercase mt-1">Cluster Scaling Time</div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </section>

        {/* ─── PROMPT 9: CUSTOMER STORIES ─── */}
        <section className="section-stories" id="stories">
          <div className="content-inner">
            <div className="section-header text-center">
              <span className="tag-line tag-blue">CASE STUDIES</span>
              <h2 className="title-scale text-white">Customer Success Stories</h2>
            </div>

            <div className="stories-grid flex flex-col gap-6">
              {/* Story 1 */}
              <div className="story-card card-glass text-left">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <span className="story-badge">LEGAL TECHNOLOGY</span>
                    <h4>LexAI Solutions: 50,000 precursor contract analysis</h4>
                    <p className="text-secondary leading-relaxed mt-2">
                      <strong>Problem:</strong> LexAI could not pass confidential client agreements through US-based OpenAI endpoints without violating NDAs and data residency laws. Lawyers spent 40 minutes analyzing each precedent.<br />
                      <strong>Solution:</strong> Deployed a private Llama-3-70B instance inside Harikson's Mumbai VPC gateway with dedicated workspace schema isolation.<br />
                      <strong>Results:</strong> Contract analysis reduced to 8 seconds, achieving full DPDP compliance and saving over ₹12 Lakhs annually in API costs.
                    </p>
                  </div>
                  <div className="flex flex-col justify-center bg-black/20 p-6 rounded-xl border border-gray-800/40 text-center">
                    <div className="text-2xl font-black text-indigo-400">8 Sec</div>
                    <div className="text-[10px] text-gray-500 uppercase mt-1">Precedent Analysis Time</div>
                    <div className="text-lg font-black text-emerald-400 mt-4">₹12L Saved</div>
                    <div className="text-[10px] text-gray-500 uppercase mt-1">Annual API Savings</div>
                  </div>
                </div>
                <div className="story-quote mt-6 border-t border-gray-800 pt-4 text-xs text-gray-400 italic">
                  "— CTO, LexAI Solutions"
                </div>
              </div>

              {/* Story 2 */}
              <div className="story-card card-glass text-left">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <span className="story-badge">BANKING &amp; FINANCE</span>
                    <h4>Leading NBFC: Regional customer dialer agents</h4>
                    <p className="text-secondary leading-relaxed mt-2">
                      <strong>Problem:</strong> Standard models failed on Hinglish, regional dialects (Tamil, Kannada), and branch contexts. Security teams rejected foreign APIs due to data sovereignty audits.<br />
                      <strong>Solution:</strong> Fine-tuned a Qwen3-72B model on private customer history logs inside a secure local cloud environment.<br />
                      <strong>Results:</strong> Support resolution times dropped by 68% while regional language accuracy hit 94%. Deployed across 10 branches in under a week.
                    </p>
                  </div>
                  <div className="flex flex-col justify-center bg-black/20 p-6 rounded-xl border border-gray-800/40 text-center">
                    <div className="text-2xl font-black text-indigo-400">-68%</div>
                    <div className="text-[10px] text-gray-500 uppercase mt-1">Support Resolution Time</div>
                    <div className="text-lg font-black text-emerald-400 mt-4">10 Branches</div>
                    <div className="text-[10px] text-gray-500 uppercase mt-1">Onboarded in 7 Days</div>
                  </div>
                </div>
                <div className="story-quote mt-6 border-t border-gray-800 pt-4 text-xs text-gray-400 italic">
                  "— Head of Customer Experience, NBFC Group"
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ─── PROMPT 7: PRICING SECTION ─── */}
        <section className="section-pricing" id="pricing">
          <div className="content-inner">
            <div className="section-header text-center">
              <span className="tag-line tag-blue">INR PRICING PLANS</span>
              <h2 className="title-scale text-white">Pricing That Respects Indian Budgets</h2>
              <p className="sub-scale">No forex risk. Direct invoicing. Cancel anytime.</p>
            </div>

            <div className="pricing-grid-custom">
              {/* Card 1: Starter */}
              <div className="price-card-custom">
                <h3 className="plan-name">Starter</h3>
                <div className="plan-price">₹0 <span className="period">/ month</span></div>
                <p className="plan-desc">100K tokens included free</p>
                <ul className="plan-feats mt-6">
                  <li><CheckCircle2 size={12} className="text-indigo-400" /> Qwen3-8B model access</li>
                  <li><CheckCircle2 size={12} className="text-indigo-400" /> 1 isolated workspace</li>
                  <li><CheckCircle2 size={12} className="text-indigo-400" /> Developer dashboard</li>
                  <li><XCircle size={12} className="text-gray-600" /> Fine-tuning</li>
                  <li><XCircle size={12} className="text-gray-600" /> Tenant isolation override</li>
                </ul>
                <div className="mt-8">
                  <Link href="/signup" passHref legacyBehavior><a className="btn-price">Start Free</a></Link>
                </div>
              </div>

              {/* Card 2: Professional */}
              <div className="price-card-custom highlighted border-glow-indigo">
                <div className="badge-promo">MOST POPULAR</div>
                <h3 className="plan-name">Professional</h3>
                <div className="plan-price">₹4,999 <span className="period">/ month</span></div>
                <p className="plan-desc">5M tokens included · ₹0.001 after</p>
                <ul className="plan-feats mt-6">
                  <li><CheckCircle2 size={12} className="text-indigo-400" /> All models (8B, 32B, 72B)</li>
                  <li><CheckCircle2 size={12} className="text-indigo-400" /> Up to 10 isolated tenants</li>
                  <li><CheckCircle2 size={12} className="text-indigo-400" /> Webhook logs &amp; analytics</li>
                  <li><CheckCircle2 size={12} className="text-indigo-400" /> Basic RAG (10K documents)</li>
                  <li><CheckCircle2 size={12} className="text-indigo-400" /> 99.9% Uptime SLA</li>
                </ul>
                <div className="mt-8">
                  <Link href="/signup" passHref legacyBehavior><a className="btn-price primary-gradient">Start Pro</a></Link>
                </div>
              </div>

              {/* Card 3: Business */}
              <div className="price-card-custom">
                <h3 className="plan-name">Business</h3>
                <div className="plan-price">₹24,999 <span className="period">/ month</span></div>
                <p className="plan-desc">25M tokens · dedicated resources</p>
                <ul className="plan-feats mt-6">
                  <li><CheckCircle2 size={12} className="text-indigo-400" /> Everything in Pro</li>
                  <li><CheckCircle2 size={12} className="text-indigo-400" /> Up to 50 isolated tenants</li>
                  <li><CheckCircle2 size={12} className="text-indigo-400" /> Advanced RAG (50K docs)</li>
                  <li><CheckCircle2 size={12} className="text-indigo-400" /> Fine-tuning engines</li>
                  <li><CheckCircle2 size={12} className="text-indigo-400" /> 99.95% Uptime SLA</li>
                </ul>
                <div className="mt-8">
                  <Link href="/signup" passHref legacyBehavior><a className="btn-price">Start Business</a></Link>
                </div>
              </div>

              {/* Card 4: Enterprise */}
              <div className="price-card-custom">
                <h3 className="plan-name">Enterprise</h3>
                <div className="plan-price">Custom <span className="period">/ contact</span></div>
                <p className="plan-desc">Unlimited scale · air-gapped options</p>
                <ul className="plan-feats mt-6">
                  <li><CheckCircle2 size={12} className="text-indigo-400" /> Everything in Business</li>
                  <li><CheckCircle2 size={12} className="text-indigo-400" /> Unlimited tokens &amp; tenants</li>
                  <li><CheckCircle2 size={12} className="text-indigo-400" /> Air-gapped / local deployments</li>
                  <li><CheckCircle2 size={12} className="text-indigo-400" /> Dedicated GPU resources</li>
                  <li><CheckCircle2 size={12} className="text-indigo-400" /> 99.99% Uptime SLA</li>
                </ul>
                <div className="mt-8">
                  <a href="#founders-contact" className="btn-price">Talk to Sales</a>
                </div>
              </div>
            </div>

            {/* Feature Comparison Table */}
            <div className="comparison-table-wrapper mt-12 text-left">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-4">Detailed Plan Comparison</span>
              <div className="table-box card-glass overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-950/40 border-b border-gray-800 text-[10px] text-gray-500 font-bold uppercase">
                      <th className="p-3">Feature</th>
                      <th className="p-3">Starter</th>
                      <th className="p-3">Professional</th>
                      <th className="p-3">Business</th>
                      <th className="p-3">Enterprise</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/40">
                    <tr>
                      <td className="p-3 font-semibold">Supported Models</td>
                      <td className="p-3">Qwen3-8B only</td>
                      <td className="p-3">All models</td>
                      <td className="p-3">All models</td>
                      <td className="p-3">All + Custom models</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">Tenant Workspaces</td>
                      <td className="p-3">1 Workspace</td>
                      <td className="p-3">Up to 10 Workspaces</td>
                      <td className="p-3">Up to 50 Workspaces</td>
                      <td className="p-3">Unlimited</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">RAG Document Limit</td>
                      <td className="p-3">500 docs</td>
                      <td className="p-3">10K docs</td>
                      <td className="p-3">50K docs</td>
                      <td className="p-3">Unlimited</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">Model Fine-tuning</td>
                      <td className="p-3">Not included</td>
                      <td className="p-3">Not included</td>
                      <td className="p-3">Included</td>
                      <td className="p-3">Dedicated Cluster</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">SLA Guarantee</td>
                      <td className="p-3">No SLA</td>
                      <td className="p-3">99.9% uptime</td>
                      <td className="p-3">99.95% uptime</td>
                      <td className="p-3">99.99% uptime</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </section>

        {/* ─── PROMPT 10: FAQ SECTION ─── */}
        <section className="section-faq" id="faq">
          <div className="content-inner">
            <div className="section-header text-center">
              <span className="tag-line tag-purple">FAQ</span>
              <h2 className="title-scale text-white">Frequently Asked Questions</h2>
              <p className="sub-scale">Specific answers about sovereign setups, compliance guidelines, and system tech.</p>
            </div>

            <div className="faq-wrapper grid grid-cols-1 lg:grid-cols-4 gap-8 mt-8">
              {/* FAQ Left Menu */}
              <div className="faq-menu flex flex-col gap-2 text-left">
                <button className={`faq-tab-btn ${faqCategory === 'sovereignty' ? 'active' : ''}`} onClick={() => { setFaqCategory('sovereignty'); setOpenFaq(null); }}>Data Sovereignty</button>
                <button className={`faq-tab-btn ${faqCategory === 'compliance' ? 'active' : ''}`} onClick={() => { setFaqCategory('compliance'); setOpenFaq(null); }}>Compliance</button>
                <button className={`faq-tab-btn ${faqCategory === 'security' ? 'active' : ''}`} onClick={() => { setFaqCategory('security'); setOpenFaq(null); }}>Security</button>
                <button className={`faq-tab-btn ${faqCategory === 'technical' ? 'active' : ''}`} onClick={() => { setFaqCategory('technical'); setOpenFaq(null); }}>Technical Details</button>
                <button className={`faq-tab-btn ${faqCategory === 'deployment' ? 'active' : ''}`} onClick={() => { setFaqCategory('deployment'); setOpenFaq(null); }}>Deployment</button>
                <button className={`faq-tab-btn ${faqCategory === 'pricing' ? 'active' : ''}`} onClick={() => { setFaqCategory('pricing'); setOpenFaq(null); }}>Pricing</button>
              </div>

              {/* FAQ Accordion List */}
              <div className="faq-list lg:col-span-3 text-left">
                {faqData[faqCategory].map((faq, idx) => (
                  <div key={idx} className="faq-item border-b border-gray-800/80 py-4">
                    <button className="faq-question flex justify-between items-center w-full text-sm font-semibold py-2 focus:outline-none" onClick={() => setOpenFaq(openFaq === idx ? null : idx)}>
                      <span>{faq.q}</span>
                      <ChevronDown size={16} className={`transform transition-transform ${openFaq === idx ? 'rotate-180' : ''}`} />
                    </button>
                    {openFaq === idx && (
                      <div className="faq-answer text-xs text-gray-400 mt-2 leading-relaxed animate-fade-in">
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* ─── CONTACT FOR OVERRIDES ─── */}
        <section className="section-contact" id="founders-contact">
          <div className="content-inner">
            <div className="contact-box card-glass p-8 text-center max-w-2xl mx-auto">
              <h3>Talk to an AI Infrastructure Architect</h3>
              <p className="text-secondary text-sm mt-2">Deploy Qwen3 or custom models on-premise, configure air-gapped clusters, or schedule custom migrations. We response in under 2 hours.</p>
              <div className="mt-6 flex justify-center gap-4 flex-wrap">
                <a href="mailto:admin@harikson.ai" className="btn-hero-primary">Email: admin@harikson.ai</a>
                <button className="btn-ghost" onClick={() => alert('Callback requested. We will contact you at your registered email.')}>Request Callback</button>
              </div>
            </div>
          </div>
        </section>

        {/* ─── FOOTER & SITEMAP ─── */}
        <footer className="footer-directory mt-16 text-left">
          <div className="content-inner grid grid-cols-2 md:grid-cols-5 gap-8 py-12 border-t border-gray-800">
            <div className="footer-col">
              <span className="footer-logo">⚡ Harikson AI</span>
              <p className="text-[10px] text-gray-500 mt-2">Sovereign enterprise AI infrastructure built in India for global reliability.</p>
            </div>
            <div className="footer-col">
              <span className="col-title">Product</span>
              <a href="#features">Features</a>
              <a href="#how-it-works">Architecture</a>
              <a href="#security">Control Gateways</a>
              <a href="#pricing">Model Routers</a>
            </div>
            <div className="footer-col">
              <span className="col-title">Developers</span>
              <a href="#developer">Docs</a>
              <a href="#developer">API Reference</a>
              <a href="#developer">SDKs</a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a>
            </div>
            <div className="footer-col">
              <span className="col-title">Sovereignty</span>
              <a href="#security">DPDP Act 2023</a>
              <a href="#security">Audit Trails</a>
              <a href="#security">Data residency</a>
              <a href="#security">Compliance logs</a>
            </div>
            <div className="footer-col">
              <span className="col-title">Company</span>
              <a href="#founders-contact">About Us</a>
              <a href="#founders-contact">Careers</a>
              <a href="#founders-contact">Contact</a>
              <a href="#founders-contact">Partner Network</a>
            </div>
          </div>
          <div className="footer-bottom-row border-t border-gray-900 py-6 text-center text-[10px] text-gray-500">
            <div>&copy; 2026 Harikson AI. All rights reserved. Sovereign infrastructure engineered precisely in India.</div>
          </div>
        </footer>

      </div>

      <style jsx global>{`
        /* ─── GLOBAL DESIGN SYSTEM STYLES ─── */
        body {
          background-color: #0A0A0F;
          color: #F8FAFC;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          margin: 0;
          padding: 0;
          overflow-x: hidden;
        }

        .landing-container {
          background-color: #0A0A0F;
          min-height: 100vh;
        }

        .content-inner {
          max-width: 1280px;
          margin: 0 auto;
          padding: 96px 24px;
        }

        /* Nav Header */
        .hero-nav {
          position: sticky;
          top: 0;
          z-index: 40;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 48px;
          background: rgba(10, 10, 15, 0.8);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid #1e293b;
        }
        .logo-section {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .logo-icon {
          font-size: 20px;
          color: #6366f1;
        }
        .logo-text {
          font-weight: 900;
          font-size: 18px;
          letter-spacing: -0.03em;
        }
        .nav-links-desktop {
          display: flex;
          align-items: center;
          gap: 24px;
        }
        .nav-link {
          font-size: 13.5px;
          font-weight: 500;
          color: #94a3b8;
          text-decoration: none;
          transition: color 0.15s ease;
        }
        .nav-link:hover {
          color: #f8fafc;
        }
        .nav-link-btn {
          font-size: 13px;
          font-weight: 600;
          background: #6366f1;
          color: #fff;
          padding: 8px 18px;
          border-radius: 8px;
          text-decoration: none;
          transition: transform 0.15s ease;
        }
        .nav-link-btn:hover {
          transform: scale(1.02);
        }

        /* Mesh Background */
        .mesh-gradient {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 100vh;
          z-index: 1;
          background: radial-gradient(circle at 30% 30%, rgba(99, 102, 241, 0.08) 0%, transparent 50%),
                      radial-gradient(circle at 70% 60%, rgba(139, 92, 246, 0.05) 0%, transparent 60%);
          pointer-events: none;
          opacity: 0.85;
          animation: morphMesh ${reducedMotion ? '0s' : '20s'} ease-in-out infinite alternate;
        }
        @keyframes morphMesh {
          0% { transform: scale(1) translate(0, 0); }
          50% { transform: scale(1.05) translate(2%, 3%); }
          100% { transform: scale(1) translate(-2%, -3%); }
        }

        /* Hero Layout */
        .section-hero {
          position: relative;
          min-height: 90vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 48px;
          z-index: 5;
        }
        .hero-grid {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 48px;
          align-items: center;
          max-width: 1280px;
          margin: 0 auto;
          width: 100%;
        }

        .trust-pills-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 24px;
        }
        .trust-pill {
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid #334155;
          backdrop-filter: blur(12px);
          font-size: 11px;
          font-weight: 600;
          color: #94a3b8;
          padding: 6px 14px;
          border-radius: 9999px;
        }

        .hero-title {
          font-size: 60px;
          font-weight: 700;
          line-height: 1.1;
          letter-spacing: -0.02em;
          color: #ffffff;
          margin-bottom: 16px;
        }
        .hero-sub {
          font-size: 19px;
          color: #94a3b8;
          line-height: 1.6;
          max-width: 580px;
          margin-bottom: 32px;
        }

        .hero-ctas {
          display: flex;
          gap: 16px;
        }
        .btn-hero-primary {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: #ffffff;
          font-size: 14.5px;
          font-weight: 600;
          padding: 14px 28px;
          border-radius: 12px;
          text-decoration: none;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .btn-hero-primary:hover {
          transform: scale(1.02);
          box-shadow: 0 10px 20px rgba(99, 102, 241, 0.2);
        }
        .btn-hero-secondary {
          background: transparent;
          color: #ffffff;
          font-size: 14px;
          font-weight: 600;
          padding: 14px 28px;
          border-radius: 12px;
          border: 1px solid #475569;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: background 0.15s ease;
        }
        .btn-hero-secondary:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        /* Mockup Perspective Wrapper */
        .mockup-perspective {
          position: relative;
          perspective: 1000px;
          width: 100%;
        }

        /* 3D Browser Mockup */
        .mockup-browser {
          background: #111827;
          border: 1px solid #334155;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4);
          transform: ${reducedMotion ? 'none' : 'rotateY(-5deg) rotateX(4deg)'};
          transition: transform 0.5s ease;
          animation: floatMockup ${reducedMotion ? '0s' : '6s'} ease-in-out infinite alternate;
        }
        @keyframes floatMockup {
          0% { transform: rotateY(-5deg) rotateX(4deg) translateY(0); }
          100% { transform: rotateY(-5deg) rotateX(4deg) translateY(-10px); }
        }

        .browser-title-bar {
          background: #1f2937;
          border-bottom: 1px solid #334155;
          padding: 10px 16px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .mock-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .mock-dot.red { background: #ef4444; }
        .mock-dot.yellow { background: #f59e0b; }
        .mock-dot.green { background: #10b981; }
        .browser-url {
          font-size: 11px;
          color: #64748b;
          margin-left: 12px;
          font-family: monospace;
        }

        .browser-content-grid {
          display: grid;
          grid-template-columns: 120px 1fr;
          height: 240px;
        }
        .browser-sidebar {
          background: #111827;
          border-right: 1px solid #1e293b;
          padding: 12px;
          text-align: left;
        }
        .side-logo {
          font-weight: bold;
          font-size: 11px;
          margin-bottom: 24px;
        }
        .side-item {
          font-size: 10px;
          color: #94a3b8;
          padding: 6px;
          margin-bottom: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .side-item.active {
          background: rgba(99, 102, 241, 0.1);
          color: #8b5cf6;
          font-weight: 600;
        }

        .browser-chat-pane {
          background: #0b0f19;
          display: flex;
          flex-direction: column;
          text-align: left;
        }
        .chat-header {
          padding: 10px 16px;
          border-bottom: 1px solid #1e293b;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .model-selector {
          font-family: monospace;
          font-size: 11px;
          color: #f8fafc;
        }
        .badge-active {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          font-size: 9px;
          font-weight: bold;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .chat-messages {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          font-size: 11px;
          flex: 1;
          overflow-y:auto;
        }
        .msg {
          padding: 8px 12px;
          border-radius: 8px;
          max-width: 85%;
        }
        .msg.user {
          background: #1e293b;
          align-self: flex-end;
          color: #fff;
        }
        .msg.assistant {
          background: #111827;
          border: 1px solid #1e293b;
          align-self: flex-start;
          color: #94a3b8;
          line-height: 1.5;
        }

        /* Mockup Terminal */
        .mockup-terminal {
          position: absolute;
          bottom: -30px;
          left: -40px;
          background: #090a0f;
          border: 1px solid #334155;
          border-radius: 8px;
          width: 280px;
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.5);
          text-align: left;
          z-index: 10;
        }
        .term-dot {
          width: 6px;
          height: 6px;
          background: #64748b;
          border-radius: 50%;
          display: inline-block;
          margin-right: 6px;
        }
        .terminal-tab {
          font-size: 9px;
          color: #64748b;
        }
        .terminal-body {
          padding: 12px;
          font-size: 10px;
          line-height: 1.5;
        }
        .prompt {
          color: #8b5cf6;
          margin-right: 4px;
        }
        .cursor {
          color: #6366f1;
          font-weight: bold;
          animation: blink 1s step-end infinite;
        }
        @keyframes blink {
          50% { opacity: 0; }
        }

        /* Floating Badges */
        .floating-badge {
          position: absolute;
          background: rgba(30, 41, 59, 0.85);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 10px;
          font-weight: 700;
          color: #fff;
          z-index: 15;
          animation: floatBadge ${reducedMotion ? '0s' : '4s'} ease-in-out infinite alternate;
        }
        @keyframes floatBadge {
          0% { transform: translateY(0); }
          100% { transform: translateY(-5px); }
        }
        .badge-dpdp { top: -20px; right: 20px; animation-delay: 0.5s; border-color: #10b981; }
        .badge-price { bottom: 40px; right: -20px; animation-delay: 1s; border-color: #f59e0b; }
        .badge-region { top: 60px; left: -20px; animation-delay: 1.5s; border-color: #6366f1; }

        /* Infinite Scrolling Logos */
        .infinite-logo-wrap {
          margin-top: 64px;
          border-top: 1px solid #1e293b;
          border-bottom: 1px solid #1e293b;
          padding: 16px 0;
          overflow: hidden;
          width: 100vw;
          position: relative;
          left: 50%;
          right: 50%;
          margin-left: -50vw;
          margin-right: -50vw;
        }
        .logo-track {
          display: flex;
          gap: 64px;
          animation: scrollLogas ${reducedMotion ? '0s' : '20s'} linear infinite;
          white-space: nowrap;
          width: max-content;
        }
        @keyframes scrollLogas {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        .logo-track span {
          font-weight: 900;
          font-size: 15px;
          text-transform: uppercase;
          color: #64748b;
          transition: color 0.15s ease;
          cursor: default;
        }
        .logo-track span:hover {
          color: #f8fafc;
        }

        /* ─── ENTERPRISE TRUST SECTION ─── */
        .section-scale {
          background-color: #0A0A0F;
          border-bottom: 1px solid #1e293b;
        }
        .title-scale {
          font-size: 36px;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin-bottom: 12px;
        }
        .sub-scale {
          font-size: 16px;
          color: #94a3b8;
          max-width: 620px;
          margin: 0 auto 48px;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 48px;
        }
        .metric-card {
          padding: 24px;
          position: relative;
        }
        .card-glass {
          background: rgba(30, 41, 59, 0.4);
          backdrop-filter: blur(12px);
          border: 1px solid #334155;
          border-radius: 16px;
        }
        .metric-val {
          font-size: 32px;
          font-weight: 900;
          color: #fff;
          margin-bottom: 4px;
        }
        .metric-label {
          font-size: 12px;
          color: #94a3b8;
          font-weight: 500;
        }
        .sparkline-wrapper {
          margin-top: 12px;
          height: 30px;
        }
        .pulse-green {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #10b981;
          box-shadow: 0 0 10px #10b981;
          animation: pulseGreenAnim 2s infinite;
        }
        @keyframes pulseGreenAnim {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.6); opacity: 0.4; }
          100% { transform: scale(1); opacity: 1; }
        }

        .customer-logos-row {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 32px;
          margin-bottom: 64px;
        }
        .logo-item {
          font-weight: 800;
          font-size: 13px;
          color: #64748b;
          text-transform: uppercase;
          cursor: help;
          position: relative;
          transition: color 0.15s ease, transform 0.15s ease;
        }
        .logo-item:hover {
          color: #6366f1;
          transform: scale(1.05);
        }
        /* Simple Tooltip on Logo Hover */
        .logo-item[data-tooltip]::after {
          content: attr(data-tooltip);
          position: absolute;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: #1e293b;
          border: 1px solid #334155;
          color: #fff;
          font-size: 9.5px;
          padding: 6px 10px;
          border-radius: 6px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.15s ease;
          box-shadow: 0 10px 20px rgba(0,0,0,0.3);
        }
        .logo-item:hover[data-tooltip]::after {
          opacity: 1;
        }

        /* Map Section */
        .deployment-map-container {
          background: rgba(30, 41, 59, 0.2);
          border: 1px solid #1e293b;
          border-radius: 20px;
          padding: 32px;
        }
        .map-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
        }
        .map-visual {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .india-map-svg {
          max-height: 320px;
        }
        .map-dot-group {
          cursor: pointer;
        }
        .map-dot {
          fill: #6366f1;
        }
        .map-dot-pulse {
          fill: #6366f1;
          opacity: 0.4;
          transform-origin: center;
          animation: dotPulse 2s infinite;
        }
        @keyframes dotPulse {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .map-popover {
          position: absolute;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 11px;
          color: #fff;
          text-align: left;
          box-shadow: 0 10px 25px rgba(0,0,0,0.4);
          z-index: 20;
          width: 140px;
          top: 10px;
          left: 10px;
        }
        .pop-title {
          font-weight: bold;
          margin-bottom: 4px;
          color: #6366f1;
        }
        .region-list {
          list-style: none;
          padding: 0;
          margin: 16px 0 24px;
          text-align: left;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .region-list li {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 500;
        }
        .region-list .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: #64748b;
        }
        .region-list .dot.active {
          background-color: #10b981;
          box-shadow: 0 0 8px #10b981;
        }
        .btn-ghost {
          background: transparent;
          border: 1px solid #334155;
          color: #94a3b8;
          font-size: 12px;
          font-weight: 600;
          padding: 8px 18px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-ghost:hover {
          color: #fff;
          border-color: #475569;
          background: rgba(255, 255, 255, 0.05);
        }

        /* ─── PROMPT 3: ARCHITECTURE Reveal ─── */
        .section-howitworks {
          background-color: #09090B;
          border-bottom: 1px solid #1e293b;
        }
        .arch-flow-grid {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 32px;
          align-items: center;
        }
        .arch-steps-nav {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .arch-step-item {
          padding: 16px 20px;
          border-left: 2px solid #334155;
          text-align: left;
          cursor: pointer;
          font-weight: 600;
          font-size: 14.5px;
          color: #64748b;
          transition: all 0.15s ease;
        }
        .arch-step-item.active {
          color: #6366f1;
          border-color: #6366f1;
          background: rgba(99, 102, 241, 0.04);
        }
        .arch-step-item .num {
          font-size: 11px;
          margin-right: 8px;
          opacity: 0.5;
        }
        .arch-visual-card {
          padding: 32px;
          min-height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: left;
        }
        .step-content h4 {
          font-weight: 800;
          font-size: 12px;
          color: #6366f1;
          letter-spacing: 0.05em;
          margin-bottom: 4px;
        }

        /* ─── PROMPT 4: FEATURES Grid ─── */
        .section-features {
          background-color: #0A0A0F;
          border-bottom: 1px solid #1e293b;
        }
        .features-grid-custom {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .feat-card {
          background: #111827;
          border: 1px solid #334155;
          border-radius: 16px;
          padding: 24px;
          text-align: left;
          display: flex;
          flex-direction: column;
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .feat-card:hover {
          transform: translateY(-4px);
        }
        .feat-card.border-glow-indigo:hover { border-color: #6366f1; box-shadow: 0 10px 30px rgba(99, 102, 241, 0.1); }
        .feat-card.border-glow-emerald:hover { border-color: #10b981; box-shadow: 0 10px 30px rgba(16, 185, 129, 0.1); }
        .feat-card.border-glow-amber:hover { border-color: #f59e0b; box-shadow: 0 10px 30px rgba(245, 158, 11, 0.1); }
        .feat-card.border-glow-pink:hover { border-color: #ec4899; box-shadow: 0 10px 30px rgba(236, 72, 153, 0.1); }
        .feat-card.border-glow-purple:hover { border-color: #8b5cf6; box-shadow: 0 10px 30px rgba(139, 92, 246, 0.1); }
        .feat-card.border-glow-cyan:hover { border-color: #06b6d4; box-shadow: 0 10px 30px rgba(6, 182, 212, 0.1); }
        
        .feat-card:hover .feat-icon {
          transform: rotate(12deg);
        }
        .feat-icon {
          margin-bottom: 16px;
          transition: transform 0.2s ease;
        }
        .feat-card h4 {
          font-size: 17px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 8px;
        }
        .feat-card p {
          font-size: 13px;
          color: #94a3b8;
          line-height: 1.5;
          margin-bottom: 16px;
          flex: 1;
        }
        .feat-tech {
          font-family: monospace;
          font-size: 11px;
          color: #64748b;
          margin-bottom: 16px;
          background: rgba(0,0,0,0.25);
          padding: 6px 10px;
          border-radius: 6px;
        }
        .feat-link {
          font-size: 12px;
          font-weight: 600;
          color: #94a3b8;
          text-decoration: none;
        }
        .feat-link:hover {
          color: #fff;
        }

        /* ─── PROMPT 5: DX PANEL ─── */
        .section-dx {
          background-color: #09090B;
          border-bottom: 1px solid #1e293b;
        }
        .dx-split-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        .dx-panel {
          border: 1px solid #334155;
          border-radius: 16px;
          background: #111827;
          overflow: hidden;
          min-height: 280px;
          display: flex;
          flex-direction: column;
        }
        .panel-tabs {
          display: flex;
          background: #1f2937;
          border-bottom: 1px solid #334155;
        }
        .tab-btn {
          padding: 10px 18px;
          background: transparent;
          border: none;
          color: #64748b;
          font-family: monospace;
          font-size: 12px;
          cursor: pointer;
          border-right: 1px solid #334155;
          transition: all 0.15s ease;
        }
        .tab-btn.active {
          background: #111827;
          color: #6366f1;
          font-weight: bold;
        }
        .code-editor-body {
          padding: 20px;
          flex: 1;
          overflow-x: auto;
        }
        .code-content {
          font-size: 11.5px;
          line-height: 1.6;
          color: #a5b4fc; /* Dracula tint */
        }
        .panel-footer {
          padding: 12px 20px;
          border-top: 1px solid #334155;
          background: #1f2937;
          display: flex;
          justify-content: flex-end;
        }
        .btn-run {
          background: #6366f1;
          color: #fff;
          border: none;
          padding: 8px 16px;
          font-size: 12px;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
        }
        .output-panel .panel-header {
          padding: 12px 20px;
          background: #1f2937;
          border-bottom: 1px solid #334155;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .output-panel .panel-header .title {
          font-size: 11px;
          font-family: monospace;
          color: #94a3b8;
        }
        .output-panel .panel-body {
          padding: 20px;
          font-size: 11px;
          line-height: 1.6;
          color: #94a3b8;
          flex: 1;
        }
        .integ-card {
          background: #111827;
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 14px;
        }
        .green-status-dot {
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
          display: inline-block;
        }

        /* ─── PROMPT 6: SECURITY ─── */
        .section-security {
          background-color: #0A0A0F;
          border-bottom: 1px solid #1e293b;
        }
        .security-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        .compliance-card {
          background: #111827;
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 16px;
        }
        .compliance-card.alert {
          border-color: #f59e0b;
        }
        .compliance-card .badge-title {
          font-weight: bold;
          font-size: 13px;
          color: #fff;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }
        .compliance-card p {
          font-size: 11px;
          color: #94a3b8;
          line-height: 1.5;
        }
        .sec-features-list {
          list-style: none;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .sec-features-list li {
          font-size: 13px;
          color: #94a3b8;
          line-height: 1.5;
        }
        .sec-features-list li strong {
          color: #fff;
        }
        .timeline-node {
          border-top: 2px solid #334155;
          padding-top: 12px;
        }
        .timeline-node.active {
          border-color: #6366f1;
        }
        .node-date {
          font-size: 10px;
          color: #64748b;
          font-weight: bold;
        }
        .node-label {
          font-size: 12.5px;
          color: #fff;
          font-weight: 600;
          margin-top: 4px;
        }

        /* ─── PROMPT 8: BENCHMARKS ─── */
        .section-benchmarks {
          background-color: #09090B;
          border-bottom: 1px solid #1e293b;
        }
        .toggle-btn {
          background: transparent;
          border: 1px solid #334155;
          color: #94a3b8;
          font-size: 12.5px;
          font-weight: 600;
          padding: 10px 20px;
          border-radius: 9999px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .toggle-btn.active {
          background: #6366f1;
          color: #fff;
          border-color: #6366f1;
        }
        .bar-row {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 12px;
          font-size: 12px;
        }
        .bar-label {
          width: 110px;
          font-weight: 600;
        }
        .bar-track {
          flex: 1;
          height: 8px;
          background: #1e293b;
          border-radius: 4px;
          overflow: hidden;
        }
        .bar-fill {
          height: 100%;
        }
        .bar-val {
          width: 45px;
          font-weight: bold;
          text-align: right;
        }

        /* ─── PROMPT 9: CASE STORIES ─── */
        .section-stories {
          background-color: #0A0A0F;
          border-bottom: 1px solid #1e293b;
        }
        .story-card {
          padding: 24px;
          border-radius: 16px;
        }
        .story-badge {
          background: rgba(99, 102, 241, 0.1);
          color: #6366f1;
          font-size: 9px;
          font-weight: bold;
          padding: 2px 6px;
          border-radius: 4px;
          display: inline-block;
          margin-bottom: 8px;
        }

        /* ─── PROMPT 7: PRICING ─── */
        .section-pricing {
          background-color: #09090B;
          border-bottom: 1px solid #1e293b;
        }
        .pricing-grid-custom {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }
        .price-card-custom {
          background: #111827;
          border: 1px solid #334155;
          border-radius: 16px;
          padding: 24px;
          text-align: left;
          position: relative;
        }
        .price-card-custom.highlighted {
          background: #161c2d;
          border-color: #6366f1;
        }
        .badge-promo {
          position: absolute;
          top: 12px;
          right: 12px;
          background: #6366f1;
          color: #fff;
          font-size: 8.5px;
          font-weight: bold;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .plan-name {
          font-size: 15px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
        }
        .plan-price {
          font-size: 32px;
          font-weight: 900;
          color: #fff;
          margin-top: 4px;
        }
        .plan-price .period {
          font-size: 12px;
          color: #64748b;
        }
        .plan-desc {
          font-size: 11px;
          color: #64748b;
          margin-top: 2px;
        }
        .plan-feats {
          list-style: none;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .plan-feats li {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11.5px;
          color: #94a3b8;
        }
        .btn-price {
          display: block;
          text-align: center;
          background: transparent;
          border: 1px solid #334155;
          color: #fff;
          font-size: 12.5px;
          font-weight: 600;
          padding: 10px;
          border-radius: 8px;
          text-decoration: none;
          transition: all 0.15s ease;
        }
        .btn-price.primary-gradient {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          border: none;
        }
        .btn-price:hover {
          background: rgba(255, 255, 255, 0.05);
          transform: scale(1.01);
        }
        .btn-price.primary-gradient:hover {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          opacity: 0.95;
        }

        /* ─── FAQ SECTION ─── */
        .section-faq {
          background-color: #0A0A0F;
          border-bottom: 1px solid #1e293b;
        }
        .faq-tab-btn {
          background: transparent;
          border: none;
          color: #64748b;
          font-size: 13px;
          font-weight: 600;
          padding: 10px 14px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .faq-tab-btn.active {
          background: rgba(99, 102, 241, 0.08);
          color: #6366f1;
        }
        .faq-question {
          color: #fff;
          transition: color 0.15s ease;
        }
        .faq-question:hover {
          color: #6366f1;
        }

        /* ─── SITEMAP FOOTER ─── */
        .footer-directory {
          background-color: #0A0A0F;
        }
        .footer-logo {
          font-weight: bold;
          font-size: 16px;
        }
        .col-title {
          font-weight: bold;
          font-size: 12px;
          color: #fff;
          margin-bottom: 12px;
          display: block;
        }
        .footer-col a {
          font-size: 11px;
          color: #64748b;
          text-decoration: none;
          display: block;
          margin-bottom: 8px;
          transition: color 0.15s ease;
        }
        .footer-col a:hover {
          color: #fff;
        }

        /* Responsive Layouts */
        @media (max-width: 1024px) {
          .hero-grid,
          .map-grid,
          .arch-flow-grid,
          .dx-split-grid {
            grid-template-columns: 1fr;
          }
          .hero-title {
            font-size: 42px;
          }
          .features-grid-custom {
            grid-template-columns: repeat(2, 1fr);
          }
          .pricing-grid-custom {
            grid-template-columns: repeat(2, 1fr);
          }
          .security-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 768px) {
          .features-grid-custom,
          .pricing-grid-custom {
            grid-template-columns: 1fr;
          }
          .hero-title {
            font-size: 32px;
          }
          .hero-nav {
            padding: 16px 24px;
          }
        }
      `}</style>
    </>
  );
}
