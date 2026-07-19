import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { 
  ArrowRight, Shield, Cpu, Activity, Play, ChevronRight, Code2, Copy, Check, 
  Terminal, Server, Globe, Lock, Workflow, Database, Layers, CheckCircle2, 
  MessageSquare, Search, Zap, BarChart3, HelpCircle, ArrowUpRight, ShieldCheck 
} from 'lucide-react';

export default function NeuravoltLandingPage() {
  const [billingPeriod, setBillingPeriod] = useState('yearly');
  const [copiedCode, setCopiedCode] = useState(false);
  const [faqOpen, setFaqOpen] = useState({});
  const [activeTab, setActiveTab] = useState('workspace');
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  
  // Interactive Chat playpen parameters
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'System initialized. Isolated Acme RLS node ready. Select a prompt below to evaluate inference routing.' }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  // Interactive Calculator parameters
  const [monthlyQueries, setMonthlyQueries] = useState(250000);
  const [currentCost, setCurrentCost] = useState(1250); // $0.005 avg cost
  const [neuravoltCost, setNeuravoltCost] = useState(500); // 60% savings

  useEffect(() => {
    // Dynamically calculate savings based on query slider
    const rawCost = Math.round(monthlyQueries * 0.005);
    const optimizedCost = Math.round(monthlyQueries * 0.002);
    setCurrentCost(rawCost);
    setNeuravoltCost(optimizedCost);
  }, [monthlyQueries]);

  const samplePrompts = [
    { label: 'Run Security Audit', response: 'Scanning workspace index... \n🔒 Zero exposed credentials found. \n⚠️ 2 obsolete dependencies identified in package.json.' },
    { label: 'Optimize pgvector latency', response: 'Latency optimized. \n📊 pgvector index transitioned to HNSW. Average query speed dropped from 24ms to 11ms.' },
    { label: 'Migrate Tenant Schema', response: 'Migrated. \n✓ Isolated row-level security (RLS) tables compiled. Database nodes relocated to AWS Mumbai VPC.' }
  ];

  const handlePromptClick = (prompt) => {
    if (isTyping) return;
    setSelectedPrompt(prompt.label);
    setChatMessages(prev => [...prev, { role: 'user', content: prompt.label }]);
    setIsTyping(true);
    
    // Simulate streaming AI token typing
    setTimeout(() => {
      setChatMessages(prev => [...prev, { role: 'assistant', content: prompt.response }]);
      setIsTyping(false);
    }, 1200);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText('npm install @neuravolt/sdk');
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const toggleFaq = (index) => {
    setFaqOpen(prev => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div style={{
      backgroundColor: '#050816',
      color: '#FFFFFF',
      minHeight: '100vh',
      fontFamily: "'Inter', sans-serif",
      overflowX: 'hidden'
    }}>
      <Head>
        <title>Neuravolt Cloud | Enterprise AI Operating System</title>
        <meta name="description" content="Deploy secure private AI workspaces, AI agents, workflows, knowledge bases, and enterprise AI infrastructure from one unified platform." />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700;900&display=swap" rel="stylesheet" />
        {/* Schema.org Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Neuravolt Cloud",
            "operatingSystem": "All",
            "applicationCategory": "BusinessApplication",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            }
          })}
        </script>
      </Head>

      {/* Global CSS Inject for animations */}
      <style jsx global>{`
        body {
          background-color: #050816;
        }
        @keyframes scrollMarquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes floatAnim {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        @keyframes pulseGlow {
          0% { opacity: 0.3; }
          50% { opacity: 0.6; }
          100% { opacity: 0.3; }
        }
        @keyframes blink {
          0% { opacity: 0.2; }
          50% { opacity: 1; }
          100% { opacity: 0.2; }
        }
        .scrolling-marquee {
          display: flex;
          width: 200%;
          animation: scrollMarquee 25s linear infinite;
        }
        .float-card {
          animation: floatAnim 6s ease-in-out infinite;
        }
        .glow-overlay {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          z-index: 0;
          animation: pulseGlow 8s ease-in-out infinite;
        }
        .grid-bg {
          background-size: 40px 40px;
          background-image: 
            linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
        }
      `}</style>

      {/* Navigation Header */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 40px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'sticky',
        top: 0,
        backgroundColor: 'rgba(5, 8, 22, 0.8)',
        backdropFilter: 'blur(12px)',
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            background: 'linear-gradient(135deg, #4F8CFF, #8B5CF6)',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '18px'
          }}>N</span>
          <span style={{ fontSize: '20px', fontWeight: '700', letterSpacing: '-0.5px', fontFamily: 'Outfit' }}>Neuravolt</span>
          {/* Status Indicator */}
          <div style={{
            marginLeft: '16px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.15)',
            padding: '3px 10px',
            borderRadius: '12px',
            fontSize: '11px',
            color: '#10B981'
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#10B981',
              animation: 'blink 1.5s infinite'
            }} />
            Systems Operational
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px', fontSize: '14px', color: '#94A3B8' }}>
          <a href="#why" style={{ textDecoration: 'none', color: 'inherit' }}>Why Neuravolt</a>
          <a href="#features" style={{ textDecoration: 'none', color: 'inherit' }}>Features</a>
          <a href="#models" style={{ textDecoration: 'none', color: 'inherit' }}>Model Routing</a>
          <a href="#calculator" style={{ textDecoration: 'none', color: 'inherit' }}>Savings Calculator</a>
          <a href="#pricing" style={{ textDecoration: 'none', color: 'inherit' }}>Pricing</a>
        </div>
        <div>
          <button style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '8px 20px',
            borderRadius: '20px',
            color: '#FFFFFF',
            fontSize: '14px',
            cursor: 'pointer',
            marginRight: '12px'
          }}>Log In</button>
          <button style={{
            background: '#4F8CFF',
            border: 'none',
            padding: '8px 20px',
            borderRadius: '20px',
            color: '#FFFFFF',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
          }}>Start Free</button>
        </div>
      </nav>

      {/* 1. HERO SECTION */}
      <section className="grid-bg" style={{
        padding: '120px 40px 100px 40px',
        position: 'relative',
        maxWidth: '1280px',
        margin: '0 auto',
        display: 'flex',
        gap: '40px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        {/* Glow */}
        <div className="glow-overlay" style={{ top: '-10%', left: '5%', width: '400px', height: '400px', background: 'rgba(79, 140, 255, 0.15)' }} />
        <div className="glow-overlay" style={{ bottom: '10%', right: '5%', width: '350px', height: '350px', background: 'rgba(139, 92, 246, 0.15)' }} />

        {/* Left Side */}
        <div style={{ flex: '1 1 500px', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(79, 140, 255, 0.1)',
            border: '1px solid rgba(79, 140, 255, 0.2)',
            padding: '6px 14px',
            borderRadius: '30px',
            color: '#38BDF8',
            fontSize: '13px',
            fontWeight: '600',
            marginBottom: '24px'
          }}>
            <Shield size={14} /> SOC2 Type II Certified Platform
          </div>
          <h1 style={{
            fontSize: '76px',
            fontWeight: '900',
            lineHeight: '1.05',
            letterSpacing: '-2px',
            fontFamily: 'Outfit',
            margin: '0 0 24px 0',
            background: 'linear-gradient(180deg, #FFFFFF 0%, #94A3B8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Enterprise AI<br />Infrastructure
          </h1>
          <p style={{
            fontSize: '19px',
            color: '#94A3B8',
            lineHeight: '1.6',
            margin: '0 0 40px 0',
            maxWidth: '520px'
          }}>
            Deploy secure private AI workspaces, intelligent agents, workflows, and private RAG vector directories powered by baseline open models.
          </p>
          
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '30px' }}>
            <button style={{
              background: '#4F8CFF',
              border: 'none',
              padding: '16px 36px',
              borderRadius: '30px',
              color: '#FFFFFF',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 20px rgba(79, 140, 255, 0.3)'
            }}>
              Start Free Trial <ArrowRight size={18} />
            </button>
            <button style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              padding: '16px 36px',
              borderRadius: '30px',
              color: '#FFFFFF',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              Book Demo
            </button>
          </div>

          <div style={{ display: 'flex', gap: '24px', fontSize: '13px', color: '#64748B' }}>
            <span>✓ No Credit Card Required</span>
            <span>✓ ISO 27001 Certified</span>
            <span>✓ Air-Gap Eligible</span>
          </div>
        </div>

        {/* Right Side Interactive Chat Playpen Mockup */}
        <div style={{ flex: '1 1 500px', zIndex: 1, display: 'flex', justifyContent: 'center' }}>
          <div className="float-card" style={{
            width: '100%',
            maxWidth: '560px',
            background: 'rgba(11, 17, 32, 0.65)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '24px',
            padding: '24px',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 30px 60px rgba(0,0,0,0.5)'
          }}>
            {/* Window controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#EF4444' }} />
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#F59E0B' }} />
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981' }} />
              </div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>tenant-workspace: acme-node-1</div>
            </div>

            {/* Chat Messages */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '200px', overflowY: 'auto', marginBottom: '20px', paddingRight: '4px' }}>
              {chatMessages.map((msg, i) => (
                <div key={i} style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  background: msg.role === 'user' ? '#4F8CFF' : 'rgba(255,255,255,0.05)',
                  padding: '10px 16px',
                  borderRadius: '16px',
                  maxWidth: '85%',
                  fontSize: '13.5px',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-line',
                  border: msg.role === 'assistant' ? '1px solid rgba(255,255,255,0.04)' : 'none'
                }}>
                  {msg.content}
                </div>
              ))}
              {isTyping && (
                <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', padding: '10px 16px', borderRadius: '16px', fontSize: '13.5px', color: '#94A3B8' }}>
                  Streaming optimized response...
                </div>
              )}
            </div>

            {/* Prompt Selector Triggers */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Test Live Prompts:</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {samplePrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handlePromptClick(p)}
                    disabled={isTyping}
                    style={{
                      background: selectedPrompt === p.label ? 'rgba(79, 140, 255, 0.15)' : 'rgba(255,255,255,0.03)',
                      border: selectedPrompt === p.label ? '1px solid #4F8CFF' : '1px solid rgba(255,255,255,0.06)',
                      color: selectedPrompt === p.label ? '#FFFFFF' : '#94A3B8',
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedPrompt !== p.label) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                    }}
                    onMouseLeave={(e) => {
                      if (selectedPrompt !== p.label) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sub Widgets (Latency & Usage) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '12px' }}>
                <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}><Cpu size={12} /> Model Inference</div>
                <div style={{ fontSize: '18px', fontWeight: '700', marginTop: '4px' }}>14 ms <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 'normal' }}>-4%</span></div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '12px' }}>
                <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}><Activity size={12} /> GPU Cluster Load</div>
                <div style={{ fontSize: '18px', fontWeight: '700', marginTop: '4px' }}>42.1% <span style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 'normal' }}>Optimal</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. INFINITE SCROLLING LOGO MARQUEE */}
      <section style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '30px 0',
        overflow: 'hidden',
        background: '#0B1120'
      }}>
        <div style={{ textAlign: 'center', fontSize: '13px', color: '#64748B', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '2px' }}>
          Trusted by Innovative AI Teams Worldwide
        </div>
        <div className="scrolling-marquee">
          {Array(4).fill(['Acme Corp', 'Globex', 'Initech', 'Umbrella', 'Cyberdyne', 'Hooli', 'Veer Corp']).flat().map((logo, i) => (
            <span key={i} style={{
              fontSize: '20px',
              fontWeight: '800',
              color: 'rgba(255,255,255,0.25)',
              margin: '0 50px',
              fontFamily: 'Outfit',
              letterSpacing: '-0.5px'
            }}>{logo}</span>
          ))}
        </div>
      </section>

      {/* 3. WHY NEURAVOLT (PROBLEM VS SOLUTION) */}
      <section id="why" style={{ padding: '100px 40px', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h2 style={{ fontSize: '36px', fontWeight: '800', fontFamily: 'Outfit', margin: '0 0 16px 0' }}>The AI Fragmentation Crisis</h2>
          <p style={{ color: '#94A3B8', fontSize: '16px', maxWidth: '600px', margin: '0 auto' }}>
            Traditional business workflows are siloed across disconnected models, unstructured databases, and unverified API access points.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '30px' }}>
          <div style={{ background: '#0B1120', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '20px', padding: '40px' }}>
            <h3 style={{ fontSize: '20px', color: '#EF4444', marginBottom: '20px', fontWeight: '700' }}>Fragmented AI Legacy</h3>
            <ul style={{ color: '#94A3B8', fontSize: '14.5px', paddingLeft: '20px', lineHeight: '2' }}>
              <li>Multiple uncoordinated model subscriptions</li>
              <li>Weak Cross-Site vulnerability filters</li>
              <li>Exposed private keys in server configurations</li>
              <li>Zero tenant-database isolation metrics</li>
            </ul>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #0B1120 0%, #1e293b 100%)', border: '1px solid rgba(79, 140, 255, 0.2)', borderRadius: '20px', padding: '40px', boxShadow: '0 10px 30px rgba(79, 140, 255, 0.05)' }}>
            <h3 style={{ fontSize: '20px', color: '#4F8CFF', marginBottom: '20px', fontWeight: '700' }}>Neuravolt OS Solutions</h3>
            <ul style={{ color: '#FFFFFF', fontSize: '14.5px', paddingLeft: '20px', lineHeight: '2' }}>
              <li>Unified multi-tenant database isolation</li>
              <li>Automated model inference routers</li>
              <li>CERT-In audit log event streams</li>
              <li>Centralized prompt injection filtering</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 4. PLATFORM OVERVIEW */}
      <section id="features" style={{ padding: '100px 40px', backgroundColor: '#0B1120' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '36px', fontWeight: '800', fontFamily: 'Outfit', margin: '0 0 16px 0' }}>One System. Complete Control.</h2>
            <p style={{ color: '#94A3B8', fontSize: '16px', maxWidth: '600px', margin: '0 auto' }}>
              An unified cloud dashboard to coordinate prompt parsing, background pipelines, and enterprise vectors.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            {[
              { title: 'Isolated Workspaces', desc: 'Secure database directories isolated via PostgreSQL Row-Level Security.', icon: Layers },
              { title: 'Knowledge Vector Libraries', desc: 'Fast, semantic document search using RAG pipelines.', icon: Database },
              { title: 'Intelligent AI Agents', desc: 'Background workers utilizing tools and function calls.', icon: Cpu },
              { title: 'Workflow Automator', desc: 'Drag-and-drop workflow graphs for pipeline triggers.', icon: Workflow }
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} style={{
                  background: '#111827',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '16px',
                  padding: '30px 24px',
                  transition: 'transform 0.2s, border-color 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = '#4F8CFF';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                }}
                >
                  <Icon size={28} color="#4F8CFF" style={{ marginBottom: '16px' }} />
                  <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '10px' }}>{item.title}</h3>
                  <p style={{ fontSize: '13.5px', color: '#94A3B8', lineHeight: '1.6', margin: 0 }}>{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* NEW SECTION: COST SAVINGS CALCULATOR */}
      <section id="calculator" style={{ padding: '100px 40px', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{
          background: 'radial-gradient(circle at bottom left, rgba(79, 140, 255, 0.08) 0%, rgba(5, 8, 22, 0) 70%)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '24px',
          padding: '50px 40px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <span style={{ fontSize: '11px', color: '#8B5CF6', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase' }}>ROI Analysis</span>
            <h2 style={{ fontSize: '32px', fontWeight: '800', fontFamily: 'Outfit', marginTop: '6px' }}>Compute &amp; Model Cost Optimizer</h2>
            <p style={{ color: '#94A3B8', fontSize: '15px' }}>See how much you save by routing queries dynamically using our intelligent Model Router.</p>
          </div>

          <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Slider */}
            <div style={{ flex: '1 1 400px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>Expected Monthly Queries:</span>
                <span style={{ fontSize: '16px', fontWeight: '700', color: '#4F8CFF' }}>{monthlyQueries.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="50000"
                max="2000000"
                step="50000"
                value={monthlyQueries}
                onChange={(e) => setMonthlyQueries(Number(e.target.value))}
                style={{
                  width: '100%',
                  height: '6px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '3px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748B', marginTop: '6px' }}>
                <span>50k queries</span>
                <span>2M queries</span>
              </div>
            </div>

            {/* Savings Cards */}
            <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>Standard API Cost</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#EF4444' }}>${currentCost.toLocaleString()}</div>
                </div>
                <span style={{ fontSize: '12px', color: '#EF4444' }}>Full price rates</span>
              </div>
              <div style={{ background: 'rgba(79, 140, 255, 0.05)', border: '1px solid rgba(79, 140, 255, 0.2)', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#4F8CFF' }}>Neuravolt Routing Cost</div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: '#10B981' }}>${neuravoltCost.toLocaleString()}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '12px', color: '#10B981', fontWeight: '700', display: 'block' }}>Save 60%</span>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>Via model cache</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. HOW IT WORKS (PIPELINE FLOW) */}
      <section style={{ padding: '100px 40px', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h2 style={{ fontSize: '36px', fontWeight: '800', fontFamily: 'Outfit', margin: '0 0 16px 0' }}>The AI Pipeline Dataflow</h2>
          <p style={{ color: '#94A3B8', fontSize: '16px' }}>
            Data flows securely from your inputs to our model router, returning validated outputs.
          </p>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          {[
            { label: 'User Ingestion', desc: 'Secure upload of document files and prompt data.' },
            { label: 'RLS Workspace Segregation', desc: 'Tenant routing validation via secure filters.' },
            { label: 'Safety Moderation Filter', desc: 'Scans for prompt injection attacks.' },
            { label: 'Model Router Selection', desc: 'Dynamic model selection (Llama, Gemini, Claude).' },
            { label: 'Validated Output Inference', desc: 'Response checks before user return.' }
          ].map((step, idx) => (
            <div key={idx} style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              background: '#0B1120',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
              padding: '16px 24px',
              gap: '20px'
            }}>
              <span style={{
                background: '#4F8CFF',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '700'
              }}>{idx + 1}</span>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: '700', margin: '0 0 2px 0' }}>{step.label}</h4>
                <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. PRODUCT DEMO WORKSPACE SHOWCASE */}
      <section style={{ padding: '80px 40px', backgroundColor: '#0B1120' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '36px', fontWeight: '800', fontFamily: 'Outfit', marginBottom: '40px' }}>Experience the Dashboard</h2>
          <div style={{
            background: 'rgba(5, 8, 22, 0.7)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px',
            padding: '16px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '400px',
              background: 'radial-gradient(circle at center, #1e293b 0%, #050816 100%)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}>
              <div style={{
                zIndex: 2,
                textAlign: 'center'
              }}>
                <button style={{
                  background: '#FFFFFF',
                  color: '#050816',
                  border: 'none',
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(255,255,255,0.3)',
                  marginBottom: '16px'
                }}>
                  <Play size={24} fill="#050816" />
                </button>
                <div style={{ fontSize: '16px', fontWeight: '600' }}>Watch Platform Walkthrough (2:30)</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FEATURES GRID */}
      <section style={{ padding: '100px 40px', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h2 style={{ fontSize: '36px', fontWeight: '800', fontFamily: 'Outfit', margin: '0 0 16px 0' }}>Built for the Modern Enterprise</h2>
          <p style={{ color: '#94A3B8', fontSize: '16px' }}>Every tool you need to run large scale corporate inference pipelines.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          {[
            { title: 'Private LLM Nodes', desc: 'Run open weights models in your secure cloud environment.' },
            { title: 'Cognitive Memory', desc: 'Stores user preferences and context across chat sessions.' },
            { title: 'Document RAG Indexes', desc: 'Vector search indexing for PDFs, JSONs, and text libraries.' },
            { title: 'Vulnerability Scanning', desc: 'Continuous prompt parsing to identify malicious jailbreaks.' },
            { title: 'Audit Trail Registry', desc: 'Tracks system alerts, prompt loads, and access events.' },
            { title: 'Fine Grain Permissions', desc: 'Set workspace permissions per user role or team hierarchy.' },
            { title: 'Dual-Gateway Billing', desc: 'Supports Stripe and Razorpay processing interfaces.' },
            { title: 'Multi-Tenant Isolation', desc: 'Row-Level Isolation parameters built directly into database schemas.' }
          ].map((feat, idx) => (
            <div key={idx} style={{
              background: '#0B1120',
              border: '1px solid rgba(255,255,255,0.04)',
              borderRadius: '16px',
              padding: '24px'
            }}>
              <CheckCircle2 size={20} color="#10B981" style={{ marginBottom: '12px' }} />
              <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>{feat.title}</h4>
              <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: '1.5', margin: 0 }}>{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 8. AI MODELS SUPPORTED */}
      <section id="models" style={{ padding: '100px 40px', backgroundColor: '#0B1120' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '36px', fontWeight: '800', fontFamily: 'Outfit', margin: '0 0 16px 0' }}>Baseline Foundation Models</h2>
            <p style={{ color: '#94A3B8', fontSize: '16px' }}>Route prompts to appropriate inference targets based on latency and cost requirements.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            {[
              { name: 'Claude 3.5 Sonnet', provider: 'Anthropic', latency: 'Fast (12ms)', window: '200k tokens' },
              { name: 'GPT-4o', provider: 'OpenAI', latency: 'Optimal (15ms)', window: '128k tokens' },
              { name: 'Llama 3.1 405B', provider: 'Meta (Open)', latency: 'Excellent (18ms)', window: '128k tokens' },
              { name: 'DeepSeek-V3', provider: 'DeepSeek (Open)', latency: 'Fast (10ms)', window: '64k tokens' }
            ].map((model, idx) => (
              <div key={idx} style={{
                background: '#111827',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '16px',
                padding: '24px',
                textAlign: 'left'
              }}>
                <span style={{ fontSize: '12px', color: '#4F8CFF', fontWeight: '600' }}>{model.provider}</span>
                <h4 style={{ fontSize: '18px', fontWeight: '700', margin: '4px 0 12px 0' }}>{model.name}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: '#94A3B8' }}>
                  <span>Latency: {model.latency}</span>
                  <span>Context: {model.window}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. SECURITY & DATA RESIDENCY */}
      <section style={{ padding: '100px 40px', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{
          background: 'radial-gradient(circle at top right, rgba(79, 140, 255, 0.1) 0%, rgba(5, 8, 22, 0) 60%)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '24px',
          padding: '60px 40px',
          display: 'flex',
          gap: '40px',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <div style={{ flex: '1 1 500px' }}>
            <h2 style={{ fontSize: '36px', fontWeight: '800', fontFamily: 'Outfit', margin: '0 0 20px 0' }}>Private Data Sovereignty</h2>
            <p style={{ color: '#94A3B8', fontSize: '15.5px', lineHeight: '1.7', marginBottom: '30px' }}>
              We isolate all customer transactions within the geographical borders of India. Data is encrypted using AES-256 standards with strict tenant keys (BYOK/CMK) to ensure no cross-leakage.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <Lock size={20} color="#4F8CFF" style={{ marginBottom: '8px' }} />
                <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>Zero-Trust Architecture</h4>
                <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}>Every query authentication token is verified dynamically.</p>
              </div>
              <div>
                <Server size={20} color="#10B981" style={{ marginBottom: '8px' }} />
                <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>Air-Gap Support</h4>
                <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}>Eligible for custom local deployments.</p>
              </div>
            </div>
          </div>
          <div style={{ flex: '1 1 300px', display: 'flex', justifyContent: 'center' }}>
            <div style={{
              background: '#0B1120',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '20px',
              padding: '30px',
              textAlign: 'center',
              width: '100%',
              maxWidth: '340px'
            }}>
              <Shield size={64} color="#4F8CFF" style={{ margin: '0 auto 20px auto' }} />
              <h4 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '6px' }}>Compliance Audited</h4>
              <span style={{ fontSize: '13px', color: '#64748B' }}>SOC2 Type II · DPDP Act 2023 · ISO 27001</span>
            </div>
          </div>
        </div>
      </section>

      {/* 10. WORKFLOW AUTOMATION PIPELINE GRAPH */}
      <section style={{ padding: '100px 40px', backgroundColor: '#0B1120' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '36px', fontWeight: '800', fontFamily: 'Outfit', margin: '0 0 16px 0' }}>Enterprise Action Flows</h2>
            <p style={{ color: '#94A3B8', fontSize: '16px' }}>Coordinate business logic triggers using drag-and-drop workflow grids.</p>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            {['Inbound Email', 'AI Classifier', 'Vector Match', 'Slack Notification', 'Human Sign-off'].map((node, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  background: '#111827',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  {node}
                </div>
                {i < 4 && <ChevronRight size={18} color="#64748B" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 11. ANALYTICS PREVIEW PANEL */}
      <section style={{ padding: '100px 40px', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h2 style={{ fontSize: '36px', fontWeight: '800', fontFamily: 'Outfit', margin: '0 0 16px 0' }}>Real-time Query Analytics</h2>
          <p style={{ color: '#94A3B8', fontSize: '16px' }}>Monitor prompt frequencies, GPU cache allocations, and subscription costs.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          <div style={{ background: '#0B1120', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '16px', padding: '24px' }}>
            <span style={{ fontSize: '12px', color: '#64748B' }}>TOTAL WORKSPACE QUERIES</span>
            <div style={{ fontSize: '28px', fontWeight: '800', margin: '8px 0' }}>24,912</div>
            <span style={{ fontSize: '12px', color: '#10B981' }}>+12.4% vs last week</span>
          </div>
          <div style={{ background: '#0B1120', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '16px', padding: '24px' }}>
            <span style={{ fontSize: '12px', color: '#64748B' }}>AVERAGE TOKEN INFERENCE SPEED</span>
            <div style={{ fontSize: '28px', fontWeight: '800', margin: '8px 0' }}>14 ms</div>
            <span style={{ fontSize: '12px', color: '#10B981' }}>Optimal latency status</span>
          </div>
          <div style={{ background: '#0B1120', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '16px', padding: '24px' }}>
            <span style={{ fontSize: '12px', color: '#64748B' }}>ACCUMULATED VECTOR DATASTORE</span>
            <div style={{ fontSize: '28px', fontWeight: '800', margin: '8px 0' }}>3.2M keys</div>
            <span style={{ fontSize: '12px', color: '#38BDF8' }}>PostgreSQL pgvector cluster</span>
          </div>
        </div>
      </section>

      {/* 12. DEPLOYMENT SCENARIOS */}
      <section style={{ padding: '100px 40px', backgroundColor: '#0B1120' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '36px', fontWeight: '800', fontFamily: 'Outfit', margin: '0 0 16px 0' }}>Flexible Infrastructure Deployment</h2>
            <p style={{ color: '#94A3B8', fontSize: '16px' }}>Run SaaS or deploy directly into your private virtual clouds.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '30px' }}>
            <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '20px', padding: '40px' }}>
              <Globe size={24} color="#4F8CFF" style={{ marginBottom: '16px' }} />
              <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '12px' }}>Neuravolt Managed Cloud</h3>
              <p style={{ color: '#94A3B8', fontSize: '14.5px', lineHeight: '1.6', marginBottom: '24px' }}>
                Hosted secure servers isolated via multi-tenant database rules. No infrastructure maintenance required.
              </p>
              <span style={{ fontSize: '13px', color: '#64748B' }}>SOC2 Certified · Auto upgrades</span>
            </div>
            <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '20px', padding: '40px' }}>
              <Server size={24} color="#10B981" style={{ marginBottom: '16px' }} />
              <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '12px' }}>Self-Hosted VPC / On-Premise</h3>
              <p style={{ color: '#94A3B8', fontSize: '14.5px', lineHeight: '1.6', marginBottom: '24px' }}>
                Deploy into private AWS, Azure or local bare-metal clusters. Data remains strictly inside corporate firewalls.
              </p>
              <span style={{ fontSize: '13px', color: '#64748B' }}>Custom keys · Air-Gap supported</span>
            </div>
          </div>
        </div>
      </section>

      {/* 13. DEVELOPER EXPERIENCE (CODE EDITOR) */}
      <section id="developer" style={{ padding: '100px 40px', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 400px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#4F8CFF', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
              <Terminal size={14} /> Developer Experience
            </div>
            <h2 style={{ fontSize: '36px', fontWeight: '800', fontFamily: 'Outfit', margin: '0 0 20px 0' }}>Build AI with 3 Lines of Code</h2>
            <p style={{ color: '#94A3B8', fontSize: '15.5px', lineHeight: '1.7', marginBottom: '24px' }}>
              Install our lightweight npm package to query vectors, manage conversation logs, and request model responses using secure API tokens.
            </p>
            <div style={{
              background: '#0B1120',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
              padding: '12px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <code style={{ fontSize: '14px', color: '#4F8CFF' }}>npm install @neuravolt/sdk</code>
              <button 
                onClick={copyToClipboard}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer'
                }}
              >
                {copiedCode ? <Check size={16} color="#10B981" /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          <div style={{ flex: '1 1 500px' }}>
            <div style={{
              background: '#0B1120',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
            }}>
              {/* Tabs */}
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <button style={{ padding: '12px 20px', background: 'none', border: 'none', borderRight: '1px solid rgba(255,255,255,0.06)', color: '#FFFFFF', fontSize: '13px', fontWeight: '600' }}>index.ts</button>
                <div style={{ padding: '12px 20px', color: '#64748B', fontSize: '13px' }}>acme-search.ts</div>
              </div>
              {/* Code Panel */}
              <pre style={{ margin: 0, padding: '24px', fontSize: '13.5px', color: '#E2E8F0', overflowX: 'auto', lineHeight: '1.6' }}>
                <code>
{`import { NeuravoltClient } from '@neuravolt/sdk';

const client = new NeuravoltClient({
  apiKey: process.env.NEURAVOLT_API_KEY,
  tenantSlug: 'acme-corp'
});

const response = await client.vectorSearch({
  query: 'Audit RLS postgres queries',
  workspaceId: 'workspace_acme_1'
});`}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* 14. TESTIMONIALS */}
      <section style={{ padding: '100px 40px', backgroundColor: '#0B1120' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '36px', fontWeight: '800', fontFamily: 'Outfit', margin: '0 0 16px 0' }}>Proven in Production</h2>
            <p style={{ color: '#94A3B8', fontSize: '16px' }}>See how enterprise security teams deploy Neuravolt Cloud.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '30px' }}>
            {[
              { quote: 'We migrated our legal document review workspaces from generic models to Neuravolt managed VPCs. CPU query latencies fell by 30%.', author: 'Sanjay Kumar, CTO at IndiaFin Tech' },
              { quote: 'Database Row-Level Security isolation made it simple to pass our enterprise compliance audit. Neuravolt is the OS for corporate AI.', author: 'Rohan Sharma, CISO at LogiCorp' }
            ].map((test, idx) => (
              <div key={idx} style={{
                background: '#111827',
                border: '1px solid rgba(255,255,255,0.04)',
                borderRadius: '16px',
                padding: '32px'
              }}>
                <p style={{ fontSize: '15px', fontStyle: 'italic', lineHeight: '1.6', marginBottom: '20px', color: '#E2E8F0' }}>&ldquo;{test.quote}&rdquo;</p>
                <span style={{ fontSize: '13px', color: '#64748B', fontWeight: '600' }}>{test.author}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 15. PRICING SECTION */}
      <section id="pricing" style={{ padding: '100px 40px', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h2 style={{ fontSize: '36px', fontWeight: '800', fontFamily: 'Outfit', margin: '0 0 16px 0' }}>Transparent, Predictable Billing</h2>
          <p style={{ color: '#94A3B8', fontSize: '16px', marginBottom: '30px' }}>Choose the tier matching your workspace metrics.</p>

          {/* Toggle */}
          <div style={{ display: 'inline-flex', background: '#0B1120', padding: '4px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <button 
              onClick={() => setBillingPeriod('monthly')}
              style={{
                background: billingPeriod === 'monthly' ? '#4F8CFF' : 'none',
                border: 'none',
                padding: '8px 24px',
                borderRadius: '20px',
                color: '#FFFFFF',
                fontSize: '13.5px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Monthly
            </button>
            <button 
              onClick={() => setBillingPeriod('yearly')}
              style={{
                background: billingPeriod === 'yearly' ? '#4F8CFF' : 'none',
                border: 'none',
                padding: '8px 24px',
                borderRadius: '20px',
                color: '#FFFFFF',
                fontSize: '13.5px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Yearly (Save 20%)
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
          {[
            { name: 'Starter', price: billingPeriod === 'yearly' ? '$79' : '$99', features: ['5 Workspaces', '20,000 queries/mo', '10GB Document Vector stores', 'Standard API access', 'Community support'] },
            { name: 'Business Pro', price: billingPeriod === 'yearly' ? '$239' : '$299', features: ['25 Workspaces', '150,000 queries/mo', '100GB Document Vector stores', 'Dedicated Model Routers', 'Priority SLA support'], recommended: true },
            { name: 'Enterprise Custom', price: 'Custom', features: ['Unlimited Workspaces', 'Custom query allocations', 'Dedicated private VPC deploy', 'Bring Your Own Key (BYOK)', '24/7 Security Nodal Officer SLA'] }
          ].map((tier, idx) => (
            <div key={idx} style={{
              background: '#0B1120',
              border: tier.recommended ? '2px solid #4F8CFF' : '1px solid rgba(255,255,255,0.04)',
              borderRadius: '20px',
              padding: '40px',
              position: 'relative'
            }}>
              {tier.recommended && (
                <span style={{
                  position: 'absolute',
                  top: '-15px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#4F8CFF',
                  padding: '4px 14px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '700',
                  textTransform: 'uppercase'
                }}>Most Popular</span>
              )}
              <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>{tier.name}</h3>
              <div style={{ fontSize: '36px', fontWeight: '800', margin: '20px 0', fontFamily: 'Outfit' }}>
                {tier.price} <span style={{ fontSize: '14px', color: '#64748B', fontWeight: 'normal' }}>/ month</span>
              </div>
              <ul style={{ padding: 0, margin: '30px 0', listStyleType: 'none', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: '#94A3B8' }}>
                {tier.features.map((feat, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} color="#10B981" /> {feat}
                  </li>
                ))}
              </ul>
              <button style={{
                width: '100%',
                background: tier.recommended ? '#4F8CFF' : 'rgba(255,255,255,0.04)',
                border: tier.recommended ? 'none' : '1px solid rgba(255,255,255,0.08)',
                padding: '12px 24px',
                borderRadius: '24px',
                color: '#FFFFFF',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer'
              }}>
                Choose Plan
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 16. FAQ SECTION ACCORDION */}
      <section style={{ padding: '100px 40px', backgroundColor: '#0B1120' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '36px', fontWeight: '800', fontFamily: 'Outfit', margin: '0 0 16px 0' }}>Frequently Asked Questions</h2>
            <p style={{ color: '#94A3B8', fontSize: '16px' }}>Clear answers on security, models, and licensing.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { q: 'Is user query content used for AI model training?', a: 'No. Harikson maintains strict database isolation boundaries. We do not use user queries, files, or vectors to refine baseline foundation models.' },
              { q: 'Does Neuravolt support private local data hosting?', a: 'Yes. Enterprise accounts can deploy database layers inside their virtual private clouds (AWS India, Azure) or local server arrays.' },
              { q: 'What compliance frameworks are supported?', a: 'We conform to SOC2 Type II, ISO 27001 guidelines, and the Digital Personal Data Protection (DPDP) Act 2023 of India.' }
            ].map((faq, idx) => (
              <div key={idx} style={{
                background: '#111827',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '12px',
                overflow: 'hidden'
              }}>
                <button 
                  onClick={() => toggleFaq(idx)}
                  style={{
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    padding: '20px 24px',
                    textAlign: 'left',
                    color: '#FFFFFF',
                    fontSize: '15.5px',
                    fontWeight: '700',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer'
                  }}
                >
                  {faq.q}
                  <HelpCircle size={18} color="#64748B" />
                </button>
                {faqOpen[idx] && (
                  <div style={{
                    padding: '0 24px 20px 24px',
                    color: '#94A3B8',
                    fontSize: '14.5px',
                    lineHeight: '1.6'
                  }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 17. CALL TO ACTION (CTA) */}
      <section style={{
        padding: '120px 40px',
        textAlign: 'center',
        position: 'relative',
        background: 'linear-gradient(180deg, #050816 0%, #0B1120 100%)'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', zIndex: 1, position: 'relative' }}>
          <h2 style={{ fontSize: '54px', fontWeight: '900', fontFamily: 'Outfit', margin: '0 0 20px 0', letterSpacing: '-1.5px' }}>
            Build Your Enterprise AI Platform Today
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '18px', lineHeight: '1.6', marginBottom: '40px', maxWidth: '600px', margin: '0 auto 40px auto' }}>
            Deploy workspace nodes, connect database vector indices, and start querying model intelligence in seconds.
          </p>
          <div style={{ display: 'inline-flex', gap: '16px', flexWrap: 'wrap' }}>
            <button style={{
              background: '#4F8CFF',
              border: 'none',
              padding: '16px 36px',
              borderRadius: '30px',
              color: '#FFFFFF',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(79, 140, 255, 0.3)'
            }}>
              Get Started Free
            </button>
            <button style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              padding: '16px 36px',
              borderRadius: '30px',
              color: '#FFFFFF',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}>
              Contact Sales
            </button>
          </div>
        </div>
      </section>

      {/* 18. FOOTER */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '80px 40px 40px 40px',
        backgroundColor: '#050816',
        fontSize: '14px',
        color: '#64748B'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '40px',
          marginBottom: '60px'
        }}>
          {/* Logo & Pitch */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{
                background: 'linear-gradient(135deg, #4F8CFF, #8B5CF6)',
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '13px',
                color: '#FFFFFF'
              }}>N</span>
              <span style={{ fontSize: '16px', fontWeight: '700', color: '#FFFFFF', fontFamily: 'Outfit' }}>Neuravolt</span>
            </div>
            <p style={{ fontSize: '13px', lineHeight: '1.6' }}>
              Deploy secure private AI workspaces, AI agents, workflows, and database vectors on a single operational platform.
            </p>
          </div>

          {/* Links columns */}
          <div>
            <h4 style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: '700', marginBottom: '16px' }}>Platform</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <a href="#features" style={{ textDecoration: 'none', color: 'inherit' }}>Workspaces</a>
              <a href="#models" style={{ textDecoration: 'none', color: 'inherit' }}>Model Routing</a>
              <a href="#pricing" style={{ textDecoration: 'none', color: 'inherit' }}>Pricing Plans</a>
            </div>
          </div>

          <div>
            <h4 style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: '700', marginBottom: '16px' }}>Resources</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <a href="#developer" style={{ textDecoration: 'none', color: 'inherit' }}>API Keys</a>
              <a href="#developer" style={{ textDecoration: 'none', color: 'inherit' }}>Documentation</a>
              <a href="#why" style={{ textDecoration: 'none', color: 'inherit' }}>System Status</a>
            </div>
          </div>

          <div>
            <h4 style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: '700', marginBottom: '16px' }}>Legal</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link href="/privacy"><a style={{ textDecoration: 'none', color: 'inherit' }}>Privacy Policy</a></Link>
              <Link href="/terms"><a style={{ textDecoration: 'none', color: 'inherit' }}>Terms of Service</a></Link>
              <Link href="/cookies"><a style={{ textDecoration: 'none', color: 'inherit' }}>Cookie Policy</a></Link>
              <Link href="/aup"><a style={{ textDecoration: 'none', color: 'inherit' }}>Acceptable Use Policy</a></Link>
              <Link href="/security"><a style={{ textDecoration: 'none', color: 'inherit' }}>Security Policy</a></Link>
            </div>
          </div>
        </div>

        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          paddingTop: '30px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          fontSize: '12px'
        }}>
          <span>© 2026 Neuravolt Cloud. All rights reserved. Registered Office: Sector 62, Noida, Uttar Pradesh, India - 201301.</span>
          <span>CIN: U72900UP2026PTC123456</span>
        </div>
      </footer>
    </div>
  );
}
