import { authenticatedFetch, getApiConfig } from './apiHelper';
import React, { useState, useEffect } from 'react';
import { Plus, Key, Copy, Trash2 } from 'lucide-react';

export default function DeveloperSettings() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Holds the plaintext secret only for the few seconds between creation and
  // the user dismissing the reveal dialog — never stored alongside the list,
  // which only ever holds prefixes from the backend.
  const [revealedKey, setRevealedKey] = useState(null);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      setLoading(true);
      setError(null);
      const { apiBase, tenantSlug } = getApiConfig();
      let res;
      try {
        res = await authenticatedFetch(`${apiBase}/api/v1/user/developer/keys`, {
          credentials: 'include',
          headers: {
            'x-tenant-slug': tenantSlug,
          },
        });
      } catch (e) {
        res = await authenticatedFetch(`/api/v1/user/developer/keys`, {
          credentials: 'include',
          headers: {
            'x-tenant-slug': tenantSlug,
          },
        });
      }

      if (res && res.ok) {
        const data = await res.json();
        setKeys(data);
      } else {
        setKeys([]);
      }
    } catch (err) {
      setKeys([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    const name = prompt('Enter a name for the new API Key:');
    if (!name || !name.trim()) return;

    try {
      if (!localStorage.getItem('hk_user')) return;
      const { apiBase, tenantSlug } = getApiConfig();
      const idempotencyKey = `apikey:${name.trim()}:${Date.now()}:${Math.random()}`;
      const defaultScopes = ['chat:read', 'chat:write', 'documents:read', 'documents:write'];
      const res = await authenticatedFetch(`${apiBase}/api/v1/user/developer/keys`, {
        credentials: 'include',
        method: 'POST',
        headers: {
          'x-tenant-slug': tenantSlug,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({ name, scopes: defaultScopes }),
      });
      if (res.ok) {
        const data = await res.json();
        // The create endpoint returns the one-time plaintext secretKey on
        // this single response only — it is never retrievable again after
        // this point, and the list endpoint only ever returns key prefixes.
        setRevealedKey(data.secretKey);
        await fetchKeys();
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
      if (!localStorage.getItem('hk_user')) return;
      const { apiBase, tenantSlug } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/v1/user/developer/keys/${id}`, {
        credentials: 'include',
        method: 'DELETE',
        headers: {
          'x-tenant-slug': tenantSlug,
        },
      });
      if (res.ok) {
        await fetchKeys();
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
      <div className="settings-header-group">
        <h1 className="settings-main-title">API Keys</h1>
        <p className="settings-main-subtitle">
          Manage your secret API keys and authentication tokens for programmatic API access.
        </p>
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
                      {k.prefix}••••••••••••••••
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-muted)',
                        marginTop: '7px',
                      }}
                    >
                      Created: {k.createdAt ? new Date(k.createdAt).toLocaleDateString() : '—'} &middot; Last used:{' '}
                      {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'Never'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
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

      {revealedKey && (
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
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0', color: '#0f172a' }}>
              Your new API key
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5', margin: '0 0 16px 0' }}>
              Copy this key now — for your security, it won&apos;t be shown again. Only a
              masked prefix will be visible afterwards.
            </p>
            <div
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '10px 12px',
                marginBottom: '16px',
              }}
            >
              <code style={{ flex: 1, wordBreak: 'break-all', fontSize: '12.5px' }}>{revealedKey}</code>
              <button
                type="button"
                onClick={() => handleCopy(revealedKey)}
                style={{
                  background: 'none',
                  border: '1px solid #cbd5e1',
                  borderRadius: '7px',
                  padding: '6px 8px',
                  cursor: 'pointer',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  flexShrink: 0,
                }}
                title="Copy key"
              >
                <Copy size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setRevealedKey(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
