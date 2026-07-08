'use client';
import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Flex } from '@tremor/react';
import { GitBranch, Plus, Play, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { getCookie } from 'cookies-next';

interface Workflow { id: string; name: string; description: string; trigger_type: string; status: string; execution_count: number; avg_duration_ms: number; success_rate: number; last_execution_at: string; last_status: string; }
interface Execution { id: string; status: string; started_at: string; completed_at: string; duration_ms: number; logs: string; error_message: string; }

const triggerColors: Record<string, string> = { manual: 'gray', scheduled: 'blue', webhook: 'purple', event: 'orange' };

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWf, setSelectedWf] = useState<Workflow | null>(null);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', trigger_type: 'manual' });
  const [apiBase, setApiBase] = useState('http://localhost:4008');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const h = window.location.hostname;
      if (h !== 'localhost' && h !== '127.0.0.1') setApiBase(`http://${h}:4008`);
    }
  }, []);

  const token = () => getCookie('admin_token') || localStorage.getItem('admin_token');
  const headers = () => ({ Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' });

  const fetchWorkflows = async () => {
    try {
      const res = await fetch(`${apiBase}/admin/workflows`, { headers: headers() });
      if (res.ok) setWorkflows(await res.json());
    } catch {}
  };

  const fetchExecutions = async (id: string) => {
    try {
      const res = await fetch(`${apiBase}/admin/workflows/${id}/executions`, { headers: headers() });
      if (res.ok) setExecutions(await res.json());
    } catch {}
  };

  useEffect(() => { if (apiBase) fetchWorkflows(); }, [apiBase]);
  useEffect(() => { if (selectedWf) fetchExecutions(selectedWf.id); }, [selectedWf]);

  const createWorkflow = async () => {
    if (!form.name) return;
    await fetch(`${apiBase}/admin/workflows`, { method: 'POST', headers: headers(), body: JSON.stringify(form) });
    setShowCreate(false);
    setForm({ name: '', description: '', trigger_type: 'manual' });
    fetchWorkflows();
  };

  const runWorkflow = async (id: string) => {
    setRunning(id);
    await fetch(`${apiBase}/admin/workflows/${id}/run`, { method: 'POST', headers: headers() });
    setTimeout(async () => {
      setRunning(null);
      fetchWorkflows();
      if (selectedWf?.id === id) fetchExecutions(id);
    }, 5000);
  };

  const fmtDuration = (ms: number) => ms ? (ms >= 1000 ? `${(ms/1000).toFixed(1)}s` : `${ms}ms`) : '—';
  const fmtTime = (d: string) => d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><GitBranch className="w-6 h-6 text-orange-500" /> Workflow Center</h1>
          <p className="text-gray-400 mt-1 text-sm">Orchestrate multi-step AI pipelines with manual, scheduled, or event triggers.</p>
        </div>
        <Button icon={Plus} onClick={() => setShowCreate(true)}>New Workflow</Button>
      </div>

      {showCreate && (
        <Card className="bg-gray-900/60 border-orange-800/50 p-5">
          <h3 className="text-sm font-bold text-gray-200 mb-4">Create Workflow</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div><label className="text-xs text-gray-400 mb-1.5 block">Name *</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none" placeholder="Daily Report Pipeline" /></div>
            <div><label className="text-xs text-gray-400 mb-1.5 block">Description</label>
              <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none" /></div>
            <div><label className="text-xs text-gray-400 mb-1.5 block">Trigger</label>
              <select value={form.trigger_type} onChange={e => setForm({...form, trigger_type: e.target.value})} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none">
                <option value="manual">Manual</option><option value="scheduled">Scheduled</option><option value="webhook">Webhook</option><option value="event">Event</option>
              </select></div>
          </div>
          <Flex justifyContent="end" className="gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button size="sm" onClick={createWorkflow}>Create</Button>
          </Flex>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          {workflows.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-800 rounded-2xl">
              <GitBranch className="w-12 h-12 text-gray-700 mb-4" />
              <h3 className="text-white font-bold text-lg mb-1">No Workflows Yet</h3>
              <p className="text-gray-500 text-sm mb-6 max-w-xs">Create a workflow to orchestrate multi-step AI pipelines — triggered manually, on a schedule, or by events.</p>
              <button onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors">
                <Plus className="w-4 h-4" /> Create Your First Workflow
              </button>
            </div>
          )}
            <Card key={wf.id} onClick={() => setSelectedWf(wf)}
              className={`cursor-pointer border p-4 transition-all ${selectedWf?.id === wf.id ? 'bg-orange-900/20 border-orange-700' : 'bg-gray-900/40 border-gray-800 hover:border-gray-700'}`}>
              <Flex justifyContent="between" className="mb-2">
                <div>
                  <div className="font-semibold text-white">{wf.name}</div>
                  <div className="text-xs text-gray-500">{wf.description}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge color={triggerColors[wf.trigger_type] as any} size="sm">{wf.trigger_type}</Badge>
                  <button onClick={e => { e.stopPropagation(); runWorkflow(wf.id); }}
                    className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors">
                    {running === wf.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />} Run
                  </button>
                </div>
              </Flex>
              <div className="grid grid-cols-3 gap-2 text-xs mt-3">
                <div className="text-center"><div className="font-bold text-orange-400">{wf.execution_count}</div><div className="text-gray-600">Runs</div></div>
                <div className="text-center"><div className="font-bold text-emerald-400">{wf.success_rate ? `${wf.success_rate}%` : '—'}</div><div className="text-gray-600">Success</div></div>
                <div className="text-center"><div className="font-bold text-gray-300">{fmtDuration(wf.avg_duration_ms)}</div><div className="text-gray-600">Avg Time</div></div>
              </div>
            </Card>
          ))}
          {workflows.length === 0 && <div className="text-center text-gray-500 py-12">No workflows yet. Create one above.</div>}
        </div>

        {selectedWf ? (
          <Card className="bg-gray-900/40 border-gray-800 p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-white">{selectedWf.name}</h3>
                <p className="text-xs text-gray-500">Execution History</p>
              </div>
              <button onClick={() => fetchExecutions(selectedWf.id)} className="text-gray-500 hover:text-white transition-colors">↻</button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {executions.map(ex => (
                <div key={ex.id} className="p-3 bg-gray-950 rounded-lg border border-gray-800">
                  <Flex justifyContent="between">
                    <div className="flex items-center gap-2">
                      {ex.status === 'completed' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : ex.status === 'failed' ? <XCircle className="w-4 h-4 text-red-400" /> : <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
                      <span className={`text-xs font-semibold ${ex.status === 'completed' ? 'text-emerald-400' : ex.status === 'failed' ? 'text-red-400' : 'text-blue-400'}`}>{ex.status}</span>
                    </div>
                    <div className="text-xs text-gray-500">{fmtDuration(ex.duration_ms)}</div>
                  </Flex>
                  <div className="text-xs text-gray-500 mt-1">{fmtTime(ex.started_at)}</div>
                  {ex.error_message && <div className="text-xs text-red-400 mt-1">{ex.error_message}</div>}
                </div>
              ))}
              {executions.length === 0 && <div className="text-center text-gray-500 py-6 text-sm">No runs yet. Click Run to execute.</div>}
            </div>
          </Card>
        ) : (
          <Card className="bg-gray-900/40 border-gray-800 p-8 flex items-center justify-center text-gray-500 text-sm">Select a workflow to see execution history</Card>
        )}
      </div>
    </div>
  );
}
