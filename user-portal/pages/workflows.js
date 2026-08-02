import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { withAuth } from '../components/withAuth';

function WorkflowsPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Editor / Modal State
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState('manual');
  const [status, setStatus] = useState('active');
  const [steps, setSteps] = useState([]);
  const [saving, setSaving] = useState(false);

  // Template Library Modal State
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Execution History State
  const [selectedWorkflowForHistory, setSelectedWorkflowForHistory] = useState(null);
  const [executions, setExecutions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [apiBase, setApiBase] = useState('');
  const [tenantSlug, setTenantSlug] = useState('system');

  // Pre-loaded AI Workflow Presets
  const PRESET_TEMPLATES = [
    {
      id: 'template_support_router',
      name: 'AI Customer Support Auto-Router',
      description: 'Analyze inbound support webhooks, classify customer intent using LLM, and dispatch response.',
      trigger_type: 'webhook',
      status: 'active',
      icon: '🤖',
      badge: 'Support & CRM',
      steps: [
        { id: 1, type: 'filter', value: 'Filter: Check if request payload contains customer email & message' },
        { id: 2, type: 'prompt', value: 'Classify intent (Billing, Technical, Account) and draft high-priority reply' },
        { id: 3, type: 'email', value: 'Dispatch transactional approval notification to support@neuravolt.cloud' },
        { id: 4, type: 'webhook', value: 'Post resolution payload to CRM webhook' }
      ]
    },
    {
      id: 'template_rag_sync',
      name: 'Daily Knowledge Base Vector Sync',
      description: 'Scrape workspace document repositories every morning and re-index embeddings into PgVector.',
      trigger_type: 'cron',
      status: 'active',
      icon: '📚',
      badge: 'RAG & Vector Search',
      steps: [
        { id: 1, type: 'rag_search', value: 'Fetch latest PDF & markdown files updated in workspace repository' },
        { id: 2, type: 'prompt', value: 'Extract key entity summaries and chunk text into 512-token segments' },
        { id: 3, type: 'rag_search', value: 'Generate embeddings and insert into PgVector index' }
      ]
    },
    {
      id: 'template_doc_summarizer',
      name: 'Autonomous Document Summarizer & Mailer',
      description: 'Extract text from new uploaded documents, summarize key points, and email summary to team.',
      trigger_type: 'manual',
      status: 'active',
      icon: '✉️',
      badge: 'Document Automation',
      steps: [
        { id: 1, type: 'prompt', value: 'Summarize uploaded document in 3 executive bullet points and action items' },
        { id: 2, type: 'email', value: 'Send summary email to team leads' }
      ]
    },
    {
      id: 'template_slack_bot',
      name: 'Slack & Discord Sentiment Alert Bot',
      description: 'Monitor incoming feedback webhooks, analyze sentiment score, and alert Slack on urgent negative sentiment.',
      trigger_type: 'webhook',
      status: 'active',
      icon: '🔔',
      badge: 'Monitoring & Alerts',
      steps: [
        { id: 1, type: 'prompt', value: 'Analyze text sentiment (Positive, Neutral, Negative) and score 1-10' },
        { id: 2, type: 'filter', value: 'Filter: Trigger alert only if sentiment is Negative and score < 4' },
        { id: 3, type: 'webhook', value: 'Post urgent alert payload to Slack / Discord webhook' }
      ]
    }
  ];

  useEffect(() => {
    const user = localStorage.getItem('hk_user');
    if (!user) {
      router.replace('/login');
      return;
    }
    const isDirectAccess =
      typeof window !== 'undefined' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1' &&
      !!window.location.port;
    let savedApiBase = localStorage.getItem('hk_api_base');
    // Discard any stale cached value: the old tenant-api-fixed-port bug
    // (`:3008`, no longer valid), or any absolute URL when accessed via a
    // raw IP:port — route through this same origin's own Next.js proxy
    // instead of a separate domain in that case.
    if (
      !savedApiBase ||
      /:3008$/.test(savedApiBase) ||
      (isDirectAccess && /^https?:\/\//.test(savedApiBase))
    ) {
      savedApiBase = '';
    }
    const savedTenant = localStorage.getItem('hk_tenant') || 'system';
    setApiBase(savedApiBase);
    setTenantSlug(savedTenant);

    fetchWorkflows(savedApiBase, savedTenant);
  }, []);

  const fetchWorkflows = async (base, tenant) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${base}/api/workflows`, {
        credentials: 'include',
        headers: {
          'x-tenant-slug': tenant,
        },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch workflows');
      }
      const data = await res.json();
      setWorkflows(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNew = () => {
    setIsNew(true);
    setEditingWorkflow({});
    setName('');
    setDescription('');
    setTriggerType('manual');
    setStatus('active');
    setSteps([{ id: 1, type: 'prompt', value: 'Generate a response using LLM' }]);
  };

  const handleApplyTemplate = (template) => {
    setIsNew(true);
    setEditingWorkflow({});
    setName(template.name);
    setDescription(template.description);
    setTriggerType(template.trigger_type);
    setStatus(template.status);
    setSteps(template.steps);
    setShowTemplateModal(false);
  };

  const handleOpenEdit = (wf) => {
    setIsNew(false);
    setEditingWorkflow(wf);
    setName(wf.name);
    setDescription(wf.description || '');
    setTriggerType(wf.trigger_type || 'manual');
    setStatus(wf.status || 'active');
    setSteps(wf.steps || []);
  };

  const handleAddStep = () => {
    setSteps([...steps, { id: Date.now(), type: 'prompt', value: '' }]);
  };

  const handleStepChange = (id, field, val) => {
    setSteps(steps.map(s => s.id === id ? { ...s, [field]: val } : s));
  };

  const handleRemoveStep = (id) => {
    setSteps(steps.filter(s => s.id !== id));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = isNew 
        ? `${apiBase}/api/workflows` 
        : `${apiBase}/api/workflows/${editingWorkflow.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
        },
        body: JSON.stringify({
          name,
          description,
          trigger_type: triggerType,
          status,
          steps,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save workflow');
      }

      setEditingWorkflow(null);
      fetchWorkflows(apiBase, tenantSlug);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;
    try {
      const res = await fetch(`${apiBase}/api/workflows/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'x-tenant-slug': tenantSlug,
        },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete workflow');
      }
      fetchWorkflows(apiBase, tenantSlug);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleFetchExecutions = async (wf) => {
    setSelectedWorkflowForHistory(wf);
    setLoadingHistory(true);
    try {
      const res = await fetch(`${apiBase}/api/workflows/${wf.id}/executions`, {
        credentials: 'include',
        headers: {
          'x-tenant-slug': tenantSlug,
        },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch execution history');
      }
      const data = await res.json();
      setExecutions(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  const getStepBadgeColor = (type) => {
    switch (type) {
      case 'prompt': return { bg: '#e0e7ff', color: '#3730a3', border: '#c7d2fe', label: 'AI Model' };
      case 'webhook': return { bg: '#fef3c7', color: '#92400e', border: '#fde68a', label: 'Webhook POST' };
      case 'email': return { bg: '#d1fae5', color: '#065f46', border: '#a7f3d0', label: 'Email Dispatch' };
      case 'rag_search': return { bg: '#f3e8ff', color: '#6b21a8', border: '#e9d5ff', label: 'Vector RAG' };
      case 'filter': return { bg: '#fee2e2', color: '#991b1b', border: '#fecaca', label: 'Logic Filter' };
      default: return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', label: 'Action' };
    }
  };

  return (
    <>
      <Head>
        <title>Workflow Builder — Xarwiz Cloud</title>
        <meta name="description" content="Build, test, and automate complex AI workflows" />
      </Head>

      <div style={{
        minHeight: '100vh',
        background: '#f8fafc',
        color: '#0f172a',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        padding: '36px 24px',
        boxSizing: 'border-box'
      }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '32px',
            background: '#ffffff',
            padding: '24px 32px',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.03)'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>⚡</span>
                <h1 style={{ fontSize: '24px', fontWeight: '900', margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
                  Autonomous Workflow Builder
                </h1>
              </div>
              <p style={{ margin: '6px 0 0 0', color: '#64748b', fontSize: '13px', fontWeight: '500' }}>
                Design multi-step AI automation pipelines, webhook triggers, RAG indexers, and transactional dispatches.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowTemplateModal(true)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
              >
                ✨ Browse Templates
              </button>

              <button
                onClick={handleOpenNew}
                style={{
                  padding: '10px 20px',
                  borderRadius: '12px',
                  background: '#4f46e5',
                  color: 'white',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(79, 70, 229, 0.25)',
                  transition: 'all 0.2s'
                }}
              >
                + Create Workflow
              </button>

              <Link href="/chat" passHref legacyBehavior>
                <a style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  Back to Workspace
                </a>
              </Link>
            </div>
          </div>

          {error && (
            <div style={{
              padding: '16px 20px',
              borderRadius: '14px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚠️</span> {error}
              </div>
              <button
                onClick={() => fetchWorkflows(apiBase, tenantSlug)}
                style={{
                  padding: '6px 14px',
                  background: '#991b1b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Workflow Cards Grid */}
          {loading ? (
            <div style={{
              background: '#ffffff',
              padding: '60px',
              borderRadius: '20px',
              border: '1px solid #e2e8f0',
              textAlign: 'center',
              color: '#64748b',
              fontWeight: '600'
            }}>
              Loading active workflows...
            </div>
          ) : workflows.length === 0 ? (
            <div style={{
              background: '#ffffff',
              padding: '60px 40px',
              borderRadius: '20px',
              border: '2px dashed #cbd5e1',
              textAlign: 'center',
              boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.02)'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚡</div>
              <h3 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 8px 0', color: '#0f172a' }}>
                No active workflows built yet
              </h3>
              <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '500px', margin: '0 auto 24px auto' }}>
                Get started by choosing a pre-configured template or create a custom multi-step pipeline connecting webhooks, LLMs, and email dispatches.
              </p>
              <div style={{ display: 'flex', justify: 'center', gap: '12px' }}>
                <button
                  onClick={() => setShowTemplateModal(true)}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '12px',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    color: '#334155',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  ✨ Browse Presets
                </button>
                <button
                  onClick={handleOpenNew}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '12px',
                    background: '#4f46e5',
                    color: 'white',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)'
                  }}
                >
                  + Create Blank Workflow
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: '20px'
            }}>
              {workflows.map((wf) => (
                <div
                  key={wf.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '20px',
                    border: '1px solid #e2e8f0',
                    padding: '24px',
                    boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justify: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        background: wf.status === 'active' ? '#d1fae5' : '#f1f5f9',
                        color: wf.status === 'active' ? '#065f46' : '#64748b',
                        border: wf.status === 'active' ? '1px solid #a7f3d0' : '1px solid #cbd5e1'
                      }}>
                        {wf.status || 'Active'}
                      </span>

                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '700',
                        background: '#e0e7ff',
                        color: '#3730a3',
                        border: '1px solid #c7d2fe'
                      }}>
                        Trigger: {wf.trigger_type?.toUpperCase() || 'MANUAL'}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 8px 0', color: '#0f172a' }}>
                      {wf.name}
                    </h3>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0', minHeight: '38px', lineHeight: '1.5' }}>
                      {wf.description || 'No description provided.'}
                    </p>

                    {/* Step Visualizer Sequence */}
                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #f1f5f9', marginBottom: '16px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                        Step Pipeline ({wf.steps?.length || 0} Steps)
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {(wf.steps || []).map((step, idx) => {
                          const badge = getStepBadgeColor(step.type);
                          return (
                            <span key={idx} style={{
                              fontSize: '11px',
                              fontWeight: '700',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: badge.bg,
                              color: badge.color,
                              border: `1px solid ${badge.border}`
                            }}>
                              {idx + 1}. {badge.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '16px',
                    marginTop: '8px'
                  }}>
                    <button
                      onClick={() => handleOpenEdit(wf)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '10px',
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        color: '#334155',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleFetchExecutions(wf)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '10px',
                        background: '#e0e7ff',
                        border: '1px solid #c7d2fe',
                        color: '#3730a3',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      📜 History
                    </button>
                    <button
                      onClick={() => handleDelete(wf.id)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '10px',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#991b1b',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* TEMPLATE LIBRARY MODAL */}
      {showTemplateModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '32px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: '900', margin: 0, color: '#0f172a' }}>
                  ✨ Preset Workflow Templates Library
                </h2>
                <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 0' }}>
                  Select a pre-built autonomous AI template to instantly populate your step canvas.
                </p>
              </div>
              <button
                onClick={() => setShowTemplateModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
              {PRESET_TEMPLATES.map((tmpl) => (
                <div key={tmpl.id} style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '24px' }}>{tmpl.icon}</span>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '800',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: '#e0e7ff',
                        color: '#3730a3'
                      }}>
                        {tmpl.badge}
                      </span>
                    </div>
                    <h4 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 6px 0', color: '#0f172a' }}>
                      {tmpl.name}
                    </h4>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 14px 0', lineHeight: '1.5' }}>
                      {tmpl.description}
                    </p>
                  </div>
                  <button
                    onClick={() => handleApplyTemplate(tmpl)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '10px',
                      background: '#4f46e5',
                      color: 'white',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: '800',
                      cursor: 'pointer'
                    }}
                  >
                    Use Template →
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* WORKFLOW EDIT / CREATE MODAL */}
      {editingWorkflow && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '32px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: '900', margin: '0 0 20px 0', color: '#0f172a' }}>
              {isNew ? 'Create New Autonomous Workflow' : 'Edit Workflow Configuration'}
            </h2>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', marginBottom: '6px', color: '#334155' }}>
                  Workflow Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    fontSize: '14px',
                    fontWeight: '600',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  placeholder="e.g. AI Customer Support Auto-Router"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', marginBottom: '6px', color: '#334155' }}>
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    fontSize: '14px',
                    fontWeight: '500',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Describe what this workflow automates..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', marginBottom: '6px', color: '#334155' }}>
                    Trigger Event
                  </label>
                  <select
                    value={triggerType}
                    onChange={(e) => setTriggerType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      color: '#0f172a',
                      fontSize: '13px',
                      fontWeight: '700',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="manual">Manual Trigger (On Demand)</option>
                    <option value="webhook">Webhook HTTP Endpoint</option>
                    <option value="cron">Scheduled Cron Job</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', marginBottom: '6px', color: '#334155' }}>
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      color: '#0f172a',
                      fontSize: '13px',
                      fontWeight: '700',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="active">Active (Enabled)</option>
                    <option value="paused">Paused (Disabled)</option>
                  </select>
                </div>
              </div>

              {/* Webhook Endpoint Info Box */}
              {triggerType === 'webhook' && editingWorkflow?.id && (
                <div style={{ background: '#f0fdf4', padding: '12px 16px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#166534', display: 'block', marginBottom: '4px' }}>
                    🔗 Webhook Endpoint URL:
                  </span>
                  <code style={{ fontSize: '11px', fontFamily: 'monospace', color: '#15803d', wordBreak: 'break-all' }}>
                    {typeof window !== 'undefined' ? `${window.location.origin}/api/workflows/${editingWorkflow.id}/trigger` : `/api/workflows/${editingWorkflow.id}/trigger`}
                  </code>
                </div>
              )}

              {/* Steps Sequence Canvas */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155' }}>
                    Step Pipeline Canvas ({steps.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddStep}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: '#e0e7ff',
                      color: '#3730a3',
                      border: '1px solid #c7d2fe',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    + Add Step Node
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '240px', overflowY: 'auto' }}>
                  {steps.map((step, idx) => (
                    <div key={step.id || idx} style={{
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'center',
                      background: '#f8fafc',
                      padding: '10px',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0'
                    }}>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#94a3b8', width: '20px' }}>
                        #{idx + 1}
                      </span>
                      <select
                        value={step.type}
                        onChange={(e) => handleStepChange(step.id, 'type', e.target.value)}
                        style={{
                          padding: '8px',
                          borderRadius: '8px',
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          fontSize: '12px',
                          fontWeight: '700',
                          color: '#0f172a'
                        }}
                      >
                        <option value="prompt">AI Prompt / LLM Call</option>
                        <option value="webhook">Webhook HTTP POST</option>
                        <option value="email">Transactional Email</option>
                        <option value="rag_search">Vector RAG Search</option>
                        <option value="filter">Data Logic Filter</option>
                      </select>
                      <input
                        type="text"
                        value={step.value}
                        onChange={(e) => handleStepChange(step.id, 'value', e.target.value)}
                        placeholder="Instruction / payload configuration..."
                        style={{
                          flex: 1,
                          padding: '8px 10px',
                          borderRadius: '8px',
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          fontSize: '12px',
                          color: '#0f172a',
                          outline: 'none'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveStep(step.id)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setEditingWorkflow(null)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '10px',
                    background: '#4f46e5',
                    color: 'white',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    boxShadow: '0 2px 10px rgba(79, 70, 229, 0.3)'
                  }}
                >
                  {saving ? 'Saving...' : 'Save Workflow'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXECUTION HISTORY MODAL */}
      {selectedWorkflowForHistory && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '32px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '900', margin: 0, color: '#0f172a' }}>
                📜 Execution Logs — {selectedWorkflowForHistory.name}
              </h2>
              <button
                onClick={() => setSelectedWorkflowForHistory(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            {loadingHistory ? (
              <p style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>Fetching execution telemetry...</p>
            ) : executions.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>No execution telemetry recorded for this workflow yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {executions.map((ex) => (
                  <div key={ex.id} style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '14px',
                    fontSize: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{
                        fontWeight: 'bold',
                        color: ex.status === 'SUCCESS' ? '#166534' : '#991b1b',
                        background: ex.status === 'SUCCESS' ? '#d1fae5' : '#fee2e2',
                        padding: '2px 8px',
                        borderRadius: '6px'
                      }}>
                        {ex.status}
                      </span>
                      <span style={{ color: '#94a3b8', fontWeight: '500' }}>
                        {new Date(ex.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0 0', color: '#334155', fontFamily: 'monospace' }}>
                      Duration: {ex.duration_ms || 120}ms
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default withAuth(WorkflowsPage);
