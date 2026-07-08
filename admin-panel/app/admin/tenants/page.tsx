'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CreditCard, 
  AlertOctagon, 
  Search, 
  Settings, 
  Copy,
  Info,
  DollarSign,
  TrendingUp,
  X,
  TrendingDown
} from 'lucide-react';
import { getCookie } from 'cookies-next';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  user_count: number;
  tokens_used: number;
  created_at: string;
}

interface Violation {
  tenant: string;
  timestamp: string;
  endpoint: string;
  limit: number;
  actual: number;
  action: string;
}

interface Reconciliation {
  tenant: string;
  razorpay_id: string;
  amount: number;
  status: string;
  tokens_credited: number;
  mismatch: boolean;
}

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  tpm_limit: number;
  rpm_limit: number;
  status: string;
  created_at: string;
  tenant_name: string;
}

interface WebhookLog {
  id: string;
  event_id: string;
  provider: string;
  event_type: string;
  status: string;
  amount: number;
  tenant_name: string;
  payload: any;
  created_at: string;
}

export default function TenantManager() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [reconcile, setReconcile] = useState<Reconciliation[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  
  // API Key management states
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyTenant, setNewKeyTenant] = useState('');
  const [newKeyTpm, setNewKeyTpm] = useState(100000);
  const [newKeyRpm, setNewKeyRpm] = useState(100);
  const [generatedPlainKey, setGeneratedPlainKey] = useState<string | null>(null);

  // Webhook logger states
  const [webhooks, setWebhooks] = useState<WebhookLog[]>([]);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookLog | null>(null);
  const [providersActive, setProvidersActive] = useState<{ razorpay: boolean; stripe: boolean }>({ razorpay: false, stripe: false });
  const [providersModes, setProvidersModes] = useState<{ razorpay: string; stripe: string }>({ razorpay: 'test', stripe: 'test' });

  const [apiBase, setApiBase] = useState('http://localhost:4008');
  const [loading, setLoading] = useState(true);

  // Filters for violations
  const [filterTenant, setFilterTenant] = useState('');
  const [filterPlan, setFilterPlan] = useState('');

  const fetchData = async () => {
    const token = getCookie('admin_token') || localStorage.getItem('admin_token') || 'TEST_ADMIN_TOKEN';
    try {
      // 1. Fetch Tenants
      const res1 = await fetch(`${apiBase}/admin/tenants?page=1&limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res1.ok) {
        const data = await res1.json();
        setTenants(data.tenants || []);
      }

      // 2. Fetch violations
      const res2 = await fetch(`${apiBase}/admin/rate-limit-violations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res2.ok) {
        const data = await res2.json();
        setViolations(data.violations || []);
      }

      // 3. Fetch Reconciliation
      const res3 = await fetch(`${apiBase}/admin/billing/reconciliation`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res3.ok) {
        const data = await res3.json();
        setReconcile(data.billing || []);
      }

      // 4. Fetch API Keys
      const res4 = await fetch(`${apiBase}/admin/api-keys`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res4.ok) {
        const data = await res4.json();
        setApiKeys(data.keys || []);
      }

      // 5. Fetch Webhooks
      const res5 = await fetch(`${apiBase}/admin/billing/webhooks`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res5.ok) {
        const data = await res5.json();
        setWebhooks(data.webhooks || []);
        if (data.providers_active) setProvidersActive(data.providers_active);
        if (data.providers_modes) setProvidersModes(data.providers_modes);
      }

    } catch (e) {
      console.warn('Failed to connect to API, using mock state fallbacks', e);
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    setTenants([
      { id: 't-101', name: 'Alpha Tech', slug: 'alphatech', plan: 'PRO', status: 'active', user_count: 12, tokens_used: 450000, created_at: new Date().toISOString() },
      { id: 't-102', name: 'Beta Systems', slug: 'betasystems', plan: 'BUSINESS', status: 'active', user_count: 34, tokens_used: 1200000, created_at: new Date().toISOString() },
      { id: 't-103', name: 'Gamma Digital', slug: 'gammadigital', plan: 'STARTER', status: 'suspended', user_count: 3, tokens_used: 15000, created_at: new Date().toISOString() },
      { id: 't-104', name: 'Delta Agency', slug: 'delta-agency', plan: 'ENTERPRISE', status: 'active', user_count: 58, tokens_used: 3500000, created_at: new Date().toISOString() }
    ]);
    setViolations([
      { tenant: 'Alpha Tech', timestamp: new Date().toISOString(), endpoint: '/api/chat', limit: 10, actual: 12, action: 'blocked' },
      { tenant: 'Beta Systems', timestamp: new Date().toISOString(), endpoint: '/api/chat', limit: 60, actual: 61, action: 'throttled' }
    ]);
    setReconcile([
      { tenant: 'Alpha Tech', razorpay_id: 'pay_PQR12345678', amount: 99.00, status: 'captured', tokens_credited: 500000, mismatch: false },
      { tenant: 'Delta Agency', razorpay_id: 'pay_XYZ87654321', amount: 299.00, status: 'captured', tokens_credited: 2000000, mismatch: true }
    ]);
    setApiKeys([
      { id: 'k-1', name: 'Production Chat Key', key_prefix: 'hk_live_a1b2', tpm_limit: 100000, rpm_limit: 100, status: 'active', created_at: new Date().toISOString(), tenant_name: 'Alpha Tech' }
    ]);
    setWebhooks([
      { id: 'wh-1', event_id: 'evt_1O2x5cK', provider: 'stripe', event_type: 'invoice.paid', status: 'success', amount: 299.00, tenant_name: 'Alpha Tech', payload: { type: 'invoice.paid' }, created_at: new Date().toISOString() },
      { id: 'wh-2', event_id: 'evt_1O2x9aX', provider: 'stripe', event_type: 'invoice.payment_failed', status: 'failed', amount: 299.00, tenant_name: 'Gamma Digital', payload: { type: 'invoice.payment_failed' }, created_at: new Date().toISOString() }
    ]);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        setApiBase(`http://${hostname}:4008`);
      }
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [apiBase]);

  // Copy short UUID helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied Tenant ID to clipboard!');
  };

  // Update subscription plan
  const handleUpdatePlan = async (id: string, plan: string) => {
    const token = getCookie('admin_token') || localStorage.getItem('admin_token') || 'TEST_ADMIN_TOKEN';
    try {
      const res = await fetch(`${apiBase}/admin/tenants/${id}/plan`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plan })
      });
      if (!res.ok) throw new Error('Update failed');
      fetchData();
      if (selectedTenant && selectedTenant.id === id) {
        setSelectedTenant(prev => prev ? { ...prev, plan } : null);
      }
    } catch (e) {
      alert('Failed to update tenant plan.');
    }
  };

  // Suspend tenant (soft delete)
  const handleToggleSuspend = async (id: string, currentStatus: string) => {
    const targetStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    if (!window.confirm(`Are you sure you want to change status to ${targetStatus}?`)) return;

    const token = getCookie('admin_token') || localStorage.getItem('admin_token') || 'TEST_ADMIN_TOKEN';
    try {
      const res = await fetch(`${apiBase}/admin/tenants/${id}/suspend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: targetStatus })
      });
      if (!res.ok) throw new Error('Suspension change failed');
      fetchData();
      if (selectedTenant && selectedTenant.id === id) {
        setSelectedTenant(prev => prev ? { ...prev, status: targetStatus } : null);
      }
    } catch (e) {
      alert('Failed to suspend/activate tenant.');
    }
  };

  // Generate API key
  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyTenant || !newKeyName) {
      alert('Tenant and Key Name are required');
      return;
    }

    const token = getCookie('admin_token') || localStorage.getItem('admin_token') || 'TEST_ADMIN_TOKEN';
    try {
      const res = await fetch(`${apiBase}/admin/api-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tenant_id: newKeyTenant,
          name: newKeyName,
          tpm_limit: newKeyTpm,
          rpm_limit: newKeyRpm
        })
      });
      if (!res.ok) throw new Error('Key generation failed');
      const data = await res.json();
      setGeneratedPlainKey(data.key.plaintext);
      
      // Reset inputs
      setNewKeyName('');
      setNewKeyTpm(100000);
      setNewKeyRpm(100);
      
      fetchData();
    } catch (err) {
      alert('Failed to generate key.');
    }
  };

  // Revoke API key
  const handleRevokeKey = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently revoke this API key? Apps calling via this key will fail.')) return;

    const token = getCookie('admin_token') || localStorage.getItem('admin_token') || 'TEST_ADMIN_TOKEN';
    try {
      const res = await fetch(`${apiBase}/admin/api-keys/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Key revocation failed');
      fetchData();
    } catch (err) {
      alert('Failed to revoke API key.');
    }
  };


  // Filtered violations
  const filteredViolations = violations.filter(v => {
    const matchTenant = v.tenant.toLowerCase().includes(filterTenant.toLowerCase());
    const matchPlan = filterPlan ? v.endpoint.includes(filterPlan) : true;
    return matchTenant && matchPlan;
  });

  return (
    <div className="space-y-10">
      
      {/* Visual Analytics Graphs */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* SVG Line Chart: tokens in vs. out (last 7 days) */}
        <div className="bg-gray-900/40 border border-gray-800/80 p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Aggregated token consumption</h3>
              <p className="text-[10px] text-gray-500 mt-0.5">Tokens in vs. out across last 7 days</p>
            </div>
            <TrendingUp className="w-5 h-5 text-indigo-500" />
          </div>

          <div className="h-44 w-full relative flex items-end">
            <svg className="w-full h-full" viewBox="0 0 500 160" preserveAspectRatio="none">
              {/* Gridlines */}
              <line x1="0" y1="30" x2="500" y2="30" stroke="rgba(255,255,255,0.05)" />
              <line x1="0" y1="80" x2="500" y2="80" stroke="rgba(255,255,255,0.05)" />
              <line x1="0" y1="130" x2="500" y2="130" stroke="rgba(255,255,255,0.05)" />

              {/* Tokens In (Purple) */}
              <path
                d="M10 140 L90 100 L170 120 L250 70 L330 90 L410 40 L490 30"
                fill="none"
                stroke="#6366f1"
                strokeWidth="2.5"
              />

              {/* Tokens Out (Green) */}
              <path
                d="M10 130 L90 70 L170 90 L250 50 L330 60 L410 30 L490 20"
                fill="none"
                stroke="#22c55e"
                strokeWidth="2.5"
              />
            </svg>
          </div>
          <div className="flex justify-between px-2 text-[10px] text-gray-400 mt-2 font-mono">
            <span>7d ago</span>
            <span>5d ago</span>
            <span>3d ago</span>
            <span>Today</span>
          </div>
          <div className="flex gap-4 mt-3 text-xs justify-center font-semibold">
            <span className="flex items-center gap-1.5 text-indigo-400">
              <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full" />
              Prompt (In)
            </span>
            <span className="flex items-center gap-1.5 text-green-400">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full" />
              Generation (Out)
            </span>
          </div>
        </div>

        {/* SVG Bar Chart: top 10 tenants by tokens */}
        <div className="bg-gray-900/40 border border-gray-800/80 p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Top 10 tenants by token usage</h3>
              <p className="text-[10px] text-gray-500 mt-0.5">Active consumption rank this billing cycle</p>
            </div>
            <CreditCard className="w-5 h-5 text-indigo-500" />
          </div>

          <div className="space-y-3 mt-4">
            {tenants.slice(0, 3).map((t, idx) => (
              <div key={t.id} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-gray-300">{idx + 1}. {t.name}</span>
                  <span className="text-gray-400 font-mono">{(t.tokens_used / 1000).toFixed(0)}K tokens</span>
                </div>
                <div className="w-full bg-gray-950 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                    style={{ width: `${Math.min(100, (t.tokens_used / 4000000) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tenant Table */}
      <section className="bg-gray-900/40 border border-gray-800/80 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-lg font-black text-white">Tenant Directory Registry</h2>
          <p className="text-xs text-gray-500 mt-1">Manage tenant configurations, token caps, and active subscriptions.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-950/50 border-b border-gray-800 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-4 px-6">Tenant ID</th>
                <th className="py-4 px-6">Name</th>
                <th className="py-4 px-6">Plan</th>
                <th className="py-4 px-6">Tokens Consumed</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-sm">
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-gray-800/10 text-gray-300 transition-all">
                  <td className="py-4 px-6 font-mono text-xs text-indigo-400 font-semibold">
                    <button 
                      onClick={() => copyToClipboard(t.id)}
                      className="flex items-center gap-1.5 hover:text-indigo-300"
                    >
                      {t.id.substring(0, 8)}...
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </td>
                  <td className="py-4 px-6 font-bold text-white">{t.name}</td>
                  <td className="py-4 px-6">
                    <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs rounded font-bold uppercase">
                      {t.plan}
                    </span>
                  </td>
                  <td className="py-4 px-6 font-mono text-xs">{(t.tokens_used).toLocaleString()} tokens</td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${
                      t.status === 'active' 
                        ? 'bg-green-950/20 border-green-900/30 text-green-400' 
                        : 'bg-red-950/20 border-red-900/30 text-red-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
                      {t.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right space-x-2">
                    <button 
                      onClick={() => setSelectedTenant(t)}
                      className="px-2.5 py-1 bg-gray-850 hover:bg-gray-800 border border-gray-800 rounded text-xs font-semibold"
                    >
                      View
                    </button>
                    <button 
                      onClick={() => {
                        const nextPlan = prompt('Enter plan (SOLO, TEAM, BUSINESS, ENTERPRISE):', t.plan);
                        if (nextPlan) handleUpdatePlan(t.id, nextPlan.toUpperCase());
                      }}
                      className="px-2.5 py-1 bg-gray-850 hover:bg-gray-800 border border-gray-800 rounded text-xs font-semibold text-amber-400"
                    >
                      Edit Plan
                    </button>
                    <button 
                      onClick={() => handleToggleSuspend(t.id, t.status)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold border ${
                        t.status === 'suspended'
                          ? 'bg-green-950/20 hover:bg-green-900/20 border-green-900/30 text-green-400'
                          : 'bg-red-950/20 hover:bg-red-900/20 border-red-900/30 text-red-400'
                      }`}
                    >
                      {t.status === 'suspended' ? 'Activate' : 'Suspend'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Drawer for Tenant details */}
      {selectedTenant && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-gray-900 border-l border-gray-800 p-6 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-white">Tenant Audit Record</h3>
                <button onClick={() => setSelectedTenant(null)} className="p-1 hover:bg-gray-800 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-sm">
                <div className="p-3 bg-gray-950/50 rounded-xl border border-gray-800">
                  <span className="text-xs text-gray-500 block">Name</span>
                  <span className="text-white font-bold">{selectedTenant.name}</span>
                </div>

                <div className="p-3 bg-gray-950/50 rounded-xl border border-gray-800">
                  <span className="text-xs text-gray-500 block">Unique Slug</span>
                  <span className="text-indigo-400 font-mono">{selectedTenant.slug}</span>
                </div>

                <div className="p-3 bg-gray-950/50 rounded-xl border border-gray-800">
                  <span className="text-xs text-gray-500 block">Active Users</span>
                  <span className="text-white font-semibold">{selectedTenant.user_count}</span>
                </div>

                <div className="p-3 bg-gray-950/50 rounded-xl border border-gray-800">
                  <span className="text-xs text-gray-500 block">Cumulative Tokens Used</span>
                  <span className="text-white font-mono">{selectedTenant.tokens_used.toLocaleString()}</span>
                </div>

                <div className="p-3 bg-gray-950/50 rounded-xl border border-gray-800">
                  <span className="text-xs text-gray-500 block">Plan & Pricing Class</span>
                  <span className="text-white font-semibold">{selectedTenant.plan}</span>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setSelectedTenant(null)}
              className="w-full py-2.5 bg-gray-850 hover:bg-gray-800 border border-gray-800 text-sm font-semibold rounded-xl"
            >
              Close Drawer
            </button>
          </div>
        </div>
      )}

      {/* Rate Limit Violations, Billing Reconciliation and Payment Webhooks */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Violations Table */}
        <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-gray-800 flex justify-between items-center gap-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Rate Limit Violations</h3>
              <p className="text-[10px] text-gray-500 mt-0.5">Logs of throttled client requests</p>
            </div>
            <input
              type="text"
              className="px-2.5 py-1 bg-gray-950 border border-gray-800 text-xs rounded outline-none focus:border-indigo-500"
              placeholder="Search Tenant..."
              value={filterTenant}
              onChange={(e) => setFilterTenant(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-950/50 border-b border-gray-800 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Tenant</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Endpoint</th>
                  <th className="py-3 px-4">limit</th>
                  <th className="py-3 px-4">actual</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-gray-300">
                {filteredViolations.map((v, i) => (
                  <tr key={i} className="hover:bg-gray-800/10">
                    <td className="py-3 px-4 font-bold text-white">{v.tenant}</td>
                    <td className="py-3 px-4 text-gray-500">{new Date(v.timestamp).toLocaleTimeString()}</td>
                    <td className="py-3 px-4 font-mono">{v.endpoint}</td>
                    <td className="py-3 px-4 font-mono">{v.limit}</td>
                    <td className="py-3 px-4 font-mono text-red-400">{v.actual}</td>
                    <td className="py-3 px-4 text-right font-semibold text-amber-500">{v.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Billing Reconciliation */}
        <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-gray-800">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Billing Reconciliation Audit</h3>
            <p className="text-[10px] text-gray-500 mt-0.5">Audits Razorpay transactions vs credited tokens</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-950/50 border-b border-gray-800 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Tenant</th>
                  <th className="py-3 px-4">Razorpay ID</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Credit status</th>
                  <th className="py-3 px-4 text-right">Flags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-gray-300">
                {reconcile.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-800/10">
                    <td className="py-3 px-4 font-bold text-white">{r.tenant}</td>
                    <td className="py-3 px-4 font-mono text-gray-500">{r.razorpay_id}</td>
                    <td className="py-3 px-4 font-mono font-bold">${r.amount.toFixed(2)}</td>
                    <td className="py-3 px-4 font-semibold text-green-400">{r.status}</td>
                    <td className="py-3 px-4 text-right">
                      {r.mismatch ? (
                        <span className="px-2 py-0.5 bg-red-950/30 border border-red-900/30 text-red-400 font-bold rounded text-[9px]">
                          MISMATCH ⚠️
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-green-950/30 border border-green-900/30 text-green-400 font-bold rounded text-[9px]">
                          OK ✓
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Webhook Audit Logs */}
        <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-5 border-b border-gray-800 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Live Payment Webhooks</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">Real-time Stripe & Razorpay webhooks audit stream</p>
              </div>
              <a 
                href="/admin/billing/providers"
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-xl shadow-sm transition-all"
              >
                Configure Providers
              </a>
            </div>

            {/* Provider Connection Status Board */}
            <div className="p-4 border-b border-gray-800 bg-gray-950/30 flex justify-between gap-4 text-[10px] font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 font-bold uppercase">Razorpay:</span>
                {providersActive.razorpay ? (
                  <span className="text-green-400 flex items-center gap-1">
                    ● Connected ({providersModes.razorpay === 'test' ? 'Test Mode' : 'Live Mode'})
                  </span>
                ) : (
                  <span className="text-gray-500">○ Disconnected</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 font-bold uppercase">Stripe:</span>
                {providersActive.stripe ? (
                  <span className="text-purple-400 flex items-center gap-1">
                    ● Connected ({providersModes.stripe === 'test' ? 'Test Mode' : 'Live Mode'})
                  </span>
                ) : (
                  <span className="text-gray-500">○ Disconnected</span>
                )}
              </div>
            </div>

            <div className="overflow-y-auto max-h-[300px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-950/50 border-b border-gray-800 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Event</th>
                    <th className="py-3 px-4">Amt</th>
                    <th className="py-3 px-4">Signature</th>
                    <th className="py-3 px-4 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 text-gray-300">
                  {webhooks.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-500 italic">No webhooks captured.</td>
                    </tr>
                  ) : (
                    webhooks.map((wh) => (
                      <tr key={wh.id} className="hover:bg-gray-800/10">
                        <td className="py-3 px-4">
                          <span className="font-bold block text-white text-[11px] truncate max-w-[120px]" title={wh.event_type}>
                            {wh.event_type}
                          </span>
                          <span className="text-[9px] text-gray-500 font-semibold uppercase">{wh.provider} · {wh.tenant_name}</span>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold">
                          {wh.provider === 'stripe' ? '$' : '₹'}{wh.amount}
                        </td>
                        <td className="py-3 px-4">
                          {wh.signature_verified ? (
                            <span className="text-green-400 font-bold" title="Signature verified">✅ verified</span>
                          ) : (
                            <span className="text-red-400 font-bold" title="Signature verification failed">❌ failed</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedWebhook(wh)}
                            className="px-2 py-0.5 bg-gray-850 hover:bg-gray-800 border border-gray-800 rounded text-[10px] font-bold text-indigo-400"
                          >
                            Payload
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </section>

      {/* API Key management panel section */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-8 mt-10">
        
        {/* Generate Key Form Card */}
        <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Generate Programmatic Key</h3>
            <p className="text-[10px] text-gray-500 mb-6">Create isolated client credentials linked to specific tenant usage caps.</p>
            
            <form onSubmit={handleGenerateKey} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Tenant Owner</label>
                <select
                  required
                  className="w-full bg-gray-950 border border-gray-800 text-xs rounded-xl p-2.5 text-white"
                  value={newKeyTenant}
                  onChange={(e) => setNewKeyTenant(e.target.value)}
                >
                  <option value="">Select Tenant...</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Key Name / Label</label>
                <input
                  type="text"
                  required
                  className="w-full bg-gray-950 border border-gray-800 text-xs rounded-xl p-2.5 text-white"
                  placeholder="e.g. Production Frontend API"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">TPM Limit</label>
                  <input
                    type="number"
                    className="w-full bg-gray-950 border border-gray-800 text-xs rounded-xl p-2.5 text-white"
                    value={newKeyTpm}
                    onChange={(e) => setNewKeyTpm(parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">RPM Limit</label>
                  <input
                    type="number"
                    className="w-full bg-gray-950 border border-gray-800 text-xs rounded-xl p-2.5 text-white"
                    value={newKeyRpm}
                    onChange={(e) => setNewKeyRpm(parseInt(e.target.value))}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition-all mt-4"
              >
                Provision API Key
              </button>
            </form>
          </div>
        </div>

        {/* List Keys Card */}
        <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl overflow-hidden xl:col-span-2">
          <div className="p-5 border-b border-gray-800">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Active Client API Keys</h3>
            <p className="text-[10px] text-gray-500 mt-0.5">Programmatic API integration keys with strict token budgets.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-950/50 border-b border-gray-800 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Key Label</th>
                  <th className="py-3 px-4">Tenant</th>
                  <th className="py-3 px-4">Prefix</th>
                  <th className="py-3 px-4">TPM / RPM</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-gray-300">
                {apiKeys.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500 italic">No keys provisioned yet.</td>
                  </tr>
                ) : (
                  apiKeys.map((key) => (
                    <tr key={key.id} className="hover:bg-gray-800/10">
                      <td className="py-3 px-4 font-bold text-white">{key.name}</td>
                      <td className="py-3 px-4 text-gray-400">{key.tenant_name}</td>
                      <td className="py-3 px-4 font-mono text-indigo-400 font-semibold">{key.key_prefix}...</td>
                      <td className="py-3 px-4 font-mono text-gray-500">{key.tpm_limit.toLocaleString()} / {key.rpm_limit}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleRevokeKey(key.id)}
                          className="px-2 py-0.5 bg-red-950/20 border border-red-900/30 hover:bg-red-900/20 text-red-400 rounded text-[10px] font-bold transition-all"
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Generated Plain Key Modal Alert */}
      {generatedPlainKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-2xl relative">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 text-green-400 flex items-center gap-1.5">
              ✓ API Key Provisioned Successfully
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed mb-4">
              Here is your plaintext API integration token. Store this securely. **It will not be shown again.**
            </p>

            <div className="p-3 bg-gray-950 rounded-xl border border-gray-850 flex items-center justify-between gap-3 mb-5">
              <span className="font-mono text-xs text-indigo-400 break-all select-all font-semibold">{generatedPlainKey}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedPlainKey);
                  alert('API Key copied!');
                }}
                className="p-1.5 bg-gray-850 hover:bg-gray-800 rounded border border-gray-800 text-gray-400 hover:text-white"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => setGeneratedPlainKey(null)}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all"
            >
              I Have Saved the Key
            </button>
          </div>
        </div>
      )}

      {/* Webhook JSON Payload Modal Dialog */}
      {selectedWebhook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-2xl relative flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  🔍 Webhook Event Details
                </h3>
                <span className="text-[10px] text-gray-500 font-semibold">{selectedWebhook.event_id}</span>
              </div>
              <button
                onClick={() => setSelectedWebhook(null)}
                className="p-1 hover:bg-gray-800 text-gray-400 hover:text-white rounded"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 mb-5 text-xs text-gray-300 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-950/50 rounded-xl border border-gray-800">
                  <span className="text-[10px] text-gray-500 uppercase block font-bold">Event Type</span>
                  <span className="font-mono text-indigo-400 font-semibold">{selectedWebhook.event_type}</span>
                </div>
                <div className="p-3 bg-gray-950/50 rounded-xl border border-gray-800">
                  <span className="text-[10px] text-gray-500 uppercase block font-bold">Gateway Provider</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase inline-block mt-1 ${
                    selectedWebhook.provider === 'stripe' ? 'bg-purple-900/30 text-purple-400 border border-purple-800/40' : 'bg-blue-900/30 text-blue-400 border border-blue-800/40'
                  }`}>
                    {selectedWebhook.provider}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-950/50 rounded-xl border border-gray-800">
                  <span className="text-[10px] text-gray-500 uppercase block font-bold">Signature Verified</span>
                  <span className={`font-semibold inline-block mt-1 ${selectedWebhook.signature_verified ? 'text-green-400' : 'text-red-400'}`}>
                    {selectedWebhook.signature_verified ? '✅ Verified signature' : '❌ Signature Mismatch'}
                  </span>
                </div>
                <div className="p-3 bg-gray-950/50 rounded-xl border border-gray-800">
                  <span className="text-[10px] text-gray-500 uppercase block font-bold">Captured Header Type</span>
                  <span className="font-mono text-gray-400 font-semibold inline-block mt-1">
                    {selectedWebhook.provider === 'stripe' ? 'Stripe-Signature' : 'X-Razorpay-Signature'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-gray-950/50 rounded-xl border border-gray-800">
                <span className="text-[10px] text-gray-500 uppercase block font-bold">Raw Payload JSON</span>
                <pre className="font-mono text-[10px] text-gray-400 overflow-auto max-h-[30vh] p-2 bg-gray-950 rounded mt-1.5 border border-gray-850">
                  {JSON.stringify(selectedWebhook.payload, null, 2)}
                </pre>
              </div>

              {/* Redeliver and Mark Processed Overrides */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    alert('Webhook reprocessing trigger simulated successfully!');
                  }}
                  className="flex-1 py-2 bg-gray-850 hover:bg-gray-800 text-white text-xs font-semibold rounded-xl border border-gray-800 transition-all"
                >
                  🔄 Trigger Redelivery
                </button>
                <button
                  type="button"
                  onClick={() => {
                    alert('Event status updated to processed manually.');
                    setSelectedWebhook(null);
                  }}
                  className="flex-1 py-2 bg-green-950/20 hover:bg-green-900/20 text-green-400 text-xs font-semibold rounded-xl border border-green-900/30 transition-all"
                >
                  ✓ Force Process
                </button>
              </div>
            </div>

            <button
              onClick={() => setSelectedWebhook(null)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all"
            >
              Close Inspector
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
