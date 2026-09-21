import { authenticatedFetch, getApiConfig } from './apiHelper';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  GitBranch,
  Globe,
  FileText,
  MessageSquare,
  Layers,
  Zap,
  RefreshCw,
  Loader2,
  Folder,
  File as FileIcon,
  ChevronLeft,
  X,
  Copy,
  Check,
  ExternalLink,
  BookOpen,
  Sparkles,
  ShieldCheck,
  Bell,
  Code2,
} from 'lucide-react';

const APPS_META = [
  {
    id: 'google_drive',
    name: 'Google Workspace & Drive',
    category: 'Cloud Storage & Docs',
    categoryKey: 'cloud',
    permissions: ['Read Document Embeddings', 'Sync RAG Drive Files'],
    badgeColor: '#2563eb',
    iconBg: '#eff6ff',
    description:
      'Connect your Google Workspace or personal Drive to sync documents, sheets, and presentations directly into your workspace RAG index.',
    features: [
      'Selective folder and file indexing into vector storage',
      'Automatic sync of modified documents for live RAG accuracy',
      'Read-only permissions with enterprise AES-256 token encryption',
    ],
  },
  {
    id: 'vscode',
    name: 'Xarwiz VS Code Extension',
    category: 'IDE Integration',
    categoryKey: 'developer',
    permissions: ['Code Completion', 'Inline Chat Assistant'],
    badgeColor: '#7c3aed',
    iconBg: '#f5f3ff',
    description:
      'Pair your editor with Xarwiz to receive intelligent ghost-text completions, an in-editor sidebar chat, and instant diff reviews.',
    features: [
      'Ghost-text code completions streamed as you type',
      'In-editor activity bar chat connected to your active models',
      'Review Selection diff generator for rapid code refactoring',
    ],
  },
  {
    id: 'github',
    name: 'GitHub Repository Sync',
    category: 'Developer Tools',
    categoryKey: 'developer',
    permissions: ['Code Base Indexing', 'Repo Context Analysis'],
    badgeColor: '#0f172a',
    iconBg: '#f8fafc',
    description:
      'Index public and private repositories to give Xarwiz deep codebase context for architecture analysis, bug finding, and pull request reviews.',
    features: [
      'Tree scanning and AST-aware file chunking for major languages',
      'PGVector semantic search across your entire codebase',
      'Accurate line and symbol citations in every chat response',
    ],
  },
  {
    id: 'slack',
    name: 'Slack Workspace Bot',
    category: 'Team Messaging',
    categoryKey: 'collaboration',
    permissions: ['Channel Summarization', 'AI Query Bot'],
    badgeColor: '#059669',
    iconBg: '#ecfdf5',
    description:
      'Bring Xarwiz into team channels to summarize discussion threads, draft project updates, and answer knowledge questions in real time.',
    features: [
      'Thread summarization and action-item extraction',
      'Mention-driven AI answers powered by your workspace RAG',
      'Scheduled daily digests for project channels',
    ],
  },
  {
    id: 'notion',
    name: 'Notion Knowledge Sync',
    category: 'Documentation & Wiki',
    categoryKey: 'cloud',
    permissions: ['Page Import', 'Vector Indexing'],
    badgeColor: '#d97706',
    iconBg: '#fffbeb',
    description:
      'Continuously synchronize your team’s Notion wikis, meeting notes, and roadmap databases directly into your knowledge base.',
    features: [
      'Bi-directional sync of Notion pages, tables, and docs',
      'Preservation of page hierarchies and inline markdown formatting',
      'Instant vector search across company policies and guides',
    ],
  },
  {
    id: 'figma',
    name: 'Figma Design Copilot',
    category: 'Design & UX',
    categoryKey: 'developer',
    permissions: ['Inspect Design Assets', 'UI Component Generation'],
    badgeColor: '#e11d48',
    iconBg: '#fff1f2',
    description:
      'Inspect Figma frames and design tokens to automatically generate clean, production-ready React and HTML/CSS components.',
    features: [
      'Frame-to-code component generation with responsive styles',
      'Color palette and typography token extraction',
      'Design spec comparisons against live frontend components',
    ],
  },
];

