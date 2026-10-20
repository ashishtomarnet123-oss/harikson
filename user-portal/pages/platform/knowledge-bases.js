import React, { useState } from 'react';
import Link from 'next/link';
import HeaderNav from '../../components/layout/HeaderNav';
import FooterSection from '../../components/FooterSection';
import SEOHead, {
  defaultOrganizationSchema,
  defaultSoftwareApplicationSchema,
} from '../../components/SEOHead';
import {
  Database,
  ArrowRight,
  Sparkles,
  Search,
  Lock,
  Layers,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Check,
  ChevronDown,
  Globe,
  FileType,
  Cpu,
  Key,
  HardDrive,
  Filter,
} from 'lucide-react';

export default function PlatformKnowledgeBasesPage() {
  const [activeFaq, setActiveFaq] = useState(null);
  const [activeTab, setActiveTab] = useState('hybrid');

  const toggleFaq = (idx) => {
    setActiveFaq(activeFaq === idx ? null : idx);
  };

  const FAQS = [
    {
      q: 'Why does Xarwiz use Hybrid pgvector + BM25 search instead of pure vector search?',
      a: 'Pure vector embeddings excel at semantic similarity (understanding intent and synonyms), but frequently miss exact alphanumerics such as error codes, invoice numbers, SKU IDs, or statutory clause citations. Xarwiz combines pgvector cosine similarity with PostgreSQL BM25 full-text indexing (ts_rank_cd) into a reciprocal-ranked fusion score for unmatched retrieval accuracy.',
    },
    {
      q: 'How is confidential company data protected inside the knowledge base?',
      a: 'Every document content chunk is encrypted at rest using AES-256-GCM with tenant-derived cryptographic keys. Document records are strictly partitioned using multi-tenant PostgreSQL row-level isolation. Your data is never pooled or used to fine-tune shared public foundation models.',
    },
    {
      q: 'What file types and data sources can be indexed?',
      a: 'Xarwiz natively parses PDFs, Word documents (DOCX), Markdown files, plain text, and CSVs. You can also index live public websites using our built-in URL crawler, or synchronize documents directly from Google Drive and Notion.',
    },
    {
      q: 'How does document chunking and indexing work during ingestion?',
      a: 'Ingested documents are split into overlapping semantic chunks (configurable token windows, e.g., 512 tokens with 64-token overlap). Embedding generation is parallelized using concurrency-controlled worker pools (p-limit) to index multi-hundred-page files in seconds.',
    },
    {
      q: 'Does Xarwiz support compliance with the Indian DPDP Act 2023 for indexed documents?',
      a: 'Yes. Xarwiz maintains comprehensive data lineage and access audit trails. Through our statutory Data Principal Rights portal, users can exercise rights of access, correction, and permanent erasure across all vector partitions.',
    },
  ];

  return (
    <div className="rag-page">
      <SEOHead
        title="Enterprise Knowledge Bases & Hybrid RAG - Xarwiz Platform"
        description="Index documents with hybrid pgvector and BM25 search, AES-256 encryption at rest, automatic semantic chunking, and DPDP Act 2023 compliance."
        canonicalPath="/platform/knowledge-bases"
        jsonLd={[
          defaultOrganizationSchema,
          defaultSoftwareApplicationSchema,
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Xarwiz Enterprise Knowledge Bases & Hybrid RAG',
            url: 'https://xarwiz.com/platform/knowledge-bases',
            description:
              'Enterprise document intelligence powered by hybrid pgvector cosine similarity and BM25 full-text retrieval.',
          },
        ]}
      />

      <HeaderNav activePath="/platform" />

      <main className="rag-main">
        {/* HERO SECTION */}
        <section className="rag-hero">
          <div className="container">
            <div className="hero-content">
              <div className="hero-badge">
                <Database size={14} />
                <span>Hybrid Document Intelligence</span>
              </div>
              <h1 className="hero-title">
                Enterprise Knowledge Bases with <span className="blue-gradient">Hybrid pgvector &amp; BM25</span>
              </h1>
              <p className="hero-subtitle">
                Ground your AI agents in verified organizational knowledge. Combines semantic vector similarity with keyword precision to retrieve exact clauses, policies, and product specifications.
              </p>
              <div className="hero-cta-group">
                <Link href="/signup" className="btn-primary">
                  <span>Index Your Knowledge Base</span>
                  <ArrowRight size={16} />
                </Link>
                <Link href="/signup?source=book_demo" className="btn-secondary">
                  <span>Schedule RAG Benchmark Demo</span>
                </Link>
              </div>

              <div className="hero-stats-row">
                <div className="hero-stat">
                  <span className="stat-num">Hybrid</span>
                  <span className="stat-label">pgvector + BM25 Search</span>
                </div>
                <div className="hero-stat-sep" />
                <div className="hero-stat">
                  <span className="stat-num">AES-256</span>
                  <span className="stat-label">GCM Encryption at Rest</span>
                </div>
                <div className="hero-stat-sep" />
                <div className="hero-stat">
                  <span className="stat-num">Sub-40ms</span>
                  <span className="stat-label">Vector Query Retrieval</span>
                </div>
              </div>
            </div>

            {/* INTERACTIVE HYBRID SEARCH INSPECTOR */}
            <div className="rag-inspector-card">
              <div className="inspector-header">
                <div className="rag-meta">
                  <Database size={15} className="meta-icon" />
                  <span>xarwiz-rag-engine :: tenant_db_isolated</span>
                </div>
                <div className="rag-status">
                  <span className="pulse-dot" />
                  <span>INDEX STATUS: HEALTHY</span>
                </div>
              </div>

              <div className="rag-tabs">
                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'hybrid' ? 'active' : ''}`}
                  onClick={() => setActiveTab('hybrid')}
                >
                  <Search size={14} /> Hybrid Fusion Query
                </button>
                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'chunking' ? 'active' : ''}`}
                  onClick={() => setActiveTab('chunking')}
                >
                  <Layers size={14} /> Semantic Chunking &amp; Overlap
                </button>
                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
                  onClick={() => setActiveTab('security')}
                >
                  <Lock size={14} /> AES-256 Partition Isolation
                </button>
              </div>

              <div className="inspector-body">
                {activeTab === 'hybrid' && (
                  <div className="query-demo">
                    <div className="query-bar">
                      <Search size={16} className="q-icon" />
                      <span className="q-text">Query: &quot;Section 4.2 Data Principal consent revocation procedure&quot;</span>
                      <span className="q-pill">Hybrid Mode</span>
                    </div>

                    <div className="fusion-results">
                      <div className="res-item top-match">
                        <div className="res-badge">Rank 1 &bull; Score: 0.962</div>
                        <div className="res-header">
                          <FileText size={14} />
                          <span className="doc-name">DPDP_Compliance_Handbook_2026.pdf (Page 14, Chunk 3)</span>
                        </div>
                        <p className="res-snippet">
                          &quot;Under Section 4.2, a Data Principal may withdraw consent at any time through the designated Data Rights Portal. Upon receipt of valid authentication, the fiduciary must cease processing within 7 business days...&quot;
                        </p>
                        <div className="res-tags">
                          <span className="tag-vec">Vector Similarity: 0.941</span>
                          <span className="tag-kw">BM25 ts_rank_cd: 0.984</span>
                          <span className="tag-match">Exact Clause Match</span>
                        </div>
                      </div>

                      <div className="res-item">
                        <div className="res-badge">Rank 2 &bull; Score: 0.871</div>
                        <div className="res-header">
                          <FileText size={14} />
                          <span className="doc-name">Customer_Terms_of_Service_v3.pdf (Page 6, Chunk 1)</span>
                        </div>
                        <p className="res-snippet">
                          &quot;Procedures for statutory notice delivery and grievance redressal officer contact channels for enterprise tenants...&quot;
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'chunking' && (
                  <div className="chunking-demo">
                    <div className="chunk-stat-box">
                      <div><strong style={{ color: '#fff' }}>Chunk Size:</strong> 512 tokens</div>
                      <div><strong style={{ color: '#fff' }}>Overlap:</strong> 64 tokens (12.5%)</div>
                      <div><strong style={{ color: '#fff' }}>Batch Concurrency:</strong> 4 workers (p-limit)</div>
                    </div>
                    <div className="chunk-preview-grid">
                      <div className="chunk-block">
                        <span className="chunk-id">CHUNK #108 (Tokens 1 - 512)</span>
                        <p>Document header, executive summary, statutory preamble, definitions...</p>
                      </div>
                      <div className="chunk-block overlap-border">
                        <span className="chunk-id">OVERLAP ZONE (Tokens 448 - 512)</span>
                        <p>Preserves boundary context across chunk transitions to avoid split clauses.</p>
                      </div>
                      <div className="chunk-block">
                        <span className="chunk-id">CHUNK #109 (Tokens 449 - 960)</span>
                        <p>Detailed technical obligations, operational measures, storage limits...</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'security' && (
                  <div className="security-demo">
                    <div className="sec-feature-row">
                      <div className="sec-item">
                        <Lock size={18} className="s-ico" />
                        <div>
                          <strong>AES-256-GCM Encryption</strong>
                          <p>Plaintext document chunks are encrypted before insertion into pgvector tables.</p>
                        </div>
                      </div>
                      <div className="sec-item">
                        <HardDrive size={18} className="s-ico" />
                        <div>
                          <strong>Multi-Tenant Row Isolation</strong>
                          <p>Queries enforce WHERE tenant_id = $1 at the database engine level.</p>
                        </div>
                      </div>
                      <div className="sec-item">
                        <ShieldCheck size={18} className="s-ico" />
                        <div>
                          <strong>Zero Public Model Training</strong>
                          <p>Your documents are never used to train public or foundation models.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 4 CORE RAG PILLARS */}
        <section className="pillars-section">
          <div className="container">
            <div className="section-head">
              <span className="section-eyebrow">Retrieval Architecture</span>
              <h2 className="section-title">Built for Factual Accuracy &amp; Verification</h2>
              <p className="section-subtitle">
                Hallucinations happen when LLMs guess. Grounding agents in hybrid RAG ensures every response is backed by source citations.
              </p>
            </div>

            <div className="pillars-grid">
              <div className="pillar-card">
                <div className="pillar-icon-box">
                  <Search size={22} />
                </div>
                <h3>Reciprocal Ranked Fusion</h3>
                <p>
                  Combines dense vector embeddings (capturing conceptual meaning) with sparse BM25 keyword weights (capturing precise terms, product codes, and clauses) into an authoritative relevance ranking.
                </p>
                <ul className="pillar-list">
                  <li><Check size={14} className="c-ico" /> 1536-dimensional vector embeddings</li>
                  <li><Check size={14} className="c-ico" /> PostgreSQL full-text search dictionaries</li>
                  <li><Check size={14} className="c-ico" /> Configurable fusion weight balancing</li>
                </ul>
              </div>

              <div className="pillar-card">
                <div className="pillar-icon-box">
                  <FileType size={22} />
                </div>
                <h3>Multi-Format Ingestion</h3>
                <p>
                  Parse structured and unstructured documents seamlessly. Native support for complex PDF layouts, multi-column tables, docx headers, and markdown file trees.
                </p>
                <ul className="pillar-list">
                  <li><Check size={14} className="c-ico" /> PDF, DOCX, TXT, CSV, MD parsing</li>
                  <li><Check size={14} className="c-ico" /> Live Web URL recursive crawler</li>
                  <li><Check size={14} className="c-ico" /> Automatic OCR for scanned text</li>
                </ul>
              </div>

              <div className="pillar-card">
                <div className="pillar-icon-box">
                  <Lock size={22} />
                </div>
                <h3>AES-256 Partition Isolation</h3>
                <p>
                  Document chunks and embedding vectors are strictly scoped by tenant ID with cryptographic protection at rest. No tenant can ever access another tenant&apos;s indexed knowledge.
                </p>
                <ul className="pillar-list">
                  <li><Check size={14} className="c-ico" /> AES-256-GCM authenticated cipher</li>
                  <li><Check size={14} className="c-ico" /> Tenant-scoped database schema barriers</li>
                  <li><Check size={14} className="c-ico" /> Full statutory audit logs on retrieval</li>
                </ul>
              </div>

              <div className="pillar-card">
                <div className="pillar-icon-box">
                  <FileText size={22} />
                </div>
                <h3>Verifiable Source Citations</h3>
                <p>
                  Agents cite exact document titles, page numbers, and chunk references alongside generated answers, enabling operators to audit sources in a single click.
                </p>
                <ul className="pillar-list">
                  <li><Check size={14} className="c-ico" /> Interactive document previewer</li>
                  <li><Check size={14} className="c-ico" /> Direct page &amp; paragraph deep links</li>
                  <li><Check size={14} className="c-ico" /> Hallucination deterrence guardrails</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* DATA SOURCES & CONNECTORS */}
        <section className="sources-section">
          <div className="container">
            <div className="sources-card">
              <div className="sources-info">
                <span className="section-eyebrow">Continuous Sync</span>
                <h2>Connect Your Existing Knowledge Repositories</h2>
                <p>
                  Stop manually exporting and re-uploading documents. Xarwiz provides verified native sync connectors that automatically index new and modified files.
                </p>
                <div className="sources-badges">
                  <div className="s-badge">Google Drive (OAuth)</div>
                  <div className="s-badge">Notion Workspaces</div>
                  <div className="s-badge">GitHub Repositories</div>
                  <div className="s-badge">Web URL Crawler</div>
                </div>
              </div>

              <div className="sources-visual">
                <div className="source-item">
                  <Globe size={18} className="s-item-icon" />
                  <div className="s-item-text">
                    <strong>Web URL Crawler</strong>
                    <span>Live recursive crawling with sitemap parsing</span>
                  </div>
                  <span className="s-item-status">Active</span>
                </div>

                <div className="source-item">
                  <FileText size={18} className="s-item-icon" />
                  <div className="s-item-text">
                    <strong>Google Drive Connector</strong>
                    <span>Auto-sync docs, sheets, and shared drives</span>
                  </div>
                  <span className="s-item-status">Verified</span>
                </div>

                <div className="source-item">
                  <Database size={18} className="s-item-icon" />
                  <div className="s-item-text">
                    <strong>Notion Database Sync</strong>
                    <span>Sync enterprise wikis and SOP databases</span>
                  </div>
                  <span className="s-item-status">Verified</span>
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
              <h2 className="section-title">Knowledge Bases &amp; RAG FAQs</h2>
              <p className="section-subtitle">
                Technical details on search precision, chunking, and data security.
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

        {/* CTA BANNER */}
        <section className="cta-banner-section">
          <div className="container">
            <div className="cta-box">
              <h2>Ground Your Enterprise AI with Xarwiz RAG</h2>
              <p>
                Eliminate hallucinations and give your agents access to verified institutional knowledge.
              </p>
              <div className="cta-actions">
                <Link href="/signup" className="btn-primary">
                  <span>Request Platform Access</span>
                  <ArrowRight size={16} />
                </Link>
                <Link href="/platform" className="btn-secondary">
                  <span>Platform Overview</span>
                </Link>
                <Link href="/contact" className="btn-tertiary">
                  <span>Talk to RAG Specialist</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <FooterSection />

      <style jsx>{`
        .rag-page {
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
        .rag-hero {
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

        /* INSPECTOR CARD */
        .rag-inspector-card {
          max-width: 980px;
          margin: 0 auto;
          background: #0f172a;
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 16px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          overflow: hidden;
        }

        .inspector-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          background: #090e1a;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .rag-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: monospace;
          font-size: 0.82rem;
          color: #94a3b8;
        }

        .meta-icon {
          color: #60a5fa;
        }

        .rag-status {
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

        .rag-tabs {
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

        .inspector-body {
          padding: 24px;
        }

        .query-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 12px 18px;
          margin-bottom: 20px;
        }

        .q-icon {
          color: #60a5fa;
        }

        .q-text {
          font-size: 0.9rem;
          color: #f1f5f9;
          font-family: monospace;
          flex-grow: 1;
        }

        .q-pill {
          background: rgba(59, 130, 246, 0.2);
          color: #93c5fd;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 6px;
        }

        .fusion-results {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .res-item {
          background: rgba(30, 41, 59, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 18px;
          position: relative;
        }

        .res-item.top-match {
          border-color: rgba(59, 130, 246, 0.4);
          background: rgba(15, 23, 42, 0.9);
        }

        .res-badge {
          position: absolute;
          top: 14px;
          right: 14px;
          font-size: 0.72rem;
          font-weight: 700;
          color: #4ade80;
          background: rgba(34, 197, 94, 0.12);
          padding: 3px 8px;
          border-radius: 4px;
        }

        .res-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.88rem;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 8px;
        }

        .doc-name {
          color: #60a5fa;
        }

        .res-snippet {
          font-size: 0.86rem;
          color: #cbd5e1;
          line-height: 1.6;
          margin-bottom: 12px;
          font-style: italic;
        }

        .res-tags {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .tag-vec, .tag-kw, .tag-match {
          font-size: 0.72rem;
          padding: 3px 8px;
          border-radius: 4px;
          font-family: monospace;
        }

        .tag-vec {
          background: rgba(59, 130, 246, 0.15);
          color: #93c5fd;
        }

        .tag-kw {
          background: rgba(168, 85, 247, 0.15);
          color: #c084fc;
        }

        .tag-match {
          background: rgba(34, 197, 94, 0.15);
          color: #4ade80;
        }

        /* CHUNKING DEMO */
        .chunk-stat-box {
          display: flex;
          gap: 24px;
          background: rgba(15, 23, 42, 0.6);
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 0.84rem;
          color: #94a3b8;
        }

        .chunk-preview-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
        }

        .chunk-block {
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 14px;
        }

        .chunk-block.overlap-border {
          border-color: rgba(234, 179, 8, 0.4);
          background: rgba(234, 179, 8, 0.05);
        }

        .chunk-id {
          display: block;
          font-size: 0.72rem;
          font-weight: 700;
          color: #60a5fa;
          margin-bottom: 6px;
          font-family: monospace;
        }

        .chunk-block p {
          font-size: 0.8rem;
          color: #cbd5e1;
          line-height: 1.5;
        }

        /* SECURITY DEMO */
        .sec-feature-row {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .sec-item {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.06);
          padding: 14px 18px;
          border-radius: 10px;
        }

        .s-ico {
          color: #3b82f6;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .sec-item strong {
          display: block;
          font-size: 0.9rem;
          color: #ffffff;
          margin-bottom: 4px;
        }

        .sec-item p {
          font-size: 0.84rem;
          color: #94a3b8;
          margin: 0;
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

        .pillar-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .pillar-list li {
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

        /* SOURCES SECTION */
        .sources-section {
          padding: 80px 0;
          background: rgba(15, 23, 42, 0.35);
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .sources-card {
          background: #0f172a;
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 20px;
          padding: 40px;
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 40px;
          align-items: center;
        }

        .sources-info h2 {
          font-size: clamp(1.6rem, 2.8vw, 2.2rem);
          font-weight: 800;
          color: #ffffff;
          line-height: 1.25;
          margin-bottom: 16px;
        }

        .sources-info p {
          font-size: 0.95rem;
          color: #94a3b8;
          line-height: 1.6;
          margin-bottom: 24px;
        }

        .sources-badges {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .s-badge {
          background: rgba(59, 130, 246, 0.15);
          color: #93c5fd;
          border: 1px solid rgba(59, 130, 246, 0.3);
          font-size: 0.82rem;
          font-weight: 600;
          padding: 6px 14px;
          border-radius: 8px;
        }

        .sources-visual {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .source-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 14px 18px;
          border-radius: 12px;
        }

        .s-item-icon {
          color: #60a5fa;
          margin-right: 14px;
          flex-shrink: 0;
        }

        .s-item-text {
          display: flex;
          flex-direction: column;
          flex-grow: 1;
        }

        .s-item-text strong {
          font-size: 0.9rem;
          color: #ffffff;
        }

        .s-item-text span {
          font-size: 0.76rem;
          color: #64748b;
        }

        .s-item-status {
          font-size: 0.72rem;
          font-weight: 700;
          color: #34d399;
          background: rgba(16, 185, 129, 0.15);
          padding: 3px 8px;
          border-radius: 4px;
          text-transform: uppercase;
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
          .pillars-grid {
            grid-template-columns: 1fr;
          }
          .sources-card {
            grid-template-columns: 1fr;
            padding: 32px;
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
          .chunk-preview-grid {
            grid-template-columns: 1fr;
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
