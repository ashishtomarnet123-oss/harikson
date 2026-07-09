import { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';

// ─── DESIGN SYSTEM ───────────────────────────────────────────────────────────
const DS = {
  bg: '#F8FAFC', surface: '#FFFFFF', elevated: '#F1F5F9',
  primary: '#4F8CFF', secondary: '#8B7FFF', success: '#22C55E',
  warning: '#F4B740', error: '#FF5D73',
  heading: '#0F172A', body: '#334155', muted: '#64748B', border: '#E2E8F0',
};

// ─── HOOKS ───────────────────────────────────────────────────────────────────
function useScrolled(threshold = 20) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > threshold);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, [threshold]);
  return scrolled;
}

function useInView(ref, opts = {}) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold: 0.1, ...opts });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return inView;
}

function useCountUp(target, duration = 2000, inView = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start = 0, startTime = null;
    const step = (ts) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target]);
  return count;
}

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

// Blinking dot
const Blink = ({ color = DS.success, size = 6 }) => (
  <span style={{
    display: 'inline-block', width: size, height: size, borderRadius: '50%',
    background: color, animation: 'blink 1.5s ease-in-out infinite',
  }} />
);

// Mini sparkline
const Sparkline = ({ color = DS.primary, height = 36, data }) => {
  const pts = data || Array.from({ length: 20 }, (_, i) => 40 + Math.sin(i * 0.7) * 20 + Math.random() * 15);
  const max = Math.max(...pts), min = Math.min(...pts);
  const norm = pts.map(p => (p - min) / (max - min || 1));
  const w = 120, h = height;
  const path = norm.map((v, i) => `${(i / (norm.length - 1)) * w},${h - v * (h - 4)}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <polyline points={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
    </svg>
  );
};

// GPU Bar
const GpuBar = ({ label, pct, color = DS.primary, animated = true }) => {
  const [current, setCurrent] = useState(pct);
  useEffect(() => {
    if (!animated) return;
    const i = setInterval(() => setCurrent(p => Math.max(20, Math.min(95, p + (Math.random() * 10 - 5)))), 2000);
    return () => clearInterval(i);
  }, [animated]);
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11, color: DS.muted }}>
        <span>{label}</span><span style={{ color: DS.body, fontWeight: 600 }}>{Math.round(current)}%</span>
      </div>
      <div style={{ height: 5, background: DS.border, borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${current}%`, background: color, borderRadius: 99, transition: 'width 1.5s ease' }} />
      </div>
    </div>
  );
};

// Animated Hero Dashboard
const HeroDashboard = () => {
  const [requests, setRequests] = useState(2847);
  const [tokens, setTokens] = useState(1284736);
  const [activeAgents, setActiveAgents] = useState(12);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const i = setInterval(() => {
      setRequests(r => r + Math.floor(Math.random() * 8));
      setTokens(t => t + Math.floor(Math.random() * 400));
      setTick(t => t + 1);
    }, 1800);
    return () => clearInterval(i);
  }, []);

  const agents = [
    { name: 'Sales Bot', status: 'active', model: 'Harikson Plus' },
    { name: 'Legal Analyst', status: 'active', model: 'Harikson+' },
    { name: 'HR Assistant', status: 'idle', model: 'Qwen3-14B' },
    { name: 'Finance AI', status: 'active', model: 'GLM-4' },
  ];

  return (
    <div style={{
      width: '100%', maxWidth: 520, background: DS.surface,
      border: `1px solid ${DS.border}`, borderRadius: 20,
      overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
      fontFamily: 'inherit',
    }}>
      {/* Title bar */}
      <div style={{ padding: '12px 16px', background: DS.elevated, borderBottom: `1px solid ${DS.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        {['#FF5D73','#F4B740','#22C55E'].map(c => <span key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
        <span style={{ fontSize: 12, color: DS.muted, marginLeft: 8, fontWeight: 500 }}>Harikson Control Plane</span>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: DS.success }}>
          <Blink color={DS.success} /> LIVE
        </span>
      </div>

      <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {/* KPI Cards */}
        {[
          { label: 'API Requests', value: requests.toLocaleString(), delta: '+8/s', color: DS.primary },
          { label: 'Tokens Today', value: (tokens / 1000).toFixed(1) + 'K', delta: '+400/s', color: DS.secondary },
          { label: 'Active Agents', value: activeAgents, delta: 'Running', color: DS.success },
          { label: 'GPU Utilization', value: '78%', delta: '4× A100', color: DS.warning },
        ].map(k => (
          <div key={k.label} style={{ background: DS.elevated, borderRadius: 12, padding: '10px 12px', border: `1px solid ${DS.border}` }}>
            <div style={{ fontSize: 10, color: DS.muted, marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: k.color, letterSpacing: '-0.5px' }}>{k.value}</div>
            <div style={{ fontSize: 10, color: DS.muted, marginTop: 2 }}>{k.delta}</div>
          </div>
        ))}
      </div>

      {/* GPU Monitor */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ background: DS.elevated, borderRadius: 12, padding: 12, border: `1px solid ${DS.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: DS.body, marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
            GPU Infrastructure <span style={{ color: DS.success, fontWeight: 500 }}>4 GPUs Healthy</span>
          </div>
          <GpuBar label="A100 #0" pct={78} color={DS.primary} />
          <GpuBar label="A100 #1" pct={62} color={DS.secondary} />
          <GpuBar label="A100 #2" pct={45} color={DS.success} />
          <GpuBar label="A100 #3" pct={91} color={DS.warning} />
        </div>
      </div>

      {/* Agents */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ background: DS.elevated, borderRadius: 12, padding: 12, border: `1px solid ${DS.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: DS.body, marginBottom: 8 }}>Active AI Agents</div>
          {agents.map(a => (
            <div key={a.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 11 }}>
              <Blink color={a.status === 'active' ? DS.success : DS.muted} size={5} />
              <span style={{ color: DS.body, flex: 1 }}>{a.name}</span>
              <span style={{ color: DS.muted }}>{a.model}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Request chart */}
      <div style={{ padding: '0 16px 16px' }}>
        <div style={{ background: DS.elevated, borderRadius: 12, padding: 12, border: `1px solid ${DS.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 11 }}>
            <span style={{ fontWeight: 600, color: DS.body }}>Request Throughput</span>
            <span style={{ color: DS.primary }}>↑ 12.4%</span>
          </div>
          <Sparkline color={DS.primary} />
        </div>
      </div>
    </div>
  );
};

// Section wrapper
const Section = ({ id, children, style = {} }) => {
  const ref = useRef();
  const inView = useInView(ref);
  return (
    <section id={id} ref={ref} style={{
      opacity: inView ? 1 : 0, transform: inView ? 'translateY(0)' : 'translateY(24px)',
      transition: 'opacity 0.7s ease, transform 0.7s ease', ...style,
    }}>
      {children}
    </section>
  );
};

const Tag = ({ children, color = DS.primary }) => (
  <span style={{
    display: 'inline-block', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
    textTransform: 'uppercase', color, padding: '4px 12px',
    background: color + '18', border: `1px solid ${color}30`, borderRadius: 99, marginBottom: 16,
  }}>{children}</span>
);

const SectionTitle = ({ children, size = 42, center = false }) => (
  <h2 style={{
    fontSize: size, fontWeight: 800, color: DS.heading, letterSpacing: '-1.5px',
    lineHeight: 1.1, margin: '0 0 16px', textAlign: center ? 'center' : undefined,
  }}>{children}</h2>
);

const SectionSub = ({ children, center = false }) => (
  <p style={{
    fontSize: 17, color: DS.muted, lineHeight: 1.7, margin: '0 0 56px',
    maxWidth: center ? 560 : undefined, textAlign: center ? 'center' : undefined,
  }}>{children}</p>
);

// Feature Card
const FCard = ({ icon, title, desc, accent = DS.primary }) => {
  const [hover, setHover] = useState(false);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{
      background: hover ? DS.elevated : DS.surface,
      border: `1px solid ${hover ? DS.primary + '40' : DS.border}`,
      borderRadius: 20, padding: 28, cursor: 'default',
      transition: 'all 0.25s ease', transform: hover ? 'translateY(-4px)' : 'none',
      boxShadow: hover ? `0 20px 40px rgba(0,0,0,0.3), 0 0 0 1px ${DS.primary}20` : 'none',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, background: accent + '18',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, marginBottom: 16, border: `1px solid ${accent}20`,
      }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: DS.heading, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13, color: DS.muted, lineHeight: 1.65 }}>{desc}</div>
    </div>
  );
};

