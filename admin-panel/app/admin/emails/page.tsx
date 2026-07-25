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
  Sparkles,
  Server,
  Key,
  Plus,
  Edit3,
  Trash2,
  Eye,
  Sliders,
  Users,
  Code
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

interface EmailTemplate {
  id: string;
  template_key: string;
  name: string;
  subject: string;
  body_html: string;
  body_text?: string;
  available_variables?: string[];
  is_active: boolean;
  created_at?: string;
}

interface SmtpConfig {
  provider: 'resend' | 'smtp';
  resend_api_key?: string;
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_pass?: string;
  smtp_secure?: boolean;
  from_email?: string;
  from_name?: string;
}

export default function AdminEmailsPage() {
  const [activeTab, setActiveTab] = useState<'telemetry' | 'templates' | 'smtp' | 'mailer'>('telemetry');

  // Telemetry & Logs state
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
  const [loadingLogs, setLoadingLogs] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);

  // Templates state
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState<boolean>(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<EmailTemplate>>({
    template_key: '',
    name: '',
    subject: '',
    body_html: '',
    available_variables: ['{{name}}', '{{email}}', '{{loginUrl}}']
  });

  // SMTP Settings state
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>({
    provider: 'resend',
    resend_api_key: '',
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_user: '',
    smtp_pass: '',
    smtp_secure: true,
    from_email: 'noreply@neuravolt.cloud',
    from_name: 'Neuravolt Cloud'
  });
  const [testingSmtp, setTestingSmtp] = useState<boolean>(false);
  const [savingSmtp, setSavingSmtp] = useState<boolean>(false);
  const [smtpStatusMessage, setSmtpStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Custom Mailer state
  const [mailerForm, setMailerForm] = useState({
    recipientType: 'single', // 'single' | 'all'
    recipientEmail: '',
    templateKey: '',
    subject: '',
    body_html: ''
  });
  const [sendingMail, setSendingMail] = useState<boolean>(false);
  const [mailerResult, setMailerResult] = useState<string | null>(null);

  // Fetch Telemetry Data
  const fetchEmailData = async () => {
    setLoadingLogs(true);
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
      setLoadingLogs(false);
    }
  };

  // Fetch Templates
  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch('/api-proxy/v1/admin/emails/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Fetch SMTP Settings
  const fetchSmtpSettings = async () => {
    try {
      const res = await fetch('/api-proxy/v1/admin/emails/smtp');
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setSmtpConfig(data.config);
        }
      }
    } catch (err) {
      console.error('Failed to load SMTP settings:', err);
    }
  };

  useEffect(() => {
    fetchEmailData();
    fetchTemplates();
    fetchSmtpSettings();
  }, [page, statusFilter, typeFilter]);

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingTemplate.id
        ? `/api-proxy/v1/admin/emails/templates/${editingTemplate.id}`
        : '/api-proxy/v1/admin/emails/templates';
      const method = editingTemplate.id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTemplate)
      });

      if (res.ok) {
        alert(`Template ${editingTemplate.id ? 'updated' : 'created'} successfully!`);
        setIsTemplateModalOpen(false);
        fetchTemplates();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || 'Failed to save template'}`);
      }
    } catch (err: any) {
      alert(`Error saving template: ${err?.message || err}`);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this email template?')) return;
    try {
      const res = await fetch(`/api-proxy/v1/admin/emails/templates/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Template deleted successfully!');
        fetchTemplates();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || 'Failed to delete template'}`);
      }
    } catch (err: any) {
      alert(`Error deleting template: ${err?.message || err}`);
    }
  };

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    setSmtpStatusMessage(null);
    try {
      const res = await fetch('/api-proxy/v1/admin/emails/smtp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smtpConfig)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSmtpStatusMessage({ type: 'success', text: data.message || 'SMTP Connection Verified!' });
      } else {
        setSmtpStatusMessage({ type: 'error', text: data.error || 'SMTP Connection Test Failed' });
      }
    } catch (err: any) {
      setSmtpStatusMessage({ type: 'error', text: err?.message || 'SMTP connection test error' });
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSmtp(true);
    setSmtpStatusMessage(null);
    try {
      const res = await fetch('/api-proxy/v1/admin/emails/smtp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smtpConfig)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSmtpStatusMessage({ type: 'success', text: 'SMTP Settings Saved & Activated!' });
      } else {
        setSmtpStatusMessage({ type: 'error', text: data.error || 'Failed to save SMTP settings' });
      }
    } catch (err: any) {
      setSmtpStatusMessage({ type: 'error', text: err?.message || 'Failed to save settings' });
    } finally {
      setSavingSmtp(false);
    }
  };

  const handleSendCustomMail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingMail(true);
    setMailerResult(null);
    try {
      const res = await fetch('/api-proxy/v1/admin/emails/send-custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mailerForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMailerResult(`✅ Success: ${data.message}`);
        fetchEmailData();
      } else {
        setMailerResult(`❌ Error: ${data.error || 'Failed to send mail'}`);
      }
    } catch (err: any) {
      setMailerResult(`❌ Error: ${err?.message || err}`);
    } finally {
      setSendingMail(false);
    }
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
            <Mail className="w-6 h-6 text-indigo-500" /> Enterprise Email System Suite
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Manage custom SMTP configurations, HTML email templates, delivery telemetry, and broadcast mailers.
          </p>
        </div>

        {/* Tab Navigation Controls */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800/80 p-1.5 rounded-2xl border border-gray-200 dark:border-gray-700/60">
          <button
            onClick={() => setActiveTab('telemetry')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'telemetry'
                ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" /> Telemetry & Logs
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'templates'
                ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Template Editor
          </button>
          <button
            onClick={() => setActiveTab('smtp')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'smtp'
                ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Server className="w-3.5 h-3.5" /> SMTP Settings
          </button>
          <button
            onClick={() => setActiveTab('mailer')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'mailer'
                ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Send className="w-3.5 h-3.5" /> Custom Mailer
          </button>
        </div>
      </div>

      {/* TAB 1: TELEMETRY & LOGS */}
      {activeTab === 'telemetry' && (
        <div className="space-y-6">
          {/* Telemetry Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
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

            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
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

            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
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
                Approval emails delivered
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
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
                Payment receipts dispatched
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search email by recipient or subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
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
                <option value="welcome">Welcome</option>
                <option value="invoice_receipt">Invoice Receipt</option>
                <option value="password_reset">Password Reset</option>
                <option value="custom_broadcast">Custom Broadcast</option>
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
                  {loadingLogs ? (
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
                        No email telemetry logs found.
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
        </div>
      )}

      {/* TAB 2: TEMPLATE EDITOR & MANAGER */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                System Email Templates
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Manage transactional templates for approvals, welcome emails, password resets, and invoices.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingTemplate({
                  template_key: '',
                  name: '',
                  subject: '',
                  body_html: '',
                  available_variables: ['{{name}}', '{{email}}', '{{loginUrl}}']
                });
                setIsTemplateModalOpen(true);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create Template
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Template List */}
            <div className="md:col-span-1 space-y-3">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  onClick={() => setSelectedTemplate(tpl)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    selectedTemplate?.id === tpl.id
                      ? 'border-indigo-500 bg-indigo-500/5 dark:bg-indigo-500/10 shadow-md'
                      : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-gray-900 dark:text-white">
                      {tpl.name}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-500">
                      {tpl.template_key}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                    Subject: {tpl.subject}
                  </p>
                </div>
              ))}
            </div>

            {/* Template Live Preview & Actions */}
            <div className="md:col-span-2 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
              {selectedTemplate ? (
                <>
                  <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-4">
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-base">
                        {selectedTemplate.name}
                      </h3>
                      <span className="text-xs text-gray-400 font-mono">
                        Key: {selectedTemplate.template_key}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingTemplate(selectedTemplate);
                          setIsTemplateModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-indigo-600/10 text-indigo-600 rounded-lg text-xs font-bold flex items-center gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit Template
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                        className="px-3 py-1.5 bg-rose-600/10 text-rose-600 rounded-lg text-xs font-bold flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-gray-500 uppercase block mb-1">
                      Subject Line:
                    </span>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {selectedTemplate.subject}
                    </p>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-gray-500 uppercase block mb-2">
                      Live HTML Render:
                    </span>
                    <div
                      className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 bg-gray-50 dark:bg-gray-950 max-h-96 overflow-y-auto"
                      dangerouslySetInnerHTML={{
                        __html: selectedTemplate.body_html
                          .replace(/\{\{name\}\}/g, 'John Doe')
                          .replace(/\{\{email\}\}/g, 'user@example.com')
                          .replace(/\{\{loginUrl\}\}/g, 'https://app.neuravolt.cloud/login')
                      }}
                    />
                  </div>
                </>
              ) : (
                <div className="text-center py-16 text-gray-400">
                  <Eye className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-700" />
                  Select a template from the list to view its live HTML preview and details.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CUSTOM SMTP & PROVIDER SETTINGS */}
      {activeTab === 'smtp' && (
        <div className="max-w-2xl mx-auto bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-base flex items-center gap-2">
              <Server className="w-5 h-5 text-indigo-500" /> Custom SMTP & Provider Configuration
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Configure your custom SMTP server (Gmail, Amazon SES, SendGrid, Mailgun, Postmark) or Resend API key.
            </p>
          </div>

          {smtpStatusMessage && (
            <div
              className={`p-4 rounded-xl border text-xs font-bold ${
                smtpStatusMessage.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
              }`}
            >
              {smtpStatusMessage.text}
            </div>
          )}

          <form onSubmit={handleSaveSmtp} className="space-y-4 text-xs font-medium">
            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                Select Email Transport Provider
              </label>
              <select
                value={smtpConfig.provider}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, provider: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none text-gray-900 dark:text-white font-bold"
              >
                <option value="resend">Resend API (Cloud SDK)</option>
                <option value="smtp">Custom SMTP Server (Nodemailer Transport)</option>
              </select>
            </div>

            {smtpConfig.provider === 'resend' ? (
              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                  Resend API Key
                </label>
                <input
                  type="password"
                  value={smtpConfig.resend_api_key || ''}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, resend_api_key: e.target.value })}
                  placeholder="re_123456789..."
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none font-mono text-gray-900 dark:text-white"
                />
              </div>
            ) : (
              <div className="space-y-4 border-t border-gray-200 dark:border-gray-800 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                      SMTP Host
                    </label>
                    <input
                      type="text"
                      value={smtpConfig.smtp_host || ''}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, smtp_host: e.target.value })}
                      placeholder="smtp.gmail.com or smtp.mailgun.org"
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                      SMTP Port
                    </label>
                    <input
                      type="number"
                      value={smtpConfig.smtp_port || 587}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, smtp_port: parseInt(e.target.value) })}
                      placeholder="587 or 465"
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                      SMTP Username / Email
                    </label>
                    <input
                      type="text"
                      value={smtpConfig.smtp_user || ''}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, smtp_user: e.target.value })}
                      placeholder="apikey or user@domain.com"
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                      SMTP Password / Secret
                    </label>
                    <input
                      type="password"
                      value={smtpConfig.smtp_pass || ''}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, smtp_pass: e.target.value })}
                      placeholder="••••••••••••"
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 border-t border-gray-200 dark:border-gray-800 pt-4">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                  From Address
                </label>
                <input
                  type="email"
                  value={smtpConfig.from_email || ''}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, from_email: e.target.value })}
                  placeholder="noreply@neuravolt.cloud"
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                  From Display Name
                </label>
                <input
                  type="text"
                  value={smtpConfig.from_name || ''}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, from_name: e.target.value })}
                  placeholder="Neuravolt Cloud"
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={handleTestSmtp}
                disabled={testingSmtp}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${testingSmtp ? 'animate-spin' : ''}`} /> Test SMTP Connection
              </button>
              <button
                type="submit"
                disabled={savingSmtp}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <ShieldCheck className="w-4 h-4" /> Save & Activate SMTP
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: CUSTOM MAILER */}
      {activeTab === 'mailer' && (
        <div className="max-w-2xl mx-auto bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-base flex items-center gap-2">
              <Send className="w-5 h-5 text-indigo-500" /> Custom Mailer & Broadcast Dispatcher
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Compose and send direct emails to individual users or broadcast to all active platform users.
            </p>
          </div>

          {mailerResult && (
            <div className="p-4 rounded-xl border bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
              {mailerResult}
            </div>
          )}

          <form onSubmit={handleSendCustomMail} className="space-y-4 text-xs font-medium">
            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                Recipient Target
              </label>
              <select
                value={mailerForm.recipientType}
                onChange={(e) => setMailerForm({ ...mailerForm, recipientType: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none text-gray-900 dark:text-white font-bold"
              >
                <option value="single">Single Target Recipient</option>
                <option value="all">Broadcast to All Active Platform Users</option>
              </select>
            </div>

            {mailerForm.recipientType === 'single' && (
              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                  Target Recipient Email Address
                </label>
                <input
                  type="email"
                  value={mailerForm.recipientEmail}
                  onChange={(e) => setMailerForm({ ...mailerForm, recipientEmail: e.target.value })}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none text-gray-900 dark:text-white"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                Select Template (Optional)
              </label>
              <select
                value={mailerForm.templateKey}
                onChange={(e) => setMailerForm({ ...mailerForm, templateKey: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none text-gray-900 dark:text-white font-bold"
              >
                <option value="">Custom Body (No Template)</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.template_key}>
                    {t.name} ({t.template_key})
                  </option>
                ))}
              </select>
            </div>

            {!mailerForm.templateKey && (
              <>
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    value={mailerForm.subject}
                    onChange={(e) => setMailerForm({ ...mailerForm, subject: e.target.value })}
                    placeholder="Important Platform Announcement..."
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                    HTML Message Body
                  </label>
                  <textarea
                    rows={6}
                    value={mailerForm.body_html}
                    onChange={(e) => setMailerForm({ ...mailerForm, body_html: e.target.value })}
                    placeholder="<p>Hello,</p><p>We are excited to announce...</p>"
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none font-mono text-gray-900 dark:text-white"
                    required
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={sendingMail}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Send className={`w-4 h-4 ${sendingMail ? 'animate-spin' : ''}`} /> Dispatched Custom Email
            </button>
          </form>
        </div>
      )}

      {/* CREATE / EDIT TEMPLATE MODAL */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-xl w-full p-6 border border-gray-200 dark:border-gray-800 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-800">
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                {editingTemplate.id ? 'Edit Template' : 'Create New Template'}
              </h3>
              <button onClick={() => setIsTemplateModalOpen(false)} className="text-gray-400 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-3 text-xs font-medium">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                  Template Key (Unique ID)
                </label>
                <input
                  type="text"
                  disabled={!!editingTemplate.id}
                  value={editingTemplate.template_key || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, template_key: e.target.value })}
                  placeholder="e.g. welcome_discount"
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none font-mono text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                  Template Name
                </label>
                <input
                  type="text"
                  value={editingTemplate.name || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  placeholder="e.g. Welcome Discount Email"
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={editingTemplate.subject || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                  placeholder="Welcome {{name}} to Neuravolt!"
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                  HTML Body (Supports placeholders {'{{name}}'}, {'{{email}}'}, {'{{loginUrl}}'})
                </label>
                <textarea
                  rows={6}
                  value={editingTemplate.body_html || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, body_html: e.target.value })}
                  placeholder="<div style='...'>Hi {{name}}...</div>"
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none font-mono text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
