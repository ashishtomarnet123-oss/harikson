import { useState, useEffect } from 'react';
import Head from 'next/head';
import { withAuth } from '../components/withAuth';
import DashboardShell from '../components/layout/DashboardShell';
import { authenticatedFetch, getApiConfig } from '../components/settings/apiHelper';
import { Cpu, Plus, Pencil, Trash2, X, Play, Clock, Terminal, Loader, Send } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const MODELS = ['qwen3-coder', 'qwen3-8b', 'qwen3-14b', 'qwen3-32b'];

function AgentsPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [name, setName] = useState('');
  const [model, setModel] = useState('qwen3-coder');
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful AI assistant.');
  const [status, setStatus] = useState('active');
  const toast = useToast();

  const [execAgent, setExecAgent] = useState(null);
  const [execMessage, setExecMessage] = useState('');
  const [execRunning, setExecRunning] = useState(false);
  const [execResult, setExecResult] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    setLoading(true);
    setError(null);
    try {
      const { apiBase } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/agents`);
      if (res?.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
      } else {
        setError('Failed to load agents. Please try again.');
      }
    } catch (err) {
      console.error('Fetch agents error:', err);
      setError('Unable to connect to the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    setIsNew(true);
    setEditing({});
    setName('');
    setModel('qwen3-coder');
    setSystemPrompt('You are a helpful AI assistant.');
    setStatus('active');
  };

  const handleEdit = (agent) => {
    setIsNew(false);
    setEditing(agent);
    setName(agent.name || '');
    setModel(agent.model || 'qwen3-coder');
    setSystemPrompt(agent.system_prompt || '');
    setStatus(agent.status || 'active');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const { apiBase } = getApiConfig();
      const url = isNew ? `${apiBase}/api/agents` : `${apiBase}/api/agents/${editing.id}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await authenticatedFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, model, systemPrompt, status }),
      });
      if (res?.ok) {
        setEditing(null);
        fetchAgents();
        toast.success(isNew ? 'Agent created' : 'Agent updated');
      } else {
        toast.error('Failed to save agent');
      }
    } catch (err) {
      console.error('Save agent error:', err);
      toast.error('Failed to save agent');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this agent?')) return;
    try {
      const { apiBase } = getApiConfig();
      await authenticatedFetch(`${apiBase}/api/agents/${id}`, { method: 'DELETE' });
      fetchAgents();
      toast.success('Agent deleted');
    } catch (err) {
      console.error('Delete agent error:', err);
      toast.error('Failed to delete agent');
    }
  };

  const handleExecute = async (e) => {
    e.preventDefault();
    if (!execMessage.trim() || !execAgent) return;
    setExecRunning(true);
    setExecResult(null);
    try {
      const { apiBase } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/agents/${execAgent.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: execMessage }),
      });
      if (res?.ok) {
        const data = await res.json();
        setExecResult(data);
        fetchAgents();
      } else {
        const err = await res?.json().catch(() => ({}));
        setExecResult({ error: err?.error || 'Execution failed' });
      }
    } catch (err) {
      setExecResult({ error: 'Unable to reach the server.' });
    } finally {
      setExecRunning(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(agents.length / PAGE_SIZE));
  const pagedAgents = agents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const formatDate = (d) => {
    if (!d) return 'Never';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <DashboardShell title="AI Agents">
      <Head><title>AI Agents — Xarwiz</title></Head>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <p style={{ color: 'var(--shell-text-secondary)', fontSize: '14px', margin: 0 }}>
          Create and manage AI agents for your workspace
        </p>
        <button onClick={handleNew} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '8px 16px', borderRadius: '8px',
          backgroundColor: '#6366f1', color: '#fff',
          border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
        }}>
          <Plus size={16} /> Create Agent
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <X size={24} color="#f87171" />
          </div>
          <p style={{ color: '#f87171', fontSize: '14px', marginBottom: '12px' }}>{error}</p>
          <button onClick={fetchAgents} style={{
            padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
            backgroundColor: 'rgba(99,102,241,0.15)', color: '#818cf8',
            border: '1px solid rgba(99,102,241,0.3)', cursor: 'pointer',
          }}>
            Retry
          </button>
        </div>
      ) : (
        <>
          {agents.length === 0 && !editing ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Cpu size={40} color="var(--shell-text-muted)" />
              <p style={{ color: 'var(--shell-text-muted)', fontSize: '14px', marginTop: '12px' }}>No agents yet. Create your first AI agent to get started.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', marginBottom: editing ? '24px' : 0 }}>
              {pagedAgents.map((agent) => (
                <div key={agent.id} style={{
                  padding: '20px', borderRadius: '12px',
                  backgroundColor: 'var(--shell-surface)',
                  border: '1px solid var(--shell-card-border)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--shell-text)', margin: 0 }}>{agent.name}</h3>
                      <span style={{
                        display: 'inline-block', marginTop: '6px',
                        fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                        backgroundColor: 'var(--shell-badge-bg)', color: '#a5b4fc', fontWeight: 500,
                      }}>{agent.model}</span>
                    </div>
                    <span style={{
                      fontSize: '11px', padding: '2px 8px', borderRadius: '10px', fontWeight: 500,
                      backgroundColor: agent.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                      color: agent.status === 'active' ? '#34d399' : '#fbbf24',
                    }}>
                      {agent.status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--shell-text-muted)', marginBottom: '14px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Play size={12} /> {agent.total_requests || 0} requests
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {formatDate(agent.last_used_at)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button onClick={() => { setExecAgent(agent); setExecMessage(''); setExecResult(null); }} style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                      backgroundColor: 'rgba(16,185,129,0.12)', color: '#34d399',
                      border: '1px solid rgba(16,185,129,0.25)', cursor: 'pointer',
                    }}>
                      <Terminal size={12} /> Execute
                    </button>
                    <button onClick={() => handleEdit(agent)} style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                      backgroundColor: 'var(--shell-badge-bg)', color: 'var(--shell-text-bright)',
                      border: '1px solid var(--shell-card-border)', cursor: 'pointer',
                    }}>
                      <Pencil size={12} /> Edit
                    </button>
                    <button onClick={() => handleDelete(agent.id)} style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                      backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171',
                      border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer',
                    }}>
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '20px' }}>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{
                padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 500,
                backgroundColor: 'var(--shell-surface)', color: 'var(--shell-text-secondary)',
                border: '1px solid var(--shell-card-border)', cursor: page <= 1 ? 'default' : 'pointer',
                opacity: page <= 1 ? 0.4 : 1,
              }}>Previous</button>
              <span style={{ fontSize: '13px', color: 'var(--shell-text-muted)' }}>
                Page {page} of {totalPages}
              </span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{
                padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 500,
                backgroundColor: 'var(--shell-surface)', color: 'var(--shell-text-secondary)',
                border: '1px solid var(--shell-card-border)', cursor: page >= totalPages ? 'default' : 'pointer',
                opacity: page >= totalPages ? 0.4 : 1,
              }}>Next</button>
            </div>
          )}

          {editing && (
            <div style={{
              padding: '24px', borderRadius: '12px',
              backgroundColor: 'var(--shell-surface)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              marginTop: '16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--shell-text)', margin: 0 }}>
                  {isNew ? 'Create Agent' : 'Edit Agent'}
                </h3>
                <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', color: 'var(--shell-text-secondary)', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--shell-text-secondary)', display: 'block', marginBottom: '6px' }}>Name</label>
                  <input
                    value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="My Agent"
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px', fontSize: '14px',
                      backgroundColor: 'var(--shell-input-bg)', color: 'var(--shell-text)',
                      border: '1px solid var(--shell-card-border)', outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: 'var(--shell-text-secondary)', display: 'block', marginBottom: '6px' }}>Model</label>
                  <select
                    value={model} onChange={(e) => setModel(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px', fontSize: '14px',
                      backgroundColor: 'var(--shell-input-bg)', color: 'var(--shell-text)',
                      border: '1px solid var(--shell-card-border)', outline: 'none',
                    }}
                  >
                    {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: 'var(--shell-text-secondary)', display: 'block', marginBottom: '6px' }}>System Prompt</label>
                  <textarea
                    value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)}
                    rows={4}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px', fontSize: '14px',
                      backgroundColor: 'var(--shell-input-bg)', color: 'var(--shell-text)',
                      border: '1px solid var(--shell-card-border)', outline: 'none',
                      resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: 'var(--shell-text-secondary)', display: 'block', marginBottom: '6px' }}>Status</label>
                  <select
                    value={status} onChange={(e) => setStatus(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px', fontSize: '14px',
                      backgroundColor: 'var(--shell-input-bg)', color: 'var(--shell-text)',
                      border: '1px solid var(--shell-card-border)', outline: 'none',
                    }}
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setEditing(null)} style={{
                    padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                    backgroundColor: 'transparent', color: 'var(--shell-text-secondary)',
                    border: '1px solid var(--shell-card-border)', cursor: 'pointer',
                  }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={saving || !name.trim()} style={{
                    padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                    backgroundColor: '#6366f1', color: '#fff',
                    border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving || !name.trim() ? 0.5 : 1,
                  }}>
                    {saving ? 'Saving...' : isNew ? 'Create' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}
      {/* Execution Modal */}
      {execAgent && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000, padding: '20px',
        }} onClick={(e) => { if (e.target === e.currentTarget && !execRunning) { setExecAgent(null); } }}>
          <div style={{
            backgroundColor: 'var(--shell-surface, #ffffff)',
            border: '1px solid var(--shell-card-border, #e2e8f0)',
            borderRadius: '16px', maxWidth: '640px', width: '100%',
            maxHeight: '80vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
          }}>
            {/* Modal Header */}
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--shell-card-border, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--shell-text, #0f172a)' }}>
                  Execute: {execAgent.name}
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--shell-text-muted, #6b7280)' }}>
                  Model: {execAgent.model} · POST /api/agents/{execAgent.id}/execute
                </span>
              </div>
              <button onClick={() => { if (!execRunning) setExecAgent(null); }} style={{
                background: 'none', border: 'none', color: 'var(--shell-text-secondary, #64748b)', cursor: 'pointer',
              }}><X size={20} /></button>
            </div>

            {/* Input */}
            <form onSubmit={handleExecute} style={{ padding: '16px 24px', borderBottom: '1px solid var(--shell-card-border, #e2e8f0)' }}>
              <label style={{ fontSize: '13px', color: 'var(--shell-text-secondary, #64748b)', display: 'block', marginBottom: '6px' }}>Message</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  value={execMessage} onChange={(e) => setExecMessage(e.target.value)}
                  placeholder="Enter a task for the agent..."
                  disabled={execRunning}
                  autoFocus
                  style={{
                    flex: 1, padding: '10px 12px', borderRadius: '8px', fontSize: '14px',
                    backgroundColor: 'var(--shell-input-bg, #f4f6f9)', color: 'var(--shell-text, #0f172a)',
                    border: '1px solid var(--shell-card-border, #e2e8f0)', outline: 'none',
                  }}
                />
                <button type="submit" disabled={execRunning || !execMessage.trim()} style={{
                  padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                  backgroundColor: '#6366f1', color: '#fff', border: 'none',
                  cursor: execRunning || !execMessage.trim() ? 'not-allowed' : 'pointer',
                  opacity: execRunning || !execMessage.trim() ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  {execRunning ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Running...</> : <><Send size={14} /> Run</>}
                </button>
              </div>
            </form>

            {/* Output */}
            <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px', minHeight: '200px' }}>
              {execRunning && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '20px 0', justifyContent: 'center' }}>
                  <div style={{ width: '24px', height: '24px', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: '13px', color: 'var(--shell-text-muted, #6b7280)' }}>Agent is processing...</span>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              )}
              {execResult && !execResult.error && (
                <div>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '6px', backgroundColor: 'rgba(16,185,129,0.12)', color: '#34d399', fontWeight: 600 }}>
                      Completed in {(execResult.durationMs / 1000).toFixed(1)}s
                    </span>
                    {execResult.steps && (
                      <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '6px', backgroundColor: 'var(--shell-badge-bg, rgba(59,130,246,0.08))', color: '#818cf8', fontWeight: 600 }}>
                        {execResult.steps.length} step{execResult.steps.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--shell-text, #0f172a)', marginBottom: '8px' }}>Output</div>
                  <pre style={{
                    fontSize: '13px', lineHeight: '1.6', color: 'var(--shell-text-bright, #1e293b)',
                    backgroundColor: 'var(--shell-input-bg, #f4f6f9)',
                    border: '1px solid var(--shell-card-border, #e2e8f0)',
                    borderRadius: '8px', padding: '14px', margin: 0,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflow: 'auto', maxHeight: '300px',
                    fontFamily: 'JetBrains Mono, Menlo, monospace',
                  }}>{execResult.output || '(no output)'}</pre>

                  {execResult.steps && execResult.steps.length > 0 && (
                    <>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--shell-text, #0f172a)', marginTop: '16px', marginBottom: '8px' }}>Execution Log</div>
                      <div style={{
                        border: '1px solid var(--shell-card-border, #e2e8f0)',
                        borderRadius: '8px', overflow: 'hidden',
                      }}>
                        {execResult.steps.map((step, i) => (
                          <div key={i} style={{
                            padding: '10px 14px', fontSize: '12px',
                            borderBottom: i < execResult.steps.length - 1 ? '1px solid var(--shell-card-border-subtle, #f1f5f9)' : 'none',
                            display: 'flex', alignItems: 'flex-start', gap: '10px',
                            fontFamily: 'JetBrains Mono, Menlo, monospace',
                          }}>
                            <span style={{ color: 'var(--shell-text-muted, #6b7280)', minWidth: '24px' }}>#{i + 1}</span>
                            <span style={{ color: 'var(--shell-text-bright, #1e293b)', wordBreak: 'break-word' }}>
                              {typeof step === 'string' ? step : step.action || step.tool || JSON.stringify(step)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
              {execResult && execResult.error && (
                <div style={{
                  padding: '16px', borderRadius: '8px',
                  backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                  color: '#f87171', fontSize: '13px',
                }}>
                  {execResult.error}
                </div>
              )}
              {!execRunning && !execResult && (
                <p style={{ textAlign: 'center', color: 'var(--shell-text-muted, #6b7280)', fontSize: '13px', padding: '40px 0' }}>
                  Enter a message and click Run to execute the agent.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

export default withAuth(AgentsPage);