// Pricing Card
const PricingCard = ({ plan, price, period, desc, features, cta, highlight, badge }) => {
  const [hover, setHover] = useState(false);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{
      background: highlight ? `linear-gradient(180deg, ${DS.elevated} 0%, #13141A 100%)` : DS.surface,
      border: `1px solid ${highlight ? DS.primary + '60' : DS.border}`,
      borderRadius: 20, padding: 32, position: 'relative', flex: 1,
      boxShadow: highlight ? `0 0 60px ${DS.primary}20, 0 0 0 1px ${DS.primary}30` : 'none',
      transform: highlight ? 'scale(1.02)' : hover ? 'translateY(-4px)' : 'none',
      transition: 'all 0.25s ease',
    }}>
      {badge && (
        <div style={{
          position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
          background: DS.primary, color: '#fff', fontSize: 11, fontWeight: 700,
          padding: '4px 14px', borderRadius: 99, whiteSpace: 'nowrap', letterSpacing: '0.05em',
        }}>{badge}</div>
      )}
      <div style={{ fontSize: 12, fontWeight: 700, color: DS.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>{plan}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
        <span style={{ fontSize: 40, fontWeight: 900, color: DS.heading, letterSpacing: '-2px' }}>{price}</span>
        {period && <span style={{ fontSize: 14, color: DS.muted }}>{period}</span>}
      </div>
      <p style={{ fontSize: 13, color: DS.muted, marginBottom: 24, lineHeight: 1.5 }}>{desc}</p>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px' }}>
        {features.map(f => (
          <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0', fontSize: 13, color: DS.body, borderBottom: `1px solid ${DS.border}30` }}>
            <span style={{ color: DS.success, marginTop: 1, flexShrink: 0, fontSize: 12 }}>✓</span>{f}
          </li>
        ))}
      </ul>
      <Link href="/signup" style={{
        display: 'block', textAlign: 'center', padding: '12px',
        background: highlight ? DS.primary : 'transparent',
        border: `1px solid ${highlight ? 'transparent' : DS.border}`,
        color: highlight ? '#fff' : DS.body, borderRadius: 14,
        fontWeight: 600, fontSize: 14, textDecoration: 'none',
        transition: 'all 0.2s', boxShadow: highlight ? `0 8px 24px ${DS.primary}40` : 'none',
      }}>{cta}</Link>
    </div>
  );
};

// Testimonial Card
const TestiCard = ({ quote, name, role, company, avatar }) => (
  <div style={{
    background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 20,
    padding: 28, display: 'flex', flexDirection: 'column', gap: 20,
  }}>
    <div style={{ fontSize: 32, color: DS.primary, lineHeight: 1 }}>"</div>
    <p style={{ fontSize: 15, color: DS.body, lineHeight: 1.7, margin: 0, flex: 1 }}>{quote}</p>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%', background: DS.primary + '30',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, color: DS.primary, fontWeight: 700,
      }}>{avatar}</div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: DS.heading }}>{name}</div>
        <div style={{ fontSize: 12, color: DS.muted }}>{role} · {company}</div>
      </div>
    </div>
  </div>
);

// Code Tab
const CodeTab = ({ tabs }) => {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(tabs[active].code).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ background: '#0D1117', border: `1px solid ${DS.border}`, borderRadius: 20, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: `1px solid ${DS.border}`, gap: 2, overflowX: 'auto' }}>
        {tabs.map((t, i) => (
          <button key={t.label} onClick={() => setActive(i)} style={{
            padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: active === i ? DS.primary + '20' : 'transparent',
            color: active === i ? DS.primary : DS.muted, transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}>{t.label}</button>
        ))}
        <button onClick={copy} style={{
          marginLeft: 'auto', padding: '5px 12px', borderRadius: 8, border: `1px solid ${DS.border}`,
          background: 'transparent', color: DS.muted, fontSize: 11, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap',
        }}>{copied ? '✓ Copied' : 'Copy'}</button>
      </div>
      <pre style={{ margin: 0, padding: '20px', overflow: 'auto', fontSize: 13, lineHeight: 1.7, color: DS.body }}>
        <code dangerouslySetInnerHTML={{ __html: tabs[active].html }} />
      </pre>
    </div>
  );
};

