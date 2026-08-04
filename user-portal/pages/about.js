import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function AboutPage() {
  const [activeSection, setActiveSection] = useState('mission');

  return (
    <div style={{
      backgroundColor: '#f8fafc',
      color: '#1e293b',
      minHeight: '100vh',
      fontFamily: "'Outfit', sans-serif"
    }}>
      <Head>
        <title>About Xarwiz — India's Sovereign AI Cloud Platform</title>
        <meta name="description" content="Learn about Xarwiz Technologies LLP, India's all-in-one AI platform powering autonomous AI agents, workflow automation, agentic coding, and DPDP-compliant RAG knowledge bases." />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      {/* Top Hero Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        color: '#ffffff',
        padding: '80px 20px 100px 20px',
        textAlign: 'center',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          top: '25px',
          left: '20px'
        }}>
          <Link href="/">
            <a style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'rgba(255, 255, 255, 0.85)',
              textDecoration: 'none',
              fontSize: '14.5px',
              fontWeight: '500',
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '6px 14px',
              borderRadius: '20px',
              backdropFilter: 'blur(8px)'
            }}>
              ← Back to Home
            </a>
          </Link>
        </div>

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          borderRadius: '20px',
          background: 'rgba(37,99,235,0.2)',
          border: '1px solid rgba(59,130,246,0.3)',
          color: '#60a5fa',
          fontSize: '0.85rem',
          fontWeight: '700',
          marginBottom: '20px'
        }}>
          ⚡ 🇮🇳 India's AI Platform for Agents &amp; Automation
        </div>

        <h1 style={{
          fontSize: '48px',
          fontWeight: '800',
          margin: '0 0 16px 0',
          letterSpacing: '-0.75px'
        }}>
          About Xarwiz
        </h1>
        <p style={{
          fontSize: '18px',
          color: '#94a3b8',
          maxWidth: '740px',
          margin: '0 auto',
          lineHeight: '1.6',
          fontWeight: '300'
        }}>
          From AI agents and workflow automation to agentic coding, multilingual AI chat, and knowledge management, everything works together in one platform.
        </p>
      </div>

      {/* Content Body Container */}
      <div style={{
        maxWidth: '1080px',
        margin: '-50px auto 80px auto',
        padding: '0 20px',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05)',
          padding: '40px'
        }}>
          
          <div style={{ display: 'flex', gap: '40px' }}>
            
            {/* Sidebar Navigation */}
            <div style={{ width: '250px', flexShrink: 0 }}>
              <div style={{ sticky: 'top', top: '100px' }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '800',
                  textTransform: 'uppercase',
                  color: '#64748b',
                  letterSpacing: '0.05em',
                  marginBottom: '14px'
                }}>
                  About Sections
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[
                    { id: 'mission', label: '1. Mission & Vision' },
                    { id: 'why', label: '2. Why We Built Xarwiz' },
                    { id: 'pillars', label: '3. Platform Pillars' },
                    { id: 'security', label: '4. Sovereign Security & DPDP' },
                    { id: 'corporate', label: '5. Corporate Registry' }
                  ].map(sec => (
                    <a
                      key={sec.id}
                      href={`#${sec.id}`}
                      onClick={() => setActiveSection(sec.id)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: activeSection === sec.id ? '700' : '500',
                        color: activeSection === sec.id ? '#2563eb' : '#475569',
                        backgroundColor: activeSection === sec.id ? '#eff6ff' : 'transparent',
                        textDecoration: 'none',
                        transition: 'all 0.15s'
                      }}
                    >
                      {sec.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Article Content */}
            <div style={{ flex: 1, fontSize: '15px', lineHeight: '1.7', color: '#334155' }}>
              
              {/* Mission */}
              <section id="mission" style={{ marginBottom: '40px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>
                  1. Our Mission &amp; Vision
                </h2>
                <p style={{ marginBottom: '12px' }}>
                  <strong>Xarwiz Technologies LLP</strong> is building India's sovereign, unified AI cloud platform designed to power autonomous AI agents, enterprise workflow automation, agentic coding, and high-performance RAG knowledge bases.
                </p>
                <p style={{ marginBottom: '12px' }}>
                  Our mission is to enable organizations of every scale—from high-growth startups to enterprise groups—to deploy state-of-the-art Artificial Intelligence without compromising on data sovereignty, privacy, or operational control.
                </p>
                <div style={{
                  background: '#eff6ff',
                  borderLeft: '4px solid #2563eb',
                  padding: '16px 20px',
                  borderRadius: '0 12px 12px 0',
                  marginTop: '16px'
                }}>
                  <strong style={{ color: '#1e40af' }}>Core Philosophy:</strong> <em>"AI That Works the Way Your Business Works."</em> We believe AI should adapt seamlessly to existing enterprise pipelines, database schemas, and compliance frameworks—not the other way around.
                </div>
              </section>

              {/* Why Xarwiz */}
              <section id="why" style={{ marginBottom: '40px', borderTop: '1px solid #f1f5f9', paddingTop: '32px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>
                  2. Why We Built Xarwiz
                </h2>
                <p style={{ marginBottom: '12px' }}>
                  Modern organizations face extreme AI fragmentation. Teams are forced to juggle separate vendors for LLM chat interfaces, vector database searching, code assistants, and workflow automation. This creates security gaps, cross-tenant data leaks, and sky-rocketing SaaS costs.
                </p>
                <p style={{ marginBottom: '12px' }}>
                  Xarwiz was engineered from the ground up as an <strong>all-in-one platform</strong> where:
                </p>
                <ul style={{ paddingLeft: '20px', marginBottom: '16px' }}>
                  <li style={{ marginBottom: '6px' }}><strong>AI Agents</strong> execute multi-step business goals autonomously across your database APIs.</li>
                  <li style={{ marginBottom: '6px' }}><strong>Agentic Coding Tools</strong> assist developers with pair programming, code parsing, and automated refactoring.</li>
                  <li style={{ marginBottom: '6px' }}><strong>RAG Knowledge Bases</strong> ingest unstructured enterprise documents under strict Row-Level Security (RLS).</li>
                  <li style={{ marginBottom: '6px' }}><strong>Multilingual AI Chat</strong> supports native Indian regional languages alongside global frontier models.</li>
                </ul>
              </section>

              {/* Pillars */}
              <section id="pillars" style={{ marginBottom: '40px', borderTop: '1px solid #f1f5f9', paddingTop: '32px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>
                  3. The 5 Platform Pillars
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginTop: '16px' }}>
                  
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '20px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>🤖 Autonomous AI Agents</div>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Multi-agent orchestration frameworks capable of reasoning, planning, and performing background tasks automatically.</p>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '20px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>⚡ Workflow Automation</div>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Visual drag-and-drop triggers, webhooks, and REST API integrations connecting your stack seamlessly.</p>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '20px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>💻 Agentic Coding</div>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Real-time code generation, AST syntax analysis, git integration, and automated vulnerability scanning.</p>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '20px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>🧠 RAG Knowledge Bases</div>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Vector database indexing over PDFs, DOCX, and SQL tables with PostgreSQL Row-Level Security (RLS).</p>
                  </div>

                </div>
              </section>

              {/* Security */}
              <section id="security" style={{ marginBottom: '40px', borderTop: '1px solid #f1f5f9', paddingTop: '32px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>
                  4. Sovereign Security &amp; DPDP Compliance
                </h2>
                <p style={{ marginBottom: '12px' }}>
                  Data privacy is embedded in our architectural core. Xarwiz provides full compliance with <strong>India's Digital Personal Data Protection (DPDP) Act 2023</strong> and CERT-In security reporting directives:
                </p>
                <ul style={{ paddingLeft: '20px', marginBottom: '16px' }}>
                  <li style={{ marginBottom: '6px' }}><strong>Data Localization:</strong> Primary database volumes and backup snapshots reside inside tier-4 data centers within India.</li>
                  <li style={{ marginBottom: '6px' }}><strong>Zero AI Training Policy:</strong> Customer workspace files, vector indices, and conversation logs are <strong>NEVER</strong> used to fine-tune public LLMs.</li>
                  <li style={{ marginBottom: '6px' }}><strong>AES-256 &amp; TLS 1.3:</strong> Complete end-to-end encryption in transit and at rest with KMS key management.</li>
                </ul>
              </section>

              {/* Corporate */}
              <section id="corporate" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '32px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>
                  5. Corporate Registry &amp; Office Information
                </h2>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', fontSize: '14.5px', lineHeight: 1.8 }}>
                  <div><strong>Legal Entity:</strong> Xarwiz Technologies LLP</div>
                  <div><strong>Corporate Identification:</strong> LLPIN: AAK-1234</div>
                  <div><strong>Registered Address:</strong> Sector 62, Noida, Uttar Pradesh, India - 201301</div>
                  <div><strong>Support Desk:</strong> <a href="mailto:support@xarwiz.com" style={{ color: '#2563eb', textDecoration: 'none' }}>support@xarwiz.com</a></div>
                  <div><strong>Privacy &amp; Legal:</strong> <a href="mailto:privacy@xarwiz.com" style={{ color: '#2563eb', textDecoration: 'none' }}>privacy@xarwiz.com</a></div>
                  <div><strong>Grievance Officer:</strong> Ashish Pratap Singh Tomar (<a href="mailto:grievance@xarwiz.com" style={{ color: '#2563eb', textDecoration: 'none' }}>grievance@xarwiz.com</a>)</div>
                </div>
              </section>

            </div>
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer style={{
        backgroundColor: '#0f172a',
        color: '#94a3b8',
        padding: '40px 20px',
        borderTop: '1px solid #1e293b',
        fontSize: '13px',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>© 2026 Xarwiz Technologies LLP. All rights reserved.</div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <Link href="/"><a style={{ color: '#94a3b8', textDecoration: 'none' }}>Home</a></Link>
            <Link href="/about"><a style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 'bold' }}>About Xarwiz</a></Link>
            <Link href="/privacy"><a style={{ color: '#94a3b8', textDecoration: 'none' }}>Privacy Policy</a></Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
