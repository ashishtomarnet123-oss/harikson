'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, Eye, EyeOff, Copy, Trash2, CheckCircle, HelpCircle } from 'lucide-react';
import { getCookie } from 'cookies-next';

interface Provider {
  id: string;
  provider: 'stripe' | 'razorpay';
  name: string;
  merchant_id: string;
  is_active: boolean;
  is_test_mode: boolean;
  created_at: string;
  api_key_masked: string;
  api_secret_masked: string;
}

export default function BillingProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [providerType, setProviderType] = useState<'razorpay' | 'stripe'>('razorpay');
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [isTestMode, setIsTestMode] = useState(true);

  // Show/hide credentials toggles
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  const apiBase = '/api-proxy';
  const [copiedUrl, setCopiedUrl] = useState<'razorpay' | 'stripe' | null>(null);

  const getWebhookUrl = (type: 'razorpay' | 'stripe') => {
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol;
      const host = window.location.hostname;
      return `${protocol}//${host}:4008/webhooks/${type}`;
    }
    return `https://154.201.127.68:4008/webhooks/${type}`;
  };

  const fetchData = async () => {
    const token = getCookie('admin_token') || localStorage.getItem('admin_token') || 'TEST_ADMIN_TOKEN';
    try {
      const res = await fetch(`${apiBase}/admin/billing/providers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers || []);
      }
    } catch (err) {
      console.warn('Failed to fetch providers, running mock config values');
      setProviders([
        { id: '1', provider: 'razorpay', name: 'Bharat AI Razorpay', merchant_id: 'rzp_test_keyid', is_active: true, is_test_mode: true, created_at: new Date().toISOString(), api_key_masked: 'rzp_test****', api_secret_masked: 'secret****' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  

  useEffect(() => {
    fetchData();
  }, [apiBase]);

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const token = getCookie('admin_token') || localStorage.getItem('admin_token') || 'TEST_ADMIN_TOKEN';

    try {
      const res = await fetch(`${apiBase}/admin/billing/providers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          provider: providerType,
          name,
          api_key: apiKey,
          api_secret: apiSecret,
          webhook_secret: webhookSecret,
          merchant_id: merchantId,
          is_test_mode: isTestMode
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Validation API call failed');
      }

      alert('Payment provider validated & configured successfully!');
      setName('');
      setApiKey('');
      setApiSecret('');
      setWebhookSecret('');
      setMerchantId('');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to save configuration. Please verify API keys.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProvider = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this payment merchant configuration?')) return;
    const token = getCookie('admin_token') || localStorage.getItem('admin_token') || 'TEST_ADMIN_TOKEN';

    try {
      const res = await fetch(`${apiBase}/admin/billing/providers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Deactivation request failed');
      fetchData();
    } catch (err) {
      alert('Failed to delete provider.');
    }
  };

  const copyWebhookToClipboard = (type: 'razorpay' | 'stripe') => {
    const url = getWebhookUrl(type);
    navigator.clipboard.writeText(url);
    setCopiedUrl(type);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  return (
    <div className="space-y-10 p-6 max-w-7xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <CreditCard className="w-7 h-7 text-indigo-500" />
          Live Payment Providers Manager
        </h1>
        <p className="text-xs text-slate-500 mt-1">Configure credentials for Razorpay (INR subscriptions) and Stripe (USD Global payments).</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Column */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">Connect Account</h3>
            <p className="text-[10px] text-slate-500 mb-6 font-medium">Validates credentials with a live sandbox ping before storing.</p>

            <form onSubmit={handleSaveProvider} className="space-y-4">
              {/* Type Radio */}
              <div>
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Merchant Provider</span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input 
                      type="radio" 
                      name="provider" 
                      value="razorpay" 
                      checked={providerType === 'razorpay'} 
                      onChange={() => setProviderType('razorpay')}
                    />
                    Razorpay (India)
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input 
                      type="radio" 
                      name="provider" 
                      value="stripe" 
                      checked={providerType === 'stripe'} 
                      onChange={() => setProviderType('stripe')}
                    />
                    Stripe (Global)
                  </label>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Account Label</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Bharat AI Sandbox"
                  className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl p-2.5 text-slate-800"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Merchant ID */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  {providerType === 'razorpay' ? 'Razorpay Key ID' : 'Stripe Account ID / Account Name'}
                </label>
                <input 
                  type="text" 
                  required
                  placeholder={providerType === 'razorpay' ? 'rzp_test_xxxx' : 'acct_xxxx'}
                  className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl p-2.5 text-slate-800"
                  value={merchantId}
                  onChange={(e) => setMerchantId(e.target.value)}
                />
              </div>

              {/* API Key */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  {providerType === 'razorpay' ? 'Razorpay Key ID (Same as Key ID)' : 'Stripe publishable Key'}
                </label>
                <div className="relative">
                  <input 
                    type={showApiKey ? 'text' : 'password'} 
                    required
                    placeholder="pk_test_xxxx"
                    className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl p-2.5 pr-10 text-slate-800"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* API Secret */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  {providerType === 'razorpay' ? 'Key Secret' : 'Stripe Secret Key (sk_test)'}
                </label>
                <div className="relative">
                  <input 
                    type={showApiSecret ? 'text' : 'password'} 
                    required
                    placeholder={providerType === 'razorpay' ? 'secret_xxxx' : 'sk_test_xxxx'}
                    className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl p-2.5 pr-10 text-slate-800"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowApiSecret(!showApiSecret)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showApiSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Webhook Secret */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Webhook Signing Secret</label>
                <div className="relative">
                  <input 
                    type={showWebhookSecret ? 'text' : 'password'} 
                    required
                    placeholder="whsec_xxxx"
                    className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl p-2.5 pr-10 text-slate-800"
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center justify-between py-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-xs font-semibold text-slate-700">Sandbox Test Mode</span>
                <input 
                  type="checkbox" 
                  checked={isTestMode} 
                  onChange={(e) => setIsTestMode(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 cursor-pointer"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition-all mt-4 disabled:opacity-50"
              >
                {submitting ? 'Verifying Credentials...' : 'Validate & Save Merchant'}
              </button>
            </form>
          </div>
        </div>

        {/* Configurations list & Webhooks Config instructions */}
        <div className="lg:col-span-2 space-y-8">
          {/* Active List */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Configured Merchants</h3>
              <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Currently active transaction handlers.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Label</th>
                    <th className="py-3 px-4">Provider</th>
                    <th className="py-3 px-4">Merchant ID</th>
                    <th className="py-3 px-4">Environment</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {providers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 italic">No configured providers active.</td>
                    </tr>
                  ) : (
                    providers.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/40">
                        <td className="py-3 px-4 font-bold text-slate-900">{p.name}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase ${
                            p.provider === 'stripe' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {p.provider}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono">{p.merchant_id}</td>
                        <td className="py-3 px-4 font-semibold">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            p.is_test_mode ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {p.is_test_mode ? 'Test Mode' : 'Live Mode'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteProvider(p.id)}
                            className="p-1 hover:bg-red-50 text-red-500 rounded border border-transparent hover:border-red-100"
                            title="Disconnect Merchant"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Webhooks config panel */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Gateway Webhook Integration</h3>
              <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Copy these callback urls to your payment provider dashboard keys settings.</p>
            </div>

            {/* Razorpay Box */}
            <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Razorpay webhook endpoint</span>
                <button
                  onClick={() => copyWebhookToClipboard('razorpay')}
                  className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 shadow-sm"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedUrl === 'razorpay' ? 'Copied ✓' : 'Copy URL'}
                </button>
              </div>
              <div className="bg-slate-100/60 border border-slate-200 p-2.5 rounded font-mono text-[11px] text-slate-600 break-all select-all">
                {getWebhookUrl('razorpay')}
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                <strong>Dashboard configuration</strong>: Add webhooks in settings. Subscribe to <code>subscription.activated</code>, <code>subscription.charged</code>, <code>subscription.cancelled</code>, <code>invoice.paid</code>, <code>payment.failed</code> events.
              </p>
            </div>

            {/* Stripe Box */}
            <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Stripe webhook endpoint</span>
                <button
                  onClick={() => copyWebhookToClipboard('stripe')}
                  className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 shadow-sm"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedUrl === 'stripe' ? 'Copied ✓' : 'Copy URL'}
                </button>
              </div>
              <div className="bg-slate-100/60 border border-slate-200 p-2.5 rounded font-mono text-[11px] text-slate-600 break-all select-all">
                {getWebhookUrl('stripe')}
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                <strong>Dashboard configuration</strong>: Create webhook endpoints. Listen for <code>customer.subscription.created</code>, <code>customer.subscription.updated</code>, <code>invoice.paid</code>, <code>invoice.payment_failed</code>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
