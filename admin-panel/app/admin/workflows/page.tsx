'use client';
import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  GitBranch,
  Plus,
  Play,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Search,
  ChevronDown,
  Trash2,
  Pause,
  ToggleLeft,
  ToggleRight,
  Download,
  AlertCircle,
  Zap,
  Activity,
  Users,
  X,
  Maximize2,
  Sparkles,
} from 'lucide-react';
import { getCookie } from 'cookies-next';

const AdminVisualWorkflowEditor = dynamic(
  () => import('./VisualWorkflowEditor'),
  {
    ssr: false,
    loading: () => (
      <div className="h-72 flex items-center justify-center bg-slate-900 rounded-xl text-slate-400 text-xs">
        Loading Visual DAG Canvas...
      </div>
    ),
  }
);

/* ── Types ──────────────────────────────────────────────────────────────────── */

interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger_type: string;
  status: string;
  steps: any;
  execution_count: number;
  avg_duration_ms: number;
  success_rate: number;
  last_execution_at: string;
  last_status: string;
  total_runs: number;
  tenant_id: string;
  tenant_name: string;
  created_at: string;
}

interface Execution {
  id: string;
  status: string;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  logs: string;
  error_message: string;
  step_results: any;
  trigger_type: string;
}

interface Stats {
  total_workflows: number;
  active_workflows: number;
  disabled_workflows: number;
  total_executions: number;
  avg_success_rate: number;
  tenant_count: number;
}

interface Tenant {
  id: string;
  name: string;
}

/* ── Constants ──────────────────────────────────────────────────────────────── */

const triggerColors: Record<string, string> = {
  manual: 'bg-gray-100 text-gray-700 border-gray-200',
  scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
  webhook: 'bg-purple-50 text-purple-700 border-purple-200',
  event: 'bg-orange-50 text-orange-700 border-orange-200',
  cron: 'bg-cyan-50 text-cyan-700 border-cyan-200',
};

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  active: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  disabled: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
  archived: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
};

