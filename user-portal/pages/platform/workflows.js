import React, { useState } from 'react';
import Link from 'next/link';
import HeaderNav from '../../components/layout/HeaderNav';
import FooterSection from '../../components/FooterSection';
import SEOHead, {
  defaultOrganizationSchema,
  defaultSoftwareApplicationSchema,
} from '../../components/SEOHead';
import {
  Workflow,
  ArrowRight,
  Sparkles,
  GitBranch,
  Play,
  Clock,
  Webhook,
  Sliders,
  CheckCircle2,
  Check,
  ChevronDown,
  RefreshCw,
  AlertTriangle,
  Code2,
  Layers,
  Zap,
  ShieldCheck,
  FileText,
} from 'lucide-react';

export default function PlatformWorkflowsPage() {
  const [activeFaq, setActiveFaq] = useState(null);
  const [activeStepTab, setActiveStepTab] = useState('dag');

  const toggleFaq = (idx) => {
    setActiveFaq(activeFaq === idx ? null : idx);
  };

  const FAQS = [
    {
      q: 'How does Xarwiz orchestrate complex multi-step workflows?',
      a: 'Workflows in Xarwiz are executed using an asynchronous Directed Acyclic Graph (DAG) runtime engine. Each step is a typed node with explicit dependencies, input parameters, and execution policies. Steps without interdependencies execute concurrently, while dependent nodes wait for prerequisite outputs.',
    },
    {
      q: 'How are incoming triggers authenticated and secured?',
      a: 'Webhooks can be triggered via HTTPS POST endpoints protected by HMAC-SHA256 signature verification. You provide a signing secret, and Xarwiz verifies the X-Xarwiz-Signature header before passing payload bodies into downstream nodes.',
    },
    {
      q: 'How does data pass between workflow steps?',
      a: 'Xarwiz supports expression interpolation syntax: {{steps[0].output.ticket_id}} or {{trigger.body.customer_email}}. The runtime automatically resolves references against the active execution context at runtime.',
    },
    {
      q: 'What happens if an external API or LLM step fails during execution?',
      a: 'Every node supports configurable retry policies with exponential backoff (e.g., 3 retries with 2-second initial delay). If all retries are exhausted, the workflow can either route to a configured fallback branch, record the failure in the audit log, or pause for manual operator intervention.',
    },
    {
      q: 'Can workflows include human approval gates before executing sensitive actions?',
      a: 'Yes. You can insert a Human-in-the-Loop Approval node. The workflow transitions to a PAUSED state, dispatches an approval notification (e.g., to Slack or email with a signed one-click token), and resumes only upon explicit operator confirmation.',
    },
  ];

  return (
    <div className="workflows-page">
      <SEOHead
        title="Visual DAG Workflow Automation Engine - Xarwiz Platform"
        description="Design, test, and deploy resilient DAG-based workflow automations with HMAC webhook triggers, scheduled cron, AI agent reasoning, and human-in-the-loop approvals."
        canonicalPath="/platform/workflows"
        jsonLd={[
          defaultOrganizationSchema,
          defaultSoftwareApplicationSchema,
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Xarwiz Workflow Automation Engine',
            url: 'https://xarwiz.com/platform/workflows',
            description:
              'DAG-based enterprise workflow automation engine with expression interpolation, automated retries, and webhook signatures.',
          },
        ]}
      />

      <HeaderNav activePath="/platform" />

      <main className="workflows-main">
        {/* HERO SECTION */}
        <section className="workflows-hero">
          <div className="container">
            <div className="hero-content">
              <div className="hero-badge">
                <Workflow size={14} />
                <span>Deterministic DAG Orchestration</span>
              </div>
              <h1 className="hero-title">
                Automate Enterprise Workflows with <span className="blue-gradient">Resilient DAG Pipelines</span>
              </h1>
              <p className="hero-subtitle">
                Connect autonomous AI agents, external SaaS webhooks, database lookups, and human approval steps into reliable, visual multi-stage execution graphs.
              </p>
              <div className="hero-cta-group">
                <Link href="/signup" className="btn-primary">
                  <span>Build a Workflow</span>
                  <ArrowRight size={16} />
                </Link>
                <Link href="/signup?source=book_demo" className="btn-secondary">
                  <span>Request Live Walkthrough</span>
                </Link>
              </div>

              <div className="hero-stats-row">
                <div className="hero-stat">
                  <span className="stat-num">DAG</span>
                  <span className="stat-label">Execution Architecture</span>
                </div>
                <div className="hero-stat-sep" />
                <div className="hero-stat">
                  <span className="stat-num">HMAC-SHA256</span>
                  <span className="stat-label">Signed Webhook Security</span>
                </div>
                <div className="hero-stat-sep" />
                <div className="hero-stat">
                  <span className="stat-num">Sub-Second</span>
                  <span className="stat-label">Node Transition Latency</span>
                </div>
              </div>
            </div>

            {/* VISUAL DAG WORKFLOW PIPELINE SIMULATOR */}
            <div className="dag-visualizer-card">
              <div className="visualizer-header">
                <div className="dag-meta">
                  <span className="badge-wf">WF-PROD-904</span>
                  <span className="wf-name">Automated Customer Triage &amp; Escalation</span>
                </div>
                <div className="dag-status">
                  <span className="pulse-dot" />
                  <span>EXECUTION SUCCESS (1.42s)</span>
                </div>
              </div>

              <div className="dag-nav-tabs">
                <button
                  type="button"
                  className={`tab-btn ${activeStepTab === 'dag' ? 'active' : ''}`}
                  onClick={() => setActiveStepTab('dag')}
                >
                  <GitBranch size={14} /> Node Graph Flow
                </button>
                <button
                  type="button"
                  className={`tab-btn ${activeStepTab === 'json' ? 'active' : ''}`}
                  onClick={() => setActiveStepTab('json')}
                >
                  <Code2 size={14} /> Step Expression State
                </button>
                <button
                  type="button"
                  className={`tab-btn ${activeStepTab === 'retries' ? 'active' : ''}`}
                  onClick={() => setActiveStepTab('retries')}
                >
                  <RefreshCw size={14} /> Backoff &amp; Error Handling
                </button>
              </div>

              <div className="visualizer-body">
                {activeStepTab === 'dag' && (
                  <div className="dag-graph">
                    {/* NODE 1 */}
                    <div className="dag-node completed">
                      <div className="node-icon">
                        <Webhook size={16} />
                      </div>
                      <div className="node-body">
                        <span className="node-type">TRIGGER</span>
                        <span className="node-title">Inbound Webhook</span>
                        <span className="node-detail">HMAC Verified &bull; POST</span>
                      </div>
                      <CheckCircle2 size={16} className="node-check" />
                    </div>

                    <div className="dag-arrow">&rarr;</div>

                    {/* NODE 2 */}
                    <div className="dag-node completed">
                      <div className="node-icon ai-icon">
                        <Sparkles size={16} />
                      </div>
                      <div className="node-body">
                        <span className="node-type">AI AGENT STEP</span>
                        <span className="node-title">Intent &amp; Priority Triage</span>
                        <span className="node-detail">Qwen 2.5 Coder &bull; 240ms</span>
                      </div>
                      <CheckCircle2 size={16} className="node-check" />
                    </div>

                    <div className="dag-arrow">&rarr;</div>

                    {/* NODE 3 */}
                    <div className="dag-node completed">
                      <div className="node-icon">
                        <GitBranch size={16} />
                      </div>
                      <div className="node-body">
                        <span className="node-type">CONDITION</span>
                        <span className="node-title">Priority &gt;= Urgent</span>
                        <span className="node-detail">Branch: Escalate &rarr; PagerDuty</span>
                      </div>
                      <CheckCircle2 size={16} className="node-check" />
                    </div>

                    <div className="dag-arrow">&rarr;</div>

                    {/* NODE 4 */}
                    <div className="dag-node completed">
                      <div className="node-icon green-icon">
                        <Zap size={16} />
                      </div>
                      <div className="node-body">
                        <span className="node-type">DISPATCH</span>
                        <span className="node-title">Slack + Notion Log</span>
                        <span className="node-detail">Signed payload &bull; HTTP 200</span>
                      </div>
                      <CheckCircle2 size={16} className="node-check" />
                    </div>
                  </div>
                )}

                {activeStepTab === 'json' && (
                  <div className="code-view">
                    <pre>{`// Evaluated Context in Execution #exec_883921
{
  "trigger": {
    "type": "webhook",
    "verified": true,
    "body": {
      "customer_email": "ops@enterprise-corp.in",
      "issue_severity": "critical",
      "description": "Production database connection spike"
    }
  },
  "steps": {
    "triage_agent": {
      "status": "SUCCESS",
      "duration_ms": 240,
      "output": {
        "classification": "DATABASE_INFRA_ALERT",
        "priority_score": 95,
        "suggested_action": "notify_oncall_lead"
      }
    },
    "routing_condition": {
      "expression": "{{steps.triage_agent.output.priority_score >= 80}}",
      "evaluated_to": true
    }
  }
}`}</pre>
                  </div>
                )}

                {activeStepTab === 'retries' && (
                  <div className="retry-view">
                    <div className="retry-metric">
                      <span className="r-label">Configured Strategy:</span>
                      <span className="r-val">Exponential Backoff (Initial 1000ms, Factor 2.0x, Max 3 Retries)</span>
                    </div>
                    <div className="retry-metric">
                      <span className="r-label">Circuit Breaker:</span>
                      <span className="r-val">Trip after 5 consecutive endpoint timeouts</span>
                    </div>
                    <div className="retry-metric">
                      <span className="r-label">Dead Letter Queue:</span>
                      <span className="r-val">Failed runs preserved in pg_workflow_failures audit table</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 4 CORE WORKFLOW CAPABILITIES */}
        <section className="features-section">
          <div className="container">
            <div className="section-head">
              <span className="section-eyebrow">Enterprise Engine</span>
              <h2 className="section-title">Engineered for Complex Business Logic</h2>
              <p className="section-subtitle">
                Linear automation tools fail when edge cases arise. Xarwiz provides full control over branching, state retention, and failure handling.
              </p>
            </div>

            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon-box">
                  <Webhook size={22} />
                </div>
                <h3>HMAC-Signed Triggers</h3>
                <p>
                  Receive payloads from Stripe, Razorpay, GitHub, or internal microservices with cryptographic HMAC-SHA256 signature validation to prevent spoofing.
                </p>
                <ul className="f-list">
                  <li><Check size={14} className="c-ico" /> Secret key rotation support</li>
                  <li><Check size={14} className="c-ico" /> Replay-attack timestamp checks</li>
                  <li><Check size={14} className="c-ico" /> Custom HTTP header extraction</li>
                </ul>
              </div>

              <div className="feature-card">
                <div className="feature-icon-box">
                  <Clock size={22} />
                </div>
                <h3>Scheduled Cron Precision</h3>
                <p>
                  Schedule recurring data synchronizations, nightly report generations, or periodic compliance health checks using standard cron expressions.
                </p>
                <ul className="f-list">
                  <li><Check size={14} className="c-ico" /> Timezone-aware scheduling (IST / UTC)</li>
                  <li><Check size={14} className="c-ico" /> Overlap-prevention mutex locks</li>
                  <li><Check size={14} className="c-ico" /> Manual ad-hoc execution triggers</li>
                </ul>
              </div>

              <div className="feature-card">
                <div className="feature-icon-box">
                  <GitBranch size={22} />
                </div>
                <h3>Dynamic Expression Interpolation</h3>
                <p>
                  Reference outputs from any preceding node effortlessly using <code>{`{{steps[0].output.key}}`}</code> notation. Support for string formatting, mathematical comparisons, and array filters.
                </p>
                <ul className="f-list">
                  <li><Check size={14} className="c-ico" /> Type-safe JSON schema validation</li>
                  <li><Check size={14} className="c-ico" /> Null-safe evaluation fallbacks</li>
                  <li><Check size={14} className="c-ico" /> Multi-variable chaining across nodes</li>
                </ul>
              </div>

              <div className="feature-card">
                <div className="feature-icon-box">
                  <ShieldCheck size={22} />
                </div>
                <h3>Human-in-the-Loop Approvals</h3>
                <p>
                  Pause execution before executing irreversible operations like refund disbursements, server reboots, or database modifications pending human review.
                </p>
                <ul className="f-list">
                  <li><Check size={14} className="c-ico" /> Slack &amp; Email one-click approve tokens</li>
                  <li><Check size={14} className="c-ico" /> Configurable timeout with auto-reject</li>
                  <li><Check size={14} className="c-ico" /> Immutable auditor identification logs</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* WORKFLOW TEMPLATES SECTION */}
        <section className="templates-section">
          <div className="container">
            <div className="section-head">
              <span className="section-eyebrow">Out-of-the-Box Blueprints</span>
              <h2 className="section-title">Pre-Engineered Workflow Recipes</h2>
              <p className="section-subtitle">
                Deploy tested automation architectures in minutes or customize them with your internal API endpoints.
              </p>
            </div>

            <div className="templates-grid">
              <div className="template-card">
                <span className="t-category">Engineering &amp; DevOps</span>
                <h4>Pull Request Review &amp; Security Scan</h4>
                <p>
                  Listens to GitHub PR webhooks, invokes a sandboxed Qwen 2.5 Coder agent to audit changed files, runs lint checks, and posts inline review comments.
                </p>
                <div className="t-steps">
                  <span>GitHub Webhook</span> &rarr; <span>Agent Code Audit</span> &rarr; <span>Sandbox Lint</span> &rarr; <span>PR Comment</span>
                </div>
              </div>

              <div className="template-card">
                <span className="t-category">Customer Operations</span>
                <h4>Smart Support Ticket Triage</h4>
                <p>
                  Receives customer support emails, searches your indexed knowledge base for matching solutions, drafts an AI response, and alerts on-call if urgent.
                </p>
                <div className="t-steps">
                  <span>Support Email</span> &rarr; <span>Hybrid RAG Search</span> &rarr; <span>Draft Reply</span> &rarr; <span>Slack Notify</span>
                </div>
              </div>

              <div className="template-card">
                <span className="t-category">Finance &amp; Operations</span>
                <h4>Razorpay Invoice Reconciliation</h4>
                <p>
                  Polls daily payment capture events, matches amounts with internal transaction records, and exports GST-compliant ledger entries to Google Sheets.
                </p>
                <div className="t-steps">
                  <span>Daily Cron</span> &rarr; <span>Payment Fetch</span> &rarr; <span>Reconcile Logic</span> &rarr; <span>Notion/Sheets Sync</span>
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
              <h2 className="section-title">Workflow Automation FAQs</h2>
              <p className="section-subtitle">
                Technical details on DAG graph orchestration, retry policies, and throughput.
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

        {/* CTA SECTION */}
        <section className="cta-banner-section">
          <div className="container">
            <div className="cta-box">
              <h2>Build Resilient Workflows on Xarwiz</h2>
              <p>
                Combine visual drag-and-drop simplicity with enterprise-grade DAG execution and code-level control.
              </p>
              <div className="cta-actions">
                <Link href="/signup" className="btn-primary">
                  <span>Request Platform Access</span>
                  <ArrowRight size={16} />
                </Link>
                <Link href="/platform/knowledge-bases" className="btn-secondary">
                  <span>Explore Knowledge Bases</span>
                </Link>
                <Link href="/contact" className="btn-tertiary">
                  <span>Contact Sales</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <FooterSection />

      <style jsx>{`
        .workflows-page {
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
        .workflows-hero {
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

        /* VISUALIZER */
        .dag-visualizer-card {
          max-width: 1020px;
          margin: 0 auto;
          background: #0f172a;
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 16px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          overflow: hidden;
        }

        .visualizer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          background: #090e1a;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .dag-meta {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .badge-wf {
          background: rgba(59, 130, 246, 0.2);
          color: #60a5fa;
          padding: 3px 8px;
          border-radius: 6px;
          font-family: monospace;
          font-size: 0.78rem;
          font-weight: 700;
        }

        .wf-name {
          font-size: 0.88rem;
          font-weight: 600;
          color: #f1f5f9;
        }

        .dag-status {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: monospace;
          font-size: 0.76rem;
          color: #4ade80;
          font-weight: 700;
        }

        .pulse-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 8px #22c55e;
        }

        .dag-nav-tabs {
          display: flex;
          background: #0d1527;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 0 12px;
        }

        .tab-btn {
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

        .tab-btn:hover {
          color: #cbd5e1;
        }

        .tab-btn.active {
          color: #60a5fa;
          border-bottom-color: #3b82f6;
          background: rgba(59, 130, 246, 0.05);
        }

        .visualizer-body {
          padding: 28px 24px;
        }

        .dag-graph {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          overflow-x: auto;
          padding-bottom: 8px;
        }

        .dag-node {
          background: rgba(30, 41, 59, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 200px;
          position: relative;
        }

        .dag-node.completed {
          border-color: rgba(59, 130, 246, 0.4);
          background: rgba(15, 23, 42, 0.9);
        }

        .node-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .node-icon.ai-icon {
          background: rgba(168, 85, 247, 0.15);
          color: #c084fc;
        }

        .node-icon.green-icon {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
        }

        .node-body {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .node-type {
          font-size: 0.68rem;
          color: #64748b;
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .node-title {
          font-size: 0.86rem;
          font-weight: 700;
          color: #ffffff;
        }

        .node-detail {
          font-size: 0.74rem;
          color: #94a3b8;
        }

        .node-check {
          color: #22c55e;
          position: absolute;
          top: 10px;
          right: 10px;
        }

        .dag-arrow {
          color: #475569;
          font-weight: 800;
          font-size: 1.2rem;
          flex-shrink: 0;
        }

        .code-view pre {
          margin: 0;
          font-family: monospace;
          font-size: 0.84rem;
          color: #cbd5e1;
          line-height: 1.6;
        }

        .retry-view {
          display: flex;
          flex-direction: column;
          gap: 12px;
          font-size: 0.88rem;
        }

        .retry-metric {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(15, 23, 42, 0.6);
          padding: 12px 16px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .r-label {
          color: #94a3b8;
          font-weight: 600;
          min-width: 180px;
        }

        .r-val {
          color: #60a5fa;
          font-family: monospace;
        }

        /* FEATURES GRID */
        .features-section {
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

        .features-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }

        .feature-card {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 32px;
          transition: all 0.25s ease;
        }

        .feature-card:hover {
          border-color: rgba(59, 130, 246, 0.3);
          transform: translateY(-2px);
          background: rgba(15, 23, 42, 0.85);
        }

        .feature-icon-box {
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

        .feature-card h3 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 12px;
        }

        .feature-card p {
          font-size: 0.92rem;
          color: #94a3b8;
          line-height: 1.6;
          margin-bottom: 20px;
        }

        .feature-card code {
          background: rgba(59, 130, 246, 0.15);
          color: #93c5fd;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.84rem;
        }

        .f-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .f-list li {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.86rem;
          color: #cbd5e1;
        }

        .c-ico {
          color: #3b82f6;
          flex-shrink: 0;
        }

        /* TEMPLATES */
        .templates-section {
          padding: 80px 0;
          background: rgba(15, 23, 42, 0.35);
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .templates-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }

        .template-card {
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: all 0.25s;
        }

        .template-card:hover {
          border-color: rgba(59, 130, 246, 0.3);
          transform: translateY(-2px);
        }

        .t-category {
          font-size: 0.75rem;
          font-weight: 700;
          color: #38bdf8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .template-card h4 {
          font-size: 1.12rem;
          font-weight: 700;
          color: #ffffff;
          line-height: 1.35;
        }

        .template-card p {
          font-size: 0.88rem;
          color: #94a3b8;
          line-height: 1.55;
          flex-grow: 1;
        }

        .t-steps {
          font-size: 0.78rem;
          color: #cbd5e1;
          background: rgba(30, 41, 59, 0.5);
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          line-height: 1.4;
        }

        .t-steps span {
          color: #60a5fa;
          font-weight: 600;
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
          .features-grid {
            grid-template-columns: 1fr;
          }
          .templates-grid {
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
          .dag-graph {
            flex-direction: column;
            align-items: stretch;
          }
          .dag-arrow {
            text-align: center;
            transform: rotate(90deg);
            margin: 6px 0;
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
