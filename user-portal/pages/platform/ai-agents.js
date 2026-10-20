import React, { useState } from 'react';
import Link from 'next/link';
import HeaderNav from '../../components/layout/HeaderNav';
import FooterSection from '../../components/FooterSection';
import SEOHead, {
  defaultOrganizationSchema,
  defaultSoftwareApplicationSchema,
} from '../../components/SEOHead';
import {
  Bot,
  Terminal,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Lock,
  Zap,
  Code2,
  Layers,
  FileCode,
  Check,
  RefreshCw,
  FolderGit2,
  Sliders,
  HelpCircle,
  ChevronDown,
  ShieldAlert,
  Server,
  FileCheck2,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

export default function PlatformAiAgentsPage() {
  const [activeFaq, setActiveFaq] = useState(null);
  const [activeTab, setActiveTab] = useState('tools');

  const toggleFaq = (idx) => {
    setActiveFaq(activeFaq === idx ? null : idx);
  };

  const FAQS = [
    {
      q: 'How do Xarwiz AI agents execute tools safely without compromising the host server?',
      a: 'Every agent runs inside an isolated Workspace Sandbox bound strictly to the tenant directory. Tool calls like read_file, write_file, and bash_command execute within sandboxed child processes with path-traversal prevention, process execution timeouts (default 30s), and strict privilege limits. System-critical OS files cannot be accessed or modified.',
    },
    {
      q: 'How does dual-tier vector memory persist context across long-running tasks?',
      a: 'Agents leverage a dual-tier memory architecture: short-term sliding window context for immediate conversational turns, and long-term semantic persistence stored in PostgreSQL with pgvector embeddings. Agents retrieve prior decisions, file changes, and instructions dynamically using cosine similarity lookup.',
    },
    {
      q: 'Can custom internal APIs and microservices be registered as agent tools?',
      a: 'Yes. Beyond native file and bash tools, Xarwiz allows you to register custom REST endpoints, OpenAPI schemas, and webhook dispatchers as typed agent tools. Agents validate arguments against JSON schemas before execution and handle authentication via encrypted tenant vault credentials.',
    },
    {
      q: 'Can agents collaborate or delegate tasks to one another in workflows?',
      a: 'Yes. Through the Xarwiz DAG Workflow Engine, agents can be chained as discrete execution nodes. A primary triage agent can analyze an incoming webhook payload, delegate data retrieval to a research agent, pass findings to a code generation agent, and dispatch the result to Slack or GitHub.',
    },
    {
      q: 'How are tool-call failures and exceptions handled automatically?',
      a: 'When a tool execution returns an error (e.g. invalid syntax or file not found), the agent receives the structured error payload and stacktrace in its next reasoning turn. It analyzes the error, adjusts input parameters, and self-heals or triggers a human-in-the-loop review if thresholds are exceeded.',
    },
  ];

  return (
    <div className="agents-page">
      <SEOHead
        title="Autonomous AI Agents & Tool Calling - Xarwiz Platform"
        description="Build and deploy autonomous AI agents with sandboxed workspace execution, native file system tools, dual-tier vector memory, and deterministic guardrails."
        canonicalPath="/platform/ai-agents"
        jsonLd={[
          defaultOrganizationSchema,
          defaultSoftwareApplicationSchema,
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Xarwiz Autonomous AI Agents',
            url: 'https://xarwiz.com/platform/ai-agents',
            description:
              'Enterprise-grade autonomous AI agents with sandboxed tool calling, dual-tier vector memory, and self-healing error recovery.',
          },
        ]}
      />

      <HeaderNav activePath="/platform" />

      <main className="agents-main">
        {/* BREADCRUMB & HERO */}
        <section className="agents-hero">
          <div className="container">
            {/* Breadcrumb */}
            <nav className="breadcrumb-nav" aria-label="Breadcrumb">
              <Link href="/platform" className="crumb-link">Platform</Link>
              <ChevronRight size={14} className="crumb-sep" />
              <span className="crumb-current">AI Agents</span>
            </nav>

            <div className="hero-content">
              <div className="hero-badge">
                <Sparkles size={14} />
                <span>Autonomous Execution Harness</span>
              </div>
              <h1 className="hero-title">
                Autonomous AI Agents Built for <span className="blue-gradient">Real-World Work</span>
              </h1>
              <p className="hero-subtitle">
                Move beyond conversational chatbots. Xarwiz AI agents inspect workspaces, execute sandboxed bash commands, call external APIs, query vectorized knowledge, and self-correct on errors with complete deterministic safety.
              </p>
              <div className="hero-cta-group">
                <Link href="/signup" className="btn-primary">
                  <span>Deploy Your First Agent</span>
                  <ArrowRight size={16} />
                </Link>
                <Link href="/contact" className="btn-secondary">
                  <span>Schedule Architecture Demo</span>
                </Link>
              </div>

              <div className="hero-stats-row">
                <div className="hero-stat">
                  <span className="stat-num">5+</span>
                  <span className="stat-label">Sandboxed Core Tools</span>
                </div>
                <div className="hero-stat-sep" />
                <div className="hero-stat">
                  <span className="stat-num">&lt;50ms</span>
                  <span className="stat-label">Vector Memory Recall</span>
                </div>
                <div className="hero-stat-sep" />
                <div className="hero-stat">
                  <span className="stat-num">100%</span>
                  <span className="stat-label">Tenant Workspace Isolation</span>
                </div>
                <div className="hero-stat-sep" />
                <div className="hero-stat">
                  <span className="stat-num">Zero</span>
                  <span className="stat-label">Host OS Tampering Risk</span>
                </div>
              </div>
            </div>

            {/* INTERACTIVE AGENT CONSOLE PREVIEW */}
            <div className="agent-terminal-card">
              <div className="terminal-header">
                <div className="window-dots">
                  <span className="dot dot-red" />
                  <span className="dot dot-yellow" />
                  <span className="dot dot-green" />
                </div>
                <div className="terminal-title">
                  <Bot size={14} className="terminal-icon" />
                  <span>xarwiz-agent-runtime :: tenant_sandbox_01</span>
                </div>
                <div className="terminal-status">
                  <span className="pulse-dot" />
                  <span>ACTIVE SANDBOX</span>
                </div>
              </div>

              <div className="terminal-tabs">
                <button
                  type="button"
                  className={`term-tab ${activeTab === 'tools' ? 'active' : ''}`}
                  onClick={() => setActiveTab('tools')}
                >
                  <Terminal size={14} /> Tool Execution Log
                </button>
                <button
                  type="button"
                  className={`term-tab ${activeTab === 'config' ? 'active' : ''}`}
                  onClick={() => setActiveTab('config')}
                >
                  <Sliders size={14} /> Agent Configuration
                </button>
                <button
                  type="button"
                  className={`term-tab ${activeTab === 'memory' ? 'active' : ''}`}
                  onClick={() => setActiveTab('memory')}
                >
                  <Cpu size={14} /> Vector Memory State
                </button>
              </div>

              <div className="terminal-body">
                {activeTab === 'tools' && (
                  <div className="code-block">
                    <div className="log-line">
                      <span className="ts">[22:15:02]</span> <span className="agent-tag">[AGENT_THOUGHT]</span> Analyzing task: &quot;Audit repository dependencies and update outdated configs&quot;
                    </div>
                    <div className="log-line">
                      <span className="ts">[22:15:03]</span> <span className="tool-call">[TOOL_CALL]</span> <span className="token-fn">read_file</span> &#123; path: <span className="token-str">&quot;package.json&quot;</span> &#125;
                    </div>
                    <div className="log-line success">
                      <span className="ts">[22:15:03]</span> <span className="tool-res">[TOOL_RESULT]</span> File loaded (1.2KB) &mdash; 18 dependencies parsed successfully.
                    </div>
                    <div className="log-line">
                      <span className="ts">[22:15:05]</span> <span className="tool-call">[TOOL_CALL]</span> <span className="token-fn">bash_command</span> &#123; cmd: <span className="token-str">&quot;npm audit --json&quot;</span>, timeout: 15000 &#125;
                    </div>
                    <div className="log-line success">
                      <span className="ts">[22:15:07]</span> <span className="tool-res">[TOOL_RESULT]</span> Sandbox exit code 0. 0 high vulnerabilities detected.
                    </div>
                    <div className="log-line">
                      <span className="ts">[22:15:08]</span> <span className="agent-tag">[AGENT_OUTPUT]</span> Completed dependency audit. Generating summary report in workspace...
                    </div>
                  </div>
                )}

                {activeTab === 'config' && (
                  <div className="code-block dark-json">
                    <pre><code>{`{
  "agent_id": "agt_devops_automator_09",
  "name": "Repo Maintenance Agent",
  "temperature": 0.2,
  "max_context_tokens": 8192,
  "workspace_sandbox": {
    "root_dir": "/sandboxes/tenant_49102/repo",
    "allow_network": false,
    "max_execution_sec": 30
  },
  "tools_enabled": [
    "read_file",
    "write_file",
    "list_dir",
    "bash_command",
    "rag_query"
  ],
  "governance": {
    "approval_threshold": "high_impact",
    "audit_trail_immutable": true
  }
}`}</code></pre>
                  </div>
                )}

                {activeTab === 'memory' && (
                  <div className="code-block">
                    <div className="log-line">
                      <span className="ts">[MEM_TIER_1]</span> <span className="token-keyword">Short-term buffer:</span> 14 conversational turns (3,410 tokens active).
                    </div>
                    <div className="log-line">
                      <span className="ts">[MEM_TIER_2]</span> <span className="token-keyword">Long-term pgvector index:</span> 84 prior session commits linked.
                    </div>
                    <div className="log-line">
                      <span className="ts">[QUERY]</span> Cosine similarity lookup: <span className="token-str">&quot;deploy target for staging&quot;</span>
                    </div>
                    <div className="log-line success">
                      <span className="ts">[MATCH 0.94]</span> Tenant staging cluster: <span className="token-str">kube-in-blr-prod02.xarwiz.internal</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 4 CORE CAPABILITY PILLARS */}
        <section className="pillars-section">
          <div className="container">
            <div className="section-head">
              <span className="section-eyebrow">Engineering Specifications</span>
              <h2 className="section-title">Architected for Production Reliability</h2>
              <p className="section-subtitle">
                Consumer chat agents break down when given complex file manipulation tasks. Xarwiz builds an isolation harness around models so tasks execute reliably.
              </p>
            </div>

            <div className="pillars-grid">
              <div className="pillar-card">
                <div className="pillar-icon-box">
                  <Terminal size={22} />
                </div>
                <h3>Sandboxed Tool Execution</h3>
                <p>
                  Agents are equipped with native I/O tools: <code>read_file</code>, <code>write_file</code>, <code>list_dir</code>, and <code>bash_command</code>. All calls are contained in isolated tenant directories with non-root privileges.
                </p>
                <ul className="pillar-checklist">
                  <li><Check size={14} className="check-ico" /> Strict path-traversal prevention</li>
                  <li><Check size={14} className="check-ico" /> Per-command execution timeouts</li>
                  <li><Check size={14} className="check-ico" /> Comprehensive JSON audit trails</li>
                </ul>
              </div>

              <div className="pillar-card">
                <div className="pillar-icon-box">
                  <Cpu size={22} />
                </div>
                <h3>Dual-Tier Vector Memory</h3>
                <p>
                  Combine immediate token-buffered short-term context with long-term semantic embeddings stored in PostgreSQL using pgvector (1536-dimensional cosine similarity).
                </p>
                <ul className="pillar-checklist">
                  <li><Check size={14} className="check-ico" /> Persistent knowledge across sessions</li>
                  <li><Check size={14} className="check-ico" /> Tenant-isolated embeddings partition</li>
                  <li><Check size={14} className="check-ico" /> Sub-50ms vector query retrieval</li>
                </ul>
              </div>

              <div className="pillar-card">
                <div className="pillar-icon-box">
                  <RefreshCw size={22} />
                </div>
                <h3>Self-Healing Error Correction</h3>
                <p>
                  When code execution fails or an API returns an HTTP 4xx/5xx code, the agent analyzes the exact error payload, modifies its approach, and retries automatically up to configured limits.
                </p>
                <ul className="pillar-checklist">
                  <li><Check size={14} className="check-ico" /> Stacktrace parsing &amp; error analysis</li>
                  <li><Check size={14} className="check-ico" /> Configurable retry backoff policies</li>
                  <li><Check size={14} className="check-ico" /> Human-in-the-loop escalation gates</li>
                </ul>
              </div>

              <div className="pillar-card">
                <div className="pillar-icon-box">
                  <FolderGit2 size={22} />
                </div>
                <h3>Multi-Agent Orchestration</h3>
                <p>
                  Coordinate specialized agent roles within unified workflows. Pass structured outputs from a data extraction agent directly into an analytical or code synthesis agent.
                </p>
                <ul className="pillar-checklist">
                  <li><Check size={14} className="check-ico" /> Visual DAG node linking</li>
                  <li><Check size={14} className="check-ico" /> Typed JSON schema data contracts</li>
                  <li><Check size={14} className="check-ico" /> Parallel branch execution</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* VERIFIED TOOL MATRIX */}
        <section className="tools-matrix-section">
          <div className="container">
            <div className="section-head">
              <span className="section-eyebrow">Verified Protocol</span>
              <h2 className="section-title">Core Native Agent Tools</h2>
              <p className="section-subtitle">
                Every tool available in Xarwiz is backed by concrete backend implementations with strict security containment.
              </p>
            </div>

            <div className="tools-table-wrapper">
              <table className="tools-table">
                <thead>
                  <tr>
                    <th>Tool Identifier</th>
                    <th>Execution Scope</th>
                    <th>Security Controls</th>
                    <th>Typical Use Case</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <code className="tool-code">read_file</code>
                    </td>
                    <td>Tenant sandbox workspace</td>
                    <td>Strict path resolution, size limit enforcement</td>
                    <td>Inspecting source code, configs, CSV data, logs</td>
                  </tr>
                  <tr>
                    <td>
                      <code className="tool-code">write_file</code>
                    </td>
                    <td>Tenant sandbox workspace</td>
                    <td>Overwrite confirmations, path whitelist</td>
                    <td>Generating scripts, config updates, markdown reports</td>
                  </tr>
                  <tr>
                    <td>
                      <code className="tool-code">list_dir</code>
                    </td>
                    <td>Tenant sandbox workspace</td>
                    <td>Non-recursive depth limiting, hidden file filtering</td>
                    <td>Exploring directory trees, verifying generated assets</td>
                  </tr>
                  <tr>
                    <td>
                      <code className="tool-code">bash_command</code>
                    </td>
                    <td>Sandboxed child process</td>
                    <td>Timeouts (max 30s), non-root execution, forbidden commands filter</td>
                    <td>Running unit tests, code linting, CLI scripts</td>
                  </tr>
                  <tr>
                    <td>
                      <code className="tool-code">rag_query</code>
                    </td>
                    <td>PostgreSQL pgvector + BM25</td>
                    <td>Row-level tenant isolation, cosine similarity cutoff</td>
                    <td>Querying indexed company policies and PDF documents</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ENTERPRISE GUARDRAILS & GOVERNANCE SECTION */}
        <section className="guardrails-section">
          <div className="container">
            <div className="section-head">
              <span className="section-eyebrow">Safety &amp; Compliance</span>
              <h2 className="section-title">Enterprise Execution Guardrails</h2>
              <p className="section-subtitle">
                Deploy autonomous agents with complete peace of mind. Every action is gated by deterministic policies, non-root sandbox execution, and immutable audit logging.
              </p>
            </div>

            <div className="guardrails-grid">
              <div className="guardrail-card">
                <div className="g-icon-wrap">
                  <ShieldCheck size={24} />
                </div>
                <h3>Workspace Chroot Sandboxing</h3>
                <p>
                  Agent operations are strictly confined to tenant directory roots. System-level paths like <code>/etc</code>, <code>/var/run</code>, or host environment variables are physically inaccessible.
                </p>
                <div className="g-meta-tag">Deterministic Isolation</div>
              </div>

              <div className="guardrail-card">
                <div className="g-icon-wrap">
                  <Lock size={24} />
                </div>
                <h3>Human-in-the-Loop Approval Gates</h3>
                <p>
                  Configure automated pausing for sensitive tasks. If an agent attempts to execute high-impact code changes, deploy to production, or dispatch external webhooks, operator approval is required.
                </p>
                <div className="g-meta-tag">Policy Enforcement</div>
              </div>

              <div className="guardrail-card">
                <div className="g-icon-wrap">
                  <FileCheck2 size={24} />
                </div>
                <h3>Immutable JSON Audit Trail</h3>
                <p>
                  Every reasoning thought, tool invocation, parameter payload, execution duration, and return output is indexed into tamper-resistant audit logs for full compliance tracking.
                </p>
                <div className="g-meta-tag">DPDP Act 2023 Ready</div>
              </div>

              <div className="guardrail-card">
                <div className="g-icon-wrap">
                  <Zap size={24} />
                </div>
                <h3>Resource Quotas &amp; Circuit Breakers</h3>
                <p>
                  Prevent runaway execution loops with strict limits on maximum reasoning turns, token consumption ceilings, per-minute tool execution budgets, and command timeout thresholds.
                </p>
                <div className="g-meta-tag">Cost &amp; Loop Protection</div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section className="faq-section">
          <div className="container">
            <div className="section-head">
              <span className="section-eyebrow">Frequently Asked Questions</span>
              <h2 className="section-title">AI Agents Technical FAQs</h2>
              <p className="section-subtitle">
                Clear answers regarding agent execution, sandboxing, and enterprise governance.
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

        {/* CONVERSION CTA */}
        <section className="cta-banner-section">
          <div className="container">
            <div className="cta-box">
              <h2>Ready to Deploy Autonomous AI Agents?</h2>
              <p>
                Start with our pre-configured agent templates or build custom agent harnesses with full sandbox isolation.
              </p>
              <div className="cta-actions">
                <Link href="/signup" className="btn-cta-primary">
                  <span>Request Platform Access</span>
                  <ArrowRight size={16} />
                </Link>
                <Link href="/platform/workflows" className="btn-cta-secondary">
                  <span>Explore Workflow Engine</span>
                </Link>
                <Link href="/contact" className="btn-cta-tertiary">
                  <span>Talk to Solutions Engineer &rarr;</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <FooterSection hideBanner={true} />

      <style jsx>{`
        .agents-page {
          min-height: 100vh;
          background-color: #ffffff;
          color: #0f172a;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
        }

        /* BREADCRUMB */
        .breadcrumb-nav {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
          color: #64748b;
          margin-bottom: 24px;
        }

        .breadcrumb-nav :global(.crumb-link) {
          color: #64748b;
          text-decoration: none;
          transition: color 0.15s;
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

        .blue-gradient {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* HERO */
        .agents-hero {
          padding: 60px 0 80px 0;
          position: relative;
          background: radial-gradient(circle at 50% 0%, rgba(37, 99, 235, 0.08) 0%, rgba(255, 255, 255, 0) 70%);
        }

        .hero-content {
          text-align: center;
          max-width: 860px;
          margin: 0 auto 50px auto;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 9999px;
          background: rgba(37, 99, 235, 0.08);
          border: 1px solid rgba(37, 99, 235, 0.2);
          color: #2563eb;
          font-size: 0.82rem;
          font-weight: 600;
          margin-bottom: 24px;
        }

        .hero-title {
          font-size: clamp(2.3rem, 4.8vw, 3.6rem);
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
          margin-bottom: 36px;
        }

        .hero-cta-group {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 48px;
        }

        .hero-cta-group :global(.btn-primary) {
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

        .hero-cta-group :global(.btn-primary:hover) {
          background: #1d4ed8;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.35);
        }

        .hero-cta-group :global(.btn-secondary) {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #1e293b;
          padding: 14px 28px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.95rem;
          text-decoration: none;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          transition: all 0.2s ease;
        }

        .hero-cta-group :global(.btn-secondary:hover) {
          background: #f8fafc;
          border-color: #94a3b8;
          transform: translateY(-2px);
        }

        .hero-stats-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 32px;
          padding-top: 24px;
          border-top: 1px solid #e2e8f0;
        }

        .hero-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .stat-num {
          font-size: 1.4rem;
          font-weight: 800;
          color: #2563eb;
        }

        .stat-label {
          font-size: 0.78rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
        }

        .hero-stat-sep {
          width: 1px;
          height: 32px;
          background: #e2e8f0;
        }

        /* TERMINAL CARD */
        .agent-terminal-card {
          max-width: 960px;
          margin: 0 auto;
          background: #090e1a;
          border: 1px solid #1e293b;
          border-radius: 16px;
          box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.25);
          overflow: hidden;
        }

        .terminal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 18px;
          background: #0f172a;
          border-bottom: 1px solid #1e293b;
        }

        .window-dots {
          display: flex;
          gap: 8px;
        }

        .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .dot-red { background: #ef4444; }
        .dot-yellow { background: #eab308; }
        .dot-green { background: #22c55e; }

        .terminal-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.8rem;
          color: #94a3b8;
        }

        .terminal-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.72rem;
          color: #4ade80;
          font-weight: 600;
        }

        .pulse-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 8px #22c55e;
        }

        .terminal-tabs {
          display: flex;
          background: #090e1a;
          border-bottom: 1px solid #1e293b;
          padding: 0 12px;
        }

        .term-tab {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          color: #64748b;
          padding: 10px 16px;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .term-tab:hover {
          color: #cbd5e1;
        }

        .term-tab.active {
          color: #60a5fa;
          border-bottom-color: #3b82f6;
          background: rgba(59, 130, 246, 0.05);
        }

        .terminal-body {
          padding: 24px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.85rem;
          line-height: 1.7;
          min-height: 240px;
          background: #090e1a;
        }

        .code-block {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .dark-json {
          background: #090e1a;
          color: #cbd5e1;
        }

        .dark-json pre {
          margin: 0;
          color: #93c5fd;
          font-family: inherit;
        }

        .token-fn {
          color: #38bdf8;
          font-weight: 600;
        }

        .token-str {
          color: #4ade80;
        }

        .token-keyword {
          color: #f59e0b;
        }

        .log-line {
          color: #cbd5e1;
        }

        .log-line.success {
          color: #4ade80;
        }

        .ts {
          color: #475569;
          margin-right: 8px;
        }

        .agent-tag {
          color: #a78bfa;
          font-weight: 700;
          margin-right: 6px;
        }

        .tool-call {
          color: #38bdf8;
          font-weight: 700;
          margin-right: 6px;
        }

        .tool-res {
          color: #34d399;
          font-weight: 700;
          margin-right: 6px;
        }

        /* PILLARS */
        .pillars-section {
          padding: 90px 0;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
        }

        .section-head {
          text-align: center;
          max-width: 720px;
          margin: 0 auto 60px auto;
        }

        .section-eyebrow {
          display: inline-block;
          font-size: 0.8rem;
          font-weight: 700;
          color: #2563eb;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 12px;
        }

        .section-title {
          font-size: clamp(1.8rem, 3.2vw, 2.5rem);
          font-weight: 800;
          color: #0f172a;
          line-height: 1.25;
          margin-bottom: 16px;
          letter-spacing: -0.02em;
        }

        .section-subtitle {
          font-size: 1.05rem;
          color: #475569;
          line-height: 1.6;
        }

        .pillars-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }

        .pillar-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
          transition: all 0.25s ease;
        }

        .pillar-card:hover {
          border-color: #93c5fd;
          transform: translateY(-3px);
          box-shadow: 0 12px 24px -4px rgba(37, 99, 235, 0.08);
        }

        .pillar-icon-box {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: #eff6ff;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }

        .pillar-card h3 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 12px;
        }

        .pillar-card p {
          font-size: 0.95rem;
          color: #475569;
          line-height: 1.6;
          margin-bottom: 20px;
        }

        .pillar-card code {
          background: #f1f5f9;
          color: #1e293b;
          border: 1px solid #e2e8f0;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.85rem;
        }

        .pillar-checklist {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .pillar-checklist li {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.88rem;
          color: #334155;
        }

        .check-ico {
          color: #10b981;
          flex-shrink: 0;
        }

        /* TOOLS TABLE */
        .tools-matrix-section {
          padding: 90px 0;
          background: #ffffff;
        }

        .tools-table-wrapper {
          overflow-x: auto;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
        }

        .tools-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.9rem;
        }

        .tools-table th {
          background: #f8fafc;
          padding: 16px 20px;
          color: #475569;
          font-weight: 700;
          border-bottom: 1px solid #e2e8f0;
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
        }

        .tools-table td {
          padding: 18px 20px;
          border-bottom: 1px solid #f1f5f9;
          color: #334155;
          vertical-align: middle;
          line-height: 1.5;
        }

        .tools-table tr:last-child td {
          border-bottom: none;
        }

        .tool-code {
          background: #eff6ff;
          color: #2563eb;
          border: 1px solid #dbeafe;
          padding: 4px 8px;
          border-radius: 6px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.85rem;
          font-weight: 700;
        }

        /* GUARDRAILS & GOVERNANCE */
        .guardrails-section {
          padding: 90px 0;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
        }

        .guardrails-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }

        .guardrail-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
          transition: all 0.25s ease;
          display: flex;
          flex-direction: column;
        }

        .guardrail-card:hover {
          border-color: #93c5fd;
          transform: translateY(-2px);
          box-shadow: 0 12px 24px -4px rgba(37, 99, 235, 0.08);
        }

        .g-icon-wrap {
          width: 46px;
          height: 46px;
          border-radius: 12px;
          background: #eff6ff;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }

        .guardrail-card h3 {
          font-size: 1.2rem;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 10px;
        }

        .guardrail-card p {
          font-size: 0.94rem;
          color: #475569;
          line-height: 1.6;
          margin-bottom: 20px;
          flex-grow: 1;
        }

        .guardrail-card code {
          background: #f1f5f9;
          color: #0f172a;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.84rem;
        }

        .g-meta-tag {
          align-self: flex-start;
          font-size: 0.75rem;
          font-weight: 700;
          color: #2563eb;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          padding: 4px 10px;
          border-radius: 6px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        /* FAQ */
        .faq-section {
          padding: 90px 0;
          background: #ffffff;
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
          transition: all 0.2s;
        }

        .faq-item.expanded {
          border-color: #2563eb;
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
          color: #0f172a;
          font-size: 0.98rem;
          font-weight: 700;
          text-align: left;
          cursor: pointer;
        }

        .faq-icon {
          color: #64748b;
          transition: transform 0.2s;
          flex-shrink: 0;
        }

        .faq-item.expanded .faq-icon {
          transform: rotate(180deg);
          color: #2563eb;
        }

        .faq-answer {
          padding: 0 24px 20px 24px;
          color: #475569;
          font-size: 0.92rem;
          line-height: 1.65;
          border-top: 1px solid #f1f5f9;
          padding-top: 16px;
        }

        /* CTA */
        .cta-banner-section {
          padding: 80px 0 100px 0;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
        }

        .cta-box {
          background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);
          border-radius: 20px;
          padding: 56px 40px;
          text-align: center;
          box-shadow: 0 20px 35px -10px rgba(37, 99, 235, 0.35);
        }

        .cta-box h2 {
          font-size: clamp(1.9rem, 3.4vw, 2.6rem);
          font-weight: 800;
          color: #ffffff;
          margin-bottom: 16px;
          letter-spacing: -0.02em;
        }

        .cta-box p {
          font-size: 1.1rem;
          color: #dbeafe;
          margin-bottom: 36px;
          max-width: 640px;
          margin-left: auto;
          margin-right: auto;
          line-height: 1.6;
        }

        .cta-actions {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .cta-actions :global(.btn-cta-primary) {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: #ffffff !important;
          color: #1e3a8a !important;
          padding: 14px 28px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.95rem;
          text-decoration: none !important;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
          transition: all 0.2s ease;
        }

        .cta-actions :global(.btn-cta-primary:hover) {
          background: #f8fafc !important;
          color: #1d4ed8 !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
        }

        .cta-actions :global(.btn-cta-secondary) {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.15) !important;
          border: 1px solid rgba(255, 255, 255, 0.35) !important;
          color: #ffffff !important;
          padding: 14px 28px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.95rem;
          text-decoration: none !important;
          transition: all 0.2s ease;
        }

        .cta-actions :global(.btn-cta-secondary:hover) {
          background: rgba(255, 255, 255, 0.25) !important;
          border-color: rgba(255, 255, 255, 0.5) !important;
          transform: translateY(-2px);
        }

        .cta-actions :global(.btn-cta-tertiary) {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #ffffff !important;
          padding: 14px 20px;
          font-weight: 600;
          font-size: 0.95rem;
          text-decoration: none !important;
          transition: opacity 0.2s;
        }

        .cta-actions :global(.btn-cta-tertiary:hover) {
          opacity: 0.85;
          text-decoration: underline !important;
        }

        @media (max-width: 1024px) {
          .pillars-grid, .guardrails-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .hero-stats-row {
            flex-direction: column;
            gap: 16px;
          }
          .hero-stat-sep {
            display: none;
          }
          .cta-box {
            padding: 40px 24px;
          }
          .cta-actions {
            flex-direction: column;
            width: 100%;
          }
          .cta-actions :global(.btn-cta-primary),
          .cta-actions :global(.btn-cta-secondary),
          .cta-actions :global(.btn-cta-tertiary) {
            width: 100%;
            justify-content: center;
            box-sizing: border-box;
          }
        }
      `}</style>
    </div>
  );
}
