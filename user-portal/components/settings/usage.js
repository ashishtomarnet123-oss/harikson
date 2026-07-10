import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function UsageSettings() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const data = [
    { name: 'Mon', tokens: 120000, queries: 45 },
    { name: 'Tue', tokens: 350000, queries: 120 },
    { name: 'Wed', tokens: 280000, queries: 95 },
    { name: 'Thu', tokens: 520000, queries: 180 },
    { name: 'Fri', tokens: 410000, queries: 150 },
    { name: 'Sat', tokens: 90000, queries: 30 },
    { name: 'Sun', tokens: 110000, queries: 40 },
  ];

  return (
    <>
      <div className="settings-page-header">
        <h1>Usage & Analytics</h1>
        <p>Monitor your token consumption and active query volume over time.</p>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px'}}>
        <div style={{padding: '24px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)'}}>
          <div style={{fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px'}}>Total Tokens Used (7 Days)</div>
          <div style={{fontSize: '32px', fontWeight: 'bold'}}>1,880,000</div>
          <div style={{fontSize: '13px', color: '#10b981', marginTop: '8px'}}>+14% from last week</div>
        </div>
        <div style={{padding: '24px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)'}}>
          <div style={{fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px'}}>Total Queries (7 Days)</div>
          <div style={{fontSize: '32px', fontWeight: 'bold'}}>660</div>
          <div style={{fontSize: '13px', color: '#ef4444', marginTop: '8px'}}>-5% from last week</div>
        </div>
      </div>

      <div className="settings-section">
        <h2>Token Consumption</h2>
        <div style={{height: '350px', width: '100%', marginTop: '24px'}}>
          {mounted && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000}k`} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <Tooltip 
                  contentStyle={{background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)'}}
                  itemStyle={{color: 'var(--accent)'}}
                />
                <Area type="monotone" dataKey="tokens" stroke="var(--accent)" strokeWidth={3} fillOpacity={1} fill="url(#colorTokens)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </>
  );
}
