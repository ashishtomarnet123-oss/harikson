import React, { useState, useEffect } from 'react';
import { Smartphone, Shield, Key } from 'lucide-react';

export default function SecuritySettings() {
  const [passwords, setPasswords] = useState({
    current: '',
    newPass: '',
    confirm: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [setupSecret, setSetupSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showDisable, setShowDisable] = useState(false);

  const apiBase =
    (typeof window !== 'undefined' && localStorage.getItem('hk_api_base')) ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3008';
  const tenantSlug =
    (typeof window !== 'undefined' && localStorage.getItem('hk_tenant')) ||
    'system';

  useEffect(() => {
    const fetch2FAStatus = async () => {
      try {
        const res = await fetch(`${apiBase}/api/user/profile`, {
          credentials: 'include',
          headers: {
            'x-tenant-slug': tenantSlug,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setTwoFactorEnabled(data.twoFactorEnabled || false);
        }
      } catch (err) {
        console.error('Failed to fetch 2FA status', err);
      }
    };
    fetch2FAStatus();
  }, [apiBase, tenantSlug]);

  const handleChange = (e) => {
    setPasswords((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!passwords.current) {
      return setMessage({
        type: 'error',
        text: 'Please enter your current password.',
      });
    }
    if (passwords.newPass.length < 8) {
      return setMessage({
        type: 'error',
        text: 'New password must be at least 8 characters.',
      });
    }
    if (passwords.newPass !== passwords.confirm) {
      return setMessage({ type: 'error', text: 'New passwords do not match.' });
    }

    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/api/user/security/change-password`, {
        credentials: 'include',
        method: 'POST',
        headers: {
          'x-tenant-slug': tenantSlug,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwords.current,
          newPassword: passwords.newPass,
        }),
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

  const handleStartSetup = async () => {
    setMessage(null);
    try {
      const res = await fetch(`${apiBase}/api/user/2fa/setup`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'x-tenant-slug': tenantSlug,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (res.ok) {
        setSetupSecret(data.secret);
        setQrCodeUrl(data.qrCodeUrl);
        setShowSetup(true);
      } else {
        throw new Error(data.error || 'Failed to start 2FA setup');
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleVerifySetup = async () => {
    setMessage(null);
    if (!totpCode) {
      return setMessage({ type: 'error', text: 'Please enter verification code.' });
    }
    try {
      const res = await fetch(`${apiBase}/api/user/2fa/verify`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'x-tenant-slug': tenantSlug,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: totpCode }),
      });
      const data = await res.json();
      if (res.ok) {
        setTwoFactorEnabled(true);
        setShowSetup(false);
        setBackupCodes(data.backupCodes || []);
        setTotpCode('');
        setMessage({ type: 'success', text: 'Two-Factor Authentication enabled successfully.' });
      } else {
        throw new Error(data.error || 'Failed to verify 2FA code');
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleDisable2FA = async () => {
    setMessage(null);
    if (!confirmPassword) {
      return setMessage({ type: 'error', text: 'Please enter your password to confirm.' });
    }
    try {
      const res = await fetch(`${apiBase}/api/user/2fa/disable`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'x-tenant-slug': tenantSlug,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: confirmPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setTwoFactorEnabled(false);
        setShowDisable(false);
        setConfirmPassword('');
        setMessage({ type: 'success', text: 'Two-Factor Authentication disabled successfully.' });
      } else {
        throw new Error(data.error || 'Failed to disable 2FA');
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  return (
    <>
      <div className="settings-page-header">
        <h1>Security</h1>
        <p>Manage your password and 2-step verification.</p>
      </div>

      {message && (
        <div className={`settings-alert ${message.type}`}>{message.text}</div>
      )}

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
      </form>

      <div className="settings-section" style={{ marginTop: '32px' }}>
        <h2>Two-Factor Authentication</h2>
        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '13.5px',
            marginBottom: '16px',
            lineHeight: '1.5',
          }}
        >
          Add an extra layer of security by requiring a verification code
          alongside your password.
        </p>

        {backupCodes.length > 0 && (
          <div style={{
            background: 'var(--bg-hover)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '10px', color: 'var(--text-primary)' }}>
              ⚠️ Save Your Backup Codes
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '15px' }}>
              These codes can be used to log in to your account if you lose access to your authenticator app. Each code can only be used once. Keep them in a safe place.
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '10px',
              fontFamily: 'monospace',
              fontSize: '14px',
              background: 'var(--bg-primary)',
              padding: '15px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              marginBottom: '15px'
            }}>
              {backupCodes.map((code, idx) => (
                <div key={idx} style={{ color: 'var(--text-primary)' }}>
                  {idx + 1}. {code}
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setBackupCodes([])}
            >
              I have saved these codes
            </button>
          </div>
        )}

        {!showSetup && !showDisable && (
          <div className="settings-2fa-card">
            <div className="settings-2fa-info">
              <div className="settings-2fa-icon">
                <Smartphone size={20} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: '500',
                    fontSize: '14px',
                    marginBottom: '3px',
                    color: 'var(--text-primary)'
                  }}
                >
                  Authenticator App
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                  {twoFactorEnabled ? 'Two-Factor Authentication is currently ENABLED.' : 'Use Google Authenticator or Authy'}
                </div>
              </div>
            </div>
            {twoFactorEnabled ? (
              <button
                type="button"
                className="btn-danger"
                style={{
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
                onClick={() => setShowDisable(true)}
              >
                Disable 2FA
              </button>
            ) : (
              <button
                type="button"
                className="btn-secondary"
                style={{ flexShrink: 0 }}
                onClick={handleStartSetup}
              >
                Enable 2FA
              </button>
            )}
          </div>
        )}

        {showSetup && (
          <div style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '20px'
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '10px' }}>
              Set Up Authenticator App
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '15px' }}>
              Scan the QR code below with your authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.).
            </p>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <img src={qrCodeUrl} alt="2FA QR Code" style={{ border: '4px solid white', borderRadius: '8px' }} />
              <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Can't scan? Use manual secret: <code style={{ background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>{setupSecret}</code>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label>Verification Code</label>
              <input
                type="text"
                placeholder="Enter 6-digit code"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                maxLength={6}
                style={{ width: '100%', maxWidth: '200px', display: 'block' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn-primary" onClick={handleVerifySetup}>
                Verify & Enable
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowSetup(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {showDisable && (
          <div style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '20px'
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '10px', color: '#dc2626' }}>
              Disable Two-Factor Authentication
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '15px' }}>
              To disable 2FA, please confirm your account password.
            </p>
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label>Confirm Password</label>
              <input
                type="password"
                placeholder="Enter account password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ width: '100%', maxWidth: '300px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn-danger" style={{
                background: '#dc2626',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500'
              }} onClick={handleDisable2FA}>
                Confirm Disable
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowDisable(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
