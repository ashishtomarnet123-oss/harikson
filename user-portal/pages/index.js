import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { 
  Cpu, Layers, Database, BrainCircuit, ShieldCheck, Code2, 
  Play, CheckCircle2, XCircle, CreditCard, Download, Shield, 
  Key, Clock, Webhook, Info, Star, Crown, Zap, Lock, Terminal,
  ExternalLink, ArrowRight, RefreshCw, Activity, ChevronDown, HelpCircle,
  MapPin, AlertTriangle, FileText, Settings, Sparkles, Building, PlayCircle
} from 'lucide-react';

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
    fmt.Println(res.Choices[0].Message.content)
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
  
  // Interactive Benchmark Toggles
  const [benchmarkFilter, setBenchmarkFilter] = useState('latency'); // latency, cost, throughput, languages
  const [selectedRegion, setSelectedRegion] = useState('mumbai');
  
  // Pricing annual discount toggle
  const [billingPeriod, setBillingPeriod] = useState('monthly'); // monthly, annual

  // FAQ Tab and search
  const [faqCategory, setFaqCategory] = useState('sovereignty');
  const [openFaq, setOpenFaq] = useState(null);
  
  // Deployment Map Regions
  const [hoveredRegion, setHoveredRegion] = useState(null);

  // Architecture toggle and scroll step
  const [viewArchitectureCode, setViewArchitectureCode] = useState(false);
  const [activeArchStep, setActiveArchStep] = useState(0);

  // Shell simulator
  const [terminalText, setTerminalText] = useState('');
  const [terminalLines, setTerminalLines] = useState([]);
  const terminalCommand = 'harikson deploy --model harikson8B --region in-your-region';
  const hasAnimated = useRef(false);
  
  // Reduced motion preference
  const [reducedMotion, setReducedMotion] = useState(false);

  // Mobile footer accordion toggle state
  const [activeFooterAccordion, setActiveFooterAccordion] = useState(null);
  const toggleFooterAccordion = (index) => {
    setActiveFooterAccordion(activeFooterAccordion === index ? null : index);
  };

  useEffect(() => {
    setMounted(true);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setReducedMotion(true);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (reducedMotion) {
      setTerminalText(terminalCommand);
      setTerminalLines([
        { text: '✓ Namespace neuravolt-prod initialized', color: '#10B981' },
        { text: '✓ Secured weights: harikson-8B loaded', color: '#10B981' },
        { text: '✓ Gateway Router: ONLINE (ap-south-1)', color: '#10B981' },
        { text: '✓ DPDP local audit configuration: ENABLED', color: '#10B981' }
      ]);
      return;
    }

    if (hasAnimated.current) return;
    hasAnimated.current = true;

    setTerminalLines([]);
    let charIdx = 0;
    let textAccum = '';
    
    const interval = setInterval(() => {
      if (charIdx < terminalCommand.length) {
        textAccum += terminalCommand[charIdx];
        setTerminalText(textAccum);
        charIdx++;
      } else {
        clearInterval(interval);
        
        const t1 = setTimeout(() => {
          setTerminalLines(prev => [...prev, { text: '✓ Namespace neuravolt-prod initialized', color: '#10B981' }]);
        }, 200);
        
        const t2 = setTimeout(() => {
          setTerminalLines(prev => [...prev, { text: '✓ Secured weights: harikson-8B loaded', color: '#10B981' }]);
        }, 700);
        
        const t3 = setTimeout(() => {
          setTerminalLines(prev => [...prev, { text: '✓ Gateway Router: ONLINE (ap-south-1)', color: '#10B981' }]);
        }, 1200);
        
        const t4 = setTimeout(() => {
          setTerminalLines(prev => [...prev, { text: '✓ DPDP local audit configuration: ENABLED', color: '#10B981' }]);
        }, 1700);
      }
    }, 50);

    return () => {
      clearInterval(interval);
    };
  }, [mounted, reducedMotion]);

  const simulateCompile = () => {
    setIsRunning(true);
    setHasRun(false);
    setTimeout(() => {
      setIsRunning(false);
      setHasRun(true);
    }, 1000);
  };

  const mapRegions = {
    mumbai: { name: 'Mumbai Region', status: 'Active', latency: '12ms', gpus: '512 H100', cost: '₹0.001/token' },
    delhi: { name: 'Delhi (NCR) Region', status: 'Active', latency: '18ms', gpus: '256 H100', cost: '₹0.001/token' },
    bangalore: { name: 'Bangalore Region', status: 'Active', latency: '8ms', gpus: '384 H100', cost: '₹0.001/token' },
    hyderabad: { name: 'Hyderabad Region', status: 'Active', latency: '14ms', gpus: '256 H100', cost: '₹0.001/token' }
  };

  const faqData = {
    sovereignty: [
      { q: "Is my data ever stored outside India?", a: "No. All servers, caches, backup databases, and metadata tables are strictly hosted inside local tier-4 Indian facilities. Your prompts, embeddings, and chat histories never cross political borders." },
      { q: "What happens to my data if I cancel?", a: "We purge all tenant instances, vector database namespaces, and backups completely within 72 hours of cancel confirmation using overwrite protocols." },
      { q: "Can I request complete data deletion under DPDP?", a: "Yes, we support automated erasure requests for individual user identities (Data Principals) via simple API triggers or your admin workspace controls." },
      { q: "Do you support data principal rights requests?", a: "Yes, we support exports of raw transaction data histories, modifications of identity logs, and total erasure to fulfill regulatory queries." },
      { q: "Is my vector database isolated from other customers?", a: "Absolutely. Tenant datasets utilize isolated database schemas and dedicated cryptographic indexes, preventing overlap or indexing leakage." }
    ],
    compliance: [
      { q: "Are you DPDP Act 2023 compliant?", a: "Yes. The platform provides localized consent mechanisms, immutably signed system transaction logs, and localized hosting pipelines out of the box." },
      { q: "When will ISO 27001 certification be complete?", a: "Our certification frameworks are completely integrated. The official ISO 27001 audit completion is scheduled for Q3 2026." },
      { q: "Do you support BIS/MeitY empanelment requirements?", a: "Our BIS registration is fully validated. Our MeitY cloud service provider empanelment is active in progress, targeting completion by Q3 2026." },
      { q: "Can you sign a Data Processing Agreement?", a: "Yes. We offer standard DPDP-ready DPAs built specifically for Indian financial, public, and enterprise institutions." },
      { q: "Are you prepared for SOC 2 Type II audit?", a: "We are in the final preparation stages with automated compliance logging active. The official audit validation starts in Q4 2026." }
    ],
    security: [
      { q: "What encryption standards do you use?", a: "We enforce AES-256 for all stored database records and TLS 1.3 for transiting networks. Credentials use salted bcrypt hashing." },
      { q: "Can I use my own encryption keys?", a: "Yes. Our Enterprise plan supports Customer-Managed Encryption Keys (CMEK) via localized cloud KMS managers or hardware security modules (HSMs)." },
      { q: "How is tenant isolation enforced?", a: "We apply strict logical namespace routers and row-level security (RLS) policies at the PostgreSQL database level." },
      { q: "Do you support SSO/SAML/SCIM?", a: "Yes. Harikson integrates with all SAML 2.0 and OIDC identity providers, including Okta, Active Directory, and Azure AD." },
      { q: "What is your disaster recovery RPO/RTO?", a: "We target a Recovery Point Objective (RPO) of 4 hours and a Recovery Time Objective (RTO) of 24 hours via cross-region replication." }
    ],
    technical: [
      { q: "Which models do you support?", a: "We support Qwen3 (8B, 32B, 72B), Llama 3 (8B, 70B), Mistral-Large, and DeepSeek-V3." },
      { q: "Can I bring my own fine-tuned model?", a: "Yes, you can upload custom weights in safetensors or GGUF formats directly to your private cluster." },
      { q: "Is your API fully compatible with OpenAI?", a: "Yes. Swapping the OpenAI SDK `base_url` parameter to Harikson endpoints is all that is required." },
      { q: "Do you support function calling and streaming?", a: "Yes, we support structured JSON schema outputs, function calls, and stream response tokens." },
      { q: "What is the maximum context window?", a: "We support up to a 128K context window, depending on the model and hardware configuration chosen." }
    ],
    deployment: [
      { q: "Can you deploy on-premise or air-gapped?", a: "Yes. We distribute secure container images and Helm charts for fully offline, bare-metal server environments." },
      { q: "How long does deployment take?", a: "Self-serve cloud instances provision in under 10 minutes. Custom VPC or on-premises server setups take 2-3 business days." },
      { q: "Do you support Kubernetes and Docker?", a: "Yes, the control plane and model deployments are packaged as standard Helm charts and Docker containers." },
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
        <meta name="description" content="Deploy private LLMs, AI agents, RAG systems, and enterprise AI workloads inside India. DPDP-compliant, OpenAI-compatible." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href="https://harikson.ai" />
      </Head>

      <div className="landing-container">
        
        {/* ─── STICKY HEADER NAVIGATION ─── */}
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

        {/* ─── HERO SECTION ─── */}
        <section className="section-hero">
          <div className="mesh-gradient" />
          <div className="subtle-grid-bg" />
          
          <div className="particle-container">
            {[...Array(25)].map((_, i) => (
              <span key={i} className="particle-dot" style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 10}s`,
                animationDuration: `${15 + Math.random() * 15}s`
              }} />
            ))}
          </div>

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
                Enterprise AI Infrastructure.<br />
                <span className="gradient-text">Built in India.</span> Trusted Everywhere.
              </h1>
              
              <p className="hero-sub">
                Deploy private LLMs, AI agents, RAG systems, and enterprise AI workloads inside India with complete control over your data, infrastructure, compliance, and costs.
              </p>

              <div className="hero-ctas">
                <Link href="/signup" passHref legacyBehavior>
                  <a className="btn-hero-primary">Start Free</a>
                </Link>
                <a href="#developer" className="btn-hero-secondary">
                  <PlayCircle size={16} /> Watch Demo
                </a>
              </div>
            </div>

            <div className="hero-right">
              {/* 3D Mockup Container */}
              <div className="mockup-perspective">
                {/* Main Browser Mockup */}
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
                        <div className="model-selector">harikson-8b</div>
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

                {/* Integrated Terminal */}
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
                <div className="floating-badge badge-dpdp">🛡️ DPDP Ready</div>
                <div className="floating-badge badge-price">⚡ ₹0.001/token</div>
                <div className="floating-badge badge-region">🇮🇳 Mumbai Region</div>
              </div>
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

            {/* Metrics Grid */}
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
                    <path d="M 0 25 Q 10 15 20 22 T 40 10 T 60 18 T 80 5 T 100 12" fill="none" stroke="#4f46e5" strokeWidth="2.5" />
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



            {/* Deployment Map */}
            <div className="deployment-map-container">
              <div className="map-grid">
                <div className="map-visual">
                  <svg viewBox="0 0 400 450" className="india-map-svg">
                    <path d="M120,400 L90,360 L80,300 L70,240 L100,200 L95,140 L130,80 L180,50 L200,80 L230,120 L280,180 L290,240 L260,300 L200,380 Z" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
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
                  <p>Our clusters run inside certified tier-4 facilities in key metropolitan networks, bringing high-speed GPU power closer to your local databases.</p>
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
                <h2 className="section-heading">Your Data. Your Models. Your Infrastructure.</h2>
              </div>
              <button 
                className="btn-ghost" 
                onClick={() => setViewArchitectureCode(!viewArchitectureCode)}
              >
                {viewArchitectureCode ? 'View Visual Flow' : 'View as Code (Terraform)'}
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
                          <rect x="10" y="10" width="30" height="40" rx="4" fill="#f8fafc" stroke="#4f46e5" strokeWidth="1.5" />
                          <rect x="50" y="15" width="30" height="40" rx="4" fill="#f8fafc" stroke="#4f46e5" strokeWidth="1.5" />
                          <rect x="90" y="10" width="30" height="40" rx="4" fill="#f8fafc" stroke="#4f46e5" strokeWidth="1.5" />
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
                          <circle cx="30" cy="50" r="15" fill="#f8fafc" stroke="#4f46e5" strokeWidth="1.5" />
                          <path d="M 45 50 L 100 20" stroke="#4f46e5" strokeWidth="2" />
                          <path d="M 45 50 L 100 50" stroke="#4f46e5" strokeWidth="2" />
                          <path d="M 45 50 L 100 80" stroke="#4f46e5" strokeWidth="2" />
                          <rect x="105" y="10" width="60" height="20" rx="4" fill="#f8fafc" stroke="#cbd5e1" />
                          <rect x="105" y="40" width="60" height="20" rx="4" fill="#10b981" stroke="#10b981" />
                          <rect x="105" y="70" width="60" height="20" rx="4" fill="#f8fafc" stroke="#cbd5e1" />
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
                          <circle cx="50" cy="50" r="25" fill="#f8fafc" stroke="#10b981" strokeWidth="2" />
                          <circle cx="150" cy="50" r="25" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
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
                          <rect x="20" y="20" width="40" height="60" rx="6" fill="#f8fafc" stroke="#4f46e5" strokeWidth="1.5" />
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
                          <rect x="145" y="35" width="45" height="30" rx="4" fill="#f8fafc" stroke="#10b981" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ─── REDESIGNED FEATURE SECTION ─── */}
        <section className="section-features" id="features">
          <div className="content-inner">
            <div className="section-header text-left">
              <span className="tag-line tag-blue">BUSINESS OUTCOMES</span>
              <h2 className="title-scale">Why Harikson AI?</h2>
              <p className="sub-scale">Enterprise infrastructure that answers your compliance and cost targets before you deploy.</p>
            </div>

            <div className="features-grid-custom">
              {/* Card 1 */}
              <div className="feat-card border-glow-indigo">
                <div className="feat-header-row">
                  <div className="feat-icon-wrap bg-indigo-50 text-indigo-600">
                    <Code2 size={20} />
                  </div>
                  <h4>Go live in 10 minutes, not 10 weeks.</h4>
                </div>
                <p>Migrate from OpenAI with one line of code change. Swap the base_url parameters and keep your current prompts.</p>
                <div className="mini-editor-box font-mono">
                  <span className="keyword">base_url</span> = <span className="string">"https://api.harikson.ai/v1"</span>
                </div>
                <a href="#developer" className="feat-link">Learn more <ArrowRight size={12} className="inline-arrow" /></a>
              </div>

              {/* Card 2 */}
              <div className="feat-card border-glow-emerald">
                <div className="feat-header-row">
                  <div className="feat-icon-wrap bg-emerald-50 text-emerald-600">
                    <ShieldCheck size={20} />
                  </div>
                  <h4>Your data never crosses a border.</h4>
                </div>
                <p>100% hosted in India. DPDP-compliant by default. Zero data residency risk.</p>
                <div className="mini-tag-row">
                  <span className="mini-badge-pill">🇮🇳 Mumbai</span>
                  <span className="mini-badge-pill">🇮🇳 Delhi</span>
                  <span className="mini-badge-pill">🇮🇳 Bangalore</span>
                  <span className="mini-badge-pill">🇮🇳 Hyderabad</span>
                </div>
                <a href="#security" className="feat-link">Learn more <ArrowRight size={12} className="inline-arrow" /></a>
              </div>

              {/* Card 3 */}
              <div className="feat-card border-glow-amber">
                <div className="feat-header-row">
                  <div className="feat-icon-wrap bg-amber-50 text-amber-600">
                    <CreditCard size={20} />
                  </div>
                  <h4>Cut AI spend by 60%.</h4>
                </div>
                <p>Priced in INR. No dollar volatility. No hidden egress fees.</p>
                <div className="mini-tag-row">
                  <span className="mini-badge-pill amber">₹0.001 / token</span>
                  <span className="mini-badge-pill amber">₹4,999 / mo Pro</span>
                </div>
                <a href="#pricing" className="feat-link">Learn more <ArrowRight size={12} className="inline-arrow" /></a>
              </div>

              {/* Card 4 */}
              <div className="feat-card border-glow-pink">
                <div className="feat-header-row">
                  <div className="feat-icon-wrap bg-pink-50 text-pink-600">
                    <Layers size={20} />
                  </div>
                  <h4>One platform. Hundreds of teams. Zero leakage.</h4>
                </div>
                <p>Row-level tenant isolation. Per-team billing. Custom models per workspace.</p>
                <div className="mini-tag-row">
                  <span className="mini-badge-pill pink">Multi-tenant</span>
                  <span className="mini-badge-pill pink">RBAC</span>
                  <span className="mini-badge-pill pink">SSO Logs</span>
                </div>
                <a href="#security" className="feat-link">Learn more <ArrowRight size={12} className="inline-arrow" /></a>
              </div>

              {/* Card 5 */}
              <div className="feat-card border-glow-purple">
                <div className="feat-header-row">
                  <div className="feat-icon-wrap bg-purple-50 text-purple-600">
                    <Shield size={20} />
                  </div>
                  <h4>Compliance that audits itself.</h4>
                </div>
                <p>DPDP-ready audit trails. Data principal rights. Automated compliance reports.</p>
                <div className="mini-tag-row">
                  <span className="mini-badge-pill purple">SOC2 Prep</span>
                  <span className="mini-badge-pill purple">ISO 27001</span>
                  <span className="mini-badge-pill purple">DPDP 2023</span>
                </div>
                <a href="#security" className="feat-link">Learn more <ArrowRight size={12} className="inline-arrow" /></a>
              </div>

              {/* Card 6 */}
              <div className="feat-card border-glow-cyan">
                <div className="feat-header-row">
                  <div className="feat-icon-wrap bg-cyan-50 text-cyan-600">
                    <BrainCircuit size={20} />
                  </div>
                  <h4>22 Indian languages. Native fluency.</h4>
                </div>
                <p>Hindi, Tamil, Kannada, Marathi, Telugu, Bengali. Not translated. Truly understood.</p>
                <div className="mini-tag-row language-pills">
                  <span className="mini-badge-pill cyan">हिंदी</span>
                  <span className="mini-badge-pill cyan">தமிழ்</span>
                  <span className="mini-badge-pill cyan">ಕನ್ನಡ</span>
                  <span className="mini-badge-pill cyan">తెలుగు</span>
                  <span className="mini-badge-pill cyan">বাংলা</span>
                </div>
                <a href="#how-it-works" className="feat-link">Learn more <ArrowRight size={12} className="inline-arrow" /></a>
              </div>
            </div>
          </div>
        </section>

        {/* ─── PROMPT 5: DEVELOPER EXPERIENCE (DX) ─── */}
        <section className="section-dx" id="developer">
          <div className="content-inner">
            <div className="section-header text-center">
              <span className="tag-line tag-purple">DEVELOPER EXPERIENCE</span>
              <h2 className="title-scale">Try it in 30 seconds</h2>
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
                      <div className="output-meta border-t border-gray-800/40 mt-4 pt-3 text-xs text-gray-455 grid grid-cols-2 gap-2">
                        <div>Latency: <span className="text-indigo-400">142ms</span></div>
                        <div>Cost: <span className="text-indigo-400">₹0.000168</span></div>
                        <div>Region: <span className="text-indigo-400">Mumbai-1</span></div>
                        <div>Status: <span className="text-emerald-400">200 OK</span></div>
                      </div>
                    </div>
                  )}
                  {!isRunning && !hasRun && (
                    <div className="text-gray-400 italic text-center py-12">
                      Click "Run Code" to compile request and inspect live token cost, response payload, and routing telemetry.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Integration snippets */}
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
              <h2 className="title-scale">Security is not a feature. It is the foundation.</h2>
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
                    <g transform="translate(10, 10)">
                      <rect width="180" height="20" rx="4" fill="#f8fafc" stroke="#e2e8f0" />
                      <text x="90" y="14" fill="#0f172a" fontSize="8" textAnchor="middle">User Client Requests</text>
                    </g>
                    <g transform="translate(10, 40)">
                      <rect width="180" height="20" rx="4" fill="#f8fafc" stroke="#4f46e5" />
                      <text x="90" y="14" fill="#0f172a" fontSize="8" textAnchor="middle">WAF Shield &amp; Rate Limiter</text>
                    </g>
                    <g transform="translate(10, 70)">
                      <rect width="180" height="20" rx="4" fill="#f8fafc" stroke="#e2e8f0" />
                      <text x="90" y="14" fill="#0f172a" fontSize="8" textAnchor="middle">Gateway &amp; Router</text>
                    </g>
                    <g transform="translate(10, 100)">
                      <rect width="180" height="20" rx="4" fill="#f8fafc" stroke="#4f46e5" />
                      <text x="90" y="14" fill="#0f172a" fontSize="8" textAnchor="middle">Tenant Isolation (RLS)</text>
                    </g>
                    <g transform="translate(10, 130)">
                      <rect width="180" height="20" rx="4" fill="#10b981" stroke="#10b981" />
                      <text x="90" y="14" fill="#fff" fontSize="8" textAnchor="middle">Private Model Cluster</text>
                    </g>
                    <g transform="translate(10, 160)">
                      <rect width="180" height="20" rx="4" fill="#f8fafc" stroke="#e2e8f0" />
                      <text x="90" y="14" fill="#0f172a" fontSize="8" textAnchor="middle">Secure Vector Storage</text>
                    </g>

                    <line x1="100" y1="30" x2="100" y2="40" stroke="#4f46e5" strokeWidth="1.5" />
                    <line x1="100" y1="60" x2="100" y2="70" stroke="#4f46e5" strokeWidth="1.5" />
                    <line x1="100" y1="90" x2="100" y2="100" stroke="#4f46e5" strokeWidth="1.5" />
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
          <div className="content-inner relative z-10">
            {/* Background design accents */}
            <div className="benchmarks-bg-glow" />
            
            <div className="section-header text-center">
              <span className="tag-line tag-purple">SPEED &amp; EFFICIENCY</span>
              <h2 className="title-scale">Performance Benchmarks</h2>
              <p className="sub-scale">Faster response latency and reduced costs compared to overseas endpoints.</p>
            </div>

            {/* Filter Toggle */}
            <div className="benchmark-toggle-container">
              <div className="benchmark-tabs">
                <button 
                  className={`toggle-btn ${benchmarkFilter === 'latency' ? 'active' : ''}`} 
                  onClick={() => setBenchmarkFilter('latency')}
                >
                  <span className="btn-icon">⚡</span> Latency Comparison
                </button>
                <button 
                  className={`toggle-btn ${benchmarkFilter === 'cost' ? 'active' : ''}`} 
                  onClick={() => setBenchmarkFilter('cost')}
                >
                  <span className="btn-icon">₹</span> Cost Comparison
                </button>
                <button 
                  className={`toggle-btn ${benchmarkFilter === 'throughput' ? 'active' : ''}`} 
                  onClick={() => setBenchmarkFilter('throughput')}
                >
                  <span className="btn-icon">📊</span> Throughput &amp; Scale
                </button>
              </div>
            </div>

            {benchmarkFilter === 'latency' && (
              <div className="benchmark-details text-left">
                <div className="benchmark-panel-grid">
                  <div className="chart-card">
                    <div className="chart-header">
                      <span className="chart-title">TTFT (Time to First Token)</span>
                      <span className="chart-subtitle">Measured in milliseconds — lower is better</span>
                    </div>
                    
                    <div className="bars-list">
                      {/* Harikson Mumbai */}
                      <div className="bar-item highlight-row">
                        <div className="bar-meta">
                          <span className="bar-label font-bold text-gray-900">Harikson Mumbai</span>
                          <span className="bar-badge">SOVEREIGN EDGE</span>
                        </div>
                        <div className="bar-track-wrapper">
                          <div className="bar-track">
                            <div className="bar-fill gradient-fill" style={{ width: '16%' }}>
                              <div className="bar-shimmer" />
                            </div>
                          </div>
                          <span className="bar-val highlight-text">45ms</span>
                        </div>
                      </div>

                      {/* Azure India */}
                      <div className="bar-item">
                        <div className="bar-meta">
                          <span className="bar-label text-gray-600">Azure India</span>
                        </div>
                        <div className="bar-track-wrapper">
                          <div className="bar-track">
                            <div className="bar-fill standard-fill" style={{ width: '43%' }} />
                          </div>
                          <span className="bar-val">120ms</span>
                        </div>
                      </div>

                      {/* OpenAI US */}
                      <div className="bar-item">
                        <div className="bar-meta">
                          <span className="bar-label text-gray-600">OpenAI US</span>
                        </div>
                        <div className="bar-track-wrapper">
                          <div className="bar-track">
                            <div className="bar-fill standard-fill" style={{ width: '100%' }} />
                          </div>
                          <span className="bar-val">280ms</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="benchmark-info-pane">
                    <span className="badge-sovereign">100% Domestic Routing</span>
                    <h3>Zero Oceanic Latency</h3>
                    <p className="text-secondary leading-relaxed mt-4">
                      Because your requests do not cross oceanic sub-sea fiber lines to US or European data centers, we achieve a baseline Time to First Token (TTFT) of under <strong>45ms</strong>. All regional language inference occurs directly within Tier-IV Indian facilities.
                    </p>
                    
                    <div className="metric-callouts-grid">
                      <div className="metric-callout">
                        <span className="metric-number">2.7x</span>
                        <span className="metric-label">Faster than Azure India</span>
                      </div>
                      <div className="metric-callout">
                        <span className="metric-number">6.2x</span>
                        <span className="metric-label">Faster than OpenAI US</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {benchmarkFilter === 'cost' && (
              <div className="benchmark-details text-left">
                <div className="benchmark-panel-grid">
                  <div className="chart-card overflow-hidden no-padding">
                    <div className="chart-header p-6 pb-4">
                      <span className="chart-title">Pricing in Indian Rupees (INR)</span>
                      <span className="chart-subtitle">Standardized cost comparison per 1 Million Tokens</span>
                    </div>
                    
                    <div className="table-responsive">
                      <table className="cost-comparison-table">
                        <thead>
                          <tr>
                            <th>Model Tier</th>
                            <th>Harikson (INR)</th>
                            <th>OpenAI (US)</th>
                            <th>Azure (Global)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="highlight-table-row">
                            <td className="font-semibold">8B-class</td>
                            <td className="highlight-cell">₹1,000 <span className="cell-per">/ 1M</span></td>
                            <td>₹3,200 <span className="cell-per">/ 1M</span></td>
                            <td>₹2,800 <span className="cell-per">/ 1M</span></td>
                          </tr>
                          <tr className="highlight-table-row">
                            <td className="font-semibold">70B-class</td>
                            <td className="highlight-cell">₹4,500 <span className="cell-per">/ 1M</span></td>
                            <td>₹12,000 <span className="cell-per">/ 1M</span></td>
                            <td>₹10,500 <span className="cell-per">/ 1M</span></td>
                          </tr>
                          <tr className="highlight-table-row">
                            <td className="font-semibold">RAG Ingestion</td>
                            <td className="highlight-cell">₹0.50 <span className="cell-per">/ query</span></td>
                            <td>₹1.80 <span className="cell-per">/ query</span></td>
                            <td>₹1.50 <span className="cell-per">/ query</span></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="benchmark-info-pane">
                    <span className="badge-sovereign">Zero Forex Volatility</span>
                    <h3>Save Up to 60% Natively</h3>
                    <p className="text-secondary leading-relaxed mt-4">
                      Avoid cross-border transaction fees, foreign currency exposure, and US-centric premium markup. Harikson AI routes and bills natively in INR, allowing local enterprises to deploy scalable LLMs under predictable budgets.
                    </p>
                    
                    <div className="metric-callouts-grid">
                      <div className="metric-callout">
                        <span className="metric-number">₹0</span>
                        <span className="metric-label">Forex conversion fees</span>
                      </div>
                      <div className="metric-callout">
                        <span className="metric-number">62%</span>
                        <span className="metric-label">Average pricing savings</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {benchmarkFilter === 'throughput' && (
              <div className="benchmark-details text-left">
                <div className="throughput-metrics-grid">
                  <div className="throughput-card">
                    <div className="throughput-icon">⚡</div>
                    <div className="throughput-val">2,400 T/s</div>
                    <div className="throughput-title">Concurrent Token Throughput</div>
                    <p className="throughput-desc">High-throughput custom inference engines built specifically for high-concurrency enterprise RAG pipelines.</p>
                  </div>
                  <div className="throughput-card">
                    <div className="throughput-icon">🖥️</div>
                    <div className="throughput-val">512 H100s</div>
                    <div className="throughput-title">Dedicated Compute Clusters</div>
                    <p className="throughput-desc">Private GPU capacity natively managed inside Indian availability zones with hardware SLA guarantees.</p>
                  </div>
                  <div className="throughput-card">
                    <div className="throughput-icon">⏳</div>
                    <div className="throughput-val">&lt; 30 Sec</div>
                    <div className="throughput-title">Auto-Cluster Scaling</div>
                    <p className="throughput-desc">Instant provisioning of additional virtual nodes to meet high-volume user traffic demands without drops in performance.</p>
                  </div>
                  <div className="throughput-card">
                    <div className="throughput-icon">👥</div>
                    <div className="throughput-val">50,000+</div>
                    <div className="throughput-title">Users Per GPU Cluster</div>
                    <p className="throughput-desc">Highly optimized memory virtualization layer allowing massive concurrent user connections per cluster.</p>
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
              <h2 className="title-scale">Customer Success Stories</h2>
            </div>

            <div className="stories-list-wrapper">
              {/* Card 1 */}
              <div className="story-card-wrapper">
                <div className="story-card-content">
                  <div className="story-text-container">
                    <span className="story-badge-custom">LEGAL TECHNOLOGY</span>
                    <h4>LexAI Solutions: 50,000 precursor contract analysis</h4>
                    <p className="story-paragraph">
                      <strong>Problem:</strong> LexAI could not pass confidential client agreements through US-based OpenAI endpoints without violating NDAs and data residency laws. Lawyers spent 40 minutes analyzing each precedent.<br /><br />
                      <strong>Solution:</strong> Deployed a private Llama-3-70B instance inside Harikson's Mumbai VPC gateway with dedicated workspace schema isolation.<br /><br />
                      <strong>Results:</strong> Contract analysis reduced to 8 seconds, achieving full DPDP compliance and saving over ₹12 Lakhs annually in API costs.
                    </p>
                  </div>
                  <div className="story-stats-container">
                    <div className="story-stat-card">
                      <div className="story-stat-val">8 Sec</div>
                      <div className="story-stat-label">Precedent Analysis</div>
                    </div>
                    <div className="story-stat-card">
                      <div className="story-stat-val emerald">₹12L</div>
                      <div className="story-stat-label">Annual Savings</div>
                    </div>
                  </div>
                </div>
                <div className="story-quote-signature">
                  <span>— CTO, LexAI Solutions</span>
                </div>
              </div>

              {/* Card 2 */}
              <div className="story-card-wrapper">
                <div className="story-card-content">
                  <div className="story-text-container">
                    <span className="story-badge-custom">BANKING &amp; FINANCE</span>
                    <h4>Leading NBFC: Regional customer dialer agents</h4>
                    <p className="story-paragraph">
                      <strong>Problem:</strong> Standard models failed on Hinglish, regional dialects (Tamil, Kannada), and branch contexts. Security teams rejected foreign APIs due to data sovereignty audits.<br /><br />
                      <strong>Solution:</strong> Fine-tuned a Qwen3-72B model on private customer history logs inside a secure local cloud environment.<br /><br />
                      <strong>Results:</strong> Support resolution times dropped by 68% while regional language accuracy hit 94%. Deployed across 10 branches in under a week.
                    </p>
                  </div>
                  <div className="story-stats-container">
                    <div className="story-stat-card">
                      <div className="story-stat-val">-68%</div>
                      <div className="story-stat-label">Resolution Time</div>
                    </div>
                    <div className="story-stat-card">
                      <div className="story-stat-val emerald">10</div>
                      <div className="story-stat-label">Active Branches</div>
                    </div>
                  </div>
                </div>
                <div className="story-quote-signature">
                  <span>— Head of Customer Experience, NBFC Group</span>
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
              <h2 className="title-scale">Pricing That Respects Indian Budgets</h2>
              <p className="sub-scale font-medium mt-1">No forex risk. Direct invoicing. Cancel anytime.</p>
              
              <div className="flex justify-center items-center gap-3 mt-6">
                <span className={`text-xs ${billingPeriod === 'monthly' ? 'text-gray-800' : 'text-gray-400'}`}>Monthly Billing</span>
                <button 
                  className="w-12 h-6 bg-indigo-600 rounded-full p-0.5 transition-colors focus:outline-none relative" 
                  onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'annual' : 'monthly')}
                >
                  <span className={`w-5 h-5 bg-white rounded-full block shadow-sm transform transition-transform ${billingPeriod === 'annual' ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
                <span className={`text-xs ${billingPeriod === 'annual' ? 'text-gray-800' : 'text-gray-400'}`}>
                  Annual Billing <span className="bg-emerald-500/20 text-emerald-600 px-2 py-0.5 rounded text-[10px] font-bold ml-1">2 Months Free</span>
                </span>
              </div>
            </div>

            <div className="pricing-grid-custom mt-12">
              {/* Card 1: Starter */}
              <div className="price-card-custom">
                <h3 className="plan-name">Starter</h3>
                <div className="plan-price">₹0 <span className="period">/ month</span></div>
                <p className="plan-desc">100K tokens included free</p>
                <ul className="plan-feats mt-6">
                  <li><CheckCircle2 size={12} className="text-indigo-600" /> Qwen3-8B model access</li>
                  <li><CheckCircle2 size={12} className="text-indigo-600" /> 1 isolated workspace</li>
                  <li><CheckCircle2 size={12} className="text-indigo-600" /> Developer dashboard</li>
                  <li><XCircle size={12} className="text-gray-450" /> Fine-tuning</li>
                  <li><XCircle size={12} className="text-gray-455" /> Tenant isolation override</li>
                </ul>
                <div className="mt-8">
                  <Link href="/signup" passHref legacyBehavior><a className="btn-price">Start Free</a></Link>
                </div>
              </div>

              {/* Card 2: Professional */}
              <div className="price-card-custom highlighted border-glow-indigo">
                <div className="badge-promo">MOST POPULAR</div>
                <h3 className="plan-name">Professional</h3>
                <div className="plan-price">
                  {billingPeriod === 'annual' ? '₹4,166' : '₹4,999'} <span className="period">/ month</span>
                </div>
                <p className="plan-desc">5M tokens included · ₹0.001 after</p>
                <ul className="plan-feats mt-6">
                  <li><CheckCircle2 size={12} className="text-indigo-600" /> All models (8B, 32B, 72B)</li>
                  <li><CheckCircle2 size={12} className="text-indigo-600" /> Up to 10 isolated tenants</li>
                  <li><CheckCircle2 size={12} className="text-indigo-600" /> Webhook logs &amp; analytics</li>
                  <li><CheckCircle2 size={12} className="text-indigo-600" /> Basic RAG (10K documents)</li>
                  <li><CheckCircle2 size={12} className="text-indigo-600" /> 99.9% Uptime SLA</li>
                </ul>
                <div className="mt-8">
                  <Link href="/signup" passHref legacyBehavior><a className="btn-price primary-gradient">Start Pro</a></Link>
                </div>
              </div>

              {/* Card 3: Business */}
              <div className="price-card-custom">
                <h3 className="plan-name">Business</h3>
                <div className="plan-price">
                  {billingPeriod === 'annual' ? '₹20,833' : '₹24,999'} <span className="period">/ month</span>
                </div>
                <p className="plan-desc">25M tokens · dedicated resources</p>
                <ul className="plan-feats mt-6">
                  <li><CheckCircle2 size={12} className="text-indigo-600" /> Everything in Pro</li>
                  <li><CheckCircle2 size={12} className="text-indigo-600" /> Up to 50 isolated tenants</li>
                  <li><CheckCircle2 size={12} className="text-indigo-600" /> Advanced RAG (50K docs)</li>
                  <li><CheckCircle2 size={12} className="text-indigo-600" /> Fine-tuning engines</li>
                  <li><CheckCircle2 size={12} className="text-indigo-600" /> 99.95% Uptime SLA</li>
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
                  <li><CheckCircle2 size={12} className="text-indigo-600" /> Everything in Business</li>
                  <li><CheckCircle2 size={12} className="text-indigo-600" /> Unlimited tokens &amp; tenants</li>
                  <li><CheckCircle2 size={12} className="text-indigo-600" /> Air-gapped / local deployments</li>
                  <li><CheckCircle2 size={12} className="text-indigo-600" /> Dedicated GPU resources</li>
                  <li><CheckCircle2 size={12} className="text-indigo-600" /> 99.99% Uptime SLA</li>
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
                    <tr className="bg-gray-100 border-b border-gray-200 text-[10px] text-gray-500 font-bold uppercase">
                      <th className="p-3">Feature</th>
                      <th className="p-3">Starter</th>
                      <th className="p-3">Professional</th>
                      <th className="p-3">Business</th>
                      <th className="p-3">Enterprise</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
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
              <h2 className="title-scale">Frequently Asked Questions</h2>
              <p className="sub-scale">Specific answers about sovereign setups, compliance guidelines, and system tech.</p>
            </div>

            <div className="faq-wrapper grid grid-cols-1 lg:grid-cols-4 gap-8 mt-8">
              <div className="faq-menu flex flex-col gap-2 text-left">
                <button className={`faq-tab-btn ${faqCategory === 'sovereignty' ? 'active' : ''}`} onClick={() => { setFaqCategory('sovereignty'); setOpenFaq(null); }}>Data Sovereignty</button>
                <button className={`faq-tab-btn ${faqCategory === 'compliance' ? 'active' : ''}`} onClick={() => { setFaqCategory('compliance'); setOpenFaq(null); }}>Compliance</button>
                <button className={`faq-tab-btn ${faqCategory === 'security' ? 'active' : ''}`} onClick={() => { setFaqCategory('security'); setOpenFaq(null); }}>Security</button>
                <button className={`faq-tab-btn ${faqCategory === 'technical' ? 'active' : ''}`} onClick={() => { setFaqCategory('technical'); setOpenFaq(null); }}>Technical Details</button>
                <button className={`faq-tab-btn ${faqCategory === 'deployment' ? 'active' : ''}`} onClick={() => { setFaqCategory('deployment'); setOpenFaq(null); }}>Deployment</button>
                <button className={`faq-tab-btn ${faqCategory === 'pricing' ? 'active' : ''}`} onClick={() => { setFaqCategory('pricing'); setOpenFaq(null); }}>Pricing</button>
              </div>

              <div className="faq-list lg:col-span-3 text-left">
                {faqData[faqCategory].map((faq, idx) => (
                  <div key={idx} className="faq-item border-b border-gray-200 py-4">
                    <button className="faq-question flex justify-between items-center w-full text-sm font-semibold py-2 focus:outline-none" onClick={() => setOpenFaq(openFaq === idx ? null : idx)}>
                      <span>{faq.q}</span>
                      <ChevronDown size={16} className={`transform transition-transform ${openFaq === idx ? 'rotate-180' : ''}`} />
                    </button>
                    {openFaq === idx && (
                      <div className="faq-answer text-xs text-gray-600 mt-2 leading-relaxed animate-fade-in">
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── SECTION 1: PREMIUM CTA ─── */}
        <section className="section-premium-cta">
          <div className="content-inner premium-cta-grid">
            <div className="cta-left">
              <h2>Ready to Build Enterprise AI?</h2>
              <p>Deploy secure, compliant AI infrastructure in India with complete ownership of your data, models, and deployment.</p>
            </div>
            <div className="cta-right">
              <Link href="/signup" passHref legacyBehavior><a className="btn-premium-primary">Start Free</a></Link>
              <button className="btn-premium-secondary" onClick={() => alert('Architecture consultation request logged. We will contact you shortly.')}>Book Architecture Session</button>
              <a href="mailto:sales@harikson.ai" className="btn-premium-link">Talk to Sales →</a>
              <button className="btn-premium-outline" onClick={() => alert('Demo request logged. Enterprise sales will reach out within 2 hours.')}>Request Enterprise Demo</button>
            </div>
          </div>
        </section>

        {/* ─── SECTION 2: TRUST METRICS BAR ─── */}
        <section className="section-trust-metrics">
          <div className="content-inner trust-metrics-wrap">
            <div className="trust-metric-item"><CheckCircle2 size={14} className="text-emerald-500" /> <span>99.99% SLA</span></div>
            <div className="trust-metric-item">🇮🇳 <span>100% India Data Residency</span></div>
            <div className="trust-metric-item"><Zap size={14} className="text-indigo-600" /> <span>OpenAI Compatible API</span></div>
            <div className="trust-metric-item"><ShieldCheck size={14} className="text-emerald-500" /> <span>DPDP Ready</span></div>
            <div className="trust-metric-item"><Lock size={14} className="text-indigo-600" /> <span>AES-256 Encryption</span></div>
            <div className="trust-metric-item"><Activity size={14} className="text-indigo-600" /> <span>24×7 Enterprise Support</span></div>
          </div>
        </section>

        {/* ─── MAIN FOOTER & DIRECTORY ─── */}
        <footer className="footer-premium" id="founders-contact">
          <div className="content-inner footer-grid-columns">
            {/* Column 1: Brand & Badges */}
            <div className="footer-brand-col">
              <span className="footer-logo">⚡ Harikson AI</span>
              <p className="footer-desc mt-2">
                India's sovereign enterprise AI infrastructure platform. Enforcing local data ownership, localized network latency, and strict DPDP Act compliance for critical infrastructure.
              </p>
              <div className="brand-badges-grid mt-4">
                <span className="brand-badge-pill">🇮🇳 Made in India</span>
                <span className="brand-badge-pill">🛡️ Enterprise Ready</span>
                <span className="brand-badge-pill">💻 Developer First</span>
                <span className="brand-badge-pill">⚖️ DPDP Ready</span>
                <span className="brand-badge-pill">🔌 API First</span>
                <span className="brand-badge-pill">⚡ OpenAI Compatible</span>
              </div>
            </div>

            {/* Column 2: Platform */}
            <div className="footer-link-col">
              <span className="col-title" onClick={() => toggleFooterAccordion(0)}>Platform <ChevronDown size={14} className="mobile-only-chevron" /></span>
              <div className={`col-links ${activeFooterAccordion === 0 ? 'mobile-open' : ''}`}>
                <a href="#scale">AI Gateway</a>
                <a href="#how-it-works">Private LLM</a>
                <a href="#how-it-works">AI Agents</a>
                <a href="#how-it-works">Enterprise RAG</a>
                <a href="#features">Model Router</a>
                <a href="#features">Prompt Studio</a>
                <a href="#features">Prompt Management</a>
                <a href="#features">Vector Database</a>
                <a href="#features">Multi Tenant Workspace</a>
                <a href="#benchmarks">Analytics</a>
                <a href="#developer">API Sandbox</a>
                <a href="#pricing">Billing</a>
              </div>
            </div>

            {/* Column 3: Solutions */}
            <div className="footer-link-col">
              <span className="col-title" onClick={() => toggleFooterAccordion(1)}>Solutions <ChevronDown size={14} className="mobile-only-chevron" /></span>
              <div className={`col-links ${activeFooterAccordion === 1 ? 'mobile-open' : ''}`}>
                <a href="#scale">Government</a>
                <a href="#scale">Banking</a>
                <a href="#scale">Healthcare</a>
                <a href="#scale">Manufacturing</a>
                <a href="#scale">Legal</a>
                <a href="#scale">Education</a>
                <a href="#scale">Customer Support</a>
                <a href="#scale">Knowledge Management</a>
                <a href="#scale">Internal AI</a>
                <a href="#scale">Enterprise Search</a>
                <a href="#scale">Document Intelligence</a>
              </div>
            </div>

            {/* Column 4: Developers */}
            <div className="footer-link-col">
              <span className="col-title" onClick={() => toggleFooterAccordion(2)}>Developers <ChevronDown size={14} className="mobile-only-chevron" /></span>
              <div className={`col-links ${activeFooterAccordion === 2 ? 'mobile-open' : ''}`}>
                <a href="#developer">Documentation</a>
                <a href="#developer">Quick Start</a>
                <a href="#developer">API Reference</a>
                <a href="#developer">SDKs</a>
                <a href="#developer">CLI</a>
                <a href="#developer">Python</a>
                <a href="#developer">Node.js</a>
                <a href="#developer">Go</a>
                <a href="#developer">Java</a>
                <a href="#developer">Terraform</a>
                <a href="#developer">Docker</a>
                <a href="#developer">Kubernetes</a>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a>
                <a href="#developer">Postman Collection</a>
                <a href="#developer">Release Notes</a>
                <a href="#developer">Status Page</a>
              </div>
            </div>

            {/* Column 5: Security & Compliance */}
            <div className="footer-link-col">
              <span className="col-title" onClick={() => toggleFooterAccordion(3)}>Security & Compliance <ChevronDown size={14} className="mobile-only-chevron" /></span>
              <div className={`col-links ${activeFooterAccordion === 3 ? 'mobile-open' : ''}`}>
                <a href="#security">Security Overview</a>
                <a href="#security">Trust Center</a>
                <a href="#security">DPDP Compliance</a>
                <a href="#security">Data Residency</a>
                <a href="#security">Encryption</a>
                <a href="#security">Tenant Isolation</a>
                <a href="#security">RBAC</a>
                <a href="#security">SSO</a>
                <a href="#security">Audit Logs</a>
                <a href="#security">Disaster Recovery</a>
                <a href="#security">Compliance Center</a>
                <a href="#security">Privacy</a>
                <a href="#security">Responsible AI</a>
              </div>
            </div>

            {/* Column 6: Company */}
            <div className="footer-link-col">
              <span className="col-title" onClick={() => toggleFooterAccordion(4)}>Company <ChevronDown size={14} className="mobile-only-chevron" /></span>
              <div className={`col-links ${activeFooterAccordion === 4 ? 'mobile-open' : ''}`}>
                <a href="#founders-contact">About</a>
                <a href="#scale">Customers</a>
                <a href="#stories">Case Studies</a>
                <a href="#founders-contact">Partners</a>
                <a href="#founders-contact">Blog</a>
                <a href="#founders-contact">Careers</a>
                <a href="#founders-contact">Events</a>
                <a href="#founders-contact">Press</a>
                <a href="#founders-contact">Contact Sales</a>
                <a href="#founders-contact">Support</a>
                <a href="#founders-contact">Media Kit</a>
                <a href="#founders-contact">Investor Relations</a>
              </div>
            </div>
          </div>

          {/* ─── SECTION 4: ENTERPRISE CONTACT CARD & NEWSLETTER ─── */}
          <div className="content-inner footer-contact-newsletter">
            {/* Contact Card */}
            <div className="enterprise-contact-card">
              <h4>🏢 Harikson Enterprise Support</h4>
              <p className="address mt-2">Level 5, Block B, Outer Ring Road, Tech Park, Bangalore, KA, India</p>
              <div className="contact-details mt-4">
                <div><span>Sales Email:</span> <a href="mailto:sales@harikson.ai">sales@harikson.ai</a></div>
                <div><span>Support Email:</span> <a href="mailto:support@harikson.ai">support@harikson.ai</a></div>
                <div><span>Phone:</span> <a href="tel:18003098890">1800-309-8890 (Toll-Free)</a></div>
                <div><span>Avg SLA Response:</span> <span className="highlight-text">&lt; 2 Hours</span></div>
                <div><span>Business Hours:</span> 24x7 Enterprise NOC Operations</div>
              </div>
            </div>

            {/* Newsletter */}
            <div className="newsletter-card">
              <h4>Stay Updated</h4>
              <p className="subtitle mt-2">Receive product updates, release notes, security advisories, and enterprise AI insights.</p>
              <form className="newsletter-form mt-4" onSubmit={(e) => { e.preventDefault(); alert('Subscribed corporate email successfully.'); }}>
                <input type="email" placeholder="Enter corporate email address..." required className="newsletter-input" />
                <button type="submit" className="newsletter-btn">Subscribe</button>
              </form>
            </div>
          </div>

          {/* ─── FOOTER BOTTOM: LEGAL, SOCIALS & PLATFORM STATUS ─── */}
          <div className="content-inner footer-bottom-panel">
            <div className="footer-bottom-grid">
              {/* Technical Status & Socials */}
              <div className="footer-bottom-left">
                <div className="technical-status-pill">
                  <span className="status-dot pulsing" />
                  <span className="status-text">All Systems Operational (99.99% Uptime)</span>
                  <a href="#developer" className="status-link">Status Page</a>
                </div>
                <div className="social-links-row mt-4">
                  <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">LinkedIn</a>
                  <a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a>
                  <a href="https://x.com" target="_blank" rel="noopener noreferrer">X</a>
                  <a href="https://youtube.com" target="_blank" rel="noopener noreferrer">YouTube</a>
                  <a href="https://discord.com" target="_blank" rel="noopener noreferrer">Discord</a>
                </div>
              </div>

              {/* Legal Links */}
              <div className="footer-legal-links">
                <a href="#security">Privacy Policy</a>
                <a href="#security">Terms of Service</a>
                <a href="#security">Security Policy</a>
                <a href="#security">Cookie Policy</a>
                <a href="#security">Data Processing Agreement</a>
                <a href="#security">Acceptable Use Policy</a>
                <a href="#security">Trademark</a>
                <a href="#security">Licenses</a>
                <a href="#security">Responsible AI Policy</a>
              </div>
            </div>

            <div className="footer-copyright-row mt-8 border-t border-gray-200/50 pt-6">
              <div>© 2026 Harikson AI Technologies Pvt. Ltd. All Rights Reserved.</div>
              <div className="origin-statement">Built with ❤️ in India. Made in India. Built for the World.</div>
            </div>
          </div>
        </footer>

      </div>

      <style jsx global>{`
        /* ─── GLOBAL DESIGN SYSTEM STYLES (LIGHT MODE) ─── */
        body {
          background-color: #FFFFFF;
          color: #0F172A;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          margin: 0;
          padding: 0;
          overflow-x: hidden;
        }

        .landing-container {
          background-color: #FFFFFF;
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
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid #e2e8f0;
        }
        .logo-section {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .logo-icon {
          font-size: 20px;
          color: #4f46e5;
        }
        .logo-text {
          font-weight: 900;
          font-size: 18px;
          letter-spacing: -0.03em;
          color: #0f172a;
        }
        .nav-links-desktop {
          display: flex;
          align-items: center;
          gap: 24px;
        }
        .nav-link {
          font-size: 13.5px;
          font-weight: 500;
          color: #475569;
          text-decoration: none;
          transition: color 0.15s ease;
        }
        .nav-link:hover {
          color: #0f172a;
        }
        .nav-link-btn {
          font-size: 13px;
          font-weight: 600;
          background: #4f46e5;
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
          background: radial-gradient(circle at 20% 20%, rgba(79, 70, 229, 0.04) 0%, transparent 50%),
                      radial-gradient(circle at 80% 50%, rgba(139, 92, 246, 0.02) 0%, transparent 60%);
          pointer-events: none;
          opacity: 0.85;
          animation: morphMesh ${reducedMotion ? '0s' : '20s'} ease-in-out infinite alternate;
        }
        @keyframes morphMesh {
          0% { transform: scale(1) translate(0, 0); }
          50% { transform: scale(1.03) translate(1%, 2%); }
          100% { transform: scale(1) translate(-1%, -2%); }
        }

        /* Particle drift backdrop */
        .particle-container {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 100vh;
          overflow: hidden;
          z-index: 2;
          pointer-events: none;
        }
        .particle-dot {
          position: absolute;
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: rgba(79, 70, 229, 0.15);
          animation: floatParticle 20s linear infinite;
        }
        @keyframes floatParticle {
          0% { transform: translateY(0) translateX(0); opacity: 0.1; }
          50% { opacity: 0.5; }
          100% { transform: translateY(-120px) translateX(40px); opacity: 0; }
        }

        /* Subtle grid pattern overlay (Sleek Dotted Matrix) */
        .subtle-grid-bg {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 100vh;
          z-index: 1;
          opacity: 0.45;
          pointer-events: none;
          background-size: 24px 24px;
          background-image: radial-gradient(circle, #cbd5e1 1px, transparent 1px);
        }

        /* Hero Layout */
        .section-hero {
          position: relative;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 48px;
          z-index: 5;
        }
        .hero-grid {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 48px;
          align-items: center;
          max-width: 1280px;
          margin: 0 auto;
          width: 100%;
          position: relative;
          z-index: 10;
        }

        .trust-pills-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 24px;
        }
        .trust-pill {
          background: rgba(248, 250, 252, 0.9);
          border: 1px solid #cbd5e1;
          backdrop-filter: blur(12px);
          font-size: 11px;
          font-weight: 600;
          color: #475569;
          padding: 6px 14px;
          border-radius: 9999px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.03);
        }

        .hero-title {
          font-size: 56px;
          font-weight: 800;
          line-height: 1.15;
          letter-spacing: -0.03em;
          color: #0F172A;
          margin-bottom: 20px;
        }
        .gradient-text {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .hero-sub {
          font-size: 18px;
          color: #475569;
          line-height: 1.6;
          max-width: 580px;
          margin-bottom: 36px;
        }

        .hero-ctas {
          display: flex;
          gap: 16px;
        }
        .btn-hero-primary {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: #ffffff;
          font-size: 15px;
          font-weight: 600;
          padding: 14px 28px;
          border-radius: 8px;
          text-decoration: none;
          box-shadow: 0 4px 14px rgba(79, 70, 229, 0.25);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .btn-hero-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(79, 70, 229, 0.35);
        }
        .btn-hero-secondary {
          background: transparent;
          color: #0f172a;
          font-size: 15px;
          font-weight: 600;
          padding: 14px 28px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: background 0.15s ease;
        }
        .btn-hero-secondary:hover {
          background: rgba(0, 0, 0, 0.03);
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
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.18);
          transform: rotateY(-6deg) rotateX(5deg);
          transition: transform 0.5s ease;
          animation: floatMockup ${reducedMotion ? '0s' : '6s'} ease-in-out infinite alternate;
        }
        @keyframes floatMockup {
          0% { transform: rotateY(-6deg) rotateX(5deg) translateY(0); }
          100% { transform: rotateY(-6deg) rotateX(5deg) translateY(-8px); }
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
          bottom: -70px;
          left: -20px;
          background: #07090e;
          border: 1px solid #1f2937;
          border-radius: 8px;
          width: 320px;
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.25);
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
          font-size: 10.5px;
          line-height: 1.5;
        }
        .prompt {
          color: #818cf8;
          margin-right: 6px;
        }
        .terminal-input {
          color: #f8fafc;
          font-weight: 500;
          margin-bottom: 6px;
        }
        .cursor {
          color: #818cf8;
          font-weight: bold;
          animation: blink 1s step-end infinite;
        }
        @keyframes blink {
          50% { opacity: 0; }
        }

        /* Floating Badges */
        .floating-badge {
          position: absolute;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 9999px;
          padding: 6px 12px;
          font-size: 10px;
          font-weight: 700;
          color: #0f172a;
          z-index: 15;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          animation: floatBadge ${reducedMotion ? '0s' : '4s'} ease-in-out infinite alternate;
        }
        @keyframes floatBadge {
          0% { transform: translateY(0); }
          100% { transform: translateY(-5px); }
        }
        .badge-dpdp { top: -20px; right: 20px; animation-delay: 0.5s; }
        .badge-price { bottom: 40px; right: -20px; animation-delay: 1s; }
        .badge-region { top: 60px; left: -40px; animation-delay: 1.5s; }

        /* Infinite Scrolling Logos */
        .infinite-logo-wrap {
          margin-top: 84px;
          border-top: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
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
          font-weight: 800;
          font-size: 15px;
          text-transform: uppercase;
          color: #94a3b8;
          transition: color 0.15s ease;
          cursor: default;
        }
        .logo-track span:hover {
          color: #0f172a;
        }

        /* ─── ENTERPRISE TRUST SECTION ─── */
        .section-scale {
          background-color: #F8FAFC;
          border-bottom: 1px solid #e2e8f0;
        }
        .title-scale {
          font-size: 36px;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin-bottom: 12px;
          color: #0F172A;
        }
        .text-center {
          text-align: center;
        }
        .text-left {
          text-align: left;
        }
        .sub-scale {
          font-size: 16px;
          color: #475569;
          max-width: 620px;
          margin-top: 12px;
          margin-bottom: 48px;
        }
        .text-center .sub-scale {
          margin-left: auto;
          margin-right: auto;
        }
        .text-left .sub-scale {
          margin-left: 0;
          margin-right: auto;
        }
        .section-header:not(.text-center) .sub-scale {
          margin-left: 0;
          margin-right: auto;
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
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          border: 1px solid #e2e8f0;
          border-radius: 16px;
        }
        .metric-val {
          font-size: 32px;
          font-weight: 900;
          color: #0f172a;
          margin-bottom: 4px;
        }
        .metric-label {
          font-size: 12px;
          color: #475569;
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
          color: #94a3b8;
          text-transform: uppercase;
          cursor: help;
          position: relative;
          transition: color 0.15s ease, transform 0.15s ease;
        }
        .logo-item:hover {
          color: #4f46e5;
          transform: scale(1.05);
        }
        .logo-item[data-tooltip]::after {
          content: attr(data-tooltip);
          position: absolute;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #0f172a;
          font-size: 10px;
          padding: 6px 10px;
          border-radius: 6px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.15s ease;
          box-shadow: 0 10px 20px rgba(0,0,0,0.15);
        }
        .logo-item:hover[data-tooltip]::after {
          opacity: 1;
        }

        /* Map Section */
        .deployment-map-container {
          background: rgba(255, 255, 255, 0.4);
          border: 1px solid #e2e8f0;
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
          fill: #4f46e5;
        }
        .map-dot-pulse {
          fill: #4f46e5;
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
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 11px;
          color: #0f172a;
          text-align: left;
          box-shadow: 0 10px 25px rgba(0,0,0,0.15);
          z-index: 20;
          width: 140px;
          top: 10px;
          left: 10px;
        }
        .pop-title {
          font-weight: bold;
          margin-bottom: 4px;
          color: #4f46e5;
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
          background-color: #cbd5e1;
        }
        .region-list .dot.active {
          background-color: #10b981;
          box-shadow: 0 0 8px #10b981;
        }
        .btn-ghost {
          background: transparent;
          border: 1px solid #cbd5e1;
          color: #475569;
          font-size: 12px;
          font-weight: 600;
          padding: 8px 18px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-ghost:hover {
          color: #0f172a;
          border-color: #94a3b8;
          background: rgba(0, 0, 0, 0.02);
        }

        /* ─── ARCHITECTURE SECTION ─── */
        .section-howitworks {
          background-color: #FFFFFF;
          border-bottom: 1px solid #e2e8f0;
          color: #0F172A;
        }
        .section-heading {
          font-size: 36px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: #0F172A;
          margin-bottom: 12px;
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
          border-left: 2px solid #cbd5e1;
          text-align: left;
          cursor: pointer;
          font-weight: 600;
          font-size: 14.5px;
          color: #64748b;
          transition: all 0.15s ease;
        }
        .arch-step-item.active {
          color: #4f46e5;
          border-color: #4f46e5;
          background: rgba(79, 70, 229, 0.04);
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
          color: #4f46e5;
          letter-spacing: 0.05em;
          margin-bottom: 4px;
        }

        /* ─── FEATURES SECTION (REDESIGNED) ─── */
        .section-features {
          background-color: #F8FAFC;
          border-bottom: 1px solid #e2e8f0;
        }
        .features-grid-custom {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        .feat-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 28px;
          text-align: left;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.01);
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1),
                      border-color 0.25s cubic-bezier(0.4, 0, 0.2, 1),
                      box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .feat-card:hover {
          transform: translateY(-5px);
        }
        
        /* Colored Borders on hover */
        .feat-card.border-glow-indigo:hover { border-color: #4f46e5; box-shadow: 0 20px 25px -5px rgba(79, 70, 229, 0.1), 0 10px 10px -5px rgba(79, 70, 229, 0.04); }
        .feat-card.border-glow-emerald:hover { border-color: #10b981; box-shadow: 0 20px 25px -5px rgba(16, 185, 129, 0.1), 0 10px 10px -5px rgba(16, 185, 129, 0.04); }
        .feat-card.border-glow-amber:hover { border-color: #d97706; box-shadow: 0 20px 25px -5px rgba(217, 119, 6, 0.1), 0 10px 10px -5px rgba(217, 119, 6, 0.04); }
        .feat-card.border-glow-pink:hover { border-color: #db2777; box-shadow: 0 20px 25px -5px rgba(219, 39, 119, 0.1), 0 10px 10px -5px rgba(219, 39, 119, 0.04); }
        .feat-card.border-glow-purple:hover { border-color: #7c3aed; box-shadow: 0 20px 25px -5px rgba(124, 58, 237, 0.1), 0 10px 10px -5px rgba(124, 58, 237, 0.04); }
        .feat-card.border-glow-cyan:hover { border-color: #0891b2; box-shadow: 0 20px 25px -5px rgba(8, 145, 178, 0.15), 0 10px 10px -5px rgba(8, 145, 178, 0.04); }

        .feat-header-row {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
        }
        .feat-icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: transform 0.2s ease;
        }
        .feat-card:hover .feat-icon-wrap {
          transform: rotate(8deg) scale(1.05);
        }
        
        .feat-card h4 {
          font-size: 17px;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.35;
          margin: 0;
        }
        .feat-card p {
          font-size: 13.5px;
          color: #475569;
          line-height: 1.55;
          margin: 0 0 20px 0;
          flex: 1;
        }

        /* Monospace snippet styling */
        .mini-editor-box {
          background: #0f172a;
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 11px;
          color: #94a3b8;
          margin-bottom: 24px;
        }
        .mini-editor-box .keyword { color: #f43f5e; }
        .mini-editor-box .string { color: #10b981; }

        /* Stylized tag arrays */
        .mini-tag-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 24px;
          min-height: 28px;
        }
        .mini-badge-pill {
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          color: #475569;
          font-size: 10.5px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 9999px;
        }
        /* Color themes for badges */
        .mini-badge-pill.amber { background: rgba(245, 158, 11, 0.06); border-color: rgba(245, 158, 11, 0.15); color: #b45309; }
        .mini-badge-pill.pink { background: rgba(236, 72, 153, 0.06); border-color: rgba(236, 72, 153, 0.15); color: #be185d; }
        .mini-badge-pill.purple { background: rgba(139, 92, 246, 0.06); border-color: rgba(139, 92, 246, 0.15); color: #6d28d9; }
        .mini-badge-pill.cyan { background: rgba(6, 182, 212, 0.06); border-color: rgba(6, 182, 212, 0.15); color: #0891b2; }

        .feat-link {
          font-size: 13px;
          font-weight: 600;
          color: #4f46e5;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 4px;
          width: fit-content;
        }
        .inline-arrow {
          transition: transform 0.2s ease;
        }
        .feat-link:hover .inline-arrow {
          transform: translateX(4px);
        }

        /* ─── DEVELOPER SECTION ─── */
        .section-dx {
          background-color: #FFFFFF;
          border-bottom: 1px solid #e2e8f0;
        }
        .dx-split-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        .dx-panel {
          border: 1px solid #cbd5e1;
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
          color: #94a3b8;
          font-family: monospace;
          font-size: 12px;
          cursor: pointer;
          border-right: 1px solid #334155;
          transition: all 0.15s ease;
        }
        .tab-btn.active {
          background: #111827;
          color: #818cf8;
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
          color: #a5b4fc;
        }
        .panel-footer {
          padding: 12px 20px;
          border-top: 1px solid #334155;
          background: #1f2937;
          display: flex;
          justify-content: flex-end;
        }
        .btn-run {
          background: #4f46e5;
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
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 14px;
        }
        .integ-card .text-indigo-400 {
          color: #4f46e5;
        }
        .green-status-dot {
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
          display: inline-block;
        }

        /* ─── SECURITY SECTION ─── */
        .section-security {
          background-color: #F8FAFC;
          border-bottom: 1px solid #e2e8f0;
        }
        .security-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        .compliance-card {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          padding: 16px;
        }
        .compliance-card.alert {
          border-color: #f59e0b;
        }
        .compliance-card .badge-title {
          font-weight: bold;
          font-size: 13px;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }
        .compliance-card p {
          font-size: 11px;
          color: #475569;
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
          color: #475569;
          line-height: 1.5;
        }
        .sec-features-list li strong {
          color: #0f172a;
        }
        .timeline-node {
          border-top: 2px solid #cbd5e1;
          padding-top: 12px;
        }
        .timeline-node.active {
          border-color: #4f46e5;
        }
        .node-date {
          font-size: 10px;
          color: #64748b;
          font-weight: bold;
        }
        .node-label {
          font-size: 12.5px;
          color: #0f172a;
          font-weight: 600;
          margin-top: 4px;
        }

        /* ─── BENCHMARKS SECTION ─── */
        .section-benchmarks {
          background-color: #FFFFFF;
          border-bottom: 1px solid #e2e8f0;
          position: relative;
          overflow: hidden;
        }
        .benchmarks-bg-glow {
          position: absolute;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.05) 0%, rgba(255, 255, 255, 0) 70%);
          top: 10%;
          left: 5%;
          pointer-events: none;
          z-index: 1;
        }
        .benchmark-toggle-container {
          display: flex;
          justify-content: center;
          margin-bottom: 40px;
          position: relative;
          z-index: 10;
        }
        .benchmark-tabs {
          display: flex;
          background: #f1f5f9;
          padding: 6px;
          border-radius: 9999px;
          border: 1px solid #e2e8f0;
          box-shadow: inset 0 2px 4px 0 rgba(0,0,0,0.02);
        }
        .benchmark-tabs .toggle-btn {
          background: transparent;
          border: none;
          color: #64748b;
          font-size: 13px;
          font-weight: 600;
          padding: 8px 18px;
          border-radius: 9999px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .benchmark-tabs .toggle-btn:hover {
          color: #0f172a;
        }
        .benchmark-tabs .toggle-btn.active {
          background: #ffffff;
          color: #4f46e5;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04);
        }
        .benchmark-tabs .toggle-btn .btn-icon {
          font-size: 14px;
        }
        .benchmark-panel-grid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 40px;
          align-items: start;
        }
        .chart-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          padding: 32px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 10px 15px -3px rgba(0, 0, 0, 0.03);
        }
        .chart-card.no-padding {
          padding: 0;
        }
        .chart-header {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          margin-bottom: 24px;
        }
        .chart-title {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
        }
        .chart-subtitle {
          font-size: 11.5px;
          color: #64748b;
          margin-top: 4px;
        }
        .bars-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .bar-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .bar-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .bar-label {
          font-size: 13.5px;
          font-weight: 600;
          color: #334155;
        }
        .bar-badge {
          background: rgba(79, 70, 229, 0.08);
          border: 1px solid rgba(79, 70, 229, 0.15);
          color: #4f46e5;
          font-size: 8.5px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
          letter-spacing: 0.05em;
        }
        .bar-track-wrapper {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .bar-track {
          flex: 1;
          height: 14px;
          background: #f1f5f9;
          border-radius: 9999px;
          overflow: hidden;
          position: relative;
        }
        .bar-fill {
          height: 100%;
          border-radius: 9999px;
          transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .bar-fill.gradient-fill {
          background: linear-gradient(90deg, #4f46e5 0%, #6366f1 50%, #818cf8 100%);
          position: relative;
        }
        .bar-fill.standard-fill {
          background: #cbd5e1;
        }
        .bar-shimmer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.15) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          animation: shimmer 2s infinite;
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .bar-val {
          font-size: 13.5px;
          font-weight: 700;
          color: #475569;
          min-width: 50px;
          text-align: right;
        }
        .bar-val.highlight-text {
          color: #4f46e5;
        }
        .benchmark-info-pane {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
        }
        .badge-sovereign {
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.15);
          color: #059669;
          font-size: 10px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 6px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 16px;
        }
        .benchmark-info-pane h3 {
          font-size: 26px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          line-height: 1.25;
        }
        .metric-callouts-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-top: 32px;
          width: 100%;
        }
        .metric-callout {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 20px 16px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }
        .metric-number {
          font-size: 28px;
          font-weight: 900;
          color: #4f46e5;
          line-height: 1;
        }
        .metric-label {
          font-size: 10px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          margin-top: 8px;
          letter-spacing: 0.03em;
        }
        .table-responsive {
          width: 100%;
          overflow-x: auto;
        }
        .cost-comparison-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .cost-comparison-table th {
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          color: #475569;
          font-weight: 600;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 16px 24px;
        }
        .cost-comparison-table td {
          padding: 18px 24px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 13px;
          color: #334155;
        }
        .cost-comparison-table tr:last-child td {
          border-bottom: none;
        }
        .cost-comparison-table tr.highlight-table-row:hover {
          background: #f8fafc;
        }
        .cost-comparison-table td.highlight-cell {
          font-weight: 800;
          color: #4f46e5;
        }
        .cost-comparison-table .cell-per {
          font-size: 10px;
          color: #94a3b8;
          font-weight: 400;
        }
        .throughput-metrics-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }
        .throughput-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 32px;
          text-align: left;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
          transition: transform 0.2s ease, border-color 0.2s ease;
        }
        .throughput-card:hover {
          transform: translateY(-2px);
          border-color: #cbd5e1;
        }
        .throughput-icon {
          font-size: 24px;
          margin-bottom: 16px;
        }
        .throughput-val {
          font-size: 32px;
          font-weight: 900;
          color: #4f46e5;
          line-height: 1;
        }
        .throughput-title {
          font-size: 14.5px;
          font-weight: 700;
          color: #0f172a;
          margin-top: 10px;
          margin-bottom: 8px;
        }
        .throughput-desc {
          font-size: 12.5px;
          color: #64748b;
          line-height: 1.5;
          margin: 0;
        }

        /* ─── STORIES SECTION ─── */
        .section-stories {
          background-color: #F8FAFC;
          border-bottom: 1px solid #e2e8f0;
        }
        .stories-list-wrapper {
          display: flex;
          flex-direction: column;
          gap: 28px;
          margin-top: 36px;
        }
        .story-card-wrapper {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 40px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.01);
          transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
          text-align: left;
        }
        .story-card-wrapper:hover {
          transform: translateY(-4px);
          border-color: #cbd5e1;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02);
        }
        .story-card-content {
          display: grid;
          grid-template-columns: 1.8fr 1.2fr;
          gap: 40px;
          align-items: center;
        }
        .story-text-container {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
        }
        .story-badge-custom {
          background: rgba(79, 70, 229, 0.05);
          border: 1px solid rgba(79, 70, 229, 0.15);
          color: #4f46e5;
          font-size: 10.5px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 6px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 16px;
          display: inline-block;
        }
        .story-card-content h4 {
          font-size: 22px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 16px 0;
          line-height: 1.3;
        }
        .story-paragraph {
          font-size: 14.5px;
          color: #475569;
          line-height: 1.65;
          margin: 0;
        }
        .story-paragraph strong {
          color: #0f172a;
          font-weight: 700;
        }
        .story-stats-container {
          display: flex;
          gap: 16px;
          width: 100%;
        }
        .story-stat-card {
          flex: 1;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 24px 16px;
          text-align: center;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }
        .story-stat-card:hover {
          border-color: #cbd5e1;
          transform: scale(1.02);
        }
        .story-stat-val {
          font-size: 32px;
          font-weight: 900;
          color: #4f46e5;
          line-height: 1;
        }
        .story-stat-val.emerald {
          color: #10b981;
        }
        .story-stat-label {
          font-size: 10px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          margin-top: 6px;
          letter-spacing: 0.03em;
        }
        .story-quote-signature {
          margin-top: 24px;
          border-top: 1px solid #e2e8f0;
          padding-top: 16px;
          font-size: 13px;
          color: #64748b;
          font-style: italic;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* ─── PRICING SECTION ─── */
        .section-pricing {
          background-color: #FFFFFF;
          border-bottom: 1px solid #e2e8f0;
        }
        .pricing-grid-custom {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }
        .price-card-custom {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 24px;
          text-align: left;
          position: relative;
        }
        .price-card-custom.highlighted {
          background: #fcfcff;
          border-color: #4f46e5;
        }
        .badge-promo {
          position: absolute;
          top: 12px;
          right: 12px;
          background: #4f46e5;
          color: #fff;
          font-size: 8.5px;
          font-weight: bold;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .plan-name {
          font-size: 15px;
          font-weight: 600;
          color: #475569;
          text-transform: uppercase;
        }
        .plan-price {
          font-size: 32px;
          font-weight: 900;
          color: #0f172a;
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
          color: #475569;
        }
        .btn-price {
          display: block;
          text-align: center;
          background: transparent;
          border: 1px solid #cbd5e1;
          color: #475569;
          font-size: 12.5px;
          font-weight: 600;
          padding: 10px;
          border-radius: 8px;
          text-decoration: none;
          transition: all 0.15s ease;
        }
        .btn-price.primary-gradient {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          border: none;
          color: #fff;
        }
        .btn-price:hover {
          background: rgba(0, 0, 0, 0.03);
          transform: scale(1.01);
        }
        .btn-price.primary-gradient:hover {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          opacity: 0.95;
        }

        /* ─── FAQ SECTION ─── */
        .section-faq {
          background-color: #F8FAFC;
          border-bottom: 1px solid #e2e8f0;
        }
        .faq-wrapper {
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 48px;
          margin-top: 48px;
        }
        .faq-menu {
          display: flex;
          flex-direction: column;
          gap: 6px;
          text-align: left;
        }
        .faq-tab-btn {
          background: transparent;
          border: none;
          color: #475569;
          font-size: 14px;
          font-weight: 600;
          padding: 12px 16px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          width: 100%;
          font-family: inherit;
        }
        .faq-tab-btn:hover {
          background: rgba(0, 0, 0, 0.02);
          color: #0f172a;
        }
        .faq-tab-btn.active {
          background: rgba(79, 70, 229, 0.06);
          color: #4f46e5;
        }
        .faq-item {
          border-bottom: 1px solid #e2e8f0;
        }
        .faq-question {
          background: transparent;
          border: none;
          padding: 20px 0;
          margin: 0;
          text-align: left;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          font-size: 16px;
          font-weight: 600;
          color: #0f172a;
          transition: color 0.15s ease;
          font-family: inherit;
        }
        .faq-question:hover {
          color: #4f46e5;
        }
        .faq-answer {
          font-size: 14.5px;
          color: #475569;
          line-height: 1.65;
          padding-bottom: 20px;
          animation: slideDownFaq 0.2s ease-out;
        }
        @keyframes slideDownFaq {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ─── FOOTER ─── */
        .section-premium-cta {
          background: #fbfbfe;
          border-top: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
        }
        .premium-cta-grid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 48px;
          align-items: center;
        }
        .cta-left h2 {
          font-size: 32px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
          margin-bottom: 12px;
        }
        .cta-left p {
          font-size: 16px;
          color: #475569;
          line-height: 1.6;
          max-width: 580px;
          margin: 0;
        }
        .cta-right {
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: stretch;
        }
        .btn-premium-primary {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: #ffffff;
          font-size: 14.5px;
          font-weight: 600;
          padding: 12px 24px;
          border-radius: 8px;
          text-align: center;
          text-decoration: none;
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
          transition: transform 0.2s ease, opacity 0.2s ease;
        }
        .btn-premium-primary:hover {
          transform: translateY(-1px);
          opacity: 0.95;
        }
        .btn-premium-secondary {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #0f172a;
          font-size: 14px;
          font-weight: 600;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .btn-premium-secondary:hover {
          background: rgba(0, 0, 0, 0.02);
        }
        .btn-premium-outline {
          background: transparent;
          border: 1px solid #cbd5e1;
          color: #475569;
          font-size: 14px;
          font-weight: 600;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-premium-outline:hover {
          color: #0f172a;
          border-color: #94a3b8;
          background: rgba(0,0,0,0.01);
        }
        .btn-premium-link {
          font-size: 13.5px;
          font-weight: 600;
          color: #4f46e5;
          text-decoration: none;
          text-align: center;
          transition: transform 0.2s ease;
        }
        .btn-premium-link:hover {
          transform: translateX(3px);
        }

        /* ─── TRUST METRICS BAR ─── */
        .section-trust-metrics {
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          padding: 12px 0;
        }
        .trust-metrics-wrap {
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 20px;
          padding: 16px 24px;
        }
        .trust-metric-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 700;
          color: #475569;
        }

        /* ─── PREMIUM FOOTER CONTAINER ─── */
        .footer-premium {
          background: #ffffff;
          border-top: 1px solid #e2e8f0;
        }
        .footer-grid-columns {
          display: grid;
          grid-template-columns: 2fr repeat(5, 1fr);
          gap: 40px;
          padding-top: 80px;
          padding-bottom: 60px;
        }
        .footer-brand-col {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
        }
        .footer-logo {
          font-size: 18px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -0.03em;
        }
        .footer-desc {
          font-size: 12.5px;
          color: #64748b;
          line-height: 1.6;
          margin-top: 12px;
          max-width: 260px;
        }
        .brand-badges-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .brand-badge-pill {
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          color: #475569;
          font-size: 9.5px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 6px;
          text-transform: uppercase;
        }

        .footer-link-col {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
        }
        .col-title {
          font-size: 13.5px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }
        .mobile-only-chevron {
          display: none;
        }
        .col-links {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .col-links a {
          font-size: 13px;
          color: #475569;
          text-decoration: none;
          transition: all 0.15s ease;
        }
        .col-links a:hover {
          color: #4f46e5;
          transform: translateX(2px);
        }

        /* ─── CONTACT & NEWSLETTER BLOCKS ─── */
        .footer-contact-newsletter {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 48px;
          border-top: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
          padding-top: 48px;
          padding-bottom: 48px;
        }
        .enterprise-contact-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 24px;
          text-align: left;
        }
        .enterprise-contact-card h4 {
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }
        .enterprise-contact-card .address {
          font-size: 12.5px;
          color: #64748b;
          line-height: 1.5;
        }
        .contact-details {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 12.5px;
          color: #475569;
        }
        .contact-details span {
          font-weight: 600;
          color: #0f172a;
        }
        .contact-details a {
          color: #4f46e5;
          text-decoration: none;
        }
        .highlight-text {
          font-weight: 700;
          color: #10b981;
        }

        .newsletter-card {
          text-align: left;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .newsletter-card h4 {
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }
        .newsletter-card .subtitle {
          font-size: 13px;
          color: #64748b;
          line-height: 1.5;
          margin: 0;
        }
        .newsletter-form {
          display: flex;
          gap: 10px;
        }
        .newsletter-input {
          flex: 1;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 13px;
          color: #0f172a;
          outline: none;
          transition: border-color 0.15s ease;
        }
        .newsletter-input:focus {
          border-color: #4f46e5;
        }
        .newsletter-btn {
          background: #0f172a;
          color: #ffffff;
          border: none;
          padding: 10px 20px;
          font-size: 13px;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .newsletter-btn:hover {
          background: #1e293b;
        }

        /* ─── FOOTER BOTTOM PANEL ─── */
        .footer-bottom-panel {
          padding-top: 48px;
          padding-bottom: 48px;
        }
        .footer-bottom-grid {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 40px;
          align-items: flex-start;
        }
        .footer-bottom-left {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
        }
        .technical-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(16, 185, 129, 0.06);
          border: 1px solid rgba(16, 185, 129, 0.15);
          border-radius: 9999px;
          padding: 6px 14px;
          font-size: 11.5px;
        }
        .status-dot {
          width: 6px;
          height: 6px;
          background: #10b981;
          border-radius: 50%;
        }
        .status-dot.pulsing {
          box-shadow: 0 0 8px #10b981;
          animation: statusPulse 2s infinite;
        }
        .status-text {
          font-weight: 600;
          color: #10b981;
        }
        .status-link {
          color: #4f46e5;
          text-decoration: none;
          font-weight: 700;
          margin-left: 6px;
        }
        .social-links-row {
          display: flex;
          gap: 16px;
        }
        .social-links-row a {
          font-size: 12.5px;
          font-weight: 600;
          color: #475569;
          text-decoration: none;
          transition: color 0.15s ease;
        }
        .social-links-row a:hover {
          color: #0f172a;
        }

        .footer-legal-links {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          text-align: left;
        }
        .footer-legal-links a {
          font-size: 12px;
          color: #64748b;
          text-decoration: none;
          transition: color 0.15s ease;
        }
        .footer-legal-links a:hover {
          color: #0f172a;
        }

        .footer-copyright-row {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #94a3b8;
        }
        .origin-statement {
          font-weight: 600;
          color: #64748b;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .hero-grid,
          .map-grid,
          .arch-flow-grid,
          .dx-split-grid,
          .faq-wrapper,
          .story-card-content,
          .benchmark-panel-grid,
          .throughput-metrics-grid {
            grid-template-columns: 1fr;
          }
          .faq-menu {
            flex-direction: row;
            flex-wrap: wrap;
            gap: 8px;
          }
          .faq-tab-btn {
            width: auto;
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

          /* New Footer Responsive overrides */
          .premium-cta-grid,
          .footer-grid-columns,
          .footer-contact-newsletter,
          .footer-bottom-grid {
            grid-template-columns: 1fr !important;
            gap: 32px;
          }
          .cta-right {
            align-items: stretch;
          }
          .footer-brand-col {
            margin-bottom: 20px;
          }
          .mobile-only-chevron {
            display: inline-block;
            transition: transform 0.2s ease;
          }
          .col-title {
            cursor: pointer;
            border-bottom: 1px solid #f1f5f9;
            padding-bottom: 8px;
            margin-bottom: 12px;
          }
          .col-links {
            display: none;
            padding-left: 8px;
            padding-bottom: 16px;
          }
          .col-links.mobile-open {
            display: flex;
          }
          .footer-legal-links {
            grid-template-columns: repeat(2, 1fr);
          }
          .footer-copyright-row {
            flex-direction: column;
            gap: 12px;
            text-align: left;
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
        @keyframes statusPulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.4; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );
}
