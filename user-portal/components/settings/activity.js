import React, { useState, useEffect } from 'react';
import { LogIn, Key, Shield, AlertTriangle, Info, Globe, Monitor, Terminal, Clock } from 'lucide-react';

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

  const parseUA = (ua) => {
    if (!ua) return { os: 'Unknown Device', browser: 'Browser' };
    
    let browser = 'Browser';
    let os = 'Unknown OS';
    
    if (ua.toLowerCase().includes('curl')) {
      return { os: 'Terminal', browser: 'curl' };
    }
    
    // OS Detection
    if (ua.includes('Mac OS X') || ua.includes('Macintosh')) {
      os = 'macOS';
    } else if (ua.includes('Windows')) {
      os = 'Windows';
    } else if (ua.includes('Linux')) {
      os = 'Linux';
    } else if (ua.includes('Android')) {
      os = 'Android';
    } else if (ua.includes('iPhone') || ua.includes('iPad') || ua.includes('iOS')) {
      os = 'iOS';
    }
    
    // Browser Detection
    if (ua.includes('Chrome')) {
      browser = 'Chrome';
    } else if (ua.includes('Safari')) {
      browser = 'Safari';
    } else if (ua.includes('Firefox')) {
      browser = 'Firefox';
    } else if (ua.includes('Edge')) {
      browser = 'Edge';
    } else if (ua.includes('Opera')) {
      browser = 'Opera';
    }
    
    return { os, browser };
  };

  const cleanIP = (ip) => {
    if (!ip) return 'Unknown IP';
    return ip.replace('::ffff:', '');
  };

  if (loading) return <div className="settings-loading">Loading activity history...</div>;

  return (
    <>
      <style>{`
        .activity-timeline-container {
          animation: activity-fade-in 0.3s ease-out;
        }
        @keyframes activity-fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .activity-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          width: 100%;
        }

        .activity-action-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .activity-timestamp-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11.5px;
          color: var(--text-muted);
          font-weight: 500;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .activity-metadata-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
          padding-left: 38px; /* Alignment with title text */
        }

        .activity-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 11.5px;
          color: var(--text-secondary);
          max-width: 280px;
          transition: all 0.15s ease;
        }
        
        .activity-badge:hover {
          background: var(--bg-hover);
          border-color: var(--border-hover);
        }

        .activity-badge span {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .activity-badge.ip {
          font-family: var(--font-mono);
          font-size: 11px;
        }
      `}</style>

      <div className="activity-timeline-container">
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
                const { os, browser } = parseUA(log.device);
                const isCurl = log.device && log.device.toLowerCase().includes('curl');
                
                return (
                  <div key={log.id} className="settings-timeline-item">
                    <div
                      className="settings-timeline-dot"
                      style={{ background: log.color || 'var(--accent)' }}
                    >
                      <div style={{ width: '6px', height: '6px', background: '#fff', borderRadius: '50%' }} />
                    </div>

                    <div className="settings-card" style={{ padding: '16px' }}>
                      <div className="activity-card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                          <div style={{
                            width: '28px', height: '28px', flexShrink: 0,
                            borderRadius: '50%', background: 'var(--bg-hover)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: log.color || 'var(--accent)'
                          }}>
                            <Icon size={13} />
                          </div>
                          <span className="activity-action-title">{log.action}</span>
                        </div>
                        <span className="activity-timestamp-badge">
                          <Clock size={11} style={{ opacity: 0.7 }} />
                          {log.date}
                        </span>
                      </div>

                      <div className="activity-metadata-row">
                        <div className="activity-badge" title={log.device}>
                          {isCurl ? <Terminal size={11} /> : <Monitor size={11} />}
                          <span>{os} • {browser}</span>
                        </div>
                        <div className="activity-badge ip" title={`Full Address: ${log.ip}`}>
                          <Globe size={11} />
                          <span>{cleanIP(log.ip)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
