import React, { useState } from 'react';
import Link from 'next/link';
import HeaderNav from '../../components/layout/HeaderNav';
import FooterSection from '../../components/FooterSection';
import SEOHead, {
  defaultOrganizationSchema,
  defaultSoftwareApplicationSchema,
} from '../../components/SEOHead';
import {
  Briefcase,
  ArrowRight,
  Sparkles,
  Workflow,
  ShieldCheck,
  FileText,
  CheckCircle2,
  ChevronDown,
  Clock,
  Database,
  Lock,
  Zap,
  TrendingUp,
  AlertTriangle,
  Receipt,
  Users,
  DollarSign,
  Scale,
  Check,
  Sliders,
  ShieldAlert,
  Send,
  Building2,
} from 'lucide-react';

export default function SolutionsOperationsPage() {
  const [activeTab, setActiveTab] = useState('invoice');
  const [activeFaq, setActiveFaq] = useState(0);
  const [docVolume, setDocVolume] = useState(500); // monthly invoices/documents
  const [opsTeamSize, setOpsTeamSize] = useState(4); // back-office team members

  const toggleFaq = (idx) => {
    setActiveFaq(activeFaq === idx ? null : idx);
  };

  const BLUEPRINTS = {
    invoice: {
      id: 'invoice',
      tabLabel: 'Invoice 3-Way Reconciliation',
      title: 'Automated Invoice OCR & 3-Way Ledger Reconciliation',
      tagline: 'Extract line items, validate GSTIN checksums, and match purchase orders in seconds.',
      hoursSaved: '32 hrs / week',
      latency: '< 2.4s per invoice',
      accuracy: '99.8% precision',
      pipeline: [
        {
          step: '01',
          name: 'Drive / Email Ingestion',
          type: 'TRIGGER',
          desc: 'Incoming vendor PDF invoice detected via Google Drive folder or webhook dispatch.',
        },
        {
          step: '02',
          name: 'Hybrid OCR & Line-Item RAG',
          type: 'EXTRACTION',
          desc: 'Extracts vendor GSTIN, invoice date, line items, and totals; verifies against purchase orders.',
        },
        {
          step: '03',
          name: 'High-Value Approval Check',
          type: 'GOVERNANCE',
          desc: 'If line total > ₹50,000, routes signed Slack card to Finance Lead before ledger commitment.',
        },
        {
          step: '04',
          name: 'Ledger & ERP Sync',
          type: 'SETTLEMENT',
          desc: 'Appends verified records to Notion Accounts Payable DB and triggers payment queue.',
        },
      ],
      codeSnippet: `// Xarwiz Workflow: Automated AP Reconciliation
const apPipeline = new WorkflowBuilder("ap-invoice-reconcile")
  .on("drive.file_created", { folderId: "vendor_invoices" })
  .extractDocument({
    engine: "hybrid_rag_ocr",
    fields: ["gstin", "invoice_no", "date", "line_items", "total"],
    validateGSTChecksum: true
  })
  .matchPurchaseOrder({
    source: "postgres_erp",
    tolerancePercent: 0.01 // 1% variance threshold
  })
  .branch({
    condition: (doc) => doc.total > 50000,
    ifTrue: (flow) => flow.gateHumanApproval({
      channel: "slack",
      approvers: ["@finance-lead"],
      timeoutHours: 24
    }),
    ifFalse: (flow) => flow.pass()
  })
  .syncLedger({ destination: "notion_ap_database" });`,
    },
    approval: {
      id: 'approval',
      tabLabel: 'Slack Human Approval Gate',
      title: 'Cryptographic Human-in-the-Loop Sign-off Gate',
      tagline: 'Prevent accidental payout dispatches with 2FA-secured Slack approval cards.',
      hoursSaved: '18 hrs / week',
      latency: '< 90s turnaround',
      accuracy: '100% signed audit',
      pipeline: [
        {
          step: '01',
          name: 'High-Stakes Mutation Event',
          type: 'EVENT',
          desc: 'Workflow reaches high-risk stage (e.g. bulk customer refund or partner payout).',
        },
        {
          step: '02',
          name: 'HMAC-Signed Dispatch',
          type: 'SECURITY',
          desc: 'Workflow enters PAUSED state; generates one-time cryptographic token dispatched to Slack.',
        },
        {
          step: '03',
          name: 'Authorized Manager Sign-off',
          type: 'VERIFICATION',
          desc: 'Finance or Ops Manager approves via one-click Slack card with 2-factor audit tracking.',
        },
        {
          step: '04',
          name: 'Tamper-Proof Execution',
          type: 'RESUME',
          desc: 'Workflow resumes with authorized operator ID recorded permanently in audit logs.',
        },
      ],
      codeSnippet: `// Xarwiz Gate: Cryptographic Human Sign-Off
export const payoutApprovalGate = defineStep({
  id: "manager-payout-gate",
  action: async ({ payoutPayload, auditLogger }) => {
    // Generates tamper-proof HMAC-SHA256 token
    const token = signApprovalToken(payoutPayload.id, {
      expiresIn: "4h",
      role: "FINANCE_DIRECTOR"
    });

    // Halts DAG execution until signed web-hook or Slack button event
    const decision = await awaitApprovalSignal({
      signalId: \`payout-\${payoutPayload.id}\`,
      dispatchTo: {
        slackChannel: "#ops-approvals",
        metadata: {
          vendor: payoutPayload.vendorName,
          amount: \`₹\${payoutPayload.amount}\`,
          reason: payoutPayload.memo
        }
      }
    });

    auditLogger.record({
      actor: decision.authorizedUser,
      decision: decision.status,
      timestamp: new Date().toISOString()
    });

    return decision.status === "APPROVED";
  }
});`,
    },
    dpdp: {
      id: 'dpdp',
      tabLabel: 'DPDP Data Rights Portal',
      title: 'Automated DPDP Act 2023 Data Subject Rights Portal',
      tagline: 'Fulfill statutory citizen data access, correction, and erasure within Indian borders.',
      hoursSaved: '24 hrs / request',
      latency: 'Automated fulfillment',
      accuracy: '100% compliant',
      pipeline: [
        {
          step: '01',
          name: 'Citizen Subject Request',
          type: 'INTAKE',
          desc: 'User submits verified identity request via self-service Data Principal Rights portal.',
        },
        {
          step: '02',
          name: 'Isolated Schema Scan',
          type: 'SCAN',
          desc: 'Scans customer vector embeddings, activity tables, and logs strictly within tenant boundary.',
        },
        {
          step: '03',
          name: 'Certified Erasure / Export',
          type: 'EXECUTION',
          desc: 'Executes programmatic deletion across pgvector + cold storage or compiles signed PDF report.',
        },
        {
          step: '04',
          name: 'Statutory Compliance Record',
          type: 'AUDIT',
          desc: 'Issues cryptographic confirmation certificate to the Data Principal with legal timestamp.',
        },
      ],
      codeSnippet: `// Xarwiz DPDP Compliance Engine: Automated Subject Rights
const dpdpEngine = new DPDPSubjectRightsManager({
  statutoryDeadlineDays: 7,
  cloudJurisdiction: "IN_SOVEREIGN"
});

export async function handleErasureRequest(principalId, tenantId) {
  // 1. Verify consent token & principal identity
  const principal = await dpdpEngine.verifyPrincipal(principalId);

  // 2. Automated purge across multi-tenant vector partitions
  const purgeReport = await dpdpEngine.executeTenantPurge({
    tenantId,
    principalKey: principal.identifier,
    targets: ["pgvector_embeddings", "chat_history", "crm_sync_cache"]
  });

  // 3. Generate non-repudiation audit certificate
  return await dpdpEngine.issueComplianceCertificate({
    requestType: "RIGHT_TO_ERASURE",
    purgedRecordsCount: purgeReport.purgedTotal,
    certifyingOfficer: "DATA_PROTECTION_OFFICER"
  });
}`,
    },
    sync: {
      id: 'sync',
      tabLabel: 'Cross-SaaS Sync',
      title: 'Deterministic Multi-SaaS Operations Synchronization',
      tagline: 'Keep Notion, Google Sheets, Slack, and your internal SQL database in lockstep.',
      hoursSaved: '20 hrs / week',
      latency: '< 500ms sync',
      accuracy: 'Zero dropped events',
      pipeline: [
        {
          step: '01',
          name: 'Webhook Event Capture',
          type: 'INGEST',
          desc: 'Captures updates from Stripe, Razorpay, HubSpot, or custom webhook endpoints.',
        },
        {
          step: '02',
          name: 'Payload Normalization',
          type: 'TRANSFORM',
          desc: 'Normalizes mismatched schemas, currency formats, and tax fields into canonical JSON.',
        },
        {
          step: '03',
          name: 'Transactional Upsert',
          type: 'DATABASE',
          desc: 'Executes safe database upsert with idempotency keys to eliminate duplicate rows.',
        },
        {
          step: '04',
          name: 'Slack Notification Dispatch',
          type: 'ALERT',
          desc: 'Posts formatted summary notification with direct deep-links to operations team.',
        },
      ],
      codeSnippet: `// Xarwiz DAG: Idempotent Cross-System Sync
const syncPipeline = new WorkflowBuilder("crm-billing-sync")
  .on("webhook.received", { endpoint: "/api/webhooks/billing" })
  .deduplicate({
    idempotencyKey: (event) => \`\${event.provider}_\${event.id}\`,
    ttlSeconds: 86400
  })
  .transform((payload) => ({
    customerId: payload.customer.id,
    amountINR: payload.currency === "INR" ? payload.amount : payload.amount * 85,
    status: payload.status === "captured" ? "PAID" : "PENDING",
    syncTimestamp: new Date().toISOString()
  }))
  .fanOut([
    (branch) => branch.upsertPostgres("customer_ledgers"),
    (branch) => branch.syncNotionDatabase("billing_records_db"),
    (branch) => branch.notifySlack({ channel: "#finance-ops" })
  ]);`,
    },
  };

  const currentBp = BLUEPRINTS[activeTab];

  // Dynamic Operations ROI calculations
  const hoursSavedPerMonth = Math.round((docVolume * 0.18) + (opsTeamSize * 16));
  const costSavingsINR = Math.round(hoursSavedPerMonth * 1400); // avg 1400 INR/hr senior ops bandwidth
  const costSavingsUSD = Math.round(costSavingsINR / 85);
  const errorDeflectionRate = Math.min(99.6, 92 + (docVolume / 200));

  const FAQS = [
    {
      q: 'How does Xarwiz automate invoice and receipt processing?',
      a: 'Operations teams connect incoming document folders (via Google Drive, email, or webhook). Xarwiz extracts line items, tax numbers (GSTIN/VAT), and dates using hybrid OCR and RAG parsing, validates the totals against purchase orders, and logs the records directly into your accounting database or Notion without manual typing.',
    },
    {
      q: 'What prevents an automated agent from making unauthorized payments or refunds?',
      a: 'Every high-stakes workflow is protected by a Human-in-the-Loop Approval gate. If an invoice, payout, or refund exceeds a configured threshold, the workflow enters an automated PAUSED state and dispatches a cryptographically signed approval card to designated managers on Slack or email. It resumes only upon multi-factor confirmation.',
    },
    {
      q: 'How does Xarwiz maintain compliance with the Digital Personal Data Protection (DPDP) Act 2023?',
      a: 'Xarwiz logs every data access, transformation, and retrieval event in an immutable PostgreSQL audit trail hosted in sovereign Indian cloud datacenters. Our built-in Data Principal Rights portal allows operations teams to automatically fulfill citizen data access, correction, and erasure requests within statutory timeframes.',
    },
    {
      q: 'Can Xarwiz synchronize data between Google Sheets, Notion, and our internal CRM?',
      a: 'Yes. With native connectors for Google Drive, Notion, Slack, and REST APIs, Xarwiz executes idempotent event-driven sync jobs that keep customer databases and accounting sheets in lockstep with zero duplicate records.',
    },
  ];

  return (
    <div className="operations-page">
      <SEOHead
        title="AI Solutions for Business Operations & Back-Office - Xarwiz"
        description="Streamline enterprise operations, invoice reconciliation, human-in-the-loop approvals, and DPDP Act 2023 statutory compliance with Xarwiz."
        canonicalPath="/solutions/operations"
        jsonLd={[
          defaultOrganizationSchema,
          defaultSoftwareApplicationSchema,
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Xarwiz AI Solutions for Business Operations',
            url: 'https://xarwiz.com/solutions/operations',
            description:
              'Workflow automation and AI document intelligence designed to eliminate repetitive back-office operations and ensure DPDP statutory compliance.',
          },
        ]}
      />

      <HeaderNav activePath="/solutions" />

      <main className="operations-main">
        {/* BREADCRUMB */}
        <div className="breadcrumb-bar">
          <div className="container">
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              <Link href="/">Home</Link>
              <span className="sep">/</span>
              <Link href="/solutions">Solutions</Link>
              <span className="sep">/</span>
              <span className="current">Business Operations</span>
            </nav>
          </div>
        </div>

        {/* HERO SECTION */}
        <section className="ops-hero">
          <div className="container">
            <div className="hero-content">
              <div className="hero-badge">
                <Building2 size={14} />
                <span>Enterprise Operations, Finance &amp; Back-Office</span>
              </div>
              <h1 className="hero-title">
                Automate High-Stakes Operations with{' '}
                <span className="gradient-text">Auditable Human-in-the-Loop Precision</span>
              </h1>
              <p className="hero-subtitle">
                Replace brittle manual spreadsheets, copy-paste invoice reconciliation, and unverified email sign-offs.
                Xarwiz orchestrates deterministic DAG workflows with cryptographic Slack approvals and DPDP Act 2023 sovereign compliance.
              </p>

              <div className="hero-cta-group">
                <Link href="/signup" className="btn-primary">
                  <span>Request Operations Access</span>
                  <ArrowRight size={16} />
                </Link>
                <Link href="/contact" className="btn-secondary">
                  <span>Schedule Operations Demo</span>
                </Link>
              </div>

              <div className="hero-stats-row">
                <div className="hero-stat-card">
                  <div className="stat-num">85%</div>
                  <div className="stat-label">Reduction in Manual Data Entry</div>
                  <div className="stat-sub">Zero manual CSV copy-pasting</div>
                </div>
                <div className="hero-stat-card">
                  <div className="stat-num">100%</div>
                  <div className="stat-label">Immutable PostgreSQL Audit Trail</div>
                  <div className="stat-sub">Tamper-evident logs on every step</div>
                </div>
                <div className="hero-stat-card">
                  <div className="stat-num">&lt; 90s</div>
                  <div className="stat-label">Human Sign-off Turnaround</div>
                  <div className="stat-sub">2FA-secured Slack approvals</div>
                </div>
                <div className="hero-stat-card">
                  <div className="stat-num">DPDP</div>
                  <div className="stat-label">Statutory Compliance Ready</div>
                  <div className="stat-sub">Indian sovereign cloud hosting</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: INTERACTIVE BLUEPRINTS */}
        <section className="ops-blueprint-section">
          <div className="container">
            <div className="section-head">
              <span className="section-eyebrow">Enterprise Blueprints</span>
              <h2 className="section-title">Tested Production Operations Pipelines</h2>
              <p className="section-subtitle">
                Explore real architectural workflows handling millions of rupees in invoices, high-stakes payout approvals, and statutory citizen data compliance.
              </p>
            </div>

            {/* TAB SELECTORS */}
            <div className="bp-tabs-row">
              {Object.values(BLUEPRINTS).map((bp) => (
                <button
                  key={bp.id}
                  type="button"
                  onClick={() => setActiveTab(bp.id)}
                  className={`bp-tab-btn ${activeTab === bp.id ? 'active' : ''}`}
                >
                  {bp.id === 'invoice' && <Receipt size={16} />}
                  {bp.id === 'approval' && <ShieldCheck size={16} />}
                  {bp.id === 'dpdp' && <Scale size={16} />}
                  {bp.id === 'sync' && <Workflow size={16} />}
                  <span>{bp.tabLabel}</span>
                </button>
              ))}
            </div>

            {/* BLUEPRINT DISPLAY CARD */}
            <div className="bp-display-card">
              <div className="bp-display-header">
                <div>
                  <div className="bp-header-badge">
                    <Sparkles size={14} />
                    <span>Auditable Enterprise Architecture</span>
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
                {/* PIPELINE EXECUTION STEPS */}
                <div className="bp-flow-col">
                  <h4 className="col-subhead">ORCHESTRATION PIPELINE</h4>
                  <div className="pipeline-steps">
                    {currentBp.pipeline.map((step, idx) => (
                      <div key={idx} className="pipeline-step-item">
                        <div className="step-num-bubble">{step.step}</div>
                        <div className="step-detail">
                          <div className="step-top">
                            <span className="step-name">{step.name}</span>
                            <span className="step-type-pill">{step.type}</span>
                          </div>
                          <p className="step-desc">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* REAL CODE PREVIEW */}
                <div className="bp-code-col">
                  <div className="code-window">
                    <div className="code-window-top">
                      <div className="code-dots">
                        <span className="dot red" />
                        <span className="dot yellow" />
                        <span className="dot green" />
                      </div>
                      <span className="code-filename">ops-pipeline.ts</span>
                      <span className="code-lang">TYPESCRIPT</span>
                    </div>
                    <pre className="code-pre">
                      <code>{currentBp.codeSnippet}</code>
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: BOTTLENECKS VS XARWIZ SOLUTION */}
        <section className="ops-comparison-section">
          <div className="container">
            <div className="section-head">
              <span className="section-eyebrow">The Operational Shift</span>
              <h2 className="section-title">Manual Friction vs. Deterministic Governance</h2>
              <p className="section-subtitle">
                Compare typical back-office bottlenecks with Xarwiz automated DAG orchestration.
              </p>
            </div>

            <div className="comparison-grid">
              {/* CARD 1 */}
              <div className="comparison-card">
                <div className="comp-card-icon"><Receipt size={22} /></div>
                <h3>Manual AP &amp; Invoice Discrepancies</h3>
                <div className="comp-box bottleneck">
                  <div className="comp-box-label">
                    <AlertTriangle size={14} />
                    <span>THE BOTTLENECK</span>
                  </div>
                  <p>
                    Accounts payable teams transcribe vendor PDFs manually into accounting systems, missing duplicate invoices, incorrect GSTIN rates, and line-item discrepancies.
                  </p>
                </div>
                <div className="comp-box solution">
                  <div className="comp-box-label">
                    <CheckCircle2 size={14} />
                    <span>THE XARWIZ SOLUTION</span>
                  </div>
                  <p>
                    Multi-format PDF extraction with hybrid RAG intelligence, automated GSTIN checksum validation, and instant 3-way matching against existing purchase orders.
                  </p>
                </div>
                <ul className="comp-bullets">
                  <li><Check size={14} /> Automated duplicate invoice detection</li>
                  <li><Check size={14} /> Razorpay &amp; Stripe transaction matching</li>
                  <li><Check size={14} /> Saves 20+ finance analyst hours weekly</li>
                </ul>
              </div>

              {/* CARD 2 */}
              <div className="comparison-card">
                <div className="comp-card-icon"><ShieldAlert size={22} /></div>
                <h3>Unverified High-Risk Dispatches</h3>
                <div className="comp-box bottleneck">
                  <div className="comp-box-label">
                    <AlertTriangle size={14} />
                    <span>THE BOTTLENECK</span>
                  </div>
                  <p>
                    Autonomous scripts or unvetted automations risk issuing unintended refunds or vendor payouts without authorized management sign-off, leaving zero compliance paper trail.
                  </p>
                </div>
                <div className="comp-box solution">
                  <div className="comp-box-label">
                    <CheckCircle2 size={14} />
                    <span>THE XARWIZ SOLUTION</span>
                  </div>
                  <p>
                    Workflows pause before financial mutations. A cryptographically signed approval card is routed to authorized managers in Slack, resuming only upon multi-factor verification.
                  </p>
                </div>
                <ul className="comp-bullets">
                  <li><Check size={14} /> HMAC-SHA256 signed approval tokens</li>
                  <li><Check size={14} /> Configurable timeout &amp; manager escalations</li>
                  <li><Check size={14} /> Tamper-evident operator identity logging</li>
                </ul>
              </div>

              {/* CARD 3 */}
              <div className="comparison-card">
                <div className="comp-card-icon"><Scale size={22} /></div>
                <h3>DPDP Compliance &amp; Citizen Erasure</h3>
                <div className="comp-box bottleneck">
                  <div className="comp-box-label">
                    <AlertTriangle size={14} />
                    <span>THE BOTTLENECK</span>
                  </div>
                  <p>
                    Indian enterprises struggle to fulfill citizen Data Principal requests for data access or erasure across disjointed databases, facing statutory penalties under DPDP Act 2023.
                  </p>
                </div>
                <div className="comp-box solution">
                  <div className="comp-box-label">
                    <CheckCircle2 size={14} />
                    <span>THE XARWIZ SOLUTION</span>
                  </div>
                  <p>
                    Self-service Data Principal portal triggers automated, certified erasure across isolated tenant vector indexes and cold databases with legal confirmation certificates.
                  </p>
                </div>
                <ul className="comp-bullets">
                  <li><Check size={14} /> Purpose-specific consent lifecycle tracking</li>
                  <li><Check size={14} /> Automated multi-index vector purge</li>
                  <li><Check size={14} /> 100% data residency within Indian cloud</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: INTERACTIVE SAVINGS CALCULATOR */}
        <section className="ops-calculator-section">
          <div className="container">
            <div className="calculator-wrapper">
              <div className="calc-left">
                <span className="section-eyebrow">OPERATIONAL ROI</span>
                <h2 className="calc-title">Calculate Your Back-Office Bandwidth Recovery</h2>
                <p className="calc-desc">
                  Estimate how much manual coordination time and processing budget Xarwiz automation recovers for your enterprise operations team.
                </p>

                <div className="slider-group">
                  <div className="slider-label-row">
                    <span className="slider-title">Monthly Documents &amp; Invoices:</span>
                    <span className="slider-value-badge">{docVolume.toLocaleString()} documents</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="5000"
                    step="50"
                    value={docVolume}
                    onChange={(e) => setDocVolume(Number(e.target.value))}
                    className="ops-slider"
                  />
                  <div className="slider-range-hints">
                    <span>100 (Emerging)</span>
                    <span>5,000+ (Scale Enterprise)</span>
                  </div>
                </div>

                <div className="slider-group">
                  <div className="slider-label-row">
                    <span className="slider-title">Back-Office &amp; Finance Team Size:</span>
                    <span className="slider-value-badge">{opsTeamSize} team members</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="1"
                    value={opsTeamSize}
                    onChange={(e) => setOpsTeamSize(Number(e.target.value))}
                    className="ops-slider"
                  />
                  <div className="slider-range-hints">
                    <span>1 specialist</span>
                    <span>30 specialists</span>
                  </div>
                </div>

                <div className="calc-assumptions">
                  <div className="assumption-item">
                    <Check size={14} />
                    <span>Eliminates ~11 minutes of manual transcription per document</span>
                  </div>
                  <div className="assumption-item">
                    <Check size={14} />
                    <span>Recovers ~16 hours of weekly routine status checking per team member</span>
                  </div>
                  <div className="assumption-item">
                    <Check size={14} />
                    <span>Includes automated 3-way matching and ledger exports</span>
                  </div>
                </div>
              </div>

              <div className="calc-right">
                <div className="stat-result-box">
                  <div className="stat-box-title">RECOVERED OPERATIONAL BANDWIDTH</div>
                  <div className="stat-big-num">
                    {hoursSavedPerMonth} <span className="stat-unit">hrs / month</span>
                  </div>
                  <p className="stat-box-sub">
                    Equivalent to +{(hoursSavedPerMonth / 160).toFixed(1)} full-time operations capacity
                  </p>
                </div>

                <div className="stat-result-box highlight">
                  <div className="stat-box-title">ESTIMATED ANNUAL VALUE RECOVERED</div>
                  <div className="stat-big-num">
                    ₹{(costSavingsINR * 12).toLocaleString()}{' '}
                    <span className="stat-unit">/ year</span>
                  </div>
                  <p className="stat-box-sub">
                    ~${((costSavingsUSD * 12)).toLocaleString()} USD in saved administrative overhead
                  </p>
                </div>

                <Link href="/signup" className="btn-calc-cta">
                  <span>Modernize Your Operations</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: ENTERPRISE ARCHITECTURAL ADVANTAGES */}
        <section className="why-ops-section">
          <div className="container">
            <div className="section-head">
              <span className="section-eyebrow">Enterprise Governance</span>
              <h2 className="section-title">Engineered for Regulated &amp; High-Volume Workflows</h2>
              <p className="section-subtitle">
                Why enterprise finance and operations directors choose Xarwiz over fragile no-code zap glue or unstructured LLM wrappers.
              </p>
            </div>

            <div className="why-grid">
              <div className="why-card">
                <div className="why-icon-wrap"><Lock size={20} /></div>
                <h4>Cryptographic Human Approvals</h4>
                <p>
                  Workflows halt before high-stakes payout, refund, or data deletion triggers. One-time HMAC tokens are validated via Slack before resumption.
                </p>
              </div>

              <div className="why-card">
                <div className="why-icon-wrap"><Database size={20} /></div>
                <h4>Immutable PostgreSQL Audit Logs</h4>
                <p>
                  Every input, intermediate vector retrieval, approval decision, and ledger mutation is persisted with ISO-8601 timestamps and operator signatures.
                </p>
              </div>

              <div className="why-card">
                <div className="why-icon-wrap"><ShieldCheck size={20} /></div>
                <h4>Indian Sovereign Cloud (DPDP Act)</h4>
                <p>
                  Zero cross-border customer document transfers. Data is processed and retained exclusively in Indian cloud data centers to guarantee statutory compliance.
                </p>
              </div>

              <div className="why-card">
                <div className="why-icon-wrap"><Workflow size={20} /></div>
                <h4>Multi-SaaS Idempotency Mesh</h4>
                <p>
                  Built-in deduplication keys and exponential backoff retry engines guarantee zero duplicate rows or dropped webhooks during viral surges.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6: FAQS ACCORDION */}
        <section className="ops-faq-section">
          <div className="container">
            <div className="section-head">
              <span className="section-eyebrow">Got Questions?</span>
              <h2 className="section-title">Frequently Asked Questions</h2>
              <p className="section-subtitle">
                Technical details on integrations, human approval gates, and statutory compliance.
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

        {/* SECTION 7: MODERN LIGHT CTA CARD (REPLACES OLD DARK BANNER) */}
        <section className="light-cta-section">
          <div className="container">
            <div className="light-cta-card">
              <div className="light-cta-badge">
                <Sparkles size={14} />
                <span>Ready to Modernize Your Operations?</span>
              </div>
              <h2 className="light-cta-title">Bring Reliable, Auditable Automation to Your Back-Office</h2>
              <p className="light-cta-sub">
                Deploy pre-tested financial reconciliation pipelines and cryptographic human approval gates today with zero downtime.
              </p>

              <div className="light-cta-actions">
                <Link href="/signup" className="btn-cta-primary">
                  <span>Request Operations Access</span>
                  <ArrowRight size={16} />
                </Link>
                <Link href="/contact" className="btn-cta-secondary">
                  <span>Schedule Enterprise Demo</span>
                </Link>
                <Link href="/security" className="btn-cta-tertiary">
                  <span>Explore Trust & Security &rarr;</span>
                </Link>
              </div>

              <div className="light-cta-footer-checks">
                <span>✓ DPDP Act 2023 Ready</span>
                <span>•</span>
                <span>✓ Cryptographic Human-in-the-Loop</span>
                <span>•</span>
                <span>✓ Immutable PostgreSQL Audit Logs</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <FooterSection />

      <style jsx>{`
        .operations-page {
          min-height: 100vh;
          background-color: #ffffff;
          color: #0f172a;
          font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .gradient-text {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #1e40af 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* BREADCRUMB */
        .breadcrumb-bar {
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          padding: 12px 0;
        }

        .breadcrumbs {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
          color: #64748b;
        }

        .breadcrumbs :global(a) {
          color: #64748b;
          text-decoration: none;
          transition: color 0.15s ease;
        }

        .breadcrumbs :global(a:hover) {
          color: #2563eb;
        }

        .breadcrumbs .sep {
          color: #cbd5e1;
        }

        .breadcrumbs .current {
          color: #0f172a;
          font-weight: 600;
        }

        /* HERO */
        .ops-hero {
          padding: 70px 0 60px 0;
          background: radial-gradient(circle at 50% 10%, rgba(37, 99, 235, 0.05) 0%, transparent 60%);
          border-bottom: 1px solid #e2e8f0;
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
          border: 1px solid #bfdbfe;
          color: #1d4ed8;
          font-size: 0.84rem;
          font-weight: 600;
          margin-bottom: 24px;
        }

        .hero-title {
          font-size: clamp(2.3rem, 4.5vw, 3.8rem);
          font-weight: 800;
          line-height: 1.15;
          letter-spacing: -0.03em;
          color: #0f172a;
          margin-bottom: 20px;
        }

        .hero-subtitle {
          font-size: clamp(1.05rem, 1.8vw, 1.2rem);
          line-height: 1.65;
          color: #475569;
          margin-bottom: 36px;
          max-width: 780px;
          margin-left: auto;
          margin-right: auto;
        }

        .hero-cta-group {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 50px;
        }

        .hero-cta-group :global(.btn-primary) {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #2563eb !important;
          color: #ffffff !important;
          padding: 14px 28px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.95rem;
          text-decoration: none !important;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
          transition: all 0.2s ease;
          border: none;
        }

        .hero-cta-group :global(.btn-primary:hover) {
          background: #1d4ed8 !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4);
        }

        .hero-cta-group :global(.btn-secondary) {
          display: inline-flex;
          align-items: center;
          background: #ffffff !important;
          border: 1px solid #cbd5e1 !important;
          color: #1e293b !important;
          padding: 14px 26px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.95rem;
          text-decoration: none !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          transition: all 0.2s ease;
        }

        .hero-cta-group :global(.btn-secondary:hover) {
          background: #f8fafc !important;
          border-color: #94a3b8 !important;
          color: #0f172a !important;
          transform: translateY(-2px);
        }

        .hero-stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          padding-top: 36px;
          border-top: 1px solid #e2e8f0;
        }

        .hero-stat-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 20px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .hero-stat-card:hover {
          transform: translateY(-2px);
          border-color: #cbd5e1;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
        }

        .stat-num {
          font-size: 1.8rem;
          font-weight: 800;
          color: #2563eb;
          line-height: 1.1;
          margin-bottom: 6px;
        }

        .stat-label {
          font-size: 0.82rem;
          font-weight: 700;
          color: #0f172a;
          text-align: center;
          margin-bottom: 4px;
        }

        .stat-sub {
          font-size: 0.74rem;
          color: #64748b;
          text-align: center;
        }

        /* SECTION HEADERS */
        .section-head {
          text-align: center;
          max-width: 760px;
          margin: 0 auto 50px auto;
        }

        .section-eyebrow {
          display: inline-block;
          font-size: 0.78rem;
          font-weight: 700;
          color: #2563eb;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 12px;
        }

        .section-title {
          font-size: clamp(1.9rem, 3.2vw, 2.6rem);
          font-weight: 800;
          color: #0f172a;
          line-height: 1.2;
          margin-bottom: 14px;
          letter-spacing: -0.02em;
        }

        .section-subtitle {
          font-size: 1.02rem;
          color: #475569;
          line-height: 1.6;
        }

        /* BLUEPRINTS SECTION */
        .ops-blueprint-section {
          padding: 80px 0;
          background: #ffffff;
        }

        .bp-tabs-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 36px;
        }

        .bp-tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          color: #475569;
          padding: 10px 20px;
          border-radius: 9999px;
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .bp-tab-btn:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        .bp-tab-btn.active {
          background: #2563eb;
          border-color: #2563eb;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
        }

        .bp-display-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 36px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
        }

        .bp-display-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          padding-bottom: 28px;
          border-bottom: 1px solid #e2e8f0;
          margin-bottom: 28px;
          flex-wrap: wrap;
        }

        .bp-header-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.74rem;
          font-weight: 700;
          color: #2563eb;
          background: #eff6ff;
          padding: 4px 10px;
          border-radius: 6px;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .bp-main-title {
          font-size: 1.45rem;
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
          gap: 10px;
          flex-wrap: wrap;
        }

        .meta-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 600;
          color: #334155;
        }

        .bp-grid-body {
          display: grid;
          grid-template-columns: 1.15fr 1fr;
          gap: 32px;
        }

        .col-subhead {
          font-size: 0.74rem;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 16px;
        }

        .pipeline-steps {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .pipeline-step-item {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 14px 16px;
          transition: border-color 0.15s ease;
        }

        .pipeline-step-item:hover {
          border-color: #cbd5e1;
        }

        .step-num-bubble {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: #eff6ff;
          color: #2563eb;
          font-family: monospace;
          font-weight: 800;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .step-detail {
          flex: 1;
        }

        .step-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
        }

        .step-name {
          font-size: 0.92rem;
          font-weight: 700;
          color: #0f172a;
        }

        .step-type-pill {
          font-size: 0.68rem;
          font-weight: 700;
          color: #64748b;
          background: #f1f5f9;
          padding: 2px 8px;
          border-radius: 4px;
          text-transform: uppercase;
          font-family: monospace;
        }

        .step-desc {
          font-size: 0.82rem;
          color: #475569;
          line-height: 1.5;
          margin: 0;
        }

        /* CODE WINDOW */
        .code-window {
          background: #090e1a;
          border: 1px solid #1e293b;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .code-window-top {
          background: #0f172a;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          border-bottom: 1px solid #1e293b;
        }

        .code-dots {
          display: flex;
          align-items: center;
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

        .code-filename {
          margin-left: 14px;
          font-family: monospace;
          font-size: 0.78rem;
          color: #94a3b8;
          flex: 1;
        }

        .code-lang {
          font-family: monospace;
          font-size: 0.7rem;
          font-weight: 700;
          color: #60a5fa;
        }

        .code-pre {
          margin: 0;
          padding: 16px;
          overflow-x: auto;
          flex: 1;
        }

        .code-pre code {
          font-family: 'JetBrains Mono', Consolas, Monaco, monospace;
          font-size: 0.78rem;
          line-height: 1.6;
          color: #e2e8f0;
          white-space: pre;
        }

        /* COMPARISON SECTION */
        .ops-comparison-section {
          padding: 80px 0;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
        }

        .comparison-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }

        .comparison-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
          transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .comparison-card:hover {
          transform: translateY(-2px);
          border-color: #cbd5e1;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
        }

        .comp-card-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: #eff6ff;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .comparison-card h3 {
          font-size: 1.15rem;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.35;
          margin: 0;
        }

        .comp-box {
          border-radius: 10px;
          padding: 14px;
        }

        .comp-box.bottleneck {
          background: #fef2f2;
          border: 1px solid #fee2e2;
        }

        .comp-box.solution {
          background: #f0fdf4;
          border: 1px solid #dcfce7;
        }

        .comp-box-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          margin-bottom: 6px;
        }

        .comp-box.bottleneck .comp-box-label {
          color: #dc2626;
        }

        .comp-box.solution .comp-box-label {
          color: #16a34a;
        }

        .comp-box p {
          font-size: 0.83rem;
          line-height: 1.5;
          margin: 0;
          color: #334155;
        }

        .comp-bullets {
          list-style: none;
          padding: 12px 0 0 0;
          margin: 0;
          border-top: 1px solid #f1f5f9;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .comp-bullets li {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.82rem;
          color: #475569;
        }

        .comp-bullets li :global(svg) {
          color: #2563eb;
          flex-shrink: 0;
        }

        /* CALCULATOR SECTION */
        .ops-calculator-section {
          padding: 80px 0;
          background: #ffffff;
          border-top: 1px solid #e2e8f0;
        }

        .calculator-wrapper {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 44px;
          display: grid;
          grid-template-columns: 1.25fr 1fr;
          gap: 48px;
          align-items: center;
        }

        .calc-title {
          font-size: clamp(1.6rem, 2.6vw, 2.2rem);
          font-weight: 800;
          color: #0f172a;
          line-height: 1.25;
          margin-bottom: 12px;
        }

        .calc-desc {
          font-size: 0.95rem;
          color: #475569;
          line-height: 1.6;
          margin-bottom: 28px;
        }

        .slider-group {
          margin-bottom: 24px;
        }

        .slider-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        .slider-title {
          font-size: 0.9rem;
          font-weight: 700;
          color: #0f172a;
        }

        .slider-value-badge {
          font-size: 0.82rem;
          font-weight: 700;
          background: #2563eb;
          color: #ffffff;
          padding: 4px 12px;
          border-radius: 9999px;
        }

        .ops-slider {
          width: 100%;
          height: 6px;
          background: #cbd5e1;
          border-radius: 4px;
          outline: none;
          -webkit-appearance: none;
          accent-color: #2563eb;
        }

        .slider-range-hints {
          display: flex;
          justify-content: space-between;
          font-size: 0.74rem;
          color: #64748b;
          margin-top: 6px;
        }

        .calc-assumptions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding-top: 16px;
          border-top: 1px solid #e2e8f0;
        }

        .assumption-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          color: #475569;
        }

        .assumption-item :global(svg) {
          color: #2563eb;
        }

        .calc-right {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .stat-result-box {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 24px;
        }

        .stat-result-box.highlight {
          background: #ecfdf5;
          border-color: #a7f3d0;
        }

        .stat-box-title {
          font-size: 0.72rem;
          font-weight: 800;
          color: #64748b;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .stat-result-box.highlight .stat-box-title {
          color: #065f46;
        }

        .stat-big-num {
          font-size: 2.2rem;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.1;
          margin-bottom: 6px;
        }

        .stat-result-box.highlight .stat-big-num {
          color: #047857;
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

        /* WHY XARWIZ */
        .why-ops-section {
          padding: 80px 0;
          background: #ffffff;
          border-top: 1px solid #e2e8f0;
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
        .ops-faq-section {
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
          cursor: pointer;
          text-align: left;
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

        /* LIGHT CTA SECTION (REPLACES OLD DARK BANNER) */
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
          box-shadow: 0 10px 30px rgba(37, 99, 235, 0.06);
        }

        .light-cta-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #ffffff;
          border: 1px solid #bfdbfe;
          color: #1d4ed8;
          font-size: 0.8rem;
          font-weight: 700;
          padding: 5px 14px;
          border-radius: 9999px;
          margin-bottom: 20px;
        }

        .light-cta-title {
          font-size: clamp(1.9rem, 3.4vw, 2.7rem);
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
          flex-wrap: wrap;
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

        @media (max-width: 768px) {
          .hero-stats-row {
            grid-template-columns: 1fr;
          }
          .hero-cta-group {
            flex-direction: column;
            width: 100%;
          }
          .hero-cta-group :global(.btn-primary),
          .hero-cta-group :global(.btn-secondary) {
            width: 100%;
            justify-content: center;
          }
          .bp-display-card {
            padding: 24px 16px;
          }
          .calculator-wrapper {
            padding: 28px 18px;
          }
          .why-grid {
            grid-template-columns: 1fr;
          }
          .light-cta-card {
            padding: 36px 20px;
          }
          .light-cta-actions {
            flex-direction: column;
            width: 100%;
          }
          .light-cta-actions :global(.btn-cta-primary),
          .light-cta-actions :global(.btn-cta-secondary),
          .light-cta-actions :global(.btn-cta-tertiary) {
            width: 100%;
            justify-content: center;
          }
          .light-cta-footer-checks {
            flex-direction: column;
            gap: 6px;
          }
          .light-cta-footer-checks span:nth-child(2),
          .light-cta-footer-checks span:nth-child(4) {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
