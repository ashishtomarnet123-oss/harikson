import React, { useState } from 'react';
import { ExternalLink, BookOpen, MessageCircle, Bug, Cpu, Users, Activity, ChevronDown, ChevronRight } from 'lucide-react';

const resources = [
  {
    icon: BookOpen,
    title: 'Documentation',
    description: 'Read our comprehensive guides on how to use Xarwiz AI for your business.',
    label: 'View Docs',
    href: '#',
  },
  {
    icon: MessageCircle,
    title: 'Contact Support',
    description: 'Need help? Reach out to our enterprise support team 24/7.',
    label: 'Email Support',
    href: 'mailto:support@xarwiz.com',
  },
  {
    icon: Bug,
    title: 'Report an Issue',
    description: 'Found a bug? Let our engineering team know so we can fix it quickly.',
    label: 'Report Bug',
    href: '#',
  },
  {
    icon: Cpu,
    title: 'API Reference',
    description: 'Explore the Xarwiz REST API for integrating AI capabilities into your apps.',
    label: 'View API Docs',
    href: '#',
  },
  {
    icon: Users,
    title: 'Community',
    description: 'Join the Xarwiz developer community to share ideas and get help.',
    label: 'Join Community',
    href: '#',
  },
  {
    icon: Activity,
    title: 'Status Page',
    description: 'Check the real-time status of all Xarwiz platform services.',
    label: 'View Status',
    href: '#',
  },
];

const shortcuts = [
  { keys: ['Ctrl', 'K'], description: 'Quick search' },
  { keys: ['Ctrl', 'N'], description: 'New conversation' },
  { keys: ['Esc'], description: 'Close modal / panel' },
  { keys: ['Ctrl', 'Enter'], description: 'Send message' },
  { keys: ['Ctrl', '/'], description: 'Toggle sidebar' },
];

const faqs = [
  {
    question: 'How do I create an AI agent?',
    answer: 'Navigate to AI Agents from the sidebar, then click "Create Agent". Give it a name, select a model, write a system prompt that defines its behavior, and click Create. Your agent will be ready to execute tasks immediately.',
  },
  {
    question: 'What file types can I upload to the Knowledge Base?',
    answer: 'Xarwiz supports PDF, DOCX, TXT, Markdown (.md), HTML, CSV, and JSON files. Uploaded documents are automatically processed and indexed for RAG-powered search across your conversations.',
  },
  {
    question: 'How does RAG search work?',
    answer: 'When you upload documents, Xarwiz chunks the text, generates vector embeddings, and stores them in PgVector. During conversations, relevant document chunks are retrieved based on semantic similarity and injected into the LLM context for grounded, accurate responses.',
  },
  {
    question: 'How do I manage my API keys?',
    answer: 'Open Workspace Settings from the sidebar, then go to the Developer tab. You can generate new API keys, view existing ones, and revoke keys that are no longer needed. API keys use the hk_live_ prefix.',
  },
];

export default function HelpCenter() {
  const [expandedFaq, setExpandedFaq] = useState(null);

  return (
    <>
      <div className="settings-page-header">
        <h1>Help Center</h1>
        <p>Find documentation, tutorials, and support resources.</p>
      </div>

      <div className="settings-section">
        <h2>Resources</h2>
        <div className="settings-help-grid">
          {resources.map((r, i) => {
            const Icon = r.icon;
            return (
              <div key={i} className="settings-help-card">
                <div style={{ color: 'var(--accent)' }}>
                  <Icon size={22} />
                </div>
                <h3>{r.title}</h3>
                <p>{r.description}</p>
                <a
                  href={r.href}
                  className="back-link"
                  style={{ color: 'var(--accent)', marginTop: 'auto' }}
                >
                  {r.label} <ExternalLink size={12} />
                </a>
              </div>
            );
          })}
        </div>
      </div>

      <div className="settings-section">
        <h2>Keyboard Shortcuts</h2>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '8px', marginTop: '12px',
        }}>
          {shortcuts.map((s, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', borderRadius: '8px',
              backgroundColor: 'rgba(31, 41, 55, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}>
              <span style={{ fontSize: '13px', color: '#d1d5db' }}>{s.description}</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {s.keys.map((key, j) => (
                  <kbd key={j} style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                    backgroundColor: 'rgba(255,255,255,0.08)', color: '#9ca3af',
                    border: '1px solid rgba(255,255,255,0.12)', fontFamily: 'inherit',
                  }}>
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <h2>Frequently Asked Questions</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px' }}>
          {faqs.map((faq, i) => {
            const isOpen = expandedFaq === i;
            return (
              <div key={i} style={{
                borderRadius: '8px',
                backgroundColor: 'rgba(31, 41, 55, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                overflow: 'hidden',
              }}>
                <button
                  onClick={() => setExpandedFaq(isOpen ? null : i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    width: '100%', padding: '14px 16px', textAlign: 'left',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#e5e7eb', fontSize: '14px', fontWeight: 500, fontFamily: 'inherit',
                  }}
                >
                  {isOpen ? <ChevronDown size={16} color="#818cf8" /> : <ChevronRight size={16} color="#6b7280" />}
                  {faq.question}
                </button>
                {isOpen && (
                  <div style={{
                    padding: '0 16px 14px 42px',
                    fontSize: '13px', color: '#9ca3af', lineHeight: '1.6',
                  }}>
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
