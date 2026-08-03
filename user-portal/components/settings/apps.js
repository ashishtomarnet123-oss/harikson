import { authenticatedFetch, getApiConfig } from './apiHelper';
import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';

// google_drive is the only provider with a real backend behind it
// (tenant-api's /api/integrations/google/*). The rest stay honestly labeled
// "Coming Soon" — this list previously showed all of these as "Connected"
// with fabricated account names and a client-only toggle; that was actively
// misleading, so nothing here claims to work until it actually does.
const APPS_META = [
  {
    id: 'google_drive',
    name: 'Google Workspace & Drive',
    category: 'Cloud Storage & Docs',
    permissions: ['Read Document Embeddings', 'Sync RAG Drive Files'],
  },
  {
    id: 'github',
    name: 'GitHub Repository Sync',
    category: 'Developer Tools',
    permissions: ['Code Base Indexing', 'Repo Context Analysis'],
  },
  {
    id: 'vscode-ext',
    name: 'Harikson VS Code Extension',
    category: 'IDE Integration',
    permissions: ['Code Completion', 'Inline Chat Assistant'],
  },
  {
    id: 'slack',
    name: 'Slack Workspace Bot',
    category: 'Team Messaging',
    permissions: ['Channel Summarization', 'AI Query Bot'],
  },
  {
    id: 'notion',
    name: 'Notion Knowledge Sync',
    category: 'Documentation & Wiki',
    permissions: ['Page Import', 'Vector Indexing'],
  },
  {
    id: 'figma',
    name: 'Figma Design Copilot',
    category: 'Design & UX',
    permissions: ['Inspect Design Assets', 'UI Component Generation'],
  },
];

function appIcon(id) {
  switch (id) {
    case 'github':
      return <GitBranch size={22} />;
    case 'google_drive':
      return <Globe size={22} />;
    case 'notion':
      return <FileText size={22} />;
    case 'slack':
      return <MessageSquare size={22} />;
    case 'vscode-ext':
      return <Zap size={22} />;
    default:
      return <Layers size={22} />;
  }
}

