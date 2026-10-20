import React, { useState } from 'react';
import Link from 'next/link';
import HeaderNav from '../components/layout/HeaderNav';
import FooterSection from '../components/FooterSection';
import SEOHead, { defaultOrganizationSchema } from '../components/SEOHead';
import {
  Terminal,
  Code2,
  Copy,
  Check,
  Webhook,
  Boxes,
  Cpu,
  ArrowRight,
  Sparkles,
  Key,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

const CODE_EXAMPLES = {
  curl: `# Authenticate and stream real-time LLM agent completions via REST
curl -X POST https://xarwiz.com/api/v1/chat \\
  -H "Authorization: Bearer hk_live_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "Audit Q3 invoices against statutory Indian DPDP guidelines",
    "model": "harikson-plus",
    "stream": true
  }'
`,
  python: `# Standard Python HTTP integration using requests
import requests
import json

API_KEY = "hk_live_your_api_key_here"
BASE_URL = "https://xarwiz.com/api/v1"

# Trigger a verified DAG workflow execution (returns 202 Accepted with executionId)
response = requests.post(
    f"{BASE_URL}/workflows/invoice-processing-pipeline/execute",
    headers={
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    },
    json={
        "documentUrl": "https://s3.ap-south-1.amazonaws.com/docs/inv_098.pdf",
        "notifySlackChannel": "#finance-ops"
    },
    timeout=30
)

# Workflow executions are queued asynchronously via BullMQ
data = response.json()
print("Workflow Execution ID:", data.get("executionId"))
print("Initial Status:", data.get("status"))  # "queued"
`,
  node: `// Modern Node.js (v18+) native fetch integration
const API_KEY = process.env.XARWIZ_API_KEY || "hk_live_your_api_key_here";

async function executeAgent() {
  const response = await fetch("https://xarwiz.com/api/v1/chat", {
    method: "POST",
    headers: {
      "Authorization": \`Bearer \${API_KEY}\`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: "Summarize Section 8 obligations under DPDP Act 2023",
      model: "harikson-plus",
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error(\`Xarwiz API returned HTTP \${response.status}\`);
  }

  // Response contains assistant response, tokens, and optional citations
  const data = await response.json();
  console.log("Response:", data);
}

executeAgent().catch((err) => console.error("Execution failed:", err.message));
`,
  webhook: `// Inbound Webhook Signature & Replay Verification in Node.js
// Note: HMAC verifies authenticity, but timestamp verification is required to prevent replay attacks.
const crypto = require('crypto');

const MAX_TIMESTAMP_DRIFT_SEC = 300; // 5-minute tolerance against replay attacks

function verifyXarwizWebhook(rawBody, signatureHeader, timestampHeader, signingSecret) {
  if (!signatureHeader || !timestampHeader || !signingSecret) {
    return false;
  }

  // 1. Replay attack prevention: verify timestamp freshness
  const timestamp = parseInt(timestampHeader, 10);
  const now = Math.floor(Date.now() / 1000);
  if (isNaN(timestamp) || Math.abs(now - timestamp) > MAX_TIMESTAMP_DRIFT_SEC) {
    return false; // Stale or replayed webhook request
  }

  // 2. Compute expected HMAC-SHA256 signature across timestamp and raw payload bytes
  const signedPayload = \`\${timestamp}.\${rawBody}\`;
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', signingSecret)
    .update(signedPayload, 'utf8')
    .digest('hex');

  // 3. Constant-time comparison protecting against timing analysis
  const sigBuf = Buffer.from(signatureHeader, 'utf8');
  const expBuf = Buffer.from(expectedSignature, 'utf8');

  if (sigBuf.length !== expBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuf, expBuf);
}
`,
};

export default function DevelopersPage() {
  const [activeTab, setActiveTab] = useState('curl');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(CODE_EXAMPLES[activeTab]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="dev-page">
      <SEOHead
        title="Developer Hub & REST API Reference - Xarwiz AI Cloud Platform"
        description="Build autonomous AI agents, trigger multi-step workflows, and stream LLM completions with verified REST APIs, Webhooks, and code examples for Python and Node.js."
        canonicalPath="/developers"
        jsonLd={[
          defaultOrganizationSchema,
          {
            '@context': 'https://schema.org',
            '@type': 'TechArticle',
            name: 'Xarwiz Developer Platform API & REST Reference',
            url: 'https://xarwiz.com/developers',
            description:
              'Official developer documentation and integration REST endpoints for the Xarwiz sovereign AI business operating system.',
          },
        ]}
      />

      <HeaderNav activePath="/developers" />

      <main className="dev-main">
        {/* Hero */}
        <section className="dev-hero">
          <div className="container">
            <div className="hero-content">
              <span className="hero-badge">
                <Terminal size={14} /> Developer Platform &amp; APIs
              </span>
              <h1 className="hero-title">
                Build sovereign AI agents with <span className="blue-text">simple code</span>
              </h1>
              <p className="hero-subtitle">
                Everything you need to orchestrate autonomous agents, execute complex workflow DAGs,
                and query secure Indian vector stores with minimal latency.
              </p>

              <div className="hero-actions">
                <Link href="/signup" className="btn-dev-primary">
                  Get Free API Key <ArrowRight size={16} />
                </Link>
                <a href="#quickstart" className="btn-dev-secondary">
                  View Quickstart
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Code Quickstart Showcase */}
        <section id="quickstart" className="code-showcase-section">
          <div className="container">
            <div className="code-window-card">
              <div className="code-window-header">
                <div className="window-dots">
                  <span className="dot red" />
                  <span className="dot yellow" />
                  <span className="dot green" />
                </div>

                <div className="code-tabs">
                  <button
                    type="button"
                    className={`code-tab ${activeTab === 'curl' ? 'active' : ''}`}
                    onClick={() => setActiveTab('curl')}
                  >
                    cURL / REST
                  </button>
                  <button
                    type="button"
                    className={`code-tab ${activeTab === 'python' ? 'active' : ''}`}
                    onClick={() => setActiveTab('python')}
                  >
                    Python (Requests)
                  </button>
                  <button
                    type="button"
                    className={`code-tab ${activeTab === 'node' ? 'active' : ''}`}
                    onClick={() => setActiveTab('node')}
                  >
                    Node.js (Fetch)
                  </button>
                  <button
                    type="button"
                    className={`code-tab ${activeTab === 'webhook' ? 'active' : ''}`}
                    onClick={() => setActiveTab('webhook')}
                  >
                    Webhook (HMAC)
                  </button>
                </div>

                <button type="button" className="copy-code-btn" onClick={handleCopy}>
                  {copied ? (
                    <>
                      <Check size={14} color="#22C55E" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div className="code-body-wrapper">
                <pre className="code-content">
                  <code>{CODE_EXAMPLES[activeTab]}</code>
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* Developer Pillars */}
        <section className="pillars-section">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">Engineered for Developers & Systems Builders</h2>
              <p className="section-subtitle">
                Production-ready endpoints with high concurrency, streaming responses, and statutory compliance.
              </p>
            </div>

            <div className="pillars-grid">
              <div className="pillar-card">
                <div className="pillar-icon">
                  <Key size={22} />
                </div>
                <h3 className="pillar-title">Scoped API Keys & RLS</h3>
                <p className="pillar-desc">
                  Issue fine-grained API tokens with row-level security isolation, read/write restrictions, and per-token rate limits.
                </p>
              </div>

              <div className="pillar-card">
                <div className="pillar-icon">
                  <Webhook size={22} />
                </div>
                <h3 className="pillar-title">HMAC Webhooks & Events</h3>
                <p className="pillar-desc">
                  Receive webhook payloads for agent completions, document indexing, and user events with cryptographic SHA-256 signatures.
                </p>
              </div>

              <div className="pillar-card">
                <div className="pillar-icon">
                  <Cpu size={22} />
                </div>
                <h3 className="pillar-title">Low-Latency SSE Streaming</h3>
                <p className="pillar-desc">
                  Stream token completions directly to your client applications using standard Server-Sent Events (SSE) with sub-100ms first token latency.
                </p>
              </div>

              <div className="pillar-card">
                <div className="pillar-icon">
                  <ShieldCheck size={22} />
                </div>
                <h3 className="pillar-title">Indian Cloud Localization</h3>
                <p className="pillar-desc">
                  All API endpoints execute within Indian availability zones, satisfying strict data residency and DPDP Act 2023 statutory mandates.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <FooterSection />

      <style jsx>{`
        .dev-page {
          min-height: 100vh;
          background: #f8fafc;
          display: flex;
          flex-direction: column;
        }

        .dev-main {
          flex: 1;
        }

        .container {
          max-width: 1240px;
          margin: 0 auto;
          padding: 0 24px;
        }

        /* Hero */
        .dev-hero {
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          padding: 60px 0 48px;
          text-align: center;
        }

        .hero-content {
          max-width: 780px;
          margin: 0 auto;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #2563eb;
          font-size: 0.8rem;
          font-weight: 600;
          border-radius: 20px;
          margin-bottom: 16px;
        }

        .hero-title {
          font-size: 2.8rem;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.2;
          margin-bottom: 16px;
          letter-spacing: -0.02em;
        }

        .blue-text {
          color: #2563eb;
        }

        .hero-subtitle {
          font-size: 1.05rem;
          color: #64748b;
          line-height: 1.6;
          margin: 0 0 32px;
        }

        .hero-actions {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }

        .btn-dev-primary {
          background: #2563eb;
          color: #ffffff;
          padding: 12px 24px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.95rem;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
          transition: all 0.2s ease;
        }

        .btn-dev-primary:hover {
          background: #1d4ed8;
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
        }

        .btn-dev-secondary {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #0f172a;
          padding: 12px 24px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.95rem;
          text-decoration: none;
          transition: background 0.2s ease;
        }

        .btn-dev-secondary:hover {
          background: #f8fafc;
        }

        /* Code Window */
        .code-showcase-section {
          padding: 50px 0 70px;
        }

        .code-window-card {
          background: #0f172a;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 40px -10px rgba(15, 23, 42, 0.25);
          border: 1px solid #1e293b;
        }

        .code-window-header {
          background: #1e293b;
          padding: 12px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #334155;
        }

        .window-dots {
          display: flex;
          gap: 8px;
        }

        .dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .dot.red {
          background: #ef4444;
        }
        .dot.yellow {
          background: #f59e0b;
        }
        .dot.green {
          background: #10b981;
        }

        .code-tabs {
          display: flex;
          gap: 8px;
        }

        .code-tab {
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 0.85rem;
          font-weight: 600;
          padding: 6px 14px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .code-tab:hover {
          color: #ffffff;
        }

        .code-tab.active {
          background: #334155;
          color: #ffffff;
        }

        .copy-code-btn {
          background: #334155;
          border: 1px solid #475569;
          color: #e2e8f0;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .copy-code-btn:hover {
          background: #475569;
        }

        .code-body-wrapper {
          padding: 24px;
          overflow-x: auto;
        }

        .code-content {
          margin: 0;
          font-family: 'Fira Code', 'JetBrains Mono', Menlo, monospace;
          font-size: 0.88rem;
          color: #e2e8f0;
          line-height: 1.6;
        }

        /* Pillars Section */
        .pillars-section {
          padding: 60px 0 80px;
          background: #ffffff;
          border-top: 1px solid #e2e8f0;
        }

        .section-header {
          text-align: center;
          max-width: 680px;
          margin: 0 auto 44px;
        }

        .section-title {
          font-size: 1.85rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 10px;
        }

        .section-subtitle {
          font-size: 0.95rem;
          color: #64748b;
          margin: 0;
          line-height: 1.5;
        }

        .pillars-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }

        .pillar-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 24px 20px;
        }

        .pillar-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: #eff6ff;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }

        .pillar-title {
          font-size: 1rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 8px;
        }

        .pillar-desc {
          margin: 0;
          font-size: 0.84rem;
          color: #64748b;
          line-height: 1.5;
        }

        @media (max-width: 900px) {
          .pillars-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .hero-title {
            font-size: 2.2rem;
          }
        }

        @media (max-width: 600px) {
          .pillars-grid {
            grid-template-columns: 1fr;
          }
          .code-tabs {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
