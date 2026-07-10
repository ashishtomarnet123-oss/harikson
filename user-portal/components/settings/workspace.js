import React, { useState } from 'react';
import { Settings } from 'lucide-react';

export default function WorkspaceSettings() {
  const [members] = useState([
    { id: '1', name: 'Ashish Tomar', email: 'ashish@example.com', role: 'Owner', avatar: 'AT' },
    { id: '2', name: 'Alice Smith', email: 'alice@example.com', role: 'Admin', avatar: 'AS' },
    { id: '3', name: 'Bob Jones', email: 'bob@example.com', role: 'Member', avatar: 'BJ' }
  ]);

  const getRoleBadgeClass = (role) => {
    if (role === 'Owner') return 'settings-badge owner';
    if (role === 'Admin') return 'settings-badge admin';
    return 'settings-badge member';
  };

  return (
    <>
      <div className="settings-page-header">
        <h1>Workspace</h1>
        <p>Manage your Harikson instance, invite team members, and configure roles.</p>
      </div>

      <div className="settings-section">
        <h2>Instance Details</h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <div style={{
            width: '52px', height: '52px', flexShrink: 0,
            background: 'var(--accent)', borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: '22px', fontWeight: 'bold'
          }}>H</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: '600', fontSize: '15px', marginBottom: '2px' }}>Harikson AI (Production)</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', wordBreak: 'break-all' }}>Instance ID: ins_prd_9f8x2</div>
          </div>
        </div>

        <div className="settings-form">
          <div className="form-group">
            <label>Workspace Name</label>
            <input type="text" defaultValue="Harikson AI (Production)" />
          </div>

          <div className="form-group">
            <label>Workspace Slug URL</label>
            <div className="settings-slug-row">
              <span className="settings-slug-prefix">harikson.ai/</span>
              <input type="text" defaultValue="production" className="settings-slug-input" />
            </div>
          </div>

          <div className="settings-actions" style={{ marginTop: '8px' }}>
            <button type="button" className="btn-primary">Save Changes</button>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-header">
          <h2>Members &amp; Roles</h2>
          <button className="btn-primary">Invite Member</button>
        </div>

        <div className="settings-flex-col">
          {members.map(m => (
            <div key={m.id} className="settings-member-row">
              <div className="settings-member-info">
                <div className="settings-avatar">{m.avatar}</div>
                <div style={{ minWidth: 0 }}>
                  <div className="settings-member-name">{m.name}</div>
                  <div className="settings-member-email">{m.email}</div>
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
  );
}
