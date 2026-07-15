'use client';
import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
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
  const [providerType, setProviderType] = useState<'razorpay' | 'stripe'>(
    'razorpay'
  );
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
  const [copiedUrl, setCopiedUrl] = useState<'razorpay' | 'stripe' | null>(
    null
  );

  const getWebhookUrl = (type: 'razorpay' | 'stripe') => {
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol;
      const host = window.location.hostname;
      return `${protocol}//${host}:4008/webhooks/${type}`;
    }
    return `https://154.201.127.68:4008/webhooks/${type}`;
  };

  const fetchData = async () => {
    const token =
      getCookie('admin_token') ||
      localStorage.getItem('admin_token') ||
      'TEST_ADMIN_TOKEN';
    try {
      const res = await fetch(`${apiBase}/admin/billing/providers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers || []);
      }
    } catch (err) {
      console.warn('Failed to fetch providers, running mock config values');
      setProviders([
        {
          id: '1',
          provider: 'razorpay',
          name: 'Bharat AI Razorpay',
          merchant_id: 'rzp_test_keyid',
          is_active: true,
          is_test_mode: true,
          created_at: new Date().toISOString(),
          api_key_masked: 'rzp_test****',
          api_secret_masked: 'secret****',
        },
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
    const token =
      getCookie('admin_token') ||
      localStorage.getItem('admin_token') ||
      'TEST_ADMIN_TOKEN';

    try {
      const res = await fetch(`${apiBase}/admin/billing/providers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          provider: providerType,
          name,
          api_key: apiKey,
          api_secret: apiSecret,
          webhook_secret: webhookSecret,
          merchant_id: merchantId,
          is_test_mode: isTestMode,
        }),
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
      alert(
        err.message || 'Failed to save configuration. Please verify API keys.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProvider = async (id: string) => {
    if (
      !confirm(
        'Are you sure you want to deactivate this payment merchant configuration?'
      )
    )
      return;
    const token =
      getCookie('admin_token') ||
      localStorage.getItem('admin_token') ||
      'TEST_ADMIN_TOKEN';

    try {
      const res = await fetch(`${apiBase}/admin/billing/providers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
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
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      {/* Title block */}
      <div className="pb-5 border-b border-gray-100">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
          <CreditCard className="w-7 h-7 text-blue-600 shrink-0" /> Live Payment
          Providers Manager
        </h1>
        <p className="text-gray-500 mt-1.5 text-sm sm:text-base">
          Configure credentials for Razorpay (INR subscriptions) and Stripe (USD
          Global payments).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Column */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900 uppercase tracking-wider mb-1">
              Connect Account
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              Validates credentials with a live sandbox ping before storing.
            </p>

            <form onSubmit={handleSaveProvider} className="space-y-4">
              {/* Type Radio */}
              <div>
                <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Merchant Provider
                </span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="provider"
                      value="razorpay"
                      checked={providerType === 'razorpay'}
                      onChange={() => setProviderType('razorpay')}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span>Razorpay (India)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="provider"
                      value="stripe"
                      checked={providerType === 'stripe'}
                      onChange={() => setProviderType('stripe')}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span>Stripe (Global)</span>
                  </label>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Account Label
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bharat AI Sandbox"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Merchant ID */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  {providerType === 'razorpay'
                    ? 'Razorpay Key ID'
                    : 'Stripe Account ID / Account Name'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    providerType === 'razorpay' ? 'rzp_test_xxxx' : 'acct_xxxx'
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                  value={merchantId}
                  onChange={(e) => setMerchantId(e.target.value)}
                />
              </div>

              {/* API Key */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  {providerType === 'razorpay'
                    ? 'Razorpay Key ID (Same as Key ID)'
                    : 'Stripe Publishable Key'}
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    required
                    placeholder="pk_test_xxxx"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 pr-10 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    style={{ color: '#475569' }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showApiKey ? (
                      <EyeOff className="w-4 h-4 text-slate-600" />
                    ) : (
                      <Eye className="w-4 h-4 text-slate-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* API Secret */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  {providerType === 'razorpay'
                    ? 'Key Secret'
                    : 'Stripe Secret Key (sk_test)'}
                </label>
                <div className="relative">
                  <input
                    type={showApiSecret ? 'text' : 'password'}
                    required
                    placeholder={
                      providerType === 'razorpay'
                        ? 'secret_xxxx'
                        : 'sk_test_xxxx'
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 pr-10 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiSecret(!showApiSecret)}
                    style={{ color: '#475569' }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showApiSecret ? (
                      <EyeOff className="w-4 h-4 text-slate-600" />
                    ) : (
                      <Eye className="w-4 h-4 text-slate-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Webhook Secret */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Webhook Signing Secret
                </label>
                <div className="relative">
                  <input
                    type={showWebhookSecret ? 'text' : 'password'}
                    required
                    placeholder="whsec_xxxx"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 pr-10 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                    style={{ color: '#475569' }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showWebhookSecret ? (
                      <EyeOff className="w-4 h-4 text-slate-600" />
                    ) : (
                      <Eye className="w-4 h-4 text-slate-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Mode Toggle */}
              <label className="flex items-center justify-between p-3 bg-gray-50/50 rounded-xl border border-gray-100 cursor-pointer select-none">
                <span className="text-xs font-semibold text-gray-700">
                  Sandbox Test Mode
                </span>
                <input
                  type="checkbox"
                  checked={isTestMode}
                  onChange={(e) => setIsTestMode(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all mt-4 disabled:opacity-50"
              >
                {submitting
                  ? 'Verifying Credentials...'
                  : 'Validate & Save Merchant'}
              </button>
            </form>
          </div>
        </div>

        {/* Configurations list & Webhooks Config instructions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active List */}
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-base font-bold text-gray-900 uppercase tracking-wider">
                Configured Merchants
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Currently active transaction handlers.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/25 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3.5 px-5">Label</th>
                    <th className="py-3.5 px-5">Provider</th>
                    <th className="py-3.5 px-5">Merchant ID</th>
                    <th className="py-3.5 px-5">Environment</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {providers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-12 text-center text-gray-400 font-medium"
                      >
                        No configured providers active.
                      </td>
                    </tr>
                  ) : (
                    providers.map((p) => (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="py-4 px-5 font-bold text-gray-900">
                          {p.name}
                        </td>
                        <td className="py-4 px-5">
                          <span
                            className={`px-2.5 py-0.5 text-[10px] font-bold rounded-lg border uppercase ${
                              p.provider === 'stripe'
                                ? 'bg-purple-50 text-purple-700 border-purple-100'
                                : 'bg-blue-50 text-blue-700 border-blue-100'
                            }`}
                          >
                            {p.provider}
                          </span>
                        </td>
                        <td className="py-4 px-5 font-mono text-gray-600">
                          {p.merchant_id}
                        </td>
                        <td className="py-4 px-5">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border uppercase ${
                              p.is_test_mode
                                ? 'bg-gray-50 text-gray-600 border-gray-100'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            }`}
                          >
                            {p.is_test_mode ? 'Test Mode' : 'Live Mode'}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-right">
                          <button
                            onClick={() => handleDeleteProvider(p.id)}
                            style={{ color: '#E11D48' }}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-lg shadow-xs transition-all"
                            title="Disconnect Merchant"
                          >
                            <Trash2
                              className="w-4 h-4"
                              style={{ color: '#E11D48' }}
                            />
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
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-bold text-gray-900 uppercase tracking-wider">
                Gateway Webhook Integration
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Copy these callback urls to your payment provider dashboard keys
                settings.
              </p>
            </div>

            {/* Razorpay Box */}
            <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-xl space-y-3">
              <div className="flex justify-between items-center gap-4">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                  Razorpay webhook endpoint
                </span>
                <button
                  onClick={() => copyWebhookToClipboard('razorpay')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-sm transition-all"
                >
                  <Copy className="w-3.5 h-3.5 text-white" />
                  <span>
                    {copiedUrl === 'razorpay' ? 'Copied ✓' : 'Copy URL'}
                  </span>
                </button>
              </div>
              <div className="bg-white border border-gray-200 p-2.5 rounded-xl font-mono text-xs text-gray-600 break-all select-all shadow-inner">
                {getWebhookUrl('razorpay')}
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                <strong>Dashboard configuration</strong>: Add webhooks in
                settings. Subscribe to <code>subscription.activated</code>,{' '}
                <code>subscription.charged</code>,{' '}
                <code>subscription.cancelled</code>, <code>invoice.paid</code>,{' '}
                <code>payment.failed</code> events.
              </p>
            </div>

            {/* Stripe Box */}
            <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-xl space-y-3">
              <div className="flex justify-between items-center gap-4">
                <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">
                  Stripe webhook endpoint
                </span>
                <button
                  onClick={() => copyWebhookToClipboard('stripe')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-sm transition-all"
                >
                  <Copy className="w-3.5 h-3.5 text-white" />
                  <span>
                    {copiedUrl === 'stripe' ? 'Copied ✓' : 'Copy URL'}
                  </span>
                </button>
              </div>
              <div className="bg-white border border-gray-200 p-2.5 rounded-xl font-mono text-xs text-gray-600 break-all select-all shadow-inner">
                {getWebhookUrl('stripe')}
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                <strong>Dashboard configuration</strong>: Create webhook
                endpoints. Listen for <code>customer.subscription.created</code>
                , <code>customer.subscription.updated</code>,{' '}
                <code>invoice.paid</code>, <code>invoice.payment_failed</code>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
