import { authenticatedFetch, getApiConfig } from './apiHelper';
import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  GitBranch,
  Globe,
  FileText,
  MessageSquare,
  Layers,
  Zap,
} from 'lucide-react';

export default function ConnectedAppsSettings() {
  const [apps, setApps] = useState([
    {
      id: 'google-workspace',
      name: 'Google Workspace & Drive',
      category: 'Cloud Storage & Docs',
      connected: true,
      connectedAs: 'ashish@harikson.ai',
      permissions: ['Read Document Embeddings', 'Sync RAG Drive Files'],
      lastSync: '10 minutes ago',
    },
    {
      id: 'github',
      name: 'GitHub Repository Sync',
      category: 'Developer Tools',
      connected: true,
      connectedAs: 'ashishtomarnet123-oss',
      permissions: ['Code Base Indexing', 'Repo Context Analysis'],
      lastSync: '1 hour ago',
    },
    {
      id: 'vscode-ext',
      name: 'Harikson VS Code Extension',
      category: 'IDE Integration',
      connected: true,
      connectedAs: 'Active Extension Session',
      permissions: ['Code Completion', 'Inline Chat Assistant'],
      lastSync: 'Active now',
    },
    {
      id: 'slack',
      name: 'Slack Workspace Bot',
      category: 'Team Messaging',
      connected: false,
      connectedAs: null,
      permissions: ['Channel Summarization', 'AI Query Bot'],
      lastSync: null,
    },
    {
      id: 'notion',
      name: 'Notion Knowledge Sync',
      category: 'Documentation & Wiki',
      connected: false,
      connectedAs: null,
      permissions: ['Page Import', 'Vector Indexing'],
      lastSync: null,
    },
    {
      id: 'figma',
      name: 'Figma Design Copilot',
      category: 'Design & UX',
      connected: false,
      connectedAs: null,
      permissions: ['Inspect Design Assets', 'UI Component Generation'],
      lastSync: null,
    },
  ]);

  const [message, setMessage] = useState(null);

  const toggleConnection = (id) => {
    setApps((prev) =>
      prev.map((app) => {
        if (app.id === id) {
          const nextState = !app.connected;
          setMessage({
            type: nextState ? 'success' : 'error',
            text: nextState
              ? `${app.name} connected successfully.`
              : `${app.name} connection has been revoked.`,
          });
          return {
            ...app,
            connected: nextState,
            connectedAs: nextState ? 'user@harikson.ai' : null,
            lastSync: nextState ? 'Just now' : null,
          };
        }
        return app;
      })
    );
  };

  return (
    <div className="connected-apps-container">
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

      {/* ── Active Integrations ── */}
      <div className="settings-section-block">
        <h2 className="settings-section-heading">Third-Party Integrations</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {apps.map((app) => (
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
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    background: app.connected ? '#eff6ff' : '#f8fafc',
                    border: '1px solid ' + (app.connected ? '#bfdbfe' : '#e2e8f0'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: app.connected ? '#2563eb' : '#64748b',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    flexShrink: 0,
                  }}
                >
                  {app.id === 'github' ? (
                    <GitBranch size={22} />
                  ) : app.id === 'google-workspace' ? (
                    <Globe size={22} />
                  ) : app.id === 'notion' ? (
                    <FileText size={22} />
                  ) : app.id === 'slack' ? (
                    <MessageSquare size={22} />
                  ) : app.id === 'vscode-ext' ? (
                    <Zap size={22} />
                  ) : (
                    <Layers size={22} />
                  )}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>{app.name}</span>
                    {app.connected ? (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: '#ecfdf5',
                          color: '#059669',
                          border: '1px solid #a7f3d0',
                        }}
                      >
                        Connected
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 500,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: '#f1f5f9',
                          color: '#64748b',
                        }}
                      >
                        Not Connected
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: '3px 0 0 0' }}>
                    {app.category} {app.connectedAs ? `• Signed in as ${app.connectedAs}` : ''}
                  </p>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    {app.permissions.map((perm, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '11px',
                          color: '#475569',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, marginLeft: '16px' }}>
                {app.connected ? (
                  <button
                    type="button"
                    onClick={() => toggleConnection(app.id)}
                    style={{
                      height: '36px',
                      padding: '0 14px',
                      background: '#ffffff',
                      border: '1px solid #fecaca',
                      borderRadius: '8px',
                      color: '#dc2626',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleConnection(app.id)}
                    style={{
                      height: '36px',
                      padding: '0 16px',
                      background: '#3b82f6',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 1px 2px rgba(59, 130, 246, 0.2)',
                    }}
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
