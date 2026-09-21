import { authenticatedFetch, getApiConfig } from './apiHelper';
import React, { useState, useEffect } from 'react';
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  Lock,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Terminal,
  Shield,
  Zap,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  X,
  Loader2,
} from 'lucide-react';

export default function DeveloperSettings({ onClose, onTabChange, setActiveTab }) {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [planGated, setPlanGated] = useState(false);
  const [currentPlan, setCurrentPlan] = useState('free');

  // Modal dialog states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState(null);
  const [revoking, setRevoking] = useState(false);
  const [creating, setCreating] = useState(false);

  // Creation form state
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState([
    'chat:read',
    'chat:write',
    'documents:read',
    'documents:write',
  ]);

  // Revealed key modal state
  const [revealedKey, setRevealedKey] = useState(null);
  const [copiedRevealed, setCopiedRevealed] = useState(false);
  const [copiedPrefixId, setCopiedPrefixId] = useState(null);

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleNavigateToBilling = () => {
    if (onTabChange) {
      onTabChange('billing');
    } else if (setActiveTab) {
      setActiveTab('billing');
    } else {
      window.dispatchEvent(new CustomEvent('settings:navigate', { detail: 'billing' }));
    }
  };

  const fetchKeys = async () => {
    try {
      setLoading(true);
      setError(null);
      const { apiBase, tenantSlug } = getApiConfig();
      let res;
      try {
        res = await authenticatedFetch(`${apiBase}/api/v1/user/developer/keys`, {
          credentials: 'include',
          headers: { 'x-tenant-slug': tenantSlug },
        });
      } catch (e) {
        res = await authenticatedFetch(`/api/v1/user/developer/keys`, {
          credentials: 'include',
          headers: { 'x-tenant-slug': tenantSlug },
        });
      }

      if (res && res.ok) {
        const data = await res.json();
        setKeys(Array.isArray(data) ? data : []);
        setPlanGated(false);
      } else if (res && res.status === 403) {
        const errData = await res.json().catch(() => ({}));
        if (errData.code === 'PLAN_UPGRADE_REQUIRED') {
          setPlanGated(true);
          setCurrentPlan(errData.currentPlan || 'free');
        }
        setKeys([]);
      } else {
        setKeys([]);
      }
    } catch (err) {
      setKeys([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    if (planGated) {
      handleNavigateToBilling();
      return;
    }
    setNewKeyName('');
    setSelectedScopes(['chat:read', 'chat:write', 'documents:read', 'documents:write']);
    setShowCreateModal(true);
  };

  const toggleScope = (scope) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const handleConfirmCreateKey = async (e) => {
    if (e) e.preventDefault();
    const name = newKeyName.trim() || 'Default API Key';

    try {
      setCreating(true);
      const { apiBase, tenantSlug } = getApiConfig();
      const idempotencyKey = `apikey:${name}:${Date.now()}:${Math.random()}`;
      const res = await authenticatedFetch(`${apiBase}/api/v1/user/developer/keys`, {
        credentials: 'include',
        method: 'POST',
        headers: {
          'x-tenant-slug': tenantSlug,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({ name, scopes: selectedScopes }),
      });

      if (res.ok) {
        const data = await res.json();
        setShowCreateModal(false);
        setRevealedKey(data.secretKey);
        setCopiedRevealed(false);
        await fetchKeys();
      } else if (res.status === 403) {
        const errData = await res.json().catch(() => ({}));
        if (errData.code === 'PLAN_UPGRADE_REQUIRED') {
          setPlanGated(true);
          setShowCreateModal(false);
          handleNavigateToBilling();
        } else {
          setError(errData.error || 'Failed to generate key');
        }
      } else {
        setError('Failed to generate key. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred while creating key.');
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmRevokeKey = async () => {
    if (!keyToRevoke) return;

    try {
      setRevoking(true);
      const { apiBase, tenantSlug } = getApiConfig();
      const res = await authenticatedFetch(
        `${apiBase}/api/v1/user/developer/keys/${keyToRevoke.id}`,
        {
          credentials: 'include',
          method: 'DELETE',
          headers: { 'x-tenant-slug': tenantSlug },
        }
      );

      if (res.ok) {
        setKeyToRevoke(null);
        await fetchKeys();
      } else {
        setError('Failed to revoke API key');
      }
    } catch (err) {
      console.error(err);
      setError('Error revoking key');
    } finally {
      setRevoking(false);
    }
  };

  const handleCopy = (text, type = 'revealed', id = null) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === 'revealed') {
      setCopiedRevealed(true);
      setTimeout(() => setCopiedRevealed(false), 2200);
    } else if (type === 'prefix' && id) {
      setCopiedPrefixId(id);
      setTimeout(() => setCopiedPrefixId(null), 2000);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 0',
          gap: '12px',
        }}
      >
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent, #3b82f6)' }} />
        <span style={{ fontSize: '13.5px', color: 'var(--text-secondary, #64748b)' }}>
          Loading developer credentials...
        </span>
      </div>
    );
  }

  return (
    <>
      {/* ── Page Header ── */}
      <div className="settings-header-group" style={{ marginBottom: '24px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <h1 className="settings-main-title" style={{ margin: 0 }}>
                API Keys
              </h1>
              {planGated && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: '#fef3c7',
                    color: '#b45309',
                    border: '1px solid #fde68a',
                  }}
                >
                  <Lock size={11} /> Paid Feature
                </span>
              )}
            </div>
            <p className="settings-main-subtitle">
              Manage your secret API keys and authentication tokens for programmatic API access.
            </p>
          </div>

          {!planGated && (
            <button
              className="btn-primary"
              onClick={handleOpenCreateModal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Plus size={15} />
              <span>Create Secret Key</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            borderRadius: '10px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            fontSize: '13.5px',
            marginBottom: '20px',
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#b91c1c',
              cursor: 'pointer',
              padding: '2px',
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── STATE 1: Plan is Gated & No Keys (Clean Hero Feature Card) ── */}
      {planGated && keys.length === 0 && (
        <div
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '40px 32px',
            boxShadow: '0 4px 24px -2px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)',
            position: 'relative',
            overflow: 'hidden',
            textAlign: 'center',
          }}
        >
          {/* Subtle ambient gradient highlight in top right */}
          <div
            style={{
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, rgba(59, 130, 246, 0) 70%)',
              pointerEvents: 'none',
            }}
          />

          {/* Icon Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              border: '1px solid #bfdbfe',
              color: '#2563eb',
              marginBottom: '16px',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.1)',
            }}
          >
            <Key size={30} />
          </div>

          {/* Plan badge */}
          <div style={{ marginBottom: '10px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '20px',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1d4ed8',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              <Sparkles size={13} color="#2563eb" /> Starter, Professional & Enterprise Plans
            </span>
          </div>

          <h2
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: 'var(--text-primary, #0f172a)',
              margin: '0 0 10px',
              letterSpacing: '-0.01em',
            }}
          >
            Unlock Programmatic API Access
          </h2>

          <p
            style={{
              color: 'var(--text-secondary, #475569)',
              fontSize: '14px',
              maxWidth: '560px',
              margin: '0 auto 28px',
              lineHeight: '1.6',
            }}
          >
            Your current <strong style={{ color: '#d97706' }}>Free</strong> plan does not include API key access. Upgrade your workspace to generate secret API keys, connect external applications, and automate workflows with Xarwiz AI.
          </p>

          {/* Capabilities Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '14px',
              margin: '0 auto 32px',
              maxWidth: '640px',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#eff6ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563eb',
                  marginBottom: '10px',
                }}
              >
                <Terminal size={16} />
              </div>
              <div
                style={{
                  fontSize: '13.5px',
                  fontWeight: 600,
                  color: 'var(--text-primary, #0f172a)',
                  marginBottom: '4px',
                }}
              >
                REST & Streaming
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary, #64748b)',
                  lineHeight: '1.45',
                }}
              >
                Stream completions, query knowledge bases, and run agent pipelines via HTTP & SSE.
              </div>
            </div>

            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#ecfdf5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#059669',
                  marginBottom: '10px',
                }}
              >
                <Shield size={16} />
              </div>
              <div
                style={{
                  fontSize: '13.5px',
                  fontWeight: 600,
                  color: 'var(--text-primary, #0f172a)',
                  marginBottom: '4px',
                }}
              >
                Granular Scopes
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary, #64748b)',
                  lineHeight: '1.45',
                }}
              >
                Create specialized tokens with scoped read/write permissions for chat, docs, and tools.
              </div>
            </div>

            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#f5f3ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#7c3aed',
                  marginBottom: '10px',
                }}
              >
                <Zap size={16} />
              </div>
              <div
                style={{
                  fontSize: '13.5px',
                  fontWeight: 600,
                  color: 'var(--text-primary, #0f172a)',
                  marginBottom: '4px',
                }}
              >
                Usage & Rate Limits
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary, #64748b)',
                  lineHeight: '1.45',
                }}
              >
                Monitor per-key token consumption, real-time telemetry, and automated key rotation.
              </div>
            </div>
          </div>

          {/* Call to Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={handleNavigateToBilling}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '11px 24px',
                borderRadius: '9px',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                border: 'none',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
                transition: 'all 0.15s ease',
              }}
            >
              <Sparkles size={16} />
              <span>Upgrade Plan — from ₹19/mo</span>
              <ArrowRight size={15} />
            </button>

            <a
              href="/security-policy"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 18px',
                borderRadius: '9px',
                background: '#ffffff',
                color: 'var(--text-secondary, #475569)',
                border: '1px solid #cbd5e1',
                fontSize: '13.5px',
                fontWeight: 500,
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              <ExternalLink size={14} />
              <span>Architecture & Security</span>
            </a>
          </div>

          {/* Trust Footnotes */}
          <div
            style={{
              marginTop: '28px',
              paddingTop: '20px',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              fontSize: '12px',
              color: '#94a3b8',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <CheckCircle2 size={13} color="#10b981" /> SHA-256 Hashed Secrets
            </span>
            <span>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <CheckCircle2 size={13} color="#10b981" /> Instant Activation
            </span>
            <span>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <CheckCircle2 size={13} color="#10b981" /> Cancel Anytime
            </span>
          </div>
        </div>
      )}

      {/* ── STATE 2: Plan is Gated BUT user already has keys ── */}
      {planGated && keys.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            padding: '14px 18px',
            borderRadius: '12px',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            marginBottom: '20px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
            <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '13px', color: '#92400e', lineHeight: '1.5' }}>
              Your workspace is currently on the <strong>Free</strong> plan. Existing API keys are paused and cannot authenticate requests until you reactivate your subscription.
            </div>
          </div>
          <button
            onClick={handleNavigateToBilling}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '7px',
              background: '#d97706',
              color: '#ffffff',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <Sparkles size={13} /> Upgrade to Reactivate
          </button>
        </div>
      )}

      {/* ── STATE 3: Active Plan OR Has Keys (Standard Keys View) ── */}
      {(!planGated || keys.length > 0) && (
        <div className="settings-section">
          {keys.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '48px 24px',
                background: '#fafafc',
                border: '1px dashed #cbd5e1',
                borderRadius: '14px',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: '#eff6ff',
                  color: '#2563eb',
                  marginBottom: '12px',
                }}
              >
                <Key size={22} />
              </div>
              <h3
                style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'var(--text-primary, #0f172a)',
                  margin: '0 0 6px',
                }}
              >
                No API Keys Created Yet
              </h3>
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--text-secondary, #64748b)',
                  maxWidth: '420px',
                  margin: '0 auto 18px',
                  lineHeight: '1.5',
                }}
              >
                Generate your first secret key to authenticate your requests against the Xarwiz API from code, scripts, or agents.
              </p>
              <button
                className="btn-primary"
                onClick={handleOpenCreateModal}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                <Plus size={14} /> Create Secret Key
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {keys.map((k) => (
                <div
                  key={k.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '6px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          background: '#eff6ff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#2563eb',
                        }}
                      >
                        <Key size={13} />
                      </div>
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: '14.5px',
                          color: 'var(--text-primary, #0f172a)',
                        }}
                      >
                        {k.name}
                      </span>
                      {planGated ? (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 7px',
                            borderRadius: '4px',
                            background: '#fef3c7',
                            color: '#b45309',
                          }}
                        >
                          Paused
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 7px',
                            borderRadius: '4px',
                            background: '#ecfdf5',
                            color: '#059669',
                          }}
                        >
                          Active
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px',
                      }}
                    >
                      <code
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontFamily: 'var(--font-mono, monospace)',
                          fontSize: '12.5px',
                          color: '#334155',
                          letterSpacing: '0.02em',
                        }}
                      >
                        {k.prefix || 'hk_live_'}••••••••••••••••
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopy(k.prefix, 'prefix', k.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: copiedPrefixId === k.id ? '#10b981' : '#94a3b8',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 6px',
                          fontSize: '11.5px',
                          borderRadius: '4px',
                        }}
                        title="Copy key prefix"
                      >
                        {copiedPrefixId === k.id ? (
                          <>
                            <Check size={13} /> <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={13} /> <span>Copy prefix</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        fontSize: '12px',
                        color: 'var(--text-muted, #94a3b8)',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} />
                        Created: {k.createdAt ? new Date(k.createdAt).toLocaleDateString() : '—'}
                      </span>
                      <span>&middot;</span>
                      <span>
                        Last used:{' '}
                        {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'Never'}
                      </span>
                      {Array.isArray(k.scopes) && k.scopes.length > 0 && (
                        <>
                          <span>&middot;</span>
                          <span style={{ display: 'inline-flex', gap: '4px', flexWrap: 'wrap' }}>
                            {k.scopes.slice(0, 3).map((s) => (
                              <span
                                key={s}
                                style={{
                                  background: '#f1f5f9',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  color: '#475569',
                                }}
                              >
                                {s}
                              </span>
                            ))}
                            {k.scopes.length > 3 && (
                              <span
                                style={{
                                  background: '#f1f5f9',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  color: '#475569',
                                }}
                              >
                                +{k.scopes.length - 3} more
                              </span>
                            )}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      onClick={() => setKeyToRevoke(k)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: 'none',
                        border: '1px solid #fee2e2',
                        padding: '6px 10px',
                        borderRadius: '7px',
                        cursor: 'pointer',
                        color: '#dc2626',
                        fontSize: '12.5px',
                        fontWeight: 500,
                        transition: 'background 0.15s, border-color 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#fef2f2';
                        e.currentTarget.style.borderColor = '#fca5a5';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'none';
                        e.currentTarget.style.borderColor = '#fee2e2';
                      }}
                      title="Revoke secret key"
                    >
                      <Trash2 size={13} />
                      <span>Revoke</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL 1: Create API Key ── */}
      {showCreateModal && (
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
          onClick={() => setShowCreateModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 50px rgba(0,0,0,0.12)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#eff6ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2563eb',
                  }}
                >
                  <Key size={16} />
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  Create Secret API Key
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5', margin: '0 0 18px 0' }}>
              Generate a secret key to authenticate your programmatic requests. Keys inherit your tenant permissions.
            </p>

            <form onSubmit={handleConfirmCreateKey}>
              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#1e293b',
                    marginBottom: '6px',
                  }}
                >
                  Key Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Production Backend, Zapier, Local Dev"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '22px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#1e293b',
                    marginBottom: '8px',
                  }}
                >
                  Access Scopes
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    {
                      id: 'chat:read',
                      label: 'chat:read & chat:write',
                      desc: 'Full access to chat completions, SSE streams, and voice turns',
                    },
                    {
                      id: 'documents:read',
                      label: 'documents:read & documents:write',
                      desc: 'RAG knowledge base queries, embeddings, and vector store access',
                    },
                    {
                      id: 'workflows:execute',
                      label: 'workflows:execute',
                      desc: 'Trigger and monitor asynchronous automation workflows',
                    },
                  ].map((item) => (
                    <label
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        background: '#f8fafc',
                        border: '1px solid #f1f5f9',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedScopes.includes(item.id)}
                        onChange={() => toggleScope(item.id)}
                        style={{ marginTop: '2px' }}
                      />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                          {item.label}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748b' }}>{item.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: creating ? 'not-allowed' : 'pointer',
                  }}
                >
                  {creating ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Generating...
                    </>
                  ) : (
                    'Create Secret Key'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: Revealed Key View ── */}
      {revealedKey && (
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
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '480px',
              width: '100%',
              padding: '26px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#ecfdf5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle2 size={18} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Secret API Key Generated
              </h3>
            </div>

            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5', margin: '0 0 16px 0' }}>
              Please copy your secret key now. For security purposes,{' '}
              <strong style={{ color: '#0f172a' }}>you will not be able to view it again</strong>. Only a masked prefix will be shown in your dashboard.
            </p>

            <div
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '18px',
              }}
            >
              <code
                style={{
                  flex: 1,
                  wordBreak: 'break-all',
                  fontSize: '12.5px',
                  fontFamily: 'var(--font-mono, monospace)',
                  color: '#0f172a',
                  fontWeight: 500,
                }}
              >
                {revealedKey}
              </code>
              <button
                type="button"
                onClick={() => handleCopy(revealedKey, 'revealed')}
                style={{
                  background: copiedRevealed ? '#ecfdf5' : '#ffffff',
                  border: `1px solid ${copiedRevealed ? '#a7f3d0' : '#cbd5e1'}`,
                  borderRadius: '7px',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  color: copiedRevealed ? '#059669' : '#475569',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
                title="Copy secret key"
              >
                {copiedRevealed ? (
                  <>
                    <Check size={14} /> Copied!
                  </>
                ) : (
                  <>
                    <Copy size={14} /> Copy
                  </>
                )}
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setRevealedKey(null)}
                className="btn-primary"
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: Revoke Confirmation ── */}
      {keyToRevoke && (
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
          onClick={() => setKeyToRevoke(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#fef2f2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangle size={18} />
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Revoke Secret API Key
              </h3>
            </div>

            <p style={{ fontSize: '13.5px', color: '#64748b', lineHeight: '1.5', margin: '0 0 20px 0' }}>
              Are you sure you want to revoke <strong style={{ color: '#0f172a' }}>{keyToRevoke.name}</strong>? Any application or script relying on this key will immediately stop working. This action cannot be undone.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setKeyToRevoke(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={revoking}
                onClick={handleConfirmRevokeKey}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: revoking ? 'not-allowed' : 'pointer',
                }}
              >
                {revoking ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Revoking...
                  </>
                ) : (
                  'Revoke Key'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
