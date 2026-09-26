import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { withAuth } from '../components/withAuth';
import DashboardShell from '../components/layout/DashboardShell';
import { authenticatedFetch, getApiConfig } from '../components/settings/apiHelper';
import { useToast } from '../context/ToastContext';
import {
  Workflow,
  Plus,
  Play,
  Clock,
  Zap,
  Activity,
  Layers,
  Sparkles,
  GitBranch,
  Network,
  Cpu,
  Bot,
  Webhook,
  Mail,
  Database,
  Filter,
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  Pencil,
  Trash2,
  History,
  X,
  ChevronRight,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Code,
  Terminal,
  ShieldCheck,
  Pause,
  FileText,
  Send,
} from 'lucide-react';

const VisualWorkflowEditor = dynamic(
  () => import('../components/workflow/VisualWorkflowEditor'),
  {
    ssr: false,
    loading: () => (
      <div style={{
        height: '600px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#070b14',
        color: '#94a3b8',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
          <RefreshCw className="spin" size={18} />
          <span>Loading Visual Node Canvas...</span>
        </div>
      </div>
    ),
  }
);

function WorkflowsPage() {
  const router = useRouter();
  const toast = useToast();
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Visual Studio (DAG Node Canvas) State
  const [fullCanvasWorkflow, setFullCanvasWorkflow] = useState(null);
  const [canvasExecution, setCanvasExecution] = useState(null);

  // Editor / Modal State
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState('manual');
  const [cronExpression, setCronExpression] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [status, setStatus] = useState('active');
  const [steps, setSteps] = useState([]);
  const [saving, setSaving] = useState(false);

  // Template Library Modal State
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Webhook Test Runner Modal State
  const [webhookTestWf, setWebhookTestWf] = useState(null);
  const [testPayload, setTestPayload] = useState('{\n  "event": "customer.created",\n  "customer": {\n    "id": "cust_123",\n    "name": "Alex Smith",\n    "email": "alex@example.com"\n  }\n}');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, paused, webhook, cron, manual

  // Execution History State
  const [selectedWorkflowForHistory, setSelectedWorkflowForHistory] = useState(null);
  const [executions, setExecutions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Run State
  const [runningWorkflowId, setRunningWorkflowId] = useState(null);
  const [copiedWebhookId, setCopiedWebhookId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

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
      icon: Bot,
      color: '#818cf8',
      badge: 'Support & CRM',
      steps: [
        { id: 1, type: 'filter', value: 'Filter: Check if request payload contains customer email & message' },
        { id: 2, type: 'prompt', value: 'Classify intent (Billing, Technical, Account) and draft high-priority reply' },
        { id: 3, type: 'email', value: 'Dispatch transactional notification to support@xarwiz.com' },
        { id: 4, type: 'webhook', value: 'https://httpbin.org/post' },
      ],
    },
    {
      id: 'template_rag_sync',
      name: 'Daily Knowledge Base Vector Sync',
      description: 'Scrape workspace document repositories every morning and re-index embeddings into PgVector.',
      trigger_type: 'cron',
      cron_expression: '0 6 * * *',
      status: 'active',
      icon: Database,
      color: '#f472b6',
      badge: 'RAG & Vector Search',
      steps: [
        { id: 1, type: 'rag_search', value: 'Latest platform features, billing questions, and API docs' },
        { id: 2, type: 'prompt', value: 'Extract key entity summaries and chunk text into 512-token segments' },
        { id: 3, type: 'prompt', value: 'Verify index consistency across all tenant document tables' },
      ],
    },
    {
      id: 'template_doc_summarizer',
      name: 'Autonomous Document Summarizer & Mailer',
      description: 'Extract text from new uploaded documents, summarize key points, and email summary to team.',
      trigger_type: 'manual',
      status: 'active',
      icon: FileText,
      color: '#34d399',
      badge: 'Document Automation',
      steps: [
        { id: 1, type: 'rag_search', value: 'Summary of executive contract and enterprise SLA terms' },
        { id: 2, type: 'prompt', value: 'Summarize uploaded document in 3 executive bullet points and action items' },
        { id: 3, type: 'email', value: 'team-leads@xarwiz.com' },
      ],
    },
    {
      id: 'template_slack_bot',
      name: 'Slack & Discord Sentiment Alert Bot',
      description: 'Monitor incoming feedback webhooks, analyze sentiment score, and alert Slack on urgent negative sentiment.',
      trigger_type: 'webhook',
      status: 'active',
      icon: AlertCircle,
      color: '#fbbf24',
      badge: 'Monitoring & Alerts',
      steps: [
        { id: 1, type: 'prompt', value: 'Analyze text sentiment (Positive, Neutral, Negative) and score 1-10' },
        { id: 2, type: 'filter', value: 'Negative' },
        { id: 3, type: 'webhook', value: 'https://httpbin.org/post' },
      ],
    },
  ];

  useEffect(() => {
    const { apiBase: base, tenantSlug: tenant } = getApiConfig();
    setApiBase(base);
    setTenantSlug(tenant);
    fetchWorkflows(base, tenant);
  }, []);

  const fetchWorkflows = async (base = apiBase, tenant = tenantSlug) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${base}/api/workflows`, {
        credentials: 'include',
        headers: {
          'x-tenant-slug': tenant || 'system',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setWorkflows(Array.isArray(data) ? data : []);
      } else {
        setWorkflows([]);
        setError('Failed to load workflows. Please try again.');
      }
    } catch (err) {
      console.error('Fetch workflows error:', err);
      setWorkflows([]);
      setError('Unable to connect to the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunWorkflow = async (wf) => {
    setRunningWorkflowId(wf.id);
    let sseSource = null;
    try {
      const res = await fetch(`${apiBase}/api/workflows/${wf.id}/run`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to run workflow');

      const execId = data.executionId || data.id;
      if (!execId) {
        setCanvasExecution(data);
        setRunningWorkflowId(null);
        toast.success(`Workflow "${wf.name}" triggered`);
        return;
      }

      setCanvasExecution({
        id: execId,
        workflow_id: wf.id,
        status: data.status || 'queued',
        started_at: new Date().toISOString(),
        nodeStates: {},
        activeNodeId: null,
        activeEdgeTarget: null,
        nodeExecutions: [],
        step_results: [],
      });

      const sseUrl = `${apiBase}/api/v1/workflows/${wf.id}/executions/${execId}/events`;
      sseSource = new EventSource(sseUrl, { withCredentials: true });

      const finalizeAndFetchCheckpoints = async (finalStatus = null) => {
        if (sseSource) {
          sseSource.close();
          sseSource = null;
        }
        try {
          const detailRes = await fetch(`${apiBase}/api/v1/workflows/${wf.id}/executions/${execId}`, {
            credentials: 'include',
            headers: {
              'x-tenant-slug': tenantSlug,
            },
          });
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            if (detailData.success && detailData.execution) {
              setCanvasExecution((prev) => ({
                ...detailData.execution,
                nodeExecutions: detailData.nodeExecutions || [],
                nodeStates: prev?.nodeStates || {},
                activeNodeId: null,
                activeEdgeTarget: null,
              }));

              const dur = detailData.execution.duration_ms || 0;
              const isSuccess = detailData.execution.status === 'completed';
              if (isSuccess) {
                toast.success(`Workflow "${wf.name}" completed in ${dur}ms`);
              } else {
                toast.error(`Workflow finished with status "${detailData.execution.status}"`);
              }
            }
          }
        } catch (detailErr) {
          console.error('Error fetching final execution checkpoints:', detailErr);
        } finally {
          setRunningWorkflowId(null);
          fetchWorkflows(apiBase, tenantSlug);
          if (selectedWorkflowForHistory && selectedWorkflowForHistory.id === wf.id) {
            handleFetchExecutions(wf);
          }
        }
      };

      sseSource.onmessage = (event) => {
        try {
          const evt = JSON.parse(event.data);
          if (!evt || !evt.event) return;

          if (evt.event === 'node.started') {
            setCanvasExecution((prev) => ({
              ...prev,
              status: 'running',
              activeNodeId: evt.nodeId,
              activeEdgeTarget: evt.nodeId,
              nodeStates: {
                ...(prev?.nodeStates || {}),
                [evt.nodeId]: {
                  status: 'running',
                  nodeType: evt.nodeType,
                  startedAt: evt.timestamp,
                },
              },
            }));
          } else if (evt.event === 'node.completed') {
            setCanvasExecution((prev) => ({
              ...prev,
              activeNodeId: null,
              activeEdgeTarget: null,
              nodeStates: {
                ...(prev?.nodeStates || {}),
                [evt.nodeId]: {
                  status: 'completed',
                  output: evt.data?.output,
                  durationMs: evt.data?.durationMs,
                },
              },
            }));
          } else if (evt.event === 'node.failed') {
            setCanvasExecution((prev) => ({
              ...prev,
              activeNodeId: null,
              activeEdgeTarget: null,
              nodeStates: {
                ...(prev?.nodeStates || {}),
                [evt.nodeId]: {
                  status: 'failed',
                  error: evt.data?.error || 'Node execution failed',
                },
              },
            }));
          } else if (evt.event === 'execution.completed' || evt.event === 'execution.failed') {
            finalizeAndFetchCheckpoints(evt.event === 'execution.completed' ? 'completed' : 'failed');
          }
        } catch (err) {
          console.error('Failed to parse SSE execution event:', err);
        }
      };

      sseSource.onerror = (err) => {
        console.warn('SSE stream closed or interrupted; fetching durable checkpoints:', err);
        finalizeAndFetchCheckpoints();
      };
    } catch (err) {
      if (sseSource) sseSource.close();
      setRunningWorkflowId(null);
      toast.error(`Run failed: ${err.message}`);
    }
  };

  const handleSaveFromCanvas = async ({ steps: compiledSteps, definition }) => {
    if (!fullCanvasWorkflow) return;
    try {
      const isNewWf = String(fullCanvasWorkflow.id).startsWith('new_');
      const url = isNewWf ? `${apiBase}/api/workflows` : `${apiBase}/api/workflows/${fullCanvasWorkflow.id}`;
      const method = isNewWf ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
        },
        body: JSON.stringify({
          name: fullCanvasWorkflow.name || 'Visual Workflow',
          description: fullCanvasWorkflow.description || 'Built with Visual Node Studio',
          trigger_type: fullCanvasWorkflow.trigger_type || 'manual',
          cron_expression: fullCanvasWorkflow.cron_expression || null,
          status: 'active',
          steps: compiledSteps,
          definition,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save workflow canvas');
      }

      const savedWf = await res.json();
      if (isNewWf) setFullCanvasWorkflow(savedWf);

      toast.success('Visual workflow canvas saved');
      fetchWorkflows(apiBase, tenantSlug);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleOpenNew = () => {
    setIsNew(true);
    setEditingWorkflow({});
    setName('');
    setDescription('');
    setTriggerType('manual');
    setCronExpression('');
    setWebhookSecret('');
    setStatus('active');
    setSteps([{ id: 1, type: 'prompt', value: 'Analyze input and generate structured response using LLM' }]);
  };

  const handleApplyTemplate = (template) => {
    setIsNew(true);
    setEditingWorkflow({});
    setName(template.name);
    setDescription(template.description);
    setTriggerType(template.trigger_type);
    setCronExpression(template.cron_expression || '');
    setWebhookSecret('');
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
    setCronExpression(wf.cron_expression || '');
    setWebhookSecret(wf.webhook_secret || '');
    setStatus(wf.status || 'active');
    setSteps(Array.isArray(wf.steps) ? wf.steps : (typeof wf.steps === 'string' ? JSON.parse(wf.steps || '[]') : []));
  };

  const handleAddStep = () => {
    setSteps([...steps, { id: Date.now(), type: 'prompt', value: '' }]);
  };

  const handleStepChange = (id, field, val) => {
    setSteps(steps.map(s => (s.id === id ? { ...s, [field]: val } : s)));
  };

  const handleRemoveStep = (id) => {
    setSteps(steps.filter(s => s.id !== id));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
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
          cron_expression: cronExpression || null,
          webhook_secret: webhookSecret || null,
          status,
          steps,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save workflow');
      }

      setEditingWorkflow(null);
      toast.success(isNew ? 'Workflow created' : 'Workflow updated');
      fetchWorkflows(apiBase, tenantSlug);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    setDeleteConfirm(id);
  };

  const handleConfirmDelete = async () => {
    const id = deleteConfirm;
    setDeleteConfirm(null);
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
      toast.success('Workflow deleted');
      fetchWorkflows(apiBase, tenantSlug);
    } catch (err) {
      toast.error(err.message);
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
      setExecutions(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(`Failed to load history: ${err.message}`);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCopyWebhook = (wfId) => {
    const url = typeof window !== 'undefined'
      ? `${window.location.origin}/api/workflows/${wfId}/trigger`
      : `/api/workflows/${wfId}/trigger`;
    navigator.clipboard.writeText(url);
    setCopiedWebhookId(wfId);
    toast.success('Webhook URL copied to clipboard');
    setTimeout(() => setCopiedWebhookId(null), 3000);
  };

  const handleSendTestWebhook = async () => {
    if (!webhookTestWf) return;
    setSendingTest(true);
    setTestResult(null);
    try {
      let parsedBody = {};
      try {
        parsedBody = JSON.parse(testPayload);
      } catch {
        throw new Error('Invalid JSON format in test payload');
      }
      const t0 = Date.now();
      const res = await fetch(`${apiBase}/api/workflows/${webhookTestWf.id}/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
        },
        body: JSON.stringify(parsedBody),
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
        toast.success(`Webhook triggered (${res.status} OK in ${dur}ms)`);
        fetchWorkflows(apiBase, tenantSlug);
      } else {
        toast.error(`Webhook returned status ${res.status}: ${data.error || 'Failed'}`);
      }
    } catch (err) {
      setTestResult({
        status: 0,
        ok: false,
        error: err.message,
      });
      toast.error(err.message);
    } finally {
      setSendingTest(false);
    }
  };

  const getCronDescription = (expr) => {
    if (!expr) return 'Specify a 5-part cron pattern (Minute Hour Day Month Day-of-week)';
    const clean = expr.trim();
    if (clean === '*/15 * * * *') return 'Runs every 15 minutes';
    if (clean === '0 * * * *') return 'Runs every hour at minute 0';
    if (clean === '0 9 * * *') return 'Runs daily at 9:00 AM';
    if (clean === '0 0 * * *') return 'Runs daily at midnight (00:00)';
    if (clean === '0 6 * * *') return 'Runs daily at 6:00 AM';
    if (clean === '0 9 * * 1') return 'Runs every Monday at 9:00 AM';
    return `Cron schedule: ${clean}`;
  };

  const getStepBadgeInfo = (type) => {
    switch (type) {
      case 'prompt':
        return { label: 'AI Model', icon: Bot, color: '#818cf8' };
      case 'webhook':
        return { label: 'Webhook POST', icon: Webhook, color: '#fbbf24' };
      case 'email':
        return { label: 'Email Dispatch', icon: Mail, color: '#34d399' };
      case 'rag_search':
        return { label: 'Vector RAG', icon: Database, color: '#f472b6' };
      case 'filter':
        return { label: 'Logic Filter', icon: Filter, color: '#f87171' };
      default:
        return { label: 'Action', icon: Zap, color: '#a5b4fc' };
    }
  };

  // Filtered workflows based on search and status tabs
  const filteredWorkflows = useMemo(() => {
    return workflows.filter((wf) => {
      const matchesSearch =
        searchQuery === '' ||
        wf.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wf.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wf.trigger_type?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'all') return true;
      if (statusFilter === 'active') return wf.status === 'active';
      if (statusFilter === 'paused') return wf.status === 'paused';
      if (statusFilter === 'webhook') return wf.trigger_type === 'webhook';
      if (statusFilter === 'cron') return wf.trigger_type === 'cron';
      if (statusFilter === 'manual') return wf.trigger_type === 'manual';

      return true;
    });
  }, [workflows, searchQuery, statusFilter]);

  const activeCount = workflows.filter(w => w.status === 'active').length;
  const totalExecs = workflows.reduce((acc, w) => acc + (parseInt(w.execution_count || w.total_runs || 0, 10)), 0);
  const connectedTriggers = workflows.filter(w => w.trigger_type === 'webhook' || w.trigger_type === 'cron').length;

  const statCards = [
    { label: 'Active Workflows', value: String(activeCount), icon: Zap, color: '#34d399' },
    { label: 'Total Executions', value: String(totalExecs), icon: Activity, color: '#818cf8' },
    { label: 'Connected Triggers', value: String(connectedTriggers), icon: Webhook, color: '#fbbf24' },
    { label: 'Execution Engine', value: 'BullMQ', icon: Cpu, color: '#38bdf8' },
  ];

  return (
    <DashboardShell title="AI Automations">
      <Head>
        <title>AI Automations — Xarwiz</title>
      </Head>

      {/* ── User Panel Standard Header ───────────────────────────────── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <p style={{ color: 'var(--shell-text-secondary)', fontSize: '14px', margin: 0 }}>
          Create and orchestrate automated AI workflows, webhook triggers, and event pipelines
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowTemplateModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              backgroundColor: 'var(--shell-surface)',
              color: 'var(--shell-text-secondary)',
              border: '1px solid var(--shell-card-border)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              transition: 'all 0.15s ease',
            }}
          >
            <Layers size={15} />
            <span>Templates</span>
          </button>

          <button
            onClick={() => {
              const newWf = {
                id: 'new_' + Date.now(),
                name: 'New Node Automation',
                description: 'Created with Visual Canvas',
                trigger_type: 'manual',
                status: 'active',
                steps: [],
              };
              setFullCanvasWorkflow(newWf);
              setCanvasExecution(null);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              backgroundColor: 'var(--shell-badge-bg)',
              color: '#818cf8',
              border: '1px solid rgba(99,102,241,0.25)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              transition: 'all 0.15s ease',
            }}
          >
            <Network size={15} />
            <span>Visual Canvas</span>
          </button>

          <button
            onClick={handleOpenNew}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: '#6366f1',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(99,102,241,0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            <Plus size={16} />
            <span>Create Workflow</span>
          </button>
        </div>
      </div>

      {/* ── User Panel Stat Cards (Matching Dashboard & Agents) ──────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}>
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              style={{
                padding: '20px',
                borderRadius: '12px',
                backgroundColor: 'var(--shell-surface)',
                border: '1px solid var(--shell-card-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', color: 'var(--shell-text-secondary)', fontWeight: 500 }}>
                  {card.label}
                </span>
                <Icon size={18} color={card.color} />
              </div>
              <p style={{ fontSize: '28px', fontWeight: 700, color: 'var(--shell-text)', margin: 0 }}>
                {card.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── Search & Filter Bar ────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        marginBottom: '20px',
        flexWrap: 'wrap',
      }}>
        <div style={{
          position: 'relative',
          flex: 1,
          minWidth: '240px',
          maxWidth: '420px',
        }}>
          <Search
            size={15}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--shell-text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search workflows by name, trigger..."
            style={{
              width: '100%',
              padding: '8px 32px 8px 36px',
              borderRadius: '8px',
              backgroundColor: 'var(--shell-surface)',
              border: '1px solid var(--shell-card-border)',
              color: 'var(--shell-text)',
              fontSize: '13px',
              outline: 'none',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--shell-text-muted)',
                cursor: 'pointer',
                padding: '2px',
              }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          backgroundColor: 'var(--shell-surface)',
          padding: '3px',
          borderRadius: '8px',
          border: '1px solid var(--shell-card-border)',
        }}>
          {[
            { id: 'all', label: 'All', count: workflows.length },
            { id: 'active', label: 'Active', count: activeCount },
            { id: 'webhook', label: 'Webhooks', count: workflows.filter(w => w.trigger_type === 'webhook').length },
            { id: 'cron', label: 'Scheduled', count: workflows.filter(w => w.trigger_type === 'cron').length },
            { id: 'manual', label: 'Manual', count: workflows.filter(w => w.trigger_type === 'manual').length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                backgroundColor: statusFilter === tab.id ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: statusFilter === tab.id ? '#818cf8' : 'var(--shell-text-secondary)',
              }}
            >
              <span>{tab.label}</span>
              <span style={{
                fontSize: '10px',
                padding: '1px 5px',
                borderRadius: '4px',
                backgroundColor: statusFilter === tab.id ? 'rgba(99,102,241,0.2)' : 'rgba(0,0,0,0.05)',
                fontWeight: 600,
              }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Workflows Content ──────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid rgba(99,102,241,0.2)',
            borderTopColor: '#6366f1',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: 'rgba(239,68,68,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <AlertCircle size={24} color="#f87171" />
          </div>
          <p style={{ color: '#f87171', fontSize: '14px', marginBottom: '12px' }}>{error}</p>
          <button
            onClick={() => fetchWorkflows(apiBase, tenantSlug)}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: 'rgba(99,102,241,0.15)',
              color: '#818cf8',
              border: '1px solid rgba(99,102,241,0.3)',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      ) : workflows.length === 0 ? (
        /* ── User Panel Styled Empty State ── */
        <div>
          <div style={{
            textAlign: 'center',
            padding: '48px 24px',
            backgroundColor: 'var(--shell-surface)',
            borderRadius: '12px',
            border: '1px solid var(--shell-card-border)',
            marginBottom: '24px',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'var(--shell-badge-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
            }}>
              <Workflow size={24} color="#818cf8" />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--shell-text)', margin: '0 0 6px 0' }}>
              No automated workflows yet
            </h3>
            <p style={{
              color: 'var(--shell-text-secondary)',
              fontSize: '13.5px',
              maxWidth: '460px',
              margin: '0 auto 20px auto',
              lineHeight: '1.5',
            }}>
              Create an automated workflow pipeline to orchestrate AI models, vector retrieval, and webhook actions.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={handleOpenNew}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#6366f1',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                <Plus size={16} /> Create Blank Workflow
              </button>
              <button
                onClick={() => setShowTemplateModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--shell-surface)',
                  color: 'var(--shell-text-secondary)',
                  border: '1px solid var(--shell-card-border)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                <Layers size={15} /> Browse Presets
              </button>
            </div>
          </div>

          {/* Quick Starter Templates in User Panel Card Style */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--shell-text)',
              margin: '0 0 14px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <Sparkles size={16} color="#fbbf24" />
              <span>Recommended Starter Templates</span>
            </h4>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px',
            }}>
              {PRESET_TEMPLATES.map((tmpl) => {
                const IconComponent = tmpl.icon;
                return (
                  <div
                    key={tmpl.id}
                    style={{
                      padding: '18px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--shell-surface)',
                      border: '1px solid var(--shell-card-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '10px',
                      }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          backgroundColor: `${tmpl.color}15`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <IconComponent size={16} color={tmpl.color} />
                        </div>
                        <span style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'var(--shell-badge-bg)',
                          color: '#a5b4fc',
                          fontWeight: 500,
                        }}>
                          {tmpl.badge}
                        </span>
                      </div>

                      <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--shell-text)', margin: '0 0 6px 0' }}>
                        {tmpl.name}
                      </h4>
                      <p style={{ fontSize: '12px', color: 'var(--shell-text-secondary)', margin: '0 0 14px 0', lineHeight: '1.45' }}>
                        {tmpl.description}
                      </p>

                      <div style={{
                        backgroundColor: 'var(--shell-input-bg, #f4f6f9)',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--shell-card-border)',
                        marginBottom: '14px',
                      }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {tmpl.steps.map((st, sIdx) => {
                            const badge = getStepBadgeInfo(st.type);
                            const StepIcon = badge.icon;
                            return (
                              <span
                                key={sIdx}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  fontSize: '10.5px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: 'var(--shell-surface)',
                                  color: 'var(--shell-text)',
                                  border: '1px solid var(--shell-card-border)',
                                }}
                              >
                                <StepIcon size={10} color={badge.color} />
                                {badge.label}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleApplyTemplate(tmpl)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '7px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 500,
                        backgroundColor: 'var(--shell-badge-bg)',
                        color: '#818cf8',
                        border: '1px solid rgba(99,102,241,0.25)',
                        cursor: 'pointer',
                        width: '100%',
                      }}
                    >
                      <span>Use Template</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : filteredWorkflows.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          backgroundColor: 'var(--shell-surface)',
          borderRadius: '12px',
          border: '1px solid var(--shell-card-border)',
        }}>
          <Filter size={32} color="var(--shell-text-muted)" style={{ margin: '0 auto 10px' }} />
          <p style={{ color: 'var(--shell-text)', fontSize: '14px', fontWeight: 600, margin: '0 0 6px 0' }}>
            No matching workflows
          </p>
          <p style={{ color: 'var(--shell-text-muted)', fontSize: '13px', margin: '0 0 16px 0' }}>
            No automations match your search filter "{searchQuery}".
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 500,
              backgroundColor: 'var(--shell-surface)',
              color: 'var(--shell-text-secondary)',
              border: '1px solid var(--shell-card-border)',
              cursor: 'pointer',
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        /* ── User Panel Styled Workflow Cards Grid ── */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '16px',
        }}>
          {filteredWorkflows.map((wf) => {
            let parsedSteps = [];
            try {
              parsedSteps = Array.isArray(wf.steps) ? wf.steps : (typeof wf.steps === 'string' ? JSON.parse(wf.steps) : []);
            } catch {
              parsedSteps = [];
            }

            const isWebhook = wf.trigger_type === 'webhook';
            const isCron = wf.trigger_type === 'cron';
            const isRunning = runningWorkflowId === wf.id;

            return (
              <div
                key={wf.id}
                style={{
                  padding: '20px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--shell-surface)',
                  border: '1px solid var(--shell-card-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  {/* Top Bar: Title, Trigger & Status */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '10px',
                  }}>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--shell-text)', margin: 0 }}>
                        {wf.name}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'var(--shell-badge-bg)',
                          color: '#a5b4fc',
                          fontWeight: 500,
                        }}>
                          {isWebhook ? <Webhook size={11} /> : isCron ? <Clock size={11} /> : <Play size={11} />}
                          <span>{wf.trigger_type?.toUpperCase() || 'MANUAL'}</span>
                        </span>
                        {isCron && wf.cron_expression && (
                          <span style={{
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            color: 'var(--shell-text-muted)',
                          }}>
                            {wf.cron_expression}
                          </span>
                        )}
                      </div>
                    </div>

                    <span style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontWeight: 500,
                      backgroundColor: wf.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                      color: wf.status === 'active' ? '#34d399' : '#fbbf24',
                    }}>
                      {wf.status || 'Active'}
                    </span>
                  </div>

                  <p style={{
                    fontSize: '13px',
                    color: 'var(--shell-text-secondary)',
                    margin: '0 0 14px 0',
                    lineHeight: '1.45',
                    minHeight: '36px',
                  }}>
                    {wf.description || 'No description provided.'}
                  </p>

                  {/* Step Sequence Preview */}
                  <div style={{
                    backgroundColor: 'var(--shell-input-bg, #f4f6f9)',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--shell-card-border)',
                    marginBottom: '14px',
                  }}>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      color: 'var(--shell-text-muted)',
                      display: 'block',
                      marginBottom: '6px',
                    }}>
                      Pipeline Nodes ({parsedSteps.length})
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {parsedSteps.length === 0 ? (
                        <span style={{ fontSize: '11px', color: 'var(--shell-text-muted)' }}>No steps configured</span>
                      ) : (
                        parsedSteps.map((step, idx) => {
                          const badge = getStepBadgeInfo(step.type);
                          const StepIcon = badge.icon;
                          return (
                            <span
                              key={idx}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: 'var(--shell-surface)',
                                color: 'var(--shell-text)',
                                border: '1px solid var(--shell-card-border)',
                              }}
                              title={step.value}
                            >
                              <StepIcon size={11} color={badge.color} />
                              <span>{idx + 1}. {badge.label}</span>
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Telemetry Stats Strip */}
                  <div style={{
                    display: 'flex',
                    gap: '16px',
                    fontSize: '12px',
                    color: 'var(--shell-text-muted)',
                    marginBottom: '14px',
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Play size={12} /> {wf.execution_count || wf.total_runs || 0} runs
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {wf.avg_duration_ms ? `${wf.avg_duration_ms}ms` : '—'}
                    </span>
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: wf.last_status === 'failed' ? '#f87171' : '#34d399',
                    }}>
                      <Activity size={12} /> {wf.last_status ? wf.last_status.toUpperCase() : 'READY'}
                    </span>
                  </div>

                  {/* Webhook copy & test runner actions */}
                  {isWebhook && (
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
                      <button
                        onClick={() => handleCopyWebhook(wf.id)}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: 500,
                          backgroundColor: copiedWebhookId === wf.id ? 'rgba(16,185,129,0.15)' : 'var(--shell-badge-bg)',
                          color: copiedWebhookId === wf.id ? '#34d399' : '#818cf8',
                          border: '1px solid var(--shell-card-border)',
                          cursor: 'pointer',
                        }}
                      >
                        {copiedWebhookId === wf.id ? (
                          <>
                            <Check size={12} />
                            <span>Webhook Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>Copy URL</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setWebhookTestWf(wf);
                          setTestResult(null);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: 500,
                          backgroundColor: 'rgba(99,102,241,0.12)',
                          color: '#818cf8',
                          border: '1px solid rgba(99,102,241,0.25)',
                          cursor: 'pointer',
                        }}
                        title="Send test payload to webhook"
                      >
                        <Send size={12} />
                        <span>Test Webhook</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Subactions Bar matching Agents Page */}
                <div style={{
                  display: 'flex',
                  gap: '6px',
                  flexWrap: 'wrap',
                  borderTop: '1px solid var(--shell-card-border)',
                  paddingTop: '12px',
                }}>
                  <button
                    onClick={() => handleRunWorkflow(wf)}
                    disabled={isRunning}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 500,
                      backgroundColor: isRunning ? 'rgba(99,102,241,0.2)' : 'rgba(16,185,129,0.12)',
                      color: isRunning ? '#818cf8' : '#34d399',
                      border: '1px solid rgba(16,185,129,0.25)',
                      cursor: isRunning ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isRunning ? (
                      <>
                        <RefreshCw size={12} className="spin" />
                        <span>Running...</span>
                      </>
                    ) : (
                      <>
                        <Play size={12} />
                        <span>Run</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setFullCanvasWorkflow(wf);
                      setCanvasExecution(null);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 500,
                      backgroundColor: 'rgba(99,102,241,0.12)',
                      color: '#818cf8',
                      border: '1px solid rgba(99,102,241,0.25)',
                      cursor: 'pointer',
                    }}
                    title="Open Visual Canvas"
                  >
                    <Network size={12} />
                    <span>Canvas</span>
                  </button>

                  <button
                    onClick={() => handleOpenEdit(wf)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 500,
                      backgroundColor: 'var(--shell-badge-bg)',
                      color: 'var(--shell-text-bright)',
                      border: '1px solid var(--shell-card-border)',
                      cursor: 'pointer',
                    }}
                  >
                    <Pencil size={12} />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => handleFetchExecutions(wf)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 500,
                      backgroundColor: 'var(--shell-badge-bg)',
                      color: 'var(--shell-text-bright)',
                      border: '1px solid var(--shell-card-border)',
                      cursor: 'pointer',
                    }}
                  >
                    <History size={12} />
                    <span>Logs</span>
                  </button>

                  <button
                    onClick={() => handleDelete(wf.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 500,
                      backgroundColor: 'rgba(239,68,68,0.1)',
                      color: '#f87171',
                      border: '1px solid rgba(239,68,68,0.2)',
                      cursor: 'pointer',
                      marginLeft: 'auto',
                    }}
                    title="Delete workflow"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── WEBHOOK TEST RUNNER MODAL ─────────────────────────────────── */}
      {webhookTestWf && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: 'var(--shell-surface)',
            borderRadius: '12px',
            border: '1px solid var(--shell-card-border)',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--shell-text)', margin: 0 }}>
                  Test Webhook — {webhookTestWf.name}
                </h3>
                <p style={{ color: 'var(--shell-text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
                  Send a mock JSON payload to simulate an inbound webhook event.
                </p>
              </div>
              <button
                onClick={() => setWebhookTestWf(null)}
                style={{ background: 'none', border: 'none', color: 'var(--shell-text-secondary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', color: 'var(--shell-text-muted)', display: 'block', marginBottom: '4px' }}>
                Target Endpoint
              </label>
              <code style={{
                display: 'block',
                padding: '8px 10px',
                borderRadius: '6px',
                backgroundColor: 'var(--shell-input-bg, #f4f6f9)',
                border: '1px solid var(--shell-card-border)',
                fontSize: '11.5px',
                fontFamily: 'monospace',
                color: '#34d399',
                wordBreak: 'break-all',
              }}>
                POST {typeof window !== 'undefined' ? `${window.location.origin}/api/workflows/${webhookTestWf.id}/trigger` : `/api/workflows/${webhookTestWf.id}/trigger`}
              </code>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', color: 'var(--shell-text-muted)', display: 'block', marginBottom: '4px' }}>
                Test Request Payload (JSON)
              </label>
              <textarea
                value={testPayload}
                onChange={(e) => setTestPayload(e.target.value)}
                rows={6}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--shell-input-bg, #f4f6f9)',
                  border: '1px solid var(--shell-card-border)',
                  color: 'var(--shell-text)',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {testResult && (
              <div style={{
                marginBottom: '14px',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: testResult.ok ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                border: `1px solid ${testResult.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: testResult.ok ? '#34d399' : '#f87171' }}>
                    {testResult.ok ? `HTTP 200 OK (${testResult.durationMs}ms)` : `HTTP Error ${testResult.status || ''}`}
                  </span>
                </div>
                <pre style={{
                  margin: 0,
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: 'var(--shell-text)',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '100px',
                  overflowY: 'auto',
                }}>
                  {JSON.stringify(testResult.data || testResult.error, null, 2)}
                </pre>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setWebhookTestWf(null)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  fontWeight: 500,
                  backgroundColor: 'var(--shell-surface)',
                  color: 'var(--shell-text-secondary)',
                  border: '1px solid var(--shell-card-border)',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSendTestWebhook}
                disabled={sendingTest}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 16px',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  backgroundColor: '#6366f1',
                  color: '#fff',
                  border: 'none',
                  cursor: sendingTest ? 'not-allowed' : 'pointer',
                }}
              >
                {sendingTest ? (
                  <>
                    <RefreshCw size={12} className="spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send size={12} />
                    <span>Send Test Payload</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TEMPLATES MODAL ─────────────────────────────────────────── */}
      {showTemplateModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: 'var(--shell-surface)',
            borderRadius: '12px',
            border: '1px solid var(--shell-card-border)',
            width: '100%',
            maxWidth: '780px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--shell-text)', margin: 0 }}>
                  Workflow Templates
                </h3>
                <p style={{ color: 'var(--shell-text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
                  Select a pre-configured recipe to populate your pipeline.
                </p>
              </div>
              <button
                onClick={() => setShowTemplateModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--shell-text-secondary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '14px',
            }}>
              {PRESET_TEMPLATES.map((tmpl) => {
                const IconComponent = tmpl.icon;
                return (
                  <div
                    key={tmpl.id}
                    style={{
                      padding: '16px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--shell-input-bg, #f4f6f9)',
                      border: '1px solid var(--shell-card-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <IconComponent size={16} color={tmpl.color} />
                          <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--shell-text)' }}>{tmpl.name}</span>
                        </div>
                        <span style={{
                          fontSize: '10.5px',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: 'var(--shell-badge-bg)',
                          color: '#a5b4fc',
                        }}>
                          {tmpl.badge}
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--shell-text-secondary)', margin: '0 0 12px 0', lineHeight: '1.4' }}>
                        {tmpl.description}
                      </p>
                    </div>

                    <button
                      onClick={() => handleApplyTemplate(tmpl)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: '#6366f1',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        width: '100%',
                      }}
                    >
                      Use Recipe
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE / EDIT WORKFLOW MODAL ────────────────────────────── */}
      {editingWorkflow && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: 'var(--shell-surface)',
            borderRadius: '12px',
            border: '1px solid var(--shell-card-border)',
            width: '100%',
            maxWidth: '620px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--shell-text)', margin: 0 }}>
                {isNew ? 'Create Workflow' : 'Edit Workflow'}
              </h3>
              <button
                onClick={() => setEditingWorkflow(null)}
                style={{ background: 'none', border: 'none', color: 'var(--shell-text-secondary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', color: 'var(--shell-text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Workflow Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Support Ticket Router"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--shell-input-bg, #f4f6f9)',
                    border: '1px solid var(--shell-card-border)',
                    color: 'var(--shell-text)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', color: 'var(--shell-text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Purpose of this automation..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--shell-input-bg, #f4f6f9)',
                    border: '1px solid var(--shell-card-border)',
                    color: 'var(--shell-text)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--shell-text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Trigger Type
                  </label>
                  <select
                    value={triggerType}
                    onChange={(e) => setTriggerType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--shell-input-bg, #f4f6f9)',
                      border: '1px solid var(--shell-card-border)',
                      color: 'var(--shell-text)',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="manual">Manual Trigger</option>
                    <option value="webhook">Inbound Webhook</option>
                    <option value="cron">Scheduled Cron Job</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: 'var(--shell-text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--shell-input-bg, #f4f6f9)',
                      border: '1px solid var(--shell-card-border)',
                      color: 'var(--shell-text)',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
              </div>

              {/* Visual Schedule Picker */}
              {triggerType === 'cron' && (
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--shell-text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Schedule Frequency
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                    {[
                      { label: 'Every 15 Minutes', expr: '*/15 * * * *' },
                      { label: 'Every Hour', expr: '0 * * * *' },
                      { label: 'Daily at 9:00 AM', expr: '0 9 * * *' },
                      { label: 'Weekly (Mondays at 9 AM)', expr: '0 9 * * 1' },
                    ].map((p) => (
                      <button
                        key={p.expr}
                        type="button"
                        onClick={() => setCronExpression(p.expr)}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 500,
                          border: '1px solid var(--shell-card-border)',
                          backgroundColor: cronExpression === p.expr ? 'rgba(99,102,241,0.15)' : 'var(--shell-surface)',
                          color: cronExpression === p.expr ? '#818cf8' : 'var(--shell-text-secondary)',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={cronExpression}
                    onChange={(e) => setCronExpression(e.target.value)}
                    placeholder="e.g. 0 9 * * *"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--shell-input-bg, #f4f6f9)',
                      border: '1px solid var(--shell-card-border)',
                      color: 'var(--shell-text)',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--shell-text-muted)', marginTop: '4px', display: 'block' }}>
                    {getCronDescription(cronExpression)}
                  </span>
                </div>
              )}

              {/* Step Sequence Builder */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--shell-text-secondary)' }}>
                    Steps ({steps.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddStep}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 500,
                      backgroundColor: 'var(--shell-badge-bg)',
                      color: '#818cf8',
                      border: '1px solid rgba(99,102,241,0.25)',
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={12} /> Add Step
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                  {steps.map((step, idx) => (
                    <div
                      key={step.id || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px',
                        borderRadius: '6px',
                        backgroundColor: 'var(--shell-input-bg, #f4f6f9)',
                        border: '1px solid var(--shell-card-border)',
                      }}
                    >
                      <span style={{ fontSize: '11px', color: 'var(--shell-text-muted)', width: '18px', textAlign: 'center' }}>
                        #{idx + 1}
                      </span>
                      <select
                        value={step.type}
                        onChange={(e) => handleStepChange(step.id, 'type', e.target.value)}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '6px',
                          backgroundColor: 'var(--shell-surface)',
                          border: '1px solid var(--shell-card-border)',
                          fontSize: '12px',
                          color: 'var(--shell-text)',
                          outline: 'none',
                        }}
                      >
                        <option value="prompt">AI Prompt</option>
                        <option value="webhook">Webhook POST</option>
                        <option value="email">Email</option>
                        <option value="rag_search">Vector Search</option>
                        <option value="filter">Filter</option>
                      </select>
                      <input
                        type="text"
                        value={step.value || ''}
                        onChange={(e) => handleStepChange(step.id, 'value', e.target.value)}
                        placeholder="Instruction, query, URL..."
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          borderRadius: '6px',
                          backgroundColor: 'var(--shell-surface)',
                          border: '1px solid var(--shell-card-border)',
                          fontSize: '12px',
                          color: 'var(--shell-text)',
                          outline: 'none',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveStep(step.id)}
                        style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '4px' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setEditingWorkflow(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 500,
                    backgroundColor: 'var(--shell-surface)',
                    color: 'var(--shell-text-secondary)',
                    border: '1px solid var(--shell-card-border)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    backgroundColor: '#6366f1',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {saving ? 'Saving...' : 'Save Workflow'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EXECUTION HISTORY & AUDIT MODAL ──────────────────────────── */}
      {selectedWorkflowForHistory && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: 'var(--shell-surface)',
            borderRadius: '12px',
            border: '1px solid var(--shell-card-border)',
            width: '100%',
            maxWidth: '720px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--shell-text)', margin: 0 }}>
                  Execution Logs — {selectedWorkflowForHistory.name}
                </h3>
                <p style={{ color: 'var(--shell-text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
                  Audit telemetry, node timing, inputs, and outputs.
                </p>
              </div>
              <button
                onClick={() => setSelectedWorkflowForHistory(null)}
                style={{ background: 'none', border: 'none', color: 'var(--shell-text-secondary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {loadingHistory ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <RefreshCw size={20} className="spin" color="#818cf8" style={{ margin: '0 auto 8px' }} />
                <p style={{ color: 'var(--shell-text-muted)', fontSize: '13px' }}>Fetching execution telemetry...</p>
              </div>
            ) : executions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p style={{ color: 'var(--shell-text-muted)', fontSize: '13px', margin: '0 0 12px 0' }}>
                  No execution telemetry recorded for this workflow yet.
                </p>
                <button
                  onClick={() => handleRunWorkflow(selectedWorkflowForHistory)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 500,
                    backgroundColor: 'rgba(16,185,129,0.12)',
                    color: '#34d399',
                    border: '1px solid rgba(16,185,129,0.25)',
                    cursor: 'pointer',
                  }}
                >
                  Trigger Run
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {executions.map((ex) => {
                  let stepResults = [];
                  try {
                    stepResults = Array.isArray(ex.step_results)
                      ? ex.step_results
                      : (typeof ex.step_results === 'string' ? JSON.parse(ex.step_results) : []);
                  } catch {
                    stepResults = [];
                  }
                  const isSuccess = ex.status === 'completed' || ex.status === 'SUCCESS';

                  return (
                    <div
                      key={ex.id}
                      style={{
                        padding: '14px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--shell-input-bg, #f4f6f9)',
                        border: '1px solid var(--shell-card-border)',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontSize: '10.5px',
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: isSuccess ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                            color: isSuccess ? '#34d399' : '#f87171',
                            textTransform: 'uppercase',
                          }}>
                            {ex.status}
                          </span>
                          <span style={{ color: 'var(--shell-text-muted)' }}>
                            Trigger: {ex.trigger_type?.toUpperCase() || 'MANUAL'}
                          </span>
                        </div>
                        <span style={{ color: 'var(--shell-text-muted)' }}>
                          {ex.started_at ? new Date(ex.started_at).toLocaleString() : ''}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '12px', color: 'var(--shell-text-secondary)', fontFamily: 'monospace', marginBottom: '8px' }}>
                        <span>Duration: {ex.duration_ms || 0}ms</span>
                        <span>Steps: {stepResults.length}</span>
                      </div>

                      {stepResults.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {stepResults.map((sr, sIdx) => (
                            <div
                              key={sIdx}
                              style={{
                                padding: '8px',
                                borderRadius: '6px',
                                backgroundColor: 'var(--shell-surface)',
                                border: '1px solid var(--shell-card-border)',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontWeight: 500, color: 'var(--shell-text)' }}>
                                <span>Step {sIdx + 1}: {sr.type}</span>
                                <span style={{ fontFamily: 'monospace', color: 'var(--shell-text-muted)' }}>{sr.durationMs}ms</span>
                              </div>
                              {sr.output && (
                                <pre style={{
                                  margin: 0,
                                  padding: '6px',
                                  borderRadius: '4px',
                                  backgroundColor: 'var(--shell-input-bg, #f4f6f9)',
                                  fontSize: '11px',
                                  fontFamily: 'monospace',
                                  color: 'var(--shell-text)',
                                  whiteSpace: 'pre-wrap',
                                  maxHeight: '80px',
                                  overflowY: 'auto',
                                }}>
                                  {typeof sr.output === 'object' ? JSON.stringify(sr.output, null, 2) : String(sr.output)}
                                </pre>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ─────────────────────────────────── */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: 'var(--shell-surface)',
            borderRadius: '12px',
            border: '1px solid var(--shell-card-border)',
            padding: '24px',
            maxWidth: '380px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239,68,68,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
            }}>
              <AlertTriangle size={22} color="#f87171" />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--shell-text)', margin: '0 0 8px 0' }}>
              Delete Workflow?
            </h3>
            <p style={{ color: 'var(--shell-text-secondary)', fontSize: '13px', margin: '0 0 20px 0', lineHeight: '1.45' }}>
              This will permanently delete the automation and its telemetry history.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  padding: '7px 16px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  backgroundColor: 'var(--shell-surface)',
                  color: 'var(--shell-text-secondary)',
                  border: '1px solid var(--shell-card-border)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{
                  padding: '7px 16px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FULL-SCREEN VISUAL STUDIO (DAG CANVAS) ───────────────────── */}
      {fullCanvasWorkflow && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          backgroundColor: '#070b14',
          display: 'flex',
          flexDirection: 'column',
          padding: '12px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            backgroundColor: '#0d1322',
            borderRadius: '12px 12px 0 0',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderBottom: 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Network size={18} color="#818cf8" />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, color: '#ffffff', fontSize: '15px', fontWeight: 600 }}>
                    {fullCanvasWorkflow.name || 'Visual Workflow Studio'}
                  </h3>
                  <span style={{
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(56, 189, 248, 0.15)',
                    color: '#38bdf8',
                  }}>
                    Canvas Mode
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setFullCanvasWorkflow(null);
                setCanvasExecution(null);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <X size={14} />
              <span>Close Canvas</span>
            </button>
          </div>

          <div style={{ flex: 1, position: 'relative' }}>
            <VisualWorkflowEditor
              workflow={fullCanvasWorkflow}
              onSave={handleSaveFromCanvas}
              onWorkflowUpdated={() => {
                fetchWorkflows(apiBase, tenantSlug);
              }}
              onRun={() => handleRunWorkflow(fullCanvasWorkflow)}
              isRunning={runningWorkflowId === fullCanvasWorkflow.id}
              latestExecution={canvasExecution}
              apiBase={apiBase}
              tenantSlug={tenantSlug}
            />
          </div>
        </div>
      )}

      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </DashboardShell>
  );
}

export default withAuth(WorkflowsPage);