function timeAgo(isoString) {
  if (!isoString) return '—';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export default function ConnectedAppsSettings() {
  const [statusByProvider, setStatusByProvider] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const [showPicker, setShowPicker] = useState(false);
  const [pickerFiles, setPickerFiles] = useState([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState(undefined);
  const [folderStack, setFolderStack] = useState([]);
  const [selectedFileIds, setSelectedFileIds] = useState([]);

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

  // Handle the redirect back from Google's OAuth consent screen.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('google') === 'connected') {
      setMessage({ type: 'success', text: 'Google account connected. Choose which files to sync below.' });
      fetchStatus();
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('google_error')) {
      setMessage({ type: 'error', text: `Google connection failed: ${params.get('google_error')}` });
      window.history.replaceState({}, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll while a sync is actively running so the progress indicator updates.
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
      setMessage({ type: 'error', text: data.error || 'Failed to start Google connection.' });
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to start Google connection.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisconnectGoogle = async () => {
    if (!confirm('Disconnect Google Drive? Previously indexed documents stay in your RAG knowledge base — only future syncing stops.')) {
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
    setSelectedFileIds((prev) => (prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]));
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
        setMessage({ type: 'success', text: 'Sync started — this runs in the background.' });
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

  // "Sync Now" on an already-configured connection re-runs with whatever
  // selection was saved last time, without forcing the picker open again.
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
        setMessage({ type: 'success', text: 'Sync started — this runs in the background.' });
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

  const renderActions = (app) => {
    const status = statusByProvider[app.id];

    if (app.id !== 'google_drive') {
      return (
        <button
          type="button"
          disabled
          title="This integration isn't available yet"
          style={{
            height: '36px',
            padding: '0 16px',
            background: '#e2e8f0',
            border: 'none',
            borderRadius: '8px',
            color: '#94a3b8',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'not-allowed',
          }}
        >
          Connect
        </button>
      );
    }

    const isBusy = actionLoading === 'google_drive';
    const connState = status?.status || 'disconnected';

    if (connState === 'disconnected') {
      return (
        <button type="button" onClick={handleConnectGoogle} disabled={isBusy} className="btn-primary" style={{ height: '36px', padding: '0 16px', fontSize: '13px' }}>
          {isBusy ? <Loader2 size={14} className="spin-icon" /> : 'Connect'}
        </button>
      );
    }

    return (
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="button"
          onClick={openPicker}
          disabled={isBusy || connState === 'syncing'}
          className="btn-change-plan-outline"
          style={{ height: '36px', padding: '0 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={13} className={connState === 'syncing' ? 'spin-icon' : ''} />
          {connState === 'syncing' ? 'Syncing…' : 'Sync Now'}
        </button>
        <button
          type="button"
          onClick={handleDisconnectGoogle}
          disabled={isBusy}
          style={{
            height: '36px',
            padding: '0 14px',
            background: 'transparent',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#dc2626',
            fontSize: '13px',
            fontWeight: 600,
            cursor: isBusy ? 'default' : 'pointer',
          }}
        >
          Disconnect
        </button>
      </div>
    );
  };

  const renderStatusBadge = (app) => {
    const status = statusByProvider[app.id];
    if (app.id !== 'google_drive') {
      return (
        <span style={{ fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: '12px', background: '#f1f5f9', color: '#64748b' }}>
          Coming Soon
        </span>
      );
    }
    const s = status?.status || 'disconnected';
    const styles = {
      connected: { bg: '#dcfce7', color: '#16a34a', label: 'Connected' },
      syncing: { bg: '#dbeafe', color: '#2563eb', label: 'Syncing' },
      error: { bg: '#fee2e2', color: '#dc2626', label: 'Error' },
      disconnected: { bg: '#f1f5f9', color: '#64748b', label: 'Not Connected' },
    };
    const style = styles[s] || styles.disconnected;
    return (
      <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '12px', background: style.bg, color: style.color }}>
        {style.label}
      </span>
    );
  };

  return (
    <div className="connected-apps-container">
      <style jsx>{`
        .spin-icon {
          animation: connected-apps-spin 1s linear infinite;
        }
        @keyframes connected-apps-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>

      <div className="settings-header-group">
        <h1 className="settings-main-title">Connected Apps</h1>
        <p className="settings-main-subtitle">
          Manage third-party integrations, OAuth connections, and authorized AI extensions.
        </p>
      </div>

      {message && (
        <div className={`settings-toast-banner ${message.type}`}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="settings-section-block">
        <h2 className="settings-section-heading">Third-Party Integrations</h2>

        {loading ? (
          <div className="settings-loading-state">
            <div className="login-spinner" style={{ width: '24px', height: '24px' }} />
            <span>Loading integrations...</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {APPS_META.map((app) => {
              const status = statusByProvider[app.id];
              const isConnected = app.id === 'google_drive' && status && status.status !== 'disconnected';

              return (
                <div
                  key={app.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    background: '#ffffff',
                    transition: 'all 0.15s ease',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isConnected ? '#2563eb' : '#64748b',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}
                    >
                      {isConnected && status?.picture ? (
                        <img src={status.picture} alt={status.name || status.email || 'Connected account'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        appIcon(app.id)
                      )}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>{app.name}</span>
                        {renderStatusBadge(app)}
                      </div>
                      <p style={{ fontSize: '13px', color: '#64748b', margin: '3px 0 0 0' }}>{app.category}</p>

                      {isConnected ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginTop: '6px', fontSize: '12px', color: '#475569' }}>
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
                            <span>
                              Progress: <strong>{status.currentJob.processedItems}/{status.currentJob.totalItems}</strong>
                            </span>
                          )}
                          {status.status === 'error' && status.error && (
                            <span style={{ color: '#dc2626' }}>Error: {status.error}</span>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                          {app.permissions.map((perm, idx) => (
                            <span
                              key={idx}
                              style={{ fontSize: '11px', color: '#475569', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '2px 6px', borderRadius: '4px' }}
                            >
                              {perm}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, marginLeft: '16px' }}>
                    {renderActions(app)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Google Drive file/folder picker modal ── */}
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
                  Choose the Drive files you want indexed into your RAG knowledge base.
                </p>
              </div>
              <button onClick={() => setShowPicker(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}>
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
                <div className="settings-loading-state">
                  <div className="login-spinner" style={{ width: '20px', height: '20px' }} />
                  <span>Loading files...</span>
                </div>
              ) : pickerFiles.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '30px 0' }}>No files in this folder.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {pickerFiles.map((file) => (
                    <div
                      key={file.id}
                      onClick={() => (file.isFolder ? enterFolder(file) : toggleFile(file.id))}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '9px 8px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: !file.isFolder && selectedFileIds.includes(file.id) ? '#eff6ff' : 'transparent',
                      }}
                    >
                      {!file.isFolder && (
                        <input type="checkbox" checked={selectedFileIds.includes(file.id)} onChange={() => toggleFile(file.id)} onClick={(e) => e.stopPropagation()} />
                      )}
                      {file.isFolder ? <Folder size={16} color="#f59e0b" /> : <FileIcon size={16} color="#64748b" />}
                      <span style={{ fontSize: '13px', color: '#0f172a', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
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
                  style={{ padding: '8px 16px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 500, color: '#475569', cursor: 'pointer' }}
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
    </div>
  );
}
