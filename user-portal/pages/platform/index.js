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
  Workflow,
  Database,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Terminal,
  Lock,
  Zap,
  Layers,
  Boxes,
  Key,
  FileText,
  HelpCircle,
  ChevronDown,
  Globe,
  Share2,
} from 'lucide-react';

export default function PlatformPage() {
  const [activeFaq, setActiveFaq] = useState(null);

  const toggleFaq = (idx) => {
    setActiveFaq(activeFaq === idx ? null : idx);
  };

  const FAQS = [
    {
      q: 'What is Xarwiz and how does it differ from a standard AI chatbot?',
      a: 'Xarwiz is an enterprise AI business operating system, not just a conversational wrapper. It unifies autonomous AI agents with tool-calling capabilities, a visual DAG-based workflow automation engine, hybrid pgvector + BM25 document intelligence, and multi-tenant sovereign infrastructure. Agents in Xarwiz can inspect workspaces, query databases, trigger external APIs, and execute multi-step business logic.',
    },
    {
      q: 'Which LLMs and foundation models are supported?',
      a: 'Xarwiz features an integrated model gateway supporting open-source weights hosted locally via our Ollama runtime (including Qwen 2.5 Coder, Qwen 3 series, and Llama 3.2 variants) as well as frontier models like GPT-4o. Enterprise tier customers can also register custom endpoint URLs and private model instances.',
    },
    {
      q: 'How does Xarwiz protect proprietary data and adhere to the DPDP Act 2023?',
      a: 'All data is hosted in Indian sovereign cloud regions with multi-tenant row-level isolation in PostgreSQL. Uploaded document contents are encrypted at rest using AES-256 with tenant-specific master key derivation. Xarwiz includes built-in DPDP Act 2023 compliance safeguards: purpose-specific consent logging, audit trails, and a self-service Data Principal Rights portal.',
    },
    {
      q: 'Can we connect Xarwiz to our existing enterprise software?',
      a: 'Yes. Xarwiz provides native connectors for Google Drive, GitHub, Notion, Slack, and Figma. In addition, our REST API and webhook system allow you to trigger workflows and stream agent responses from any application using HMAC-SHA256 signature verification.',
    },
    {
      q: 'How is quota and usage measured across team members?',
      a: 'Xarwiz tracks usage transparently in AI Messages and document storage. Every plan includes clear message limits with automatic safety fallbacks so customer operations are never abruptly severed. Annual billing includes a 20% commitment discount with full GST invoice compliance.',
    },
    {
      q: 'Can Xarwiz be deployed in a private VPC or on-premise?',
      a: 'Yes. For BFSI, healthcare, and enterprise organizations requiring air-gapped or dedicated VPC hosting, our Enterprise tier supports dedicated sovereign Kubernetes deployments with custom network peering.',
    },
  ];

  return (
    <div className="platform-page">
      <SEOHead
        title="Unified AI Agent & Workflow Platform - Xarwiz"
        description="Build autonomous AI agents, orchestrate visual DAG workflows, and index enterprise knowledge bases on India's sovereign AI operating system."
        canonicalPath="/platform"
        jsonLd={[
          defaultOrganizationSchema,
          defaultSoftwareApplicationSchema,
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Xarwiz AI Platform Overview',
            url: 'https://xarwiz.com/platform',
            description:
              'Comprehensive overview of Xarwiz autonomous AI agents, visual workflow engine, hybrid RAG, and sovereign cloud infrastructure.',
          },
        ]}
      />

      <HeaderNav activePath="/platform" />

      <main className="platform-main">
        {/* HERO SECTION */}
        <section className="platform-hero">
          <div className="container">
            <div className="hero-content">
              <div className="hero-badge">
                <Sparkles size={14} />
                <span>India&apos;s Sovereign AI Business Operating System</span>
              </div>
              <h1 className="hero-title">
                The Unified Platform for <span className="blue-gradient">Autonomous AI Agents</span> &amp; Workflows
              </h1>
              <p className="hero-subtitle">
                Stop stitching together isolated chatbots, vector databases, and brittle integration scripts.
                Xarwiz provides a unified runtime for goal-oriented agents, visual DAG workflow automation,
                and hybrid knowledge retrieval—grounded in Indian sovereign infrastructure.
              </p>
              <div className="hero-actions">
                <Link href="/signup" className="btn-primary">
                  <span>Request Access</span>
                  <ArrowRight size={16} />
                </Link>
                <Link href="/signup?source=book_demo" className="btn-secondary">
                  Book a Demo
                </Link>
                <Link href="/developers" className="btn-tertiary">
                  <Terminal size={15} />
                  <span>API Docs</span>
                </Link>
              </div>
              <div className="hero-trust-row">
                <div className="trust-pill">
                  <CheckCircle2 size={14} color="#10B981" />
                  <span>PostgreSQL + pgvector Hybrid Search</span>
                </div>
                <div className="trust-pill">
                  <CheckCircle2 size={14} color="#10B981" />
                  <span>Visual DAG Workflow Engine</span>
                </div>
                <div className="trust-pill">
                  <CheckCircle2 size={14} color="#10B981" />
                  <span>DPDP Act 2023 Statutory Safeguards</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4-LAYER PLATFORM ARCHITECTURE */}
        <section className="architecture-section">
          <div className="container">
            <div className="section-header">
              <span className="section-badge">Platform Architecture</span>
              <h2 className="section-title">Built as a Cohesive Operating System, Not Fragmented Tools</h2>
              <p className="section-subtitle">
                Every layer of the Xarwiz stack coordinates natively, sharing tenant context, authentication scopes,
                and execution telemetry.
              </p>
            </div>

            <div className="layers-grid">
              <div className="layer-card">
                <div className="layer-number">01</div>
                <div className="layer-icon-box">
                  <Bot size={24} color="#2563EB" />
                </div>
                <h3 className="layer-title">Autonomous Agent Runtime</h3>
                <p className="layer-desc">
                  Goal-oriented AI agents capable of multi-step planning, tool selection, and execution within secure
                  tenant sandboxes. Supports sub-agent delegation and persistent memory.
                </p>
                <Link href="/platform/ai-agents" className="layer-link">
                  <span>Explore AI Agents</span>
                  <ArrowRight size={14} />
                </Link>
              </div>

              <div className="layer-card">
                <div className="layer-number">02</div>
                <div className="layer-icon-box">
                  <Workflow size={24} color="#2563EB" />
                </div>
                <h3 className="layer-title">DAG Workflow Orchestrator</h3>
                <p className="layer-desc">
                  Visual node-graph automation with conditional branching, webhook and cron triggers,
                  sandboxed expression evaluation, and automated step-level retry boundaries.
                </p>
                <Link href="/platform/workflows" className="layer-link">
                  <span>Explore Workflows</span>
                  <ArrowRight size={14} />
                </Link>
              </div>

              <div className="layer-card">
                <div className="layer-number">03</div>
                <div className="layer-icon-box">
                  <Database size={24} color="#2563EB" />
                </div>
                <h3 className="layer-title">Hybrid Document Intelligence</h3>
                <p className="layer-desc">
                  Two-stage retrieval pairing dense vector embeddings (pgvector) with sparse lexical BM25 search.
                  Parallel chunking, URL crawling, and AES-256 document encryption.
                </p>
                <Link href="/platform/knowledge-bases" className="layer-link">
                  <span>Explore Knowledge Bases</span>
                  <ArrowRight size={14} />
                </Link>
              </div>

              <div className="layer-card">
                <div className="layer-number">04</div>
                <div className="layer-icon-box">
                  <Cpu size={24} color="#2563EB" />
                </div>
                <h3 className="layer-title">Sovereign Model Gateway</h3>
                <p className="layer-desc">
                  High-throughput Ollama runtime powering Qwen 2.5 Coder, Qwen 3 series, and Llama models.
                  Seamless fallback to frontier APIs with per-tenant quota attribution.
                </p>
                <div className="layer-tag">Ollama • Qwen • Llama • GPT-4o</div>
              </div>
            </div>
          </div>
        </section>

        {/* DEEP DIVE: AI AGENTS */}
        <section className="feature-deepdive-section alt-bg" id="agents">
          <div className="container">
            <div className="feature-split">
              <div className="feature-text-col">
                <div className="feature-tag">Core Capability 01</div>
                <h2 className="feature-title">AI Agents with Real Tools, Sandboxed Execution &amp; Memory</h2>
                <p className="feature-p">
                  Standard LLM chatbots generate text; Xarwiz agents take action. Equipped with our built-in Tool
                  Registry, agents autonomously parse workspaces, read and modify files, invoke webhooks, and trigger
                  database queries within strict tenant containment.
                </p>
                <ul className="feature-bullets">
                  <li>
                    <CheckCircle2 size={18} color="#2563EB" />
                    <div>
                      <strong>Built-in Tool Calling Protocol:</strong> Standardized protocol supporting workspace inspection,
                      file I/O, script execution, and external HTTP actions.
                    </div>
                  </li>
                  <li>
                    <CheckCircle2 size={18} color="#2563EB" />
                    <div>
                      <strong>Multi-Turn Memory:</strong> Conversation states and user preferences persist across sessions,
                      indexed via vector search for immediate contextual recall.
                    </div>
                  </li>
                  <li>
                    <CheckCircle2 size={18} color="#2563EB" />
                    <div>
                      <strong>Tenant Sandbox Isolation:</strong> Tool execution is strictly confined to the tenant directory,
                      preventing path traversal and cross-tenant data leaks.
                    </div>
                  </li>
                </ul>
                <div className="feature-cta-row">
                  <Link href="/platform/ai-agents" className="btn-feature-primary">
                    Deep Dive: AI Agents &rarr;
                  </Link>
                  <Link href="/signup" className="btn-feature-subtle">
                    Try Agent Builder
                  </Link>
                </div>
              </div>

              <div className="feature-visual-col">
                <div className="code-mockup-card">
                  <div className="mockup-header">
                    <span className="dot dot-red"></span>
                    <span className="dot dot-yellow"></span>
                    <span className="dot dot-green"></span>
                    <span className="mockup-title">agent_executor.ts &mdash; Tool Protocol</span>
                  </div>
                  <pre className="mockup-code">
{`// Agent executes multi-step task with tools
<tool_call name="read_file">
  <param name="path">docs/gst_invoices_q3.pdf</param>
  <param name="startLine">1</param>
</tool_call>

// Sandbox verifies tenant boundary
const result = await ToolExecutor.execute(
  tenantId,
  conversationId,
  "read_file",
  { path: "docs/gst_invoices_q3.pdf" }
);

// Response grounded in extracted text:
// "Total GST payable: ₹1,42,800 under HSN 998313."`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* DEEP DIVE: WORKFLOW AUTOMATION */}
        <section className="feature-deepdive-section" id="workflows">
          <div className="container">
            <div className="feature-split reverse">
              <div className="feature-text-col">
                <div className="feature-tag">Core Capability 02</div>
                <h2 className="feature-title">Visual DAG Workflow Automation with Resilient Triggers</h2>
                <p className="feature-p">
                  Build multi-step, stateful business processes without brittle glue code. Xarwiz compiles your visual
                  directed acyclic graph (DAG) into an optimized execution pipeline with variable interpolation,
                  conditional branching, and step retries.
                </p>
                <ul className="feature-bullets">
                  <li>
                    <CheckCircle2 size={18} color="#2563EB" />
                    <div>
                      <strong>Flexible Trigger Architecture:</strong> Trigger runs via incoming Webhook (with HMAC-SHA256
                      payload verification), Cron schedules, or direct API requests.
                    </div>
                  </li>
                  <li>
                    <CheckCircle2 size={18} color="#2563EB" />
                    <div>
                      <strong>Sandboxed Expression Engine:</strong> Reference outputs from preceding steps using safe
                      expressions like <code>&#123;&#123;steps[0].output.customerEmail&#125;&#125;</code>.
                    </div>
                  </li>
                  <li>
                    <CheckCircle2 size={18} color="#2563EB" />
                    <div>
                      <strong>Fault-Tolerant Execution:</strong> Configurable step retry backoffs, timeout enforcement,
                      and end-to-end execution audit logs in PostgreSQL.
                    </div>
                  </li>
                </ul>
                <div className="feature-cta-row">
                  <Link href="/platform/workflows" className="btn-feature-primary">
                    Deep Dive: Workflows &rarr;
                  </Link>
                  <Link href="/signup?source=book_demo" className="btn-feature-subtle">
                    Request Live Demo
                  </Link>
                </div>
              </div>

              <div className="feature-visual-col">
                <div className="dag-diagram-card">
                  <div className="dag-node-box start">
                    <span className="node-type">TRIGGER</span>
                    <span className="node-label">Webhook (Invoice Received)</span>
                  </div>
                  <div className="dag-connector-line"></div>
                  <div className="dag-node-box process">
                    <span className="node-type">RAG STEP</span>
                    <span className="node-label">Extract Items &amp; GST HSN</span>
                  </div>
                  <div className="dag-connector-line"></div>
                  <div className="dag-split-row">
                    <div className="dag-node-box branch">
                      <span className="node-type">IF &gt; ₹50,000</span>
                      <span className="node-label">Slack Approval Gate</span>
                    </div>
                    <div className="dag-node-box branch">
                      <span className="node-type">ELSE</span>
                      <span className="node-label">Auto-Reconcile In DB</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* DEEP DIVE: KNOWLEDGE BASES & RAG */}
        <section className="feature-deepdive-section alt-bg" id="knowledge-bases">
          <div className="container">
            <div className="feature-split">
              <div className="feature-text-col">
                <div className="feature-tag">Core Capability 03</div>
                <h2 className="feature-title">Hybrid RAG: pgvector Cosine Similarity + BM25 Keyword Search</h2>
                <p className="feature-p">
                  Naive vector-only search fails on exact identifiers, statutory codes, and invoice numbers. Xarwiz
                  combines dense vector embeddings with sparse BM25 full-text indexing, backed by Redis sub-millisecond
                  query caching.
                </p>
                <ul className="feature-bullets">
                  <li>
                    <CheckCircle2 size={18} color="#2563EB" />
                    <div>
                      <strong>Multi-Format Document Parsing:</strong> Ingest PDFs, Word documents, text files, and public
                      URLs with parallelized batch chunking (concurrency limited to protect CPU/memory).
                    </div>
                  </li>
                  <li>
                    <CheckCircle2 size={18} color="#2563EB" />
                    <div>
                      <strong>AES-256 Content Encryption:</strong> Extracted document text is encrypted at rest using
                      AES-256-GCM before writing to the database, ensuring zero unencrypted text exposure.
                    </div>
                  </li>
                  <li>
                    <CheckCircle2 size={18} color="#2563EB" />
                    <div>
                      <strong>Verifiable Grounded Citations:</strong> Agent answers cite exact chunk metadata and source
                      file references, eliminating hallucinations in high-stakes environments.
                    </div>
                  </li>
                </ul>
                <div className="feature-cta-row">
                  <Link href="/platform/knowledge-bases" className="btn-feature-primary">
                    Deep Dive: Knowledge Bases &rarr;
                  </Link>
                  <Link href="/signup" className="btn-feature-subtle">
                    Index Your First Document
                  </Link>
                </div>
              </div>

              <div className="feature-visual-col">
                <div className="rag-stat-card">
                  <div className="rag-stat-header">
                    <Database size={20} color="#2563EB" />
                    <span>Two-Stage Hybrid Retrieval Pipeline</span>
                  </div>
                  <div className="rag-stage-list">
                    <div className="rag-stage-item">
                      <div className="stage-num">1</div>
                      <div className="stage-content">
                        <strong>Dense Semantic Embedding</strong>
                        <p>1536-dimensional pgvector cosine distance search for semantic intent and contextual similarity.</p>
                      </div>
                    </div>
                    <div className="rag-stage-item">
                      <div className="stage-num">2</div>
                      <div className="stage-content">
                        <strong>Sparse BM25 Keyword Match</strong>
                        <p>PostgreSQL tsvector indexing for exact alphanumeric codes, HSN numbers, and invoice identifiers.</p>
                      </div>
                    </div>
                    <div className="rag-stage-item">
                      <div className="stage-num">3</div>
                      <div className="stage-content">
                        <strong>Redis Cache Layer</strong>
                        <p>SHA-256 query hash caching ensures zero redundant embedding calls for frequent queries.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* VERIFIED INTEGRATIONS SECTION */}
        <section className="integrations-section">
          <div className="container">
            <div className="section-header">
              <span className="section-badge">Verified Integrations</span>
              <h2 className="section-title">Connect to Your Existing Production Tools</h2>
              <p className="section-subtitle">
                Xarwiz includes tested OAuth and token connectors for essential productivity, codebase, and team tools.
              </p>
            </div>

            <div className="integrations-grid">
              <div className="integration-card">
                <div className="integration-icon-wrap">
                  <Globe size={28} color="#2563EB" />
                </div>
                <h4 className="integration-name">Google Drive</h4>
                <p className="integration-desc">
                  OAuth token exchange, automated file listing, and background sync into encrypted vector storage.
                </p>
                <span className="integration-status verified">&bull; Native Sync Active</span>
              </div>

              <div className="integration-card">
                <div className="integration-icon-wrap">
                  <Terminal size={28} color="#2563EB" />
                </div>
                <h4 className="integration-name">GitHub</h4>
                <p className="integration-desc">
                  Repository token verification, file tree indexing, and code intelligence for agentic software workflows.
                </p>
                <span className="integration-status verified">&bull; Native Sync Active</span>
              </div>

              <div className="integration-card">
                <div className="integration-icon-wrap">
                  <FileText size={28} color="#2563EB" />
                </div>
                <h4 className="integration-name">Notion</h4>
                <p className="integration-desc">
                  Workspace page search and hierarchical content sync into your dedicated RAG knowledge base.
                </p>
                <span className="integration-status verified">&bull; Native Sync Active</span>
              </div>

              <div className="integration-card">
                <div className="integration-icon-wrap">
                  <Boxes size={28} color="#2563EB" />
                </div>
                <h4 className="integration-name">Slack</h4>
                <p className="integration-desc">
                  Channel discussion indexing and bidirectional webhook dispatch for human-in-the-loop approvals.
                </p>
                <span className="integration-status verified">&bull; Native Sync Active</span>
              </div>

              <div className="integration-card">
                <div className="integration-icon-wrap">
                  <Layers size={28} color="#2563EB" />
                </div>
                <h4 className="integration-name">Figma</h4>
                <p className="integration-desc">
                  Component inspection, design token extraction, and asset indexing for frontend generation agents.
                </p>
                <span className="integration-status verified">&bull; Native Sync Active</span>
              </div>

              <div className="integration-card">
                <div className="integration-icon-wrap">
                  <Share2 size={28} color="#2563EB" />
                </div>
                <h4 className="integration-name">Webhooks &amp; REST</h4>
                <p className="integration-desc">
                  Universal HTTP endpoints with HMAC-SHA256 signature verification for any custom backend or CRM.
                </p>
                <span className="integration-status verified">&bull; Native Sync Active</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECURITY & SOVEREIGNTY BANNER */}
        <section className="security-banner-section">
          <div className="container">
            <div className="security-card-box">
              <div className="security-left">
                <ShieldCheck size={36} color="#2563EB" />
                <div>
                  <h3 className="security-box-title">Indian Sovereign Cloud &amp; DPDP Compliance Guardrails</h3>
                  <p className="security-box-p">
                    Xarwiz is built strictly on Indian data residency principles. We provide technical safeguards
                    under the Indian DPDP Act 2023: tenant-isolated databases, purpose-specific consent logging,
                    AES-256 document encryption at rest, and an operational Data Principal Rights request portal.
                  </p>
                </div>
              </div>
              <div className="security-right">
                <Link href="/security" className="btn-security-white">
                  Security &amp; Trust Center &rarr;
                </Link>
                <Link href="/data-rights" className="btn-security-ghost">
                  Data Principal Rights Portal
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FREQUENTLY ASKED QUESTIONS */}
        <section className="platform-faq-section">
          <div className="container">
            <div className="section-header">
              <span className="section-badge">Platform FAQ</span>
              <h2 className="section-title">Frequently Asked Questions</h2>
              <p className="section-subtitle">
                Clear, verified technical details about the Xarwiz architecture, models, and capabilities.
              </p>
            </div>

            <div className="faq-accordion-wrapper">
              {FAQS.map((faq, idx) => {
                const isOpen = activeFaq === idx;
                return (
                  <div key={idx} className={`faq-item-card ${isOpen ? 'open' : ''}`}>
                    <button
                      type="button"
                      className="faq-question-btn"
                      onClick={() => toggleFaq(idx)}
                      aria-expanded={isOpen}
                    >
                      <span className="faq-q-text">{faq.q}</span>
                      <ChevronDown size={18} className={`faq-chevron ${isOpen ? 'rotated' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="faq-answer-box">
                        <p className="faq-answer-text">{faq.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <FooterSection />

      {/* Scoped CSS Styles */}
      <style jsx>{`
        .platform-page {
          background-color: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          min-height: 100vh;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
        }

        /* Hero */
        .platform-hero {
          padding: 80px 0 60px;
          background: radial-gradient(circle at 50% 0%, rgba(37, 99, 235, 0.08) 0%, rgba(255, 255, 255, 0) 70%);
          text-align: center;
        }

        .hero-content {
          max-width: 840px;
          margin: 0 auto;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          background: rgba(37, 99, 235, 0.08);
          border: 1px solid rgba(37, 99, 235, 0.2);
          border-radius: 9999px;
          color: #2563eb;
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 24px;
        }

        .hero-title {
          font-size: clamp(2.2rem, 5vw, 3.4rem);
          font-weight: 800;
          line-height: 1.15;
          letter-spacing: -0.03em;
          color: #0f172a;
          margin: 0 0 20px;
        }

        .blue-gradient {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-subtitle {
          font-size: 1.12rem;
          line-height: 1.65;
          color: #475569;
          margin: 0 0 36px;
        }

        .hero-actions {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          flex-wrap: wrap;
          margin-bottom: 36px;
        }

        .btn-primary {
          background: #2563eb;
          color: #ffffff;
          padding: 13px 26px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.95rem;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
          transition: all 0.2s ease;
        }

        .btn-primary:hover {
          background: #1d4ed8;
          transform: translateY(-1px);
        }

        .btn-secondary {
          background: #ffffff;
          color: #0f172a;
          border: 1px solid #cbd5e1;
          padding: 13px 26px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.95rem;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .btn-secondary:hover {
          background: #f8fafc;
          border-color: #94a3b8;
        }

        .btn-tertiary {
          background: #f1f5f9;
          color: #334155;
          padding: 13px 22px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.95rem;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          transition: all 0.2s ease;
        }

        .btn-tertiary:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        .hero-trust-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          flex-wrap: wrap;
        }

        .trust-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 0.82rem;
          color: #475569;
          font-weight: 500;
        }

        /* Section Headers */
        .section-header {
          text-align: center;
          max-width: 760px;
          margin: 0 auto 50px;
        }

        .section-badge {
          display: inline-block;
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #2563eb;
          margin-bottom: 12px;
        }

        .section-title {
          font-size: clamp(1.8rem, 3.5vw, 2.4rem);
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #0f172a;
          margin: 0 0 16px;
        }

        .section-subtitle {
          font-size: 1.05rem;
          color: #64748b;
          line-height: 1.6;
          margin: 0;
        }

        /* Architecture Layers Grid */
        .architecture-section {
          padding: 80px 0;
        }

        .layers-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }

        .layer-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 28px 24px;
          position: relative;
          display: flex;
          flex-direction: column;
          transition: all 0.2s ease;
        }

        .layer-card:hover {
          border-color: #93c5fd;
          box-shadow: 0 12px 30px -10px rgba(37, 99, 235, 0.12);
          transform: translateY(-2px);
        }

        .layer-number {
          font-size: 0.75rem;
          font-weight: 800;
          color: #94a3b8;
          margin-bottom: 16px;
        }

        .layer-icon-box {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: rgba(37, 99, 235, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }

        .layer-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 12px;
        }

        .layer-desc {
          font-size: 0.9rem;
          color: #64748b;
          line-height: 1.55;
          margin: 0 0 20px;
          flex-grow: 1;
        }

        .layer-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #2563eb;
          font-size: 0.88rem;
          font-weight: 600;
          text-decoration: none;
        }

        .layer-link:hover {
          color: #1d4ed8;
          text-decoration: underline;
        }

        .layer-tag {
          font-size: 0.8rem;
          color: #64748b;
          background: #f1f5f9;
          padding: 6px 10px;
          border-radius: 6px;
          font-weight: 500;
        }

        /* Feature Deep-Dive Sections */
        .feature-deepdive-section {
          padding: 90px 0;
        }

        .feature-deepdive-section.alt-bg {
          background: #f8fafc;
          border-top: 1px solid #f1f5f9;
          border-bottom: 1px solid #f1f5f9;
        }

        .feature-split {
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          gap: 60px;
          align-items: center;
        }

        .feature-split.reverse {
          grid-template-columns: 1fr 1.1fr;
        }

        .feature-split.reverse .feature-text-col {
          order: 2;
        }

        .feature-split.reverse .feature-visual-col {
          order: 1;
        }

        .feature-tag {
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #2563eb;
          letter-spacing: 0.05em;
          margin-bottom: 12px;
        }

        .feature-title {
          font-size: clamp(1.8rem, 3vw, 2.3rem);
          font-weight: 800;
          color: #0f172a;
          line-height: 1.25;
          letter-spacing: -0.02em;
          margin: 0 0 20px;
        }

        .feature-p {
          font-size: 1.02rem;
          color: #475569;
          line-height: 1.65;
          margin: 0 0 28px;
        }

        .feature-bullets {
          list-style: none;
          padding: 0;
          margin: 0 0 32px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .feature-bullets li {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          font-size: 0.95rem;
          color: #334155;
          line-height: 1.5;
        }

        .feature-bullets li strong {
          color: #0f172a;
        }

        .feature-bullets li code {
          background: #e2e8f0;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.85em;
        }

        .feature-cta-row {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .btn-feature-primary {
          background: #2563eb;
          color: #ffffff;
          padding: 11px 22px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.92rem;
          text-decoration: none;
          transition: background 0.2s ease;
        }

        .btn-feature-primary:hover {
          background: #1d4ed8;
        }

        .btn-feature-subtle {
          color: #475569;
          font-size: 0.92rem;
          font-weight: 600;
          text-decoration: none;
        }

        .btn-feature-subtle:hover {
          color: #2563eb;
        }

        /* Code Mockup Card */
        .code-mockup-card {
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 20px 40px -10px rgba(15, 23, 42, 0.25);
        }

        .mockup-header {
          background: #1e293b;
          padding: 10px 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 1px solid #334155;
        }

        .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .dot-red { background: #ef4444; }
        .dot-yellow { background: #f59e0b; }
        .dot-green { background: #10b981; }

        .mockup-title {
          font-size: 0.78rem;
          color: #94a3b8;
          font-family: monospace;
          margin-left: 8px;
        }

        .mockup-code {
          padding: 20px;
          margin: 0;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.85rem;
          color: #e2e8f0;
          line-height: 1.55;
          overflow-x: auto;
          background: transparent;
        }

        /* DAG Diagram Visual */
        .dag-diagram-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 32px 24px;
          box-shadow: 0 16px 36px -8px rgba(15, 23, 42, 0.08);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .dag-node-box {
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 12px 20px;
          width: 80%;
          text-align: center;
          background: #f8fafc;
        }

        .dag-node-box.start {
          border-color: #93c5fd;
          background: #eff6ff;
        }

        .dag-node-box.process {
          border-color: #cbd5e1;
          background: #ffffff;
        }

        .dag-node-box.branch {
          width: 45%;
          padding: 10px 14px;
          background: #f8fafc;
        }

        .node-type {
          display: block;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: #2563eb;
          margin-bottom: 2px;
        }

        .node-label {
          display: block;
          font-size: 0.88rem;
          font-weight: 600;
          color: #0f172a;
        }

        .dag-connector-line {
          width: 2px;
          height: 24px;
          background: #94a3b8;
          margin: 4px 0;
        }

        .dag-split-row {
          display: flex;
          gap: 16px;
          width: 100%;
          justify-content: center;
        }

        /* RAG Stage Card */
        .rag-stat-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 30px;
          box-shadow: 0 16px 36px -8px rgba(15, 23, 42, 0.08);
        }

        .rag-stat-header {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.95rem;
          font-weight: 700;
          color: #0f172a;
          padding-bottom: 18px;
          border-bottom: 1px solid #e2e8f0;
          margin-bottom: 20px;
        }

        .rag-stage-list {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .rag-stage-item {
          display: flex;
          align-items: flex-start;
          gap: 14px;
        }

        .stage-num {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #2563eb;
          color: #ffffff;
          font-size: 0.8rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .stage-content strong {
          display: block;
          font-size: 0.92rem;
          color: #0f172a;
          margin-bottom: 3px;
        }

        .stage-content p {
          font-size: 0.84rem;
          color: #64748b;
          line-height: 1.45;
          margin: 0;
        }

        /* Integrations */
        .integrations-section {
          padding: 80px 0;
        }

        .integrations-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }

        .integration-card {
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 24px;
          background: #ffffff;
          transition: all 0.2s ease;
        }

        .integration-card:hover {
          border-color: #93c5fd;
          box-shadow: 0 10px 25px -8px rgba(37, 99, 235, 0.1);
        }

        .integration-icon-wrap {
          margin-bottom: 16px;
        }

        .integration-name {
          font-size: 1.1rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 8px;
        }

        .integration-desc {
          font-size: 0.88rem;
          color: #64748b;
          line-height: 1.5;
          margin: 0 0 16px;
        }

        .integration-status.verified {
          font-size: 0.78rem;
          font-weight: 600;
          color: #10b981;
        }

        /* Security Banner */
        .security-banner-section {
          padding: 30px 0 70px;
        }

        .security-card-box {
          background: linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%);
          border: 1px solid #bfdbfe;
          border-radius: 16px;
          padding: 36px 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 32px;
        }

        .security-left {
          display: flex;
          align-items: flex-start;
          gap: 20px;
          max-width: 720px;
        }

        .security-box-title {
          font-size: 1.25rem;
          font-weight: 800;
          color: #1e3a8a;
          margin: 0 0 8px;
        }

        .security-box-p {
          font-size: 0.92rem;
          color: #334155;
          line-height: 1.6;
          margin: 0;
        }

        .security-right {
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex-shrink: 0;
        }

        .btn-security-white {
          background: #2563eb;
          color: #ffffff;
          padding: 11px 20px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.9rem;
          text-decoration: none;
          text-align: center;
          transition: background 0.2s;
        }

        .btn-security-white:hover {
          background: #1d4ed8;
        }

        .btn-security-ghost {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #1e293b;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.9rem;
          text-decoration: none;
          text-align: center;
        }

        .btn-security-ghost:hover {
          background: #f8fafc;
        }

        /* FAQ */
        .platform-faq-section {
          padding: 70px 0 100px;
          background: #f8fafc;
          border-top: 1px solid #f1f5f9;
        }

        .faq-accordion-wrapper {
          max-width: 820px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .faq-item-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          transition: border-color 0.2s;
        }

        .faq-item-card.open {
          border-color: #93c5fd;
        }

        .faq-question-btn {
          width: 100%;
          padding: 18px 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: transparent;
          border: none;
          text-align: left;
          cursor: pointer;
        }

        .faq-q-text {
          font-size: 1rem;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.4;
          padding-right: 16px;
        }

        .faq-chevron {
          color: #64748b;
          transition: transform 0.2s ease;
          flex-shrink: 0;
        }

        .faq-chevron.rotated {
          transform: rotate(180deg);
          color: #2563eb;
        }

        .faq-answer-box {
          padding: 0 22px 18px 22px;
          border-top: 1px solid #f1f5f9;
        }

        .faq-answer-text {
          font-size: 0.92rem;
          line-height: 1.6;
          color: #475569;
          margin: 12px 0 0;
        }

        /* Responsive Breakpoints */
        @media (max-width: 1024px) {
          .layers-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .integrations-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .security-card-box {
            flex-direction: column;
            align-items: flex-start;
          }
          .security-right {
            width: 100%;
            flex-direction: row;
          }
        }

        @media (max-width: 768px) {
          .platform-hero {
            padding: 50px 0 40px;
          }
          .layers-grid {
            grid-template-columns: 1fr;
          }
          .feature-split,
          .feature-split.reverse {
            grid-template-columns: 1fr;
            gap: 36px;
          }
          .feature-split.reverse .feature-text-col {
            order: 1;
          }
          .feature-split.reverse .feature-visual-col {
            order: 2;
          }
          .integrations-grid {
            grid-template-columns: 1fr;
          }
          .security-card-box {
            padding: 24px 20px;
          }
          .security-right {
            flex-direction: column;
          }
          .dag-node-box {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