// FAQ Item
const FaqItem = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: `1px solid ${DS.border}` }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', textAlign: 'left', padding: '20px 0', background: 'none', border: 'none',
        cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        color: DS.heading, fontSize: 15, fontWeight: 600,
      }}>
        {q}
        <span style={{ color: DS.muted, fontSize: 20, transition: 'transform 0.2s', transform: open ? 'rotate(45deg)' : 'none', flexShrink: 0, marginLeft: 16 }}>+</span>
      </button>
      {open && <div style={{ fontSize: 14, color: DS.muted, lineHeight: 1.7, paddingBottom: 20 }}>{a}</div>}
    </div>
  );
};

// Use Case Card
const UseCaseCard = ({ icon, title, desc, tags }) => {
  const [hover, setHover] = useState(false);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{
      background: hover ? DS.elevated : DS.surface, border: `1px solid ${hover ? DS.border : DS.border}`,
      borderRadius: 20, padding: 24, transition: 'all 0.25s', transform: hover ? 'translateY(-3px)' : 'none',
    }}>
      <div style={{ fontSize: 28, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: DS.heading, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13, color: DS.muted, lineHeight: 1.6, marginBottom: 12 }}>{desc}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {tags.map(t => <span key={t} style={{ fontSize: 10, color: DS.primary, background: DS.primary + '12', border: `1px solid ${DS.primary}20`, borderRadius: 99, padding: '2px 8px', fontWeight: 600 }}>{t}</span>)}
      </div>
    </div>
  );
};

// ─── DATA ────────────────────────────────────────────────────────────────────
const WHY_CARDS = [
  { icon: '🇮🇳', title: 'DPDP Act 2023 Compliant', desc: 'Built for India\'s Digital Personal Data Protection Act. Zero cross-border data transfer. Strictly sovereign.', accent: DS.primary },
  { icon: '💬', title: 'WhatsApp Business API', desc: 'Deploy your custom AI agents directly on WhatsApp with one click. Ideal for Indian customer acquisition & support.', accent: DS.secondary },
  { icon: '🔌', title: 'India Stack Native', desc: 'Integrate out-of-the-box with UPI payment checks, DigiLocker, Aadhaar verification, and GST portal tools.', accent: DS.success },
  { icon: '🗣️', title: 'Indic Multilingual Engine', desc: 'Prompt and process natively in Hindi, Tamil, Telugu, Marathi, Kannada, Bengali, and 16 other regional Indian languages.', accent: DS.warning },
  { icon: '🔒', title: 'Private AI Infrastructure', desc: 'Deploy AI inside your own cloud or on-premise. Your data never leaves your infrastructure perimeter — ever.', accent: DS.primary },
  { icon: '🤖', title: 'Enterprise AI Agents', desc: 'Build specialized AI employees with custom personas, tools, knowledge, and escalation policies.', accent: DS.secondary },
  { icon: '📚', title: 'Knowledge Engine', desc: 'Transform company knowledge into intelligent AI. Upload docs, index wikis, query databases — all grounded in your data.', accent: DS.success },
  { icon: '⚡', title: 'Workflow Automation', desc: 'Automate complex business operations with multi-step AI pipelines. Event-driven, scheduled, or API-triggered.', accent: DS.warning },
  { icon: '🔀', title: 'Model Orchestration', desc: 'Route requests intelligently across GLM-4, Llama, Mistral, Harikson Plus from one unified control plane.', accent: DS.primary },
  { icon: '💻', title: 'GPU Infrastructure', desc: 'Monitor every GPU in real time. Utilization, VRAM, temperature, power draw — all from one dashboard.', accent: '#06B6D4' },
  { icon: '🛡️', title: 'Security Center', desc: 'Complete audit logging, IP allowlists, failed login detection, and role-based access control across all tenants.', accent: DS.error },
  { icon: '🌐', title: 'Open Standards', desc: 'Built on open infrastructure. PostgreSQL, Redis, Docker, Kubernetes. No vendor lock-in by design.', accent: '#06B6D4' },
];

const USE_CASES = [
  { icon: '🎧', title: 'Enterprise Support', desc: 'Resolve tickets 5× faster with AI that knows your entire product documentation.', tags: ['RAG', 'Agents', 'Triage'] },
  { icon: '💼', title: 'Sales Intelligence', desc: 'AI-powered deal coaching, objection handling, and CRM enrichment at scale.', tags: ['Agents', 'Workflows', 'APIs'] },
  { icon: '⚖️', title: 'Legal & Compliance', desc: 'Contract analysis, regulatory monitoring, and compliance checks — private and secure.', tags: ['RAG', 'Privacy', 'Audit'] },
  { icon: '🏥', title: 'Healthcare', desc: 'HIPAA-compliant AI for clinical documentation, research, and patient communication.', tags: ['Privacy', 'Security', 'RAG'] },
  { icon: '📈', title: 'Finance & Banking', desc: 'AI-driven risk analysis, report generation, and regulatory compliance automation.', tags: ['Security', 'Audit', 'RAG'] },
  { icon: '🏭', title: 'Manufacturing', desc: 'Predictive maintenance, quality control AI, and supply chain intelligence.', tags: ['Workflows', 'Agents', 'APIs'] },
  { icon: '🏛️', title: 'Government', desc: 'On-premise, air-gapped AI deployments that meet the strictest sovereignty requirements.', tags: ['Private', 'Security', 'Compliance'] },
  { icon: '🎓', title: 'Education', desc: 'Personalized learning AI, course generation, and academic research acceleration.', tags: ['Knowledge', 'Agents', 'RAG'] },
  { icon: '👥', title: 'Human Resources', desc: 'AI-powered talent matching, onboarding automation, and employee experience.', tags: ['Workflows', 'Agents', 'Privacy'] },
  { icon: '🖥️', title: 'IT Operations', desc: 'Intelligent incident response, runbook automation, and infrastructure monitoring.', tags: ['Workflows', 'APIs', 'Monitoring'] },
  { icon: '🔬', title: 'Research & Dev', desc: 'Accelerate R&D cycles with AI-powered literature review, hypothesis generation, and data analysis.', tags: ['Knowledge', 'RAG', 'Agents'] },
  { icon: '📢', title: 'Marketing', desc: 'Content generation at enterprise scale with brand voice, compliance checks, and performance analytics.', tags: ['Agents', 'Workflows', 'APIs'] },
];

