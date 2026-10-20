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
      a: 'Every agent runs inside an isolated Workspace Sandbox bound strictly to the tenant directory. Tool calls like read_file, write_file, and bash_command execute within sandboxed child processes with path-traversal prevention, process execution timeouts, and strict privilege limits. System-critical OS files cannot be accessed or modified.',
    },
    {
      q: 'Can agents retain context across long-running sessions?',
      a: 'Yes. Agents leverage a dual-tier memory architecture: short-term sliding window context for immediate conversational turns, and long-term semantic persistence stored in PostgreSQL with pgvector embeddings. Agents retrieve prior decisions, file changes, and instructions dynamically during task execution.',
    },
    {
      q: 'Which foundation models power agent reasoning and tool calling?',
      a: 'Xarwiz supports structured JSON function calling with local open-source models via our integrated Ollama runtime (such as Qwen 2.5 Coder, Qwen 3, and Llama 3.2 variants) as well as frontier commercial models like GPT-4o. You can configure model temperature, token budgets, and system instructions per agent.',
    },
    {
      q: 'Can agents collaborate or delegate tasks to one another?',
      a: 'Yes. Through the Xarwiz DAG Workflow Engine, agents can be chained as discrete execution nodes. A primary triage agent can analyze an incoming webhook payload, delegate data retrieval to a research agent, pass findings to a code generation agent, and output the result to Slack or GitHub.',
    },
    {
      q: 'How are tool-call failures or exceptions handled?',
      a: 'When a tool execution returns an error (e.g. invalid syntax or file not found), the agent receives the structured error payload in its next reasoning step, allowing it to inspect the traceback, correct parameters, and self-heal or request human review.',
    },
  ];

  return (
    <div className="agents-page">
      <SEOHead
        title="Autonomous AI Agents & Tool Calling - Xarwiz Platform"
        description="Build and deploy autonomous AI agents with sandboxed tool execution, file system access, long-term memory, and verified local model hosting."
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
              'Technical specifications for Xarwiz autonomous AI agents with sandboxed tool calling, dual-tier memory, and sovereign model inference.',
          },
        ]}
      />

      <HeaderNav activePath="/platform" />

      <main className="agents-main">
        {/* HERO SECTION */}
        <section className="agents-hero">
          <div className="container">
            <div className="hero-content">
              <div className="hero-badge">
                <Bot size={14} />
                <span>Autonomous Execution Layer</span>
              </div>
              <h1 className="hero-title">
                Autonomous AI Agents Built for <span className="blue-gradient">Real-World Execution</span>
              </h1>
              <p className="hero-subtitle">
                Move beyond conversational chatbots. Xarwiz AI agents inspect workspaces, execute sandboxed bash commands, call external APIs, query vectorized knowledge, and self-correct on errors.
              </p>
              <div className="hero-cta-group">
                <Link href="/signup" className="btn-primary">
                  <span>Deploy Your First Agent</span>
                  <ArrowRight size={16} />
                </Link>
                <Link href="/signup?source=book_demo" className="btn-secondary">
                  <span>Book Architecture Demo</span>
                </Link>
              </div>

              <div className="hero-stats-row">
                <div className="hero-stat">
                  <span className="stat-num">4+</span>
                  <span className="stat-label">Verified Core Tools</span>
                </div>
                <div className="hero-stat-sep" />
                <div className="hero-stat">
                  <span className="stat-num">100%</span>
                  <span className="stat-label">Sandboxed Workspace Isolation</span>
                </div>
                <div className="hero-stat-sep" />
                <div className="hero-stat">
                  <span className="stat-num">Local + Cloud</span>
                  <span className="stat-label">Model Flexibility (Ollama/Frontier)</span>
                </div>
              </div>
            </div>

            {/* INTERACTIVE AGENT TERMINAL PREVIEW */}
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
                  <span>ACTIVE</span>
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
                      <span className="ts">[22:15:03]</span> <span className="tool-call">[TOOL_CALL]</span> read_file &#123; path: &quot;package.json&quot; &#125;
                    </div>
                    <div className="log-line success">
                      <span className="ts">[22:15:03]</span> <span className="tool-res">[TOOL_RESULT]</span> File loaded (1.2KB) - 18 dependencies parsed.
                    </div>
                    <div className="log-line">
                      <span className="ts">[22:15:05]</span> <span className="tool-call">[TOOL_CALL]</span> bash_command &#123; cmd: &quot;npm audit --json&quot;, timeout: 15000 &#125;
                    </div>
                    <div className="log-line success">
                      <span className="ts">[22:15:07]</span> <span className="tool-res">[TOOL_RESULT]</span> Sandbox exit code 0. 0 high vulnerabilities found.
                    </div>
                    <div className="log-line">
                      <span className="ts">[22:15:08]</span> <span className="agent-tag">[AGENT_OUTPUT]</span> Completed dependency audit. Generating summary report in workspace...
                    </div>
                  </div>
                )}

                {activeTab === 'config' && (
                  <div className="code-block json-block">
                    <pre>{`{
  "agent_id": "agt_devops_automator_09",
  "name": "Repo Maintenance Agent",
  "model": "qwen2.5-coder:32b",
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
  ]
}`}</pre>
                  </div>
                )}

                {activeTab === 'memory' && (
                  <div className="code-block">
                    <div className="log-line">
                      <span className="ts">[MEM_TIER_1]</span> Short-term buffer: 14 conversational turns (3,410 tokens).
                    </div>
                    <div className="log-line">
                      <span className="ts">[MEM_TIER_2]</span> Long-term pgvector index: 84 prior session commits linked.
                    </div>
                    <div className="log-line">
                      <span className="ts">[QUERY]</span> Cosine similarity lookup: &quot;deploy target for staging&quot;
                    </div>
                    <div className="log-line success">
                      <span className="ts">[MATCH 0.94]</span> Tenant staging cluster: kube-in-blr-prod02.xarwiz.internal
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

        {/* MODEL GOVERNANCE & SOVEREIGN HOSTING */}
        <section className="governance-section">
          <div className="container">
            <div className="governance-card">
              <div className="gov-left">
                <span className="section-eyebrow">Data Sovereignty</span>
                <h2>Local Ollama &amp; Frontier Model Hosting</h2>
                <p>
                  Organizations subject to strict data sovereignty mandates cannot send sensitive internal code or operational logs to foreign third-party APIs.
                </p>
                <p>
                  Xarwiz provides an integrated Ollama runtime deployed in Indian sovereign data center regions. Run Qwen 2.5 Coder, Qwen 3, and Llama 3.2 locally on dedicated compute with zero data retention by external providers.
                </p>

                <div className="gov-badges">
                  <div className="g-badge">
                    <ShieldCheck size={16} />
                    <span>DPDP Act 2023 Compliant</span>
                  </div>
                  <div className="g-badge">
                    <Lock size={16} />
                    <span>Indian Data Localization</span>
                  </div>
                  <div className="g-badge">
                    <Cpu size={16} />
                    <span>Local Model Inference</span>
                  </div>
                </div>
              </div>

              <div className="gov-right">
                <div className="model-list">
                  <div className="model-item">
                    <div className="m-info">
                      <span className="m-name">Qwen 2.5 Coder (32B / 7B)</span>
                      <span className="m-desc">Specialized coding and bash reasoning</span>
                    </div>
                    <span className="m-tag tag-local">Ollama Local</span>
                  </div>

                  <div className="model-item">
                    <div className="m-info">
                      <span className="m-name">Llama 3.2 (3B / 1B)</span>
                      <span className="m-desc">Low-latency task extraction and classification</span>
                    </div>
                    <span className="m-tag tag-local">Ollama Local</span>
                  </div>

                  <div className="model-item">
                    <div className="m-info">
                      <span className="m-name">OpenAI GPT-4o / Claude 3.5</span>
                      <span className="m-desc">Complex multi-hop cross-domain orchestration</span>
                    </div>
                    <span className="m-tag tag-cloud">Frontier API</span>
                  </div>

                  <div className="model-item">
                    <div className="m-info">
                      <span className="m-name">Custom Enterprise Endpoint</span>
                      <span className="m-desc">Bring your own vLLM / HuggingFace server</span>
                    </div>
                    <span className="m-tag tag-enterprise">Enterprise</span>
                  </div>
                </div>
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
                Start with our pre-configured agent templates or register your private model endpoints today.
              </p>
              <div className="cta-actions">
                <Link href="/signup" className="btn-primary">
                  <span>Request Platform Access</span>
                  <ArrowRight size={16} />
                </Link>
                <Link href="/platform/workflows" className="btn-secondary">
                  <span>Explore Workflow Engine</span>
                </Link>
                <Link href="/contact" className="btn-tertiary">
                  <span>Talk to Solutions Engineer</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <FooterSection />

      <style jsx>{`
        .agents-page {
          min-height: 100vh;
          background-color: #0b1120;
          color: #f8fafc;
          font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .blue-gradient {
          background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* HERO */
        .agents-hero {
          padding: 80px 0 60px 0;
          position: relative;
          background: radial-gradient(circle at 50% 20%, rgba(37, 99, 235, 0.12) 0%, transparent 60%);
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
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.25);
          color: #93c5fd;
          font-size: 0.82rem;
          font-weight: 600;
          margin-bottom: 24px;
        }

        .hero-title {
          font-size: clamp(2.4rem, 4.8vw, 3.8rem);
          font-weight: 800;
          line-height: 1.15;
          letter-spacing: -0.03em;
          margin-bottom: 20px;
          color: #ffffff;
        }

        .hero-subtitle {
          font-size: clamp(1.05rem, 1.8vw, 1.22rem);
          line-height: 1.6;
          color: #94a3b8;
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

        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: #2563eb;
          color: #ffffff;
          padding: 14px 28px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.95rem;
          text-decoration: none;
          box-shadow: 0 4px 20px rgba(37, 99, 235, 0.35);
          transition: all 0.2s ease;
        }

        .btn-primary:hover {
          background: #1d4ed8;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(37, 99, 235, 0.5);
        }

        .btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
          padding: 14px 28px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.95rem;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
        }

        .hero-stats-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 32px;
          padding-top: 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
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
          color: #60a5fa;
        }

        .stat-label {
          font-size: 0.8rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .hero-stat-sep {
          width: 1px;
          height: 32px;
          background: rgba(255, 255, 255, 0.1);
        }

        /* TERMINAL CARD */
        .agent-terminal-card {
          max-width: 960px;
          margin: 0 auto;
          background: #0f172a;
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 16px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          overflow: hidden;
        }

        .terminal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 18px;
          background: #090e1a;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
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
          font-family: monospace;
          font-size: 0.82rem;
          color: #94a3b8;
        }

        .terminal-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: monospace;
          font-size: 0.75rem;
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
          background: #0d1527;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
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
          padding: 20px 24px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.86rem;
          line-height: 1.7;
          min-height: 220px;
        }

        .code-block {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .json-block pre {
          margin: 0;
          color: #cbd5e1;
          font-family: inherit;
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
          border-top: 1px solid rgba(255, 255, 255, 0.06);
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
          color: #3b82f6;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 12px;
        }

        .section-title {
          font-size: clamp(1.8rem, 3.2vw, 2.5rem);
          font-weight: 800;
          color: #ffffff;
          line-height: 1.25;
          margin-bottom: 16px;
          letter-spacing: -0.02em;
        }

        .section-subtitle {
          font-size: 1.02rem;
          color: #94a3b8;
          line-height: 1.6;
        }

        .pillars-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }

        .pillar-card {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 32px;
          transition: all 0.25s ease;
        }

        .pillar-card:hover {
          border-color: rgba(59, 130, 246, 0.3);
          transform: translateY(-2px);
          background: rgba(15, 23, 42, 0.85);
        }

        .pillar-icon-box {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: rgba(59, 130, 246, 0.12);
          color: #60a5fa;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }

        .pillar-card h3 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 12px;
        }

        .pillar-card p {
          font-size: 0.92rem;
          color: #94a3b8;
          line-height: 1.6;
          margin-bottom: 20px;
        }

        .pillar-card code {
          background: rgba(59, 130, 246, 0.15);
          color: #93c5fd;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.84rem;
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
          font-size: 0.86rem;
          color: #cbd5e1;
        }

        .check-ico {
          color: #3b82f6;
          flex-shrink: 0;
        }

        /* TOOLS TABLE */
        .tools-matrix-section {
          padding: 80px 0;
          background: rgba(15, 23, 42, 0.35);
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .tools-table-wrapper {
          overflow-x: auto;
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
        }

        .tools-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.88rem;
        }

        .tools-table th {
          background: #090e1a;
          padding: 16px 20px;
          color: #94a3b8;
          font-weight: 700;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
        }

        .tools-table td {
          padding: 18px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          color: #cbd5e1;
          vertical-align: top;
          line-height: 1.5;
        }

        .tool-code {
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
          padding: 4px 8px;
          border-radius: 6px;
          font-family: monospace;
          font-size: 0.85rem;
          font-weight: 700;
        }

        /* GOVERNANCE */
        .governance-section {
          padding: 90px 0;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .governance-card {
          background: linear-gradient(135deg, rgba(30, 58, 138, 0.35) 0%, rgba(15, 23, 42, 0.8) 100%);
          border: 1px solid rgba(59, 130, 246, 0.25);
          border-radius: 20px;
          padding: 44px;
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 40px;
          align-items: center;
        }

        .gov-left h2 {
          font-size: clamp(1.6rem, 2.8vw, 2.2rem);
          font-weight: 800;
          color: #ffffff;
          line-height: 1.25;
          margin-bottom: 16px;
        }

        .gov-left p {
          font-size: 0.95rem;
          color: #94a3b8;
          line-height: 1.6;
          margin-bottom: 14px;
        }

        .gov-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 24px;
        }

        .g-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(37, 99, 235, 0.15);
          border: 1px solid rgba(59, 130, 246, 0.3);
          color: #93c5fd;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 600;
        }

        .model-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .model-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
        }

        .m-info {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .m-name {
          font-size: 0.92rem;
          font-weight: 700;
          color: #ffffff;
        }

        .m-desc {
          font-size: 0.76rem;
          color: #64748b;
        }

        .m-tag {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 6px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .tag-local {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .tag-cloud {
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
          border: 1px solid rgba(59, 130, 246, 0.3);
        }

        .tag-enterprise {
          background: rgba(168, 85, 247, 0.15);
          color: #c084fc;
          border: 1px solid rgba(168, 85, 247, 0.3);
        }

        /* FAQ */
        .faq-section {
          padding: 90px 0;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .faq-list {
          max-width: 800px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .faq-item {
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.2s;
        }

        .faq-item.expanded {
          border-color: rgba(59, 130, 246, 0.3);
        }

        .faq-question {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 22px;
          background: none;
          border: none;
          color: #f1f5f9;
          font-size: 0.96rem;
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
          color: #60a5fa;
        }

        .faq-answer {
          padding: 0 22px 20px 22px;
          color: #94a3b8;
          font-size: 0.9rem;
          line-height: 1.6;
        }

        /* CTA */
        .cta-banner-section {
          padding: 60px 0 90px 0;
        }

        .cta-box {
          background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #1d4ed8 100%);
          border-radius: 20px;
          padding: 48px;
          text-align: center;
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 25px 50px -12px rgba(29, 78, 216, 0.3);
        }

        .cta-box h2 {
          font-size: clamp(1.8rem, 3.2vw, 2.4rem);
          font-weight: 800;
          color: #ffffff;
          margin-bottom: 12px;
        }

        .cta-box p {
          font-size: 1.05rem;
          color: #dbeafe;
          margin-bottom: 32px;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }

        .cta-actions {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .btn-tertiary {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: transparent;
          color: #ffffff;
          padding: 14px 28px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.95rem;
          text-decoration: underline;
          text-underline-offset: 4px;
        }

        @media (max-width: 1024px) {
          .governance-card {
            grid-template-columns: 1fr;
            padding: 32px;
          }
          .pillars-grid {
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
            padding: 32px 20px;
          }
          .cta-actions {
            flex-direction: column;
            width: 100%;
          }
          .btn-primary, .btn-secondary, .btn-tertiary {
            width: 100%;
            justify-content: center;
            box-sizing: border-box;
          }
        }
      `}</style>
    </div>
  );
}
