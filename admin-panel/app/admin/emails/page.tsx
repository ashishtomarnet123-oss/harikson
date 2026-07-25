'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  FileText,
  ShieldCheck,
  Zap,
  TrendingUp,
  UserCheck,
  Receipt,
  ExternalLink,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface EmailLog {
  id: string;
  recipient: string;
  email_type: string;
  subject: string;
  status: 'sent' | 'failed' | 'queued';
  error_message?: string;
  resend_id?: string;
  created_at: string;
}

interface EmailStats {
  totalSent: number;
  successfulCount: number;
  failedCount: number;
  invoicesCount: number;
  approvalsCount: number;
  lastHourCount: number;
  successRate: string;
}

export default function AdminEmailsPage() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [stats, setStats] = useState<EmailStats>({
    totalSent: 0,
    successfulCount: 0,
    failedCount: 0,
    invoicesCount: 0,
    approvalsCount: 0,
    lastHourCount: 0,
    successRate: '100.0'
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);

  const fetchEmailData = async () => {
    setLoading(true);
    try {
      const [logsRes, statsRes] = await Promise.all([
        fetch(
          `/api-proxy/v1/admin/emails/logs?page=${page}&limit=15&search=${encodeURIComponent(
            searchTerm
          )}&status=${statusFilter}&type=${typeFilter}`
        ),
        fetch('/api-proxy/v1/admin/emails/stats')
      ]);

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData.logs || []);
        if (logsData.pagination) {
          setTotalPages(logsData.pagination.totalPages || 1);
        }
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.stats) {
          setStats(statsData.stats);
        }
      }
    } catch (err) {
      console.error('Failed to load email telemetry data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmailData();
  }, [page, statusFilter, typeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEmailData();
  };

  const getBadgeForType = (type: string) => {
    switch (type) {
      case 'access_approval':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400';
      case 'access_request':
      case 'registration':
        return 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400';
      case 'invoice_receipt':
        return 'bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400';
      case 'password_reset':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400';
      default:
        return 'bg-gray-500/10 border-gray-500/30 text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <Mail className="w-6 h-6 text-indigo-500" /> Email Telemetry & System Logs
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Monitor transactional email dispatches, delivery status, Resend telemetry, and user notifications.
          </p>
        </div>

        <button
          onClick={fetchEmailData}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Telemetry
        </button>
      </div>

      {/* Telemetry Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Dispatched */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Total Dispatched
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white mt-2">
            {stats.totalSent.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> {stats.lastHourCount} sent in last 1 hour
          </div>
        </div>

        {/* Delivery Success Rate */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Delivery Success
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white mt-2">
            {stats.successRate}%
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
            {stats.successfulCount} delivered / {stats.failedCount} failed
          </div>
        </div>

        {/* Access Approvals Sent */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Access Approvals
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white mt-2">
            {stats.approvalsCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
            Approval emails delivered via Resend
          </div>
        </div>

        {/* GST Invoices & Receipts */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Invoices & Receipts
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white mt-2">
            {stats.invoicesCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
            Payment & GST Receipts dispatched
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search email by recipient or subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-gray-900 dark:text-white"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 outline-none"
          >
            <option value="">All Statuses</option>
            <option value="sent">Sent / Delivered</option>
            <option value="failed">Failed</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 outline-none"
          >
            <option value="">All Email Types</option>
            <option value="access_approval">Access Approval</option>
            <option value="access_request">Access Request</option>
            <option value="invoice_receipt">Invoice Receipt</option>
            <option value="password_reset">Password Reset</option>
            <option value="verification">Email Verification</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 text-[10px] font-black uppercase tracking-wider text-gray-400 bg-gray-50/50 dark:bg-gray-950/40">
                <th className="py-3 px-6">Recipient</th>
                <th className="py-3 px-6">Email Type</th>
                <th className="py-3 px-6">Subject Line</th>
                <th className="py-3 px-6">Delivery Status</th>
                <th className="py-3 px-6">Dispatched At</th>
                <th className="py-3 px-6 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 text-xs font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading email telemetry records...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <Mail className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-700" />
                    No email telemetry logs found matching your filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-6 font-bold text-gray-900 dark:text-white">
                      {log.recipient}
                    </td>
                    <td className="py-3.5 px-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wide border ${getBadgeForType(
                          log.email_type
                        )}`}
                      >
                        {log.email_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-gray-700 dark:text-gray-300 truncate max-w-xs">
                      {log.subject}
                    </td>
                    <td className="py-3.5 px-6">
                      {log.status === 'sent' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Sent
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 text-xs font-bold">
                          <AlertCircle className="w-3.5 h-3.5" /> Failed
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-6 text-gray-500 dark:text-gray-400 text-[11px]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400 hover:text-indigo-500 transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-xs font-bold disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-xs font-bold disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Slide-over Detail Drawer */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-gray-900 h-full p-6 shadow-2xl border-l border-gray-200 dark:border-gray-800 overflow-y-auto space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="font-bold text-gray-900 dark:text-white text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" /> Dispatched Email Log
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Recipient
                </span>
                <span className="font-bold text-gray-900 dark:text-white text-sm">
                  {selectedLog.recipient}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Subject Line
                </span>
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {selectedLog.subject}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Email Type & Status
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase border ${getBadgeForType(
                      selectedLog.email_type
                    )}`}
                  >
                    {selectedLog.email_type.replace('_', ' ')}
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                    {selectedLog.status}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Dispatched Timestamp
                </span>
                <span className="font-medium text-gray-600 dark:text-gray-400">
                  {new Date(selectedLog.created_at).toLocaleString()}
                </span>
              </div>

              {selectedLog.resend_id && (
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Resend Message ID
                  </span>
                  <code className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-indigo-500 font-mono text-[11px]">
                    {selectedLog.resend_id}
                  </code>
                </div>
              )}

              {selectedLog.error_message && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400">
                  <span className="font-bold block text-[11px] mb-1">Error Diagnostic:</span>
                  <p className="font-mono text-[10px]">{selectedLog.error_message}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
