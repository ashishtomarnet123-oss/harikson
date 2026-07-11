import React, { useState, useEffect } from 'react';
import { LogIn, Key, Shield, AlertTriangle, Info } from 'lucide-react';

const iconMap = {
  login: LogIn,
  key: Key,
  shield: Shield,
  alert: AlertTriangle,
  info: Info
};

export default function ActivitySettings() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const token = localStorage.getItem('hk_token');
      if (!token) return;
      const apiBase = localStorage.getItem('hk_api_base') || 'http://localhost:3008';
      const tenantSlug = localStorage.getItem('hk_tenant') || 'neuravolt';
      const res = await fetch(`${apiBase}/api/user/activity`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-slug': tenantSlug
        }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      } else {
        throw new Error('Failed to load activity logs');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (actionText) => {
    const text = actionText.toLowerCase();
    if (text.includes('logged') || text.includes('signin')) return LogIn;
    if (text.includes('key') || text.includes('token')) return Key;
    if (text.includes('password') || text.includes('security') || text.includes('mfa')) return Shield;
    return Info;
  };

  if (loading) return <div className="settings-loading">Loading activity history...</div>;

  return (
    <>
      <div className="settings-page-header">
        <h1>Activity Timeline</h1>
        <p>A complete history of security and administrative actions taken on your account.</p>
      </div>

      <div className="settings-section">
        <h2>Recent Activity</h2>
        {error && <div className="settings-alert error">{error}</div>}
        
        {logs.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No recent activity recorded.</p>
        ) : (
          <div className="settings-timeline">
            {logs.map((log) => {
              const Icon = getIcon(log.action);
              return (
                <div key={log.id} className="settings-timeline-item">
                  <div
                    className="settings-timeline-dot"
                    style={{ background: log.color || 'var(--accent)' }}
                  >
                    <div style={{ width: '6px', height: '6px', background: '#fff', borderRadius: '50%' }} />
                  </div>

                  <div className="settings-card">
                    <div className="settings-flex-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', minWidth: 0 }}>
                        <div style={{
                          width: '30px', height: '30px', flexShrink: 0,
                          borderRadius: '50%', background: 'var(--bg-hover)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: log.color || 'var(--accent)'
                        }}>
                          <Icon size={14} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: '500', fontSize: '14px', marginBottom: '3px' }}>{log.action}</div>
                          <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', wordBreak: 'break-word' }}>
                            {log.device} &middot; {log.ip}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {log.date}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
