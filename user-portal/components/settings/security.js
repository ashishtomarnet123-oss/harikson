import React, { useState } from 'react';
import { Save, Shield, Smartphone, Key } from 'lucide-react';

export default function SecuritySettings() {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSave = (e) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setMessage({ type: 'success', text: 'Security settings updated successfully.' });
      setSaving(false);
    }, 800);
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
            <input type="password" placeholder="Enter current password" />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>New Password</label>
              <input type="password" placeholder="New password" />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input type="password" placeholder="Confirm new password" />
            </div>
          </div>

          <div className="settings-actions" style={{ marginTop: '8px' }}>
            <button type="button" className="btn-secondary" onClick={handleSave}>
              Update Password
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
            <button type="button" className="btn-secondary" style={{ flexShrink: 0 }}>
              Enable 2FA
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