const CODE_TABS = [
  {
    label: 'REST API',
    code: `curl -X POST https://api.harikson.ai/api/chat \\
  -H "x-api-key: hk_live_sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Summarize the Q4 board report", "agent_id": "ag_sales_001"}'`,
    html: `<span style="color:#94A3B8">curl</span> -X POST <span style="color:#4F8CFF">https://api.harikson.ai/api/chat</span> \\
  -H <span style="color:#86EFAC">"x-api-key: hk_live_sk_..."</span> \\
  -H <span style="color:#86EFAC">"Content-Type: application/json"</span> \\
  -d <span style="color:#86EFAC">'{"message": "Summarize the Q4 board report", "agent_id": "ag_sales_001"}'</span>`,
  },
  {
    label: 'Python',
    code: `from harikson import HariksonClient
client = HariksonClient(api_key="hk_live_sk_...")
response = client.chat(
    agent_id="ag_sales_001",
    message="Summarize the Q4 board report",
    stream=True,
)
for chunk in response:
    print(chunk.content, end="", flush=True)`,
    html: `<span style="color:#C084FC">from</span> harikson <span style="color:#C084FC">import</span> HariksonClient
client = HariksonClient(api_key=<span style="color:#86EFAC">"hk_live_sk_..."</span>)
response = client.<span style="color:#4F8CFF">chat</span>(
    agent_id=<span style="color:#86EFAC">"ag_sales_001"</span>,
    message=<span style="color:#86EFAC">"Summarize the Q4 board report"</span>,
    stream=<span style="color:#F4B740">True</span>,
)
<span style="color:#C084FC">for</span> chunk <span style="color:#C084FC">in</span> response:
    <span style="color:#C084FC">print</span>(chunk.content, end=<span style="color:#86EFAC">""</span>, flush=<span style="color:#F4B740">True</span>)`,
  },
  {
    label: 'JavaScript',
    code: `import { HariksonClient } from '@harikson/sdk';
const client = new HariksonClient({ apiKey: 'hk_live_sk_...' });
const stream = await client.chat.stream({
  agentId: 'ag_sales_001',
  message: 'Summarize the Q4 board report',
});
for await (const chunk of stream) {
  process.stdout.write(chunk.content);
}`,
    html: `<span style="color:#C084FC">import</span> { HariksonClient } <span style="color:#C084FC">from</span> <span style="color:#86EFAC">'@harikson/sdk'</span>;
<span style="color:#C084FC">const</span> client = <span style="color:#C084FC">new</span> HariksonClient({ apiKey: <span style="color:#86EFAC">'hk_live_sk_...'</span> });
<span style="color:#C084FC">const</span> stream = <span style="color:#C084FC">await</span> client.chat.<span style="color:#4F8CFF">stream</span>({
  agentId: <span style="color:#86EFAC">'ag_sales_001'</span>,
  message: <span style="color:#86EFAC">'Summarize the Q4 board report'</span>,
});
<span style="color:#C084FC">for await</span> (<span style="color:#C084FC">const</span> chunk <span style="color:#C084FC">of</span> stream) {
  process.stdout.<span style="color:#4F8CFF">write</span>(chunk.content);
}`,
  },
  {
    label: 'CLI',
    code: `# Install Harikson CLI
npm install -g @harikson/cli

# Initialize project
hk init --tenant mycompany

# Deploy an agent
hk agent deploy ./agents/sales-bot.yaml

# Stream a chat response
hk chat --agent ag_sales_001 "Summarize Q4 report"`,
    html: `<span style="color:#94A3B8"># Install Harikson CLI</span>
npm install -g @harikson/cli

<span style="color:#94A3B8"># Initialize project</span>
hk <span style="color:#4F8CFF">init</span> --tenant mycompany

<span style="color:#94A3B8"># Deploy an agent</span>
hk agent <span style="color:#4F8CFF">deploy</span> ./agents/sales-bot.yaml

<span style="color:#94A3B8"># Stream a chat response</span>
hk <span style="color:#4F8CFF">chat</span> --agent ag_sales_001 <span style="color:#86EFAC">"Summarize Q4 report"</span>`,
  },
];

const TESTIMONIALS = [
  { quote: 'Harikson let us deploy GPT-class AI inside our own infrastructure in a week. Our data never left our servers — which was a hard blocker with every other solution.', name: 'Rajesh Menon', role: 'CTO', company: 'IndiaTech Corp', avatar: 'R' },
  { quote: 'The multi-tenant architecture is exactly what we needed for our enterprise SaaS. Each client gets an isolated AI environment. Harikson is the operating system layer we were missing.', name: 'Priya Sharma', role: 'Engineering Manager', company: 'CloudPlatform Inc', avatar: 'P' },
  { quote: "We replaced three different AI tools with Harikson. The agent builder, knowledge base, and analytics are all in one place. Our engineering team's velocity doubled.", name: 'Arjun Nair', role: 'Founder & CEO', company: 'Nexus AI Labs', avatar: 'A' },
  { quote: 'Compliance was our biggest concern. Harikson\'s private deployment model and audit logging gave us everything our legal team needed to approve AI across the company.', name: 'Deepika Reddy', role: 'Enterprise Architect', company: 'FinancePro Systems', avatar: 'D' },
];

