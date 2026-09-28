import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Share2, Copy, Check, LinkIcon, AlertTriangle, RefreshCw, Lock, ExternalLink, Clock } from 'lucide-react';
import { authenticatedFetch, getApiConfig } from './settings/apiHelper';

// ─────────────────────────────────────────────
// Secure clipboard helper
// ─────────────────────────────────────────────
async function copyToClipboard(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      ok ? resolve() : reject(new Error('copy failed'));
    } catch (e) { reject(e); }
  });
}

// ─────────────────────────────────────────────
// Expiry label helper
// ─────────────────────────────────────────────
function expiryLabel(expiresAt) {
  if (!expiresAt) return 'Never expires';
  const diff = new Date(expiresAt) - Date.now();
  if (diff <= 0) return 'Expired';
  const days = Math.ceil(diff / 86400_000);
  return `Expires in ${days} day${days !== 1 ? 's' : ''}`;
}

/**
 * ShareModal — complete share management dialog.
 *
 * Props:
 *   isOpen           {boolean}
 *   onClose          {() => void}
 *   conversationId   {string | null}
 *   conversationTitle {string}
 */
export default function ShareModal({ isOpen, onClose, conversationId, conversationTitle }) {
  const [status, setStatus]     = useState('idle');     // idle | loading | shared | creating | revoking | error
  const [shareUrl, setShareUrl] = useState('');
  const [expiresAt, setExpiresAt] = useState(null);
  const [accessCount, setAccessCount] = useState(0);
  const [lastAccessed, setLastAccessed] = useState(null);
  const [copied, setCopied]     = useState(false);
  const [error, setError]       = useState('');
  const [expiryChoice, setExpiryChoice] = useState('never'); // never | 1d | 7d | 30d
  const [showPrivacyWarning, setShowPrivacyWarning] = useState(false);

  const urlInputRef = useRef(null);

  // ── Load existing share state when modal opens ──────────────
  const loadShareStatus = useCallback(async () => {
    if (!conversationId || !isOpen) return;
    setStatus('loading');
    setError('');
    try {
      const { apiBase } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/conversations/${conversationId}/share`);
      if (!res?.ok) throw new Error('Failed to check share status');
      const data = await res.json();
      if (data.shared) {
        setStatus('shared');
        setExpiresAt(data.expiresAt);
        setAccessCount(data.accessCount || 0);
        setLastAccessed(data.lastAccessedAt);
        // Share URL is not returned by the status endpoint (raw token is not stored).
        // We show a notice to the user that they need to create a new link to get URL.
        setShareUrl('');
      } else {
        setStatus('idle');
        setShareUrl('');
      }
    } catch (err) {
      setStatus('idle');
    }
  }, [conversationId, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setShowPrivacyWarning(false);
      setCopied(false);
      setError('');
      loadShareStatus();
    } else {
      // Reset on close
      setStatus('idle');
      setShareUrl('');
      setExpiresAt(null);
      setAccessCount(0);
      setLastAccessed(null);
    }
  }, [isOpen, loadShareStatus]);

  // ── Create share link ──────────────────────────────────────
  const handleCreateShare = useCallback(async () => {
    if (!conversationId) return;
    setStatus('creating');
    setError('');
    try {
      const { apiBase } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/conversations/${conversationId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresIn: expiryChoice === 'never' ? null : expiryChoice }),
      });
      if (!res?.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to create share link');
      }
      const data = await res.json();
      setShareUrl(data.shareUrl);
      setExpiresAt(data.expiresAt);
      setAccessCount(0);
      setLastAccessed(null);
      setStatus('shared');
      setShowPrivacyWarning(false);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setStatus('idle');
    }
  }, [conversationId, expiryChoice]);

  // ── Revoke share link ──────────────────────────────────────
  const handleRevoke = useCallback(async () => {
    if (!conversationId) return;
    setStatus('revoking');
    setError('');
    try {
      const { apiBase } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/conversations/${conversationId}/share/revoke`, {
        method: 'POST',
      });
      if (!res?.ok) throw new Error('Failed to revoke share link');
      setStatus('idle');
      setShareUrl('');
      setExpiresAt(null);
      setAccessCount(0);
    } catch (err) {
      setError(err.message || 'Failed to revoke. Please try again.');
      setStatus('shared');
    }
  }, [conversationId]);

  // ── Copy to clipboard ──────────────────────────────────────
  const handleCopy = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await copyToClipboard(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback: select the input
      urlInputRef.current?.select();
    }
  }, [shareUrl]);

  if (!isOpen) return null;

  const isLoading = status === 'loading' || status === 'creating' || status === 'revoking';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.15s ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '500px',
          maxWidth: '100%',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '20px',
          boxShadow: '0 24px 60px -12px rgba(15, 23, 42, 0.22), 0 1px 3px rgba(15, 23, 42, 0.06)',
          overflow: 'hidden',
          fontFamily: 'inherit',
          animation: 'slideUpFade 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Share2 size={18} color="#2563eb" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                Share conversation
              </h2>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b', marginTop: '1px' }}>
                {conversationTitle || 'Untitled conversation'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: '#94a3b8', padding: '6px', borderRadius: '8px',
              display: 'flex', alignItems: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '20px 24px 24px' }}>

          {/* Error banner */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              backgroundColor: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: '10px', padding: '10px 12px', marginBottom: '16px',
            }}>
              <AlertTriangle size={15} color="#dc2626" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '13px', color: '#dc2626' }}>{error}</span>
            </div>
          )}

          {/* Loading state */}
          {status === 'loading' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '24px', justifyContent: 'center', color: '#64748b', fontSize: '13px',
            }}>
              <div style={{
                width: '16px', height: '16px', border: '2px solid #e2e8f0',
                borderTop: '2px solid #2563eb', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              Checking share status...
            </div>
          )}

          {/* IDLE — no active share */}
          {status === 'idle' && !showPrivacyWarning && (
            <div>
              <p style={{ margin: '0 0 16px', fontSize: '13.5px', color: '#475569', lineHeight: 1.6 }}>
                Create a public link so anyone can view this conversation
                without signing in. The recipient will see a{' '}
                <strong style={{ color: '#0f172a' }}>read-only snapshot</strong>{' '}
                of the current state.
              </p>

              {/* Expiry selector */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Link expiration
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { value: 'never', label: 'Never' },
                    { value: '1d',    label: '1 day' },
                    { value: '7d',    label: '7 days' },
                    { value: '30d',   label: '30 days' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setExpiryChoice(opt.value)}
                      style={{
                        padding: '5px 12px', borderRadius: '8px', fontSize: '12.5px',
                        fontWeight: 500, cursor: 'pointer', transition: 'all 0.12s ease',
                        background: expiryChoice === opt.value ? '#eff6ff' : '#f8fafc',
                        border: expiryChoice === opt.value ? '1.5px solid #2563eb' : '1.5px solid #e2e8f0',
                        color: expiryChoice === opt.value ? '#1d4ed8' : '#64748b',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowPrivacyWarning(true)}
                style={{
                  width: '100%', padding: '12px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none',
                  color: '#ffffff', fontSize: '14px', fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '8px',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
                  transition: 'all 0.15s ease',
                }}
              >
                <Share2 size={16} />
                Create share link
              </button>
            </div>
          )}

          {/* Privacy warning — shown before actual creation */}
          {status === 'idle' && showPrivacyWarning && (
            <div>
              <div style={{
                backgroundColor: '#fffbeb', border: '1px solid #fde68a',
                borderRadius: '12px', padding: '14px', marginBottom: '16px',
              }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: '1px' }} />
                  <div>
                    <p style={{ margin: '0 0 6px', fontWeight: 700, color: '#92400e', fontSize: '13.5px' }}>
                      Before you share
                    </p>
                    <p style={{ margin: 0, fontSize: '13px', color: '#78350f', lineHeight: 1.6 }}>
                      <strong>Anyone with this link</strong> can view this conversation without
                      signing in. Make sure it does not contain:
                    </p>
                    <ul style={{ margin: '8px 0 0 16px', padding: 0, fontSize: '12.5px', color: '#78350f', lineHeight: 1.7 }}>
                      <li>Passwords or API keys</li>
                      <li>Personal or confidential information</li>
                      <li>Private credentials or tokens</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setShowPrivacyWarning(false)}
                  style={{
                    flex: 1, padding: '11px', borderRadius: '10px',
                    background: '#f8fafc', border: '1px solid #e2e8f0',
                    color: '#475569', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateShare}
                  disabled={isLoading}
                  style={{
                    flex: 1, padding: '11px', borderRadius: '10px',
                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none',
                    color: '#ffffff', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer',
                    opacity: isLoading ? 0.7 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  }}
                >
                  {status === 'creating' ? (
                    <>
                      <div style={{
                        width: '13px', height: '13px', border: '2px solid rgba(255,255,255,0.3)',
                        borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                      }} />
                      Creating...
                    </>
                  ) : (
                    <>I understand, create link</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* CREATING state */}
          {status === 'creating' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '24px', justifyContent: 'center', color: '#64748b', fontSize: '13px',
            }}>
              <div style={{
                width: '16px', height: '16px', border: '2px solid #e2e8f0',
                borderTop: '2px solid #2563eb', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              Generating secure link...
            </div>
          )}

          {/* SHARED state — active share exists */}
          {status === 'shared' && (
            <div>
              {/* Status pill */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: '#f0fdf4', border: '1px solid #bbf7d0',
                borderRadius: '20px', padding: '4px 10px', marginBottom: '16px',
              }}>
                <div style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  background: '#22c55e', boxShadow: '0 0 0 2px #dcfce7',
                }} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#15803d' }}>
                  Sharing is ON
                </span>
              </div>

              <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                Anyone with this link can view this conversation. They cannot edit
                it or access your account.
              </p>

              {/* URL or notice */}
              {shareUrl ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: '10px', padding: '10px 12px', marginBottom: '14px',
                }}>
                  <LinkIcon size={14} color="#64748b" style={{ flexShrink: 0 }} />
                  <input
                    ref={urlInputRef}
                    readOnly
                    value={shareUrl}
                    onClick={(e) => e.target.select()}
                    style={{
                      flex: 1, background: 'transparent', border: 'none', outline: 'none',
                      fontSize: '12.5px', color: '#1e293b', fontFamily: 'monospace',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                  />
                  <button
                    onClick={handleCopy}
                    style={{
                      background: copied ? '#f0fdf4' : '#eff6ff',
                      border: copied ? '1px solid #bbf7d0' : '1px solid #bfdbfe',
                      borderRadius: '7px', padding: '5px 10px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '5px',
                      fontSize: '12px', fontWeight: 600,
                      color: copied ? '#15803d' : '#1d4ed8',
                      transition: 'all 0.15s ease', flexShrink: 0,
                    }}
                    title={copied ? 'Copied!' : 'Copy link'}
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              ) : (
                // Share exists but URL was not returned (created in a previous session)
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: '#eff6ff', border: '1px solid #bfdbfe',
                  borderRadius: '10px', padding: '10px 14px', marginBottom: '14px',
                }}>
                  <LinkIcon size={14} color="#2563eb" style={{ flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: '12.5px', color: '#1e40af', lineHeight: 1.5 }}>
                    A share link is active but the URL is no longer available
                    (it was shown only once for security). Click{' '}
                    <strong>Renew link</strong> to generate a new shareable URL.
                  </p>
                </div>
              )}

              {/* Expiry + analytics row */}
              <div style={{
                display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: '8px', padding: '5px 10px', fontSize: '12px', color: '#64748b',
                }}>
                  <Clock size={12} />
                  {expiryLabel(expiresAt)}
                </div>
                {accessCount > 0 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    background: '#f8fafc', border: '1px solid #e2e8f0',
                    borderRadius: '8px', padding: '5px 10px', fontSize: '12px', color: '#64748b',
                  }}>
                    <ExternalLink size={12} />
                    {accessCount} {accessCount === 1 ? 'view' : 'views'}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleCreateShare}
                  disabled={isLoading}
                  title="Revoke current link and generate a new one"
                  style={{
                    flex: 1, padding: '10px', borderRadius: '10px',
                    background: '#f8fafc', border: '1px solid #e2e8f0',
                    color: '#475569', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', opacity: isLoading ? 0.6 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  }}
                >
                  {status === 'creating' ? (
                    <div style={{ width: '12px', height: '12px', border: '2px solid #cbd5e1', borderTop: '2px solid #475569', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  ) : (
                    <RefreshCw size={13} />
                  )}
                  Renew link
                </button>
                <button
                  onClick={handleRevoke}
                  disabled={isLoading}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '10px',
                    background: '#fff5f5', border: '1px solid #fecaca',
                    color: '#dc2626', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', opacity: isLoading ? 0.6 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  }}
                >
                  {status === 'revoking' ? (
                    <div style={{ width: '12px', height: '12px', border: '2px solid #fca5a5', borderTop: '2px solid #dc2626', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  ) : (
                    <Lock size={13} />
                  )}
                  Revoke link
                </button>
              </div>
            </div>
          )}

          {/* REVOKING state */}
          {status === 'revoking' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '24px', justifyContent: 'center', color: '#64748b', fontSize: '13px',
            }}>
              <div style={{
                width: '16px', height: '16px', border: '2px solid #e2e8f0',
                borderTop: '2px solid #dc2626', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              Revoking link...
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