function appIcon(id) {
  switch (id) {
    case 'github':
      return <GitBranch size={22} style={{ color: '#0f172a' }} />;
    case 'google_drive':
      return <Globe size={22} style={{ color: '#2563eb' }} />;
    case 'notion':
      return <FileText size={22} style={{ color: '#d97706' }} />;
    case 'slack':
      return <MessageSquare size={22} style={{ color: '#059669' }} />;
    case 'vscode':
      return <Zap size={22} style={{ color: '#7c3aed' }} />;
    case 'figma':
      return <Code2 size={22} style={{ color: '#e11d48' }} />;
    default:
      return <Layers size={22} style={{ color: '#64748b' }} />;
  }
}

function timeAgo(isoString) {
  if (!isoString) return '—';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ConnectedAppsSettings() {
  const [statusByProvider, setStatusByProvider] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');

  // Google Drive picker modal states
  const [showPicker, setShowPicker] = useState(false);
  const [pickerFiles, setPickerFiles] = useState([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState(undefined);
  const [folderStack, setFolderStack] = useState([]);
  const [selectedFileIds, setSelectedFileIds] = useState([]);

  // VS Code token modal & setup guide states
  const [vsCodeToken, setVsCodeToken] = useState(null);
  const [vsCodeCopied, setVsCodeCopied] = useState(false);
  const [showVsCodeGuide, setShowVsCodeGuide] = useState(false);

  // Coming Soon preview modal state
  const [previewApp, setPreviewApp] = useState(null);
  const [waitlistSuccess, setWaitlistSuccess] = useState({});
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const { apiBase, tenantSlug } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/integrations`, {
        headers: { 'x-tenant-slug': tenantSlug },
      });
      if (res.ok) {
        const data = await res.json();
        const map = {};
        (data.integrations || []).forEach((i) => {
          map[i.providerId] = i;
        });
        setStatusByProvider(map);
      }
    } catch (e) {
      console.error('Failed to load integrations status', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Handle OAuth callback redirects back from Google
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('google') === 'connected') {
      setMessage({ type: 'success', text: 'Google Workspace account connected. Select files below to start syncing.' });
      fetchStatus();
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('google_error')) {
      setMessage({ type: 'error', text: `Google connection failed: ${params.get('google_error')}` });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [fetchStatus]);

  // Auto-poll while Google Drive is actively syncing
  useEffect(() => {
    const gStatus = statusByProvider.google_drive;
    if (gStatus?.status !== 'syncing') return undefined;
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [statusByProvider, fetchStatus]);

  const handleConnectGoogle = async () => {
    setActionLoading('google_drive');
    setMessage(null);
    try {
      const { apiBase, tenantSlug } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/integrations/google/auth`, {
        headers: { 'x-tenant-slug': tenantSlug },
      });
      if (res.ok) {
        const data = await res.json();
        window.location.href = data.authUrl;
        return;
      }
      const data = await res.json().catch(() => ({}));
      setMessage({
        type: 'error',
        text: data.error || 'Google Workspace integration requires Google Cloud OAuth credentials configured on the server.',
      });
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to initiate Google connection.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisconnectGoogle = async () => {
    if (!confirm('Disconnect Google Drive? Previously indexed documents will remain in your RAG knowledge base.')) {
      return;
    }
    setActionLoading('google_drive');
    setMessage(null);
    try {
      const { apiBase, tenantSlug } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/integrations/google/disconnect`, {
        method: 'POST',
        headers: { 'x-tenant-slug': tenantSlug, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Google Drive disconnected.' });
        await fetchStatus();
      } else {
        setMessage({ type: 'error', text: 'Failed to disconnect. Please try again.' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to disconnect. Please try again.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleConnectVsCode = async () => {
    setActionLoading('vscode');
    setMessage(null);
    try {
      const { apiBase, tenantSlug } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/integrations/vscode/connect`, {
        method: 'POST',
        headers: { 'x-tenant-slug': tenantSlug, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setVsCodeToken(data.apiKey);
        await fetchStatus();
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage({ type: 'error', text: data.error || 'Failed to connect VS Code extension.' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to connect VS Code extension.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisconnectVsCode = async () => {
    if (!confirm('Disconnect the VS Code extension? Its active access token will be revoked immediately.')) {
      return;
    }
    setActionLoading('vscode');
    setMessage(null);
    try {
      const { apiBase, tenantSlug } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/integrations/vscode/disconnect`, {
        method: 'POST',
        headers: { 'x-tenant-slug': tenantSlug, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'VS Code extension disconnected and token revoked.' });
        await fetchStatus();
      } else {
        setMessage({ type: 'error', text: 'Failed to disconnect. Please try again.' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to disconnect. Please try again.' });
    } finally {
      setActionLoading(null);
    }
  };

  const copyVsCodeToken = () => {
    if (!vsCodeToken) return;
    navigator.clipboard.writeText(vsCodeToken);
    setVsCodeCopied(true);
    setTimeout(() => setVsCodeCopied(false), 2000);
  };

  const handleJoinWaitlist = async (providerId) => {
    setWaitlistLoading(true);
    try {
      const { apiBase, tenantSlug } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/integrations/waitlist`, {
        method: 'POST',
        headers: { 'x-tenant-slug': tenantSlug, 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId }),
      });
      if (res.ok) {
        setWaitlistSuccess((prev) => ({ ...prev, [providerId]: true }));
      }
    } catch (e) {
      console.error('Waitlist join error:', e);
    } finally {
      setWaitlistLoading(false);
    }
  };

  const loadPickerFiles = async (folderId) => {
    setPickerLoading(true);
    try {
      const { apiBase, tenantSlug } = getApiConfig();
      const qs = folderId ? `?folderId=${encodeURIComponent(folderId)}` : '';
      const res = await authenticatedFetch(`${apiBase}/api/integrations/google/files${qs}`, {
        headers: { 'x-tenant-slug': tenantSlug },
      });
      if (res.ok) {
        const data = await res.json();
        setPickerFiles(data.files || []);
      } else {
        setMessage({ type: 'error', text: 'Failed to load Drive files.' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to load Drive files.' });
    } finally {
      setPickerLoading(false);
    }
  };

  const openPicker = async () => {
    setShowPicker(true);
    setCurrentFolderId(undefined);
    setFolderStack([]);
    await loadPickerFiles(undefined);
  };

  const enterFolder = async (folder) => {
    setFolderStack((prev) => [...prev, { id: currentFolderId, name: folder.name }]);
    setCurrentFolderId(folder.id);
    await loadPickerFiles(folder.id);
  };

  const goBack = async () => {
    const stack = [...folderStack];
    const parent = stack.pop();
    setFolderStack(stack);
    setCurrentFolderId(parent?.id);
    await loadPickerFiles(parent?.id);
  };

  const toggleFile = (fileId) => {
    setSelectedFileIds((prev) =>
      prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]
    );
  };

  const confirmSync = async () => {
    setActionLoading('google_drive');
    setMessage(null);
    try {
      const { apiBase, tenantSlug } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/integrations/google/sync`, {
        method: 'POST',
        headers: { 'x-tenant-slug': tenantSlug, 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedFileIds, selectedFolderIds: [] }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Sync initiated — running in the background.' });
        setShowPicker(false);
        await fetchStatus();
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage({ type: 'error', text: data.error || 'Failed to start sync.' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to start sync.' });
    } finally {
      setActionLoading(null);
    }
  };

  const quickSyncNow = async () => {
    setActionLoading('google_drive');
    setMessage(null);
    try {
      const { apiBase, tenantSlug } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/integrations/google/sync`, {
        method: 'POST',
        headers: { 'x-tenant-slug': tenantSlug, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Sync initiated — running in the background.' });
        await fetchStatus();
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage({ type: 'error', text: data.error || 'Failed to start sync.' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to start sync.' });
    } finally {
      setActionLoading(null);
    }
  };

  // Connected counts
  const connectedCount = useMemo(() => {
    return Object.values(statusByProvider).filter(
      (s) => s && s.status && s.status !== 'disconnected' && s.status !== 'coming_soon'
    ).length;
  }, [statusByProvider]);

  // Filtered list
  const filteredApps = useMemo(() => {
    return APPS_META.filter((app) => {
      const status = statusByProvider[app.id];
      const isConnected = status && status.status && status.status !== 'disconnected' && status.status !== 'coming_soon';
      if (activeFilter === 'active') return isConnected;
      if (activeFilter === 'cloud') return app.categoryKey === 'cloud';
      if (activeFilter === 'developer') return app.categoryKey === 'developer';
      if (activeFilter === 'collaboration') return app.categoryKey === 'collaboration';
      return true;
    });
  }, [statusByProvider, activeFilter]);

  const renderStatusBadge = (app) => {
    const status = statusByProvider[app.id];
    if (app.id !== 'google_drive' && app.id !== 'vscode') {
      return (
        <span
          style={{
            fontSize: '11.5px',
            fontWeight: 500,
            padding: '3px 9px',
            borderRadius: '20px',
            background: '#f1f5f9',
            color: '#64748b',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <Sparkles size={11} style={{ color: '#94a3b8' }} />
          Coming Soon
        </span>
      );
    }

    const s = status?.status || 'disconnected';
    if (s === 'connected') {
      return (
        <span
          style={{
            fontSize: '11.5px',
            fontWeight: 600,
            padding: '3px 9px',
            borderRadius: '20px',
            background: '#ecfdf5',
            color: '#059669',
            border: '1px solid #a7f3d0',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#10b981',
              display: 'inline-block',
            }}
          />
          Connected
        </span>
      );
    }
    if (s === 'syncing') {
      return (
        <span
          style={{
            fontSize: '11.5px',
            fontWeight: 600,
            padding: '3px 9px',
            borderRadius: '20px',
            background: '#eff6ff',
            color: '#2563eb',
            border: '1px solid #bfdbfe',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <RefreshCw size={11} className="spin-icon" />
          Syncing
        </span>
      );
    }
    if (s === 'error') {
      return (
        <span
          style={{
            fontSize: '11.5px',
            fontWeight: 600,
            padding: '3px 9px',
            borderRadius: '20px',
            background: '#fef2f2',
            color: '#dc2626',
            border: '1px solid #fecaca',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <AlertCircle size={11} />
          Error
        </span>
      );
    }
    return (
      <span
        style={{
          fontSize: '11.5px',
          fontWeight: 500,
          padding: '3px 9px',
          borderRadius: '20px',
          background: '#f8fafc',
          color: '#64748b',
          border: '1px solid #e2e8f0',
        }}
      >
        Not Connected
      </span>
    );
  };

  const renderActions = (app) => {
    const status = statusByProvider[app.id];

    if (app.id !== 'google_drive' && app.id !== 'vscode') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setPreviewApp(app)}
            style={{
              height: '36px',
              padding: '0 14px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              color: '#475569',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.background = '#f8fafc';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.background = '#ffffff';
            }}
          >
            <BookOpen size={13} />
            Preview
          </button>
          <button
            type="button"
            disabled
            style={{
              height: '36px',
              padding: '0 16px',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              color: '#94a3b8',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'not-allowed',
            }}
          >
            Connect
          </button>
        </div>
      );
    }

    if (app.id === 'vscode') {
      const isBusy = actionLoading === 'vscode';
      const connState = status?.status || 'disconnected';

      if (connState === 'disconnected') {
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setShowVsCodeGuide(true)}
              style={{
                height: '36px',
                padding: '0 12px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                color: '#475569',
                fontSize: '12.5px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Guide
            </button>
            <button
              type="button"
              onClick={handleConnectVsCode}
              disabled={isBusy}
              className="btn-primary"
              style={{
                height: '36px',
                padding: '0 18px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '8px',
              }}
            >
              {isBusy ? <Loader2 size={14} className="spin-icon" /> : 'Connect'}
            </button>
          </div>
        );
      }

      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setShowVsCodeGuide(true)}
            style={{
              height: '34px',
              padding: '0 12px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              color: '#475569',
              fontSize: '12.5px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Guide
          </button>
          <button
            type="button"
            onClick={handleConnectVsCode}
            disabled={isBusy}
            className="btn-change-plan-outline"
            style={{
              height: '34px',
              padding: '0 12px',
              fontSize: '12.5px',
              fontWeight: 500,
            }}
          >
            {isBusy ? <Loader2 size={13} className="spin-icon" /> : 'Regenerate'}
          </button>
          <button
            type="button"
            onClick={handleDisconnectVsCode}
            disabled={isBusy}
            style={{
              height: '34px',
              padding: '0 12px',
              background: 'transparent',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#dc2626',
              fontSize: '12.5px',
              fontWeight: 500,
              cursor: isBusy ? 'default' : 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#fef2f2')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            Disconnect
          </button>
        </div>
      );
    }

    const isBusy = actionLoading === 'google_drive';
    const connState = status?.status || 'disconnected';

    if (connState === 'disconnected') {
      return (
        <button
          type="button"
          onClick={handleConnectGoogle}
          disabled={isBusy}
          className="btn-primary"
          style={{
            height: '36px',
            padding: '0 18px',
            fontSize: '13px',
            fontWeight: 600,
            borderRadius: '8px',
          }}
        >
          {isBusy ? <Loader2 size={14} className="spin-icon" /> : 'Connect'}
        </button>
      );
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          type="button"
          onClick={openPicker}
          disabled={isBusy || connState === 'syncing'}
          className="btn-change-plan-outline"
          style={{
            height: '34px',
            padding: '0 12px',
            fontSize: '12.5px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Folder size={13} />
          Choose Files
        </button>
        <button
          type="button"
          onClick={quickSyncNow}
          disabled={isBusy || connState === 'syncing'}
          style={{
            height: '34px',
            padding: '0 12px',
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            color: '#1e293b',
            fontSize: '12.5px',
            fontWeight: 500,
            cursor: isBusy || connState === 'syncing' ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <RefreshCw size={12} className={connState === 'syncing' ? 'spin-icon' : ''} />
          {connState === 'syncing' ? 'Syncing…' : 'Sync Now'}
        </button>
        <button
          type="button"
          onClick={handleDisconnectGoogle}
          disabled={isBusy}
          style={{
            height: '34px',
            padding: '0 12px',
            background: 'transparent',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#dc2626',
            fontSize: '12.5px',
            fontWeight: 500,
            cursor: isBusy ? 'default' : 'pointer',
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = '#fef2f2')}
          onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          Disconnect
        </button>
      </div>
    );
  };

  return (
    <div className="connected-apps-container" style={{ maxWidth: '880px', margin: '0 auto', paddingBottom: '32px' }}>
      <style jsx>{`
        .spin-icon {
          animation: connected-apps-spin 1s linear infinite;
        }
        @keyframes connected-apps-spin {
          to {
            transform: rotate(360deg);
          }
        }
        .filter-pill {
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.15s ease;
          background: transparent;
          color: #64748b;
        }
        .filter-pill:hover {
          color: #0f172a;
          background: #f1f5f9;
        }
        .filter-pill.active {
          background: #0f172a;
          color: #ffffff;
          font-weight: 600;
        }
        .app-card {
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          background: #ffffff;
          padding: 18px 20px;
          transition: all 0.2s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
        }
        .app-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.01em' }}>
          Connected Apps
        </h1>
        <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
          Manage third-party integrations, OAuth connections, and authorized AI extensions across your workspace.
        </p>
      </div>

      {/* Toast Alert */}
      {message && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '18px',
            fontSize: '13.5px',
            background: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            color: message.type === 'success' ? '#065f46' : '#991b1b',
          }}
        >
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span style={{ flex: 1 }}>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '20px',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '12px',
          flexWrap: 'wrap',
        }}
      >
        <button
          className={`filter-pill ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          All ({APPS_META.length})
        </button>
        <button
          className={`filter-pill ${activeFilter === 'active' ? 'active' : ''}`}
          onClick={() => setActiveFilter('active')}
        >
          Active ({connectedCount})
        </button>
        <button
          className={`filter-pill ${activeFilter === 'cloud' ? 'active' : ''}`}
          onClick={() => setActiveFilter('cloud')}
        >
          Cloud & Docs
        </button>
        <button
          className={`filter-pill ${activeFilter === 'developer' ? 'active' : ''}`}
          onClick={() => setActiveFilter('developer')}
        >
          Developer Tools
        </button>
        <button
          className={`filter-pill ${activeFilter === 'collaboration' ? 'active' : ''}`}
          onClick={() => setActiveFilter('collaboration')}
        >
          Team & Messaging
        </button>
      </div>

      {/* Apps List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '50px 0', gap: '12px', color: '#64748b' }}>
          <Loader2 size={26} className="spin-icon" style={{ color: '#2563eb' }} />
          <span style={{ fontSize: '13.5px' }}>Loading integrations...</span>
        </div>
      ) : filteredApps.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', border: '1px dashed #e2e8f0', borderRadius: '12px' }}>
          <p style={{ margin: 0, fontSize: '14px' }}>No integrations found matching this filter.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredApps.map((app) => {
            const status = statusByProvider[app.id];
            const isConnected =
              (app.id === 'google_drive' || app.id === 'vscode') && status && status.status !== 'disconnected';

            return (
              <div key={app.id} className="app-card">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                  {/* Left: Icon + Content */}
                  <div style={{ display: 'flex', gap: '16px', flex: 1, minWidth: '280px' }}>
                    <div
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '12px',
                        background: app.iconBg || '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}
                    >
                      {isConnected && status?.picture ? (
                        <img
                          src={status.picture}
                          alt={status.name || status.email || 'Account'}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        appIcon(app.id)
                      )}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '15.5px', fontWeight: 600, color: '#0f172a' }}>{app.name}</span>
                        {renderStatusBadge(app)}
                      </div>

                      <p style={{ fontSize: '12.5px', color: '#64748b', margin: '3px 0 0 0' }}>{app.category}</p>

                      {/* Connected Details */}
                      {isConnected && app.id === 'google_drive' ? (
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '14px',
                            marginTop: '8px',
                            padding: '8px 12px',
                            background: '#f8fafc',
                            borderRadius: '8px',
                            fontSize: '12px',
                            color: '#475569',
                            border: '1px solid #edf2f7',
                          }}
                        >
                          <span>
                            Account: <strong>{status.email}</strong>
                          </span>
                          <span>
                            Last Sync: <strong>{timeAgo(status.lastSyncAt)}</strong>
                          </span>
                          <span>
                            Files Indexed: <strong>{status.filesIndexed ?? 0}</strong>
                          </span>
                          {status.status === 'syncing' && status.currentJob?.totalItems > 0 && (
                            <span style={{ color: '#2563eb', fontWeight: 600 }}>
                              Progress: {status.currentJob.processedItems}/{status.currentJob.totalItems}
                            </span>
                          )}
                          {status.status === 'error' && status.error && (
                            <span style={{ color: '#dc2626' }}>Error: {status.error}</span>
                          )}
                        </div>
                      ) : isConnected && app.id === 'vscode' ? (
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            gap: '12px',
                            marginTop: '8px',
                            padding: '8px 12px',
                            background: '#f8fafc',
                            borderRadius: '8px',
                            fontSize: '12px',
                            color: '#475569',
                            border: '1px solid #edf2f7',
                          }}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <ShieldCheck size={14} style={{ color: '#10b981' }} />
                            Token active: <code>{status.keyPrefix || 'hk_live_'}••••••••</code>
                          </span>
                          {status.connectedAt && (
                            <span>Connected: {timeAgo(status.connectedAt)}</span>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                          {app.permissions.map((perm, idx) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: '11px',
                                color: '#475569',
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                padding: '2px 8px',
                                borderRadius: '6px',
                              }}
                            >
                              {perm}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', alignSelf: 'center', flexShrink: 0 }}>
                    {renderActions(app)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Google Drive File/Folder Picker Modal ── */}
      {showPicker && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 20px 12px 20px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#0f172a' }}>Select files to sync</h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
                  Choose Drive files you want indexed into your RAG knowledge base.
                </p>
              </div>
              <button
                onClick={() => setShowPicker(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            {folderStack.length > 0 && (
              <button
                onClick={goBack}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '0 20px 8px 20px',
                }}
              >
                <ChevronLeft size={14} /> Back
              </button>
            )}

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px', minHeight: '200px' }}>
              {pickerLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: '8px', color: '#64748b' }}>
                  <Loader2 size={24} className="spin-icon" style={{ color: '#2563eb' }} />
                  <span style={{ fontSize: '12.5px' }}>Loading files...</span>
                </div>
              ) : pickerFiles.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '30px 0' }}>
                  No compatible files found in this folder.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {pickerFiles.map((file) => (
                    <div
                      key={file.id}
                      onClick={() => (file.isFolder ? enterFolder(file) : toggleFile(file.id))}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: !file.isFolder && selectedFileIds.includes(file.id) ? '#eff6ff' : 'transparent',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseOver={(e) => {
                        if (file.isFolder || !selectedFileIds.includes(file.id)) {
                          e.currentTarget.style.background = '#f8fafc';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (!file.isFolder && selectedFileIds.includes(file.id)) {
                          e.currentTarget.style.background = '#eff6ff';
                        } else {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      {!file.isFolder && (
                        <input
                          type="checkbox"
                          checked={selectedFileIds.includes(file.id)}
                          onChange={() => toggleFile(file.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                      {file.isFolder ? <Folder size={16} color="#f59e0b" /> : <FileIcon size={16} color="#64748b" />}
                      <span style={{ fontSize: '13px', color: '#0f172a', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {file.name}
                      </span>
                      {!file.isFolder && file.size > 0 && (
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>{(file.size / 1024).toFixed(0)} KB</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>{selectedFileIds.length} file(s) selected</span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setShowPicker(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSync}
                  disabled={selectedFileIds.length === 0 || actionLoading === 'google_drive'}
                  className="btn-primary"
                  style={{ padding: '8px 16px', fontSize: '13px', opacity: selectedFileIds.length === 0 ? 0.5 : 1 }}
                >
                  {actionLoading === 'google_drive' ? 'Starting…' : 'Sync Selected'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── VS Code Extension Token Reveal Modal ── */}
      {vsCodeToken && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '540px',
              width: '100%',
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#f5f3ff',
                    color: '#7c3aed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Zap size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                    VS Code Token Generated
                  </h3>
                  <p style={{ fontSize: '12.5px', color: '#64748b', margin: '3px 0 0 0' }}>
                    Copy this token now. For security, it will not be displayed again.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setVsCodeToken(null);
                  setVsCodeCopied(false);
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '18px',
                padding: '10px 14px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
              }}
            >
              <code style={{ flex: 1, fontSize: '12.5px', color: '#0f172a', overflowX: 'auto', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                {vsCodeToken}
              </code>
              <button
                type="button"
                onClick={copyVsCodeToken}
                title="Copy token"
                style={{
                  background: vsCodeCopied ? '#ecfdf5' : '#ffffff',
                  border: `1px solid ${vsCodeCopied ? '#a7f3d0' : '#cbd5e1'}`,
                  borderRadius: '6px',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  color: vsCodeCopied ? '#059669' : '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '12px',
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {vsCodeCopied ? (
                  <>
                    <Check size={14} /> Copied!
                  </>
                ) : (
                  <>
                    <Copy size={14} /> Copy
                  </>
                )}
              </button>
            </div>

            <div style={{ marginTop: '18px', padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>Quick Setup in VS Code:</p>
              <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '12.5px', color: '#475569', lineHeight: 1.6 }}>
                <li>Open VS Code Settings (<kbd style={{ background: '#e2e8f0', padding: '1px 5px', borderRadius: '4px' }}>Ctrl+,</kbd> or <kbd style={{ background: '#e2e8f0', padding: '1px 5px', borderRadius: '4px' }}>Cmd+,</kbd>).</li>
                <li>Search for <strong>Harikson</strong>.</li>
                <li>Set <strong>Tenant Url</strong> to <code>https://xarwiz.com</code>.</li>
                <li>Paste this token into <strong>Api Key</strong>.</li>
              </ol>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => {
                  setVsCodeToken(null);
                  setVsCodeCopied(false);
                  setShowVsCodeGuide(true);
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                View Full Guide
              </button>
              <button
                onClick={() => {
                  setVsCodeToken(null);
                  setVsCodeCopied(false);
                }}
                className="btn-primary"
                style={{ flex: 1, padding: '10px', fontSize: '13px', borderRadius: '8px' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── VS Code Extension Setup Guide Modal ── */}
      {showVsCodeGuide && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '580px',
              width: '100%',
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
              padding: '24px',
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#f5f3ff',
                    color: '#7c3aed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                    VS Code Extension Setup Guide
                  </h3>
                  <p style={{ fontSize: '12.5px', color: '#64748b', margin: '3px 0 0 0' }}>
                    How to install and pair your editor with Xarwiz AI.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowVsCodeGuide(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#7c3aed', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>1</span>
                  <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>Install the Extension</span>
                </div>
                <p style={{ fontSize: '12.5px', color: '#475569', margin: 0, lineHeight: 1.5 }}>
                  Install from the VSIX package in your terminal:
                </p>
                <pre style={{ margin: '8px 0 0 0', padding: '8px 10px', background: '#0f172a', color: '#f8fafc', borderRadius: '6px', fontSize: '11.5px', overflowX: 'auto' }}>
                  code --install-extension harikson-vscode-extension-1.0.0.vsix
                </pre>
              </div>

              <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#7c3aed', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>2</span>
                  <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>Configure Credentials</span>
                </div>
                <p style={{ fontSize: '12.5px', color: '#475569', margin: '0 0 6px 0', lineHeight: 1.5 }}>
                  Open VS Code Settings (<kbd style={{ background: '#e2e8f0', padding: '1px 5px', borderRadius: '4px' }}>Cmd+,</kbd> or <kbd style={{ background: '#e2e8f0', padding: '1px 5px', borderRadius: '4px' }}>Ctrl+,</kbd>) and configure:
                </p>
                <div style={{ fontSize: '12px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>• <code>Harikson: Tenant Url</code> → <code>https://xarwiz.com</code></div>
                  <div>• <code>Harikson: Api Key</code> → your personal access token</div>
                </div>
              </div>

              <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#7c3aed', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>3</span>
                  <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>Features Included</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#475569', lineHeight: 1.6 }}>
                  <li><strong>Inline Ghost Text</strong>: Real-time code completions as you type.</li>
                  <li><strong>Sidebar Assistant</strong>: Chat with your models inside the editor activity bar.</li>
                  <li><strong>Review Selection</strong>: Run <code>Harikson: Review Selection</code> from the Command Palette for instant code diff suggestions.</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setShowVsCodeGuide(false)}
              className="btn-primary"
              style={{ marginTop: '20px', width: '100%', padding: '10px', fontSize: '13px', borderRadius: '8px' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── Coming Soon / Preview Modal ── */}
      {previewApp && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '14px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: previewApp.iconBg || '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {appIcon(previewApp.id)}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                      {previewApp.name}
                    </h3>
                  </div>
                  <p style={{ fontSize: '12.5px', color: '#64748b', margin: '3px 0 0 0' }}>
                    {previewApp.category} • Early Access Preview
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewApp(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5, margin: '16px 0 14px 0' }}>
              {previewApp.description}
            </p>

            <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '12.5px', fontWeight: 600, color: '#0f172a' }}>
                Key Capabilities:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(previewApp.features || []).map((feat, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#475569' }}>
                    <CheckCircle2 size={14} style={{ color: '#10b981', flexShrink: 0 }} />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => setPreviewApp(null)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
              <button
                onClick={() => handleJoinWaitlist(previewApp.id)}
                disabled={waitlistSuccess[previewApp.id] || waitlistLoading}
                className="btn-primary"
                style={{
                  flex: 1,
                  padding: '10px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  background: waitlistSuccess[previewApp.id] ? '#10b981' : undefined,
                  borderColor: waitlistSuccess[previewApp.id] ? '#10b981' : undefined,
                }}
              >
                {waitlistLoading ? (
                  <Loader2 size={14} className="spin-icon" />
                ) : waitlistSuccess[previewApp.id] ? (
                  <>
                    <Check size={14} /> On Early Access List
                  </>
                ) : (
                  <>
                    <Bell size={14} /> Notify Me When Ready
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
