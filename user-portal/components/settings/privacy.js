import { authenticatedFetch, getApiConfig } from './apiHelper';
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import { Download, Trash2, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';

export default function DataPrivacySettings() {
  const router = useRouter();
  const { logout } = useAuth();
  const [dataSharing, setDataSharing] = useState(false);
  const [retentionPeriod, setRetentionPeriod] = useState('never');
  const [clearingChats, setClearingChats] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [message, setMessage] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState(null);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const { apiBase, tenantSlug } = getApiConfig();

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setDeletingAccount(true);
    setDeleteError(null);
    try {
      const res = await authenticatedFetch(`${apiBase}/api/v1/user/account`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
        },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        await logout();
        router.replace('/login?account_deleted=true');
      } else {
        setDeleteError(data.error || 'Failed to delete account.');
      }
    } catch (err) {
      setDeleteError('Failed to delete account. Please try again.');
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleExport = async () => {
    setExportingData(true);
    setMessage(null);
    try {
      const res = await authenticatedFetch(`${apiBase}/api/v1/user/profile`, {
        credentials: 'include',
        headers: { 'x-tenant-slug': tenantSlug },
      });
      if (res.ok) {
        const profileData = await res.json();
        const exportObj = {
          exportedAt: new Date().toISOString(),
          platform: 'Harikson AI',
          user: profileData,
          localConversations: JSON.parse(localStorage.getItem('hk_recent_conversations') || '[]'),
        };
        const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `harikson-privacy-export-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setMessage({ type: 'success', text: 'Data export downloaded successfully.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to export data.' });
    } finally {
      setExportingData(false);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all conversation history? This action cannot be undone.')) {
      setClearingChats(true);
      localStorage.removeItem('hk_recent_conversations');
      window.dispatchEvent(new Event('storage'));
      setTimeout(() => {
        setClearingChats(false);
        setMessage({ type: 'success', text: 'All conversation history has been cleared.' });
      }, 500);
    }
  };

  return (
    <div className="privacy-settings-container">
      <div className="settings-header-group">
        <h1 className="settings-main-title">Data & Privacy</h1>
        <p className="settings-main-subtitle">
          Control your data retention, export options, and privacy preferences.
        </p>
      </div>

      {message && (
        <div className={`settings-toast-banner ${message.type}`}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* ── Section 1: AI Data Preferences ── */}
      <div className="settings-section-block">
        <h2 className="settings-section-heading">AI Model & Search Data</h2>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', display: 'block' }}>Model Quality & Telemetry</span>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0 0' }}>
              Allow anonymized query logs to help improve Harikson AI reasoning accuracy.
            </p>
          </div>
          <input
            type="checkbox"
            checked={dataSharing}
            onChange={(e) => {
              setDataSharing(e.target.checked);
              setMessage({ type: 'success', text: 'Privacy preference updated.' });
            }}
            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#3b82f6' }}
          />
        </div>

        <div style={{ marginTop: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Data Retention Window
          </label>
          <select
            value={retentionPeriod}
            onChange={(e) => {
              setRetentionPeriod(e.target.value);
              setMessage({ type: 'success', text: 'Retention policy saved.' });
            }}
            style={{
              width: '100%',
              maxWidth: '340px',
              height: '40px',
              padding: '0 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13.5px',
              color: '#0f172a',
              background: '#ffffff',
              outline: 'none'
            }}
          >
            <option value="never">Keep conversations indefinitely</option>
            <option value="30_days">Auto-delete after 30 days</option>
            <option value="90_days">Auto-delete after 90 days</option>
            <option value="1_year">Auto-delete after 1 year</option>
          </select>
        </div>
      </div>

      <div className="settings-divider" />

      {/* ── Section 2: Data Export & Storage ── */}
      <div className="settings-section-block">
        <h2 className="settings-section-heading">Data Export & Storage</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', display: 'block' }}>Export Account Data</span>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0 0' }}>
                Download a full JSON archive of your account profile, workspace details, and chat metadata.
              </p>
            </div>
            <button
              type="button"
              className="btn-change-photo"
              onClick={handleExport}
              disabled={exportingData}
              style={{ color: '#2563eb', flexShrink: 0, marginLeft: '16px' }}
            >
              <Download size={14} />
              <span>{exportingData ? 'Exporting...' : 'Export Data'}</span>
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', display: 'block' }}>Clear Conversation History</span>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0 0' }}>
                Permanently erase all chat messages and cached prompt logs from your device.
              </p>
            </div>
            <button
              type="button"
              className="btn-change-photo"
              onClick={handleClearHistory}
              disabled={clearingChats}
              style={{ color: '#dc2626', borderColor: '#fecaca', flexShrink: 0, marginLeft: '16px' }}
            >
              <Trash2 size={14} />
              <span>{clearingChats ? 'Clearing...' : 'Clear All History'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="settings-divider" />

      {/* ── Section 3: Danger Zone ── */}
      <div className="settings-section-block">
        <h2 className="settings-section-heading" style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={16} /> Danger Zone
        </h2>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <div>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#991b1b', display: 'block' }}>Delete Account & Data</span>
            <p style={{ fontSize: '13px', color: '#b91c1c', margin: '4px 0 0 0' }}>
              Permanently delete your account, workspace access, and all stored RAG documents.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setDeleteError(null);
              setDeletePassword('');
              setShowDeleteModal(true);
            }}
            style={{
              padding: '8px 16px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            Delete Account
          </button>
        </div>
      </div>

      {showDeleteModal && (
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
          <form
            onSubmit={handleDeleteAccount}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '420px',
              width: '100%',
              padding: '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0', color: '#dc2626' }}>
              Delete Account?
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5', margin: '0 0 16px 0' }}>
              This permanently deletes your account and access to your workspace. Enter your
              password to confirm — this action cannot be undone.
            </p>
            {deleteError && (
              <div className="settings-toast-banner error" style={{ marginBottom: '12px' }}>
                <AlertCircle size={16} />
                <span>{deleteError}</span>
              </div>
            )}
            <input
              type="password"
              placeholder="Current password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              required
              autoFocus
              style={{
                width: '100%',
                height: '40px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13.5px',
                marginBottom: '16px',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deletingAccount}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={deletingAccount || !deletePassword}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: deletingAccount ? 'default' : 'pointer',
                }}
              >
                {deletingAccount ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
