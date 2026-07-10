import React, { useState } from 'react';
import { Plus, Key, Copy, Trash2 } from 'lucide-react';

export default function DeveloperSettings() {
  const [keys] = useState([
    { id: '1', name: 'Production API', key: 'hk_live_8f9a2b3c4d5e6f7a8b9c0d1e2f3a4b5c', created: '2026-06-15', lastUsed: '2 hours ago' },
    { id: '2', name: 'Testing Key', key: 'hk_test_4c2d1e3f4a5b6c7d8e9f0a1b2c3d4e5f', created: '2026-07-01', lastUsed: 'Never' }
  ]);

  return (
    <>
      <div className="settings-page-header">
        <h1>Developer Settings</h1>
        <p>Manage your API keys and developer resources.</p>
      </div>

      <div className="settings-section">
        <div className="settings-section-header">
          <h2>Personal API Keys</h2>
          <button className="btn-primary"><Plus size={15} /> New Key</button>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', marginBottom: '16px', lineHeight: '1.5' }}>
          Use these keys to authenticate API requests. Do not share them publicly.
        </p>

        <div className="settings-flex-col">
          {keys.map(k => (
            <div key={k.id} className="settings-card">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '6px' }}>
                    <Key size={13} color="var(--text-muted)" />
                    <span style={{ fontWeight: '500', fontSize: '14px' }}>{k.name}</span>
                  </div>
                  <div className="settings-api-key">{k.key}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '7px' }}>
                    Created: {k.created} &middot; Last used: {k.lastUsed}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button
                    style={{ background: 'none', border: '1px solid var(--border)', padding: '6px 8px', borderRadius: '7px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                    title="Copy key"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    style={{ background: 'none', border: '1px solid rgba(239,68,68,0.3)', padding: '6px 8px', borderRadius: '7px', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center' }}
                    title="Revoke key"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
