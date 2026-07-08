'use client';
import React, { useState, useEffect } from 'react';
import { Card, Badge } from '@tremor/react';
import { Shield, AlertTriangle, Ban, Activity, Clock } from 'lucide-react';
import { getCookie } from 'cookies-next';

interface FailedLogin { ip_address: string; attempts: number; last_attempt: string; }
interface AuditEntry { action: string; target_type: string; ip_address: string; created_at: string; }

export default function SecurityPage() {
  const [failedLogins, setFailedLogins] = useState<FailedLogin[]>([]);
  const [rateLimitHits, setRateLimitHits] = useState(0);
  const [recentActivity, setRecentActivity] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiBase, setApiBase] = useState('http://localhost:4008');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const h = window.location.hostname;
      if (h !== 'localhost' && h !== '127.0.0.1') setApiBase(`http://${h}:4008`);
    }
  }, []);

  useEffect(() => {
    if (!apiBase) return;
    const token = getCookie('admin_token') || localStorage.getItem('admin_token');
    fetch(`${apiBase}/admin/security`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => {
        setFailedLogins(data.failed_logins_24h || []);
        setRateLimitHits(data.rate_limit_hits_24h || 0);
        setRecentActivity(data.recent_activity || []);
      }).finally(() => setLoading(false));
  }, [apiBase]);

  const fmtTime = (d: string) => d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—';

  const totalFailedAttempts = failedLogins.reduce((sum, l) => sum + parseInt(l.attempts as any), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Shield className="w-6 h-6 text-red-500" /> Security Center</h1>
        <p className="text-gray-400 mt-1 text-sm">Monitor threat patterns, failed logins, and suspicious activity across the platform.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900/60 border-red-900/40 p-4 text-center">
          <div className="text-3xl font-black text-red-400">{totalFailedAttempts}</div>
          <div className="text-xs text-gray-500 mt-1">Failed Logins (24h)</div>
        </Card>
        <Card className="bg-gray-900/60 border-orange-900/40 p-4 text-center">
          <div className="text-3xl font-black text-orange-400">{failedLogins.length}</div>
          <div className="text-xs text-gray-500 mt-1">Unique Suspicious IPs</div>
        </Card>
        <Card className="bg-gray-900/60 border-yellow-900/40 p-4 text-center">
          <div className="text-3xl font-black text-yellow-400">{rateLimitHits}</div>
          <div className="text-xs text-gray-500 mt-1">Rate Limit Hits (24h)</div>
        </Card>
        <Card className="bg-gray-900/60 border-gray-800 p-4 text-center">
          <div className="text-3xl font-black text-emerald-400">{recentActivity.length}</div>
          <div className="text-xs text-gray-500 mt-1">Audit Events</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Failed Logins */}
        <Card className="bg-gray-900/40 border-gray-800 p-5">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Ban className="w-4 h-4 text-red-400" /> Suspicious IPs (24h)</h3>
          {loading ? <div className="text-gray-500 text-sm text-center py-4">Loading...</div> : null}
          <div className="space-y-2">
            {failedLogins.length === 0 && !loading && <div className="text-gray-500 text-sm text-center py-4">✅ No suspicious login activity</div>}
            {failedLogins.map(l => (
              <div key={l.ip_address} className="flex items-center gap-3 p-3 bg-gray-950 rounded-lg border border-gray-800">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-mono text-gray-200">{l.ip_address}</div>
                  <div className="text-xs text-gray-500">Last attempt: {fmtTime(l.last_attempt)}</div>
                </div>
                <div className="text-right">
                  <div className="text-red-400 font-bold text-sm">{l.attempts}x</div>
                  <div className="text-xs text-gray-600">failed</div>
                </div>
                <button className="bg-red-900/50 hover:bg-red-900 text-red-300 text-xs px-2 py-1 rounded transition-colors">Block</button>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Audit Activity */}
        <Card className="bg-gray-900/40 border-gray-800 p-5">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-blue-400" /> Recent Admin Activity</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {recentActivity.length === 0 && !loading && <div className="text-gray-500 text-sm text-center py-4">No audit events found</div>}
            {recentActivity.map((a, i) => (
              <div key={i} className="flex items-start gap-3 p-2.5 bg-gray-950 rounded-lg border border-gray-800/50">
                <Clock className="w-3.5 h-3.5 text-gray-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-300 font-mono">{a.action}</div>
                  <div className="text-xs text-gray-600">{a.ip_address} · {fmtTime(a.created_at)}</div>
                </div>
                {a.target_type && <Badge color="gray" size="sm">{a.target_type}</Badge>}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
