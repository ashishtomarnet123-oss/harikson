'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Card, Badge, Button, Select, SelectItem } from '@tremor/react';
import { Activity, Pause, Play, Filter, Wifi, WifiOff } from 'lucide-react';
import { getCookie } from 'cookies-next';

interface ActivityEntry {
  id: string; model: string; status: string; tenant_name: string;
  tokens_in: number; tokens_out: number; latency_ms: number;
  created_at: string; endpoint: string;
}
interface Stats { processing: string; streaming: string; waiting: string; completed: string; failed: string; avg_latency_ms: number; }

const statusColors: Record<string, string> = {
  processing: 'bg-blue-500 animate-pulse', streaming: 'bg-purple-500 animate-pulse',
  waiting: 'bg-yellow-500', completed: 'bg-emerald-500', failed: 'bg-red-500', cancelled: 'bg-gray-500'
};
const statusBadgeColors: Record<string, string> = {
  processing: 'blue', streaming: 'purple', waiting: 'yellow', completed: 'emerald', failed: 'red', cancelled: 'gray'
};

export default function ActivityCenter() {
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [paused, setPaused] = useState(false);
  const [live, setLive] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const apiBase = '/api-proxy';
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  

  const fetchActivity = async () => {
    const token = getCookie('admin_token') || localStorage.getItem('admin_token');
    try {
      const params = filterStatus ? `?status=${filterStatus}` : '';
      const res = await fetch(`${apiBase}/admin/activity${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setActivity(data.activity || []);
        setStats(data.stats);
        setLive(true);
      }
    } catch { setLive(false); }
  };

  useEffect(() => {
    if (!apiBase) return;
    fetchActivity();
    if (!paused) {
      intervalRef.current = setInterval(fetchActivity, 4000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [apiBase, paused, filterStatus]);

  const fmt = (d: string) => new Date(d).toLocaleTimeString('en-IN', { hour12: false });
  const fmtLatency = (ms: number) => ms ? (ms >= 1000 ? `${(ms/1000).toFixed(1)}s` : `${ms}ms`) : '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-500" /> Live Activity Center
          </h1>
          <p className="text-gray-400 mt-1 text-sm">Real-time stream of all AI inference requests across all tenants.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${live ? 'text-emerald-400' : 'text-red-400'}`}>
            {live ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {live ? 'LIVE' : 'DISCONNECTED'}
          </div>
          <Button size="xs" variant="secondary" icon={paused ? Play : Pause} onClick={() => setPaused(!paused)}>
            {paused ? 'Resume' : 'Pause'}
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Processing', value: stats.processing, color: 'text-blue-400' },
            { label: 'Streaming', value: stats.streaming, color: 'text-purple-400' },
            { label: 'Waiting', value: stats.waiting, color: 'text-yellow-400' },
            { label: 'Completed', value: stats.completed, color: 'text-emerald-400' },
            { label: 'Avg Latency', value: fmtLatency(stats.avg_latency_ms), color: 'text-gray-300' },
          ].map(s => (
            <Card key={s.label} className="bg-gray-900/60 border-gray-800 p-3 text-center">
              <div className={`text-xl font-bold ${s.color}`}>{s.value ?? 0}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </Card>
          ))}
        </div>
      )}

      {/* Filter Bar */}
      <Card className="bg-gray-900/40 border-gray-800 p-4">
        <div className="flex items-center gap-4">
          <Filter className="w-4 h-4 text-gray-500" />
          <Select value={filterStatus} onValueChange={setFilterStatus} className="w-40">
            <SelectItem value="">All Statuses</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="streaming">Streaming</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="waiting">Waiting</SelectItem>
          </Select>
          <span className="text-gray-500 text-xs ml-auto">Auto-refreshes every 4s</span>
        </div>
      </Card>

      {/* Activity Table */}
      <Card className="bg-gray-900/40 border-gray-800 p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/70">
                {['', 'Timestamp', 'Tenant', 'Model', 'Status', 'Tokens In', 'Tokens Out', 'Latency'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activity.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-gray-500">No activity yet. Requests will appear here in real-time.</td></tr>
              )}
              {activity.map(a => (
                <tr key={a.id} className="border-b border-gray-800/40 hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className={`w-2 h-2 rounded-full ${statusColors[a.status] || 'bg-gray-500'}`} />
                  </td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{fmt(a.created_at)}</td>
                  <td className="px-4 py-3 text-gray-200">{a.tenant_name || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge color="blue" size="sm">{a.model || '—'}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={statusBadgeColors[a.status] as any} size="sm">{a.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-400 font-mono">{a.tokens_in || 0}</td>
                  <td className="px-4 py-3 text-gray-400 font-mono">{a.tokens_out || 0}</td>
                  <td className="px-4 py-3 text-gray-300 font-mono">{fmtLatency(a.latency_ms)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
