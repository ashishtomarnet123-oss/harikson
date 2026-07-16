'use client';
import React, { useState, useEffect } from 'react';
import { Card, Badge } from '@tremor/react';
import {
  Shield,
  AlertTriangle,
  Ban,
  Activity,
  Clock,
  LogIn,
  LogOut,
  CheckCircle,
} from 'lucide-react';
import { getCookie } from 'cookies-next';

interface FailedLogin {
  ip_address: string;
  attempts: number;
  last_attempt: string;
}
interface AuditEntry {
  action: string;
  target_type: string;
  ip_address: string;
  created_at: string;
}
interface SecurityData {
  failed_logins_24h: FailedLogin[];
  failed_login_count_24h: number;
  successful_login_count_24h: number;
  rate_limit_hits_24h: number;
  suspicious_ips: { ip_address: string; count: number }[];
  recent_activity: AuditEntry[];
  audit_event_count: number;
}

export default function SecurityPage() {
  const [data, setData] = useState<SecurityData | null>(null);
  const [loading, setLoading] = useState(true);
  const apiBase = '/api-proxy';

  useEffect(() => {
    if (!apiBase) return;
    const token =
      getCookie('admin_token') || localStorage.getItem('admin_token');
    fetch(`${apiBase}/v1/admin/security`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [apiBase]);

  const fmtTime = (d: string) =>
    d
      ? new Date(d).toLocaleString('en-IN', {
          dateStyle: 'short',
          timeStyle: 'short',
        })
      : '—';

  const actionIcon = (action: string) => {
    if (action?.includes('LOGIN_FAILED') || action?.includes('FAILED'))
      return <Ban className="w-3.5 h-3.5 text-red-400" />;
    if (action?.includes('LOGIN'))
      return <LogIn className="w-3.5 h-3.5 text-emerald-400" />;
    if (action?.includes('DELETE'))
      return <Ban className="w-3.5 h-3.5 text-orange-400" />;
    return <Activity className="w-3.5 h-3.5 text-blue-400" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-red-500" /> Security Center
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          Monitor threat patterns, failed logins, and suspicious activity across
          the platform.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900/60 border-red-900/40 p-4 text-center">
          <div className="text-3xl font-black text-red-400">
            {loading ? '—' : (data?.failed_login_count_24h ?? 0)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Failed Logins (24h)</div>
        </Card>
        <Card className="bg-gray-900/60 border-orange-900/40 p-4 text-center">
          <div className="text-3xl font-black text-orange-400">
            {loading ? '—' : (data?.suspicious_ips?.length ?? 0)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Unique Suspicious IPs
          </div>
        </Card>
        <Card className="bg-gray-900/60 border-yellow-900/40 p-4 text-center">
          <div className="text-3xl font-black text-yellow-400">
            {loading ? '—' : (data?.rate_limit_hits_24h ?? 0)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Rate Limit Hits (24h)
          </div>
        </Card>
        <Card className="bg-gray-900/60 border-gray-800 p-4 text-center">
          <div className="text-3xl font-black text-emerald-400">
            {loading ? '—' : (data?.audit_event_count ?? 0)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Audit Events</div>
        </Card>
      </div>

      {/* Login Stats */}
      {data &&
        (data.successful_login_count_24h > 0 ||
          data.failed_login_count_24h > 0) && (
          <Card className="bg-gray-900/40 border-gray-800 p-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-gray-400">
                  Successful logins:
                </span>
                <span className="text-emerald-400 font-bold">
                  {data.successful_login_count_24h}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Ban className="w-4 h-4 text-red-400" />
                <span className="text-sm text-gray-400">Failed attempts:</span>
                <span className="text-red-400 font-bold">
                  {data.failed_login_count_24h}
                </span>
              </div>
            </div>
          </Card>
        )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Suspicious IPs */}
        <Card className="bg-gray-900/40 border-gray-800 p-5">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <Ban className="w-4 h-4 text-red-400" /> Suspicious IPs (24h)
          </h3>
          {loading && (
            <div className="text-gray-500 text-sm text-center py-4">
              Loading...
            </div>
          )}
          <div className="space-y-2">
            {!loading && data?.failed_logins_24h.length === 0 && (
              <div className="flex items-center gap-2 text-emerald-400 text-sm py-4">
                <CheckCircle className="w-4 h-4" />
                No suspicious login activity detected in the last 24 hours
              </div>
            )}
            {data?.failed_logins_24h.map((l) => (
              <div
                key={l.ip_address}
                className="flex items-center gap-3 p-3 bg-gray-950 rounded-lg border border-gray-800"
              >
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-mono text-gray-200">
                    {l.ip_address}
                  </div>
                  <div className="text-xs text-gray-500">
                    Last attempt: {fmtTime(l.last_attempt)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-red-400 font-bold text-sm">
                    {l.attempts}×
                  </div>
                  <div className="text-xs text-gray-600">failed</div>
                </div>
                <button className="bg-red-900/40 hover:bg-red-900 border border-red-800/50 text-red-300 text-xs px-2.5 py-1 rounded-lg transition-colors font-semibold">
                  Block
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Audit Activity */}
        <Card className="bg-gray-900/40 border-gray-800 p-5">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" /> Recent Admin Activity
          </h3>
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {!loading && data?.recent_activity.length === 0 && (
              <div className="text-gray-500 text-sm text-center py-6">
                No audit events found
              </div>
            )}
            {data?.recent_activity.map((a, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-2.5 bg-gray-950 rounded-lg border border-gray-800/50 hover:bg-gray-800/30 transition-colors"
              >
                <div className="mt-0.5">{actionIcon(a.action)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-300 font-mono font-medium">
                    {a.action}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    {a.ip_address && (
                      <span className="mr-2 font-mono">{a.ip_address}</span>
                    )}
                    {fmtTime(a.created_at)}
                  </div>
                </div>
                {a.target_type && (
                  <Badge color="gray" size="sm">
                    {a.target_type}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
