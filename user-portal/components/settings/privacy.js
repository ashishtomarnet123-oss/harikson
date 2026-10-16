import { authenticatedFetch, getApiConfig } from './apiHelper';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import {
  Download,
  Trash2,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Shield,
  FileText,
  HelpCircle,
  ExternalLink,
  RefreshCw,
  Sliders,
} from 'lucide-react';

export default function DataPrivacySettings() {
  const router = useRouter();
  const { logout } = useAuth();
  const { apiBase, tenantSlug } = getApiConfig();

  // Server-side Consent Preferences State
  const [consents, setConsents] = useState([]);
  const [loadingConsents, setLoadingConsents] = useState(true);
  const [savingPurpose, setSavingPurpose] = useState(null);

  const [clearingChats, setClearingChats] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [message, setMessage] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState(null);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    fetchConsentPreferences();
  }, []);

  const fetchConsentPreferences = async () => {
    setLoadingConsents(true);
    try {
      const res = await authenticatedFetch(`${apiBase}/api/v1/privacy/preferences`, {
        credentials: 'include',
        headers: { 'x-tenant-slug': tenantSlug },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.consents) {
          setConsents(data.consents);
        }
      } else {
        // Fallback to non-v1 endpoint
        const fallbackRes = await authenticatedFetch(`${apiBase}/api/privacy/preferences`, {
          credentials: 'include',
        });
        if (fallbackRes.ok) {
          const fbData = await fallbackRes.json();
          if (fbData.consents) setConsents(fbData.consents);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch consent preferences:', err);
    } finally {
      setLoadingConsents(false);
    }
  };

  const handleToggleConsent = async (purposeId, currentStatus, isRequired) => {
    if (isRequired) {
      setMessage({
        type: 'error',
        text: 'This purpose is required for core platform delivery and cannot be withdrawn while maintaining an active account.',
      });
      return;
    }

    const nextStatus = currentStatus === 'granted' ? 'withdrawn' : 'granted';
    setSavingPurpose(purposeId);
    setMessage(null);

    try {
      const res = await authenticatedFetch(`${apiBase}/api/privacy/preferences`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
        },
        body: JSON.stringify({
          updates: [{ purposeId, status: nextStatus }],
          source: 'privacy_settings_dashboard',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update preference');
      }

      if (data.consents) {
        setConsents(data.consents);
      }
      setMessage({
        type: 'success',
        text: `Consent preference for "${purposeId.replace(/_/g, ' ')}" updated and recorded in compliance audit log.`,
      });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update preference' });
    } finally {
      setSavingPurpose(null);
    }
  };

  const handleExport = async () => {
    setExportingData(true);
    setMessage(null);
    try {
      window.location.href = `${apiBase}/api/privacy/export-data`;
      setMessage({
        type: 'success',
        text: 'Personal data export bundle initiated. Download starting...',
      });
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
        setMessage({ type: 'success', text: 'All conversation history has been cleared from local storage.' });
      }, 500);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setDeletingAccount(true);
    setDeleteError(null);
    try {
      const res = await authenticatedFetch(`${apiBase}/api/privacy/erasure`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
        },
        body: JSON.stringify({
          passwordConfirm: deletePassword,
          reason: 'User executed self-service DPDP erasure in settings',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        await logout();
        router.replace('/login?account_erased=true');
      } else {
        setDeleteError(data.error || 'Failed to erase account.');
      }
    } catch (err) {
      setDeleteError('Failed to execute account erasure. Please verify password.');
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <div className="privacy-settings-container" style={{ maxWidth: '840px' }}>
      <div className="settings-header-group" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2563eb', marginBottom: '6px' }}>
          <Shield size={20} />
          <span style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            DPDP Act 2023 Compliance
          </span>
        </div>
        <h1 className="settings-main-title" style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' }}>
          Privacy, Consent &amp; Data Rights
        </h1>
        <p className="settings-main-subtitle" style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
          Manage your purpose-based consent preferences, review statutory notices, and exercise Data Principal rights.
        </p>
      </div>

      {message && (
        <div className={`settings-toast-banner ${message.type}`} style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          color: message.type === 'success' ? '#065f46' : '#991b1b',
          fontSize: '13.5px'
        }}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* ── Section 1: Purpose-Based Consent Management ── */}
      <div className="settings-section-block" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 className="settings-section-heading" style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
              Purpose-Based Consent Preferences
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              Under DPDP Act Section 6, consent is specific, unbundled, and as easy to withdraw as it is to give.
            </p>
          </div>
          <button
            onClick={fetchConsentPreferences}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px'
            }}
          >
            <RefreshCw size={13} className={loadingConsents ? 'spin' : ''} />
            Refresh
          </button>
        </div>

        {loadingConsents && consents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: '14px' }}>
            Loading consent preferences...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {consents.map((item) => {
              const isGranted = item.status === 'granted';
              const isSaving = savingPurpose === item.purpose_id;

              return (
                <div
                  key={item.purpose_id}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '16px',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '14px', color: '#1e293b' }}>{item.name}</strong>
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          background: item.is_required ? '#dbeafe' : '#f1f5f9',
                          color: item.is_required ? '#1d4ed8' : '#64748b',
                          fontWeight: 600,
                          textTransform: 'uppercase'
                        }}
                      >
                        {item.legal_basis.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 6px 0', lineHeight: '1.4' }}>
                      {item.description}
                    </p>
                    <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                      {item.withdrawal_behavior}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    {item.is_required ? (
                      <span style={{ fontSize: '12px', color: '#2563eb', fontWeight: 600, background: '#eff6ff', padding: '4px 10px', borderRadius: '6px' }}>
                        Required
                      </span>
                    ) : (
                      <label style={{ display: 'inline-flex', alignItems: 'center', cursor: isSaving ? 'wait' : 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={isGranted}
                          disabled={isSaving}
                          onChange={() => handleToggleConsent(item.purpose_id, item.status, item.is_required)}
                          style={{
                            width: '20px',
                            height: '20px',
                            accentColor: '#2563eb',
                            cursor: 'pointer'
                          }}
                        />
                      </label>
                    )}
                    <span style={{ fontSize: '11px', color: isGranted ? '#16a34a' : '#94a3b8', fontWeight: 500 }}>
                      {isGranted ? 'Active / Consented' : 'Withdrawn / Declined'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Section 2: Data Principal Rights Portal ── */}
      <div className="settings-section-block" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
        <h2 className="settings-section-heading" style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: '0 0 16px 0' }}>
          Data Principal Statutory Rights
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          <div style={{ padding: '16px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#1e293b' }}>Instant Data Export</h4>
            <p style={{ margin: '0 0 12px 0', fontSize: '12.5px', color: '#64748b' }}>
              Download your complete personal data bundle (profile, consents, audit history, chat metadata) as JSON.
            </p>
            <button
              onClick={handleExport}
              disabled={exportingData}
              style={{
                padding: '8px 14px',
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Download size={14} />
              {exportingData ? 'Generating...' : 'Download Export'}
            </button>
          </div>

          <div style={{ padding: '16px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#1e293b' }}>Submit Rights Request</h4>
            <p style={{ margin: '0 0 12px 0', fontSize: '12.5px', color: '#64748b' }}>
              Exercise rights under Sections 11, 12, and 14 for correction, nomination, or formal inquiries.
            </p>
            <Link href="/data-rights">
              <a
                style={{
                  padding: '8px 14px',
                  background: '#ffffff',
                  color: '#2563eb',
                  border: '1px solid #2563eb',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FileText size={14} />
                Rights Request Portal &rarr;
              </a>
            </Link>
          </div>

          <div style={{ padding: '16px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#1e293b' }}>Grievance Redressal</h4>
            <p style={{ margin: '0 0 12px 0', fontSize: '12.5px', color: '#64748b' }}>
              File a formal grievance directly with designated Grievance Officer Ashish Pratap Singh Tomar.
            </p>
            <Link href="/grievance">
              <a
                style={{
                  padding: '8px 14px',
                  background: '#ffffff',
                  color: '#7c3aed',
                  border: '1px solid #7c3aed',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <HelpCircle size={14} />
                Grievance Cell &rarr;
              </a>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Section 3: Conversation Logs & Cache ── */}
      <div className="settings-section-block" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
        <h2 className="settings-section-heading" style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: '0 0 16px 0' }}>
          Device Storage &amp; Cache
        </h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', display: 'block' }}>Clear Device Conversation History</span>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0 0' }}>
              Purges local browser cache and recent conversation lists from this device.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClearHistory}
            disabled={clearingChats}
            style={{
              padding: '8px 16px',
              border: '1px solid #fecaca',
              background: '#fff',
              color: '#dc2626',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Trash2 size={14} />
            <span>{clearingChats ? 'Clearing...' : 'Clear History'}</span>
          </button>
        </div>
      </div>

      {/* ── Section 4: Danger Zone (DPDP Account Erasure) ── */}
      <div className="settings-section-block" style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '24px' }}>
        <h2 className="settings-section-heading" style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '17px', margin: '0 0 12px 0' }}>
          <ShieldAlert size={18} /> Danger Zone &bull; DPDP Right to Erasure
        </h2>
        <p style={{ fontSize: '13.5px', color: '#991b1b', margin: '0 0 16px 0', lineHeight: '1.5' }}>
          Under Section 12 of India's DPDP Act 2023, you have the right to request erasure of your personal data upon withdrawal of consent. This permanently deletes your user profile, revokes access, and wipes your credentials. Statutory audit records are retained as required by Indian law.
        </p>

        <button
          type="button"
          onClick={() => {
            setDeleteError(null);
            setDeletePassword('');
            setShowDeleteModal(true);
          }}
          style={{
            padding: '10px 18px',
            background: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13.5px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Execute Account &amp; Personal Data Erasure
        </button>
      </div>

      {/* Delete Confirmation Modal */}
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
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0', color: '#dc2626' }}>
              Confirm Account Erasure (DPDP Act)
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5', margin: '0 0 16px 0' }}>
              This permanently deletes your personal data, workspace credentials, and active sessions. Please enter your password to confirm identity verification.
            </p>
            {deleteError && (
              <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontSize: '13px', marginBottom: '14px' }}>
                ⚠ {deleteError}
              </div>
            )}
            <input
              type="password"
              placeholder="Confirm your account password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              required
              autoFocus
              style={{
                width: '100%',
                height: '42px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
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
                  padding: '9px 16px',
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
                  padding: '9px 18px',
                  borderRadius: '8px',
                  background: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: deletingAccount ? 'default' : 'pointer',
                }}
              >
                {deletingAccount ? 'Erasing Data...' : 'Permanently Erase Account'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
