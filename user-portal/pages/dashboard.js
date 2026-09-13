import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { withAuth } from '../components/withAuth';
import DashboardShell from '../components/layout/DashboardShell';
import { authenticatedFetch, getApiConfig } from '../components/settings/apiHelper';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Cpu, MessageSquare, Zap, FileText, ArrowRight, Activity, AlertCircle } from 'lucide-react';

function DashboardPage() {
  const [stats, setStats] = useState({ totalTokens: 0, totalQueries: 0, daily: [] });
  const [activity, setActivity] = useState([]);
  const [agentCount, setAgentCount] = useState(0);
  const [docCount, setDocCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
      try {
        const { apiBase, tenantSlug } = getApiConfig();
        const headers = { 'x-tenant-slug': tenantSlug };
        const opts = { credentials: 'include', headers };

        const [usageRes, activityRes, agentsRes, docsRes] = await Promise.allSettled([
          authenticatedFetch(`${apiBase}/api/v1/user/usage?days=7`, opts),
          authenticatedFetch(`${apiBase}/api/v1/user/activity`, opts),
          authenticatedFetch(`${apiBase}/api/agents`, opts),
          authenticatedFetch(`${apiBase}/api/documents`, opts),
        ]);

        if (usageRes.status === 'fulfilled' && usageRes.value?.ok) {
          const data = await usageRes.value.json();
          setStats({
            totalTokens: data.totalTokens || 0,
            totalQueries: data.totalQueries || 0,
            daily: data.daily || [],
          });
        }

        if (activityRes.status === 'fulfilled' && activityRes.value?.ok) {
          const data = await activityRes.value.json();
          setActivity(Array.isArray(data) ? data.slice(0, 5) : []);
        }

        if (agentsRes.status === 'fulfilled' && agentsRes.value?.ok) {
          const data = await agentsRes.value.json();
          setAgentCount(data.agents?.length || 0);
        }

        if (docsRes.status === 'fulfilled' && docsRes.value?.ok) {
          const data = await docsRes.value.json();
          setDocCount(data.documents?.length || 0);
        }
      } catch (err) {
        console.error('Dashboard load error:', err);
        setError('Unable to load dashboard data. Check your connection and try again.');
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatNumber = (n) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
  };

  const statCards = [
    { label: 'Total Tokens', value: formatNumber(stats.totalTokens), icon: Zap, color: '#818cf8' },
    { label: 'API Requests', value: formatNumber(stats.totalQueries), icon: Activity, color: '#34d399' },
    { label: 'Active Agents', value: String(agentCount), icon: Cpu, color: '#f472b6' },
    { label: 'Documents', value: String(docCount), icon: FileText, color: '#fbbf24' },
  ];

  const quickActions = [
    { label: 'New Conversation', href: '/chat', icon: MessageSquare },
    { label: 'Manage Agents', href: '/agents', icon: Cpu },
    { label: 'Knowledge Base', href: '/documents', icon: FileText },
  ];

  return (
    <DashboardShell title="Dashboard">
      <Head><title>Dashboard — Xarwiz</title></Head>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <AlertCircle size={24} color="#f87171" />
          </div>
          <p style={{ color: '#f87171', fontSize: '14px', marginBottom: '12px' }}>{error}</p>
          <button onClick={loadData} style={{
            padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
            backgroundColor: 'rgba(99,102,241,0.15)', color: '#818cf8',
            border: '1px solid rgba(99,102,241,0.3)', cursor: 'pointer',
          }}>
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} style={{
                  padding: '20px', borderRadius: '12px',
                  backgroundColor: 'var(--shell-surface)',
                  border: '1px solid var(--shell-card-border)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--shell-text-secondary)', fontWeight: 500 }}>{card.label}</span>
                    <Icon size={18} color={card.color} />
                  </div>
                  <p style={{ fontSize: '28px', fontWeight: 700, color: 'var(--shell-text)', margin: 0 }}>{card.value}</p>
                </div>
              );
            })}
          </div>

          {/* Chart + Activity Row */}
          <div className="ds-grid-2col" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '28px' }}>
            {/* Usage Chart */}
            <div style={{
              padding: '20px', borderRadius: '12px',
              backgroundColor: 'var(--shell-surface)',
              border: '1px solid var(--shell-card-border)',
            }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--shell-text)', margin: '0 0 16px' }}>Token Usage (7 Days)</h3>
              {stats.daily.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={stats.daily}>
                    <defs>
                      <linearGradient id="tokenGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#818cf8" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" tick={{ fill: 'var(--shell-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--shell-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--shell-dropdown-bg)', border: '1px solid var(--shell-card-border)', borderRadius: '8px', color: 'var(--shell-text)', fontSize: '12px' }}
                      labelStyle={{ color: 'var(--shell-text-secondary)' }}
                    />
                    <Area type="monotone" dataKey="tokens" stroke="#818cf8" fill="url(#tokenGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p style={{ color: 'var(--shell-text-muted)', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>No usage data yet</p>
              )}
            </div>

            {/* Recent Activity */}
            <div style={{
              padding: '20px', borderRadius: '12px',
              backgroundColor: 'var(--shell-surface)',
              border: '1px solid var(--shell-card-border)',
            }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--shell-text)', margin: '0 0 16px' }}>Recent Activity</h3>
              {activity.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {activity.map((item) => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color || '#818cf8', flexShrink: 0 }} />
                      <div style={{ overflow: 'hidden' }}>
                        <p style={{ fontSize: '13px', color: 'var(--shell-text-bright)', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {item.action}
                        </p>
                        <p style={{ fontSize: '11px', color: 'var(--shell-text-muted)', margin: '1px 0 0' }}>{item.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--shell-text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>No recent activity</p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{
            padding: '20px', borderRadius: '12px',
            backgroundColor: 'var(--shell-surface)',
            border: '1px solid var(--shell-card-border)',
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--shell-text)', margin: '0 0 16px' }}>Quick Actions</h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link key={action.href} href={action.href} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 18px', borderRadius: '8px',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    color: '#818cf8', textDecoration: 'none',
                    fontSize: '13px', fontWeight: 500, transition: 'all 0.15s ease',
                  }}>
                    <Icon size={16} />
                    {action.label}
                    <ArrowRight size={14} />
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </DashboardShell>
  );
}

export default withAuth(DashboardPage);
