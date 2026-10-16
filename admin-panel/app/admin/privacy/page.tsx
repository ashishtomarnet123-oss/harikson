'use client';

import React, { useState, useEffect } from 'react';
import { getCookie } from 'cookies-next';
import {
  Shield,
  FileText,
  Scale,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  RefreshCw,
  ExternalLink,
  Edit2,
  Lock,
} from 'lucide-react';

export default function PrivacyGovernancePage() {
  const [stats, setStats] = useState<any>(null);
  const [notices, setNotices] = useState<any[]>([]);
  const [purposes, setPurposes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [newVersion, setNewVersion] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newSummary, setNewSummary] = useState('');
  const [creatingNotice, setCreatingNotice] = useState(false);

  const apiBase = '/api-proxy';

  const fetchPrivacyData = async () => {
    setLoading(true);
    const token = getCookie('admin_token') || localStorage.getItem('admin_token');
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [statsRes, noticesRes, purposesRes] = await Promise.all([
        fetch(`${apiBase}/admin/privacy/stats`, { headers }),
        fetch(`${apiBase}/admin/privacy/notices`, { headers }),
        fetch(`${apiBase}/admin/privacy/purposes`, { headers }),
      ]);

      if (statsRes.ok) {
        const d = await statsRes.json();
        setStats(d.stats);
      }
      if (noticesRes.ok) {
        const d = await noticesRes.json();
        setNotices(d.notices || []);
      }
      if (purposesRes.ok) {
        const d = await purposesRes.json();
        setPurposes(d.purposes || []);
      }
    } catch (err) {
      console.error('Failed to load privacy governance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrivacyData();
  }, []);

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersion || !newTitle) return;

    setCreatingNotice(true);
    const token = getCookie('admin_token') || localStorage.getItem('admin_token');
    try {
      const res = await fetch(`${apiBase}/admin/privacy/notices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          version: newVersion,
          title: newTitle,
          summary: newSummary,
          status: 'published',
        }),
      });

      if (res.ok) {
        setShowNoticeModal(false);
        setNewVersion('');
        setNewTitle('');
        setNewSummary('');
        fetchPrivacyData();
      }
    } catch (err) {
      console.error('Error creating privacy notice:', err);
    } finally {
      setCreatingNotice(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Shield className="w-7 h-7 text-blue-400" />
            DPDP Privacy Governance &amp; Notice Control Plane
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Digital Personal Data Protection Act, 2023 compliance, notice version history, and purpose-based consent master settings.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchPrivacyData}
            className="flex items-center gap-2 px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium rounded-lg border border-gray-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowNoticeModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            Publish Notice Version
          </button>
        </div>
      </div>

      {/* Compliance Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Privacy Rights Requests</span>
            <FileText className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {stats?.requests?.total || 0}
          </div>
          <div className="text-xs text-amber-400 mt-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {stats?.requests?.pending || 0} pending review
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Grievances</span>
            <Scale className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {stats?.grievances?.total || 0}
          </div>
          <div className="text-xs text-purple-400 mt-1">
            {stats?.grievances?.pending || 0} undergoing investigation
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Consent Grants</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {stats?.consents?.active_grants || 0}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {stats?.consents?.withdrawn || 0} withdrawn / opt-outs
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Notice Versions</span>
            <Shield className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {notices.length}
          </div>
          <div className="text-xs text-emerald-400 mt-1">
            v2.0-dpdp active in production
          </div>
        </div>
      </div>

      {/* Notice Versions Section */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-400" />
          Published Privacy Notice Versions (Audit Trail)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-gray-800/60 text-xs uppercase text-gray-400 border-b border-gray-800">
              <tr>
                <th className="py-3 px-4">Version</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Effective Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Published By</th>
                <th className="py-3 px-4">Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {notices.map((n) => (
                <tr key={n.id} className="hover:bg-gray-800/30">
                  <td className="py-3 px-4 font-mono font-semibold text-blue-400">{n.version}</td>
                  <td className="py-3 px-4 font-medium text-white">{n.title}</td>
                  <td className="py-3 px-4 text-gray-400">{new Date(n.effective_date).toLocaleDateString()}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                      n.status === 'published' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800' : 'bg-gray-800 text-gray-400'
                    }`}>
                      {n.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-400">{n.published_by}</td>
                  <td className="py-3 px-4 text-gray-400 max-w-xs truncate">{n.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Consent Purposes Master Section */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-indigo-400" />
          Master Processing Purposes &amp; Lawful Bases (DPDP Act)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {purposes.map((p) => (
            <div key={p.id} className="bg-gray-800/40 border border-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-white">{p.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded font-mono font-semibold uppercase ${
                  p.is_required ? 'bg-blue-950 text-blue-400 border border-blue-800' : 'bg-gray-800 text-gray-300'
                }`}>
                  {p.legal_basis.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-3">{p.description}</p>
              <div className="text-xs font-mono text-gray-500 bg-gray-900 p-2 rounded border border-gray-800">
                withdrawal: {p.withdrawal_behavior}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New Notice Modal */}
      {showNoticeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-lg w-full p-6 text-white shadow-2xl">
            <h3 className="text-lg font-bold mb-4">Publish New Privacy Notice Version</h3>
            <form onSubmit={handleCreateNotice} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Version String *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2.1-dpdp"
                  value={newVersion}
                  onChange={(e) => setNewVersion(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Notice Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Xarwiz Privacy & Consent Policy"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Summary of Modifications</label>
                <textarea
                  rows={3}
                  placeholder="Describe material changes for audit and principal notice..."
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNoticeModal(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingNotice}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg"
                >
                  {creatingNotice ? 'Publishing...' : 'Publish Version'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
