import { useState, useEffect } from 'react';
import Head from 'next/head';
import { withAuth } from '../components/withAuth';
import DashboardShell from '../components/layout/DashboardShell';
import { authenticatedFetch, getApiConfig } from '../components/settings/apiHelper';
import { Cpu, Plus, Pencil, Trash2, X, Play, Clock } from 'lucide-react';

const MODELS = ['qwen3-coder', 'qwen3-8b', 'qwen3-14b', 'qwen3-32b'];

function AgentsPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [model, setModel] = useState('qwen3-coder');
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful AI assistant.');
  const [status, setStatus] = useState('active');

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const { apiBase } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/agents`);
      if (res?.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
      }
    } catch (err) {
      console.error('Fetch agents error:', err);
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
      }
    } catch (err) {
      console.error('Save agent error:', err);
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
    } catch (err) {
      console.error('Delete agent error:', err);
    }
  };

  const formatDate = (d) => {
    if (!d) return 'Never';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <DashboardShell title="AI Agents">
      <Head><title>AI Agents — Xarwiz</title></Head>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>
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
      ) : (
        <>
          {/* Agent Cards Grid */}
          {agents.length === 0 && !editing ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Cpu size={40} color="#4b5563" />
              <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '12px' }}>No agents yet. Create your first AI agent to get started.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', marginBottom: editing ? '24px' : 0 }}>
              {agents.map((agent) => (
                <div key={agent.id} style={{
                  padding: '20px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(17, 24, 39, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f3f4f6', margin: 0 }}>{agent.name}</h3>
                      <span style={{
                        display: 'inline-block', marginTop: '6px',
                        fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                        backgroundColor: 'rgba(99,102,241,0.15)', color: '#a5b4fc', fontWeight: 500,
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

                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#6b7280', marginBottom: '14px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Play size={12} /> {agent.total_requests || 0} requests
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {formatDate(agent.last_used_at)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleEdit(agent)} style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                      backgroundColor: 'rgba(255,255,255,0.06)', color: '#d1d5db',
                      border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
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

          {/* Edit / Create Panel */}
          {editing && (
            <div style={{
              padding: '24px',
              borderRadius: '12px',
              backgroundColor: 'rgba(17, 24, 39, 0.8)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              marginTop: '16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#f3f4f6', margin: 0 }}>
                  {isNew ? 'Create Agent' : 'Edit Agent'}
                </h3>
                <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Name</label>
                  <input
                    value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="My Agent"
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px', fontSize: '14px',
                      backgroundColor: 'rgba(31,41,55,0.8)', color: '#f3f4f6',
                      border: '1px solid rgba(255,255,255,0.1)', outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Model</label>
                  <select
                    value={model} onChange={(e) => setModel(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px', fontSize: '14px',
                      backgroundColor: 'rgba(31,41,55,0.8)', color: '#f3f4f6',
                      border: '1px solid rgba(255,255,255,0.1)', outline: 'none',
                    }}
                  >
                    {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>System Prompt</label>
                  <textarea
                    value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)}
                    rows={4}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px', fontSize: '14px',
                      backgroundColor: 'rgba(31,41,55,0.8)', color: '#f3f4f6',
                      border: '1px solid rgba(255,255,255,0.1)', outline: 'none',
                      resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Status</label>
                  <select
                    value={status} onChange={(e) => setStatus(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px', fontSize: '14px',
                      backgroundColor: 'rgba(31,41,55,0.8)', color: '#f3f4f6',
                      border: '1px solid rgba(255,255,255,0.1)', outline: 'none',
                    }}
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setEditing(null)} style={{
                    padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                    backgroundColor: 'transparent', color: '#9ca3af',
                    border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
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
    </DashboardShell>
  );
}

export default withAuth(AgentsPage);
