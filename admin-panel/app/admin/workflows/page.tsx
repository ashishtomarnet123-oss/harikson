'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  Workflow,
  Plus,
  Play,
  Clock,
  CheckCircle,
  CheckCircle2,
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
  Layers,
  Network,
  Bot,
  Database,
  Mail,
  Webhook,
  Filter,
  Copy,
  Check,
  Send,
  SlidersHorizontal,
  ArrowRight,
  Terminal,
} from 'lucide-react';
import { getCookie } from 'cookies-next';

const AdminVisualWorkflowEditor = dynamic(
  () => import('./VisualWorkflowEditor'),
  {
    ssr: false,
    loading: () => (
      <div className="h-72 flex items-center justify-center bg-slate-900 rounded-2xl text-slate-400 text-xs gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
        <span>Loading Visual DAG Canvas...</span>
      </div>
    ),
  }
);

/* ── Types ──────────────────────────────────────────────────────────────────── */

interface WorkflowItem {
  id: string;
  name: string;
  description: string;
  trigger_type: string;
  cron_expression?: string;
  webhook_secret?: string;
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

/* ── Constants & Helpers ────────────────────────────────────────────────────── */

const triggerPillStyles: Record<string, { bg: string; text: string; border: string }> = {
  manual: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
  scheduled: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  cron: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  webhook: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  event: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
};

const stepTypeConfig: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  prompt: { label: 'AI Prompt', icon: Bot, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
  webhook: { label: 'Webhook', icon: Webhook, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
  email: { label: 'Email', icon: Mail, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  rag_search: { label: 'RAG Search', icon: Database, color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-100' },
  filter: { label: 'Logic Filter', icon: Filter, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
  agent: { label: 'Agent Dispatch', icon: Zap, color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-100' },
};

const PRESET_TEMPLATES = [
  {
    id: 'tmpl_support',
    name: 'Customer Support Auto-Triage',
    description: 'Classify inbound support webhook requests via LLM and dispatch high-priority notifications.',
    trigger_type: 'webhook',
    badge: 'Support & CRM',
    steps: [
      { id: 1, type: 'filter', value: 'Check payload has customer email & message' },
      { id: 2, type: 'prompt', value: 'Classify intent (Billing, Tech, Account) & generate priority draft' },
      { id: 3, type: 'email', value: 'support-team@xarwiz.com' },
    ],
  },
  {
    id: 'tmpl_vector_sync',
    name: 'Daily Knowledge Base Vector Sync',
    description: 'Nightly scan of tenant documentation repositories and automatic PgVector re-indexing.',
    trigger_type: 'cron',
    cron_expression: '0 6 * * *',
    badge: 'RAG & Vector',
    steps: [
      { id: 1, type: 'rag_search', value: 'Index delta of changed documents since yesterday' },
      { id: 2, type: 'prompt', value: 'Extract key entity summaries & chunk into 512-token segments' },
      { id: 3, type: 'filter', value: 'Validate embedding cosine similarity threshold >= 0.82' },
    ],
  },
  {
    id: 'tmpl_doc_summarizer',
    name: 'Executive Contract & SLA Summarizer',
    description: 'Parse newly uploaded PDF legal contracts, extract key clauses, and email executive summary.',
    trigger_type: 'manual',
    badge: 'Legal & Docs',
    steps: [
      { id: 1, type: 'rag_search', value: 'Extract contract SLA clauses and liability limits' },
      { id: 2, type: 'prompt', value: 'Generate 3 bullet point executive summary and risk assessment' },
      { id: 3, type: 'email', value: 'legal-team@xarwiz.com' },
    ],
  },
  {
    id: 'tmpl_incident_bot',
    name: 'Platform Incident Alert Bot',
    description: 'Listen to monitoring webhooks, filter on critical errors, and notify Slack incident room.',
    trigger_type: 'webhook',
    badge: 'DevOps & SRE',
    steps: [
      { id: 1, type: 'filter', value: 'severity == "critical" || http_status >= 500' },
      { id: 2, type: 'prompt', value: 'Format incident markdown summary with affected service breakdown' },
      { id: 3, type: 'webhook', value: 'https://hooks.slack.com/services/T00/B00/X00' },
    ],
  },
];

/* ── Main Component ─────────────────────────────────────────────────────────── */

export default function WorkflowsPage() {
  // Data State
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [executionTotal, setExecutionTotal] = useState(0);

  // Selection & UI State
  const [selectedWf, setSelectedWf] = useState<WorkflowItem | null>(null);
  const [selectedExec, setSelectedExec] = useState<Execution | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showBulkConfirm, setShowBulkConfirm] = useState<string | null>(null);
  const [fullCanvasModal, setFullCanvasModal] = useState<WorkflowItem | null>(null);
  const [detailTab, setDetailTab] = useState<'timeline' | 'canvas' | 'api'>('timeline');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, paused, webhook, cron, manual
  const [tenantFilter, setTenantFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Create Form State
  const [form, setForm] = useState({
    name: '',
    description: '',
    trigger_type: 'manual',
    tenant_id: '',
    cron_expression: '',
    webhook_secret: '',
    steps: [
      { id: 1, type: 'prompt', value: '' },
      { id: 2, type: 'email', value: '' },
    ] as any[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Webhook Test Runner State
  const [testPayload, setTestPayload] = useState('{\n  "event": "order.completed",\n  "amount": 249.00,\n  "customer": "alex@example.com"\n}');
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const apiBase = '/api-proxy';

  const token = () =>
    getCookie('admin_token') || localStorage.getItem('admin_token');
  const headers = () => ({
    Authorization: `Bearer ${token()}`,
    'Content-Type': 'application/json',
  });

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
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
        const data: WorkflowItem[] = await res.json();
        setWorkflows(data);

        // Auto-select first workflow if none currently selected, or refresh selected
        setSelectedWf((prev) => {
          if (!prev && data.length > 0) return data[0];
          if (prev) {
            const updated = data.find((w) => w.id === prev.id);
            return updated || (data.length > 0 ? data[0] : null);
          }
          return null;
        });
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
      setTestResult(null);
    }
  }, [selectedWf?.id]);

  /* ── Filtered Workflows ────────────────────────────────────────────────────── */

  const filteredWorkflows = useMemo(() => {
    return workflows.filter((wf) => {
      if (statusFilter === 'active' && wf.status !== 'active') return false;
      if (statusFilter === 'paused' && wf.status !== 'disabled') return false;
      if (statusFilter === 'webhook' && wf.trigger_type !== 'webhook') return false;
      if (statusFilter === 'cron' && wf.trigger_type !== 'cron' && wf.trigger_type !== 'scheduled') return false;
      if (statusFilter === 'manual' && wf.trigger_type !== 'manual') return false;
      return true;
    });
  }, [workflows, statusFilter]);

  /* ── Actions ───────────────────────────────────────────────────────────────── */

  const createWorkflow = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!form.name.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${apiBase}/v1/admin/workflows`, {
        credentials: 'include',
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          trigger_type: form.trigger_type,
          tenant_id: form.tenant_id || null,
          cron_expression: form.cron_expression || null,
          webhook_secret: form.webhook_secret || null,
          steps: form.steps.filter((s) => s.value && s.value.trim()),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create workflow');
      }
      const created = await res.json();
      setShowCreateModal(false);
      setForm({
        name: '',
        description: '',
        trigger_type: 'manual',
        tenant_id: '',
        cron_expression: '',
        webhook_secret: '',
        steps: [
          { id: 1, type: 'prompt', value: '' },
          { id: 2, type: 'email', value: '' },
        ],
      });
      showToast('success', 'Workflow pipeline created successfully!');
      fetchWorkflows();
      fetchStats();
      if (created?.id) setSelectedWf(created);
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyPreset = (preset: (typeof PRESET_TEMPLATES)[0]) => {
    setForm({
      name: preset.name,
      description: preset.description,
      trigger_type: preset.trigger_type,
      tenant_id: '',
      cron_expression: preset.cron_expression || '',
      webhook_secret: '',
      steps: preset.steps.map((s) => ({ ...s, id: Date.now() + Math.random() })),
    });
    setShowTemplateModal(false);
    setShowCreateModal(true);
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

  const toggleStatus = async (wf: WorkflowItem) => {
    const newStatus = wf.status === 'active' ? 'disabled' : 'active';
    try {
      const res = await fetch(`${apiBase}/v1/admin/workflows/${wf.id}/status`, {
        credentials: 'include',
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to toggle status');
      showToast('success', `Workflow ${newStatus === 'active' ? 'resumed' : 'paused'}`);
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
      showToast('success', 'Workflow pipeline deleted');
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

  const handleTestWebhook = async () => {
    if (!selectedWf) return;
    setTestingWebhook(true);
    setTestResult(null);
    try {
      let parsed = {};
      try {
        parsed = JSON.parse(testPayload);
      } catch {
        throw new Error('Invalid JSON format in test payload');
      }
      const t0 = Date.now();
      const res = await fetch(`${apiBase}/v1/admin/workflows/${selectedWf.id}/run`, {
        method: 'POST',
        credentials: 'include',
        headers: headers(),
        body: JSON.stringify({ input: parsed, trigger: 'webhook_test' }),
      });
      const dur = Date.now() - t0;
      const data = await res.json().catch(() => ({}));
      setTestResult({
        status: res.status,
        ok: res.ok,
        durationMs: dur,
        data,
      });
      if (res.ok) {
        showToast('success', `Webhook test dispatched (${res.status} OK in ${dur}ms)`);
        fetchExecutions(selectedWf.id);
        fetchStats();
      } else {
        showToast('error', `Webhook returned status ${res.status}: ${data.error || 'Failed'}`);
      }
    } catch (err: any) {
      setTestResult({
        status: 0,
        ok: false,
        error: err.message,
      });
    } finally {
      setTestingWebhook(false);
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

  const parseSteps = (raw: any): any[] => {
    try {
      if (Array.isArray(raw)) return raw;
      if (typeof raw === 'string') return JSON.parse(raw);
      return [];
    } catch {
      return [];
    }
  };

  const fmtDuration = (ms: number) =>
    ms ? (ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`) : '—';

  const fmtTime = (d: string) =>
    d
      ? new Date(d).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';

  /* ── Stats Metric Cards Configuration ─────────────────────────────────────── */

  const statCards = [
    {
      label: 'Total Workflows',
      value: stats?.total_workflows ?? workflows.length,
      sub: 'All registered',
      icon: Workflow,
      bg: 'bg-indigo-50 text-indigo-600',
    },
    {
      label: 'Active Pipelines',
      value: stats?.active_workflows ?? workflows.filter((w) => w.status === 'active').length,
      sub: 'Operational',
      icon: Zap,
      bg: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Paused Pipelines',
      value: stats?.disabled_workflows ?? workflows.filter((w) => w.status === 'disabled').length,
      sub: 'Inactive',
      icon: Pause,
      bg: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Total Executions',
      value: stats?.total_executions ?? workflows.reduce((a, b) => a + (b.execution_count || b.total_runs || 0), 0),
      sub: 'Job telemetry',
      icon: Activity,
      bg: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Avg Success Rate',
      value: stats?.avg_success_rate ? `${stats.avg_success_rate}%` : '99.4%',
      sub: 'Reliability',
      icon: CheckCircle2,
      bg: 'bg-teal-50 text-teal-600',
    },
    {
      label: 'Active Tenants',
      value: stats?.tenant_count ?? (tenants.length || 1),
      sub: 'Cross-tenant',
      icon: Users,
      bg: 'bg-purple-50 text-purple-600',
    },
  ];

  /* ── Render ────────────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold transition-all border ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── 1. Clean Header Section (User Panel Alignment) ────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-gray-200/80">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-xs">
            <Workflow className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Workflow Center
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Cross-tenant orchestration & workflow telemetry — monitor, trigger, and debug automated AI pipelines.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setShowTemplateModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 text-xs font-semibold shadow-xs transition-all"
          >
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Templates</span>
          </button>

          <button
            onClick={() => {
              if (selectedWf) {
                setFullCanvasModal(selectedWf);
              } else if (workflows.length > 0) {
                setFullCanvasModal(workflows[0]);
              } else {
                setForm({
                  name: 'New Node Pipeline',
                  description: 'Interactive DAG Canvas',
                  trigger_type: 'manual',
                  tenant_id: '',
                  cron_expression: '',
                  webhook_secret: '',
                  steps: [{ id: 1, type: 'prompt', value: '' }],
                });
                setShowCreateModal(true);
              }
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-600 hover:bg-indigo-100/80 text-xs font-semibold shadow-xs transition-all"
          >
            <Network className="w-4 h-4 text-indigo-600" />
            <span>Visual Studio</span>
          </button>

          <button
            onClick={() => {
              setForm({
                name: '',
                description: '',
                trigger_type: 'manual',
                tenant_id: '',
                cron_expression: '',
                webhook_secret: '',
                steps: [
                  { id: 1, type: 'prompt', value: '' },
                  { id: 2, type: 'email', value: '' },
                ],
              });
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs hover:shadow transition-all"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>New Workflow</span>
          </button>
        </div>
      </div>

      {/* ── 2. Unified KPI Stat Cards (Balanced 6-Column Grid) ─────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-xs hover:border-gray-300 transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500 truncate">{card.label}</span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${card.bg}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 tracking-tight">{card.value}</div>
                <div className="text-[11px] font-medium text-gray-400 mt-0.5">{card.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 3. Search, Filter Pills & Sort Toolbar ────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workflows by name or description..."
            className="w-full pl-9 pr-8 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white text-gray-800 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills (All, Active, Paused, Webhook, Scheduled, Manual) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: 'all', label: 'All', count: workflows.length },
            { id: 'active', label: 'Active', count: workflows.filter((w) => w.status === 'active').length },
            { id: 'paused', label: 'Paused', count: workflows.filter((w) => w.status === 'disabled').length },
            { id: 'webhook', label: 'Webhooks', count: workflows.filter((w) => w.trigger_type === 'webhook').length },
            { id: 'cron', label: 'Scheduled', count: workflows.filter((w) => w.trigger_type === 'cron' || w.trigger_type === 'scheduled').length },
            { id: 'manual', label: 'Manual', count: workflows.filter((w) => w.trigger_type === 'manual').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 border ${
                statusFilter === tab.id
                  ? 'bg-indigo-50 text-indigo-600 border-indigo-200 shadow-xs'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                  statusFilter === tab.id ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Tenant Filter & Sort */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <select
              value={tenantFilter}
              onChange={(e) => setTenantFilter(e.target.value)}
              className="border border-gray-200 rounded-xl pl-3 pr-8 py-2 text-xs bg-white text-gray-700 outline-none focus:border-indigo-500 cursor-pointer appearance-none shadow-xs"
            >
              <option value="">All Tenants</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={`${sortBy}:${sortOrder}`}
              onChange={(e) => {
                const [s, o] = e.target.value.split(':');
                setSortBy(s);
                setSortOrder(o);
              }}
              className="border border-gray-200 rounded-xl pl-3 pr-8 py-2 text-xs bg-white text-gray-700 outline-none focus:border-indigo-500 cursor-pointer appearance-none shadow-xs"
            >
              <option value="created_at:desc">Newest First</option>
              <option value="created_at:asc">Oldest First</option>
              <option value="name:asc">Name A-Z</option>
              <option value="execution_count:desc">Most Runs</option>
              <option value="success_rate:desc">Highest Success</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Bulk Actions Banner */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2.5 shadow-xs">
          <span className="text-xs font-bold text-indigo-700">
            {selectedIds.size} {selectedIds.size === 1 ? 'workflow' : 'workflows'} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBulkConfirm('pause')}
              className="text-xs font-semibold px-3 py-1 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all shadow-xs"
            >
              Pause All
            </button>
            <button
              onClick={() => setShowBulkConfirm('resume')}
              className="text-xs font-semibold px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-all shadow-xs"
            >
              Resume All
            </button>
            <button
              onClick={() => setShowBulkConfirm('delete')}
              className="text-xs font-semibold px-3 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition-all shadow-xs"
            >
              Delete All
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs font-semibold px-3 py-1 text-gray-500 hover:text-gray-800 transition-all ml-2"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* ── 4. Main Master-Detail Workflows Grid ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Workflows List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1 text-xs text-gray-500 font-medium">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedIds.size === filteredWorkflows.length && filteredWorkflows.length > 0}
                onChange={selectAll}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>Select All ({filteredWorkflows.length})</span>
            </div>
            <span>Showing {filteredWorkflows.length} workflows</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-5 rounded-2xl border border-gray-200 bg-white animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                  <div className="h-8 bg-gray-50 rounded" />
                </div>
              ))}
            </div>
          ) : filteredWorkflows.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-10 text-center">
              <Workflow className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-gray-900 mb-1">
                {search || tenantFilter || statusFilter !== 'all' ? 'No Matching Workflows' : 'No Automated Workflows Yet'}
              </h3>
              <p className="text-xs text-gray-500 max-w-xs mx-auto mb-5">
                {search || tenantFilter || statusFilter !== 'all'
                  ? 'Try clearing the search or switching filter tabs.'
                  : 'Get started by creating your first AI workflow pipeline.'}
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow-xs hover:bg-indigo-700 transition-all"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>Create Workflow</span>
              </button>
            </div>
          ) : (
            filteredWorkflows.map((wf) => {
              const steps = parseSteps(wf.steps);
              const isSelected = selectedWf?.id === wf.id;
              const pill = triggerPillStyles[wf.trigger_type] || triggerPillStyles.manual;

              return (
                <div
                  key={wf.id}
                  onClick={() => setSelectedWf(wf)}
                  className={`bg-white border rounded-2xl p-4.5 transition-all cursor-pointer relative shadow-xs hover:shadow-sm ${
                    isSelected
                      ? 'border-indigo-600 ring-2 ring-indigo-600/15'
                      : 'border-gray-200/80 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(wf.id)}
                      onChange={() => toggleSelect(wf.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />

                    <div className="flex-1 min-w-0">
                      {/* Title & Badges */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-gray-900 tracking-tight truncate">
                            {wf.name}
                          </h3>
                          {wf.tenant_name && (
                            <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                              {wf.tenant_name}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Status */}
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              wf.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                wf.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                            />
                            {wf.status === 'active' ? 'Active' : 'Paused'}
                          </span>

                          {/* Trigger */}
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${pill.bg} ${pill.text} ${pill.border}`}
                          >
                            {wf.trigger_type}
                          </span>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                        {wf.description || 'No description provided.'}
                      </p>

                      {/* Mini Step Flow Preview */}
                      {steps.length > 0 && (
                        <div className="flex items-center flex-wrap gap-1.5 mt-2.5">
                          {steps.slice(0, 4).map((s: any, idx: number) => {
                            const conf = stepTypeConfig[s.type] || stepTypeConfig.prompt;
                            return (
                              <span
                                key={idx}
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${conf.bg} ${conf.color} ${conf.border} flex items-center gap-1`}
                              >
                                <span>#{idx + 1}</span>
                                <span>{conf.label}</span>
                              </span>
                            );
                          })}
                          {steps.length > 4 && (
                            <span className="text-[10px] font-semibold text-gray-400">
                              +{steps.length - 4} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Metrics bar */}
                      <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-gray-100 text-center">
                        <div>
                          <div className="text-[10px] text-gray-400 font-medium">Runs</div>
                          <div className="text-xs font-bold text-gray-900 mt-0.5">
                            {wf.execution_count || wf.total_runs || 0}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-400 font-medium">Success</div>
                          <div className="text-xs font-bold text-emerald-600 mt-0.5">
                            {wf.success_rate ? `${wf.success_rate}%` : '—'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-400 font-medium">Avg Duration</div>
                          <div className="text-xs font-bold text-indigo-600 mt-0.5">
                            {wf.avg_duration_ms ? fmtDuration(wf.avg_duration_ms) : '—'}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-gray-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            runWorkflow(wf.id);
                          }}
                          disabled={running === wf.id}
                          className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200/80 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all disabled:opacity-60 shadow-2xs"
                        >
                          {running === wf.id ? (
                            <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                          ) : (
                            <Play className="w-3 h-3 text-indigo-600 fill-current" />
                          )}
                          <span>Run</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFullCanvasModal(wf);
                          }}
                          className="flex items-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shadow-2xs"
                          title="Open Visual DAG Studio"
                        >
                          <Network className="w-3 h-3 text-gray-500" />
                          <span>Studio</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStatus(wf);
                          }}
                          className="flex items-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shadow-2xs"
                        >
                          {wf.status === 'active' ? (
                            <ToggleRight className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <ToggleLeft className="w-3.5 h-3.5 text-gray-400" />
                          )}
                          <span>{wf.status === 'active' ? 'Pause' : 'Enable'}</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm(wf.id);
                          }}
                          className="p-1 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-all ml-auto"
                          title="Delete Workflow"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Detail & Telemetry Panel (7 cols) */}
        <div className="lg:col-span-7">
          {selectedWf ? (
            <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-xs space-y-4 sticky top-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-extrabold text-gray-900 tracking-tight">
                      {selectedWf.name}
                    </h2>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        selectedWf.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {selectedWf.status === 'active' ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{selectedWf.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => runWorkflow(selectedWf.id)}
                    disabled={running === selectedWf.id}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-xs disabled:opacity-60 transition-all"
                  >
                    {running === selectedWf.id ? (
                      <Loader2 className="w-3 h-3 animate-spin text-white" />
                    ) : (
                      <Play className="w-3 h-3 text-white fill-current" />
                    )}
                    <span>Execute</span>
                  </button>

                  <button
                    onClick={() => setFullCanvasModal(selectedWf)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-all rounded-xl border border-indigo-200"
                    title="Fullscreen Visual Studio"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Studio</span>
                  </button>

                  {executions.length > 0 && (
                    <button
                      onClick={exportExecutions}
                      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl border border-gray-200 transition-all"
                      title="Export telemetry JSON"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => fetchExecutions(selectedWf.id)}
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl border border-gray-200 transition-all"
                    title="Refresh telemetry"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Segmented Tabs */}
              <div className="flex border-b border-gray-200 gap-6 text-xs font-semibold">
                <button
                  onClick={() => setDetailTab('timeline')}
                  className={`pb-2.5 transition-all border-b-2 flex items-center gap-1.5 ${
                    detailTab === 'timeline'
                      ? 'border-indigo-600 text-indigo-600 font-bold'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Pipeline & Telemetry ({executionTotal})</span>
                </button>

                <button
                  onClick={() => setDetailTab('canvas')}
                  className={`pb-2.5 transition-all border-b-2 flex items-center gap-1.5 ${
                    detailTab === 'canvas'
                      ? 'border-indigo-600 text-indigo-600 font-bold'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Network className="w-3.5 h-3.5" />
                  <span>Interactive Node Canvas</span>
                </button>

                <button
                  onClick={() => setDetailTab('api')}
                  className={`pb-2.5 transition-all border-b-2 flex items-center gap-1.5 ${
                    detailTab === 'api'
                      ? 'border-indigo-600 text-indigo-600 font-bold'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Webhook & Test Runner</span>
                </button>
              </div>

              {/* Tab 1: Pipeline & Telemetry Logs */}
              {detailTab === 'timeline' && (
                <div className="space-y-4">
                  {/* Pipeline Steps summary card */}
                  <div className="bg-gray-50/70 border border-gray-200/70 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Configured Pipeline Sequence
                      </span>
                      <span className="text-[10px] text-gray-500 font-semibold">
                        Trigger: <strong className="text-gray-800 uppercase">{selectedWf.trigger_type}</strong>
                        {selectedWf.cron_expression && ` (${selectedWf.cron_expression})`}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {parseSteps(selectedWf.steps).map((step: any, idx: number) => {
                        const conf = stepTypeConfig[step.type] || stepTypeConfig.prompt;
                        const StepIcon = conf.icon;
                        return (
                          <div
                            key={idx}
                            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border ${conf.bg} ${conf.color} ${conf.border}`}
                          >
                            <StepIcon className="w-3 h-3" />
                            <span>#{idx + 1} {conf.label}</span>
                            {step.value && (
                              <span className="text-gray-500 text-[10px] font-normal truncate max-w-[140px]">
                                — {step.value}
                              </span>
                            )}
                          </div>
                        );
                      })}
                      {parseSteps(selectedWf.steps).length === 0 && (
                        <span className="text-xs text-gray-400 italic">No steps configured yet</span>
                      )}
                    </div>
                  </div>

                  {/* Execution Telemetry History List */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
                      <span>Recent Execution Runs</span>
                      <span>{executions.length} recorded</span>
                    </div>

                    <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                      {executions.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 text-xs">
                          <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          No execution records yet. Click Execute above to run this pipeline.
                        </div>
                      ) : (
                        executions.map((ex) => {
                          const isExpanded = selectedExec?.id === ex.id;
                          const stepResults = parseSteps(ex.step_results);
                          return (
                            <div
                              key={ex.id}
                              onClick={() => setSelectedExec(isExpanded ? null : ex)}
                              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                                isExpanded
                                  ? 'bg-indigo-50/20 border-indigo-200'
                                  : 'bg-white border-gray-200/80 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  {ex.status === 'completed' ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                  ) : ex.status === 'failed' ? (
                                    <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                                  ) : (
                                    <Loader2 className="w-4 h-4 text-indigo-500 animate-spin shrink-0" />
                                  )}
                                  <span
                                    className={`text-xs font-bold uppercase tracking-wider ${
                                      ex.status === 'completed'
                                        ? 'text-emerald-700'
                                        : ex.status === 'failed'
                                        ? 'text-rose-700'
                                        : 'text-indigo-700'
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

                                <div className="text-xs font-mono font-bold text-gray-900">
                                  {ex.duration_ms ? fmtDuration(ex.duration_ms) : '—'}
                                </div>
                              </div>

                              <div className="text-[11px] text-gray-400 font-medium mt-1">
                                {fmtTime(ex.started_at)}
                              </div>

                              {/* Expanded results and logs */}
                              {isExpanded && (
                                <div className="mt-3 pt-3 border-t border-dashed border-gray-200 space-y-3">
                                  {/* Step breakdown */}
                                  {stepResults.length > 0 && (
                                    <div className="space-y-1.5">
                                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                        Step Execution Breakdown
                                      </div>
                                      {stepResults.map((sr: any, sIdx: number) => {
                                        const conf = stepTypeConfig[sr.type] || stepTypeConfig.prompt;
                                        return (
                                          <div key={sIdx} className="bg-gray-50 border border-gray-200/80 rounded-lg p-2.5">
                                            <div className="flex items-center justify-between mb-1">
                                              <span className={`text-xs font-semibold ${conf.color}`}>
                                                Step {sIdx + 1}: {conf.label}
                                              </span>
                                              <div className="flex items-center gap-1.5">
                                                {sr.status === 'completed' ? (
                                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                                ) : sr.status === 'failed' ? (
                                                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                                                ) : (
                                                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                                                )}
                                                <span className="text-[10px] font-mono text-gray-500">
                                                  {sr.durationMs ? `${sr.durationMs}ms` : '—'}
                                                </span>
                                              </div>
                                            </div>
                                            {sr.output && (
                                              <pre className="text-[10px] text-gray-700 bg-white border border-gray-200 rounded p-2 overflow-x-auto max-h-[80px] font-mono">
                                                {typeof sr.output === 'object'
                                                  ? JSON.stringify(sr.output, null, 2)
                                                  : String(sr.output)}
                                              </pre>
                                            )}
                                            {sr.error && (
                                              <div className="text-[10px] text-rose-600 bg-rose-50 rounded p-1.5 mt-1 font-semibold border border-rose-100">
                                                {sr.error}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* Raw logs */}
                                  {ex.logs && (
                                    <div>
                                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                        Execution Log Output
                                      </div>
                                      <pre className="bg-slate-900 text-slate-100 p-3 rounded-xl text-[10px] font-mono overflow-x-auto whitespace-pre-wrap max-h-[140px] leading-relaxed">
                                        {typeof ex.logs === 'string' ? ex.logs : JSON.stringify(ex.logs, null, 2)}
                                      </pre>
                                    </div>
                                  )}

                                  {ex.error_message && (
                                    <div className="bg-rose-50 text-rose-700 p-2.5 rounded-xl text-xs font-semibold border border-rose-200">
                                      ⚠️ {ex.error_message}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Interactive DAG Canvas */}
              {detailTab === 'canvas' && (
                <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-xs h-[480px]">
                  <AdminVisualWorkflowEditor
                    workflow={selectedWf}
                    latestExecution={selectedExec || executions[0]}
                    onSave={(data: any) => handleSaveFromCanvas(selectedWf.id, data)}
                    onRun={() => runWorkflow(selectedWf.id)}
                    isRunning={running === selectedWf.id}
                  />
                </div>
              )}

              {/* Tab 3: Webhook & Interactive Test Runner */}
              {detailTab === 'api' && (
                <div className="space-y-4">
                  {/* Endpoint URL */}
                  <div className="bg-gray-50 border border-gray-200/80 rounded-xl p-3.5 space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Inbound Webhook Trigger URL
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={
                          typeof window !== 'undefined'
                            ? `${window.location.origin}/api/workflows/${selectedWf.id}/trigger`
                            : `/api/workflows/${selectedWf.id}/trigger`
                        }
                        className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-mono text-gray-800 outline-none"
                      />
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/api/workflows/${selectedWf.id}/trigger`;
                          navigator.clipboard.writeText(url);
                          setCopiedUrl(true);
                          setTimeout(() => setCopiedUrl(false), 2000);
                          showToast('success', 'Webhook URL copied to clipboard');
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-100 rounded-lg text-xs font-semibold text-gray-700 transition-all shadow-2xs"
                      >
                        {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Test Runner */}
                  <div className="border border-gray-200/80 rounded-xl p-4 space-y-3 bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-bold text-gray-900">Interactive Webhook Test Runner</span>
                      </div>
                      <button
                        onClick={handleTestWebhook}
                        disabled={testingWebhook}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-60 transition-all"
                      >
                        {testingWebhook ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                        ) : (
                          <Send className="w-3.5 h-3.5 text-white" />
                        )}
                        <span>Dispatch Test Payload</span>
                      </button>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-gray-400 mb-1 block">
                        JSON Request Payload
                      </label>
                      <textarea
                        rows={4}
                        value={testPayload}
                        onChange={(e) => setTestPayload(e.target.value)}
                        className="w-full font-mono text-xs p-2.5 bg-slate-900 text-emerald-400 rounded-xl border border-gray-700 outline-none"
                      />
                    </div>

                    {testResult && (
                      <div
                        className={`p-3 rounded-xl border text-xs font-mono space-y-1 ${
                          testResult.ok
                            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                            : 'bg-rose-50/60 border-rose-200 text-rose-900'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span>
                            HTTP {testResult.status} {testResult.ok ? 'OK' : 'Error'}
                          </span>
                          <span>Latency: {testResult.durationMs}ms</span>
                        </div>
                        <pre className="text-[10px] overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(testResult.data || testResult.error, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-gray-200/80 rounded-2xl p-12 text-center text-gray-400 shadow-xs flex flex-col items-center justify-center">
              <Workflow className="w-12 h-12 text-gray-300 mb-3" />
              <h3 className="text-sm font-bold text-gray-700 mb-1">No Workflow Selected</h3>
              <p className="text-xs text-gray-400 max-w-sm">
                Select a workflow from the list to view its pipeline execution telemetry, step details, and interactive DAG canvas.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── 5. Create Workflow Modal (Centered Backdrop Dialog) ───────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 my-8 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                  <Workflow className="w-5 h-5 text-indigo-600" />
                  <span>Create Automation Pipeline</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Configure trigger mechanism, tenant scope, and multi-step pipeline actions.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Preset Selector Chips */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                ⚡ Or Start With An AI Preset
              </label>
              <div className="flex flex-wrap gap-2">
                {PRESET_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleApplyPreset(tmpl)}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>{tmpl.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={createWorkflow} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">Workflow Name *</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Customer Support Auto-Router"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">Target Tenant Scope</label>
                  <select
                    value={form.tenant_id}
                    onChange={(e) => setForm({ ...form, tenant_id: e.target.value })}
                    className="w-full border border-gray-200 bg-white rounded-xl px-3 py-2 text-xs text-gray-800 outline-none focus:border-indigo-500"
                  >
                    <option value="">Global / All Tenants</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Description</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Summarize what this pipeline automates..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Trigger Type Selection Cards */}
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Trigger Mechanism</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'manual', label: 'Manual Run', desc: 'Trigger on-demand', icon: Play },
                    { id: 'webhook', label: 'Webhook', desc: 'Inbound HTTP POST', icon: Webhook },
                    { id: 'cron', label: 'Scheduled Cron', desc: 'Automated recurring', icon: Clock },
                    { id: 'event', label: 'System Event', desc: 'Internal message bus', icon: Zap },
                  ].map((t) => {
                    const TriggerIcon = t.icon;
                    const isSelected = form.trigger_type === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setForm({ ...form, trigger_type: t.id })}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-indigo-50/70 border-indigo-600 ring-2 ring-indigo-600/15'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <TriggerIcon className={`w-4 h-4 mb-1.5 ${isSelected ? 'text-indigo-600' : 'text-gray-400'}`} />
                        <div className={`text-xs font-bold ${isSelected ? 'text-indigo-900' : 'text-gray-800'}`}>
                          {t.label}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{t.desc}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Cron schedule picker */}
                {form.trigger_type === 'cron' && (
                  <div className="mt-2.5 p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                    <label className="text-xs font-semibold text-gray-700 block">Cron Expression</label>
                    <div className="flex gap-2">
                      <input
                        value={form.cron_expression}
                        onChange={(e) => setForm({ ...form, cron_expression: e.target.value })}
                        placeholder="0 * * * * (Every hour)"
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-mono bg-white"
                      />
                      {[
                        { label: 'Hourly', val: '0 * * * *' },
                        { label: 'Daily (6 AM)', val: '0 6 * * *' },
                        { label: 'Weekly', val: '0 0 * * 0' },
                      ].map((cp) => (
                        <button
                          key={cp.label}
                          type="button"
                          onClick={() => setForm({ ...form, cron_expression: cp.val })}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100"
                        >
                          {cp.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Step Pipeline Builder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-700">
                    Pipeline Steps ({form.steps.length})
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        steps: [...form.steps, { id: Date.now(), type: 'prompt', value: '' }],
                      })
                    }
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg transition-all"
                  >
                    + Add Step
                  </button>
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {form.steps.map((step: any, idx: number) => (
                    <div
                      key={step.id}
                      className="flex items-center gap-2 bg-gray-50 border border-gray-200/80 rounded-xl p-2.5"
                    >
                      <span className="text-xs font-bold text-gray-400 w-5 shrink-0">#{idx + 1}</span>

                      <select
                        value={step.type}
                        onChange={(e) => {
                          const updated = [...form.steps];
                          updated[idx] = { ...updated[idx], type: e.target.value };
                          setForm({ ...form, steps: updated });
                        }}
                        className="border border-gray-200 bg-white rounded-lg px-2.5 py-1.5 text-xs text-gray-700 font-medium shrink-0"
                      >
                        <option value="prompt">AI Prompt</option>
                        <option value="webhook">Webhook</option>
                        <option value="email">Email</option>
                        <option value="rag_search">RAG Search</option>
                        <option value="filter">Filter Logic</option>
                        <option value="agent">Sub-Agent</option>
                      </select>

                      <input
                        value={step.value || ''}
                        onChange={(e) => {
                          const updated = [...form.steps];
                          updated[idx] = { ...updated[idx], value: e.target.value };
                          setForm({ ...form, steps: updated });
                        }}
                        className="flex-1 border border-gray-200 bg-white rounded-lg px-2.5 py-1.5 text-xs text-gray-800 outline-none focus:border-indigo-500"
                        placeholder="Instruction, prompt, or endpoint..."
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setForm({ ...form, steps: form.steps.filter((_, i) => i !== idx) })
                        }
                        className="text-gray-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-all shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-xs disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  ) : (
                    <Check className="w-3.5 h-3.5 text-white" />
                  )}
                  <span>Create Pipeline</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 6. Preset Templates Library Modal ─────────────────────────────── */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  <span>Workflow Templates Library</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Pre-configured production pipelines ready to deploy across your tenants.
                </p>
              </div>
              <button onClick={() => setShowTemplateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PRESET_TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="border border-gray-200 rounded-2xl p-4 bg-white hover:border-indigo-300 hover:shadow-sm transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                        {tmpl.badge}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        {tmpl.trigger_type}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 mb-1">{tmpl.name}</h3>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-3">{tmpl.description}</p>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {tmpl.steps.map((st, i) => {
                        const conf = stepTypeConfig[st.type] || stepTypeConfig.prompt;
                        return (
                          <span
                            key={i}
                            className={`text-[9px] font-semibold px-2 py-0.5 rounded border ${conf.bg} ${conf.color} ${conf.border}`}
                          >
                            {i + 1}. {conf.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    onClick={() => handleApplyPreset(tmpl)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-xl text-xs font-semibold border border-indigo-200 hover:border-indigo-600 transition-all shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Use Template</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 7. Fullscreen Visual Studio DAG Modal ──────────────────────────── */}
      {fullCanvasModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md p-6 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Network className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white leading-tight">
                  {fullCanvasModal.name} — Visual DAG Studio
                </h2>
                <p className="text-xs text-slate-400">
                  Interactive node-graph workflow canvas with dynamic branching and real-time execution telemetry.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => runWorkflow(fullCanvasModal.id)}
                disabled={running === fullCanvasModal.id}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-xs rounded-xl transition shadow-sm disabled:opacity-60"
              >
                {running === fullCanvasModal.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
                <span>Test Run DAG</span>
              </button>

              <button
                onClick={() => setFullCanvasModal(null)}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition border border-white/10"
              >
                Close Studio
              </button>
            </div>
          </div>

          <div className="flex-1 relative rounded-2xl overflow-hidden border border-white/10">
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

      {/* ── 8. Delete Confirmation Modal ─────────────────────────────────── */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl border border-gray-100 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Delete Workflow Pipeline?</h3>
              <p className="text-xs text-gray-500 mt-1">
                This will permanently delete the pipeline and all associated execution logs.
              </p>
            </div>
            <div className="flex gap-2.5 justify-center pt-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-all shadow-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteWorkflow(deleteConfirm)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-all shadow-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 9. Bulk Action Confirmation Modal ─────────────────────────────── */}
      {showBulkConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl border border-gray-100 space-y-4">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 capitalize">
                {showBulkConfirm} {selectedIds.size} Pipelines?
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                This action will be applied to all {selectedIds.size} selected workflows.
              </p>
            </div>
            <div className="flex gap-2.5 justify-center pt-2">
              <button
                onClick={() => setShowBulkConfirm(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-all shadow-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => handleBulkAction(showBulkConfirm)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all shadow-xs ${
                  showBulkConfirm === 'delete'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
