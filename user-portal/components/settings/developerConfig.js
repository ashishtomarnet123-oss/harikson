import { authenticatedFetch, getApiConfig } from './apiHelper';
import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export default function DeveloperConfigSettings() {
  const [webhookUrl, setWebhookUrl] = useState('https://api.yourdomain.com/webhooks/harikson');
  const [signingSecret, setSigningSecret] = useState('whsec_hk_live_8f9a2b1c4e7d3a5f');
  const [verboseLogs, setVerboseLogs] = useState(true);
  const [sandboxMode, setSandboxMode] = useState(false);
  const [apiVersion, setApiVersion] = useState('v1');
  const [corsOrigins, setCorsOrigins] = useState('*');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setMessage({ type: 'success', text: 'Developer configuration saved.' });
    }, 400);
  };

  const handleRotateSecret = () => {
    if (confirm('Rotate webhook signing secret? Existing webhook listeners must update their signature verification.')) {
      const newSecret = 'whsec_hk_live_' + Math.random().toString(36).substring(2, 14);
      setSigningSecret(newSecret);
      setMessage({ type: 'success', text: 'Webhook signing secret rotated.' });
    }
  };

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
        <h2 className="settings-section-heading">Webhooks & Event Delivery</h2>
        
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
              Harikson AI will send HTTP POST payloads for chat events and workflow triggers to this URL.
            </span>
          </div>

          <div className="settings-field-group full-width">
            <label htmlFor="signingSecret">Webhook Signing Secret</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                id="signingSecret"
                type="text"
                value={signingSecret}
                readOnly
                className="disabled-field"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn-change-photo"
                onClick={handleRotateSecret}
                style={{ color: '#2563eb', flexShrink: 0 }}
              >
                <RefreshCw size={14} /> Rotate
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-divider" />

      {/* ── API & CORS Configuration ── */}
      <div className="settings-section-block">
        <h2 className="settings-section-heading">API Environment & CORS</h2>
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
        <h2 className="settings-section-heading">Debugging & Sandbox</h2>
        
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
