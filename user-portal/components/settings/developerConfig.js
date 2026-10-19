import { authenticatedFetch, getApiConfig } from './apiHelper';
import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, RefreshCw, Lock, ArrowRight } from 'lucide-react';

export default function DeveloperConfigSettings() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [signingSecret, setSigningSecret] = useState(null);
  const [verboseLogs, setVerboseLogs] = useState(true);
  const [sandboxMode, setSandboxMode] = useState(false);
  const [apiVersion, setApiVersion] = useState('v1');
  const [corsOrigins, setCorsOrigins] = useState('*');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [message, setMessage] = useState(null);

  // Webhook Delivery Logs State
  const [webhookLogs, setWebhookLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState(null);
  const [planGatedLogs, setPlanGatedLogs] = useState(false);

  useEffect(() => {
    fetchConfig();
    fetchWebhookLogs();
  }, []);

  const handleUpgrade = () => {
    window.dispatchEvent(new CustomEvent('settings:navigate', { detail: 'billing' }));
  };

  const fetchWebhookLogs = async () => {
    try {
      setLogsLoading(true);
      setLogsError(null);
      const { apiBase, tenantSlug } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/v1/user/developer/webhook-logs?limit=10`, {
        credentials: 'include',
        headers: { 'x-tenant-slug': tenantSlug },
      });

      if (res && res.ok) {
        const data = await res.json();
        setWebhookLogs(Array.isArray(data.logs) ? data.logs : []);
        setPlanGatedLogs(false);
      } else if (res && res.status === 403) {
        const errData = await res.json().catch(() => ({}));
        if (errData.code === 'PLAN_FEATURE_DISABLED' || errData.feature === 'webhook_logging') {
          setPlanGatedLogs(true);
          setLogsError(
            errData.error ||
              'Webhook logging is not enabled for your subscription plan. Upgrade to Professional or Enterprise to access webhook delivery history and logs.'
          );
        } else {
          setLogsError(errData.error || 'Failed to load webhook logs.');
        }
        setWebhookLogs([]);
      } else {
        setLogsError('Failed to load webhook logs.');
        setWebhookLogs([]);
      }
    } catch (e) {
      setLogsError('Unable to load webhook delivery logs.');
      setWebhookLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const { apiBase, tenantSlug } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/v1/user/developer/config`, {
        credentials: 'include',
        headers: { 'x-tenant-slug': tenantSlug },
      });
      if (res && res.ok) {
        const data = await res.json();
        setWebhookUrl(data.webhookUrl || '');
        setSigningSecret(data.signingSecret || null);
        setApiVersion(data.apiVersion || 'v1');
        setCorsOrigins(data.corsOrigins || '*');
        setVerboseLogs(data.verboseLogs !== false);
        setSandboxMode(!!data.sandboxMode);
      } else {
        setMessage({ type: 'error', text: 'Unable to load developer configuration.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Unable to reach the configuration service.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const { apiBase, tenantSlug } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/v1/user/developer/config`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
        },
        body: JSON.stringify({ webhookUrl, apiVersion, corsOrigins, verboseLogs, sandboxMode }),
      });
      if (res && res.ok) {
        setMessage({ type: 'success', text: 'Developer configuration saved.' });
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage({ type: 'error', text: data.error || 'Failed to save developer configuration.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save developer configuration.' });
    } finally {
      setSaving(false);
    }
  };

  const handleRotateSecret = async () => {
    if (!confirm('Rotate webhook signing secret? Existing webhook listeners must update their signature verification.')) {
      return;
    }
    setRotating(true);
    setMessage(null);
    try {
      const { apiBase, tenantSlug } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/v1/user/developer/config/rotate-secret`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'x-tenant-slug': tenantSlug },
      });
      if (res && res.ok) {
        const data = await res.json();
        setSigningSecret(data.signingSecret);
        setMessage({ type: 'success', text: 'Webhook signing secret rotated.' });
      } else {
        setMessage({ type: 'error', text: 'Failed to rotate webhook signing secret.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to rotate webhook signing secret.' });
    } finally {
      setRotating(false);
    }
  };

  if (loading) {
    return <div className="settings-loading">Loading developer configuration...</div>;
  }

  return (
    <div className="developer-config-container">
      <div className="settings-header-group">
        <h1 className="settings-main-title">Developer Settings</h1>
        <p className="settings-main-subtitle">
          Configure API endpoints, webhooks, rate limiting, and SDK developer environments.
        </p>
      </div>

      {message && (
        <div className={`settings-toast-banner ${message.type}`}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* ── Webhook Configuration ── */}
      <div className="settings-section-block">
        <h2 className="settings-section-heading">Webhooks &amp; Event Delivery</h2>

        <div className="settings-form-grid">
          <div className="settings-field-group full-width">
            <label htmlFor="webhookUrl">Webhook Endpoint URL</label>
            <input
              id="webhookUrl"
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://example.com/api/webhook"
            />
            <span className="field-hint-text">
              Xarwiz AI will send HTTP POST payloads for chat events and workflow triggers to this URL.
            </span>
          </div>

          <div className="settings-field-group full-width">
            <label htmlFor="signingSecret">Webhook Signing Secret</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                id="signingSecret"
                type="text"
                value={signingSecret || 'Not generated yet'}
                readOnly
                className="disabled-field"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn-change-photo"
                onClick={handleRotateSecret}
                disabled={rotating}
                style={{ color: '#2563eb', flexShrink: 0 }}
              >
                <RefreshCw size={14} /> {rotating ? 'Rotating...' : 'Rotate'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-divider" />

      {/* ── Webhook Delivery History ── */}
      <div className="settings-section-block">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h2 className="settings-section-heading" style={{ margin: 0 }}>Webhook Delivery History</h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
              Inspect recent webhook delivery events, HTTP signatures, and payload status.
            </p>
          </div>
          <button
            type="button"
            className="btn-change-photo"
            onClick={fetchWebhookLogs}
            disabled={logsLoading}
            style={{ color: '#2563eb', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {planGatedLogs ? (
          <div
            style={{
              padding: '20px 24px',
              borderRadius: '12px',
              border: '1px solid #fed7aa',
              background: '#fffbeb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#fef3c7',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Lock size={18} />
              </div>
              <div>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#92400e', display: 'block' }}>
                  Webhook Logging Requires Upgrade
                </span>
                <p style={{ fontSize: '13px', color: '#b45309', margin: '3px 0 0 0' }}>
                  {logsError || 'Webhook logging history is not enabled for your subscription plan. Upgrade to Professional or Enterprise to access webhook delivery history.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleUpgrade}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                background: '#d97706',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <span>Upgrade Plan</span>
              <ArrowRight size={14} />
            </button>
          </div>
        ) : logsLoading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
            Loading webhook delivery history...
          </div>
        ) : logsError ? (
          <div style={{ padding: '16px 20px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '13px' }}>
            {logsError}
          </div>
        ) : webhookLogs.length === 0 ? (
          <div style={{ padding: '28px', textAlign: 'center', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              No webhook events recorded yet. Inbound and outbound events will appear here.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Event ID</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Provider</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Event Type</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {webhookLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#334155' }}>
                      {log.event_id || log.id.slice(0, 8)}
                    </td>
                    <td style={{ padding: '10px 14px', textTransform: 'capitalize', color: '#0f172a' }}>
                      {log.provider_id || 'Webhook'}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#0f172a' }}>
                      {log.event_type}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: log.processed ? '#dcfce7' : log.processing_error ? '#fee2e2' : '#fef3c7',
                          color: log.processed ? '#15803d' : log.processing_error ? '#b91c1c' : '#b45309',
                        }}
                      >
                        {log.processed ? 'Delivered' : log.processing_error ? 'Failed' : 'Pending'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#64748b' }}>
                      {log.received_at ? new Date(log.received_at).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="settings-divider" />

      {/* ── API & CORS Configuration ── */}
      <div className="settings-section-block">
        <h2 className="settings-section-heading">API Environment &amp; CORS</h2>
        <div className="settings-form-grid">
          <div className="settings-field-group">
            <label htmlFor="apiVersion">API Version</label>
            <select
              id="apiVersion"
              value={apiVersion}
              onChange={(e) => setApiVersion(e.target.value)}
              style={{
                height: '42px',
                padding: '0 14px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                background: '#ffffff',
                color: '#0f172a',
                outline: 'none',
              }}
            >
              <option value="v1">v1 (Latest - Recommended)</option>
              <option value="v1-beta">v1-beta (Experimental Features)</option>
            </select>
          </div>

          <div className="settings-field-group">
            <label htmlFor="corsOrigins">Allowed CORS Origins</label>
            <input
              id="corsOrigins"
              type="text"
              value={corsOrigins}
              onChange={(e) => setCorsOrigins(e.target.value)}
              placeholder="https://app.yourdomain.com, *"
            />
          </div>
        </div>
      </div>

      <div className="settings-divider" />

      {/* ── Developer Debugging ── */}
      <div className="settings-section-block">
        <h2 className="settings-section-heading">Debugging &amp; Sandbox</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', display: 'block' }}>
                Verbose LLM Telemetry Logging
              </span>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0 0' }}>
                Log detailed prompt token counts and completion response times to your developer console.
              </p>
            </div>
            <input
              type="checkbox"
              checked={verboseLogs}
              onChange={(e) => setVerboseLogs(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#3b82f6' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', display: 'block' }}>
                Developer Sandbox Mode
              </span>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0 0' }}>
                Route API requests to isolated test models without impacting live production quotas.
              </p>
            </div>
            <input
              type="checkbox"
              checked={sandboxMode}
              onChange={(e) => setSandboxMode(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#3b82f6' }}
            />
          </div>
        </div>
      </div>

      {/* ── Bottom Action Bar ── */}
      <div className="settings-action-bar">
        <button
          type="button"
          className="btn-save-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Developer Config'}
        </button>
      </div>
    </div>
  );
}
