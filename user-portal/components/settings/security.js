import React, { useState } from 'react';
import { Save, Smartphone } from 'lucide-react';

export default function SecuritySettings() {
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const handleChange = (e) => {
    setPasswords(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!passwords.current) {
      return setMessage({ type: 'error', text: 'Please enter your current password.' });
    }
    if (passwords.newPass.length < 8) {
      return setMessage({ type: 'error', text: 'New password must be at least 8 characters.' });
    }
    if (passwords.newPass !== passwords.confirm) {
      return setMessage({ type: 'error', text: 'New passwords do not match.' });
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('hk_token');
      const apiBase = localStorage.getItem('hk_api_base') || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3008';
      const res = await fetch(`${apiBase}/api/user/security/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.newPass })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Password updated successfully.' });
        setPasswords({ current: '', newPass: '', confirm: '' });
      } else {
        throw new Error(data.error || 'Failed to update password');
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="settings-page-header">
        <h1>Security</h1>
        <p>Manage your password and 2-step verification.</p>
      </div>

      {message && <div className={`settings-alert ${message.type}`}>{message.text}</div>}

      <form className="settings-form" onSubmit={handleSave}>
        <div className="settings-section">
          <h2>Change Password</h2>

          <div className="form-group">
            <label>Current Password</label>
            <input
              type="password"
              name="current"
              value={passwords.current}
              onChange={handleChange}
              placeholder="Enter current password"
              autoComplete="current-password"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                name="newPass"
                value={passwords.newPass}
                onChange={handleChange}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
              />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                name="confirm"
                value={passwords.confirm}
                onChange={handleChange}
                placeholder="Confirm new password"
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="settings-actions" style={{ marginTop: '8px' }}>
            <button type="submit" className="btn-secondary" disabled={saving}>
              {saving ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </div>

        <div className="settings-section">
          <h2>Two-Factor Authentication</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', marginBottom: '16px', lineHeight: '1.5' }}>
            Add an extra layer of security by requiring a verification code alongside your password.
          </p>

          <div className="settings-2fa-card">
            <div className="settings-2fa-info">
              <div className="settings-2fa-icon">
                <Smartphone size={20} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: '500', fontSize: '14px', marginBottom: '3px' }}>Authenticator App</div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Use Google Authenticator or Authy</div>
              </div>
            </div>
            <button
              type="button"
              className="btn-secondary"
              style={{ flexShrink: 0 }}
              onClick={() => alert('2FA setup coming soon. Contact your workspace administrator to enable it.')}
            >
              Enable 2FA
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
