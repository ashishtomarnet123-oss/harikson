import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { withAuth } from '../components/withAuth';
import DashboardShell from '../components/layout/DashboardShell';
import { authenticatedFetch, getApiConfig } from '../components/settings/apiHelper';
import {
  Shield,
  Key,
  Smartphone,
  Lock,
  Activity,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Fingerprint,
} from 'lucide-react';

function SecurityPage() {
  const [sessions, setSessions] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [activity, setActivity] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    try {
      const { apiBase } = getApiConfig();
      const [sessRes, keysRes, actRes, profRes] = await Promise.allSettled([
        authenticatedFetch(`${apiBase}/api/v1/user/sessions`),
        authenticatedFetch(`${apiBase}/api/v1/user/api-keys`),
        authenticatedFetch(`${apiBase}/api/v1/user/activity`),
        authenticatedFetch(`${apiBase}/api/v1/user/profile`),
      ]);

      if (sessRes.status === 'fulfilled' && sessRes.value?.ok) {
        const data = await sessRes.value.json();
        setSessions(Array.isArray(data) ? data : data.sessions || []);
      }
      if (keysRes.status === 'fulfilled' && keysRes.value?.ok) {
        const data = await keysRes.value.json();
        setApiKeys(Array.isArray(data) ? data : data.apiKeys || []);
      }
      if (actRes.status === 'fulfilled' && actRes.value?.ok) {
        const data = await actRes.value.json();
        setActivity(Array.isArray(data) ? data.slice(0, 10) : []);
      }
      if (profRes.status === 'fulfilled' && profRes.value?.ok) {
        setProfile(await profRes.value.json());
      }
    } catch (err) {
      console.error('Security data load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = async (id) => {
    if (!confirm('Revoke this session?')) return;
    try {
      const { apiBase } = getApiConfig();
      await authenticatedFetch(`${apiBase}/api/v1/user/sessions/${id}`, { method: 'DELETE' });
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Revoke session error:', err);
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const twoFactorEnabled = profile?.two_factor_enabled || profile?.twoFactorEnabled;

  const securityScore = (() => {
    let score = 40;
    if (twoFactorEnabled) score += 30;
    if (apiKeys.length > 0) score += 10;
    if (sessions.length <= 3) score += 20;
    return Math.min(score, 100);
  })();

  const scoreColor = securityScore >= 80 ? '#10b981' : securityScore >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <DashboardShell title="Security & Compliance">
      <Head><title>Security — Xarwiz</title></Head>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <>
          {/* Security Score + Quick Stats */}
          <div className="ds-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '28px' }}>
            <div style={{
              padding: '20px', borderRadius: '12px',
              backgroundColor: 'var(--shell-surface)',
              border: '1px solid var(--shell-card-border)',
            }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--shell-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Security Score</div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: scoreColor, marginTop: '4px', fontFamily: 'JetBrains Mono, monospace' }}>{securityScore}%</div>
            </div>
            <div style={{
              padding: '20px', borderRadius: '12px',
              backgroundColor: 'var(--shell-surface)',
              border: '1px solid var(--shell-card-border)',
            }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--shell-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>2FA Status</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                {twoFactorEnabled ? (
                  <><CheckCircle2 size={18} color="#10b981" /><span style={{ fontSize: '14px', fontWeight: 600, color: '#10b981' }}>Enabled</span></>
                ) : (
                  <><AlertTriangle size={18} color="#f59e0b" /><span style={{ fontSize: '14px', fontWeight: 600, color: '#f59e0b' }}>Not enabled</span></>
                )}
              </div>
            </div>
            <div style={{
              padding: '20px', borderRadius: '12px',
              backgroundColor: 'var(--shell-surface)',
              border: '1px solid var(--shell-card-border)',
            }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--shell-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active Sessions</div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--shell-text-bright)', marginTop: '4px', fontFamily: 'JetBrains Mono, monospace' }}>{sessions.length}</div>
            </div>
            <div style={{
              padding: '20px', borderRadius: '12px',
              backgroundColor: 'var(--shell-surface)',
              border: '1px solid var(--shell-card-border)',
            }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--shell-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>API Keys</div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--shell-text-bright)', marginTop: '4px', fontFamily: 'JetBrains Mono, monospace' }}>{apiKeys.length}</div>
            </div>
          </div>

          {/* Active Sessions */}
          <div style={{
            marginBottom: '28px', borderRadius: '12px',
            backgroundColor: 'var(--shell-surface)',
            border: '1px solid var(--shell-card-border)',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--shell-card-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Smartphone size={16} color="#818cf8" />
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--shell-text)' }}>Active Sessions</span>
            </div>
            {sessions.length === 0 ? (
              <p style={{ padding: '20px', color: 'var(--shell-text-muted)', fontSize: '13px', textAlign: 'center' }}>No active sessions found</p>
            ) : sessions.map((s) => (
              <div key={s.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 20px',
                borderBottom: '1px solid var(--shell-card-border-subtle)',
                fontSize: '13px',
              }}>
                <div>
                  <div style={{ color: 'var(--shell-text-bright)', fontWeight: 500 }}>{s.device || s.user_agent || 'Unknown device'}</div>
                  <div style={{ color: 'var(--shell-text-muted)', fontSize: '11px', marginTop: '2px' }}>
                    {s.ip_address || s.ip || '—'} · {formatDate(s.created_at || s.last_active)}
                  </div>
                </div>
                <button
                  onClick={() => handleRevokeSession(s.id)}
                  style={{
                    fontSize: '11px', fontWeight: 600,
                    padding: '4px 10px', borderRadius: '6px',
                    backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171',
                    border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer',
                  }}
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>

          {/* API Keys Overview */}
          <div style={{
            marginBottom: '28px', borderRadius: '12px',
            backgroundColor: 'var(--shell-surface)',
            border: '1px solid var(--shell-card-border)',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--shell-card-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Key size={16} color="#818cf8" />
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--shell-text)' }}>API Keys</span>
            </div>
            {apiKeys.length === 0 ? (
              <p style={{ padding: '20px', color: 'var(--shell-text-muted)', fontSize: '13px', textAlign: 'center' }}>No API keys created yet</p>
            ) : apiKeys.map((k) => (
              <div key={k.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 20px',
                borderBottom: '1px solid var(--shell-card-border-subtle)',
                fontSize: '13px',
              }}>
                <div>
                  <div style={{ color: 'var(--shell-text-bright)', fontWeight: 500 }}>{k.name || 'Unnamed key'}</div>
                  <div style={{ color: 'var(--shell-text-muted)', fontSize: '11px', marginTop: '2px', fontFamily: 'monospace' }}>
                    {k.prefix || k.key_prefix || 'hk_live_'}•••• · Created {formatDate(k.created_at)}
                  </div>
                </div>
                <span style={{
                  fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: '10px',
                  backgroundColor: k.revoked ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                  color: k.revoked ? '#f87171' : '#34d399',
                }}>
                  {k.revoked ? 'Revoked' : 'Active'}
                </span>
              </div>
            ))}
          </div>

          {/* Recent Security Activity */}
          <div style={{
            marginBottom: '28px', borderRadius: '12px',
            backgroundColor: 'var(--shell-surface)',
            border: '1px solid var(--shell-card-border)',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--shell-card-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} color="#818cf8" />
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--shell-text)' }}>Recent Activity</span>
            </div>
            {activity.length === 0 ? (
              <p style={{ padding: '20px', color: 'var(--shell-text-muted)', fontSize: '13px', textAlign: 'center' }}>No recent activity</p>
            ) : activity.map((a, i) => (
              <div key={a.id || i} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 20px',
                borderBottom: '1px solid var(--shell-card-border-subtle)',
                fontSize: '13px',
              }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  backgroundColor: a.color || '#6366f1',
                  flexShrink: 0,
                }} />
                <div style={{ flex: 1 }}>
                  <span style={{ color: 'var(--shell-text-bright)' }}>{a.action || a.event || 'Activity'}</span>
                  {a.ip && <span style={{ color: 'var(--shell-text-muted)', marginLeft: '8px' }}>from {a.ip}</span>}
                </div>
                <span style={{ color: 'var(--shell-text-muted)', fontSize: '11px', whiteSpace: 'nowrap' }}>
                  {formatDate(a.date || a.created_at)}
                </span>
              </div>
            ))}
          </div>

          {/* Security Policy Link */}
          <div style={{
            padding: '16px 20px', borderRadius: '12px',
            backgroundColor: 'var(--shell-surface)',
            border: '1px solid var(--shell-card-border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--shell-text)' }}>Security & Compliance Policy</div>
              <div style={{ fontSize: '12px', color: 'var(--shell-text-muted)', marginTop: '2px' }}>
                DPDP Act 2023, ISO 27001, SOC 2 Type II compliance documentation
              </div>
            </div>
            <Link href="/security-policy" style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: '13px', fontWeight: 600, color: '#818cf8',
              textDecoration: 'none',
            }}>
              View Policy <ExternalLink size={14} />
            </Link>
          </div>
        </>
      )}
    </DashboardShell>
  );
}

export default withAuth(SecurityPage);
