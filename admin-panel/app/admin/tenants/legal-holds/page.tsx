'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Scale, Search, ShieldAlert, CheckCircle, AlertTriangle } from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  has_active_legal_hold?: boolean;
}

export default function GlobalLegalHoldsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api-proxy/v1/admin/tenants');
      if (res.ok) {
        const data = await res.json();
        setTenants(data.tenants || data || []);
      }
    } catch (err) {
      console.error('Failed to fetch tenants for legal holds:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const filteredTenants = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Scale className="w-7 h-7 text-indigo-400" />
            Legal Holds Compliance Management
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Enforce eDiscovery compliance holds and prevent data deletion across tenant organizations.
          </p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
        <Search className="w-5 h-5 text-gray-400 shrink-0" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search tenant by name or slug..."
          className="bg-transparent border-none text-white focus:outline-none w-full text-sm placeholder:text-gray-500"
        />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Tenant Compliance Directory</h2>
          <span className="text-xs text-gray-400">{filteredTenants.length} tenants found</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500 text-sm">Loading tenants data...</div>
        ) : filteredTenants.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">No matching tenants found.</div>
        ) : (
          <div className="divide-y divide-gray-800/60">
            {filteredTenants.map((tenant) => (
              <div
                key={tenant.id}
                className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-800/40 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-base">{tenant.name}</span>
                    <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-md font-mono">
                      {tenant.slug}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 font-mono">{tenant.id}</p>
                </div>

                <div className="flex items-center gap-3">
                  {tenant.has_active_legal_hold ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-950/60 text-red-400 border border-red-800/60">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Active Legal Hold
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Standard
                    </span>
                  )}

                  <Link
                    href={`/admin/tenants/${tenant.id}/legal-holds`}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-all shadow-md shadow-indigo-600/20"
                  >
                    Manage Holds
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
