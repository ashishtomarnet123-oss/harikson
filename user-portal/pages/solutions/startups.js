import React, { useState } from 'react';
import Link from 'next/link';
import HeaderNav from '../../components/layout/HeaderNav';
import FooterSection from '../../components/FooterSection';
import SEOHead, {
  defaultOrganizationSchema,
  defaultSoftwareApplicationSchema,
} from '../../components/SEOHead';
import {
  Rocket,
  ArrowRight,
  Sparkles,
  Bot,
  Workflow,
  Database,
  CheckCircle2,
  Check,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Zap,
  Terminal,
  Code2,
  Clock,
  TrendingUp,
  AlertTriangle,
  GitPullRequest,
  DollarSign,
  Users,
  Layers,
  HelpCircle,
  Cpu,
} from 'lucide-react';

export default function SolutionsStartupsPage() {
  const [activeFaq, setActiveFaq] = useState(null);
  const [activeBlueprint, setActiveBlueprint] = useState('support');
  const [teamSize, setTeamSize] = useState(5);

  const toggleFaq = (idx) => {
    setActiveFaq(activeFaq === idx ? null : idx);
  };

  const BLUEPRINTS = {
    support: {
      id: 'support',
      tabLabel: '24/7 Support Triage',
      title: 'Autonomous Inbound Customer Support & Triage',
      tagline: 'Deflect 80%+ of repetitive questions without dragging engineers into support channels.',
      hoursSaved: '22 hrs / week',
      latency: '< 1.4s response',
      accuracy: '99.4% cited accuracy',
      steps: [
        {
          num: '01',
          name: 'Inbound Webhook Received',
          desc: 'Triggered via Slack, in-app chat, or email webhook with customer intent metadata.',
          badge: 'Trigger',
        },
        {
          num: '02',
          name: 'Hybrid RAG Knowledge Retrieval',
          desc: 'Simultaneous pgvector semantic matching & BM25 keyword lookup over technical documentation.',
          badge: 'Retrieval',
        },
        {
          num: '03',
          name: 'LLM Reasoning & Verification',
          desc: 'Model synthesizes answer strictly grounded in citations; checks confidence threshold.',
          badge: 'Inference',
        },
        {
          num: '04',
          name: 'Instant Dispatch or Escalation',
          desc: 'Delivers response to user; posts summary to #founder-alerts on Slack if confidence is below 85%.',
          badge: 'Action',
        },
      ],
      codeSnippet: `// Xarwiz Blueprint: Support Triage Flow
const flow = new WorkflowBuilder("support-triage")
  .on("webhook.inbound_message")
  .retrieve({
    collection: "product_docs_v2",
    mode: "hybrid",
    topK: 5,
    minScore: 0.82
  })
  .reason({
    model: "llama-3.2:3b", // local Indian cloud
    prompt: "Answer user question with direct citations."
  })
  .branch({
    condition: "result.confidence >= 0.85",
    ifTrue: (wf) => wf.action("send_reply"),
    ifFalse: (wf) => wf.action("slack_escalation")
  });`,
    },
    codeReview: {
      id: 'codeReview',
      tabLabel: 'GitHub PR Review',
      title: 'Continuous Pull Request & Code Quality Guard',
      tagline: 'Sandboxed AI review for every PR before senior developers context-switch.',
      hoursSaved: '16 hrs / week',
      latency: '< 45s per PR',
      accuracy: 'Zero security regressions',
      steps: [
        {
          num: '01',
          name: 'GitHub Webhook: PR Opened',
          desc: 'Pulls git diff, commit messages, and changed file list via authenticated GitHub App.',
          badge: 'Trigger',
        },
        {
          num: '02',
          name: 'Static Lint & Test Suite Execution',
          desc: 'Executes linter and unit tests in an isolated ephemeral sandbox environment.',
          badge: 'Sandbox',
        },
        {
          num: '03',
          name: 'Qwen 2.5 Coder Architectural Audit',
          desc: 'Analyzes memory leaks, async race conditions, SQL injection, and API breakages.',
          badge: 'Inference',
        },
        {
          num: '04',
          name: 'Structured GitHub PR Comment',
          desc: 'Posts line-by-line constructive suggestions directly into the GitHub review timeline.',
          badge: 'Action',
        },
      ],
      codeSnippet: `// Xarwiz Blueprint: Automated PR Auditor
const flow = new WorkflowBuilder("github-pr-auditor")
  .on("github.pull_request.opened")
  .sandbox({
    image: "node:20-alpine",
    commands: ["npm ci", "npm run lint", "npm test"]
  })
  .reason({
    model: "qwen2.5-coder:7b",
    systemPrompt: "Audit code diff for race conditions, auth bypass, and edge cases."
  })
  .action("github.post_review_comment", {
    status: "COMMENT",
    includeSuggestions: true
  });`,
    },
    onboarding: {
      id: 'onboarding',
      tabLabel: 'Lead Onboarding',
      title: 'Automated Inbound Lead Qualification & Onboarding',
      tagline: 'Turn cold signups into active paying customers within the first 5 minutes.',
      hoursSaved: '18 hrs / week',
      latency: '< 2.0s enrichment',
      accuracy: '100% CRM sync',
      steps: [
        {
          num: '01',
          name: 'Portal Signup or Demo Request',
          desc: 'Captured through landing page intake form with tamper-evident HMAC validation.',
          badge: 'Trigger',
        },
        {
          num: '02',
          name: 'Domain & Tech Stack Enrichment',
          desc: 'Queries public DNS and company domain to estimate team size and engineering fit.',
          badge: 'Enrichment',
        },
        {
          num: '03',
          name: 'Personalized Workspace Provisioning',
          desc: 'Creates tenant database partition with pre-populated templates for their industry.',
          badge: 'Orchestrator',
        },
        {
          num: '04',
          name: 'Welcome Email & Calendar Link',
          desc: 'Dispatches custom welcome email tailored to their tech stack with founder meeting link.',
          badge: 'Action',
        },
      ],
      codeSnippet: `// Xarwiz Blueprint: Lead Onboarding Engine
const flow = new WorkflowBuilder("lead-onboarding")
  .on("form.signup_submitted")
  .enrich("clearbit_lookup", { field: "domain" })
  .orchestrate({
    provisionTenant: true,
    dbPartition: "aes_256",
    applyBlueprints: ["support", "docs"]
  })
  .action("email.send_custom_welcome")
  .action("crm.sync_contact");`,
    },
    digest: {
      id: 'digest',
      tabLabel: 'Weekly Founder Digest',
      title: 'Automated Metrics & Investor Updates Synthesizer',
      tagline: 'Aggregate MRR, user churn, and support metrics into a clean Monday morning memo.',
      hoursSaved: '8 hrs / week',
      latency: 'Instant scheduled cron',
      accuracy: 'Cryptographically verified SQL',
      steps: [
        {
          num: '01',
          name: 'Monday Morning Cron Trigger',
          desc: 'Fires every Monday at 08:00 AM IST to consolidate preceding 7-day performance data.',
          badge: 'Schedule',
        },
        {
          num: '02',
          name: 'Cross-Database Metrics Query',
          desc: 'Executes read-only aggregation queries against PostgreSQL, Stripe API, and Redis telemetry.',
          badge: 'Data Extract',
        },
        {
          num: '03',
          name: 'Executive Summary Generation',
          desc: 'Model identifies week-over-week trends, anomalies, top customer tickets, and milestone progress.',
          badge: 'Analysis',
        },
        {
          num: '04',
          name: 'Dispatched to Founder Email & Slack',
          desc: 'Delivers formatted Markdown briefing directly to founder inbox and private #board channel.',
          badge: 'Action',
        },
      ],
      codeSnippet: `// Xarwiz Blueprint: Founder Growth Digest
const flow = new WorkflowBuilder("founder-weekly-digest")
  .cron("0 8 * * 1") // Every Monday at 08:00 AM
  .sql("SELECT count(*) as signups, sum(amount) as mrr FROM events WHERE created_at > now() - interval '7 days'")
  .reason({
    model: "llama-3.2:3b",
    prompt: "Generate 5-bullet executive summary comparing WoW growth metrics."
  })
  .action("slack.send_channel", { channel: "#founder-updates" })
  .action("email.send_founders");`,
    },
  };

  const FAQS = [
    {
      q: 'How does Xarwiz help early-stage startups conserve runway?',
      a: 'Instead of hiring full-time personnel for repetitive support triage, manual documentation lookups, or basic QA linting, startups deploy Xarwiz autonomous agents and DAG workflows. You pay a predictable, transparent SaaS subscription with safety quota fallbacks, avoiding sudden $5,000 credit card surprises.',
    },
    {
      q: 'How quickly can our engineering squad get started?',
      a: 'Startups deploy their first automated support agent or document index in under 15 minutes. We provide pre-configured, tested blueprints for GitHub PR review, customer inquiry triage, and Notion knowledge base synchronization with zero infrastructure setup.',
    },
    {
      q: 'How does Xarwiz handle spikes in customer inquiries during Product Hunt or feature launches?',
      a: 'The Xarwiz asynchronous DAG orchestrator and webhook listeners queue and process incoming events with built-in concurrency controls, exponential backoff retries, and dead-letter queueing, guaranteeing that zero customer inquiries or webhooks are dropped during viral traffic surges.',
    },
    {
      q: 'Is our proprietary code and customer data secure and compliant with DPDP Act 2023?',
      a: 'Absolutely. Every startup workspace has dedicated AES-256 partition isolation, cryptographic HMAC webhook authentication, tamper-evident audit logs, and sovereign hosting in Indian cloud datacenters. Your proprietary customer documents are never used for public model training.',
    },
  ];

  const currentBp = BLUEPRINTS[activeBlueprint];

  // Dynamic ROI calculation
  const hoursSavedPerMonth = teamSize * 14;
  const estimatedCostSavingsINR = hoursSavedPerMonth * 1250; // avg INR 1250/hr senior dev time
  const estimatedCostSavingsUSD = Math.round(estimatedCostSavingsINR / 85);

  return (
    <div className="startups-page">
      <SEOHead
        title="AI Solutions for Startups & Growth Teams - Xarwiz"
        description="Scale startup output without linear hiring. Automate customer support triage, continuous GitHub code audits, and document intelligence with Xarwiz."
        canonicalPath="/solutions/startups"
        jsonLd={[
          defaultOrganizationSchema,
          defaultSoftwareApplicationSchema,
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Xarwiz AI Solutions for Startups',
            url: 'https://xarwiz.com/solutions/startups',
            description:
              'Autonomous AI agents and workflow automation engineered to accelerate early-stage startup execution and reduce operational overhead.',
          },
        ]}
      />

      <HeaderNav activePath="/solutions" />

      <main className="startups-main">
        {/* HERO SECTION */}
        <section className="startups-hero">
          <div className="container">
            {/* Breadcrumb */}
            <nav className="breadcrumb-nav" aria-label="Breadcrumb">
              <Link href="/" className="crumb-link">Home</Link>
              <ChevronRight size={14} className="crumb-sep" />
              <Link href="/solutions" className="crumb-link">Solutions</Link>
              <ChevronRight size={14} className="crumb-sep" />
              <span className="crumb-current">For Startups</span>
            </nav>

            <div className="hero-content">
              <div className="hero-badge">
                <Rocket size={14} />
                <span>Engineered for High-Growth Startups &amp; Lean Squads</span>
              </div>

              <h1 className="hero-title">
                Scale Your Startup Without <span className="blue-gradient">Linear Headcount</span>
              </h1>

              <p className="hero-subtitle">
                Early-stage founders and small engineering squads can now operate with the operational breadth and execution velocity of a 50-person enterprise. Automate user onboarding, code audits, and customer operations on day one.
              </p>

              <div className="hero-cta-group">
                <Link href="/signup" className="btn-primary">
                  <span>Start Free on Starter Plan</span>
                  <ArrowRight size={16} />
                </Link>
                <Link href="/contact" className="btn-secondary">
                  <span>Book Founder Architecture Call</span>
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="hero-trust-chips">
                <span className="trust-chip"><CheckCircle2 size={14} className="chip-icon" /> Predictable flat monthly quotas</span>
                <span className="trust-chip"><CheckCircle2 size={14} className="chip-icon" /> Zero credit card overage shock</span>
                <span className="trust-chip"><CheckCircle2 size={14} className="chip-icon" /> Indian cloud DPDP compliance</span>
              </div>

              {/* Metrics Row */}
              <div className="hero-stats-row">
                <div className="hero-stat-card">
                  <div className="stat-top">
                    <span className="stat-num">24/7</span>
                    <span className="stat-trend">+100%</span>
                  </div>
                  <span className="stat-label">Instant Support Coverage</span>
                  <p className="stat-sub">Zero unanswered customer inquiries</p>
                </div>

                <div className="hero-stat-card">
                  <div className="stat-top">
                    <span className="stat-num">&lt; 15m</span>
                    <span className="stat-badge">Fast</span>
                  </div>
                  <span className="stat-label">Setup to First Agent</span>
                  <p className="stat-sub">Pre-built blueprints ready to connect</p>
                </div>

                <div className="hero-stat-card">
                  <div className="stat-top">
                    <span className="stat-num">100%</span>
                    <span className="stat-trend">Capped</span>
                  </div>
                  <span className="stat-label">Predictable Quota Safety</span>
                  <p className="stat-sub">Graceful fallback, no bill shock</p>
                </div>

                <div className="hero-stat-card">
                  <div className="stat-top">
                    <span className="stat-num">4.5x</span>
                    <span className="stat-trend">+350%</span>
                  </div>
                  <span className="stat-label">Output per Engineer</span>
                  <p className="stat-sub">Automated chores &amp; continuous PR triage</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: INTERACTIVE BLUEPRINT WORKSPACE */}
        <section className="interactive-blueprints-section">
          <div className="container">
            <div className="section-head">
              <span className="section-eyebrow">Production-Ready Blueprints</span>
              <h2 className="section-title">Automate High-Friction Startup Workflows</h2>
              <p className="section-subtitle">
                Select a pre-engineered blueprint below to inspect how Xarwiz orchestrates triggers, knowledge retrieval, and automated actions in production.
              </p>
            </div>

            {/* Blueprint Tabs */}
            <div className="bp-tabs-container">
              {Object.values(BLUEPRINTS).map((bp) => (
                <button
                  key={bp.id}
                  type="button"
                  onClick={() => setActiveBlueprint(bp.id)}
                  className={`bp-tab-btn ${activeBlueprint === bp.id ? 'active' : ''}`}
                >
                  {bp.id === 'support' && <Bot size={16} />}
                  {bp.id === 'codeReview' && <GitPullRequest size={16} />}
                  {bp.id === 'onboarding' && <Users size={16} />}
                  {bp.id === 'digest' && <TrendingUp size={16} />}
                  <span>{bp.tabLabel}</span>
                </button>
              ))}
            </div>

            {/* Blueprint Interactive Display Card */}
            <div className="bp-display-card">
              <div className="bp-display-header">
                <div>
                  <div className="bp-header-badge">
                    <Sparkles size={14} />
                    <span>Tested Production Pattern</span>
                  </div>
                  <h3 className="bp-main-title">{currentBp.title}</h3>
                  <p className="bp-tagline">{currentBp.tagline}</p>
                </div>
                <div className="bp-meta-tags">
                  <div className="meta-tag">
                    <Clock size={14} />
                    <span>{currentBp.hoursSaved}</span>
                  </div>
                  <div className="meta-tag">
                    <Zap size={14} />
                    <span>{currentBp.latency}</span>
                  </div>
                  <div className="meta-tag">
                    <ShieldCheck size={14} />
                    <span>{currentBp.accuracy}</span>
                  </div>
                </div>
              </div>

              <div className="bp-grid-body">
                {/* Left: Step-by-Step Flow Pipeline */}
                <div className="bp-flow-column">
                  <h4 className="column-heading">Orchestration Pipeline</h4>
                  <div className="bp-steps-list">
                    {currentBp.steps.map((step, idx) => (
                      <div key={idx} className="bp-step-item">
                        <div className="step-num-circle">{step.num}</div>
                        <div className="step-details">
                          <div className="step-header-line">
                            <h5 className="step-name">{step.name}</h5>
                            <span className="step-badge">{step.badge}</span>
                          </div>
                          <p className="step-desc">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bp-cta-row">
                    <Link href="/signup" className="btn-bp-deploy">
                      <span>Deploy This Blueprint</span>
                      <ArrowRight size={14} />
                    </Link>
                    <Link href="/developers" className="btn-bp-docs">
                      <span>View Blueprint Schema</span>
                    </Link>
                  </div>
                </div>

                {/* Right: Code & Configuration Inspector */}
                <div className="bp-code-column">
                  <div className="code-card">
                    <div className="code-card-header">
                      <div className="code-dots">
                        <span className="dot red" />
                        <span className="dot yellow" />
                        <span className="dot green" />
                      </div>
                      <span className="code-title">blueprint-{currentBp.id}.ts</span>
                      <span className="code-lang">TypeScript</span>
                    </div>
                    <pre className="code-body">
                      <code>{currentBp.codeSnippet}</code>
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: PAIN POINTS VS XARWIZ SOLUTIONS */}
        <section className="comparison-section">
          <div className="container">
            <div className="section-head">
              <span className="section-eyebrow">Real Startup Bottlenecks</span>
              <h2 className="section-title">Where Early-Stage Startups Lose Momentum</h2>
              <p className="section-subtitle">
                Compare common founder and squad pain points before and after deploying Xarwiz automation.
              </p>
            </div>

            <div className="comparison-grid">
              {/* Card 1 */}
              <div className="comparison-card">
                <div className="card-top-icon">
                  <Bot size={24} className="icon-blue" />
                </div>
                <h3 className="card-title">Support Inquiries Draining Engineering Hours</h3>

                <div className="pain-box">
                  <div className="pain-label">
                    <AlertTriangle size={14} className="pain-icon" />
                    <span>The Bottleneck</span>
                  </div>
                  <p>
                    Founders and senior engineers waste 2-3 hours daily answering repetitive onboarding questions, API credential lookups, and basic documentation navigation.
                  </p>
                </div>

                <div className="solution-box">
                  <div className="solution-label">
                    <CheckCircle2 size={14} className="solution-icon" />
                    <span>The Xarwiz Solution</span>
                  </div>
                  <p>
                    Deploy an autonomous support agent grounded via hybrid pgvector + BM25 search. Delivers 99.4% cited answers instantly and routes complex edge cases to Slack.
                  </p>
                </div>

                <ul className="card-benefits">
                  <li><Check size={14} /> Hybrid RAG accuracy with verified source links</li>
                  <li><Check size={14} /> Automatic Slack escalations with thread context</li>
                  <li><Check size={14} /> Recovers 15+ engineer hours per week</li>
                </ul>
              </div>

              {/* Card 2 */}
              <div className="comparison-card">
                <div className="card-top-icon">
                  <Terminal size={24} className="icon-blue" />
                </div>
                <h3 className="card-title">Pull Request Reviews Stalling Sprint Velocity</h3>

                <div className="pain-box">
                  <div className="pain-label">
                    <AlertTriangle size={14} className="pain-icon" />
                    <span>The Bottleneck</span>
                  </div>
                  <p>
                    Pull requests sit unmerged for 24-48 hours while senior engineers are in meetings or offline. Ship cycles slow down and context gets lost.
                  </p>
                </div>

                <div className="solution-box">
                  <div className="solution-label">
                    <CheckCircle2 size={14} className="solution-icon" />
                    <span>The Xarwiz Solution</span>
                  </div>
                  <p>
                    Connect GitHub webhooks to an autonomous coding agent running sandboxed Qwen 2.5 Coder. Inspects diffs, runs test suites, and flags bugs in seconds.
                  </p>
                </div>

                <ul className="card-benefits">
                  <li><Check size={14} /> Sandboxed ephemeral test execution</li>
                  <li><Check size={14} /> Catches async race conditions and SQL injection</li>
                  <li><Check size={14} /> Cuts PR turnaround time by 60%+</li>
                </ul>
              </div>

              {/* Card 3 */}
              <div className="comparison-card">
                <div className="card-top-icon">
                  <Workflow size={24} className="icon-blue" />
                </div>
                <h3 className="card-title">Brittle Zapier Connectors Breaking on Launches</h3>

                <div className="pain-box">
                  <div className="pain-label">
                    <AlertTriangle size={14} className="pain-icon" />
                    <span>The Bottleneck</span>
                  </div>
                  <p>
                    Signups, Stripe events, and CRM updates wired with no-code tools fail during viral traffic surges, silently dropping leads with zero retry logs.
                  </p>
                </div>

                <div className="solution-box">
                  <div className="solution-label">
                    <CheckCircle2 size={14} className="solution-icon" />
                    <span>The Xarwiz Solution</span>
                  </div>
                  <p>
                    Deterministic DAG webhook orchestrator with cryptographic HMAC validation, exponential backoff retries, and tamper-evident audit history.
                  </p>
                </div>

                <ul className="card-benefits">
                  <li><Check size={14} /> HMAC-SHA256 signature validation on every webhook</li>
                  <li><Check size={14} /> Zero dropped events with automated backoff retries</li>
                  <li><Check size={14} /> Full PostgreSQL execution traces and debug replay</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: ROI VELOCITY CALCULATOR */}
        <section className="roi-calculator-section">
          <div className="container">
            <div className="calculator-wrapper">
              <div className="calc-left">
                <span className="section-eyebrow">Runway &amp; Efficiency ROI</span>
                <h2 className="calc-title">Calculate Your Squad&apos;s Velocity Multiplier</h2>
                <p className="calc-desc">
                  See how much engineering bandwidth and budget Xarwiz automation unlocks for your startup every month.
                </p>

                <div className="slider-control-group">
                  <div className="slider-header">
                    <span className="slider-label">Engineering &amp; Core Team Size:</span>
                    <span className="slider-val-badge">{teamSize} team members</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="25"
                    value={teamSize}
                    onChange={(e) => setTeamSize(parseInt(e.target.value, 10))}
                    className="calc-range-slider"
                  />
                  <div className="slider-minmax">
                    <span>1 person (Solo Founder)</span>
                    <span>25 people (Scaleup Squad)</span>
                  </div>
                </div>

                <div className="calc-features-list">
                  <div className="calc-feat"><CheckCircle2 size={16} /> Based on ~14 hours of chore automation per engineer/month</div>
                  <div className="calc-feat"><CheckCircle2 size={16} /> Replaces need for hiring 1-2 junior support/QA contractors</div>
                  <div className="calc-feat"><CheckCircle2 size={16} /> Flat transparent subscription with zero bill surprise</div>
                </div>
              </div>

              <div className="calc-right">
                <div className="roi-stat-box primary">
                  <span className="stat-box-label">Recovered Bandwidth</span>
                  <div className="stat-box-value">{hoursSavedPerMonth} <span className="stat-unit">hrs / month</span></div>
                  <p className="stat-box-sub">Equivalent to +{(hoursSavedPerMonth / 160).toFixed(1)} full-time engineering capacity</p>
                </div>

                <div className="roi-stat-box secondary">
                  <span className="stat-box-label">Estimated Value Unlocked</span>
                  <div className="stat-box-value">₹{estimatedCostSavingsINR.toLocaleString('en-IN')} <span className="stat-unit">/ month</span></div>
                  <p className="stat-box-sub">~${estimatedCostSavingsUSD.toLocaleString()} USD in preserved developer runway</p>
                </div>

                <Link href="/signup" className="btn-calc-cta">
                  <span>Start Unlocking Velocity</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: WHY EARLY-STAGE FOUNDERS CHOOSE XARWIZ */}
        <section className="why-xarwiz-section">
          <div className="container">
            <div className="section-head">
              <span className="section-eyebrow">Architectural Advantage</span>
              <h2 className="section-title">Engineered Specifically for Startup Reality</h2>
              <p className="section-subtitle">
                Why venture-backed startups and bootstrapped founders pick Xarwiz over fragile custom glue code or raw API tokens.
              </p>
            </div>

            <div className="why-grid">
              <div className="why-card">
                <div className="why-icon-wrap"><DollarSign size={20} /></div>
                <h4>No API Credit Card Surprises</h4>
                <p>
                  Flat, transparent monthly quotas with automatic safety fallback. You never wake up to an unexpected $4,000 cloud bill because a webhook looped.
                </p>
              </div>

              <div className="why-card">
                <div className="why-icon-wrap"><Database size={20} /></div>
                <h4>Built-in Hybrid RAG (No Pinecone Setup)</h4>
                <p>
                  Zero separate vector database subscriptions required. Xarwiz provides integrated pgvector + BM25 keyword search with tenant partition isolation.
                </p>
              </div>

              <div className="why-card">
                <div className="why-icon-wrap"><ShieldCheck size={20} /></div>
                <h4>Indian Cloud &amp; DPDP Sovereign Compliance</h4>
                <p>
                  Host customer data inside Indian cloud borders with consent governance, audit logs, and automated Data Principal Rights handling on day one.
                </p>
              </div>

              <div className="why-card">
                <div className="why-icon-wrap"><Cpu size={20} /></div>
                <h4>Local Ollama + Frontier Model Routing</h4>
                <p>
                  Mix and match high-reasoning frontier models with local self-hosted Ollama open-source models (Qwen 2.5, Llama 3.2) for near-zero marginal cost.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6: FAQ ACCORDION */}
        <section className="startups-faq-section">
          <div className="container">
            <div className="section-head">
              <span className="section-eyebrow">Got Questions?</span>
              <h2 className="section-title">Frequently Asked Questions</h2>
              <p className="section-subtitle">
                Everything founders need to know about pricing, security, quotas, and deployment.
              </p>
            </div>

            <div className="faq-list">
              {FAQS.map((faq, idx) => (
                <div
                  key={idx}
                  className={`faq-item ${activeFaq === idx ? 'expanded' : ''}`}
                >
                  <button
                    type="button"
                    className="faq-question"
                    onClick={() => toggleFaq(idx)}
                    aria-expanded={activeFaq === idx}
                  >
                    <span>{faq.q}</span>
                    <ChevronDown size={18} className="faq-icon" />
                  </button>
                  {activeFaq === idx && (
                    <div className="faq-answer">
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 7: CLEAN LIGHT CTA CARD (REPLACES OLD DARK BANNER) */}
        <section className="light-cta-section">
          <div className="container">
            <div className="light-cta-card">
              <div className="light-cta-badge">
                <Rocket size={14} />
                <span>Ready to Launch in 15 Minutes?</span>
              </div>
              <h2 className="light-cta-title">Multiply Your Squad&apos;s Engineering Velocity Today</h2>
              <p className="light-cta-sub">
                Get started on our free Starter plan. Upgrade effortlessly as your customer requests and daily traffic expand.
              </p>

              <div className="light-cta-actions">
                <Link href="/signup" className="btn-cta-primary">
                  <span>Start Free on Starter Plan</span>
                  <ArrowRight size={16} />
                </Link>
                <Link href="/pricing" className="btn-cta-secondary">
                  <span>View Pricing &amp; Quotas</span>
                </Link>
                <Link href="/contact" className="btn-cta-tertiary">
                  <span>Talk to Founder Support &rarr;</span>
                </Link>
              </div>

              <div className="light-cta-footer-checks">
                <span>✓ No credit card required</span>
                <span>•</span>
                <span>✓ Full hybrid RAG access</span>
                <span>•</span>
                <span>✓ Instant webhook integration</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer with hideBanner={true} to eliminate duplicate banners */}
      <FooterSection hideBanner={true} />

      <style jsx>{`
        /* PAGE BASE & LIGHT THEME TOKENS */
        .startups-page {
          min-height: 100vh;
          background-color: #ffffff;
          color: #0f172a;
          font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .blue-gradient {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* BREADCRUMB */
        .breadcrumb-nav {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
          color: #64748b;
          margin-bottom: 24px;
        }

        .breadcrumb-nav :global(.crumb-link) {
          color: #64748b;
          text-decoration: none;
          transition: color 0.15s ease;
        }

        .breadcrumb-nav :global(.crumb-link:hover) {
          color: #2563eb;
        }

        .crumb-sep {
          color: #94a3b8;
        }

        .crumb-current {
          color: #0f172a;
          font-weight: 600;
        }

        /* HERO SECTION */
        .startups-hero {
          padding: 50px 0 70px 0;
          background: radial-gradient(circle at 50% 0%, rgba(37, 99, 235, 0.08) 0%, rgba(255, 255, 255, 0) 70%);
          border-bottom: 1px solid #f1f5f9;
        }

        .hero-content {
          text-align: center;
          max-width: 900px;
          margin: 0 auto;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          border-radius: 9999px;
          background: #eff6ff;
          border: 1px solid #dbeafe;
          color: #2563eb;
          font-size: 0.82rem;
          font-weight: 600;
          margin-bottom: 20px;
        }

        .hero-title {
          font-size: clamp(2.3rem, 4.8vw, 3.7rem);
          font-weight: 800;
          line-height: 1.15;
          letter-spacing: -0.03em;
          margin-bottom: 20px;
          color: #0f172a;
        }

        .hero-subtitle {
          font-size: clamp(1.05rem, 1.8vw, 1.2rem);
          line-height: 1.65;
          color: #475569;
          margin-bottom: 32px;
          max-width: 820px;
          margin-left: auto;
          margin-right: auto;
        }

        .hero-cta-group {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }

        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: #2563eb;
          color: #ffffff;
          padding: 14px 28px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.95rem;
          text-decoration: none;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25);
          transition: all 0.2s ease;
        }

        .btn-primary:hover {
          background: #1d4ed8;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.35);
        }

        .btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #334155;
          padding: 14px 28px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.95rem;
          text-decoration: none;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          transition: all 0.2s ease;
        }

        .btn-secondary:hover {
          background: #f8fafc;
          border-color: #94a3b8;
          color: #0f172a;
          transform: translateY(-2px);
        }

        .hero-trust-chips {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          flex-wrap: wrap;
          font-size: 0.85rem;
          color: #64748b;
          margin-bottom: 44px;
        }

        .trust-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .hero-trust-chips :global(.chip-icon) {
          color: #16a34a;
        }

        /* STATS ROW */
        .hero-stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          text-align: left;
        }

        .hero-stat-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .hero-stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
          border-color: #cbd5e1;
        }

        .stat-top {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: 6px;
        }

        .stat-num {
          font-size: 1.85rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
        }

        .stat-trend {
          font-size: 0.75rem;
          font-weight: 700;
          color: #16a34a;
          background: #f0fdf4;
          padding: 2px 8px;
          border-radius: 9999px;
        }

        .stat-badge {
          font-size: 0.75rem;
          font-weight: 700;
          color: #2563eb;
          background: #eff6ff;
          padding: 2px 8px;
          border-radius: 9999px;
        }

        .stat-label {
          display: block;
          font-size: 0.9rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 4px;
        }

        .stat-sub {
          font-size: 0.78rem;
          color: #64748b;
          margin: 0;
          line-height: 1.4;
        }

        /* SECTION HEADERS */
        .section-head {
          text-align: center;
          max-width: 780px;
          margin: 0 auto 48px auto;
        }

        .section-eyebrow {
          display: inline-block;
          font-size: 0.8rem;
          font-weight: 700;
          color: #2563eb;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 8px;
        }

        .section-title {
          font-size: clamp(1.8rem, 3.2vw, 2.6rem);
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
          margin-bottom: 12px;
          line-height: 1.25;
        }

        .section-subtitle {
          font-size: 1.05rem;
          color: #475569;
          line-height: 1.6;
          margin: 0;
        }

        /* BLUEPRINTS WORKSPACE SECTION */
        .interactive-blueprints-section {
          padding: 80px 0;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }

        .bp-tabs-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 32px;
        }

        .bp-tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 9999px;
          font-size: 0.9rem;
          font-weight: 600;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
        }

        .bp-tab-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .bp-tab-btn.active {
          background: #2563eb;
          color: #ffffff;
          border-color: #2563eb;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
        }

        .bp-display-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 36px;
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.05);
        }

        .bp-display-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          padding-bottom: 24px;
          border-bottom: 1px solid #f1f5f9;
          margin-bottom: 32px;
          flex-wrap: wrap;
        }

        .bp-header-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 9999px;
          background: #eff6ff;
          color: #2563eb;
          font-size: 0.75rem;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .bp-main-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 6px;
        }

        .bp-tagline {
          font-size: 0.95rem;
          color: #475569;
          margin: 0;
        }

        .bp-meta-tags {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .meta-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 600;
          color: #334155;
        }

        .bp-grid-body {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 36px;
          align-items: stretch;
        }

        .column-heading {
          font-size: 0.85rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 18px;
        }

        .bp-steps-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 28px;
        }

        .bp-step-item {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
          transition: border-color 0.15s ease;
        }

        .bp-step-item:hover {
          border-color: #cbd5e1;
        }

        .step-num-circle {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: #2563eb;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          font-weight: 700;
          flex-shrink: 0;
        }

        .step-details {
          flex: 1;
        }

        .step-header-line {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
        }

        .step-name {
          font-size: 0.95rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .step-badge {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          background: #e2e8f0;
          color: #475569;
          padding: 2px 8px;
          border-radius: 6px;
        }

        .step-desc {
          font-size: 0.82rem;
          color: #475569;
          line-height: 1.5;
          margin: 0;
        }

        .bp-cta-row {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }

        .btn-bp-deploy {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #2563eb;
          color: #ffffff;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          text-decoration: none;
          transition: background 0.15s ease;
        }

        .btn-bp-deploy:hover {
          background: #1d4ed8;
        }

        .btn-bp-docs {
          font-size: 0.85rem;
          font-weight: 600;
          color: #2563eb;
          text-decoration: none;
        }

        .btn-bp-docs:hover {
          text-decoration: underline;
        }

        /* CODE COLUMN */
        .code-card {
          background: #0f172a;
          border-radius: 12px;
          overflow: hidden;
          height: 100%;
          display: flex;
          flex-direction: column;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        }

        .code-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 18px;
          background: #1e293b;
          border-bottom: 1px solid #334155;
        }

        .code-dots {
          display: flex;
          gap: 6px;
        }

        .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .dot.red { background: #ef4444; }
        .dot.yellow { background: #f59e0b; }
        .dot.green { background: #10b981; }

        .code-title {
          font-size: 0.78rem;
          font-family: monospace;
          color: #cbd5e1;
        }

        .code-lang {
          font-size: 0.7rem;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
        }

        .code-body {
          margin: 0;
          padding: 20px;
          font-family: 'JetBrains Mono', Menlo, Monaco, Consolas, monospace;
          font-size: 0.8rem;
          line-height: 1.6;
          color: #e2e8f0;
          overflow-x: auto;
          flex: 1;
        }

        /* COMPARISON SECTION */
        .comparison-section {
          padding: 80px 0;
          background: #ffffff;
        }

        .comparison-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 28px;
        }

        .comparison-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 28px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          display: flex;
          flex-direction: column;
        }

        .comparison-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.08);
          border-color: #cbd5e1;
        }

        .card-top-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: #eff6ff;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 18px;
        }

        .card-top-icon :global(.icon-blue) {
          color: #2563eb;
        }

        .card-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 18px;
          line-height: 1.35;
        }

        .pain-box {
          background: #fef2f2;
          border: 1px solid #fee2e2;
          border-radius: 10px;
          padding: 14px;
          margin-bottom: 14px;
        }

        .pain-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          color: #dc2626;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .pain-box p {
          font-size: 0.82rem;
          color: #991b1b;
          line-height: 1.5;
          margin: 0;
        }

        .solution-box {
          background: #f0fdf4;
          border: 1px solid #dcfce7;
          border-radius: 10px;
          padding: 14px;
          margin-bottom: 20px;
        }

        .solution-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          color: #16a34a;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .solution-box p {
          font-size: 0.82rem;
          color: #166534;
          line-height: 1.5;
          margin: 0;
        }

        .card-benefits {
          list-style: none;
          padding: 0;
          margin: auto 0 0 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
          border-top: 1px solid #f1f5f9;
          padding-top: 18px;
        }

        .card-benefits li {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.82rem;
          font-weight: 500;
          color: #334155;
        }

        .card-benefits li :global(svg) {
          color: #16a34a;
          flex-shrink: 0;
        }

        /* ROI CALCULATOR SECTION */
        .roi-calculator-section {
          padding: 80px 0;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
        }

        .calculator-wrapper {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 44px;
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.05);
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 48px;
          align-items: center;
        }

        .calc-title {
          font-size: clamp(1.6rem, 2.5vw, 2.2rem);
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 10px;
          letter-spacing: -0.02em;
        }

        .calc-desc {
          font-size: 0.95rem;
          color: #475569;
          margin-bottom: 28px;
          line-height: 1.6;
        }

        .slider-control-group {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
        }

        .slider-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }

        .slider-label {
          font-size: 0.9rem;
          font-weight: 700;
          color: #0f172a;
        }

        .slider-val-badge {
          background: #2563eb;
          color: #ffffff;
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 0.85rem;
          font-weight: 700;
        }

        .calc-range-slider {
          width: 100%;
          accent-color: #2563eb;
          cursor: pointer;
          margin-bottom: 8px;
        }

        .slider-minmax {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: #64748b;
        }

        .calc-features-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          font-size: 0.85rem;
          color: #475569;
        }

        .calc-feat {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .calc-feat :global(svg) {
          color: #2563eb;
          flex-shrink: 0;
        }

        .calc-right {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .roi-stat-box {
          border-radius: 14px;
          padding: 22px;
        }

        .roi-stat-box.primary {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
        }

        .roi-stat-box.secondary {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
        }

        .stat-box-label {
          display: block;
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #475569;
          margin-bottom: 6px;
        }

        .roi-stat-box.primary .stat-box-label {
          color: #1d4ed8;
        }

        .roi-stat-box.secondary .stat-box-label {
          color: #15803d;
        }

        .stat-box-value {
          font-size: 2.2rem;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.1;
          margin-bottom: 6px;
        }

        .stat-unit {
          font-size: 1rem;
          font-weight: 600;
          color: #64748b;
        }

        .stat-box-sub {
          font-size: 0.82rem;
          color: #475569;
          margin: 0;
        }

        .calc-right :global(.btn-calc-cta) {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #2563eb !important;
          color: #ffffff !important;
          padding: 14px 24px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.95rem;
          text-decoration: none !important;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25);
          transition: all 0.2s ease;
          border: none;
        }

        .calc-right :global(.btn-calc-cta:hover) {
          background: #1d4ed8 !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.35);
        }

        /* WHY XARWIZ SECTION */
        .why-xarwiz-section {
          padding: 80px 0;
          background: #ffffff;
        }

        .why-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }

        .why-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 24px;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .why-card:hover {
          transform: translateY(-3px);
          border-color: #cbd5e1;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.04);
        }

        .why-icon-wrap {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          background: #eff6ff;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }

        .why-card h4 {
          font-size: 1.05rem;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 8px;
          line-height: 1.35;
        }

        .why-card p {
          font-size: 0.85rem;
          color: #475569;
          line-height: 1.6;
          margin: 0;
        }

        /* FAQS */
        .startups-faq-section {
          padding: 80px 0;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
        }

        .faq-list {
          max-width: 820px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .faq-item {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .faq-item.expanded {
          border-color: #bfdbfe;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.06);
        }

        .faq-question {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 24px;
          background: none;
          border: none;
          font-size: 0.98rem;
          font-weight: 700;
          color: #0f172a;
          text-align: left;
          cursor: pointer;
          gap: 16px;
          transition: color 0.15s ease;
        }

        .faq-question:hover {
          color: #2563eb;
        }

        .faq-icon {
          color: #64748b;
          transition: transform 0.2s ease;
          flex-shrink: 0;
        }

        .faq-item.expanded .faq-icon {
          transform: rotate(180deg);
          color: #2563eb;
        }

        .faq-answer {
          padding: 0 24px 20px 24px;
        }

        .faq-answer p {
          font-size: 0.92rem;
          color: #475569;
          line-height: 1.65;
          margin: 0;
        }

        /* LIGHT CTA SECTION */
        .light-cta-section {
          padding: 70px 0 90px 0;
          background: #ffffff;
        }

        .light-cta-card {
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border: 1px solid #bfdbfe;
          border-radius: 24px;
          padding: 56px 40px;
          text-align: center;
          box-shadow: 0 10px 25px -5px rgba(37, 99, 235, 0.1);
        }

        .light-cta-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 16px;
          border-radius: 9999px;
          background: #ffffff;
          border: 1px solid #bfdbfe;
          color: #2563eb;
          font-size: 0.8rem;
          font-weight: 700;
          margin-bottom: 20px;
        }

        .light-cta-title {
          font-size: clamp(1.8rem, 3.2vw, 2.5rem);
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 14px;
          letter-spacing: -0.02em;
        }

        .light-cta-sub {
          font-size: 1.05rem;
          color: #334155;
          max-width: 680px;
          margin: 0 auto 36px auto;
          line-height: 1.6;
        }

        .light-cta-actions {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 28px;
        }

        .light-cta-actions :global(.btn-cta-primary) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #2563eb !important;
          color: #ffffff !important;
          padding: 14px 28px;
          border-radius: 10px;
          font-size: 0.95rem;
          font-weight: 700;
          text-decoration: none !important;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
          transition: all 0.2s ease;
          border: none;
        }

        .light-cta-actions :global(.btn-cta-primary:hover) {
          background: #1d4ed8 !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4);
        }

        .light-cta-actions :global(.btn-cta-secondary) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #ffffff !important;
          border: 1px solid #cbd5e1 !important;
          color: #1e293b !important;
          padding: 14px 26px;
          border-radius: 10px;
          font-size: 0.95rem;
          font-weight: 600;
          text-decoration: none !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          transition: all 0.2s ease;
        }

        .light-cta-actions :global(.btn-cta-secondary:hover) {
          background: #f8fafc !important;
          border-color: #94a3b8 !important;
          color: #0f172a !important;
          transform: translateY(-2px);
        }

        .light-cta-actions :global(.btn-cta-tertiary) {
          display: inline-flex;
          align-items: center;
          font-size: 0.92rem;
          font-weight: 600;
          color: #2563eb !important;
          text-decoration: none !important;
          padding: 10px 14px;
          transition: color 0.15s ease;
        }

        .light-cta-actions :global(.btn-cta-tertiary:hover) {
          color: #1d4ed8 !important;
          text-decoration: underline !important;
        }

        .light-cta-footer-checks {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-size: 0.82rem;
          color: #475569;
          font-weight: 500;
        }

        /* RESPONSIVE BREAKPOINTS */
        @media (max-width: 1024px) {
          .hero-stats-row {
            grid-template-columns: repeat(2, 1fr);
          }
          .bp-grid-body {
            grid-template-columns: 1fr;
          }
          .comparison-grid {
            grid-template-columns: 1fr;
          }
          .calculator-wrapper {
            grid-template-columns: 1fr;
            gap: 32px;
          }
          .why-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .hero-stats-row {
            grid-template-columns: 1fr;
          }
          .bp-display-card {
            padding: 24px 16px;
          }
          .light-cta-card {
            padding: 36px 20px;
          }
          .why-grid {
            grid-template-columns: 1fr;
          }
          .hero-cta-group,
          .light-cta-actions {
            flex-direction: column;
            width: 100%;
          }
          .btn-primary,
          .btn-secondary,
          .btn-cta-primary,
          .btn-cta-secondary {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
