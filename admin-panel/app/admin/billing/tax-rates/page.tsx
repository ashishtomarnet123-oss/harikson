'use client';

import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../../../../context/AdminAuthContext';

interface TaxRate {
  id?: string;
  country_code: string;
  region_code?: string;
  tax_name: string;
  rate_percent: number;
  type: string;
  hsn_code: string;
  is_active: boolean;
}

interface SummaryRow {
  country_code: string;
  tax_name: string;
  total_invoices: number;
  total_subtotal: number;
  total_tax_collected: number;
  total_revenue: number;
}

export default function TaxRatesPage() {
  const { getAuthHeaders, apiBase } = useAdminAuth();
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRate, setEditingRate] = useState<TaxRate>({
    country_code: 'IN',
    region_code: '',
    tax_name: 'GST',
    rate_percent: 18,
    type: 'gst',
    hsn_code: '998315',
    is_active: true,
  });

  const fetchTaxData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiBase}/admin/tax-rates`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch tax rates');

      setTaxRates(data.taxRates || []);
      setSummary(data.summary30Days || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxData();
  }, []);

  const handleSaveTaxRate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${apiBase}/admin/tax-rates`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(editingRate),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save tax rate');

      setShowModal(false);
      fetchTaxData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleExportGSTR1 = async () => {
    try {
      const res = await fetch(`${apiBase}/admin/reports/gstr1`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to generate GSTR-1 report');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'GSTR1_Outward_Supplies_Report.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      alert(`Export Error: ${err.message}`);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-slate-100">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Tax & Compliance Engine</h1>
          <p className="text-sm text-slate-400">Configure global GST, VAT, and Sales Tax rules and export GSTR-1 compliance reports.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportGSTR1}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            📊 Export GSTR-1 (CSV)
          </button>
          <button
            onClick={() => {
              setEditingRate({
                country_code: 'IN',
                region_code: '',
                tax_name: 'GST',
                rate_percent: 18,
                type: 'gst',
                hsn_code: '998315',
                is_active: true,
              });
              setShowModal(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/20"
          >
            + Add Tax Rule
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* 30-Day Collections Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {summary.map((row, idx) => (
          <div key={idx} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-md">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg">
                {row.country_code} — {row.tax_name}
              </span>
              <span className="text-xs text-slate-400">{row.total_invoices} Invoices</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              ₹{Number(row.total_tax_collected).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-400">
              Tax Collected (Subtotal: ₹{Number(row.total_subtotal).toLocaleString('en-IN')})
            </div>
          </div>
        ))}
      </div>

      {/* Tax Rates Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-base font-semibold text-white">Configured Tax Rules</h2>
          <span className="text-xs text-slate-400">HSN Code 998315 applied for SaaS</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading tax rules...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-xs text-slate-400 uppercase border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3">Country</th>
                  <th className="px-6 py-3">Region</th>
                  <th className="px-6 py-3">Tax Name</th>
                  <th className="px-6 py-3">Rate (%)</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">HSN/SAC</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {taxRates.map((rate) => (
                  <tr key={rate.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-semibold text-white">{rate.country_code}</td>
                    <td className="px-6 py-4">{rate.region_code || 'All Regions'}</td>
                    <td className="px-6 py-4">{rate.tax_name}</td>
                    <td className="px-6 py-4 font-bold text-blue-400">{rate.rate_percent}%</td>
                    <td className="px-6 py-4 uppercase text-xs font-medium text-slate-400">{rate.type}</td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-400">{rate.hsn_code}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${rate.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'}`}>
                        {rate.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setEditingRate(rate);
                          setShowModal(true);
                        }}
                        className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Tax Rule Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">{editingRate.id ? 'Edit Tax Rule' : 'Add New Tax Rule'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveTaxRate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Country Code (2-letter ISO)</label>
                <input
                  type="text"
                  required
                  value={editingRate.country_code}
                  onChange={(e) => setEditingRate({ ...editingRate, country_code: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  placeholder="e.g. IN, DE, US"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Region Code (Optional State/Province)</label>
                <input
                  type="text"
                  value={editingRate.region_code || ''}
                  onChange={(e) => setEditingRate({ ...editingRate, region_code: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  placeholder="e.g. CA, NY, MH"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Tax Name</label>
                <input
                  type="text"
                  required
                  value={editingRate.tax_name}
                  onChange={(e) => setEditingRate({ ...editingRate, tax_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  placeholder="e.g. GST, VAT, Sales Tax"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Rate Percent (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingRate.rate_percent}
                    onChange={(e) => setEditingRate({ ...editingRate, rate_percent: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Tax Type</label>
                  <select
                    value={editingRate.type}
                    onChange={(e) => setEditingRate({ ...editingRate, type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="gst">GST</option>
                    <option value="vat">VAT</option>
                    <option value="sales">Sales Tax</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">HSN/SAC Code</label>
                <input
                  type="text"
                  value={editingRate.hsn_code}
                  onChange={(e) => setEditingRate({ ...editingRate, hsn_code: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  placeholder="998315 (SaaS)"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={editingRate.is_active}
                  onChange={(e) => setEditingRate({ ...editingRate, is_active: e.target.checked })}
                  className="rounded border-slate-800 text-blue-600 focus:ring-0"
                />
                <label htmlFor="is_active" className="text-sm text-slate-300">Active Rule</label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-500"
                >
                  Save Tax Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
