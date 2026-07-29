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

// None of these integrations have a real OAuth flow wired up on the user-panel
// side yet (admin-api/src/routers/integrations.js has provider configs, but no
// user-facing route consumes them). This list previously showed several as
// "Connected" with fabricated account names and let a client-only toggle claim
// to connect/disconnect them — that's actively misleading, so every entry is
// honestly labeled "Coming Soon" until a real OAuth flow exists for it.
const COMING_SOON_APPS = [
  {
    id: 'google-workspace',
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

export default function ConnectedAppsSettings() {
  const [apps] = useState(COMING_SOON_APPS);
  const [message] = useState(null);

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
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
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
                      Coming Soon
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: '3px 0 0 0' }}>
                    {app.category}
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
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
