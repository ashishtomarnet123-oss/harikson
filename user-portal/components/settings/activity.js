import { authenticatedFetch, getApiConfig } from './apiHelper';
import React, { useState, useEffect } from 'react';
import { LogIn, Key, Shield, AlertTriangle, Info } from 'lucide-react';

const iconMap = {
  login: LogIn,
  key: Key,
  shield: Shield,
  alert: AlertTriangle,
  info: Info,
};

export default function ActivitySettings() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [planDisabled, setPlanDisabled] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const { apiBase, tenantSlug } = getApiConfig();
      setApiBaseUrl(apiBase || '');
      let res;
      try {
        res = await authenticatedFetch(`${apiBase}/api/v1/user/activity`, {
          credentials: 'include',
          headers: {
            'x-tenant-slug': tenantSlug,
          },
        });
      } catch (e) {
        res = await authenticatedFetch(`/api/v1/user/activity`, {
          credentials: 'include',
          headers: {
            'x-tenant-slug': tenantSlug,
          },
        });
      }

      if (res && res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
        setPlanDisabled(false);
      } else {
        const errData = await res.json().catch(() => ({}));
        if (res && res.status === 403 && errData.code === 'PLAN_FEATURE_DISABLED') {
          setError(
            errData.error ||
              'Audit trail is not enabled for your subscription plan. Please upgrade your plan to access audit history.'
          );
          setPlanDisabled(true);
          setLogs([]);
        } else {
          setLogs([]);
        }
      }
    } catch (err) {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (actionText) => {
    const text = actionText.toLowerCase();
    if (text.includes('logged') || text.includes('signin')) return LogIn;
    if (text.includes('key') || text.includes('token')) return Key;
    if (
      text.includes('password') ||
      text.includes('security') ||
      text.includes('mfa')
    )
      return Shield;
    return Info;
  };

  const cleanIp = (ip) => {
    if (!ip) return 'Unknown IP';
    return ip.replace(/^::ffff:/, '');
  };

  const parseUA = (ua) => {
    if (!ua) return 'Chrome 122 on macOS';
    if (ua.includes(' on ')) return ua;
    if (ua.toLowerCase().includes('curl')) return 'Curl Client';
    if (
      ua.toLowerCase().includes('node-fetch') ||
      ua.toLowerCase().includes('axios') ||
      ua.toLowerCase().includes('postman')
    ) {
      return 'API Client';
    }
    const browserMatch = ua.match(
      /(Chrome|Firefox|Safari|Edge|Opera|Brave)[/\s]([\d.]+)/i
    );
    const osMatch = ua.match(
      /(Windows NT|Mac OS X|Linux|Android|iOS|iPhone OS)[\s/]?([\d._]+)?/i
    );

    let osName = 'Unknown OS';
    if (osMatch) {
      if (osMatch[1] === 'Windows NT') osName = 'Windows';
      else if (osMatch[1] === 'iPhone OS') osName = 'iOS';
      else osName = osMatch[1].replace('_', ' ');
    }
    const browserName = browserMatch ? browserMatch[1] : 'Unknown Browser';
    return `${browserName} on ${osName}`;
  };

  if (loading)
    return <div className="settings-loading">Loading activity history...</div>;

  return (
    <>
      <div
        className="settings-page-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <h1>Activity Timeline</h1>
          <p>
            A complete history of security and administrative actions taken on
            your account.
          </p>
        </div>
        {!planDisabled && logs.length > 0 && (
          <a
            href={`${apiBaseUrl}/api/v1/user/activity/export?format=csv`}
            download="activity_logs.csv"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12.5px',
              color: 'var(--accent, #3b82f6)',
              textDecoration: 'none',
              fontWeight: 500,
              padding: '6px 12px',
              borderRadius: '6px',
              background: 'var(--bg-hover)',
              border: '1px solid var(--border)',
            }}
          >
            Export CSV
          </a>
        )}
      </div>

      <div className="settings-section">
        <h2>Recent Activity</h2>
        {planDisabled ? (
          <div
            className="settings-card"
            style={{ padding: '36px 24px', textAlign: 'center' }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                margin: '0 auto 16px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
              }}
            >
              <Shield size={24} />
            </div>
            <h3
              style={{
                fontSize: '16px',
                fontWeight: '600',
                color: 'var(--text-primary)',
                marginBottom: '8px',
              }}
            >
              Audit Trail Feature Required
            </h3>
            <p
              style={{
                fontSize: '13.5px',
                color: 'var(--text-secondary)',
                maxWidth: '440px',
                margin: '0 auto 20px',
                lineHeight: '1.5',
              }}
            >
              {error ||
                'Audit trail is not enabled for your subscription plan. Upgrade to the Professional or Enterprise plan to view and export complete activity logs.'}
            </p>
            <a
              href="/settings/billing"
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '500',
                textDecoration: 'none',
                background: 'var(--accent, #3b82f6)',
                color: '#fff',
              }}
            >
              Upgrade Plan
            </a>
          </div>
        ) : (
          <>
            {error && <div className="settings-alert error">{error}</div>}

            {logs.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                No recent activity recorded.
              </p>
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
                    <div
                      style={{
                        width: '6px',
                        height: '6px',
                        background: '#fff',
                        borderRadius: '50%',
                      }}
                    />
                  </div>

                  <div
                    className="settings-card"
                    style={{ padding: '14px 16px' }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                      }}
                    >
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          flexShrink: 0,
                          borderRadius: '50%',
                          background: 'var(--bg-hover)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: log.color || 'var(--accent)',
                        }}
                      >
                        <Icon size={15} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontWeight: '600',
                            fontSize: '14.5px',
                            color: 'var(--text-primary)',
                            marginBottom: '4px',
                          }}
                        >
                          {log.action}
                        </div>
                        <div
                          style={{
                            fontSize: '12.5px',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '6px',
                            alignItems: 'center',
                          }}
                        >
                          <span>{parseUA(log.device)}</span>
                          <span style={{ color: 'var(--text-muted)' }}>
                            &bull;
                          </span>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '11px',
                              background: 'var(--bg-hover)',
                              padding: '1px 5px',
                              borderRadius: '4px',
                            }}
                          >
                            {cleanIp(log.ip)}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: '11.5px',
                            color: 'var(--text-muted)',
                            marginTop: '5px',
                          }}
                        >
                          {log.date}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
          </>
        )}
      </div>
    </>
  );
}

