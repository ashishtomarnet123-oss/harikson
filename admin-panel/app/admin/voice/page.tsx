'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Badge } from '@tremor/react';
import {
  Mic,
  Activity,
  Clock,
  AlertTriangle,
  Zap,
  Globe,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  BarChart3,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { getCookie } from 'cookies-next';

interface VoiceOverview {
  total_sessions: string | number;
  total_turns: string | number;
  avg_ttfa_ms: number | null;
  interrupt_rate_pct: number;
  stt_error_rate_pct: number;
  total_stt_chars: string | number;
  total_tts_chars: string | number;
  total_llm_tokens: string | number;
}

interface TenantVoiceStat {
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  sessions_count: string | number;
  turns_count: string | number;
  avg_ttfa_ms: number | null;
  interrupt_rate_pct: number;
}

interface BrowserVoiceStat {
  browser: string;
  turns_count: string | number;
  avg_ttfa_ms: number | null;
  stt_errors_count: string | number;
  stt_error_rate_pct: number;
  interrupt_count: string | number;
  interrupt_rate_pct: number;
}

interface VoiceSessionItem {
  id: string;
  tenant_id: string;
  tenant_name: string | null;
  tenant_slug: string | null;
  user_id: string;
  user_email: string | null;
  conversation_id: string | null;
  language: string;
  started_at: string;
  ended_at: string | null;
  turn_count: number;
  ended_reason: string;
  avg_ttfa_ms: number | null;
}

export default function VoiceTelemetryPage() {
  const [overview, setOverview] = useState<VoiceOverview | null>(null);
  const [tenants, setTenants] = useState<TenantVoiceStat[]>([]);
  const [browsers, setBrowsers] = useState<BrowserVoiceStat[]>([]);
  const [sessions, setSessions] = useState<VoiceSessionItem[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const apiBase = '/api-proxy';

  const fetchData = useCallback(async () => {
    try {
      const token = getCookie('admin_token') || localStorage.getItem('admin_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const [statsRes, sessionsRes] = await Promise.all([
        fetch(`${apiBase}/admin/voice/stats`, { credentials: 'include', headers }),
        fetch(`${apiBase}/admin/voice/sessions?limit=25`, { credentials: 'include', headers }),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setOverview(statsData.overview || null);
        setTenants(statsData.by_tenant || []);
        setBrowsers(statsData.by_browser || []);
      }

      if (sessionsRes.ok) {
        const sessData = await sessionsRes.json();
        setSessions(sessData.sessions || []);
        setTotalSessions(sessData.total || 0);
      }
    } catch (err) {
      console.error('[Voice Admin] Failed to fetch telemetry:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh interval (15s)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchData();
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const filteredSessions = sessions.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (s.id || '').toLowerCase().includes(q) ||
      ((s.tenant_slug || '').toLowerCase().includes(q)) ||
      ((s.user_email || '').toLowerCase().includes(q)) ||
      ((s.language || '').toLowerCase().includes(q))
    );
  });

  const getTtfaBadge = (ms: number | null) => {
    if (ms === null || ms === undefined) return <Badge color="gray">N/A</Badge>;
    if (ms < 3000) {
      return <Badge color="green">{ms} ms (Target)</Badge>;
    }
    if (ms < 5000) {
      return <Badge color="yellow">{ms} ms (Fair)</Badge>;
    }
    return <Badge color="red">{ms} ms (Slow)</Badge>;
  };

  const getStatusBadge = (s: VoiceSessionItem) => {
    if (!s.ended_at) {
      return <Badge color="green">Live / Active</Badge>;
    }
    if (s.ended_reason === 'interrupted') {
      return <Badge color="yellow">Interrupted</Badge>;
    }
    if (s.ended_reason === 'error') {
      return <Badge color="red">Error</Badge>;
    }
    return <Badge color="blue">Completed</Badge>;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Mic className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Voice Telemetry & Observability
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-900/60 border border-purple-700/50 text-purple-300 font-medium">
                  Sub-Second Streaming
                </span>
              </h1>
              <p className="text-sm text-gray-400">
                Live performance tracking: Time to First Audio (TTFA), barge-in interrupts, and cross-browser STT accuracy.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            Auto-refresh (15s)
          </label>
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-300 text-sm font-semibold text-gray-800 shadow-sm transition-all disabled:opacity-50"
            style={{ color: '#0f172a' }}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-purple-600' : 'text-purple-600'}`} style={{ color: refreshing ? '#9333ea' : '#475569' }} />
            <span style={{ color: '#0f172a' }}>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Sessions */}
        <Card className="bg-gray-900/90 border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Voice Sessions</span>
            <Mic className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">
              {overview ? Number(overview.total_sessions).toLocaleString() : '0'}
            </span>
            <span className="text-xs text-gray-500">sessions</span>
          </div>
          <div className="mt-1 text-xs text-gray-400">
            {overview ? Number(overview.total_turns).toLocaleString() : '0'} total voice turns
          </div>
        </Card>

        {/* Avg TTFA (Target < 3000ms) */}
        <Card className="bg-gray-900/90 border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Avg TTFA</span>
            <Clock className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-400">
              {overview?.avg_ttfa_ms !== null && overview?.avg_ttfa_ms !== undefined
                ? `${overview.avg_ttfa_ms} ms`
                : '—'}
            </span>
          </div>
          <div className="mt-1 text-xs flex items-center gap-1 text-emerald-500/90 font-medium">
            <CheckCircle className="h-3.5 w-3.5" /> Target &lt; 3,000ms (P95)
          </div>
        </Card>

        {/* Barge-In / Interrupt Rate */}
        <Card className="bg-gray-900/90 border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Barge-In Interrupts</span>
            <Zap className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-400">
              {overview?.interrupt_rate_pct !== undefined ? `${overview.interrupt_rate_pct}%` : '0%'}
            </span>
          </div>
          <div className="mt-1 text-xs text-gray-400">Echo-gated server aborts</div>
        </Card>

        {/* STT Error Rate */}
        <Card className="bg-gray-900/90 border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">STT Error Rate</span>
            <AlertTriangle className="h-4 w-4 text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-400">
              {overview?.stt_error_rate_pct !== undefined ? `${overview.stt_error_rate_pct}%` : '0%'}
            </span>
          </div>
          <div className="mt-1 text-xs text-gray-400">Web Speech API failover</div>
        </Card>

        {/* Total Synthesized Audio Chars */}
        <Card className="bg-gray-900/90 border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">TTS Audio Output</span>
            <Activity className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-cyan-400">
              {overview ? Number(overview.total_tts_chars).toLocaleString() : '0'}
            </span>
            <span className="text-xs text-gray-500">chars</span>
          </div>
          <div className="mt-1 text-xs text-gray-400">
            {overview ? Number(overview.total_stt_chars).toLocaleString() : '0'} STT chars transcribed
          </div>
        </Card>
      </div>

      {/* Grid of Breakdown Cards: Browsers & Tenants */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Browser Performance & Error Rates */}
        <Card className="bg-gray-900/90 border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-indigo-400" />
              <h3 className="text-base font-semibold text-white">Browser STT/TTS Matrix</h3>
            </div>
            <span className="text-xs text-gray-400">Grouped by User-Agent</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-gray-950/60 text-xs uppercase text-gray-400 border-b border-gray-800">
                <tr>
                  <th className="py-2.5 px-3">Browser</th>
                  <th className="py-2.5 px-3 text-right">Turns</th>
                  <th className="py-2.5 px-3 text-right">Avg TTFA</th>
                  <th className="py-2.5 px-3 text-right">STT Errors</th>
                  <th className="py-2.5 px-3 text-right">Barge-Ins</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-mono text-xs">
                {browsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-gray-500 font-sans">
                      No browser metrics collected yet.
                    </td>
                  </tr>
                ) : (
                  browsers.map((b) => (
                    <tr key={b.browser} className="hover:bg-gray-800/30 transition-colors">
                      <td className="py-2.5 px-3 font-sans font-medium text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-400" />
                        {b.browser}
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-300">
                        {Number(b.turns_count).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {b.avg_ttfa_ms ? `${b.avg_ttfa_ms}ms` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-rose-400 font-semibold">
                        {b.stt_error_rate_pct}% ({b.stt_errors_count})
                      </td>
                      <td className="py-2.5 px-3 text-right text-amber-400 font-semibold">
                        {b.interrupt_rate_pct}% ({b.interrupt_count})
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Tenant Usage Breakdown */}
        <Card className="bg-gray-900/90 border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-purple-400" />
              <h3 className="text-base font-semibold text-white">Tenant Voice Adoption</h3>
            </div>
            <span className="text-xs text-gray-400">Top Tenants</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-gray-950/60 text-xs uppercase text-gray-400 border-b border-gray-800">
                <tr>
                  <th className="py-2.5 px-3">Tenant</th>
                  <th className="py-2.5 px-3 text-right">Sessions</th>
                  <th className="py-2.5 px-3 text-right">Turns</th>
                  <th className="py-2.5 px-3 text-right">Avg TTFA</th>
                  <th className="py-2.5 px-3 text-right">Interrupt %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-mono text-xs">
                {tenants.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-gray-500 font-sans">
                      No tenant voice usage recorded yet.
                    </td>
                  </tr>
                ) : (
                  tenants.map((t) => (
                    <tr key={t.tenant_id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="py-2.5 px-3 font-sans font-medium text-white">
                        <div>{t.tenant_name || t.tenant_slug}</div>
                        <div className="text-[10px] text-gray-500 font-mono">@{t.tenant_slug}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right text-purple-300 font-semibold">
                        {Number(t.sessions_count).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-300">
                        {Number(t.turns_count).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {t.avg_ttfa_ms ? `${t.avg_ttfa_ms}ms` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-amber-400">
                        {t.interrupt_rate_pct}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Recent Voice Sessions Data Table */}
      <Card className="bg-gray-900/90 border-gray-800 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-emerald-400" />
            <h3 className="text-base font-semibold text-white">Recent Voice Sessions</h3>
            <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400 font-mono">
              {totalSessions} total
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by tenant, user, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-gray-950 border border-gray-800 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-gray-950/60 text-xs uppercase text-gray-400 border-b border-gray-800">
              <tr>
                <th className="py-2.5 px-3">Session ID</th>
                <th className="py-2.5 px-3">Tenant & User</th>
                <th className="py-2.5 px-3">Language</th>
                <th className="py-2.5 px-3 text-right">Turns</th>
                <th className="py-2.5 px-3 text-right">Avg TTFA</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 font-mono text-xs">
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-gray-500 font-sans">
                    {loading ? 'Loading voice sessions...' : 'No voice sessions found matching your criteria.'}
                  </td>
                </tr>
              ) : (
                filteredSessions.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="py-2.5 px-3 text-gray-400 font-mono" title={s.id}>
                      {(s.id || '').slice(0, 8)}...
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <div className="font-medium text-white">{s.tenant_name || s.tenant_slug || 'Default'}</div>
                      <div className="text-[11px] text-gray-400">{s.user_email || (s.user_id ? s.user_id.slice(0, 8) : '—')}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-gray-800/80 text-gray-300 text-[11px]">
                        {s.language || 'en-US'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-gray-200">
                      {s.turn_count || 0}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {getTtfaBadge(s.avg_ttfa_ms)}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      {getStatusBadge(s)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-gray-400 font-sans text-xs">
                      {s.started_at && !isNaN(new Date(s.started_at).getTime())
                        ? new Date(s.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
