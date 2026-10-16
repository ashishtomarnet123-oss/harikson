'use client';

import React, { useState, useEffect } from 'react';
import { getCookie } from 'cookies-next';
import {
  FileCheck,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  RefreshCw,
  Building,
  User,
  AlertTriangle,
} from 'lucide-react';

export default function PrivacyRequestsAdminPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [newStatus, setNewStatus] = useState('approved');
  const [rejectionReason, setRejectionReason] = useState('');
  const [updating, setUpdating] = useState(false);

  const apiBase = '/api-proxy';

  const fetchRequests = async () => {
    setLoading(true);
    const token = getCookie('admin_token') || localStorage.getItem('admin_token');
    const params = new URLSearchParams();
    if (statusFilter) params.append('status', statusFilter);
    if (search.trim()) params.append('search', search.trim());

    try {
      const res = await fetch(`${apiBase}/admin/privacy/requests?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setRequests(d.requests || []);
      }
    } catch (err) {
      console.error('Failed to load privacy requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const handleUpdateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    setUpdating(true);
    const token = getCookie('admin_token') || localStorage.getItem('admin_token');
    try {
      const res = await fetch(`${apiBase}/admin/privacy/requests/${selectedRequest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: newStatus,
          rejectionReason: newStatus === 'rejected_with_reason' ? rejectionReason : null,
        }),
      });

      if (res.ok) {
        setSelectedRequest(null);
        setRejectionReason('');
        fetchRequests();
      }
    } catch (err) {
      console.error('Error updating privacy request:', err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <FileCheck className="w-7 h-7 text-indigo-400" />
            Data Principal Rights Requests Workflow
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Review, verify identity, approve, or reject statutory rights requests (Export, Correction, Erasure, Nomination).
          </p>
        </div>
        <button
          onClick={fetchRequests}
          className="flex items-center gap-2 px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium rounded-lg border border-gray-700 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 flex items-center gap-2.5">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by tracking number, user name, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchRequests()}
            className="w-full bg-transparent text-sm text-white focus:outline-none placeholder-gray-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Review</option>
          <option value="approved">Approved</option>
          <option value="completed">Completed</option>
          <option value="rejected_with_reason">Rejected</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-gray-800/60 text-xs uppercase text-gray-400 border-b border-gray-800">
              <tr>
                <th className="py-3 px-4">Tracking Number</th>
                <th className="py-3 px-4">Data Principal</th>
                <th className="py-3 px-4">Request Type</th>
                <th className="py-3 px-4">Workspace / Tenant</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Submitted At</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    No privacy requests matching the current filters.
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-800/30">
                    <td className="py-3 px-4 font-mono font-semibold text-indigo-400">
                      {r.tracking_number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-white">{r.user_name || 'Data Principal'}</div>
                      <div className="text-xs text-gray-400">{r.user_email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-800 text-gray-300">
                        {r.request_type.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-400">{r.tenant_name || 'Workspace'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                          r.status === 'completed'
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                            : r.status === 'rejected_with_reason'
                            ? 'bg-red-950/60 text-red-400 border border-red-800'
                            : 'bg-amber-950/60 text-amber-400 border border-amber-800'
                        }`}
                      >
                        {r.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-400">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedRequest(r);
                          setNewStatus(r.status === 'submitted' ? 'under_review' : 'completed');
                        }}
                        className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-xs font-medium text-white rounded border border-gray-700 transition"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-lg w-full p-6 text-white shadow-2xl">
            <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-indigo-400" />
              Review Data Principal Request
            </h3>
            <p className="text-xs font-mono text-indigo-400 mb-4">{selectedRequest.tracking_number}</p>

            <div className="bg-gray-800/40 rounded-lg p-3 text-xs text-gray-300 space-y-1 mb-4 border border-gray-800">
              <div><strong>Principal:</strong> {selectedRequest.user_name} ({selectedRequest.user_email})</div>
              <div><strong>Type:</strong> {selectedRequest.request_type}</div>
              <div><strong>Details:</strong> {JSON.stringify(selectedRequest.details || {})}</div>
            </div>

            <form onSubmit={handleUpdateRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Update Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                >
                  <option value="under_review">Under Review / Verification</option>
                  <option value="approved">Approved</option>
                  <option value="completed">Completed</option>
                  <option value="rejected_with_reason">Rejected With Reason</option>
                </select>
              </div>

              {newStatus === 'rejected_with_reason' && (
                <div>
                  <label className="block text-xs font-semibold text-red-400 mb-1">
                    Statutory Rejection Reason *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Provide legally justified basis under DPDP Act 2023..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full bg-gray-800 border border-red-800/50 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg"
                >
                  {updating ? 'Saving...' : 'Update Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
