import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

export default function WorkflowsPage() {
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

  // Execution History State
  const [selectedWorkflowForHistory, setSelectedWorkflowForHistory] = useState(null);
  const [executions, setExecutions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [apiBase, setApiBase] = useState('http://localhost:3008');
  const [tenantSlug, setTenantSlug] = useState('system');

  useEffect(() => {
    // Resolve credentials and endpoint configuration
    const user = localStorage.getItem('hk_user');
    if (!user) {
      router.replace('/login');
      return;
    }
    const savedApiBase = localStorage.getItem('hk_api_base') || 'http://localhost:3008';
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
    setSteps([{ id: 1, type: 'prompt', value: 'Generate a response' }]);
  };

  const handleOpenEdit = (wf) => {
    setIsNew(false);
    setEditingWorkflow(wf);
    setName(wf.name);
    setDescription(wf.description || '');
    setTriggerType(wf.trigger_type);
    setStatus(wf.status);
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
    setError('');
    try {
      const url = isNew 
        ? `${apiBase}/api/v1/workflows` 
        : `${apiBase}/api/v1/workflows/${editingWorkflow.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: {
          'x-tenant-slug': tenantSlug,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          trigger_type: triggerType,
          status,
          steps,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save workflow');
      }

      setEditingWorkflow(null);
      fetchWorkflows(apiBase, tenantSlug);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;
    try {
      const res = await fetch(`${apiBase}/api/v1/workflows/${id}`, {
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
      setError(err.message);
    }
  };

  const handleViewHistory = async (wf) => {
    setSelectedWorkflowForHistory(wf);
    setLoadingHistory(true);
    setExecutions([]);
    try {
      const res = await fetch(`${apiBase}/api/v1/workflows/${wf.id}/executions`, {
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

  return (
    <>
      <Head>
        <title>Workflow Builder — Harikson AI</title>
        <meta name="description" content="Build and monitor autonomous workflows" />
      </Head>

      <div className="workflows-root" style={{
        minHeight: '100vh',
        background: '#0b0f19',
        color: '#f8fafc',
        fontFamily: 'Inter, sans-serif',
        padding: '40px 20px',
        boxSizing: 'border-box'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '40px',
            borderBottom: '1px solid #1e293b',
            paddingBottom: '20px'
          }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 8px 0', color: 'white' }}>
                Workflow Builder
              </h1>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
                Create, test, and manage complex autonomous integrations.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '15px' }}>
              <Link href="/chat" passHref legacyBehavior>
                <a style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: '1px solid #334155',
                  color: '#94a3b8',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  Back to Chat
                </a>
              </Link>
              <button
                onClick={handleOpenNew}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Create Workflow
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              background: '#7f1d1d',
              border: '1px solid #f87171',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '30px',
              color: '#fca5a5',
              fontSize: '14px'
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Workflow List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
              Loading workflows...
            </div>
          ) : workflows.length === 0 ? (
            <div style={{
              background: '#0f172a',
              border: '1px dashed #334155',
              borderRadius: '12px',
              padding: '60px 20px',
              textAlign: 'center'
            }}>
              <h3 style={{ fontSize: '18px', margin: '0 0 10px 0', color: '#94a3b8' }}>No workflows built yet</h3>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
                Get started by creating your first autonomous workflow mapping webhook inputs or schedules to custom steps.
              </p>
              <button
                onClick={handleOpenNew}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Create Workflow
              </button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: '20px'
            }}>
              {workflows.map((wf) => (
                <div key={wf.id} style={{
                  background: '#0f172a',
                  border: '1px solid #1e293b',
                  borderRadius: '12px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '220px'
                }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', margin: 0 }}>
                        {wf.name}
                      </h3>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        background: wf.status === 'active' ? '#065f46' : '#1e293b',
                        color: wf.status === 'active' ? '#34d399' : '#94a3b8'
                      }}>
                        {wf.status}
                      </span>
                    </div>
                    <p style={{ color: '#94a3b8', fontSize: '13.5px', margin: '0 0 16px 0', lineHeight: '1.5' }}>
                      {wf.description || 'No description provided.'}
                    </p>
                    <div style={{ display: 'flex', gap: '15px', color: '#64748b', fontSize: '12px', marginBottom: '20px' }}>
                      <div>Trigger: <strong style={{ color: '#94a3b8' }}>{wf.trigger_type}</strong></div>
                      <div>Steps: <strong style={{ color: '#94a3b8' }}>{wf.steps?.length || 0}</strong></div>
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderTop: '1px solid #1e293b',
                    paddingTop: '15px',
                    gap: '10px'
                  }}>
                    <button
                      onClick={() => handleViewHistory(wf)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#60a5fa',
                        fontSize: '13px',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      History
                    </button>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => handleOpenEdit(wf)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#38bdf8',
                          fontSize: '13px',
                          cursor: 'pointer'
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(wf.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#f87171',
                          fontSize: '13px',
                          cursor: 'pointer'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Workflow Creation & Editing Panel */}
          {editingWorkflow && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(15, 23, 42, 0.85)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 9999
            }}>
              <div style={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '640px',
                padding: '30px',
                maxHeight: '90vh',
                overflowY: 'auto'
              }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', margin: '0 0 20px 0' }}>
                  {isNew ? 'New Workflow' : 'Edit Workflow'}
                </h2>
                <form onSubmit={handleSave}>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Name</label>
                    <input
                      type="text"
                      required
                      placeholder="E.g., Automated Lead Responder"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={{
                        width: '100%',
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        padding: '10px',
                        color: 'white',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Description</label>
                    <textarea
                      placeholder="Describe what this workflow integrates..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      style={{
                        width: '100%',
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        padding: '10px',
                        color: 'white',
                        boxSizing: 'border-box',
                        resize: 'none'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Trigger Type</label>
                      <select
                        value={triggerType}
                        onChange={(e) => setTriggerType(e.target.value)}
                        style={{
                          width: '100%',
                          background: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: '8px',
                          padding: '10px',
                          color: 'white',
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value="manual">Manual Trigger</option>
                        <option value="scheduled">Scheduled Interval</option>
                        <option value="webhook">Webhook Callback</option>
                        <option value="event">Chat Command / Event</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Status</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        style={{
                          width: '100%',
                          background: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: '8px',
                          padding: '10px',
                          color: 'white',
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value="active">Active</option>
                        <option value="disabled">Disabled</option>
                      </select>
                    </div>
                  </div>

                  {/* Steps Editor */}
                  <div style={{ marginBottom: '25px', borderTop: '1px solid #1e293b', paddingTop: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                      <h4 style={{ margin: 0, color: 'white', fontSize: '15px' }}>Steps Config</h4>
                      <button
                        type="button"
                        onClick={handleAddStep}
                        style={{
                          background: 'transparent',
                          border: '1px solid #3b82f6',
                          color: '#60a5fa',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        + Add Step
                      </button>
                    </div>

                    {steps.length === 0 ? (
                      <p style={{ color: '#64748b', fontSize: '13px', textAlign: 'center' }}>
                        No execution steps defined yet.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {steps.map((step, idx) => (
                          <div key={step.id} style={{
                            background: '#1e293b',
                            borderRadius: '8px',
                            padding: '12px',
                            display: 'flex',
                            gap: '10px',
                            alignItems: 'center'
                          }}>
                            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>#{idx+1}</span>
                            <select
                              value={step.type}
                              onChange={(e) => handleStepChange(step.id, 'type', e.target.value)}
                              style={{
                                background: '#0f172a',
                                border: '1px solid #334155',
                                color: 'white',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                fontSize: '12px'
                              }}
                            >
                              <option value="prompt">Prompt LLM</option>
                              <option value="api_call">API Call</option>
                              <option value="conditional">Conditional Branch</option>
                            </select>
                            <input
                              type="text"
                              required
                              placeholder={step.type === 'api_call' ? 'https://api.endpoint.com' : 'Instructions or prompt content...'}
                              value={step.value}
                              onChange={(e) => handleStepChange(step.id, 'value', e.target.value)}
                              style={{
                                flex: 1,
                                background: '#0f172a',
                                border: '1px solid #334155',
                                color: 'white',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                fontSize: '12px'
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveStep(step.id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#ef4444',
                                fontSize: '16px',
                                cursor: 'pointer'
                              }}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setEditingWorkflow(null)}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '8px',
                        background: 'transparent',
                        border: '1px solid #334155',
                        color: '#94a3b8',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '8px',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Execution History Modal */}
          {selectedWorkflowForHistory && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(15, 23, 42, 0.85)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 9999
            }}>
              <div style={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '720px',
                padding: '30px',
                maxHeight: '80vh',
                overflowY: 'auto'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', margin: 0 }}>
                    Execution History: {selectedWorkflowForHistory.name}
                  </h2>
                  <button
                    onClick={() => setSelectedWorkflowForHistory(null)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#94a3b8',
                      fontSize: '24px',
                      cursor: 'pointer'
                    }}
                  >
                    ×
                  </button>
                </div>

                {loadingHistory ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    Loading execution logs...
                  </div>
                ) : executions.length === 0 ? (
                  <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', padding: '30px' }}>
                    No executions recorded for this workflow yet.
                  </p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #1e293b', color: '#94a3b8' }}>
                          <th style={{ padding: '10px' }}>Execution ID</th>
                          <th style={{ padding: '10px' }}>Status</th>
                          <th style={{ padding: '10px' }}>Started At</th>
                          <th style={{ padding: '10px' }}>Duration (ms)</th>
                          <th style={{ padding: '10px' }}>Logs</th>
                        </tr>
                      </thead>
                      <tbody>
                        {executions.map((exec) => (
                          <tr key={exec.id} style={{ borderBottom: '1px solid #1e293b' }}>
                            <td style={{ padding: '10px', color: '#60a5fa', fontFamily: 'monospace' }}>
                              {exec.id.substring(0, 8)}...
                            </td>
                            <td style={{ padding: '10px' }}>
                              <span style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                background: exec.status === 'completed' ? '#065f46' : exec.status === 'failed' ? '#7f1d1d' : '#1e293b',
                                color: exec.status === 'completed' ? '#34d399' : exec.status === 'failed' ? '#fca5a5' : '#94a3b8'
                              }}>
                                {exec.status}
                              </span>
                            </td>
                            <td style={{ padding: '10px', color: '#94a3b8' }}>
                              {new Date(exec.started_at).toLocaleString()}
                            </td>
                            <td style={{ padding: '10px', color: '#94a3b8' }}>
                              {exec.duration_ms || '0'}
                            </td>
                            <td style={{ padding: '10px', color: '#64748b', fontSize: '12px' }}>
                              {exec.logs || exec.error_message || 'None'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
