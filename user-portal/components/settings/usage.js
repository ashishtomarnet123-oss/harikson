import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Cpu,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Calendar,
  Zap,
  BarChart3,
  Clock,
} from 'lucide-react';

export default function UsageSettings() {
  const [mounted, setMounted] = useState(false);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState(7); // 7, 30, 90 days
  const [chartType, setChartType] = useState('tokens'); // 'tokens', 'queries', 'both'

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchUsage = async (days) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('hk_user') ? 'cookie_auth' : null;
      if (!token) return;
      const apiBase =
        localStorage.getItem('hk_api_base') ||
        process.env.NEXT_PUBLIC_API_URL ||
        'http://localhost:3008';
      const tenantSlug = localStorage.getItem('hk_tenant') || 'neuravolt';
      const res = await fetch(`${apiBase}/api/user/usage?days=${days}`, {
        credentials: 'include',
        headers: {
          'x-tenant-slug': tenantSlug,
        },
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

  useEffect(() => {
    fetchUsage(timeRange);
  }, [timeRange]);

  const formatChange = (pct) => {
    if (pct === null || pct === undefined) return null;
    const abs = Math.abs(pct);
    const isPositive = pct >= 0;
    return (
      <span
        className={`usage-change-badge ${isPositive ? 'positive' : 'negative'}`}
      >
        {isPositive ? (
          <TrendingUp size={12} style={{ marginRight: '4px' }} />
        ) : (
          <TrendingDown size={12} style={{ marginRight: '4px' }} />
        )}
        <span>{abs}% from last period</span>
      </span>
    );
  };

  const formatNumber = (n) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
    return String(n);
  };

  if (loading && !usage)
    return <div className="settings-loading">Loading usage analytics...</div>;

  const daily = usage?.daily || [];
  const peakTokens =
    daily.length > 0 ? Math.max(...daily.map((d) => d.tokens)) : 0;
  const peakQueries =
    daily.length > 0 ? Math.max(...daily.map((d) => d.queries)) : 0;
  const peakTokensDay =
    daily.find((d) => d.tokens === peakTokens)?.day || 'N/A';
  const peakQueriesDay =
    daily.find((d) => d.queries === peakQueries)?.day || 'N/A';
  const avgTokens =
    daily.length > 0 ? Math.round(usage.totalTokens / daily.length) : 0;
  const avgQueries =
    daily.length > 0 ? (usage.totalQueries / daily.length).toFixed(1) : 0;
  const tokensPerQuery =
    usage?.totalQueries > 0
      ? Math.round(usage.totalTokens / usage.totalQueries)
      : 0;

  return (
    <>
      <style>{`
        .usage-page {
          display: flex;
          flex-direction: column;
          gap: 20px;
          animation: usage-fade-in 0.3s ease-out;
        }
        @keyframes usage-fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .usage-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 8px;
        }

        .usage-title-area h1 {
          font-size: 20px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 4px;
        }
        .usage-title-area p {
          font-size: 13px;
          color: var(--text-secondary);
        }

        /* Pill Selector for TimeRange */
        .pill-selector {
          display: flex;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          padding: 3px;
          border-radius: 20px;
          gap: 2px;
        }
        .pill-button {
          background: none;
          border: none;
          padding: 6px 14px;
          font-size: 12.5px;
          font-weight: 500;
          color: var(--text-secondary);
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .pill-button:hover {
          color: var(--text-primary);
        }
        .pill-button.active {
          background: var(--bg-primary);
          color: var(--accent);
          box-shadow: 0 2px 6px rgba(0,0,0,0.06);
        }

        /* Metrics grid */
        .metrics-dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
        }

        .metric-card-premium {
          background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 20px;
          position: relative;
          overflow: hidden;
          transition: all 0.25s ease;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 125px;
          box-shadow: var(--shadow-sm);
        }
        .metric-card-premium::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: transparent;
          transition: background 0.2s ease;
        }
        .metric-card-premium.tokens::before {
          background: linear-gradient(90deg, #4f8cff, #a855f7);
        }
        .metric-card-premium.queries::before {
          background: linear-gradient(90deg, #10b981, #3b82f6);
        }
        .metric-card-premium:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          border-color: var(--border-hover);
        }

        .metric-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .metric-card-title {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
        }
        .metric-icon-bg {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-hover);
          color: var(--text-secondary);
        }
        .metric-card-premium.tokens:hover .metric-icon-bg {
          background: rgba(79, 140, 255, 0.1);
          color: var(--accent);
        }
        .metric-card-premium.queries:hover .metric-icon-bg {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }

        .metric-card-value {
          font-size: 32px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.5px;
          margin: 6px 0 2px;
          line-height: 1;
        }

        .usage-change-badge {
          display: inline-flex;
          align-items: center;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .usage-change-badge.positive {
          background: rgba(16, 185, 129, 0.1);
          color: #059669;
        }
        .usage-change-badge.negative {
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
        }

        /* Chart container styling */
        .chart-section-premium {
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 24px;
          box-shadow: var(--shadow-sm);
        }
        .chart-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 20px;
        }
        .chart-header-row h2 {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .chart-type-tabs {
          display: flex;
          background: var(--bg-secondary);
          padding: 2px;
          border-radius: 8px;
          border: 1px solid var(--border);
        }
        .chart-tab {
          background: none;
          border: none;
          padding: 5px 12px;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .chart-tab.active {
          background: var(--bg-primary);
          color: var(--text-primary);
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }

        /* Highlights Row */
        .highlights-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
          margin-top: 16px;
          border-top: 1px solid var(--border);
          padding-top: 16px;
        }
        .highlight-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          background: var(--bg-secondary);
          border-radius: 8px;
          border: 1px solid var(--border);
        }
        .highlight-label {
          font-size: 11px;
          color: var(--text-secondary);
        }
        .highlight-value {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--text-primary);
        }
      `}</style>

      <div className="usage-page">
        <div className="usage-header-row">
          <div className="usage-title-area">
            <h1>Usage &amp; Analytics</h1>
            <p>
              Monitor your token consumption and active query volume over time.
            </p>
          </div>

          <div className="pill-selector">
            <button
              className={`pill-button ${timeRange === 7 ? 'active' : ''}`}
              onClick={() => setTimeRange(7)}
            >
              7 Days
            </button>
            <button
              className={`pill-button ${timeRange === 30 ? 'active' : ''}`}
              onClick={() => setTimeRange(30)}
            >
              30 Days
            </button>
            <button
              className={`pill-button ${timeRange === 90 ? 'active' : ''}`}
              onClick={() => setTimeRange(90)}
            >
              90 Days
            </button>
          </div>
        </div>

        {error && <div className="settings-alert error">{error}</div>}

        {loading && (
          <div
            style={{
              padding: '60px',
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}
          >
            Refreshing analytics data...
          </div>
        )}

        {usage && !loading && (
          <>
            <div className="metrics-dashboard-grid">
              <div className="metric-card-premium tokens">
                <div className="metric-card-header">
                  <span className="metric-card-title">Total Tokens Used</span>
                  <div className="metric-icon-bg">
                    <Cpu size={16} />
                  </div>
                </div>
                <div>
                  <div className="metric-card-value">
                    {formatNumber(usage.totalTokens)}
                  </div>
                  <div style={{ marginTop: '4px' }}>
                    {usage.tokenChange !== null ? (
                      formatChange(usage.tokenChange)
                    ) : (
                      <span
                        style={{ fontSize: '11px', color: 'var(--text-muted)' }}
                      >
                        No comparison data available
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="metric-card-premium queries">
                <div className="metric-card-header">
                  <span className="metric-card-title">Total Queries</span>
                  <div className="metric-icon-bg">
                    <MessageSquare size={16} />
                  </div>
                </div>
                <div>
                  <div className="metric-card-value">{usage.totalQueries}</div>
                  <div style={{ marginTop: '4px' }}>
                    {usage.queryChange !== null ? (
                      formatChange(usage.queryChange)
                    ) : (
                      <span
                        style={{ fontSize: '11px', color: 'var(--text-muted)' }}
                      >
                        No comparison data available
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="chart-section-premium">
              <div className="chart-header-row">
                <h2>
                  <BarChart3 size={16} style={{ color: 'var(--accent)' }} />
                  <span>Consumption Timeline</span>
                </h2>

                <div className="chart-type-tabs">
                  <button
                    className={`chart-tab ${chartType === 'tokens' ? 'active' : ''}`}
                    onClick={() => setChartType('tokens')}
                  >
                    Tokens
                  </button>
                  <button
                    className={`chart-tab ${chartType === 'queries' ? 'active' : ''}`}
                    onClick={() => setChartType('queries')}
                  >
                    Queries
                  </button>
                  <button
                    className={`chart-tab ${chartType === 'both' ? 'active' : ''}`}
                    onClick={() => setChartType('both')}
                  >
                    Dual view
                  </button>
                </div>
              </div>

              {daily.length === 0 ? (
                <div
                  style={{
                    height: '240px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '13px',
                  }}
                >
                  No usage data yet. Start a conversation to generate metrics.
                </div>
              ) : (
                <div style={{ height: '260px', width: '100%' }}>
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={daily}
                        margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="colorTokensRedesign"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#4f8cff"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor="#4f8cff"
                              stopOpacity={0}
                            />
                          </linearGradient>
                          <linearGradient
                            id="colorQueriesRedesign"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#10b981"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor="#10b981"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="day"
                          stroke="var(--text-muted)"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />

                        {chartType === 'tokens' && (
                          <YAxis
                            stroke="var(--text-muted)"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) =>
                              v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
                            }
                          />
                        )}
                        {chartType === 'queries' && (
                          <YAxis
                            stroke="var(--text-muted)"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                          />
                        )}
                        {chartType === 'both' && (
                          <>
                            <YAxis
                              yAxisId="left"
                              stroke="var(--text-muted)"
                              fontSize={11}
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(v) =>
                                v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
                              }
                            />
                            <YAxis
                              yAxisId="right"
                              orientation="right"
                              stroke="var(--text-muted)"
                              fontSize={11}
                              tickLine={false}
                              axisLine={false}
                            />
                          </>
                        )}

                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="var(--border)"
                        />

                        <Tooltip
                          contentStyle={{
                            background:
                              'var(--bg-glass, rgba(255,255,255,0.95))',
                            border: '1px solid var(--border)',
                            borderRadius: '10px',
                            color: 'var(--text-primary)',
                            fontSize: '12.5px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                            backdropFilter: 'blur(4px)',
                          }}
                          itemStyle={{ padding: '2px 0' }}
                        />

                        {chartType !== 'queries' && (
                          <Area
                            yAxisId={chartType === 'both' ? 'left' : undefined}
                            type="monotone"
                            name="Tokens"
                            dataKey="tokens"
                            stroke="#4f8cff"
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill="url(#colorTokensRedesign)"
                          />
                        )}
                        {chartType !== 'tokens' && (
                          <Area
                            yAxisId={chartType === 'both' ? 'right' : undefined}
                            type="monotone"
                            name="Queries"
                            dataKey="queries"
                            stroke="#10b981"
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill="url(#colorQueriesRedesign)"
                          />
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              )}

              {daily.length > 0 && (
                <div className="highlights-row">
                  <div className="highlight-item">
                    <div style={{ color: 'var(--accent)', display: 'flex' }}>
                      <Clock size={16} />
                    </div>
                    <div>
                      <div className="highlight-label">Daily Avg (Tokens)</div>
                      <div className="highlight-value">
                        {formatNumber(avgTokens)}
                      </div>
                    </div>
                  </div>

                  <div className="highlight-item">
                    <div style={{ color: '#10b981', display: 'flex' }}>
                      <Zap size={16} />
                    </div>
                    <div>
                      <div className="highlight-label">Peak Activity Day</div>
                      <div className="highlight-value">
                        {chartType === 'queries'
                          ? `${peakQueriesDay} (${peakQueries} q)`
                          : `${peakTokensDay} (${formatNumber(peakTokens)} t)`}
                      </div>
                    </div>
                  </div>

                  <div className="highlight-item">
                    <div style={{ color: '#a855f7', display: 'flex' }}>
                      <Calendar size={16} />
                    </div>
                    <div>
                      <div className="highlight-label">Avg Tokens / Query</div>
                      <div className="highlight-value">
                        {formatNumber(tokensPerQuery)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
