'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  Pause,
  Play,
  Filter,
  Wifi,
  WifiOff,
  RefreshCw,
} from 'lucide-react';
import { getCookie, deleteCookie } from 'cookies-next';

interface ActivityEntry {
  id: string;
  model: string;
  status: string;
  tenant_name: string;
  tokens_in: number;
  tokens_out: number;
  latency_ms: number;
  created_at: string;
  endpoint: string;
}

interface Stats {
  processing: string;
  streaming: string;
  waiting: string;
  completed: string;
  failed: string;
  avg_latency_ms: number;
}

const statusColors: Record<string, string> = {
  processing: 'bg-blue-500 animate-pulse',
  streaming: 'bg-purple-500 animate-pulse',
  waiting: 'bg-amber-500',
  completed: 'bg-emerald-500',
  failed: 'bg-red-500',
  cancelled: 'bg-gray-500',
};

export default function ActivityCenter() {
  const router = useRouter();
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [paused, setPaused] = useState(false);
  const [live, setLive] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const apiBase = '/api-proxy';
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchActivity = async () => {
    const token =
      getCookie('admin_token') || localStorage.getItem('admin_token');
    try {
      const params = filterStatus ? `?status=${filterStatus}` : '';
      const res = await fetch(`${apiBase}/v1/admin/activity${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        deleteCookie('admin_token');
        localStorage.removeItem('admin_token');
        router.push('/admin/login');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setActivity(data.activity || []);
        setStats(data.stats);
        setLive(true);
      } else {
        setLive(false);
      }
    } catch {
      setLive(false);
    }
  };

  useEffect(() => {
    if (!apiBase) return;
    fetchActivity();
    if (!paused) {
      intervalRef.current = setInterval(fetchActivity, 4000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [apiBase, paused, filterStatus]);

  const fmt = (d: string) => {
    try {
      return new Date(d).toLocaleTimeString('en-IN', { hour12: false });
    } catch {
      return d;
    }
  };

  const fmtLatency = (ms: number) => {
    return ms ? (ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`) : '—';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-gray-100">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
            <Activity className="w-7 h-7 text-blue-600 shrink-0" /> Live
            Activity Center
          </h1>
          <p className="text-gray-500 mt-1.5 text-sm sm:text-base">
            Real-time stream of all AI inference requests across all tenants.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div
            className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${
              live
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}
          >
            {live ? (
              <>
                <Wifi className="w-3.5 h-3.5 animate-pulse" />
                <span>LIVE</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>DISCONNECTED</span>
              </>
            )}
          </div>
          <button
            onClick={() => setPaused(!paused)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm ${
              paused
                ? 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            {paused ? (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Resume Stream</span>
              </>
            ) : (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause Stream</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats Cards Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            {
              label: 'Processing',
              value: stats.processing,
              color: 'text-blue-600',
              bg: 'bg-blue-50/40',
            },
            {
              label: 'Streaming',
              value: stats.streaming,
              color: 'text-purple-600',
              bg: 'bg-purple-50/40',
            },
            {
              label: 'Waiting',
              value: stats.waiting,
              color: 'text-amber-600',
              bg: 'bg-amber-50/40',
            },
            {
              label: 'Completed',
              value: stats.completed,
              color: 'text-emerald-600',
              bg: 'bg-emerald-50/40',
            },
            {
              label: 'Avg Latency',
              value: fmtLatency(stats.avg_latency_ms),
              color: 'text-gray-900',
              bg: 'bg-gray-50/60',
            },
          ].map((s) => (
            <div
              key={s.label}
              className={`border border-gray-100 rounded-2xl p-4 shadow-sm ${s.bg}`}
            >
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {s.label}
              </div>
              <div
                className={`text-2xl sm:text-3xl font-black mt-1 ${s.color}`}
              >
                {s.value ?? 0}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter and Control Bar */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-sm font-medium text-gray-700">
            Filter Status:
          </span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm bg-white text-gray-700 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-44"
          >
            <option value="">All Statuses</option>
            <option value="processing">Processing</option>
            <option value="streaming">Streaming</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="waiting">Waiting</option>
          </select>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 self-end sm:self-auto">
          <RefreshCw
            className="w-3.5 h-3.5 animate-spin"
            style={{ animationDuration: '4s' }}
          />
          <span>Auto-refreshes every 4 seconds</span>
        </div>
      </div>

      {/* Activity Table Card */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/75">
                <th className="w-8 px-4 py-3"></th>
                <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Tenant
                </th>
                <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">
                  Tokens In
                </th>
                <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">
                  Tokens Out
                </th>
                <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">
                  Latency
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activity.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-16 text-gray-400 font-medium"
                  >
                    No activity yet. Incoming AI inference requests will appear
                    here in real-time.
                  </td>
                </tr>
              ) : (
                activity.map((a) => (
                  <tr
                    key={a.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-4 py-4">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${statusColors[a.status] || 'bg-gray-400'}`}
                      />
                    </td>
                    <td className="px-4 py-4 text-gray-600 font-mono text-xs font-semibold">
                      {fmt(a.created_at)}
                    </td>
                    <td className="px-4 py-4 text-gray-900 font-semibold">
                      {a.tenant_name || '—'}
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-100">
                        {a.model || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                          a.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : a.status === 'processing'
                              ? 'bg-blue-50 text-blue-700 border border-blue-100 animate-pulse'
                              : a.status === 'streaming'
                                ? 'bg-purple-50 text-purple-700 border border-purple-100 animate-pulse'
                                : a.status === 'waiting'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                  : a.status === 'failed'
                                    ? 'bg-red-50 text-red-700 border border-red-100'
                                    : 'bg-gray-50 text-gray-700 border border-gray-100'
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right text-gray-600 font-mono font-medium">
                      {a.tokens_in || 0}
                    </td>
                    <td className="px-4 py-4 text-right text-gray-600 font-mono font-medium">
                      {a.tokens_out || 0}
                    </td>
                    <td className="px-4 py-4 text-right text-gray-900 font-mono font-bold">
                      {fmtLatency(a.latency_ms)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
