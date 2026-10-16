'use client';

import React, { useState, useEffect } from 'react';
import { getCookie } from 'cookies-next';
import {
  Terminal,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Shield,
  User,
  ArrowRight,
} from 'lucide-react';

export default function ConsentAuditAdminPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [purposeFilter, setPurposeFilter] = useState('');

  const apiBase = '/api-proxy';

  const fetchAuditEvents = async () => {
    setLoading(true);
    const token = getCookie('admin_token') || localStorage.getItem('admin_token');
    const params = new URLSearchParams();
    if (purposeFilter) params.append('purposeId', purposeFilter);
    if (search.trim()) params.append('search', search.trim());

    try {
      const res = await fetch(`${apiBase}/admin/privacy/audit-events?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setEvents(d.events || []);
      }
    } catch (err) {
      console.error('Failed to load consent audit events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditEvents();
  }, [purposeFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Terminal className="w-7 h-7 text-emerald-400" />
            Immutable Consent Audit Trail (DPDP Compliance)
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Server-generated, append-only chronological log of all consent grants, declines, and withdrawals.
          </p>
        </div>
        <button
          onClick={fetchAuditEvents}
          className="flex items-center gap-2 px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium rounded-lg border border-gray-700 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 flex items-center gap-2.5">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by user email or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchAuditEvents()}
            className="w-full bg-transparent text-sm text-white focus:outline-none placeholder-gray-500"
          />
        </div>
        <select
          value={purposeFilter}
          onChange={(e) => setPurposeFilter(e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none"
        >
          <option value="">All Purposes</option>
          <option value="service_processing">Service Processing</option>
          <option value="marketing_emails">Marketing Emails</option>
          <option value="product_updates">Product Updates</option>
          <option value="analytics">Analytics</option>
          <option value="third_party_ai_processing">Third-Party AI Inference</option>
        </select>
      </div>

      {/* Audit Log Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-gray-800/60 text-xs uppercase text-gray-400 border-b border-gray-800">
              <tr>
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Data Principal</th>
                <th className="py-3 px-4">Purpose</th>
                <th className="py-3 px-4">State Transition</th>
                <th className="py-3 px-4">Notice Ver</th>
                <th className="py-3 px-4">Collection Source</th>
                <th className="py-3 px-4">Client IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    No consent audit events recorded matching current filters.
                  </td>
                </tr>
              ) : (
                events.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-800/30">
                    <td className="py-3 px-4 font-mono text-xs text-gray-400 whitespace-nowrap">
                      {new Date(e.created_at).toISOString().replace('T', ' ').slice(0, 19)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-white">{e.user_name || 'Data Principal'}</div>
                      <div className="text-xs text-gray-400">{e.user_email}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-blue-400">
                      {e.purpose_id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        <span className="text-gray-400">{e.previous_status || 'none'}</span>
                        <ArrowRight className="w-3 h-3 text-gray-500" />
                        <span
                          className={
                            e.new_status === 'granted'
                              ? 'text-emerald-400'
                              : e.new_status === 'withdrawn'
                              ? 'text-red-400'
                              : 'text-amber-400'
                          }
                        >
                          {e.new_status}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-gray-400">{e.notice_version}</td>
                    <td className="py-3 px-4">
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-300">
                        {e.collection_source}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-gray-500">
                      {e.ip_address || '127.0.0.1'}
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
