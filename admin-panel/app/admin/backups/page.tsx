'use client';
import React, { useState, useEffect } from 'react';
import { Card, Badge } from '@tremor/react';
import {
  HardDrive,
  Plus,
  Check,
  AlertTriangle,
  RefreshCw,
  Shield,
  Database,
  Calendar,
} from 'lucide-react';
import { getCookie } from 'cookies-next';

interface Backup {
  id: string;
  name: string;
  type: string;
  size_bytes: number;
  status: string;
  started_at: string;
  completed_at: string;
  verified_at: string;
  retention_days: number;
  error_message: string;
}
interface BackupStats {
  completed: string;
  failed: string;
  total_bytes: string;
}

const STATUS_CONFIG: Record<
  string,
  { color: string; bg: string; text: string }
> = {
  pending: {
    color: 'yellow',
    bg: 'bg-yellow-500/10 border-yellow-500/30',
    text: 'text-yellow-400',
  },
  running: {
    color: 'blue',
    bg: 'bg-blue-500/10 border-blue-500/30',
    text: 'text-blue-400',
  },
  completed: {
    color: 'emerald',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    text: 'text-emerald-400',
  },
  failed: {
    color: 'red',
    bg: 'bg-red-500/10 border-red-500/30',
    text: 'text-red-400',
  },
  verified: {
    color: 'indigo',
    bg: 'bg-indigo-500/10 border-indigo-500/30',
    text: 'text-indigo-400',
  },
};

function fmtBytes(b: number) {
  if (!b) return '—';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${(b / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
function fmtTime(d: string) {
  return d
    ? new Date(d).toLocaleString('en-IN', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : '—';
}

export default function BackupsPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  const apiBase = '/api-proxy';

  const token = () =>
    getCookie('admin_token') || localStorage.getItem('admin_token');

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/v1/admin/backups`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) {
        const data = await res.json();
        // Backend returns { backups: [...], stats: {...} }
        setBackups(data.backups || []);
        setStats(data.stats || null);
      }
    } finally {
      setLoading(false);
    }
  };

  // Poll running backups every 5s
  useEffect(() => {
    if (!apiBase) return;
    fetchBackups();
    const interval = setInterval(() => {
      if (backups.some((b) => b.status === 'running')) fetchBackups();
    }, 5000);
    return () => clearInterval(interval);
  }, [apiBase, backups.length]);

  const triggerBackup = async (type: string = 'full') => {
    setTriggering(true);
    const name = `${type}_${new Date().toISOString().slice(0, 10)}_${Date.now().toString().slice(-4)}`;
    try {
      await fetch(`${apiBase}/v1/admin/backups`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          type,
          retention_days: type === 'full' ? 30 : 7,
        }),
      });
      setTimeout(fetchBackups, 1000);
      setTimeout(fetchBackups, 5000);
    } finally {
      setTriggering(false);
    }
  };

  const verifyBackup = async (id: string) => {
    setVerifying(id);
    try {
      await fetch(`${apiBase}/v1/admin/backups/${id}/verify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
      });
      fetchBackups();
    } finally {
      setVerifying(null);
    }
  };

  const completedCount = parseInt(stats?.completed || '0');
  const totalBytes = parseInt(stats?.total_bytes || '0');
  const failedCount = parseInt(stats?.failed || '0');
  const runningCount = backups.filter((b) => b.status === 'running').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <HardDrive className="w-6 h-6 text-amber-500" /> Backup & Disaster
            Recovery
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            Manage full and incremental database backups with retention
            policies.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchBackups}
            className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="relative">
            <button
              onClick={() => triggerBackup('incremental')}
              disabled={triggering}
              className="px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 text-sm font-semibold rounded-l-xl transition-colors flex items-center gap-1.5"
            >
              <Database className="w-3.5 h-3.5 text-blue-400" /> Incremental
            </button>
          </div>
          <button
            onClick={() => triggerBackup('full')}
            disabled={triggering}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-xl transition-colors"
          >
            {triggering ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Full Backup
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900/60 border-gray-800 p-4 text-center">
          <div className="text-3xl font-black text-amber-400">
            {backups.length}
          </div>
          <div className="text-xs text-gray-500 mt-1">Total Backups</div>
        </Card>
        <Card className="bg-gray-900/60 border-emerald-900/30 p-4 text-center">
          <div className="text-3xl font-black text-emerald-400">
            {completedCount}
          </div>
          <div className="text-xs text-gray-500 mt-1">Successful</div>
        </Card>
        <Card className="bg-gray-900/60 border-blue-900/30 p-4 text-center">
          <div className="text-3xl font-black text-blue-400">
            {fmtBytes(totalBytes)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Total Storage</div>
        </Card>
        <Card
          className={`border p-4 text-center ${failedCount > 0 ? 'bg-red-950/20 border-red-900/30' : 'bg-gray-900/60 border-gray-800'}`}
        >
          <div
            className={`text-3xl font-black ${failedCount > 0 ? 'text-red-400' : 'text-gray-600'}`}
          >
            {failedCount}
          </div>
          <div className="text-xs text-gray-500 mt-1">Failed</div>
        </Card>
      </div>

      {/* Running indicator */}
      {runningCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-950/30 border border-blue-800/40 rounded-xl text-blue-300 text-sm font-medium">
          <RefreshCw className="w-4 h-4 animate-spin" />
          {runningCount} backup{runningCount > 1 ? 's' : ''} currently running —
          auto-refreshing...
        </div>
      )}

      {/* Backup Table */}
      <Card className="bg-gray-900/40 border-gray-800 p-0 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-800 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-300">
            Backup History
          </span>
          {backups.length > 0 && (
            <span className="text-xs text-gray-500">
              {backups.length} records
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/50">
                {[
                  'Name',
                  'Type',
                  'Size',
                  'Status',
                  'Started',
                  'Completed',
                  'Retention',
                  'Actions',
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-gray-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading backups...
                  </td>
                </tr>
              )}
              {!loading && backups.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <HardDrive className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                    <div className="text-gray-400 font-medium mb-1">
                      No backups yet
                    </div>
                    <div className="text-gray-600 text-xs">
                      Click "Full Backup" above to create your first backup.
                    </div>
                  </td>
                </tr>
              )}
              {backups.map((b) => {
                const sc = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
                return (
                  <tr
                    key={b.id}
                    className="border-b border-gray-800/40 hover:bg-gray-800/20 transition-colors"
                  >
                    <td
                      className="px-4 py-3 font-mono text-xs text-gray-300 max-w-[180px] truncate"
                      title={b.name}
                    >
                      {b.name}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-md ${b.type === 'full' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}
                      >
                        {b.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                      {fmtBytes(b.size_bytes)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${sc.bg} ${sc.text}`}
                      >
                        {b.status === 'running' && (
                          <RefreshCw className="w-3 h-3 inline mr-1 animate-spin" />
                        )}
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {fmtTime(b.started_at)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {fmtTime(b.completed_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-gray-400 text-xs">
                        <Calendar className="w-3 h-3" />
                        {b.retention_days}d
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {b.status === 'completed' && (
                          <button
                            onClick={() => verifyBackup(b.id)}
                            disabled={verifying === b.id}
                            className="text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors flex items-center gap-1"
                          >
                            {verifying === b.id ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Shield className="w-3 h-3" />
                            )}
                            Verify
                          </button>
                        )}
                        {b.status === 'verified' && (
                          <div className="flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                            <Check className="w-3.5 h-3.5" /> Verified
                          </div>
                        )}
                        {b.error_message && (
                          <span title={b.error_message} className="cursor-help">
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
