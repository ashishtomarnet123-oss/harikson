'use client';
import React, { useState, useEffect } from 'react';
import { Card, Badge } from '@tremor/react';
import {
  Monitor,
  Globe,
  Clock,
  XCircle,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';

interface Session {
  id: string;
  user_id: string;
  user_email: string;
  tenant_id: string;
  tenant_name: string;
  device_name: string | null;
  ip_address: string | null;
  user_agent: string | null;
  expires_at: string;
  revoked_at: string | null;
  last_active_at: string | null;
  created_at: string;
}

function getSessionStatus(s: Session): 'active' | 'revoked' | 'expired' {
  if (s.revoked_at) return 'revoked';
  if (new Date(s.expires_at) <= new Date()) return 'expired';
  return 'active';
}

function statusBadge(status: string) {
  switch (status) {
    case 'active':
      return <Badge color="green">Active</Badge>;
    case 'revoked':
      return <Badge color="red">Revoked</Badge>;
    case 'expired':
      return <Badge color="gray">Expired</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

function parseUA(ua: string | null): string {
  if (!ua) return 'Unknown';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  return ua.substring(0, 40);
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [total, setTotal] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'revoked' | 'expired'>('all');
  const [search, setSearch] = useState('');
  const [revoking, setRevoking] = useState<string | null>(null);
  const apiBase = '/api-proxy';

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('status', filter);
      const res = await fetch(`${apiBase}/v1/admin/sessions?${params}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setSessions(data.sessions || []);
      setTotal(data.total || 0);
      setActiveCount(data.active || 0);
    } catch (e) {
      console.error('Failed to fetch sessions:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [filter]);

  const handleRevoke = async (id: string) => {
    setRevoking(id);
    try {
      const res = await fetch(`${apiBase}/v1/admin/sessions/${id}/revoke`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === id ? { ...s, revoked_at: new Date().toISOString() } : s
          )
        );
        setActiveCount((c) => Math.max(0, c - 1));
      }
    } catch (e) {
      console.error('Failed to revoke session:', e);
    } finally {
      setRevoking(null);
    }
  };

  const handleRevokeAll = async () => {
    if (!confirm('Revoke ALL active sessions? Users will need to log in again.')) return;
    try {
      const res = await fetch(`${apiBase}/v1/admin/sessions/revoke-all`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        await fetchSessions();
      }
    } catch (e) {
      console.error('Failed to revoke all sessions:', e);
    }
  };

  const filtered = sessions.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.user_email?.toLowerCase().includes(q) ||
      s.tenant_name?.toLowerCase().includes(q) ||
      s.ip_address?.includes(q) ||
      s.device_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Session Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor and manage active user sessions across all tenants
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchSessions}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          {activeCount > 0 && (
            <button
              onClick={handleRevokeAll}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <XCircle className="w-4 h-4" />
              Revoke All
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card decoration="top" decorationColor="blue">
          <p className="text-sm text-gray-500">Total Sessions</p>
          <p className="text-3xl font-bold mt-1">{total}</p>
        </Card>
        <Card decoration="top" decorationColor="green">
          <p className="text-sm text-gray-500">Active Sessions</p>
          <p className="text-3xl font-bold mt-1 text-green-600">{activeCount}</p>
        </Card>
        <Card decoration="top" decorationColor="gray">
          <p className="text-sm text-gray-500">Expired / Revoked</p>
          <p className="text-3xl font-bold mt-1 text-gray-400">
            {total - activeCount}
          </p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by email, tenant, IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
        <div className="flex items-center gap-1">
          <Filter className="w-4 h-4 text-gray-400 mr-1" />
          {(['all', 'active', 'revoked', 'expired'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize ${
                filter === f
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading sessions...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {search ? 'No sessions match your search' : 'No sessions found'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-3 font-medium text-gray-500">User</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500">Tenant</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500">Device</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500">IP</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500">Last Active</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500">Status</th>
                  <th className="text-right py-3 px-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const status = getSessionStatus(s);
                  return (
                    <tr
                      key={s.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="py-3 px-3">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {s.user_email || 'Unknown'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-600 dark:text-gray-400">
                        {s.tenant_name || '-'}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                          <Monitor className="w-3.5 h-3.5" />
                          {s.device_name || parseUA(s.user_agent)}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                          <Globe className="w-3.5 h-3.5" />
                          {s.ip_address || '-'}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                          <Clock className="w-3.5 h-3.5" />
                          {timeAgo(s.last_active_at)}
                        </div>
                      </td>
                      <td className="py-3 px-3">{statusBadge(status)}</td>
                      <td className="py-3 px-3 text-right">
                        {status === 'active' && (
                          <button
                            onClick={() => handleRevoke(s.id)}
                            disabled={revoking === s.id}
                            className="px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 rounded-md disabled:opacity-50"
                          >
                            {revoking === s.id ? 'Revoking...' : 'Revoke'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
