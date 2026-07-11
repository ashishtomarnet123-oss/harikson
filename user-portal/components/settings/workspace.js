import React, { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';

export default function WorkspaceSettings() {
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchWorkspace();
  }, []);

  const [editingMemberId, setEditingMemberId] = useState(null);
  const [updatingRole, setUpdatingRole] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('Member');
  const [newPassword, setNewPassword] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newEmail || !newName) return;
    setAddingMember(true);
    setError(null);
    try {
      const token = localStorage.getItem('hk_token');
      if (!token) return;
      const apiBase = localStorage.getItem('hk_api_base') || 'http://localhost:3008';
      const tenantSlug = localStorage.getItem('hk_tenant') || 'neuravolt';
      const res = await fetch(`${apiBase}/api/user/workspace/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-slug': tenantSlug
        },
        body: JSON.stringify({
          email: newEmail,
          name: newName,
          role: newRole,
          password: newPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        setWorkspace(prev => ({
          ...prev,
          members: [data, ...prev.members]
        }));
        setNewEmail('');
        setNewName('');
        setNewPassword('');
        setNewRole('Member');
        setShowAddForm(false);
      } else {
        throw new Error(data.error || 'Failed to add workspace member');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingMember(false);
    }
  };

  const fetchWorkspace = async () => {
    try {
      const token = localStorage.getItem('hk_token');
      if (!token) return;
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

  const handleRoleChange = async (memberId, newRole) => {
    setUpdatingRole(true);
    setError(null);
    try {
      const token = localStorage.getItem('hk_token');
      if (!token) return;
      const apiBase = localStorage.getItem('hk_api_base') || 'http://localhost:3008';
      const tenantSlug = localStorage.getItem('hk_tenant') || 'neuravolt';
      const res = await fetch(`${apiBase}/api/user/workspace/members/${memberId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-slug': tenantSlug
        },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (res.ok) {
        setWorkspace(prev => ({
          ...prev,
          members: prev.members.map(m => m.id === memberId ? { ...m, role: newRole } : m)
        }));
        setEditingMemberId(null);
      } else {
        throw new Error(data.error || 'Failed to update member role');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingRole(false);
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
            <div className="settings-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h2>Members &amp; Roles</h2>
              {!showAddForm && (
                <button 
                  onClick={() => setShowAddForm(true)}
                  style={{
                    background: 'var(--accent)',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500'
                  }}
                >
                  Add Member
                </button>
              )}
            </div>

            {showAddForm && (
              <form onSubmit={handleAddMember} style={{
                background: 'var(--bg-hover)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ fontWeight: '600', fontSize: '14px' }}>Add New Member</div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <input 
                    type="text" 
                    placeholder="Full Name" 
                    value={newName} 
                    onChange={e => setNewName(e.target.value)} 
                    required 
                    style={{
                      flex: '1 1 200px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: 'var(--text)',
                      fontSize: '13.5px'
                    }}
                  />
                  <input 
                    type="email" 
                    placeholder="Email Address" 
                    value={newEmail} 
                    onChange={e => setNewEmail(e.target.value)} 
                    required 
                    style={{
                      flex: '1 1 200px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: 'var(--text)',
                      fontSize: '13.5px'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <select 
                    value={newRole} 
                    onChange={e => setNewRole(e.target.value)}
                    style={{
                      flex: '1 1 150px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: 'var(--text)',
                      fontSize: '13.5px',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="Member">Member</option>
                    <option value="Admin">Admin</option>
                    <option value="Owner">Owner</option>
                  </select>
                  <input 
                    type="password" 
                    placeholder="Password (Default: Welcome123!)" 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                    style={{
                      flex: '1 1 200px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: 'var(--text)',
                      fontSize: '13.5px'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                  <button 
                    type="button" 
                    onClick={() => setShowAddForm(false)}
                    style={{
                      background: 'none',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      color: 'var(--text)',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={addingMember}
                    style={{
                      background: 'var(--accent)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      color: '#fff',
                      cursor: addingMember ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                      fontWeight: '500'
                    }}
                  >
                    {addingMember ? 'Adding...' : 'Add Member'}
                  </button>
                </div>
              </form>
            )}

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
                    {editingMemberId === m.id ? (
                      <select 
                        defaultValue={m.role}
                        disabled={updatingRole}
                        onChange={(e) => handleRoleChange(m.id, e.target.value)}
                        onBlur={() => setEditingMemberId(null)}
                        style={{
                          background: 'var(--bg-hover)',
                          color: 'var(--text)',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          fontSize: '13px',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                        autoFocus
                      >
                        <option value="Member">Member</option>
                        <option value="Admin">Admin</option>
                        <option value="Owner">Owner</option>
                      </select>
                    ) : (
                      <>
                        <span className={getRoleBadgeClass(m.role)}>{m.role}</span>
                        <button 
                          onClick={() => setEditingMemberId(m.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', display: 'flex' }}
                        >
                          <Settings size={15} />
                        </button>
                      </>
                    )}
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