const PLANS = [
  {
    plan: 'Starter', price: '₹999', period: '/month',
    desc: 'For developers and small teams building their first AI products.',
    features: ['1 AI Agent', '50K tokens/month', '1 Knowledge Base (10 docs)', '1 tenant workspace', 'REST API access', 'Community support'],
    cta: 'Start Free Trial',
  },
  {
    plan: 'Professional', price: '₹9,999', period: '/month',
    desc: 'For growing teams shipping production AI infrastructure.',
    features: ['25 AI Agents', '2M tokens/month', 'Unlimited Knowledge Bases', '10 tenant workspaces', 'Workflow Automation', 'Model Orchestration', 'GPU Monitoring', 'Priority support'],
    cta: 'Get Started', highlight: true, badge: 'Most Popular',
  },
  {
    plan: 'Enterprise', price: 'Custom', period: '',
    desc: 'Full control, SLAs, on-premise deployment, and dedicated infrastructure.',
    features: ['Unlimited Agents', 'Unlimited tokens', 'On-premise / air-gapped', 'SSO & SAML', 'Custom models / fine-tuning', 'SLA 99.99% uptime', 'Dedicated engineer', 'SOC 2, ISO 27001'],
    cta: 'Talk to Sales',
  },
];

const FAQS = [
  { q: 'Is Harikson truly private? Does data leave my servers?', a: 'No. Harikson is designed for full on-premise and private cloud deployment. Your data, models, and inference results never leave your infrastructure. We do not have access to your data.' },
  { q: 'Which AI models does Harikson support?', a: 'Harikson supports Qwen3 (8B, 14B, 32B), GLM-4, Llama 3, Mistral, and our own Harikson Plus model. You can run any Ollama-compatible model. Custom fine-tuned models are supported in Enterprise.' },
  { q: 'How is multi-tenancy handled?', a: 'Each tenant gets a completely isolated PostgreSQL schema with row-level security (RLS). API keys, agents, knowledge bases, and usage data are fully scoped to each tenant. No data cross-contamination is possible.' },
  { q: 'What infrastructure does Harikson run on?', a: 'Harikson runs on Docker and Kubernetes on any cloud (AWS, GCP, Azure, OCI) or on-premise hardware. It uses PostgreSQL, Redis, and Ollama for inference. No proprietary infrastructure dependencies.' },
  { q: 'Is Harikson SOC 2 compliant?', a: 'Harikson is SOC 2 Type II ready by architecture — audit logs, RBAC, encryption at rest and in transit, and access controls are all built in. Enterprise customers receive full compliance documentation.' },
  { q: 'How do I get started?', a: 'You can deploy Harikson in minutes using our Docker Compose setup. Start with the Starter plan to explore the platform, or book a demo to walk through the Enterprise deployment with our team.' },
  { q: 'What is the pricing model?', a: 'Harikson is priced by agents, tokens, and tenants. Starter is ₹999/month. Professional is ₹9,999/month for larger teams. Enterprise is custom-priced based on infrastructure scale, SLA requirements, and support level.' },
  { q: 'Does Harikson support RAG?', a: 'Yes. Harikson has a full RAG pipeline built in — document upload, chunking, embedding, vector storage, and retrieval. Knowledge Bases can be attached to any AI Agent for grounded, accurate responses.' },
];

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function Home() {
  const scrolled = useScrolled(30);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const statsRef = useRef();
  const statsInView = useInView(statsRef);
  const reqCount = useCountUp(1284738, 2500, statsInView);
  const agentCount = useCountUp(847, 2000, statsInView);
  const tenantCount = useCountUp(312, 1800, statsInView);
  const uptimeCount = useCountUp(99.99, 2200, statsInView);

  const C = `max-width: 1180px; margin: 0 auto; padding: 0 24px;`;

  return (
    <>
      <Head>
        <title>Harikson AI — Enterprise AI Operating System</title>
        <meta name="description" content="Deploy private AI agents, enterprise LLMs, secure knowledge bases, workflow automation, and GPU infrastructure from one unified platform. Built for enterprise." />
        <meta name="keywords" content="Enterprise AI, Private AI, Self Hosted AI, Enterprise LLM, AI Infrastructure, AI Agents, RAG Platform, Model Management, Knowledge Base AI" />
        <meta property="og:title" content="Harikson AI — Enterprise AI Operating System" />
        <meta property="og:description" content="The operating system for enterprise artificial intelligence. Private, scalable, and built for serious products." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </Head>

      <div style={{ background: DS.bg, color: DS.body, fontFamily: "'Inter', -apple-system, sans-serif", minHeight: '100vh', overflowX: 'hidden' }}>

        {/* ── NAV ── */}
        <nav style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          padding: scrolled ? '12px 0' : '20px 0',
          background: scrolled ? 'rgba(255,255,255,0.90)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled ? `1px solid ${DS.border}` : '1px solid transparent',
          transition: 'all 0.3s ease',
        }}>
          <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginRight: 24 }}>
              <div style={{
                width: 32, height: 32, background: `linear-gradient(135deg, ${DS.primary}, ${DS.secondary})`,
                borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: 800, color: '#fff',
              }}>H</div>
              <span style={{ fontWeight: 800, fontSize: 16, color: DS.heading, letterSpacing: '-0.3px' }}>Harikson AI</span>
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }} className="nav-links-desktop">
              {['Products', 'Solutions', 'Developers', 'Resources', 'Pricing', 'Company'].map(l => (
                <a key={l} href={`#${l.toLowerCase()}`} style={{ color: DS.muted, fontSize: 13, fontWeight: 500, padding: '6px 12px', borderRadius: 8, textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.target.style.color = DS.body} onMouseLeave={e => e.target.style.color = DS.muted}>{l}</a>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="nav-actions-desktop">
              <Link href="/login" style={{ color: DS.muted, fontSize: 13, fontWeight: 500, padding: '7px 14px', borderRadius: 10, textDecoration: 'none', border: `1px solid transparent`, transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.color = DS.body; e.currentTarget.style.borderColor = DS.border; }}
                onMouseLeave={e => { e.currentTarget.style.color = DS.muted; e.currentTarget.style.borderColor = 'transparent'; }}>
                Log in
              </Link>
              <Link href="/signup" style={{ background: DS.surface, color: DS.body, fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: 10, textDecoration: 'none', border: `1px solid ${DS.border}`, transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = DS.muted; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = DS.border; }}>
                Book Demo
              </Link>
              <Link href="/signup" style={{
                background: DS.primary, color: '#fff', fontSize: 13, fontWeight: 700, padding: '7px 16px',
                borderRadius: 10, textDecoration: 'none', transition: 'all 0.2s',
                boxShadow: `0 4px 14px ${DS.primary}40`,
              }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'none'; }}>
                Start Free
              </Link>
            </div>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', padding: '120px 0 80px', position: 'relative', overflow: 'hidden' }}>
          {/* Background grid */}
          <div style={{
            position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${DS.border} 1px, transparent 1px), linear-gradient(90deg, ${DS.border} 1px, transparent 1px)`,
            backgroundSize: '48px 48px', opacity: 0.5, maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)',
          }} />
          {/* Glow */}
          <div style={{ position: 'absolute', width: 700, height: 700, background: `radial-gradient(ellipse, ${DS.primary}14 0%, transparent 70%)`, top: -100, left: -100, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', width: 500, height: 500, background: `radial-gradient(ellipse, ${DS.secondary}10 0%, transparent 70%)`, top: 0, right: -50, pointerEvents: 'none' }} />

          <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center', position: 'relative', zIndex: 1, width: '100%' }}>
            {/* Left */}
            <div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 99,
                padding: '6px 14px', fontSize: 12, fontWeight: 600, color: DS.muted, marginBottom: 28,
              }}>
                <Blink color={DS.success} />
                🇮🇳 Sovereign Indian Enterprise AI Platform
              </div>

              <h1 style={{ fontSize: 'clamp(40px, 5.5vw, 68px)', fontWeight: 900, color: DS.heading, letterSpacing: '-2.5px', lineHeight: 1.06, margin: '0 0 24px' }}>
                Enterprise AI.<br />
                <span style={{ color: DS.primary }}>Built for Privacy.</span><br />
                Powered by Your<br />Infrastructure.
              </h1>

              <p style={{ fontSize: 18, color: DS.muted, lineHeight: 1.7, margin: '0 0 36px', maxWidth: 480 }}>
                Deploy private AI agents, enterprise language models, secure knowledge bases, workflow automation, and model orchestration from one unified platform.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
                <Link href="/signup" style={{
                  background: DS.primary, color: '#fff', fontWeight: 700, fontSize: 15,
                  padding: '13px 28px', borderRadius: 14, textDecoration: 'none',
                  display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: `0 8px 28px ${DS.primary}40`, transition: 'all 0.2s',
                }}>Start Free →</Link>
                <Link href="/signup" style={{
                  background: DS.surface, border: `1px solid ${DS.border}`, color: DS.body,
                  fontWeight: 600, fontSize: 15, padding: '13px 24px', borderRadius: 14,
                  textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s',
                }}>Book Demo</Link>
                <a href="#demo" style={{
                  background: 'transparent', color: DS.muted, fontWeight: 600, fontSize: 15,
                  padding: '13px 20px', borderRadius: 14, textDecoration: 'none',
                  display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s',
                }}>
                  <span style={{ width: 32, height: 32, borderRadius: '50%', border: `1px solid ${DS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>▶</span>
                  Watch Demo
                </a>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, fontSize: 12, color: DS.muted }}>
                {['✓ Made in India · Built for World', '✓ DPDP Act 2023 Compliant', '✓ Sovereign Data Residency', '✓ Self-Hosted / On-Premise'].map(t => (
                  <span key={t} style={{ fontWeight: 500 }}>{t}</span>
                ))}
              </div>
            </div>

            {/* Right — Animated Dashboard */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <HeroDashboard />
            </div>
          </div>
        </section>

        {/* ── TRUST BAR ── */}
        <div style={{ borderTop: `1px solid ${DS.border}`, borderBottom: `1px solid ${DS.border}`, padding: '28px 0', background: DS.surface }}>
          <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px' }}>
            <div style={{ textAlign: 'center', fontSize: 12, color: DS.muted, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 24 }}>
              Trusted by modern engineering teams
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 40 }}>
              {['TechCorp', 'FinancePro', 'CloudBase', 'DataStack', 'EnterAI', 'BuildCo'].map(c => (
                <div key={c} style={{ fontSize: 14, fontWeight: 700, color: DS.border, letterSpacing: '0.05em', filter: 'grayscale(1)', opacity: 0.5 }}>{c}</div>
              ))}
              <div style={{ width: 1, height: 20, background: DS.border }} />
              {['🔒 SOC 2 ready', '🛡️ DPDP Act Compliant', '🇮🇳 100% Indian Data Residency', '⚡ 99.99% Uptime', '🏠 On-Premise / Air-Gapped'].map(b => (
                <div key={b} style={{ fontSize: 11, fontWeight: 600, color: DS.muted, background: DS.elevated, border: `1px solid ${DS.border}`, borderRadius: 99, padding: '4px 12px' }}>{b}</div>
              ))}
            </div>
          </div>
        </div>

        {/* ── STATS ── */}
        <Section style={{ padding: '80px 0', background: DS.bg }}>
          <div ref={statsRef} style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
            {[
              { value: reqCount.toLocaleString(), label: 'API Requests Served', suffix: '+' },
              { value: agentCount, label: 'AI Agents Deployed', suffix: '+' },
              { value: tenantCount, label: 'Enterprise Tenants', suffix: '+' },
              { value: '99.99', label: 'Uptime SLA', suffix: '%' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', padding: 28, background: DS.surface, borderRadius: 20, border: `1px solid ${DS.border}` }}>
                <div style={{ fontSize: 44, fontWeight: 900, color: DS.heading, letterSpacing: '-2px' }}>{s.value}{s.suffix}</div>
                <div style={{ fontSize: 13, color: DS.muted, marginTop: 6 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── WHY HARIKSON ── */}
        <Section id="products" style={{ padding: '100px 0' }}>
          <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px' }}>
            <div style={{ textAlign: 'center', marginBottom: 60 }}>
              <Tag>Platform</Tag>
              <SectionTitle center>Everything you need to build enterprise AI</SectionTitle>
              <SectionSub center>No stitching together 10 different tools. One platform, one API, one control plane for all your AI infrastructure.</SectionSub>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {WHY_CARDS.map(c => <FCard key={c.title} {...c} />)}
            </div>
          </div>
        </Section>

        {/* ── PLATFORM ARCHITECTURE ── */}
        <Section id="solutions" style={{ padding: '100px 0', background: DS.surface, borderTop: `1px solid ${DS.border}`, borderBottom: `1px solid ${DS.border}` }}>
          <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px' }}>
            <div style={{ textAlign: 'center', marginBottom: 60 }}>
              <Tag color={DS.secondary}>Architecture</Tag>
              <SectionTitle center>Unified AI platform architecture</SectionTitle>
              <SectionSub center>Every layer is designed for enterprise reliability, privacy, and scale.</SectionSub>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, overflowX: 'auto', paddingBottom: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, minWidth: 800 }}>
                {[
                  { label: 'Your Business Applications', color: DS.secondary, top: true },
                  null,
                  { label: 'Harikson API Gateway', color: DS.primary },
                  null,
                  { label: 'Harikson Core Engine', color: DS.primary, wide: true },
                  null,
                  { label: 'Model Router & Orchestrator', color: DS.muted },
                  null,
                ].map((item, i) => item === null ? (
                  <div key={i} style={{ width: 2, height: 28, background: `linear-gradient(${DS.border}, ${DS.primary}40)` }} />
                ) : (
                  <div key={item.label} style={{ padding: '12px 24px', background: DS.elevated, border: `1px solid ${item.color}40`, borderRadius: 12, color: item.color, fontWeight: 600, fontSize: 13, letterSpacing: '0.02em' }}>
                    {item.label}
                  </div>
                ))}
                {/* Models row */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {['Harikson Plus', 'GLM-4-9B', 'Llama 3', 'Mistral', 'Custom'].map((m, i) => (
                    <div key={m} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                      <div style={{ width: 2, height: 20, background: DS.border }} />
                      <div style={{ padding: '8px 14px', background: DS.bg, border: `1px solid ${DS.primary}30`, borderRadius: 10, color: DS.body, fontWeight: 600, fontSize: 12, animation: `modelpulse ${1.5 + i * 0.3}s ease-in-out infinite alternate` }}>{m}</div>
                    </div>
                  ))}
                </div>
                <div style={{ width: 2, height: 28, background: `linear-gradient(${DS.border}, ${DS.primary}40)` }} />
                <div style={{ display: 'flex', gap: 16 }}>
                  {[{ label: 'Knowledge Base', color: DS.success }, { label: 'Vector Database', color: DS.secondary }, { label: 'AI Agents', color: DS.warning }].map(b => (
                    <div key={b.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                      <div style={{ width: 2, height: 20, background: DS.border }} />
                      <div style={{ padding: '8px 16px', background: DS.elevated, border: `1px solid ${b.color}40`, borderRadius: 10, color: b.color, fontWeight: 600, fontSize: 12 }}>{b.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── DEVELOPER EXPERIENCE ── */}
        <Section id="developers" style={{ padding: '100px 0' }}>
          <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px', display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 64, alignItems: 'start' }}>
            <div>
              <Tag>Developer First</Tag>
              <SectionTitle>Built for engineers who care about quality</SectionTitle>
              <p style={{ fontSize: 16, color: DS.muted, lineHeight: 1.7, marginBottom: 32 }}>
                OpenAI-compatible REST API. Python and JavaScript SDKs. CLI. Streaming support. Webhook events. Built-in observability. Everything you expect from a world-class developer platform.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {['OpenAI-compatible API format', 'Streaming SSE responses', 'Python, JS, and CLI SDKs', 'Built-in request tracing', 'Webhook events', 'Rate limiting & quotas'].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: DS.body }}>
                    <span style={{ color: DS.success, fontSize: 12, fontWeight: 700 }}>✓</span>{f}
                  </div>
                ))}
              </div>
            </div>
            <CodeTab tabs={CODE_TABS} />
          </div>
        </Section>

        {/* ── SECURITY ── */}
        <Section id="security" style={{ padding: '100px 0', background: DS.surface, borderTop: `1px solid ${DS.border}`, borderBottom: `1px solid ${DS.border}` }}>
          <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px' }}>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <Tag color={DS.error}>Security</Tag>
              <SectionTitle center>Enterprise-grade security, by design</SectionTitle>
              <SectionSub center>Every Harikson deployment is hardened from day one. Not bolted on after.</SectionSub>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
              {[
                { icon: '👤', title: 'RBAC', desc: 'Role-based access control with granular permission scoping' },
                { icon: '🔑', title: 'JWT Auth', desc: 'Stateless JWT authentication with configurable expiry' },
                { icon: '🔓', title: 'SSO / SAML', desc: 'Enterprise SSO via SAML 2.0 and OAuth 2.0' },
                { icon: '📋', title: 'Audit Logs', desc: 'Every action logged with actor, timestamp, and IP address' },
                { icon: '🔐', title: 'AES-256', desc: 'Data encrypted at rest and in transit, always' },
                { icon: '🏠', title: 'Private Deploy', desc: 'On-premise or air-gapped. Your cloud, your rules' },
                { icon: '📡', title: 'Monitoring', desc: 'Real-time security event monitoring and alerting' },
                { icon: '✅', title: 'SOC 2', desc: 'SOC 2 Type II ready architecture and documentation' },
                { icon: '🔒', title: 'Data Isolation', desc: 'Row-level security — zero cross-tenant data leakage' },
                { icon: '🛡️', title: 'API Security', desc: 'Rate limiting, IP allowlisting, and API key rotation' },
              ].map(s => (
                <div key={s.title} style={{ background: DS.elevated, border: `1px solid ${DS.border}`, borderRadius: 16, padding: 20 }}>
                  <div style={{ fontSize: 22, marginBottom: 10 }}>{s.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: DS.heading, marginBottom: 6 }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: DS.muted, lineHeight: 1.5 }}>{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── USE CASES ── */}
        <Section id="solutions" style={{ padding: '100px 0' }}>
          <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px' }}>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <Tag color={DS.success}>Use Cases</Tag>
              <SectionTitle center>AI for every industry</SectionTitle>
              <SectionSub center>From healthcare to finance to government — Harikson adapts to your sector's requirements.</SectionSub>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {USE_CASES.map(u => <UseCaseCard key={u.title} {...u} />)}
            </div>
          </div>
        </Section>

        {/* ── TESTIMONIALS ── */}
        <Section style={{ padding: '100px 0', background: DS.surface, borderTop: `1px solid ${DS.border}`, borderBottom: `1px solid ${DS.border}` }}>
          <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px' }}>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <Tag>Customer Stories</Tag>
              <SectionTitle center>Teams that build on Harikson</SectionTitle>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
              {TESTIMONIALS.map(t => <TestiCard key={t.name} {...t} />)}
            </div>
          </div>
        </Section>

        {/* ── PRICING ── */}
        <Section id="pricing" style={{ padding: '100px 0' }}>
          <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px' }}>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <Tag color={DS.warning}>Pricing</Tag>
              <SectionTitle center>Simple, transparent pricing</SectionTitle>
              <SectionSub center>Start free. Scale to enterprise. No hidden fees, no per-seat madness.</SectionSub>
            </div>
            <div style={{ display: 'flex', gap: 20, alignItems: 'stretch' }}>
              {PLANS.map(p => <PricingCard key={p.plan} {...p} />)}
            </div>
          </div>
        </Section>

        {/* ── FAQ ── */}
        <Section id="resources" style={{ padding: '100px 0', background: DS.surface, borderTop: `1px solid ${DS.border}`, borderBottom: `1px solid ${DS.border}` }}>
          <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px' }}>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <Tag>FAQ</Tag>
              <SectionTitle center>Common questions</SectionTitle>
            </div>
            {FAQS.map(f => <FaqItem key={f.q} {...f} />)}
          </div>
        </Section>

        {/* ── FINAL CTA ── */}
        <Section style={{ padding: '120px 0' }}>
          <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px' }}>
            <div style={{ textAlign: 'center', padding: '80px 40px', background: DS.surface, border: `1px solid ${DS.primary}25`, borderRadius: 28, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 60% 80% at 50% 50%, ${DS.primary}08 0%, transparent 70%)`, pointerEvents: 'none' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <Tag>Get Started</Tag>
                <h2 style={{ fontSize: 52, fontWeight: 900, color: DS.heading, letterSpacing: '-2px', margin: '0 0 20px', lineHeight: 1.08 }}>
                  Ready to build<br />Enterprise AI?
                </h2>
                <p style={{ fontSize: 18, color: DS.muted, maxWidth: 500, margin: '0 auto 40px', lineHeight: 1.6 }}>
                  Build your private AI platform with Harikson. Deploy today — no vendor lock-in, no data exposure, no compromise.
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Link href="/signup" style={{ background: DS.primary, color: '#fff', fontWeight: 700, fontSize: 15, padding: '14px 32px', borderRadius: 14, textDecoration: 'none', boxShadow: `0 10px 30px ${DS.primary}40` }}>Start Free →</Link>
                  <Link href="/signup" style={{ background: DS.elevated, border: `1px solid ${DS.border}`, color: DS.body, fontWeight: 600, fontSize: 15, padding: '14px 24px', borderRadius: 14, textDecoration: 'none' }}>Book Demo</Link>
                  <a href="mailto:sales@harikson.ai" style={{ background: 'transparent', border: `1px solid ${DS.border}`, color: DS.muted, fontWeight: 600, fontSize: 15, padding: '14px 24px', borderRadius: 14, textDecoration: 'none' }}>Talk to Sales</a>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── FOOTER ── */}
        <footer style={{ borderTop: `1px solid ${DS.border}`, padding: '60px 0 32px', background: DS.bg }}>
          <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 40, marginBottom: 48 }}>
              <div>
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: 16 }}>
                  <div style={{ width: 28, height: 28, background: `linear-gradient(135deg, ${DS.primary}, ${DS.secondary})`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff' }}>H</div>
                  <span style={{ fontWeight: 800, fontSize: 15, color: DS.heading }}>Harikson AI</span>
                </Link>
                <p style={{ fontSize: 13, color: DS.muted, lineHeight: 1.6, maxWidth: 260, margin: '0 0 20px' }}>
                  The enterprise AI operating system. Build private, scalable, and secure AI infrastructure.
                </p>
                <div style={{ display: 'flex', gap: 12 }}>
                  {['GitHub', 'X', 'LinkedIn', 'YouTube'].map(s => (
                    <a key={s} href="#" style={{ fontSize: 12, color: DS.muted, textDecoration: 'none', border: `1px solid ${DS.border}`, padding: '5px 10px', borderRadius: 8 }}>{s}</a>
                  ))}
                </div>
              </div>
              {[
                { title: 'Products', links: ['AI Agents', 'Knowledge Base', 'Model Manager', 'Workflow Builder', 'GPU Monitor', 'Analytics', 'API Explorer'] },
                { title: 'Developers', links: ['Documentation', 'API Reference', 'Python SDK', 'JavaScript SDK', 'CLI', 'Changelog', 'Status'] },
                { title: 'Company', links: ['About', 'Blog', 'Careers', 'Press', 'Contact', 'Privacy', 'Terms'] },
                { title: 'Resources', links: ['Community', 'Use Cases', 'Security', 'Compliance', 'Self-Hosted', 'Roadmap'] },
              ].map(col => (
                <div key={col.title}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: DS.body, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>{col.title}</div>
                  {col.links.map(l => (
                    <a key={l} href="#" style={{ display: 'block', fontSize: 13, color: DS.muted, textDecoration: 'none', marginBottom: 10, transition: 'color 0.15s' }}
                      onMouseEnter={e => e.target.style.color = DS.body} onMouseLeave={e => e.target.style.color = DS.muted}>{l}</a>
                  ))}
                </div>
              ))}
            </div>
            <div style={{ borderTop: `1px solid ${DS.border}`, paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ fontSize: 12, color: DS.muted }}>© 2026 Harikson AI Pvt. Ltd. All rights reserved.</div>
              <div style={{ fontSize: 12, color: DS.muted }}>Built with precision in India 🇮🇳</div>
            </div>
          </div>
        </footer>
      </div>

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: #F8FAFC; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
        @keyframes modelpulse { from { border-color: rgba(79,140,255,0.15); } to { border-color: rgba(79,140,255,0.5); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .nav-links-desktop { display: flex; }
        .nav-actions-desktop { display: flex; }
        @media (max-width: 900px) {
          .nav-links-desktop { display: none !important; }
        }
        @media (max-width: 768px) {
          .nav-actions-desktop a:first-child { display: none; }
        }
        ::selection { background: #4F8CFF30; color: #0F172A; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #F8FAFC; }
        ::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 99px; }
      `}</style>
    </>
  );
}
