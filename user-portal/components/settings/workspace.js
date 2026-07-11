import React, { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';

export default function WorkspaceSettings() {
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchWorkspace();
  }, []);

  const fetchWorkspace = async () => {
    try {
      const token = localStorage.getItem('hk_token');
      const apiBase = localStorage.getItem('hk_api_base') || 'http://localhost:3008';
      const tenantSlug = localStorage.getItem('hk_tenant') || 'neuravolt';
      const res = await fetch(`${apiBase}/api/user/workspace`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-slug': tenantSlug
        }
      });
      if (res.ok) {
        const data = await res.json();
        setWorkspace(data);
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load workspace details');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeClass = (role) => {
    if (role === 'Owner') return 'settings-badge owner';
    if (role === 'Admin') return 'settings-badge admin';
    return 'settings-badge member';
  };

  if (loading) return <div className="settings-loading">Loading workspace details...</div>;

  return (
    <>
      <div className="settings-page-header">
        <h1>Workspace</h1>
        <p>Manage your Harikson instance, invite team members, and configure roles.</p>
      </div>

      {error && <div className="settings-alert error">{error}</div>}

      {workspace && (
        <>
          <div className="settings-section">
            <h2>Instance Details</h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
              <div style={{
                width: '52px', height: '52px', flexShrink: 0,
                background: 'var(--accent)', borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '22px', fontWeight: 'bold'
              }}>
                {workspace.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: '600', fontSize: '15px', marginBottom: '2px' }}>{workspace.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', wordBreak: 'break-all' }}>Instance ID: {workspace.instanceId}</div>
              </div>
            </div>

            <div className="settings-form">
              <div className="form-group">
                <label>Workspace Name</label>
                <input type="text" defaultValue={workspace.name} readOnly style={{ background: 'var(--bg-hover)', cursor: 'not-allowed' }} />
              </div>

              <div className="form-group">
                <label>Workspace Slug URL</label>
                <div className="settings-slug-row" style={{ display: 'flex', alignItems: 'center' }}>
                  <span className="settings-slug-prefix" style={{ padding: '0 8px', color: 'var(--text-muted)' }}>harikson.ai/</span>
                  <input type="text" defaultValue={workspace.slug} readOnly style={{ flex: 1, background: 'var(--bg-hover)', cursor: 'not-allowed' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-header">
              <h2>Members &amp; Roles</h2>
            </div>

            <div className="settings-flex-col">
              {workspace.members.map(m => (
                <div key={m.id} className="settings-member-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div className="settings-member-info" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="settings-avatar" style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: 'var(--bg-hover)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      fontWeight: 'bold', fontSize: '13px'
                    }}>
                      {m.avatar}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="settings-member-name" style={{ fontWeight: '500', fontSize: '13.5px' }}>{m.name}</div>
                      <div className="settings-member-email" style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{m.email}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    <span className={getRoleBadgeClass(m.role)}>{m.role}</span>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', display: 'flex' }}>
                      <Settings size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
