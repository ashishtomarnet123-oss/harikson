import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function UsageSettings() {
  const [mounted, setMounted] = useState(false);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const token = localStorage.getItem('hk_token');
        const apiBase = localStorage.getItem('hk_api_base') || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3008';
      const tenantSlug = localStorage.getItem('hk_tenant') || 'neuravolt';
        const res = await fetch(`${apiBase}/api/user/usage?days=7`, {
          headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-slug': tenantSlug
        }
        });
        if (res.ok) {
          setUsage(await res.json());
        } else {
          throw new Error('Failed to load usage data');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchUsage();
  }, []);

  const formatChange = (pct) => {
    if (pct === null || pct === undefined) return null;
    const abs = Math.abs(pct);
    const color = pct >= 0 ? '#059669' : '#dc2626';
    const sign = pct >= 0 ? '+' : '-';
    return <span style={{ color }}>{sign}{abs}% from last week</span>;
  };

  const formatNumber = (n) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(0) + 'k';
    return String(n);
  };

  if (loading) return <div className="settings-loading">Loading usage data...</div>;

  return (
    <>
      <div className="settings-page-header">
        <h1>Usage &amp; Analytics</h1>
        <p>Monitor your token consumption and active query volume over time.</p>
      </div>

      {error && <div className="settings-alert error">{error}</div>}

      {usage && (
        <>
          <div className="settings-grid-cards" style={{ marginBottom: '20px' }}>
            <div className="settings-card">
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Total Tokens Used (7 Days)
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', lineHeight: 1 }}>
                {formatNumber(usage.totalTokens)}
              </div>
              <div style={{ fontSize: '12px', marginTop: '6px' }}>
                {usage.tokenChange !== null ? formatChange(usage.tokenChange) : (
                  <span style={{ color: 'var(--text-muted)' }}>No prior data</span>
                )}
              </div>
            </div>
            <div className="settings-card">
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Total Queries (7 Days)
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', lineHeight: 1 }}>
                {usage.totalQueries}
              </div>
              <div style={{ fontSize: '12px', marginTop: '6px' }}>
                {usage.queryChange !== null ? formatChange(usage.queryChange) : (
                  <span style={{ color: 'var(--text-muted)' }}>No prior data</span>
                )}
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h2>Token Consumption</h2>
            {usage.daily.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '12px' }}>
                No usage data yet. Start a conversation to see your analytics here.
              </p>
            ) : (
              <div style={{ height: '280px', width: '100%', marginTop: '8px' }}>
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={usage.daily} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false}
                        tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <Tooltip
                        contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px' }}
                        itemStyle={{ color: 'var(--accent)' }}
                        formatter={(v) => [formatNumber(v) + ' tokens', 'Tokens']}
                      />
                      <Area type="monotone" dataKey="tokens" stroke="var(--accent)" strokeWidth={2.5}
                        fillOpacity={1} fill="url(#colorTokens)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {!usage && !error && (
        <div className="settings-section">
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No usage data available.</p>
        </div>
      )}
    </>
  );
}
