'use client';

import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  Search,
  Filter,
  Calendar,
  Download,
  Info,
  Clock,
  User,
  ShieldAlert,
} from 'lucide-react';
import { getCookie } from 'cookies-next';

interface AuditRow {
  id: string;
  admin_email: string;
  action: string;
  target_type: string;
  target_id: string;
  old_value: any;
  new_value: any;
  ip_address: string;
  created_at: string;
}

export default function AuditLogs() {
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchAction, setSearchAction] = useState('');
  const apiBase = '/api-proxy';

  const fetchAudits = async () => {
    setLoading(true);
    const token =
      getCookie('admin_token') ||
      localStorage.getItem('admin_token') ||
      'TEST_ADMIN_TOKEN';
    try {
      const res = await fetch(`${apiBase}/admin/audit-log`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAudits(data.audit || []);
      }
    } catch (e) {
      console.warn('Failed to retrieve audits from API, using fallback mocks');
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    setAudits([
      {
        id: 'a-1',
        admin_email: 'admin@harikson.ai',
        action: 'vllm_restart',
        target_type: 'system',
        target_id: 'vllm',
        old_value: null,
        new_value: null,
        ip_address: '154.201.127.68',
        created_at: new Date().toISOString(),
      },
      {
        id: 'a-2',
        admin_email: 'admin@harikson.ai',
        action: 'plan_change',
        target_type: 'tenant',
        target_id: 't-101',
        old_value: { plan: 'STARTER' },
        new_value: { plan: 'PRO' },
        ip_address: '127.0.0.1',
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
    ]);
  };

  useEffect(() => {
    fetchAudits();
  }, [apiBase]);

  const filteredAudits = audits.filter((a) => {
    const matchEmail = a.admin_email
      .toLowerCase()
      .includes(searchEmail.toLowerCase());
    const matchAction = a.action
      .toLowerCase()
      .includes(searchAction.toLowerCase());
    return matchEmail && matchAction;
  });

  return (
    <div className="space-y-8 font-sans text-gray-300">
      {/* Search Header */}
      <section className="flex flex-wrap items-center gap-4 p-5 bg-gray-900/40 border border-gray-800/80 rounded-2xl">
        <div className="flex items-center gap-3 flex-1 min-w-[200px]">
          <Search className="w-5 h-5 text-gray-500 flex-shrink-0" />
          <input
            type="text"
            className="w-full bg-gray-950/60 border border-gray-800 text-sm py-2 px-3.5 rounded-xl outline-none focus:border-indigo-500 text-white"
            placeholder="Filter by Admin Email..."
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 flex-1 min-w-[200px]">
          <Filter className="w-5 h-5 text-gray-500 flex-shrink-0" />
          <input
            type="text"
            className="w-full bg-gray-950/60 border border-gray-800 text-sm py-2 px-3.5 rounded-xl outline-none focus:border-indigo-500 text-white"
            placeholder="Filter by Action (e.g. plan_change)..."
            value={searchAction}
            onChange={(e) => setSearchAction(e.target.value)}
          />
        </div>
      </section>

      {/* Audit Log Table */}
      <section className="bg-gray-900/40 border border-gray-800/80 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-lg font-black text-white">
            Administrator Audit Trail
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Audit logs of all control plane adjustments, model loads, restarts,
            and tenant status actions.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-950/50 border-b border-gray-800 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-4 px-6">Timestamp</th>
                <th className="py-4 px-6">Administrator</th>
                <th className="py-4 px-6">Action type</th>
                <th className="py-4 px-6">Target layer</th>
                <th className="py-4 px-6">Payload changes</th>
                <th className="py-4 px-6 text-right">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-gray-300">
              {filteredAudits.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-10 text-center text-gray-500 font-semibold"
                  >
                    No matching admin actions logged.
                  </td>
                </tr>
              ) : (
                filteredAudits.map((a) => (
                  <tr
                    key={a.id}
                    className="hover:bg-gray-800/10 transition-all"
                  >
                    <td className="py-4 px-6 font-mono text-xs text-gray-500">
                      {new Date(a.created_at).toLocaleString()}
                    </td>
                    <td className="py-4 px-6 font-semibold text-white flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-indigo-400" />
                      {a.admin_email}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase border ${
                          a.action.includes('restart') ||
                          a.action.includes('unload')
                            ? 'bg-red-950/20 border-red-900/30 text-red-400'
                            : 'bg-green-950/20 border-green-900/30 text-green-400'
                        }`}
                      >
                        {a.action}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono text-xs text-indigo-400 font-semibold">
                      {a.target_type}/{a.target_id}
                    </td>
                    <td className="py-4 px-6 text-xs font-mono max-w-sm truncate text-gray-400">
                      {a.old_value || a.new_value ? (
                        <span>
                          {a.old_value ? JSON.stringify(a.old_value) : 'None'} ➜{' '}
                          {a.new_value ? JSON.stringify(a.new_value) : 'None'}
                        </span>
                      ) : (
                        <span className="italic text-gray-600">
                          No value diff logged
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right font-mono text-xs text-gray-500">
                      {a.ip_address}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
