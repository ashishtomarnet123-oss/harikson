'use client';

import React, { useState, useEffect } from 'react';
import { getCookie } from 'cookies-next';
import {
  Scale,
  Search,
  CheckCircle,
  Clock,
  RefreshCw,
  Mail,
  User,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react';

export default function PrivacyGrievancesAdminPage() {
  const [grievances, setGrievances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedGrievance, setSelectedGrievance] = useState<any>(null);
  const [newStatus, setNewStatus] = useState('investigating');
  const [assignedOfficer, setAssignedOfficer] = useState('Ashish Pratap Singh Tomar');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const apiBase = '/api-proxy';

  const fetchGrievances = async () => {
    setLoading(true);
    const token = getCookie('admin_token') || localStorage.getItem('admin_token');
    const params = new URLSearchParams();
    if (statusFilter) params.append('status', statusFilter);
    if (search.trim()) params.append('search', search.trim());

    try {
      const res = await fetch(`${apiBase}/admin/privacy/grievances?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setGrievances(d.grievances || []);
      }
    } catch (err) {
      console.error('Failed to load grievances:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrievances();
  }, [statusFilter]);

  const handleUpdateGrievance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGrievance) return;

    setUpdating(true);
    const token = getCookie('admin_token') || localStorage.getItem('admin_token');
    try {
      const res = await fetch(`${apiBase}/admin/privacy/grievances/${selectedGrievance.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: newStatus,
          assignedOfficer,
          resolutionNotes,
        }),
      });

      if (res.ok) {
        setSelectedGrievance(null);
        setResolutionNotes('');
        fetchGrievances();
      }
    } catch (err) {
      console.error('Error updating grievance:', err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Scale className="w-7 h-7 text-purple-400" />
            DPDP Grievance Redressal Cell (Section 13)
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Formal data protection complaints, designated Grievance Officer assignments, and resolution notes.
          </p>
        </div>
        <button
          onClick={fetchGrievances}
          className="flex items-center gap-2 px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium rounded-lg border border-gray-700 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 flex items-center gap-2.5">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by grievance number, complainant, email, or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchGrievances()}
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
          <option value="investigating">Investigating</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed_with_reason">Dismissed</option>
        </select>
      </div>

      {/* Grievances List */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-gray-800/60 text-xs uppercase text-gray-400 border-b border-gray-800">
              <tr>
                <th className="py-3 px-4">Grievance Ref</th>
                <th className="py-3 px-4">Complainant</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Assigned Officer</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {grievances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    No grievances recorded matching the current filter.
                  </td>
                </tr>
              ) : (
                grievances.map((g) => (
                  <tr key={g.id} className="hover:bg-gray-800/30">
                    <td className="py-3 px-4 font-mono font-semibold text-purple-400">
                      {g.grievance_number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-white">{g.complainant_name}</div>
                      <div className="text-xs text-gray-400">{g.complainant_email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-800 text-gray-300">
                        {g.category.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-gray-200">{g.subject}</td>
                    <td className="py-3 px-4 text-gray-400">{g.assigned_officer}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                          g.status === 'resolved'
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                            : 'bg-purple-950/60 text-purple-400 border border-purple-800'
                        }`}
                      >
                        {g.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedGrievance(g);
                          setNewStatus(g.status === 'submitted' ? 'investigating' : 'resolved');
                          setAssignedOfficer(g.assigned_officer || 'Ashish Pratap Singh Tomar');
                          setResolutionNotes(g.resolution_notes || '');
                        }}
                        className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-xs font-medium text-white rounded border border-gray-700 transition"
                      >
                        Handle
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grievance Resolution Modal */}
      {selectedGrievance && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-lg w-full p-6 text-white shadow-2xl">
            <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
              <Scale className="w-5 h-5 text-purple-400" />
              Grievance Determination &amp; Resolution
            </h3>
            <p className="text-xs font-mono text-purple-400 mb-3">{selectedGrievance.grievance_number}</p>

            <div className="bg-gray-800/40 rounded-lg p-3 text-xs text-gray-300 space-y-1 mb-4 border border-gray-800">
              <div><strong>Complainant:</strong> {selectedGrievance.complainant_name} ({selectedGrievance.complainant_email})</div>
              <div><strong>Subject:</strong> {selectedGrievance.subject}</div>
              <div className="pt-1 text-gray-400"><strong>Statement:</strong> {selectedGrievance.description}</div>
            </div>

            <form onSubmit={handleUpdateGrievance} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="acknowledged">Acknowledged</option>
                  <option value="investigating">Under Investigation</option>
                  <option value="resolved">Resolved</option>
                  <option value="dismissed_with_reason">Dismissed With Reason</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Assigned Grievance Officer</label>
                <input
                  type="text"
                  value={assignedOfficer}
                  onChange={(e) => setAssignedOfficer(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">
                  Resolution Notes / Determination
                </label>
                <textarea
                  rows={4}
                  placeholder="Record formal findings and actions taken for regulatory record..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedGrievance(null)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg"
                >
                  {updating ? 'Saving...' : 'Save Grievance Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
