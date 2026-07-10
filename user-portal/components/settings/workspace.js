import React, { useState } from 'react';
import { Users, Server, ShieldCheck, Settings } from 'lucide-react';

export default function WorkspaceSettings() {
  const [members] = useState([
    { id: '1', name: 'Ashish Tomar', email: 'ashish@example.com', role: 'Owner', avatar: 'AT' },
    { id: '2', name: 'Alice Smith', email: 'alice@example.com', role: 'Admin', avatar: 'AS' },
    { id: '3', name: 'Bob Jones', email: 'bob@example.com', role: 'Member', avatar: 'BJ' }
  ]);

  return (
    <>
      <div className="settings-page-header">
        <h1>Workspace Settings</h1>
        <p>Manage your Harikson instance, invite team members, and configure roles.</p>
      </div>

      <div className="settings-section">
        <div style={{display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px'}}>
          <div style={{width: '64px', height: '64px', background: 'var(--accent)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '24px', fontWeight: 'bold'}}>
            H
          </div>
          <div>
            <h2 style={{margin: '0 0 4px 0'}}>Harikson AI (Production)</h2>
            <span style={{fontSize: '13px', color: 'var(--text-muted)'}}>Instance ID: ins_prd_9f8x2</span>
          </div>
        </div>

        <div className="form-group">
          <label>Workspace Name</label>
          <input type="text" defaultValue="Harikson AI (Production)" />
        </div>
        <div className="form-group">
          <label>Workspace Slug URL</label>
          <div style={{display: 'flex'}}>
            <span style={{padding: '10px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRight: 'none', borderRadius: 'var(--radius-md) 0 0 var(--radius-md)', color: 'var(--text-muted)'}}>harikson.ai/</span>
            <input type="text" defaultValue="production" style={{borderRadius: '0 var(--radius-md) var(--radius-md) 0'}} />
          </div>
        </div>
        <button className="btn-primary">Save Changes</button>
      </div>

      <div className="settings-section">
        <div className="settings-flex-row" style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border)'}}>
          <h2 style={{margin: 0, border: 'none', padding: 0}}>Members & Roles</h2>
          <button className="btn-primary">Invite Member</button>
        </div>

        <div className="settings-flex-col">
          {members.map(m => (
            <div key={m.id} className="settings-flex-row settings-card" style={{ padding: '12px 16px' }}>
              <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                <div style={{width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600'}}>
                  {m.avatar}
                </div>
                <div>
                  <div style={{fontWeight: '500', fontSize: '14px'}}>{m.name}</div>
                  <div style={{fontSize: '12px', color: 'var(--text-muted)'}}>{m.email}</div>
                </div>
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                <span style={{fontSize: '13px', padding: '4px 8px', background: m.role === 'Owner' ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-hover)', color: m.role === 'Owner' ? '#10b981' : 'var(--text-secondary)', borderRadius: '4px', fontWeight: '500'}}>
                  {m.role}
                </span>
                <button style={{background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)'}}><Settings size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
