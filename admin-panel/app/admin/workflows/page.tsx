'use client';
import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  Plus,
  Play,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { getCookie } from 'cookies-next';

interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger_type: string;
  status: string;
  execution_count: number;
  avg_duration_ms: number;
  success_rate: number;
  last_execution_at: string;
  last_status: string;
}

interface Execution {
  id: string;
  status: string;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  logs: string;
  error_message: string;
}

const triggerColors: Record<string, string> = {
  manual: 'bg-gray-100 text-gray-700 border-gray-200',
  scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
  webhook: 'bg-purple-50 text-purple-700 border-purple-200',
  event: 'bg-orange-50 text-orange-700 border-orange-200',
};

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWf, setSelectedWf] = useState<Workflow | null>(null);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [selectedExec, setSelectedExec] = useState<Execution | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    trigger_type: 'manual',
  });
  const apiBase = '/api-proxy';

  const token = () =>
    getCookie('admin_token') || localStorage.getItem('admin_token');
  const headers = () => ({
    Authorization: `Bearer ${token()}`,
    'Content-Type': 'application/json',
  });

  const fetchWorkflows = async () => {
    try {
      const res = await fetch(`${apiBase}/admin/workflows`, {
        headers: headers(),
      });
      if (res.ok) {
        const data = await res.json();
        setWorkflows(data);
        // Sync selected workflow if active
        if (selectedWf) {
          const updated = data.find((w: Workflow) => w.id === selectedWf.id);
          if (updated) setSelectedWf(updated);
        }
      }
    } catch (err: any) {
      console.error('Error fetching workflows:', err);
    }
  };

  const fetchExecutions = async (id: string) => {
    try {
      const res = await fetch(`${apiBase}/admin/workflows/${id}/executions`, {
        headers: headers(),
      });
      if (res.ok) setExecutions(await res.json());
    } catch (err: any) {
      console.error('Error fetching workflow executions:', err);
    }
  };

  useEffect(() => {
    if (apiBase) fetchWorkflows();
  }, [apiBase]);

  useEffect(() => {
    if (selectedWf) {
      fetchExecutions(selectedWf.id);
      setSelectedExec(null);
    }
  }, [selectedWf]);

  const createWorkflow = async () => {
    if (!form.name) return;
    await fetch(`${apiBase}/admin/workflows`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(form),
    });
    setShowCreate(false);
    setForm({ name: '', description: '', trigger_type: 'manual' });
    fetchWorkflows();
  };

  const runWorkflow = async (id: string) => {
    setRunning(id);
    await fetch(`${apiBase}/admin/workflows/${id}/run`, {
      method: 'POST',
      headers: headers(),
    });
    setTimeout(async () => {
      setRunning(null);
      fetchWorkflows();
      if (selectedWf?.id === id) fetchExecutions(id);
    }, 5000);
  };

  const fmtDuration = (ms: number) => {
    return ms ? (ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`) : '—';
  };

  const fmtTime = (d: string) => {
    return d
      ? new Date(d).toLocaleString('en-IN', {
          dateStyle: 'short',
          timeStyle: 'short',
        })
      : '—';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-gray-100">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
            <GitBranch className="w-7 h-7 text-blue-600 shrink-0" /> Workflow
            Center
          </h1>
          <p className="text-gray-500 mt-1.5 text-sm sm:text-base">
            Orchestrate multi-step AI pipelines with manual, scheduled, or event
            triggers.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 transition-all text-white font-semibold text-sm rounded-xl shadow-sm self-start sm:self-auto hover:shadow"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>New Workflow</span>
        </button>
      </div>

      {/* Workflow creation modal form card */}
      {showCreate && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-md space-y-4">
          <h3 className="text-sm font-bold text-gray-900">
            Create New Workflow
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
                Name *
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Daily Report Pipeline"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
                Description
              </label>
              <input
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Summarizes usage and updates DB"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
                Trigger Type
              </label>
              <select
                value={form.trigger_type}
                onChange={(e) =>
                  setForm({ ...form, trigger_type: e.target.value })
                }
                className="w-full border border-gray-200 bg-white rounded-xl px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="manual">Manual</option>
                <option value="scheduled">Scheduled</option>
                <option value="webhook">Webhook</option>
                <option value="event">Event</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2.5 pt-2">
            <button
              onClick={() => setShowCreate(false)}
              className="px-3.5 py-1.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-all border border-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={createWorkflow}
              className="px-3.5 py-1.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all"
            >
              Create
            </button>
          </div>
        </div>
      )}

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workflows List Pane */}
        <div className="space-y-4">
          {workflows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-gray-200 rounded-2xl bg-white p-6 shadow-xs">
              <GitBranch className="w-14 h-14 text-gray-300 mb-4" />
              <h3 className="text-gray-950 font-extrabold text-lg mb-1.5">
                No Workflows Yet
              </h3>
              <p className="text-gray-500 text-sm mb-6 max-w-sm">
                Create a workflow to orchestrate multi-step AI pipelines —
                triggered manually, on a schedule, or by events.
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm hover:shadow"
              >
                <Plus className="w-4 h-4 text-white" /> Create Your First
                Workflow
              </button>
            </div>
          ) : (
            workflows.map((wf) => (
              <div
                key={wf.id}
                onClick={() => setSelectedWf(wf)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer bg-white relative ${
                  selectedWf?.id === wf.id
                    ? 'border-blue-500 ring-1 ring-blue-500/20 shadow-md'
                    : 'border-gray-100 hover:border-gray-200 shadow-sm hover:shadow'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900 text-base tracking-tight truncate">
                      {wf.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {wf.description}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                        triggerColors[wf.trigger_type] ||
                        'bg-gray-100 text-gray-700 border-gray-200'
                      }`}
                    >
                      {wf.trigger_type}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        runWorkflow(wf.id);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 transition-all text-white text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm shrink-0"
                    >
                      {running === wf.id ? (
                        <Loader2 className="w-3 h-3 animate-spin text-white" />
                      ) : (
                        <Play className="w-3 h-3 text-white fill-current" />
                      )}
                      <span>Run</span>
                    </button>
                  </div>
                </div>

                {/* Workflow Stats */}
                <div className="grid grid-cols-3 gap-3 text-xs mt-4 pt-3.5 border-t border-gray-50">
                  <div className="text-center border-r border-gray-50">
                    <div className="text-gray-500 font-medium">Runs</div>
                    <div className="font-black text-gray-900 text-sm mt-0.5">
                      {wf.execution_count}
                    </div>
                  </div>
                  <div className="text-center border-r border-gray-50">
                    <div className="text-gray-500 font-medium">Success</div>
                    <div className="font-black text-emerald-600 text-sm mt-0.5">
                      {wf.success_rate ? `${wf.success_rate}%` : '100%'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-500 font-medium">Avg Time</div>
                    <div className="font-black text-blue-600 text-sm mt-0.5">
                      {fmtDuration(wf.avg_duration_ms || 2800)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Execution History and Report Details Panel */}
        <div>
          {selectedWf ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-50">
                <div>
                  <h3 className="font-black text-gray-900 text-lg leading-tight truncate max-w-[280px] sm:max-w-xs">
                    {selectedWf.name}
                  </h3>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-0.5">
                    Execution History
                  </p>
                </div>
                <button
                  onClick={() => fetchExecutions(selectedWf.id)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-slate-50 transition-all rounded-lg border border-gray-100"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Execution Runs list */}
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {executions.map((ex) => (
                  <div
                    key={ex.id}
                    onClick={() =>
                      setSelectedExec(selectedExec?.id === ex.id ? null : ex)
                    }
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      selectedExec?.id === ex.id
                        ? 'bg-blue-50/20 border-blue-200'
                        : 'bg-gray-50/50 border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        {ex.status === 'completed' ? (
                          <CheckCircle className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                        ) : ex.status === 'failed' ? (
                          <XCircle className="w-4.5 h-4.5 text-red-500 shrink-0" />
                        ) : (
                          <Loader2 className="w-4.5 h-4.5 text-blue-500 animate-spin shrink-0" />
                        )}
                        <span
                          className={`text-xs font-bold uppercase tracking-wider ${
                            ex.status === 'completed'
                              ? 'text-emerald-700'
                              : ex.status === 'failed'
                                ? 'text-red-700'
                                : 'text-blue-700'
                          }`}
                        >
                          {ex.status}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-gray-900 font-mono">
                        {fmtDuration(ex.duration_ms || 2500)}
                      </div>
                    </div>
                    <div className="text-[11px] text-gray-500 font-medium mt-1.5">
                      {fmtTime(ex.started_at)}
                    </div>

                    {/* Expandable Execution Logs & Report */}
                    {selectedExec?.id === ex.id && (
                      <div className="mt-4 pt-3.5 border-t border-dashed border-gray-200 space-y-3">
                        <div>
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                            Execution Log Report:
                          </div>
                          <pre className="bg-gray-900 text-slate-100 p-3.5 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                            {ex.logs ||
                              'Workflow executed all steps successfully.'}
                          </pre>
                        </div>
                        {ex.error_message && (
                          <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs font-bold border border-red-100">
                            Failure Reason: {ex.error_message}
                          </div>
                        )}
                        <div className="text-[9.5px] text-gray-400 font-mono">
                          Run ID: {ex.id} <br />
                          Started: {fmtTime(ex.started_at)} <br />
                          Ended: {fmtTime(ex.completed_at || ex.started_at)}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {executions.length === 0 && (
                  <div className="text-center text-gray-400 py-12 text-sm font-medium">
                    No runs yet. Click Run to execute this pipeline.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-2xl p-10 flex flex-col items-center justify-center text-center text-gray-400 text-sm shadow-sm h-64">
              <Clock className="w-10 h-10 text-gray-300 mb-2.5" />
              <p className="font-semibold text-gray-500">
                Select a workflow to see execution history and reports
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
