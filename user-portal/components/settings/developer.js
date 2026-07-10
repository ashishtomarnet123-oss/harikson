import React, { useState } from 'react';
import { Plus, Key, Copy, Trash2 } from 'lucide-react';

export default function DeveloperSettings() {
  const [keys] = useState([
    { id: '1', name: 'Production API', key: 'hk_live_8f9a2...', created: '2026-06-15', lastUsed: '2 hours ago' },
    { id: '2', name: 'Testing Key', key: 'hk_test_4c2d1...', created: '2026-07-01', lastUsed: 'Never' }
  ]);

  return (
    <>
      <div className="settings-page-header">
        <h1>Developer Settings</h1>
        <p>Manage your API keys and developer resources.</p>
      </div>

      <div className="settings-section">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border)'}}>
          <h2 style={{margin: 0, padding: 0, border: 'none'}}>Personal API Keys</h2>
          <button className="btn-primary"><Plus size={16} /> Generate New Key</button>
        </div>
        
        <p style={{color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px'}}>
          Use these keys to authenticate API requests from your applications. Do not share them publicly.
        </p>

        <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
          {keys.map(k => (
            <div key={k.id} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)'}}>
              <div>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px'}}>
                  <Key size={14} color="var(--text-muted)" />
                  <span style={{fontWeight: '500', fontSize: '14px'}}>{k.name}</span>
                </div>
                <div style={{fontFamily: 'monospace', fontSize: '13px', color: 'var(--text-secondary)', background: 'var(--bg-hover)', padding: '4px 8px', borderRadius: '4px', display: 'inline-block'}}>
                  {k.key}
                </div>
                <div style={{fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px'}}>
                  Created: {k.created} · Last used: {k.lastUsed}
                </div>
              </div>
              <div style={{display: 'flex', gap: '8px'}}>
                <button style={{background: 'none', border: '1px solid var(--border)', padding: '8px', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-secondary)'}} title="Copy">
                  <Copy size={16} />
                </button>
                <button style={{background: 'none', border: '1px solid var(--border)', padding: '8px', borderRadius: '4px', cursor: 'pointer', color: '#ef4444'}} title="Revoke">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
