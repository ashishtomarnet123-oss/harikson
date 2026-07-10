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
          <h2><Key size={18} style={{marginRight: '8px', verticalAlign: 'text-bottom'}}/> Change Password</h2>
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
          <button type="button" className="btn-primary" style={{marginTop: '10px'}} onClick={handleSave}>
            Update Password
          </button>
        </div>

        <div className="settings-section">
          <h2><Shield size={18} style={{marginRight: '8px', verticalAlign: 'text-bottom'}}/> Two-Factor Authentication (2FA)</h2>
          <p style={{color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px'}}>
            Add an extra layer of security to your account by requiring a verification code in addition to your password.
          </p>
          
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
              <div style={{width: '40px', height: '40px', background: 'var(--bg-hover)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)'}}>
                <Smartphone size={20} />
              </div>
              <div>
                <h3 style={{margin: '0 0 4px 0', fontSize: '15px'}}>Authenticator App</h3>
                <span style={{fontSize: '13px', color: 'var(--text-muted)'}}>Use Google Authenticator or Authy</span>
              </div>
            </div>
            <button type="button" className="btn-primary" style={{background: 'var(--bg-hover)', color: 'var(--text-primary)'}}>
              Enable 2FA
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
