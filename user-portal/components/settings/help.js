import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  BookOpen,
  MessageCircle,
  Bug,
  Cpu,
  Users,
  Activity,
  ChevronDown,
  ChevronRight,
  Star,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  Send,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { getApiConfig, authenticatedFetch } from './apiHelper';

const shortcuts = [
  { keys: ['Ctrl', 'K'], description: 'Quick search' },
  { keys: ['Ctrl', 'N'], description: 'New conversation' },
  { keys: ['Esc'], description: 'Close modal / panel' },
  { keys: ['Ctrl', 'Enter'], description: 'Send message' },
  { keys: ['Ctrl', '/'], description: 'Toggle sidebar' },
];

const faqs = [
  {
    question: 'How do first-response SLA targets work?',
    answer: 'Plans with an SLA response feature define a target for your first substantive response from our support team (e.g. 72 hours for Starter, 12 hours for Professional, 2 hours for Enterprise). The response deadline is recorded on ticket creation in calendar hours. Automated ticket receipts do not count toward meeting an SLA.',
  },
  {
    question: 'What is the difference between Priority Support and SLA Targets?',
    answer: 'Priority Support governs queue prioritization and triage routing for incoming requests. The SLA target specifies the intended elapsed hours for an initial agent response. Neither constitutes an automated financial penalty or contractual warranty unless governed by a dedicated enterprise agreement.',
  },
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
  const [supportStatus, setSupportStatus] = useState(null);
  const [loadingSupport, setLoadingSupport] = useState(true);
  const [tickets, setTickets] = useState([]);

  // Quick ticket submission state
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketCategory, setTicketCategory] = useState('general');
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [ticketFeedback, setTicketFeedback] = useState(null);

  const fetchSupportData = async () => {
    try {
      const { apiBase, tenantSlug } = getApiConfig();
      const [resStatus, resTickets] = await Promise.all([
        authenticatedFetch(`${apiBase}/api/v1/user/support/status`, {
          credentials: 'include',
          headers: { 'x-tenant-slug': tenantSlug },
        }).catch(() => null),
        authenticatedFetch(`${apiBase}/api/v1/user/support/tickets`, {
          credentials: 'include',
          headers: { 'x-tenant-slug': tenantSlug },
        }).catch(() => null),
      ]);

      if (resStatus && resStatus.ok) {
        const data = await resStatus.json();
        setSupportStatus(data);
      }
      if (resTickets && resTickets.ok) {
        const data = await resTickets.json();
        setTickets(data.tickets || []);
      }
    } catch (err) {
      console.warn('Failed to fetch support data:', err);
    } finally {
      setLoadingSupport(false);
    }
  };

  useEffect(() => {
    fetchSupportData();
  }, []);

  const handleNavigateToBilling = () => {
    window.dispatchEvent(new CustomEvent('settings:navigate', { detail: 'billing' }));
  };

  const handleTicketSubmit = async (e) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) return;

    try {
      setSubmittingTicket(true);
      setTicketFeedback(null);
      const { apiBase, tenantSlug } = getApiConfig();

      const res = await authenticatedFetch(`${apiBase}/api/v1/user/support/ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
        },
        credentials: 'include',
        body: JSON.stringify({
          subject: ticketSubject,
          message: ticketMessage,
          category: ticketCategory,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setTicketFeedback({
          type: 'success',
          message: data.message || 'Support request submitted successfully.',
          ticket: data.ticket,
        });
        setTicketSubject('');
        setTicketMessage('');
        fetchSupportData();
      } else if (res.status === 403 && data.code === 'PLAN_FEATURE_DISABLED') {
        setTicketFeedback({
          type: 'plan_disabled',
          message: data.error || 'Priority support is not enabled on your plan.',
        });
      } else {
        setTicketFeedback({
          type: 'error',
          message: data.error || 'Failed to submit request.',
        });
      }
    } catch (err) {
      setTicketFeedback({
        type: 'error',
        message: 'Network error submitting support request.',
      });
    } finally {
      setSubmittingTicket(false);
    }
  };

  const isPriority = !!supportStatus?.prioritySupport;
  const supportEmail = isPriority ? 'priority-support@xarwiz.com' : 'support@xarwiz.com';
  const slaHours = supportStatus?.slaHours;

  const resources = [
    {
      icon: BookOpen,
      title: 'Documentation',
      description: 'Read our comprehensive guides on how to use Xarwiz AI for your business.',
      label: 'View Docs',
      href: '/security-policy',
    },
    {
      icon: MessageCircle,
      title: isPriority ? 'Priority Support Desk' : 'Contact Support',
      description: isPriority
        ? 'Direct email to our priority triage queue team.'
        : 'Reach out to our customer support team for assistance.',
      label: isPriority ? 'Email Priority Desk' : 'Email Support',
      href: `mailto:${supportEmail}`,
    },
    {
      icon: Bug,
      title: 'Report an Issue',
      description: 'Found a bug? Let our engineering team know so we can fix it quickly.',
      label: 'Report Bug',
      href: 'mailto:bugs@xarwiz.com?subject=Bug%20Report',
    },
    {
      icon: Cpu,
      title: 'API Reference',
      description: 'Explore the Xarwiz REST API for integrating AI capabilities into your apps.',
      label: 'View API Docs',
      href: '/security-policy',
    },
    {
      icon: Users,
      title: 'Community',
      description: 'Join the Xarwiz developer community to share ideas and get help.',
      label: 'Join Community',
      href: 'mailto:community@xarwiz.com?subject=Community%20Access',
    },
    {
      icon: Activity,
      title: 'Status Page',
      description: 'Check the real-time status of all Xarwiz platform services.',
      label: 'View Status',
      href: 'mailto:status@xarwiz.com?subject=Status%20Inquiry',
    },
  ];

  const renderSlaBadge = (status) => {
    switch (status) {
      case 'met':
        return (
          <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            SLA Met
          </span>
        );
      case 'breached':
        return (
          <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
            SLA Breached
          </span>
        );
      case 'within_sla':
        return (
          <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
            Active Deadline
          </span>
        );
      default:
        return (
          <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', backgroundColor: 'rgba(156, 163, 175, 0.15)', color: '#9ca3af' }}>
            Standard
          </span>
        );
    }
  };

  return (
    <>
      <div className="settings-page-header">
        <h1>Help & Support Center</h1>
        <p>Find documentation, tutorials, and support resources for your workspace.</p>
      </div>

      {/* Support Entitlement Tier Banner */}
      <div className="settings-section">
        <h2>Support Entitlement & Service Levels</h2>
        <div
          style={{
            padding: '18px 20px',
            borderRadius: '10px',
            backgroundColor: isPriority ? 'rgba(79, 70, 229, 0.08)' : 'rgba(31, 41, 55, 0.5)',
            border: isPriority ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
            marginTop: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  backgroundColor: isPriority ? 'rgba(99, 102, 241, 0.2)' : 'rgba(156, 163, 175, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isPriority ? '#818cf8' : '#9ca3af',
                }}
              >
                {isPriority ? <Star size={20} /> : <MessageCircle size={20} />}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#f3f4f6' }}>
                    {isPriority ? 'Priority Support' : 'Standard Support'}
                  </h3>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      backgroundColor: isPriority ? 'rgba(16, 185, 129, 0.15)' : 'rgba(156, 163, 175, 0.15)',
                      color: isPriority ? '#34d399' : '#9ca3af',
                    }}
                  >
                    {isPriority ? 'Active' : 'Standard Tier'}
                  </span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#9ca3af', maxWidth: '640px' }}>
                  {isPriority
                    ? 'Your subscription includes Priority Support queue handling. Inquiries submitted by your workspace receive expedited triage from our operations team.'
                    : 'Your workspace is currently on Standard Support. Inquiries are processed via our standard queue. Upgrade to Professional or Enterprise for priority queue handling.'}
                </p>
              </div>
            </div>

            {!isPriority && (
              <button
                type="button"
                onClick={handleNavigateToBilling}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'var(--accent, #6366f1)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
              >
                Upgrade Plan <ArrowRight size={14} />
              </button>
            )}
          </div>

          <div
            style={{
              marginTop: '14px',
              paddingTop: '12px',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              fontSize: '12px',
              color: '#6b7280',
              display: 'flex',
              gap: '20px',
              flexWrap: 'wrap',
            }}
          >
            <span>
              <strong>Designated Channel:</strong>{' '}
              <a href={`mailto:${supportEmail}`} style={{ color: 'var(--accent, #818cf8)', textDecoration: 'none' }}>
                {supportEmail}
              </a>
            </span>
            <span>
              <strong>First-Response SLA Target:</strong>{' '}
              {slaHours ? (
                <span style={{ color: '#e5e7eb', fontWeight: 600 }}>{slaHours} calendar hours</span>
              ) : (
                'Standard community/email support (no contractual SLA target)'
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Support Request Form */}
      <div className="settings-section">
        <h2>Submit Support Request</h2>
        <p style={{ fontSize: '13px', color: '#9ca3af', margin: '4px 0 12px' }}>
          Send a support request directly to our team.{' '}
          {slaHours ? `Your ticket will be assigned a ${slaHours}-hour first-response SLA target.` : 'Your ticket will be handled in our standard queue.'}
        </p>

        {ticketFeedback && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '6px',
              marginBottom: '14px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor:
                ticketFeedback.type === 'success'
                  ? 'rgba(16, 185, 129, 0.12)'
                  : 'rgba(239, 68, 68, 0.12)',
              border:
                ticketFeedback.type === 'success'
                  ? '1px solid rgba(16, 185, 129, 0.3)'
                  : '1px solid rgba(239, 68, 68, 0.3)',
              color: ticketFeedback.type === 'success' ? '#34d399' : '#f87171',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {ticketFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{ticketFeedback.message}</span>
              {ticketFeedback.ticket?.firstResponseDueAt && (
                <span style={{ fontSize: '12px', color: '#d1d5db', marginLeft: '6px' }}>
                  (Target Deadline: {new Date(ticketFeedback.ticket.firstResponseDueAt).toLocaleString()})
                </span>
              )}
            </div>
            {ticketFeedback.type === 'plan_disabled' && (
              <button
                type="button"
                onClick={handleNavigateToBilling}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  textDecoration: 'underline',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '12px',
                }}
              >
                Upgrade Plan
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleTicketSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: '12px' }}>
            <input
              type="text"
              placeholder="Subject (e.g. Issue connecting workflow webhook)"
              value={ticketSubject}
              onChange={(e) => setTicketSubject(e.target.value)}
              required
              style={{
                padding: '10px 14px',
                borderRadius: '6px',
                backgroundColor: 'rgba(17, 24, 39, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#f9fafb',
                fontSize: '13px',
              }}
            />
            <select
              value={ticketCategory}
              onChange={(e) => setTicketCategory(e.target.value)}
              style={{
                padding: '10px 14px',
                borderRadius: '6px',
                backgroundColor: 'rgba(17, 24, 39, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#f9fafb',
                fontSize: '13px',
              }}
            >
              <option value="general">General Support</option>
              <option value="technical">Technical / API</option>
              <option value="billing">Billing Inquiry</option>
              <option value="bug">Bug Report</option>
            </select>
          </div>

          <textarea
            placeholder="Describe your issue or inquiry in detail..."
            value={ticketMessage}
            onChange={(e) => setTicketMessage(e.target.value)}
            rows={4}
            required
            style={{
              padding: '10px 14px',
              borderRadius: '6px',
              backgroundColor: 'rgba(17, 24, 39, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#f9fafb',
              fontSize: '13px',
              resize: 'vertical',
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', alignItems: 'center' }}>
            <button
              type="submit"
              disabled={submittingTicket || !ticketSubject.trim() || !ticketMessage.trim()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'var(--accent, #6366f1)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '9px 16px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: submittingTicket ? 'not-allowed' : 'pointer',
                opacity: submittingTicket || !ticketSubject.trim() || !ticketMessage.trim() ? 0.6 : 1,
              }}
            >
              <Send size={14} />
              {submittingTicket ? 'Submitting...' : isPriority ? 'Submit Priority Request' : 'Submit Support Request'}
            </button>
          </div>
        </form>
      </div>

      {/* Recent Support Requests & SLA History */}
      {tickets.length > 0 && (
        <div className="settings-section">
          <h2>Support Request History & SLA Status</h2>
          <div
            style={{
              overflowX: 'auto',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              marginTop: '12px',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(31, 41, 55, 0.6)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <th style={{ padding: '10px 14px', color: '#9ca3af', fontWeight: 600 }}>Subject</th>
                  <th style={{ padding: '10px 14px', color: '#9ca3af', fontWeight: 600 }}>Submitted</th>
                  <th style={{ padding: '10px 14px', color: '#9ca3af', fontWeight: 600 }}>SLA Target</th>
                  <th style={{ padding: '10px 14px', color: '#9ca3af', fontWeight: 600 }}>Response Deadline</th>
                  <th style={{ padding: '10px 14px', color: '#9ca3af', fontWeight: 600 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '10px 14px', color: '#f3f4f6', fontWeight: 500 }}>
                      {t.subject}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#9ca3af' }}>
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#d1d5db' }}>
                      {t.sla_hours ? `${t.sla_hours} hrs` : 'None'}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#d1d5db' }}>
                      {t.first_response_due_at ? new Date(t.first_response_due_at).toLocaleString() : '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {renderSlaBadge(t.sla_status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '8px',
            marginTop: '12px',
          }}
        >
          {shortcuts.map((s, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(31, 41, 55, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <span style={{ fontSize: '13px', color: '#d1d5db' }}>{s.description}</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {s.keys.map((key, j) => (
                  <kbd
                    key={j}
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      color: '#9ca3af',
                      border: '1px solid rgba(255,255,255,0.12)',
                      fontFamily: 'inherit',
                    }}
                  >
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
              <div
                key={i}
                style={{
                  borderRadius: '8px',
                  backgroundColor: 'rgba(31, 41, 55, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => setExpandedFaq(isOpen ? null : i)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '14px 16px',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#e5e7eb',
                    fontSize: '14px',
                    fontWeight: 500,
                    fontFamily: 'inherit',
                  }}
                >
                  {isOpen ? <ChevronDown size={16} color="#818cf8" /> : <ChevronRight size={16} color="#6b7280" />}
                  {faq.question}
                </button>
                {isOpen && (
                  <div
                    style={{
                      padding: '0 16px 14px 42px',
                      fontSize: '13px',
                      color: '#9ca3af',
                      lineHeight: '1.6',
                    }}
                  >
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
