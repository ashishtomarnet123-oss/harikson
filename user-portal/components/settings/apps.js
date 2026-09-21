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
  Search,
  Hash,
  Eye,
  Key,
} from 'lucide-react';

const APPS_META = [
  {
    id: 'google_drive',
    name: 'Google Workspace & Drive',
    category: 'Cloud Storage & Docs',
    categoryKey: 'cloud',
    permissions: ['Read Document Embeddings', 'Sync RAG Drive Files'],
    iconBg: '#eff6ff',
    description:
      'Connect your Google Workspace or personal Drive to sync documents, sheets, and presentations directly into your workspace RAG index.',
  },
  {
    id: 'vscode',
    name: 'Xarwiz VS Code Extension',
    category: 'IDE Integration',
    categoryKey: 'developer',
    permissions: ['Code Completion', 'Inline Chat Assistant'],
    iconBg: '#f5f3ff',
    description:
      'Pair your editor with Xarwiz to receive intelligent ghost-text completions, an in-editor sidebar chat, and instant diff reviews.',
  },
  {
    id: 'github',
    name: 'GitHub Repository Sync',
    category: 'Developer Tools',
    categoryKey: 'developer',
    permissions: ['Code Base Indexing', 'Repo Context Analysis'],
    iconBg: '#f8fafc',
    description:
      'Index public and private repositories to give Xarwiz deep codebase context for architecture analysis, bug finding, and pull request reviews.',
  },
  {
    id: 'notion',
    name: 'Notion Knowledge Sync',
    category: 'Documentation & Wiki',
    categoryKey: 'cloud',
    permissions: ['Page Import', 'Vector Indexing'],
    iconBg: '#fffbeb',
    description:
      'Continuously synchronize your team’s Notion wikis, meeting notes, and roadmap databases directly into your knowledge base.',
  },
  {
    id: 'slack',
    name: 'Slack Workspace Bot',
    category: 'Team Messaging',
    categoryKey: 'collaboration',
    permissions: ['Channel Summarization', 'AI Query Bot'],
    iconBg: '#ecfdf5',
    description:
      'Bring Xarwiz into team channels to summarize discussion threads, draft project updates, and answer knowledge questions in real time.',
  },
  {
    id: 'figma',
    name: 'Figma Design Copilot',
    category: 'Design & UX',
    categoryKey: 'developer',
    permissions: ['Inspect Design Assets', 'UI Component Generation'],
    iconBg: '#fff1f2',
    description:
      'Inspect Figma frames and design tokens to automatically generate clean, production-ready React and HTML/CSS components.',
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

  // Modals management
  const [connectModalApp, setConnectModalApp] = useState(null);
  const [inputToken, setInputToken] = useState('');
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState('');

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

  // GitHub Repos Picker Modal states
  const [showGitHubModal, setShowGitHubModal] = useState(false);
  const [gitHubRepos, setGitHubRepos] = useState([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [repoSearch, setRepoSearch] = useState('');
  const [selectedRepo, setSelectedRepo] = useState(null);

  // Notion Pages Picker Modal states
  const [showNotionModal, setShowNotionModal] = useState(false);
  const [notionPages, setNotionPages] = useState([]);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [selectedPageIds, setSelectedPageIds] = useState([]);

  // Slack Channels Picker Modal states
  const [showSlackModal, setShowSlackModal] = useState(false);
  const [slackChannels, setSlackChannels] = useState([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState(null);

  // Figma File Inspector Modal states
  const [showFigmaModal, setShowFigmaModal] = useState(false);
  const [figmaFileUrl, setFigmaFileUrl] = useState('');
  const [figmaInspectLoading, setFigmaInspectLoading] = useState(false);
  const [figmaResult, setFigmaResult] = useState(null);

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

  // ── Generic Connect by Token (GitHub, Notion, Slack, Figma) ──
  const handleOpenConnectModal = (app) => {
    setConnectModalApp(app);
    setInputToken('');
    setConnectError('');
  };

  const handleSubmitConnectModal = async () => {
    if (!inputToken.trim()) {
      setConnectError('Please enter a valid token or secret.');
      return;
    }
    setConnectLoading(true);
    setConnectError('');
    const app = connectModalApp;
    try {
      const { apiBase, tenantSlug } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/integrations/${app.id}/connect`, {
        method: 'POST',
        headers: { 'x-tenant-slug': tenantSlug, 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: inputToken.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: `${app.name} connected successfully.` });
        setConnectModalApp(null);
        await fetchStatus();
      } else {
        setConnectError(data.error || `Failed to connect ${app.name}.`);
      }
    } catch (e) {
      setConnectError(e.message || `Failed to connect ${app.name}.`);
    } finally {
      setConnectLoading(false);
    }
  };

  // ── Generic Disconnect ──
  const handleGenericDisconnect = async (providerId, providerName) => {
    if (!confirm(`Disconnect ${providerName}? Previously synced data will remain in your workspace RAG index.`)) {
      return;
    }
    setActionLoading(providerId);
    try {
      const { apiBase, tenantSlug } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/integrations/${providerId}/disconnect`, {
        method: 'POST',
        headers: { 'x-tenant-slug': tenantSlug, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        setMessage({ type: 'success', text: `${providerName} disconnected.` });
        await fetchStatus();
      } else {
        setMessage({ type: 'error', text: `Failed to disconnect ${providerName}.` });
      }
    } catch (e) {
      setMessage({ type: 'error', text: `Failed to disconnect ${providerName}.` });
    } finally {
      setActionLoading(null);
    }
  };

  // ── Google Workspace & Drive Handlers ──
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
        setMessage({ type: 'success', text: 'Google Drive sync initiated — running in background.' });
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

  // ── VS Code Extension Handlers ──
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

  const copyVsCodeToken = () => {
    if (!vsCodeToken) return;
    navigator.clipboard.writeText(vsCodeToken);
    setVsCodeCopied(true);
    setTimeout(() => setVsCodeCopied(false), 2000);
  };

  // ── GitHub Repos Modal & Sync ──
  const openGitHubModal = async () => {
    setShowGitHubModal(true);
    setReposLoading(true);
    try {
      const { apiBase, tenantSlug } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/integrations/github/repos`, {
        headers: { 'x-tenant-slug': tenantSlug },
      });
      if (res.ok) {
        const data = await res.json();
        setGitHubRepos(data.repos || []);
      }
    } catch (e) {
      console.error('Failed to load GitHub repos', e);
    } finally {
      setReposLoading(false);
    }
  };

  const handleSyncGitHubRepo = async () => {
    if (!selectedRepo) return;
    setActionLoading('github');
    try {
      const { apiBase, tenantSlug } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/integrations/github/sync`, {
        method: 'POST',
        headers: { 'x-tenant-slug': tenantSlug, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: selectedRepo.fullName, branch: selectedRepo.defaultBranch }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: `Repository ${selectedRepo.fullName} indexed into RAG memory.` });
        setShowGitHubModal(false);
        await fetchStatus();
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage({ type: 'error', text: data.error || 'Failed to index GitHub repository.' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to index GitHub repository.' });
    } finally {
      setActionLoading(null);
    }
  };

  // ── Notion Pages Modal & Sync ──
  const openNotionModal = async () => {
    setShowNotionModal(true);
    setPagesLoading(true);
    try {
      const { apiBase, tenantSlug } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/integrations/notion/pages`, {
        headers: { 'x-tenant-slug': tenantSlug },
      });
      if (res.ok) {
        const data = await res.json();
        setNotionPages(data.pages || []);
      }
    } catch (e) {
      console.error('Failed to load Notion pages', e);
    } finally {
      setPagesLoading(false);
    }
  };

  const handleSyncNotionPages = async () => {
    if (selectedPageIds.length === 0) return;
    setActionLoading('notion');
    try {
      const { apiBase, tenantSlug } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/integrations/notion/sync`, {
        method: 'POST',
        headers: { 'x-tenant-slug': tenantSlug, 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageIds: selectedPageIds }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: `Successfully synced ${selectedPageIds.length} Notion page(s).` });
        setShowNotionModal(false);
        await fetchStatus();
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage({ type: 'error', text: data.error || 'Failed to sync Notion pages.' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to sync Notion pages.' });
    } finally {
      setActionLoading(null);
    }
  };

  // ── Slack Channels Modal & Sync ──
  const openSlackModal = async () => {
    setShowSlackModal(true);
    setChannelsLoading(true);
    try {
      const { apiBase, tenantSlug } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/integrations/slack/channels`, {
        headers: { 'x-tenant-slug': tenantSlug },
      });
      if (res.ok) {
        const data = await res.json();
        setSlackChannels(data.channels || []);
      }
    } catch (e) {
      console.error('Failed to load Slack channels', e);
    } finally {
      setChannelsLoading(false);
    }
  };

  const handleSyncSlackChannel = async () => {
    if (!selectedChannel) return;
    setActionLoading('slack');
    try {
      const { apiBase, tenantSlug } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/integrations/slack/sync`, {
        method: 'POST',
        headers: { 'x-tenant-slug': tenantSlug, 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: selectedChannel.id, channelName: selectedChannel.name }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: `Channel #${selectedChannel.name} synced to workspace context.` });
        setShowSlackModal(false);
        await fetchStatus();
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage({ type: 'error', text: data.error || 'Failed to sync Slack channel.' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to sync Slack channel.' });
    } finally {
      setActionLoading(null);
    }
  };

  // ── Figma File Modal & Sync ──
  const handleInspectFigmaFile = async () => {
    if (!figmaFileUrl.trim()) return;
    setFigmaInspectLoading(true);
    try {
      const { apiBase, tenantSlug } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/integrations/figma/sync`, {
        method: 'POST',
        headers: { 'x-tenant-slug': tenantSlug, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl: figmaFileUrl.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setFigmaResult(data.fileInfo);
        setMessage({ type: 'success', text: `Figma file ${data.fileInfo.name} synced with ${data.fileInfo.framesCount} frames.` });
        await fetchStatus();
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage({ type: 'error', text: data.error || 'Failed to inspect Figma file.' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to inspect Figma file.' });
    } finally {
      setFigmaInspectLoading(false);
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
    const isBusy = actionLoading === app.id;
    const connState = status?.status || 'disconnected';

    // ── NOT CONNECTED: Provide Connect Button ──
    if (connState === 'disconnected') {
      if (app.id === 'google_drive') {
        return (
          <button
            type="button"
            onClick={handleConnectGoogle}
            disabled={isBusy}
            className="btn-primary"
            style={{ height: '34px', padding: '0 16px', fontSize: '13px', fontWeight: 600, borderRadius: '8px', whiteSpace: 'nowrap' }}
          >
            {isBusy ? <Loader2 size={14} className="spin-icon" /> : 'Connect'}
          </button>
        );
      }
      if (app.id === 'vscode') {
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setShowVsCodeGuide(true)}
              style={{
                height: '34px',
                padding: '0 12px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                color: '#334155',
                fontSize: '12.5px',
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
            >
              Guide
            </button>
            <button
              type="button"
              onClick={handleConnectVsCode}
              disabled={isBusy}
              className="btn-primary"
              style={{ height: '34px', padding: '0 16px', fontSize: '13px', fontWeight: 600, borderRadius: '8px', whiteSpace: 'nowrap' }}
            >
              {isBusy ? <Loader2 size={14} className="spin-icon" /> : 'Connect'}
            </button>
          </div>
        );
      }

      // GitHub, Notion, Slack, Figma: Open Connect Token Modal
      return (
        <button
          type="button"
          onClick={() => handleOpenConnectModal(app)}
          disabled={isBusy}
          className="btn-primary"
          style={{ height: '34px', padding: '0 16px', fontSize: '13px', fontWeight: 600, borderRadius: '8px', whiteSpace: 'nowrap' }}
        >
          Connect
        </button>
      );
    }

    // ── CONNECTED: Actions per provider ──
    if (app.id === 'vscode') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => setShowVsCodeGuide(true)}
            style={{
              height: '34px',
              padding: '0 12px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              color: '#334155',
              fontSize: '12.5px',
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Guide
          </button>
          <button
            type="button"
            onClick={handleConnectVsCode}
            disabled={isBusy}
            className="btn-change-plan-outline"
            style={{ height: '34px', padding: '0 12px', fontSize: '12.5px', fontWeight: 500, whiteSpace: 'nowrap' }}
          >
            {isBusy ? <Loader2 size={13} className="spin-icon" /> : 'Regenerate'}
          </button>
          <button
            type="button"
            onClick={() => handleGenericDisconnect('vscode', 'VS Code Extension')}
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
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Disconnect
          </button>
        </div>
      );
    }

    if (app.id === 'google_drive') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={openPicker}
            disabled={isBusy || connState === 'syncing'}
            className="btn-change-plan-outline"
            style={{ height: '34px', padding: '0 12px', fontSize: '12.5px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Folder size={13} />
            Choose Files
          </button>
          <button
            type="button"
            onClick={() => handleGenericDisconnect('google_drive', 'Google Drive')}
            disabled={isBusy}
            style={{ height: '34px', padding: '0 12px', background: 'transparent', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '12.5px', fontWeight: 500, cursor: 'pointer' }}
          >
            Disconnect
          </button>
        </div>
      );
    }

    if (app.id === 'github') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={openGitHubModal}
            disabled={isBusy}
            className="btn-change-plan-outline"
            style={{ height: '34px', padding: '0 12px', fontSize: '12.5px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <GitBranch size={13} />
            Select Repo
          </button>
          <button
            type="button"
            onClick={() => handleGenericDisconnect('github', 'GitHub')}
            disabled={isBusy}
            style={{ height: '34px', padding: '0 12px', background: 'transparent', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '12.5px', fontWeight: 500, cursor: 'pointer' }}
          >
            Disconnect
          </button>
        </div>
      );
    }

    if (app.id === 'notion') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={openNotionModal}
            disabled={isBusy}
            className="btn-change-plan-outline"
            style={{ height: '34px', padding: '0 12px', fontSize: '12.5px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FileText size={13} />
            Select Pages
          </button>
          <button
            type="button"
            onClick={() => handleGenericDisconnect('notion', 'Notion')}
            disabled={isBusy}
            style={{ height: '34px', padding: '0 12px', background: 'transparent', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '12.5px', fontWeight: 500, cursor: 'pointer' }}
          >
            Disconnect
          </button>
        </div>
      );
    }

    if (app.id === 'slack') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={openSlackModal}
            disabled={isBusy}
            className="btn-change-plan-outline"
            style={{ height: '34px', padding: '0 12px', fontSize: '12.5px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Hash size={13} />
            Channels
          </button>
          <button
            type="button"
            onClick={() => handleGenericDisconnect('slack', 'Slack')}
            disabled={isBusy}
            style={{ height: '34px', padding: '0 12px', background: 'transparent', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '12.5px', fontWeight: 500, cursor: 'pointer' }}
          >
            Disconnect
          </button>
        </div>
      );
    }

    if (app.id === 'figma') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setShowFigmaModal(true)}
            disabled={isBusy}
            className="btn-change-plan-outline"
            style={{ height: '34px', padding: '0 12px', fontSize: '12.5px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Eye size={13} />
            Inspect File
          </button>
          <button
            type="button"
            onClick={() => handleGenericDisconnect('figma', 'Figma')}
            disabled={isBusy}
            style={{ height: '34px', padding: '0 12px', background: 'transparent', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '12.5px', fontWeight: 500, cursor: 'pointer' }}
          >
            Disconnect
          </button>
        </div>
      );
    }

    return null;
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
          padding: 16px 20px;
          transition: all 0.2s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          box-sizing: border-box;
          overflow: hidden;
        }
        .app-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        .app-card-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          width: 100%;
          box-sizing: border-box;
        }
        .app-card-info {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          flex: 1 1 300px;
          min-width: 0;
        }
        .app-card-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }
        .app-card-details {
          flex: 1;
          min-width: 0;
        }
        .app-card-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .app-card-title {
          font-size: 15px;
          font-weight: 600;
          color: #0f172a;
          letter-spacing: -0.01em;
        }
        .app-card-category {
          font-size: 12.5px;
          color: #64748b;
          margin: 2px 0 0 0;
        }
        .app-card-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
          margin-left: auto;
        }
        @media (max-width: 640px) {
          .app-card-inner {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }
          .app-card-actions {
            justify-content: flex-end;
            padding-top: 10px;
            border-top: 1px solid #f1f5f9;
            width: 100%;
          }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.01em' }}>
          Connected Apps
        </h1>
        <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
          Manage cloud drives, code repositories, team bots, and design extensions across your workspace.
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
            const isConnected = status && status.status && status.status !== 'disconnected' && status.status !== 'coming_soon';

            return (
              <div key={app.id} className="app-card">
                <div className="app-card-inner">
                  {/* Left: Icon + Content */}
                  <div className="app-card-info">
                    <div
                      className="app-card-icon"
                      style={{
                        background: app.iconBg || '#f8fafc',
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

                    <div className="app-card-details">
                      <div className="app-card-title-row">
                        <span className="app-card-title">{app.name}</span>
                        {renderStatusBadge(app)}
                      </div>

                      <p className="app-card-category">{app.category}</p>

                      {/* Connected Details */}
                      {isConnected ? (
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
                          {status.name && (
                            <span>
                              Account: <strong>{status.name}</strong>
                            </span>
                          )}
                          {status.email && (
                            <span>
                              Email: <strong>{status.email}</strong>
                            </span>
                          )}
                          {status.keyPrefix && (
                            <span>
                              Token: <code>{status.keyPrefix}••••••••</code>
                            </span>
                          )}
                          {status.filesIndexed > 0 && (
                            <span>
                              Indexed: <strong>{status.filesIndexed}</strong>
                            </span>
                          )}
                          {status.lastSyncAt && (
                            <span>
                              Last Sync: <strong>{timeAgo(status.lastSyncAt)}</strong>
                            </span>
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
                  <div className="app-card-actions">
                    {renderActions(app)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Connect Token Modal (GitHub, Notion, Slack, Figma) ── */}
      {connectModalApp && (
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
              <div style={{ display: 'flex', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: connectModalApp.iconBg || '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {appIcon(connectModalApp.id)}
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                    Connect {connectModalApp.name}
                  </h3>
                  <p style={{ fontSize: '12.5px', color: '#64748b', margin: '3px 0 0 0' }}>
                    {connectModalApp.category}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConnectModalApp(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ marginTop: '18px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
                {connectModalApp.id === 'github' && 'GitHub Personal Access Token (classic or fine-grained)'}
                {connectModalApp.id === 'notion' && 'Notion Internal Integration Secret (secret_...)'}
                {connectModalApp.id === 'slack' && 'Slack Bot User OAuth Token (xoxb-...)'}
                {connectModalApp.id === 'figma' && 'Figma Personal Access Token (figd_...)'}
              </label>

              <input
                type="password"
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                placeholder={
                  connectModalApp.id === 'github'
                    ? 'ghp_... or github_pat_...'
                    : connectModalApp.id === 'notion'
                    ? 'secret_...'
                    : connectModalApp.id === 'slack'
                    ? 'xoxb-...'
                    : 'figd_...'
                }
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />

              {connectError && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#dc2626' }}>
                  {connectError}
                </div>
              )}

              <p style={{ fontSize: '12px', color: '#64748b', margin: '8px 0 0 0', lineHeight: 1.5 }}>
                {connectModalApp.id === 'github' && (
                  <span>
                    Generate a token in GitHub under{' '}
                    <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>
                      Settings → Developer settings → Personal access tokens ↗
                    </a>{' '}
                    with <code>repo</code> scope.
                  </span>
                )}
                {connectModalApp.id === 'notion' && (
                  <span>
                    Create an integration secret in{' '}
                    <a href="https://www.notion.so/my-integrations" target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>
                      Notion Developers Portal ↗
                    </a>{' '}
                    and invite it to your pages.
                  </span>
                )}
                {connectModalApp.id === 'slack' && (
                  <span>
                    Get your Bot User OAuth Token in{' '}
                    <a href="https://api.slack.com/apps" target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>
                      Slack API Apps ↗
                    </a>{' '}
                    under OAuth & Permissions.
                  </span>
                )}
                {connectModalApp.id === 'figma' && (
                  <span>
                    Generate a personal access token under Figma Settings → Security → Personal access tokens.
                  </span>
                )}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '22px' }}>
              <button
                onClick={() => setConnectModalApp(null)}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#475569', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitConnectModal}
                disabled={connectLoading || !inputToken.trim()}
                className="btn-primary"
                style={{ flex: 1, padding: '10px', fontSize: '13px', borderRadius: '8px', opacity: connectLoading || !inputToken.trim() ? 0.6 : 1 }}
              >
                {connectLoading ? <Loader2 size={14} className="spin-icon" /> : 'Authorize & Connect'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── GitHub Repositories Selector Modal ── */}
      {showGitHubModal && (
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
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#0f172a' }}>Select GitHub Repository</h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
                  Index a repository into your workspace RAG drive for whole-codebase AI context.
                </p>
              </div>
              <button onClick={() => setShowGitHubModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '0 20px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <Search size={15} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Filter repositories..."
                  value={repoSearch}
                  onChange={(e) => setRepoSearch(e.target.value)}
                  style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13px' }}
                />
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px', minHeight: '220px' }}>
              {reposLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: '8px', color: '#64748b' }}>
                  <Loader2 size={24} className="spin-icon" style={{ color: '#2563eb' }} />
                  <span style={{ fontSize: '12.5px' }}>Loading repositories...</span>
                </div>
              ) : gitHubRepos.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '30px 0' }}>No repositories found.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {gitHubRepos
                    .filter((r) => r.fullName.toLowerCase().includes(repoSearch.toLowerCase()))
                    .map((repo) => (
                      <div
                        key={repo.id}
                        onClick={() => setSelectedRepo(repo)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 14px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          background: selectedRepo?.id === repo.id ? '#eff6ff' : '#ffffff',
                          border: `1px solid ${selectedRepo?.id === repo.id ? '#bfdbfe' : '#e2e8f0'}`,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>{repo.fullName}</div>
                          {repo.description && (
                            <div style={{ fontSize: '12px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {repo.description}
                            </div>
                          )}
                        </div>
                        <span style={{ fontSize: '11px', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', color: '#475569' }}>
                          {repo.defaultBranch}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {selectedRepo ? `Selected: ${selectedRepo.fullName}` : 'Select a repository'}
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowGitHubModal(false)} style={{ padding: '8px 16px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', fontSize: '13px', color: '#475569' }}>
                  Cancel
                </button>
                <button
                  onClick={handleSyncGitHubRepo}
                  disabled={!selectedRepo || actionLoading === 'github'}
                  className="btn-primary"
                  style={{ padding: '8px 16px', fontSize: '13px', opacity: !selectedRepo ? 0.5 : 1 }}
                >
                  {actionLoading === 'github' ? 'Indexing…' : 'Index Repository'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Notion Pages Picker Modal ── */}
      {showNotionModal && (
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#0f172a' }}>Select Notion Pages</h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
                  Select pages and databases to sync into your knowledge base.
                </p>
              </div>
              <button onClick={() => setShowNotionModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px', minHeight: '220px' }}>
              {pagesLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: '8px', color: '#64748b' }}>
                  <Loader2 size={24} className="spin-icon" style={{ color: '#2563eb' }} />
                  <span style={{ fontSize: '12.5px' }}>Loading Notion pages...</span>
                </div>
              ) : notionPages.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '30px 0' }}>No accessible pages found.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {notionPages.map((page) => (
                    <div
                      key={page.id}
                      onClick={() =>
                        setSelectedPageIds((prev) =>
                          prev.includes(page.id) ? prev.filter((id) => id !== page.id) : [...prev, page.id]
                        )
                      }
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: selectedPageIds.includes(page.id) ? '#eff6ff' : '#ffffff',
                        border: `1px solid ${selectedPageIds.includes(page.id) ? '#bfdbfe' : '#e2e8f0'}`,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedPageIds.includes(page.id)}
                        onChange={() => {}}
                      />
                      <FileText size={16} color="#d97706" />
                      <span style={{ fontSize: '13.5px', color: '#0f172a', flex: 1 }}>{page.title}</span>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>{page.objectType}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>{selectedPageIds.length} page(s) selected</span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowNotionModal(false)} style={{ padding: '8px 16px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', fontSize: '13px', color: '#475569' }}>
                  Cancel
                </button>
                <button
                  onClick={handleSyncNotionPages}
                  disabled={selectedPageIds.length === 0 || actionLoading === 'notion'}
                  className="btn-primary"
                  style={{ padding: '8px 16px', fontSize: '13px', opacity: selectedPageIds.length === 0 ? 0.5 : 1 }}
                >
                  {actionLoading === 'notion' ? 'Syncing…' : 'Sync Pages'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Slack Channels Selector Modal ── */}
      {showSlackModal && (
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
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#0f172a' }}>Select Slack Channel</h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
                  Sync channel discussion history into workspace knowledge context.
                </p>
              </div>
              <button onClick={() => setShowSlackModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px', minHeight: '200px' }}>
              {channelsLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: '8px', color: '#64748b' }}>
                  <Loader2 size={24} className="spin-icon" style={{ color: '#2563eb' }} />
                  <span style={{ fontSize: '12.5px' }}>Loading Slack channels...</span>
                </div>
              ) : slackChannels.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '30px 0' }}>No channels found.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {slackChannels.map((channel) => (
                    <div
                      key={channel.id}
                      onClick={() => setSelectedChannel(channel)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: selectedChannel?.id === channel.id ? '#eff6ff' : '#ffffff',
                        border: `1px solid ${selectedChannel?.id === channel.id ? '#bfdbfe' : '#e2e8f0'}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Hash size={16} color="#059669" />
                        <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>{channel.name}</span>
                      </div>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>{channel.memberCount} members</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {selectedChannel ? `#${selectedChannel.name}` : 'Select a channel'}
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowSlackModal(false)} style={{ padding: '8px 16px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', fontSize: '13px', color: '#475569' }}>
                  Cancel
                </button>
                <button
                  onClick={handleSyncSlackChannel}
                  disabled={!selectedChannel || actionLoading === 'slack'}
                  className="btn-primary"
                  style={{ padding: '8px 16px', fontSize: '13px', opacity: !selectedChannel ? 0.5 : 1 }}
                >
                  {actionLoading === 'slack' ? 'Syncing…' : 'Sync Channel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Figma File Inspector Modal ── */}
      {showFigmaModal && (
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
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#0f172a' }}>Inspect Figma Design File</h3>
                <p style={{ fontSize: '12.5px', color: '#64748b', margin: '3px 0 0 0' }}>
                  Import frames and design components to guide UI code generation.
                </p>
              </div>
              <button onClick={() => setShowFigmaModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ marginTop: '18px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
                Figma File URL or Key
              </label>
              <input
                type="text"
                value={figmaFileUrl}
                onChange={(e) => setFigmaFileUrl(e.target.value)}
                placeholder="https://www.figma.com/design/abcdef123456/My-App-Design"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />

              {figmaResult && (
                <div style={{ marginTop: '14px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12.5px' }}>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{figmaResult.name}</div>
                  <div style={{ color: '#64748b', marginTop: '2px' }}>{figmaResult.framesCount} frames extracted</div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '22px' }}>
              <button onClick={() => setShowFigmaModal(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#475569', fontSize: '13px' }}>
                Close
              </button>
              <button
                onClick={handleInspectFigmaFile}
                disabled={figmaInspectLoading || !figmaFileUrl.trim()}
                className="btn-primary"
                style={{ flex: 1, padding: '10px', fontSize: '13px', borderRadius: '8px' }}
              >
                {figmaInspectLoading ? <Loader2 size={14} className="spin-icon" /> : 'Inspect & Sync'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Google Drive File Picker Modal ── */}
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
              <button onClick={() => setShowPicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>

            {folderStack.length > 0 && (
              <button
                onClick={goBack}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: '0 20px 8px 20px' }}
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
                <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '30px 0' }}>No files found in this folder.</p>
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
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>{selectedFileIds.length} file(s) selected</span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowPicker(false)} style={{ padding: '8px 16px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', fontSize: '13px', color: '#475569' }}>
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

      {/* ── VS Code Token Reveal Modal ── */}
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
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
              <button onClick={() => { setVsCodeToken(null); setVsCodeCopied(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '18px', padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
              <code style={{ flex: 1, fontSize: '12.5px', color: '#0f172a', overflowX: 'auto', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                {vsCodeToken}
              </code>
              <button
                type="button"
                onClick={copyVsCodeToken}
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
                }}
              >
                {vsCodeCopied ? <Check size={14} /> : <Copy size={14} />} {vsCodeCopied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => { setVsCodeToken(null); setShowVsCodeGuide(true); }} style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#475569', fontSize: '13px' }}>
                View Guide
              </button>
              <button onClick={() => setVsCodeToken(null)} className="btn-primary" style={{ flex: 1, padding: '10px', fontSize: '13px', borderRadius: '8px' }}>
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
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
              <button onClick={() => setShowVsCodeGuide(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#7c3aed', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>1</span>
                  <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>Install the Extension</span>
                </div>
                <pre style={{ margin: '8px 0 0 0', padding: '8px 10px', background: '#0f172a', color: '#f8fafc', borderRadius: '6px', fontSize: '11.5px', overflowX: 'auto' }}>
                  code --install-extension harikson-vscode-extension-1.0.0.vsix
                </pre>
              </div>

              <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#7c3aed', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>2</span>
                  <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>Configure Credentials</span>
                </div>
                <div style={{ fontSize: '12px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>• <code>Harikson: Tenant Url</code> → <code>https://xarwiz.com</code></div>
                  <div>• <code>Harikson: Api Key</code> → your personal access token</div>
                </div>
              </div>
            </div>

            <button onClick={() => setShowVsCodeGuide(false)} className="btn-primary" style={{ marginTop: '20px', width: '100%', padding: '10px', fontSize: '13px', borderRadius: '8px' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