const stepTypeLabels: Record<string, { label: string; color: string; bg: string }> = {
  prompt: { label: 'AI Prompt', color: 'text-indigo-700', bg: 'bg-indigo-50' },
  webhook: { label: 'Webhook', color: 'text-amber-700', bg: 'bg-amber-50' },
  email: { label: 'Email', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  rag_search: { label: 'RAG Search', color: 'text-purple-700', bg: 'bg-purple-50' },
  filter: { label: 'Filter', color: 'text-red-700', bg: 'bg-red-50' },
  agent: { label: 'Agent', color: 'text-blue-700', bg: 'bg-blue-50' },
};

/* ── Page Component ─────────────────────────────────────────────────────────── */

export default function WorkflowsPage() {
  // Data
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [executionTotal, setExecutionTotal] = useState(0);

  // Selection
  const [selectedWf, setSelectedWf] = useState<Workflow | null>(null);
  const [selectedExec, setSelectedExec] = useState<Execution | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // UI State
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showBulkConfirm, setShowBulkConfirm] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'timeline' | 'canvas'>('timeline');
  const [fullCanvasModal, setFullCanvasModal] = useState<Workflow | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Form
  const [form, setForm] = useState({
    name: '',
    description: '',
    trigger_type: 'manual',
    steps: [{ id: Date.now(), type: 'prompt', value: '' }] as any[],
  });

  const apiBase = '/api-proxy';

  const token = () =>
    getCookie('admin_token') || localStorage.getItem('admin_token');
  const headers = () => ({
    Authorization: `Bearer ${token()}`,
    'Content-Type': 'application/json',
  });

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const handleSaveFromCanvas = async (wfId: string, { steps: compiledSteps, definition }: any) => {
    try {
      const res = await fetch(`${apiBase}/v1/admin/workflows/${wfId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: headers(),
        body: JSON.stringify({
          steps: compiledSteps,
          definition,
        }),
      });
      if (!res.ok) throw new Error('Failed to save visual canvas');
      showToast('success', 'Visual DAG canvas saved successfully');
      fetchWorkflows();
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  /* ── Fetch Functions ───────────────────────────────────────────────────────── */

  const fetchWorkflows = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (tenantFilter) params.set('tenant_id', tenantFilter);
      if (sortBy) params.set('sort', sortBy);
      if (sortOrder) params.set('order', sortOrder);

      const res = await fetch(`${apiBase}/v1/admin/workflows?${params}`, {
        credentials: 'include',
        headers: headers(),
      });
      if (res.ok) {
        const data = await res.json();
        setWorkflows(data);
        if (selectedWf) {
          const updated = data.find((w: Workflow) => w.id === selectedWf.id);
          if (updated) setSelectedWf(updated);
        }
      }
    } catch (err: any) {
      console.error('Error fetching workflows:', err);
    } finally {
      setLoading(false);
    }
  }, [search, tenantFilter, sortBy, sortOrder]);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${apiBase}/v1/admin/workflows/stats/summary`, {
        credentials: 'include',
        headers: headers(),
      });
      if (res.ok) setStats(await res.json());
    } catch (err: any) {
      console.error('Error fetching workflow stats:', err);
    }
  };

  const fetchTenants = async () => {
    try {
      const res = await fetch(`${apiBase}/v1/admin/tenants`, {
        credentials: 'include',
        headers: headers(),
      });
      if (res.ok) {
        const data = await res.json();
        setTenants(Array.isArray(data) ? data : data.tenants || []);
      }
    } catch (err: any) {
      console.error('Error fetching tenants:', err);
    }
  };

  const fetchExecutions = async (id: string) => {
    try {
      const res = await fetch(`${apiBase}/v1/admin/workflows/${id}/executions?limit=25`, {
        credentials: 'include',
        headers: headers(),
      });
      if (res.ok) {
        const data = await res.json();
        setExecutions(data.executions || data);
        setExecutionTotal(data.total || 0);
      }
    } catch (err: any) {
      console.error('Error fetching workflow executions:', err);
    }
  };

  useEffect(() => {
    fetchWorkflows();
    fetchStats();
    fetchTenants();
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [search, tenantFilter, sortBy, sortOrder]);

  useEffect(() => {
    if (selectedWf) {
      fetchExecutions(selectedWf.id);
      setSelectedExec(null);
    }
  }, [selectedWf]);

  /* ── Actions ───────────────────────────────────────────────────────────────── */

  const createWorkflow = async () => {
    if (!form.name) return;
    try {
      const res = await fetch(`${apiBase}/v1/admin/workflows`, {
        credentials: 'include',
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          ...form,
          steps: form.steps.filter((s) => s.value),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create workflow');
      }
      setShowCreate(false);
      setForm({ name: '', description: '', trigger_type: 'manual', steps: [{ id: Date.now(), type: 'prompt', value: '' }] });
      showToast('success', 'Workflow created successfully!');
      fetchWorkflows();
      fetchStats();
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const runWorkflow = async (id: string) => {
    setRunning(id);
    try {
      const res = await fetch(`${apiBase}/v1/admin/workflows/${id}/run`, {
        credentials: 'include',
        method: 'POST',
        headers: headers(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to run workflow');
      showToast('success', data.message || 'Workflow executed successfully!');
      fetchWorkflows();
      fetchStats();
      if (selectedWf?.id === id) fetchExecutions(id);
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setRunning(null);
    }
  };

  const toggleStatus = async (wf: Workflow) => {
    const newStatus = wf.status === 'active' ? 'disabled' : 'active';
    try {
      const res = await fetch(`${apiBase}/v1/admin/workflows/${wf.id}/status`, {
        credentials: 'include',
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to toggle status');
      showToast('success', `Workflow ${newStatus === 'active' ? 'enabled' : 'paused'}`);
      fetchWorkflows();
      fetchStats();
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const deleteWorkflow = async (id: string) => {
    try {
      await fetch(`${apiBase}/v1/admin/workflows/${id}`, {
        credentials: 'include',
        method: 'DELETE',
        headers: headers(),
      });
      setDeleteConfirm(null);
      if (selectedWf?.id === id) setSelectedWf(null);
      showToast('success', 'Workflow deleted');
      fetchWorkflows();
      fetchStats();
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const handleBulkAction = async (action: string) => {
    try {
      const res = await fetch(`${apiBase}/v1/admin/workflows/bulk-action`, {
        credentials: 'include',
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ action, workflow_ids: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bulk action failed');
      showToast('success', `${action} applied to ${data.affected} workflows`);
      setSelectedIds(new Set());
      setShowBulkConfirm(null);
      fetchWorkflows();
      fetchStats();
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const exportExecutions = () => {
    if (!selectedWf || executions.length === 0) return;
    const blob = new Blob([JSON.stringify(executions, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow_${selectedWf.name.replace(/\s+/g, '_')}_executions.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === workflows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(workflows.map((w) => w.id)));
    }
  };

  /* ── Helpers ───────────────────────────────────────────────────────────────── */

  const fmtDuration = (ms: number) =>
    ms ? (ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`) : '—';

  const fmtTime = (d: string) =>
    d
      ? new Date(d).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
      : '—';

  const parseSteps = (raw: any): any[] => {
    try {
      if (Array.isArray(raw)) return raw;
      if (typeof raw === 'string') return JSON.parse(raw);
      return [];
    } catch {
      return [];
    }
  };

  /* ── Render ────────────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-xl shadow-lg text-sm font-bold text-white ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-gray-100">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
            <GitBranch className="w-7 h-7 text-blue-600 shrink-0" /> Workflow
            Center
          </h1>
          <p className="text-gray-500 mt-1.5 text-sm sm:text-base">
            Cross-tenant workflow management — orchestrate, monitor, and debug AI pipelines.
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

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total', value: stats.total_workflows, icon: GitBranch, color: 'text-gray-900' },
            { label: 'Active', value: stats.active_workflows, icon: Zap, color: 'text-emerald-600' },
            { label: 'Paused', value: stats.disabled_workflows, icon: Pause, color: 'text-gray-500' },
            { label: 'Executions', value: stats.total_executions, icon: Activity, color: 'text-blue-600' },
            { label: 'Avg Success', value: stats.avg_success_rate ? `${stats.avg_success_rate}%` : 'N/A', icon: CheckCircle, color: 'text-emerald-600' },
            { label: 'Tenants', value: stats.tenant_count, icon: Users, color: 'text-purple-600' },
          ].map((s, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-xl p-3.5 shadow-xs">
              <div className="flex items-center gap-1.5 mb-1">
                <s.icon className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{s.label}</span>
              </div>
              <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Search / Filter / Sort Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workflows by name or description..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white text-gray-700"
          />
        </div>
        <select
          value={tenantFilter}
          onChange={(e) => setTenantFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white text-gray-700 outline-none focus:border-blue-500 min-w-[160px]"
        >
          <option value="">All Tenants</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select
          value={`${sortBy}:${sortOrder}`}
          onChange={(e) => {
            const [s, o] = e.target.value.split(':');
            setSortBy(s);
            setSortOrder(o);
          }}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white text-gray-700 outline-none focus:border-blue-500 min-w-[160px]"
        >
          <option value="created_at:desc">Newest First</option>
          <option value="created_at:asc">Oldest First</option>
          <option value="name:asc">Name A-Z</option>
          <option value="name:desc">Name Z-A</option>
          <option value="execution_count:desc">Most Runs</option>
          <option value="success_rate:desc">Highest Success</option>
        </select>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
          <span className="text-sm font-bold text-blue-700">{selectedIds.size} selected</span>
          <button
            onClick={() => setShowBulkConfirm('pause')}
            className="text-xs font-semibold px-3 py-1 rounded-lg bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200 transition-all"
          >
            Pause All
          </button>
          <button
            onClick={() => setShowBulkConfirm('resume')}
            className="text-xs font-semibold px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-all"
          >
            Resume All
          </button>
          <button
            onClick={() => setShowBulkConfirm('delete')}
            className="text-xs font-semibold px-3 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 transition-all"
          >
            Delete All
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs font-semibold px-3 py-1 rounded-lg text-gray-500 hover:text-gray-800 transition-all ml-auto"
          >
            Clear
          </button>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-md space-y-4">
          <h3 className="text-sm font-bold text-gray-900">Create New Workflow</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Daily Report Pipeline"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Description</label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Summarizes usage and updates DB"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Trigger Type</label>
              <select
                value={form.trigger_type}
                onChange={(e) => setForm({ ...form, trigger_type: e.target.value })}
                className="w-full border border-gray-200 bg-white rounded-xl px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="manual">Manual</option>
                <option value="scheduled">Scheduled</option>
                <option value="webhook">Webhook</option>
                <option value="event">Event</option>
              </select>
            </div>
          </div>

          {/* Step Builder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-500">Step Pipeline ({form.steps.length})</label>
              <button
                onClick={() => setForm({ ...form, steps: [...form.steps, { id: Date.now(), type: 'prompt', value: '' }] })}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-all"
              >
                + Add Step
              </button>
            </div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {form.steps.map((step: any, idx: number) => (
                <div key={step.id} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border border-gray-100">
                  <span className="text-xs font-bold text-gray-400 w-5">#{idx + 1}</span>
                  <select
                    value={step.type}
                    onChange={(e) => {
                      const updated = [...form.steps];
                      updated[idx] = { ...updated[idx], type: e.target.value };
                      setForm({ ...form, steps: updated });
                    }}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white text-gray-700"
                  >
                    <option value="prompt">AI Prompt</option>
                    <option value="webhook">Webhook</option>
                    <option value="email">Email</option>
                    <option value="rag_search">RAG Search</option>
                    <option value="filter">Filter</option>
                    <option value="agent">Agent</option>
                  </select>
                  <input
                    value={step.value || ''}
                    onChange={(e) => {
                      const updated = [...form.steps];
                      updated[idx] = { ...updated[idx], value: e.target.value };
                      setForm({ ...form, steps: updated });
                    }}
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white text-gray-700 outline-none"
                    placeholder="Instruction, URL, or query..."
                  />
                  <button
                    onClick={() => setForm({ ...form, steps: form.steps.filter((_, i) => i !== idx) })}
                    className="text-red-400 hover:text-red-600 transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
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

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workflows List */}
        <div className="space-y-3">
          {/* Select All */}
          {workflows.length > 0 && (
            <div className="flex items-center gap-2 px-1">
              <input
                type="checkbox"
                checked={selectedIds.size === workflows.length && workflows.length > 0}
                onChange={selectAll}
                className="rounded border-gray-300"
              />
              <span className="text-xs text-gray-500 font-medium">Select All ({workflows.length})</span>
            </div>
          )}

          {loading ? (
            // Skeleton loaders
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-5 rounded-2xl border border-gray-100 bg-white animate-pulse">
                  <div className="flex justify-between mb-3">
                    <div className="h-5 bg-gray-200 rounded w-40" />
                    <div className="h-5 bg-gray-100 rounded w-20" />
                  </div>
                  <div className="h-3 bg-gray-100 rounded w-3/4 mb-4" />
                  <div className="flex gap-2 mb-3">
                    <div className="h-5 bg-indigo-50 rounded w-16" />
                    <div className="h-5 bg-amber-50 rounded w-16" />
                  </div>
                  <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-50">
                    {[1, 2, 3].map((j) => (
                      <div key={j} className="text-center">
                        <div className="h-3 bg-gray-100 rounded w-10 mx-auto mb-1" />
                        <div className="h-4 bg-gray-200 rounded w-8 mx-auto" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : workflows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-gray-200 rounded-2xl bg-white p-6 shadow-xs">
              <GitBranch className="w-14 h-14 text-gray-300 mb-4" />
              <h3 className="text-gray-950 font-extrabold text-lg mb-1.5">
                {search || tenantFilter ? 'No Matching Workflows' : 'No Workflows Yet'}
              </h3>
              <p className="text-gray-500 text-sm mb-6 max-w-sm">
                {search || tenantFilter
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Create a workflow to orchestrate multi-step AI pipelines.'}
              </p>
              {!search && !tenantFilter && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm hover:shadow"
                >
                  <Plus className="w-4 h-4 text-white" /> Create Your First Workflow
                </button>
              )}
            </div>
          ) : (
            workflows.map((wf) => {
              const steps = parseSteps(wf.steps);
              const sc = statusColors[wf.status] || statusColors.active;
              return (
                <div
                  key={wf.id}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer bg-white relative ${
                    selectedWf?.id === wf.id
                      ? 'border-blue-500 ring-1 ring-blue-500/20 shadow-md'
                      : 'border-gray-100 hover:border-gray-200 shadow-sm hover:shadow'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedIds.has(wf.id)}
                      onChange={() => toggleSelect(wf.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 rounded border-gray-300 shrink-0"
                    />

                    <div className="flex-1 min-w-0" onClick={() => setSelectedWf(wf)}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 text-base tracking-tight truncate">
                            {wf.name}
                          </div>
                          {wf.tenant_name && (
                            <span className="text-[10px] font-semibold text-gray-400">
                              {wf.tenant_name}
                            </span>
                          )}
                          <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {wf.description}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Status badge */}
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${sc.bg} ${sc.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                            {wf.status}
                          </span>
                          {/* Trigger badge */}
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                              triggerColors[wf.trigger_type] || 'bg-gray-100 text-gray-700 border-gray-200'
                            }`}
                          >
                            {wf.trigger_type}
                          </span>
                        </div>
                      </div>

                      {/* Step Pipeline Preview */}
                      {steps.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {steps.map((step: any, idx: number) => {
                            const st = stepTypeLabels[step.type] || stepTypeLabels.prompt;
                            return (
                              <span
                                key={idx}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${st.bg} ${st.color}`}
                              >
                                {idx + 1}. {st.label}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-3 text-xs mt-3 pt-3 border-t border-gray-50">
                        <div className="text-center">
                          <div className="text-gray-500 font-medium">Runs</div>
                          <div className="font-black text-gray-900 text-sm mt-0.5">
                            {wf.execution_count || wf.total_runs || 0}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-500 font-medium">Success</div>
                          <div className="font-black text-emerald-600 text-sm mt-0.5">
                            {wf.success_rate ? `${wf.success_rate}%` : 'N/A'}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-500 font-medium">Avg Time</div>
                          <div className="font-black text-blue-600 text-sm mt-0.5">
                            {wf.avg_duration_ms ? fmtDuration(wf.avg_duration_ms) : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50 pl-7">
                    <button
                      onClick={(e) => { e.stopPropagation(); runWorkflow(wf.id); }}
                      disabled={running === wf.id}
                      className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 transition-all text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm disabled:opacity-60"
                    >
                      {running === wf.id ? (
                        <Loader2 className="w-3 h-3 animate-spin text-white" />
                      ) : (
                        <Play className="w-3 h-3 text-white fill-current" />
                      )}
                      <span>Run</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleStatus(wf); }}
                      className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 transition-all"
                      title={wf.status === 'active' ? 'Pause' : 'Enable'}
                    >
                      {wf.status === 'active' ? (
                        <ToggleRight className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="w-3.5 h-3.5 text-gray-400" />
                      )}
                      <span>{wf.status === 'active' ? 'Pause' : 'Enable'}</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(wf.id); }}
                      className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 transition-all ml-auto"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Detail / Execution Panel */}
        <div>
          {selectedWf ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4 sticky top-6">
              {/* Workflow Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-50">
                <div>
                  <h3 className="font-black text-gray-900 text-lg leading-tight truncate max-w-[280px] sm:max-w-xs">
                    {selectedWf.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {selectedWf.description}
                  </p>
                  {selectedWf.tenant_name && (
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded mt-1 inline-block">
                      Tenant: {selectedWf.tenant_name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFullCanvasModal(selectedWf)}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 transition-all rounded-lg border border-cyan-200 shadow-sm"
                    title="Open Full Visual DAG Studio"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Visual Studio</span>
                  </button>
                  {executions.length > 0 && (
                    <button
                      onClick={exportExecutions}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-slate-50 transition-all rounded-lg border border-gray-100"
                      title="Export executions as JSON"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => fetchExecutions(selectedWf.id)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-slate-50 transition-all rounded-lg border border-gray-100"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tab Navigation: Timeline vs Visual Canvas */}
              <div className="flex border-b border-gray-100 gap-4">
                <button
                  onClick={() => setDetailTab('timeline')}
                  className={`pb-2 text-xs font-bold transition-all border-b-2 ${
                    detailTab === 'timeline'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  Step Pipeline &amp; Logs
                </button>
                <button
                  onClick={() => setDetailTab('canvas')}
                  className={`pb-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                    detailTab === 'canvas'
                      ? 'border-cyan-600 text-cyan-600'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Interactive Node Canvas (n8n/Make)</span>
                </button>
              </div>

              {detailTab === 'canvas' ? (
                <div className="rounded-xl overflow-hidden border border-gray-200">
                  <AdminVisualWorkflowEditor
                    workflow={selectedWf}
                    latestExecution={selectedExec || executions[0]}
                    onSave={(data: any) => handleSaveFromCanvas(selectedWf.id, data)}
                    onRun={() => runWorkflow(selectedWf.id)}
                    isRunning={running === selectedWf.id}
                  />
                </div>
              ) : (
                <>
                  {/* Workflow Config */}
                  <div className="bg-gray-50/60 rounded-xl p-3.5 space-y-2.5">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pipeline Configuration</div>
                <div className="flex flex-wrap gap-1.5">
                  {parseSteps(selectedWf.steps).map((step: any, idx: number) => {
                    const st = stepTypeLabels[step.type] || stepTypeLabels.prompt;
                    return (
                      <div key={idx} className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${st.bg} ${st.color} border border-gray-100`}>
                        <span className="opacity-60">#{idx + 1}</span> {st.label}
                        {step.value && (
                          <span className="ml-1 opacity-60 max-w-[120px] truncate inline-block align-bottom">
                            — {step.value.substring(0, 40)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {parseSteps(selectedWf.steps).length === 0 && (
                    <span className="text-xs text-gray-400 italic">No steps configured</span>
                  )}
                </div>
              </div>

              {/* Execution History */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Execution History ({executionTotal})
                  </p>
                </div>
                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                  {executions.length === 0 ? (
                    <div className="text-center text-gray-400 py-12 text-sm font-medium">
                      <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      No runs yet. Click Run to execute this pipeline.
                    </div>
                  ) : (
                    executions.map((ex) => {
                      const isExpanded = selectedExec?.id === ex.id;
                      const stepResults = parseSteps(ex.step_results);
                      return (
                        <div
                          key={ex.id}
                          onClick={() => setSelectedExec(isExpanded ? null : ex)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                            isExpanded
                              ? 'bg-blue-50/30 border-blue-200'
                              : 'bg-gray-50/50 border-gray-100 hover:border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              {ex.status === 'completed' ? (
                                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                              ) : ex.status === 'failed' ? (
                                <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                              ) : (
                                <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
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
                              {ex.trigger_type && (
                                <span className="text-[9px] font-semibold text-gray-400 uppercase bg-gray-100 px-1.5 py-0.5 rounded">
                                  {ex.trigger_type}
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-bold text-gray-900 font-mono">
                              {ex.duration_ms ? fmtDuration(ex.duration_ms) : 'N/A'}
                            </div>
                          </div>
                          <div className="text-[11px] text-gray-500 font-medium mt-1">
                            {fmtTime(ex.started_at)}
                          </div>

                          {/* Expanded Detail */}
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-dashed border-gray-200 space-y-3">
                              {/* Step Results */}
                              {stepResults.length > 0 && (
                                <div className="space-y-2">
                                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Step Results</div>
                                  {stepResults.map((sr: any, sIdx: number) => {
                                    const st = stepTypeLabels[sr.type] || stepTypeLabels.prompt;
                                    return (
                                      <div key={sIdx} className="bg-white border border-gray-100 rounded-lg p-2.5">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className={`text-[10px] font-bold ${st.color}`}>
                                            Step {sIdx + 1}: {st.label}
                                          </span>
                                          <div className="flex items-center gap-2">
                                            {sr.status === 'completed' ? (
                                              <CheckCircle className="w-3 h-3 text-emerald-500" />
                                            ) : sr.status === 'failed' ? (
                                              <XCircle className="w-3 h-3 text-red-500" />
                                            ) : (
                                              <AlertCircle className="w-3 h-3 text-amber-500" />
                                            )}
                                            <span className="text-[9px] font-mono text-gray-400">{sr.durationMs}ms</span>
                                          </div>
                                        </div>
                                        {sr.output && (
                                          <pre className="text-[9px] text-gray-600 bg-gray-50 rounded p-2 overflow-x-auto max-h-[60px] whitespace-pre-wrap font-mono">
                                            {typeof sr.output === 'object' ? JSON.stringify(sr.output, null, 2).substring(0, 300) : String(sr.output).substring(0, 300)}
                                          </pre>
                                        )}
                                        {sr.error && (
                                          <div className="text-[9px] text-red-600 bg-red-50 rounded p-1.5 mt-1 font-semibold">
                                            {sr.error}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Logs */}
                              {ex.logs && (
                                <div>
                                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Logs</div>
                                  <pre className="bg-gray-900 text-slate-100 p-3 rounded-xl text-[10px] font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner max-h-[120px]">
                                    {typeof ex.logs === 'string' ? ex.logs : JSON.stringify(ex.logs, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {ex.error_message && (
                                <div className="bg-red-50 text-red-700 p-2.5 rounded-xl text-xs font-bold border border-red-100">
                                  ⚠️ {ex.error_message}
                                </div>
                              )}

                              <div className="text-[9px] text-gray-400 font-mono">
                                ID: {ex.id} &middot; Started: {fmtTime(ex.started_at)} &middot; Ended: {fmtTime(ex.completed_at || ex.started_at)}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl p-10 flex flex-col items-center justify-center text-center text-gray-400 text-sm shadow-sm h-64">
          <Clock className="w-10 h-10 text-gray-300 mb-2.5" />
          <p className="font-semibold text-gray-500">
            Select a workflow to see configuration and execution history
          </p>
        </div>
      )}
    </div>
  </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
            <Trash2 className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h3 className="text-lg font-black text-gray-900 mb-2">Delete Workflow?</h3>
            <p className="text-sm text-gray-500 mb-6">This will permanently remove the workflow and all execution history.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteWorkflow(deleteConfirm)}
                className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-all shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Action Confirmation Modal */}
      {showBulkConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
            <AlertCircle className="w-12 h-12 text-blue-400 mx-auto mb-3" />
            <h3 className="text-lg font-black text-gray-900 mb-2">
              {showBulkConfirm === 'delete' ? 'Delete' : showBulkConfirm === 'pause' ? 'Pause' : 'Resume'} {selectedIds.size} Workflows?
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              This will {showBulkConfirm} all {selectedIds.size} selected workflows.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowBulkConfirm(null)}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleBulkAction(showBulkConfirm)}
                className={`px-5 py-2 rounded-xl text-sm font-bold text-white transition-all shadow-sm ${
                  showBulkConfirm === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Admin Visual DAG Studio Modal */}
      {fullCanvasModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md p-6 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔮</span>
              <div>
                <h2 className="text-lg font-bold text-white leading-tight">
                  {fullCanvasModal.name} — Visual DAG Studio
                </h2>
                <p className="text-xs text-slate-400">
                  Interactive node-graph workflow canvas with dynamic branching and real-time execution telemetry.
                </p>
              </div>
            </div>
            <button
              onClick={() => setFullCanvasModal(null)}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition border border-white/10"
            >
              Close Studio
            </button>
          </div>

          <div className="flex-1 relative">
            <AdminVisualWorkflowEditor
              workflow={fullCanvasModal}
              latestExecution={selectedExec || executions[0]}
              onSave={(data: any) => handleSaveFromCanvas(fullCanvasModal.id, data)}
              onRun={() => runWorkflow(fullCanvasModal.id)}
              isRunning={running === fullCanvasModal.id}
            />
          </div>
        </div>
      )}
    </div>
  );
}
