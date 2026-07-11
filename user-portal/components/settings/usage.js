import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function UsageSettings() {
  const [mounted, setMounted] = useState(false);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setMounted(true);
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    try {
      const token = localStorage.getItem('hk_token');
      const apiBase = localStorage.getItem('hk_api_base') || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3008';
      const res = await fetch(`${apiBase}/api/user/usage`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsage(data);
      } else {
        throw new Error('Failed to load usage statistics');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="settings-loading">Loading usage analytics...</div>;

  const totalTokens = usage?.totalTokens || 0;
  const totalQueries = usage?.totalQueries || 0;
  const tokensChange = usage?.tokensChange || 0;
  const queriesChange = usage?.queriesChange || 0;
  const chartData = usage?.chartData || [
    { name: 'Mon', tokens: 0, queries: 0 },
    { name: 'Tue', tokens: 0, queries: 0 },
    { name: 'Wed', tokens: 0, queries: 0 },
    { name: 'Thu', tokens: 0, queries: 0 },
    { name: 'Fri', tokens: 0, queries: 0 },
    { name: 'Sat', tokens: 0, queries: 0 },
    { name: 'Sun', tokens: 0, queries: 0 },
  ];

  return (
    <>
      <div className="settings-page-header">
        <h1>Usage &amp; Analytics</h1>
        <p>Monitor your token consumption and active query volume over time.</p>
      </div>

      {error && <div className="settings-alert error">{error}</div>}

      {usage && (
        <>
          <div className="settings-grid-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div className="settings-card" style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '8px' }}>
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Total Tokens Used (7 Days)
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', lineHeight: 1 }}>{totalTokens.toLocaleString()}</div>
              <div style={{ fontSize: '12px', color: tokensChange >= 0 ? '#059669' : '#dc2626', marginTop: '6px' }}>
                {tokensChange >= 0 ? `+${tokensChange}%` : `${tokensChange}%`} from last week
              </div>
            </div>
            <div className="settings-card" style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '8px' }}>
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Total Queries (7 Days)
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', lineHeight: 1 }}>{totalQueries.toLocaleString()}</div>
              <div style={{ fontSize: '12px', color: queriesChange >= 0 ? '#059669' : '#dc2626', marginTop: '6px' }}>
                {queriesChange >= 0 ? `+${queriesChange}%` : `${queriesChange}%`} from last week
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h2>Token Consumption</h2>
            <div style={{ height: '280px', width: '100%', marginTop: '8px' }}>
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false}
                      tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px' }}
                      itemStyle={{ color: 'var(--accent)' }}
                    />
                    <Area type="monotone" dataKey="tokens" stroke="var(--accent)" strokeWidth={2.5}
                      fillOpacity={1} fill="url(#colorTokens)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
