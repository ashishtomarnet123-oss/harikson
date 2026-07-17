import React, { useState, useEffect } from 'react';
import { Plus, Key, Copy, Trash2 } from 'lucide-react';

export default function DeveloperSettings() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const token = localStorage.getItem('hk_user') ? 'cookie_auth' : null;
      if (!token) return;
      const apiBase =
        localStorage.getItem('hk_api_base') || 'http://localhost:3008';
      const tenantSlug = localStorage.getItem('hk_tenant') || 'neuravolt';
      const res = await fetch(`${apiBase}/api/v1/user/developer/keys`, {
        credentials: 'include',
        headers: {
          'x-tenant-slug': tenantSlug,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setKeys(data);
      } else {
        throw new Error('Failed to load keys');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    const name = prompt('Enter a name for the new API Key:');
    if (!name || !name.trim()) return;

    try {
      const token = localStorage.getItem('hk_user') ? 'cookie_auth' : null;
      if (!token) return;
      const apiBase =
        localStorage.getItem('hk_api_base') || 'http://localhost:3008';
      const tenantSlug = localStorage.getItem('hk_tenant') || 'neuravolt';
      const idempotencyKey = `apikey:${name.trim()}:${Date.now()}:${Math.random()}`;
      const res = await fetch(`${apiBase}/api/v1/user/developer/keys`, {
        credentials: 'include',
        method: 'POST',
        headers: {
          'x-tenant-slug': tenantSlug,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys);
      } else {
        alert('Failed to generate key');
      }
    } catch (err) {
      console.error(err);
      alert('Error creating key');
    }
  };

  const handleRevokeKey = async (id) => {
    if (
      !confirm(
        'Are you sure you want to revoke this API Key? It will immediately stop working.'
      )
    )
      return;

    try {
      const token = localStorage.getItem('hk_user') ? 'cookie_auth' : null;
      if (!token) return;
      const apiBase =
        localStorage.getItem('hk_api_base') || 'http://localhost:3008';
      const tenantSlug = localStorage.getItem('hk_tenant') || 'neuravolt';
      const res = await fetch(`${apiBase}/api/v1/user/developer/keys/${id}`, {
        credentials: 'include',
        method: 'DELETE',
        headers: {
          'x-tenant-slug': tenantSlug,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys);
      } else {
        alert('Failed to revoke key');
      }
    } catch (err) {
      console.error(err);
      alert('Error revoking key');
    }
  };

  const handleCopy = (key) => {
    navigator.clipboard.writeText(key);
    alert('API Key copied to clipboard!');
  };

  if (loading)
    return (
      <div className="settings-loading">Loading developer resources...</div>
    );

  return (
    <>
      <div className="settings-page-header">
        <h1>Developer Settings</h1>
        <p>Manage your API keys and developer resources.</p>
      </div>

      <div className="settings-section">
        <div className="settings-section-header">
          <h2>Personal API Keys</h2>
          <button className="btn-primary" onClick={handleCreateKey}>
            <Plus size={15} /> New Key
          </button>
        </div>

        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '13.5px',
            marginBottom: '16px',
            lineHeight: '1.5',
          }}
        >
          Use these keys to authenticate API requests. Do not share them
          publicly.
        </p>

        {error && <div className="settings-alert error">{error}</div>}

        {keys.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            No API keys created yet.
          </p>
        ) : (
          <div className="settings-flex-col">
            {keys.map((k) => (
              <div key={k.id} className="settings-card">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '7px',
                        marginBottom: '6px',
                      }}
                    >
                      <Key size={13} color="var(--text-muted)" />
                      <span style={{ fontWeight: '500', fontSize: '14px' }}>
                        {k.name}
                      </span>
                    </div>
                    <div
                      className="settings-api-key"
                      style={{
                        wordBreak: 'break-all',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                      }}
                    >
                      {k.key}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-muted)',
                        marginTop: '7px',
                      }}
                    >
                      Created: {k.created} &middot; Last used: {k.lastUsed}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button
                      onClick={() => handleCopy(k.key)}
                      style={{
                        background: 'none',
                        border: '1px solid var(--border)',
                        padding: '6px 8px',
                        borderRadius: '7px',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Copy key"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={() => handleRevokeKey(k.id)}
                      style={{
                        background: 'none',
                        border: '1px solid rgba(239,68,68,0.3)',
                        padding: '6px 8px',
                        borderRadius: '7px',
                        cursor: 'pointer',
                        color: '#dc2626',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Revoke key"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
