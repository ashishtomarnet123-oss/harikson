'use client';

import React, { useState, useEffect } from 'react';
import {
  Users, CreditCard, Search, Settings, Copy, Info, DollarSign,
  TrendingUp, X, TrendingDown, Package, Plus, Edit2, Trash2,
  CheckCircle, XCircle, ToggleLeft, ToggleRight, Star, Zap,
  Shield, Crown, ChevronDown, ChevronUp, Save, AlertTriangle,
  Cpu, Database, Clock, Webhook, Code2, Lock, Key, Activity,
  AlertOctagon, Check
} from 'lucide-react';
import { getCookie } from 'cookies-next';

// ─── Interfaces ────────────────────────────────────────────────────────────────

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  user_count: number;
  tokens_used: number;
  created_at: string;
  price?: number;
  billing?: string;
  currency?: string;
  token_limit?: number;
  tenant_limit?: number;
  agent_limit?: number;
  features?: any;
  model_access?: string[];
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
  signature_verified?: boolean;
}

interface PlanFeature {
  key: string;
  label: string;
  type: 'boolean' | 'number' | 'text';
  value: boolean | number | string;
  icon: React.ElementType;
}

interface Plan {
  id: string;
  name: string;
  tier: 'starter' | 'professional' | 'enterprise';
  price: number;
  billing: 'monthly' | 'yearly' | 'custom';
  currency: 'INR' | 'USD';
  isActive: boolean;
  isRecommended: boolean;
  tokenLimit: number;
  tenantLimit: number;
  agentLimit: number;
  modelAccess: string[];
  features: PlanFeature[];
  description: string;
  createdAt: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const INITIAL_PLANS: Plan[] = [
  {
    id: 'starter', name: 'Starter', tier: 'starter', price: 0, billing: 'monthly',
    currency: 'INR', isActive: true, isRecommended: false, tokenLimit: 100000,
    tenantLimit: 1, agentLimit: 2, modelAccess: ['Harikson-3B'],
    description: 'Perfect for developers exploring Harikson AI.',
    createdAt: '2025-01-01T00:00:00Z',
    features: [
      { key: 'api_access', label: 'API Access', type: 'boolean', value: true, icon: Code2 },
      { key: 'webhook_logging', label: 'Webhook Logging', type: 'boolean', value: false, icon: Webhook },
      { key: 'rag_documents', label: 'RAG Documents Limit', type: 'number', value: 500, icon: Database },
      { key: 'audit_trail', label: 'Audit Trail', type: 'boolean', value: false, icon: Shield },
      { key: 'priority_support', label: 'Priority Support', type: 'boolean', value: false, icon: Star },
      { key: 'custom_models', label: 'Custom Model Fine-Tuning', type: 'boolean', value: false, icon: Cpu },
      { key: 'dpdp_compliance', label: 'DPDP Compliance', type: 'boolean', value: true, icon: Lock },
      { key: 'sla_hours', label: 'SLA Response (hours)', type: 'number', value: 72, icon: Clock },
    ]
  },
  {
    id: 'professional', name: 'Professional', tier: 'professional', price: 4999,
    billing: 'monthly', currency: 'INR', isActive: true, isRecommended: true,
    tokenLimit: 5000000, tenantLimit: 10, agentLimit: 20,
    modelAccess: ['Harikson-3B', 'Qwen3-8B', 'Qwen3-32B', 'Qwen3-72B'],
    description: 'For growing teams needing full AI capabilities.',
    createdAt: '2025-01-01T00:00:00Z',
    features: [
      { key: 'api_access', label: 'API Access', type: 'boolean', value: true, icon: Code2 },
      { key: 'webhook_logging', label: 'Webhook Logging', type: 'boolean', value: true, icon: Webhook },
      { key: 'rag_documents', label: 'RAG Documents Limit', type: 'number', value: 50000, icon: Database },
      { key: 'audit_trail', label: 'Audit Trail', type: 'boolean', value: true, icon: Shield },
      { key: 'priority_support', label: 'Priority Support', type: 'boolean', value: true, icon: Star },
      { key: 'custom_models', label: 'Custom Model Fine-Tuning', type: 'boolean', value: false, icon: Cpu },
      { key: 'dpdp_compliance', label: 'DPDP Compliance', type: 'boolean', value: true, icon: Lock },
      { key: 'sla_hours', label: 'SLA Response (hours)', type: 'number', value: 12, icon: Clock },
    ]
  },
  {
    id: 'enterprise', name: 'Enterprise', tier: 'enterprise', price: 0,
    billing: 'custom', currency: 'INR', isActive: true, isRecommended: false,
    tokenLimit: -1, tenantLimit: -1, agentLimit: -1,
    modelAccess: ['Harikson-3B', 'Qwen3-8B', 'Qwen3-32B', 'Qwen3-72B', 'Custom Fine-Tuned'],
    description: 'Full sovereignty, on-premise deployment for enterprises.',
    createdAt: '2025-01-01T00:00:00Z',
    features: [
      { key: 'api_access', label: 'API Access', type: 'boolean', value: true, icon: Code2 },
      { key: 'webhook_logging', label: 'Webhook Logging', type: 'boolean', value: true, icon: Webhook },
      { key: 'rag_documents', label: 'RAG Documents Limit', type: 'number', value: -1, icon: Database },
      { key: 'audit_trail', label: 'Audit Trail', type: 'boolean', value: true, icon: Shield },
      { key: 'priority_support', label: 'Priority Support', type: 'boolean', value: true, icon: Star },
      { key: 'custom_models', label: 'Custom Model Fine-Tuning', type: 'boolean', value: true, icon: Cpu },
      { key: 'dpdp_compliance', label: 'DPDP Compliance', type: 'boolean', value: true, icon: Lock },
      { key: 'sla_hours', label: 'SLA Response (hours)', type: 'number', value: 2, icon: Clock },
    ]
  }
];

const TIER_META: Record<string, { color: string; bg: string; border: string; icon: React.ElementType; badge: string }> = {
  starter:      { color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.1)', border: 'rgba(148, 163, 184, 0.2)', icon: Zap,   badge: 'FREE' },
  professional: { color: '#6366F1', bg: 'rgba(99, 102, 241, 0.1)', border: 'rgba(99, 102, 241, 0.2)', icon: Star,  badge: 'GROWTH' },
  enterprise:   { color: '#A855F7', bg: 'rgba(168, 85, 247, 0.1)', border: 'rgba(168, 85, 247, 0.2)', icon: Crown, badge: 'CUSTOM' },
};

const AVAILABLE_MODELS = ['Harikson-3B', 'Qwen3-8B', 'Qwen3-32B', 'Qwen3-72B', 'Custom Fine-Tuned', 'Mistral-7B', 'Llama-3-8B'];

// ─── Sub-components ────────────────────────────────────────────────────────────

function FeatureValue({ feature }: { feature: PlanFeature }) {
  if (feature.type === 'boolean') {
    return feature.value
      ? <CheckCircle size={16} className="text-green-500" />
      : <XCircle size={16} className="text-gray-600" />;
  }
  const val = feature.value as number;
  return <span className="text-sm font-semibold text-white">{val === -1 ? '∞ Unlimited' : val.toLocaleString()}</span>;
}

function PlanEditModal({ plan, models, isNew = false, onSave, onClose }: {
  plan: Plan; models: string[]; isNew?: boolean;
  onSave: (p: Plan) => void; onClose: () => void;
}) {
  const [draft, setDraft] = useState<Plan>({ ...plan, features: plan.features.map(f => ({ ...f })) });
  const update = (field: keyof Plan, value: any) => setDraft(prev => ({ ...prev, [field]: value }));
  const toggleModel = (m: string) => {
    setDraft(prev => ({
      ...prev,
      modelAccess: prev.modelAccess.includes(m) ? prev.modelAccess.filter(x => x !== m) : [...prev.modelAccess, m]
    }));
  };
  const updateFeature = (key: string, value: any) => {
    setDraft(prev => ({ ...prev, features: prev.features.map(f => f.key === key ? { ...f, value } : f) }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl" style={{ maxHeight: '85vh' }}>
        <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-950/20">
          <h2 className="text-base font-bold text-white">{isNew ? 'Create New Plan' : `Edit Plan — ${plan.name}`}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded text-gray-500 hover:text-white transition"><X size={18} /></button>
        </div>
        <div className="flex-1 min-h-0 px-6 py-5 overflow-y-auto space-y-5 text-sm text-gray-300">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-semibold">Plan Name</label>
              <input value={draft.name} onChange={e => update('name', e.target.value)} className="w-full bg-gray-950 border border-gray-800 text-xs rounded-xl p-2.5 text-white outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-semibold">Tier</label>
              <select value={draft.tier} onChange={e => update('tier', e.target.value)} className="w-full bg-gray-950 border border-gray-800 text-xs rounded-xl p-2.5 text-white outline-none focus:border-indigo-500">
                <option value="starter">Starter</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-semibold">Price ({draft.currency})</label>
              <input type="number" value={draft.price} onChange={e => update('price', Number(e.target.value))} className="w-full bg-gray-950 border border-gray-800 text-xs rounded-xl p-2.5 text-white outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-semibold">Billing Cycle</label>
              <select value={draft.billing} onChange={e => update('billing', e.target.value)} className="w-full bg-gray-950 border border-gray-800 text-xs rounded-xl p-2.5 text-white outline-none focus:border-indigo-500">
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-semibold">Token Limit/month (-1 = unlimited)</label>
              <input type="number" value={draft.tokenLimit} onChange={e => update('tokenLimit', Number(e.target.value))} className="w-full bg-gray-950 border border-gray-800 text-xs rounded-xl p-2.5 text-white outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-semibold">Tenant Limit (-1 = unlimited)</label>
              <input type="number" value={draft.tenantLimit} onChange={e => update('tenantLimit', Number(e.target.value))} className="w-full bg-gray-950 border border-gray-800 text-xs rounded-xl p-2.5 text-white outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-semibold">Agent Limit (-1 = unlimited)</label>
              <input type="number" value={draft.agentLimit} onChange={e => update('agentLimit', Number(e.target.value))} className="w-full bg-gray-950 border border-gray-800 text-xs rounded-xl p-2.5 text-white outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-semibold">Currency</label>
              <select value={draft.currency} onChange={e => update('currency', e.target.value)} className="w-full bg-gray-950 border border-gray-800 text-xs rounded-xl p-2.5 text-white outline-none focus:border-indigo-500">
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-semibold">Description</label>
            <textarea value={draft.description} onChange={e => update('description', e.target.value)} rows={2} className="w-full bg-gray-950 border border-gray-800 text-xs rounded-xl p-2.5 text-white outline-none focus:border-indigo-500 resize-y" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Model Access</div>
            <div className="flex flex-wrap gap-2">
              {models.map(m => {
                const isSelected = draft.modelAccess.includes(m);
                return (
                  <button key={m} type="button" onClick={() => toggleModel(m)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    isSelected
                      ? 'bg-indigo-600/20 border border-indigo-500/50 text-indigo-400 font-bold'
                      : 'bg-gray-950 border border-gray-850 text-gray-400 hover:border-gray-800'
                  }`}>
                    {isSelected ? '✓ ' : ''}{m}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Feature Flags</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {draft.features.map(f => {
                const FIcon = f.icon;
                return (
                  <div key={f.key} className="flex items-center justify-between p-3 bg-gray-950/40 border border-gray-800/60 rounded-xl">
                    <div className="flex items-center gap-2">
                      <FIcon size={14} className="text-gray-500" />
                      <span className="text-xs font-semibold text-gray-300">{f.label}</span>
                    </div>
                    {f.type === 'boolean'
                      ? <button type="button" onClick={() => updateFeature(f.key, !f.value)} className={`text-2xl transition ${f.value ? 'text-indigo-400' : 'text-gray-600'}`}>
                          {f.value ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                        </button>
                      : <input type="number" value={f.value as number} onChange={e => updateFeature(f.key, Number(e.target.value))}
                          className="w-24 bg-gray-950 border border-gray-800 text-xs rounded-lg p-1.5 text-right text-white outline-none focus:border-indigo-500" />
                    }
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-800 bg-gray-950/20 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-gray-850 hover:bg-gray-800 border border-gray-800 rounded-xl text-xs font-semibold text-gray-400 transition">Cancel</button>
          <button onClick={() => onSave(draft)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition">
            <Save size={15} /> {isNew ? 'Create Plan' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

type ActiveTab = 'tenants' | 'plans' | 'apikeys' | 'webhooks';

export default function TenantPlanManager() {
  // ── Shared state ──
  const [activeTab, setActiveTab] = useState<ActiveTab>('tenants');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // ── Tenants state ──
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [reconcile, setReconcile] = useState<Reconciliation[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [editingTenantPlan, setEditingTenantPlan] = useState<Tenant | null>(null);
  const [tenantSearch, setTenantSearch] = useState('');
  const [filterTenant, setFilterTenant] = useState('');
  const [tenantStatusFilter, setTenantStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [tenantPlanFilter, setTenantPlanFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [showCreateTenantModal, setShowCreateTenantModal] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantSlug, setNewTenantSlug] = useState('');
  const [newTenantPlan, setNewTenantPlan] = useState('starter');

  const [editingTenantDetails, setEditingTenantDetails] = useState<Tenant | null>(null);
  const [editTenantName, setEditTenantName] = useState('');
  const [editTenantSlug, setEditTenantSlug] = useState('');

  // ── Plans state ──
  const [plans, setPlans] = useState<Plan[]>([]);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // ── API Key state ──
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyTenant, setNewKeyTenant] = useState('');
  const [newKeyTpm, setNewKeyTpm] = useState(100000);
  const [newKeyRpm, setNewKeyRpm] = useState(100);
  const [generatedPlainKey, setGeneratedPlainKey] = useState<string | null>(null);

  // ── Webhook state ──
  const [webhooks, setWebhooks] = useState<WebhookLog[]>([]);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookLog | null>(null);
  const [providersActive, setProvidersActive] = useState<{ razorpay: boolean; stripe: boolean }>({ razorpay: false, stripe: false });
  const [providersModes, setProvidersModes] = useState<{ razorpay: string; stripe: string }>({ razorpay: 'test', stripe: 'test' });

  const apiBase = '/api-proxy';

  // ── Toast helper ──
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Data fetching (single fetch for all state) ──
  const fetchData = async () => {
    const token = getCookie('admin_token') || localStorage.getItem('admin_token') || 'TEST_ADMIN_TOKEN';
    try {
      const [resPlans, resTenants, resViolations, resReconcile, resKeys, resWebhooks] = await Promise.allSettled([
        fetch(`${apiBase}/admin/plans`,                     { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${apiBase}/admin/tenants?page=1&limit=50`,   { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${apiBase}/admin/rate-limit-violations`,     { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${apiBase}/admin/billing/reconciliation`,    { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${apiBase}/admin/api-keys`,                  { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${apiBase}/admin/billing/webhooks`,          { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (resPlans.status === 'fulfilled' && resPlans.value.ok) {
        const d = await resPlans.value.json();
        const rawPlans = (d.plans || []).map((p: any) => ({
          id: p.id, name: p.name, tier: p.tier, price: Number(p.price),
          billing: p.billing, currency: p.currency, isActive: p.is_active,
          isRecommended: p.is_recommended, tokenLimit: p.token_limit,
          tenantLimit: p.tenant_limit, agentLimit: p.agent_limit,
          modelAccess: p.model_access || [], description: p.description,
          createdAt: p.created_at,
          features: [
            { key: 'api_access', label: 'API Access', type: 'boolean', value: p.features?.api_access !== false, icon: Code2 },
            { key: 'webhook_logging', label: 'Webhook Logging', type: 'boolean', value: !!p.features?.webhook_logging, icon: Webhook },
            { key: 'rag_documents', label: 'RAG Documents Limit', type: 'number', value: typeof p.features?.rag_documents === 'number' ? p.features.rag_documents : 500, icon: Database },
            { key: 'audit_trail', label: 'Audit Trail', type: 'boolean', value: !!p.features?.audit_trail, icon: Shield },
            { key: 'priority_support', label: 'Priority Support', type: 'boolean', value: !!p.features?.priority_support, icon: Star },
            { key: 'custom_models', label: 'Custom Model Fine-Tuning', type: 'boolean', value: !!p.features?.custom_models, icon: Cpu },
            { key: 'dpdp_compliance', label: 'DPDP Compliance', type: 'boolean', value: p.features?.dpdp_compliance !== false, icon: Lock },
            { key: 'sla_hours', label: 'SLA Response (hours)', type: 'number', value: typeof p.features?.sla_hours === 'number' ? p.features.sla_hours : 72, icon: Clock },
          ]
        }));
        setPlans(rawPlans.length ? rawPlans : INITIAL_PLANS);
      } else { setPlans(INITIAL_PLANS); }

      if (resTenants.status === 'fulfilled' && resTenants.value.ok) {
        const d = await resTenants.value.json(); setTenants(d.tenants || []);
      }
      if (resViolations.status === 'fulfilled' && resViolations.value.ok) {
        const d = await resViolations.value.json(); setViolations(d.violations || []);
      }
      if (resReconcile.status === 'fulfilled' && resReconcile.value.ok) {
        const d = await resReconcile.value.json(); setReconcile(d.billing || []);
      }
      if (resKeys.status === 'fulfilled' && resKeys.value.ok) {
        const d = await resKeys.value.json(); setApiKeys(d.keys || []);
      }
      if (resWebhooks.status === 'fulfilled' && resWebhooks.value.ok) {
        const d = await resWebhooks.value.json();
        setWebhooks(d.webhooks || []);
        if (d.providers_active) setProvidersActive(d.providers_active);
        if (d.providers_modes) setProvidersModes(d.providers_modes);
      }
    } catch (e) {
      console.warn('API unavailable, loading mock data', e);
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    setPlans(INITIAL_PLANS);
    setTenants([
      { id: 't-101', name: 'Alpha Tech', slug: 'alphatech', plan: 'professional', status: 'active', user_count: 12, tokens_used: 450000, created_at: new Date().toISOString() },
      { id: 't-102', name: 'Beta Systems', slug: 'betasystems', plan: 'enterprise', status: 'active', user_count: 34, tokens_used: 1200000, created_at: new Date().toISOString() },
      { id: 't-103', name: 'Gamma Digital', slug: 'gammadigital', plan: 'starter', status: 'suspended', user_count: 3, tokens_used: 15000, created_at: new Date().toISOString() },
      { id: 't-104', name: 'Delta Agency', slug: 'delta-agency', plan: 'enterprise', status: 'active', user_count: 58, tokens_used: 3500000, created_at: new Date().toISOString() }
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

  useEffect(() => { fetchData(); }, []);

  // ── Tenant actions ──
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    showToast('Tenant ID copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUpdatePlan = async (id: string, plan: string) => {
    const token = getCookie('admin_token') || localStorage.getItem('admin_token') || 'TEST_ADMIN_TOKEN';
    try {
      const res = await fetch(`${apiBase}/admin/tenants/${id}/plan`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan })
      });
      if (!res.ok) throw new Error('Update failed');
      const data = await res.json();
      if (data.success && data.tenant) {
        setTenants(prev => prev.map(t => t.id === id ? data.tenant : t));
        if (selectedTenant?.id === id) setSelectedTenant(data.tenant);
      } else { fetchData(); }
      showToast('Plan updated successfully');
    } catch { showToast('Failed to update tenant plan.', 'error'); }
  };

  const handleToggleSuspend = async (id: string, currentStatus: string) => {
    const targetStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    if (!window.confirm(`Change status to ${targetStatus}?`)) return;
    const token = getCookie('admin_token') || localStorage.getItem('admin_token') || 'TEST_ADMIN_TOKEN';
    try {
      const res = await fetch(`${apiBase}/admin/tenants/${id}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: targetStatus })
      });
      if (!res.ok) throw new Error('Failed');
      fetchData();
      if (selectedTenant?.id === id) setSelectedTenant(prev => prev ? { ...prev, status: targetStatus } : null);
      showToast(`Tenant ${targetStatus === 'active' ? 'activated' : 'suspended'}`);
    } catch { showToast('Failed to change tenant status.', 'error'); }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName || !newTenantSlug || !newTenantPlan) {
      showToast('Name, slug, and plan are required', 'error');
      return;
    }
    const token = getCookie('admin_token') || localStorage.getItem('admin_token') || 'TEST_ADMIN_TOKEN';
    try {
      const res = await fetch(`${apiBase}/admin/tenants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: newTenantName,
          slug: newTenantSlug,
          plan: newTenantPlan
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Tenant "${newTenantName}" created successfully!`);
        setShowCreateTenantModal(false);
        setNewTenantName('');
        setNewTenantSlug('');
        setNewTenantPlan('starter');
        fetchData();
      } else {
        showToast(data.error || 'Failed to create tenant', 'error');
      }
    } catch {
      showToast('API communication error', 'error');
    }
  };

  const handleOpenEditDetails = (t: Tenant) => {
    setEditingTenantDetails(t);
    setEditTenantName(t.name);
    setEditTenantSlug(t.slug);
  };

  const handleSaveTenantDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenantDetails) return;
    if (!editTenantName || !editTenantSlug) {
      showToast('Name and slug are required', 'error');
      return;
    }
    const token = getCookie('admin_token') || localStorage.getItem('admin_token') || 'TEST_ADMIN_TOKEN';
    try {
      const res = await fetch(`${apiBase}/admin/tenants/${editingTenantDetails.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: editTenantName,
          slug: editTenantSlug
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Tenant details updated successfully!');
        setEditingTenantDetails(null);
        fetchData();
        if (selectedTenant && selectedTenant.id === editingTenantDetails.id) {
          setSelectedTenant({ ...selectedTenant, name: editTenantName, slug: editTenantSlug });
        }
      } else {
        showToast(data.error || 'Failed to update tenant', 'error');
      }
    } catch {
      showToast('API communication error', 'error');
    }
  };

  // ── Plan actions ──
  const togglePlan = async (id: string) => {
    const plan = plans.find(p => p.id === id);
    if (!plan) return;
    const token = getCookie('admin_token') || localStorage.getItem('admin_token') || 'TEST_ADMIN_TOKEN';
    try {
      const res = await fetch(`${apiBase}/admin/plans/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_active: !plan.isActive })
      });
      if (res.ok) {
        setPlans(prev => prev.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p));
        showToast(`Plan "${plan.name}" ${plan.isActive ? 'deactivated' : 'activated'}`);
      } else { showToast('Failed to toggle plan status', 'error'); }
    } catch { showToast('API communication error', 'error'); }
  };

  const deletePlan = async (id: string) => {
    const plan = plans.find(p => p.id === id);
    if (!plan) return;
    const token = getCookie('admin_token') || localStorage.getItem('admin_token') || 'TEST_ADMIN_TOKEN';
    try {
      const res = await fetch(`${apiBase}/admin/plans/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setPlans(prev => prev.filter(p => p.id !== id));
        setDeleteConfirm(null);
        showToast(`Plan "${plan.name}" deleted`, 'error');
      } else { showToast('Failed to delete plan', 'error'); }
    } catch { showToast('API communication error', 'error'); }
  };

  const setRecommended = async (id: string) => {
    const token = getCookie('admin_token') || localStorage.getItem('admin_token') || 'TEST_ADMIN_TOKEN';
    try {
      await Promise.all(plans.map(p => {
        const checkRecommended = p.id === id;
        if (p.isRecommended !== checkRecommended) {
          return fetch(`${apiBase}/admin/plans/${p.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ is_recommended: checkRecommended })
          });
        }
      }));
      setPlans(prev => prev.map(p => ({ ...p, isRecommended: p.id === id })));
      showToast('Recommended plan updated');
    } catch { showToast('Failed to set recommended plan', 'error'); }
  };

  const savePlan = async (updated: Plan) => {
    const token = getCookie('admin_token') || localStorage.getItem('admin_token') || 'TEST_ADMIN_TOKEN';
    const featuresObj = updated.features.reduce((acc: any, f) => { acc[f.key] = f.value; return acc; }, {});
    try {
      const res = await fetch(`${apiBase}/admin/plans/${updated.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: updated.name, tier: updated.tier, price: updated.price,
          billing: updated.billing, currency: updated.currency,
          is_active: updated.isActive, is_recommended: updated.isRecommended,
          token_limit: updated.tokenLimit, tenant_limit: updated.tenantLimit,
          agent_limit: updated.agentLimit, model_access: updated.modelAccess,
          features: featuresObj, description: updated.description
        })
      });
      if (res.ok) {
        setPlans(prev => prev.map(p => p.id === updated.id ? updated : p));
        setEditingPlan(null);
        showToast(`Plan "${updated.name}" saved`);
      } else { showToast('Failed to save plan changes', 'error'); }
    } catch { showToast('API communication error', 'error'); }
  };

  const createPlan = async (newPlan: Plan) => {
    const token = getCookie('admin_token') || localStorage.getItem('admin_token') || 'TEST_ADMIN_TOKEN';
    const featuresObj = newPlan.features.reduce((acc: any, f) => { acc[f.key] = f.value; return acc; }, {});
    try {
      const res = await fetch(`${apiBase}/admin/plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id: newPlan.id || `plan_${Date.now()}`, name: newPlan.name, tier: newPlan.tier,
          price: newPlan.price, billing: newPlan.billing, currency: newPlan.currency,
          is_active: newPlan.isActive, is_recommended: newPlan.isRecommended,
          token_limit: newPlan.tokenLimit, tenant_limit: newPlan.tenantLimit,
          agent_limit: newPlan.agentLimit, model_access: newPlan.modelAccess,
          features: featuresObj, description: newPlan.description
        })
      });
      if (res.ok) {
        await fetchData();
        setShowCreateModal(false);
        showToast(`Plan "${newPlan.name}" created!`);
      } else { showToast('Failed to create plan', 'error'); }
    } catch { showToast('API communication error', 'error'); }
  };

  // ── API Key actions ──
  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyTenant || !newKeyName) { showToast('Tenant and Key Name are required', 'error'); return; }
    const token = getCookie('admin_token') || localStorage.getItem('admin_token') || 'TEST_ADMIN_TOKEN';
    try {
      const res = await fetch(`${apiBase}/admin/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tenant_id: newKeyTenant, name: newKeyName, tpm_limit: newKeyTpm, rpm_limit: newKeyRpm })
      });
      if (!res.ok) throw new Error('Key generation failed');
      const data = await res.json();
      setGeneratedPlainKey(data.key.plaintext);
      setNewKeyName(''); setNewKeyTpm(100000); setNewKeyRpm(100);
      fetchData();
    } catch { showToast('Failed to generate key.', 'error'); }
  };

  const handleRevokeKey = async (id: string) => {
    if (!window.confirm('Permanently revoke this API key? Apps using it will stop working.')) return;
    const token = getCookie('admin_token') || localStorage.getItem('admin_token') || 'TEST_ADMIN_TOKEN';
    try {
      const res = await fetch(`${apiBase}/admin/api-keys/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed');
      fetchData();
      showToast('API key revoked');
    } catch { showToast('Failed to revoke API key.', 'error'); }
  };

  // ── Derived values ──
  const filteredTenants = tenants.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(tenantSearch.toLowerCase()) ||
                          t.slug.toLowerCase().includes(tenantSearch.toLowerCase()) ||
                          t.id.toLowerCase().includes(tenantSearch.toLowerCase());
    const matchesStatus = tenantStatusFilter === 'all' ? true : t.status.toLowerCase() === tenantStatusFilter.toLowerCase();
    const matchesPlan = tenantPlanFilter === 'all' ? true : t.plan.toLowerCase() === tenantPlanFilter.toLowerCase();
    return matchesSearch && matchesStatus && matchesPlan;
  });
  const filteredViolations = violations.filter(v =>
    v.tenant.toLowerCase().includes(filterTenant.toLowerCase())
  );
  // Subscriber counts derived from shared tenants state — no extra fetch needed
  const subscriberCount = (planId: string) =>
    tenants.filter(t => t.plan.toLowerCase() === planId.toLowerCase()).length;

  const TABS: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
    { id: 'tenants',  label: 'Tenants',     icon: Users },
    { id: 'plans',    label: 'Plans',        icon: Package },
    { id: 'apikeys',  label: 'API Keys',     icon: Key },
    { id: 'webhooks', label: 'Webhooks',     icon: Webhook },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-400 text-sm">Loading management console...</div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          background: toast.type === 'success' ? '#22C55E' : '#EF4444',
          color: '#fff', padding: '12px 20px', borderRadius: 10,
          fontSize: 14, fontWeight: 500, boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.3s'
        }}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white">Subscription Management</h1>
          </div>
          <p className="text-gray-500 text-sm ml-13">Tenants, plans, API keys, and payment webhooks — all in one place.</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg font-mono">
            {tenants.length} tenants · {plans.length} plans
          </span>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Tenants',  value: tenants.length,                              color: '#6366F1', icon: Users },
          { label: 'Active Plans',   value: plans.filter(p => p.isActive).length,        color: '#22C55E', icon: Package },
          { label: 'API Keys',       value: apiKeys.length,                              color: '#F59E0B', icon: Key },
          { label: 'Paying Tenants', value: tenants.filter(t => t.plan !== 'starter').length, color: '#7C3AED', icon: CreditCard },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: s.color + '20' }}>
                <Icon size={18} style={{ color: s.color }} />
              </div>
              <div>
                <div className="text-2xl font-black text-white">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-gray-900/60 border border-gray-800 rounded-xl p-1 w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
              }`}
            >
              <Icon className="w-4 h-4" />{tab.label}
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════
          TAB: TENANTS
      ══════════════════════════════════════════ */}
      {activeTab === 'tenants' && (
        <div className="space-y-8">
          {/* Charts */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-900/40 border border-gray-800/80 p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Token Consumption</h3>
                  <p className="text-[10px] text-gray-500 mt-0.5">Prompt in vs. generation out — last 7 days</p>
                </div>
                <TrendingUp className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="h-44 w-full relative flex items-end">
                <svg className="w-full h-full" viewBox="0 0 500 160" preserveAspectRatio="none">
                  <line x1="0" y1="30" x2="500" y2="30" stroke="rgba(255,255,255,0.05)" />
                  <line x1="0" y1="80" x2="500" y2="80" stroke="rgba(255,255,255,0.05)" />
                  <line x1="0" y1="130" x2="500" y2="130" stroke="rgba(255,255,255,0.05)" />
                  <path d="M10 140 L90 100 L170 120 L250 70 L330 90 L410 40 L490 30" fill="none" stroke="#6366f1" strokeWidth="2.5" />
                  <path d="M10 130 L90 70 L170 90 L250 50 L330 60 L410 30 L490 20" fill="none" stroke="#22c55e" strokeWidth="2.5" />
                </svg>
              </div>
              <div className="flex justify-between px-2 text-[10px] text-gray-400 mt-2 font-mono">
                <span>7d ago</span><span>5d ago</span><span>3d ago</span><span>Today</span>
              </div>
              <div className="flex gap-4 mt-3 text-xs justify-center font-semibold">
                <span className="flex items-center gap-1.5 text-indigo-400"><span className="w-2.5 h-2.5 bg-indigo-500 rounded-full" />Prompt (In)</span>
                <span className="flex items-center gap-1.5 text-green-400"><span className="w-2.5 h-2.5 bg-green-500 rounded-full" />Generation (Out)</span>
              </div>
            </div>

            <div className="bg-gray-900/40 border border-gray-800/80 p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Top Tenants by Usage</h3>
                  <p className="text-[10px] text-gray-500 mt-0.5">Active consumption this billing cycle</p>
                </div>
                <CreditCard className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="space-y-3 mt-4">
                {tenants.slice(0, 4).map((t, idx) => (
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
          </section>          {/* Tenant table */}
          <section className="bg-gray-900/40 border border-gray-800/80 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-800 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-black text-white">Tenant Registry</h2>
                  <span className="px-2.5 py-0.5 bg-gray-800 border border-gray-700 text-gray-400 text-[10px] font-bold rounded-full">
                    {filteredTenants.length} {filteredTenants.length === 1 ? 'tenant' : 'tenants'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">Manage tenant configurations, token caps, and subscriptions.</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                {/* Create Tenant Button */}
                <button
                  onClick={() => setShowCreateTenantModal(true)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/10 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Tenant
                </button>

                {/* Status Filter */}
                <select
                  value={tenantStatusFilter}
                  onChange={e => setTenantStatusFilter(e.target.value as any)}
                  className="px-3 py-2 bg-gray-950 border border-gray-800 text-xs rounded-xl outline-none focus:border-indigo-500 text-gray-300 cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="suspended">Suspended Only</option>
                </select>

                {/* Plan Filter */}
                <select
                  value={tenantPlanFilter}
                  onChange={e => setTenantPlanFilter(e.target.value)}
                  className="px-3 py-2 bg-gray-950 border border-gray-800 text-xs rounded-xl outline-none focus:border-indigo-500 text-gray-300 cursor-pointer"
                >
                  <option value="all">All Plans</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>

                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    className="pl-9 pr-3 py-2 bg-gray-950 border border-gray-800 text-xs rounded-xl outline-none focus:border-indigo-500 text-gray-300 w-48"
                    placeholder="Search name, slug, ID..."
                    value={tenantSearch}
                    onChange={e => setTenantSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-950/50 border-b border-gray-800 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Tenant ID</th>
                    <th className="py-4 px-6">Name</th>
                    <th className="py-4 px-6">Plan</th>
                    <th className="py-4 px-6">Tokens Used</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 text-sm">
                  {filteredTenants.map(t => {
                    const planId = t.plan || '';
                    const planObj = plans.find(p => p.id.toLowerCase() === planId.toLowerCase());
                    const tier = planObj?.tier || 'starter';
                    const meta = TIER_META[tier] || TIER_META.starter;
                    const planName = planObj?.name || planId.toUpperCase();

                    return (
                      <tr key={t.id} className="hover:bg-gray-800/10 text-gray-300 transition-all">
                        <td className="py-4 px-6 font-mono text-xs text-indigo-400 font-semibold">
                          <button onClick={() => copyToClipboard(t.id)} className="flex items-center gap-1.5 hover:text-indigo-300">
                            {t.id.substring(0, 8)}... {copiedId === t.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
                          </button>
                        </td>
                        <td className="py-4 px-6 font-bold text-white">{t.name}</td>
                        <td className="py-4 px-6">
                          <div className="flex flex-col gap-1">
                            <span 
                              className="px-2 py-0.5 text-[10px] rounded font-bold uppercase w-fit border"
                              style={{ 
                                color: meta.color, 
                                backgroundColor: meta.bg, 
                                borderColor: meta.border 
                              }}
                            >
                              {planName}
                            </span>
                            {planObj?.billing && (
                              <span className="text-[9px] text-gray-500 capitalize pl-0.5">
                                {planObj.billing} billing
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {(() => {
                            const limit = t.token_limit ?? 0;
                            if (limit <= 0 || limit === 999999999) {
                              return (
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-gray-300 font-mono text-xs">{t.tokens_used.toLocaleString()}</span>
                                  <span className="text-[9px] text-indigo-400 font-semibold">
                                    ∞ Unlimited quota
                                  </span>
                                </div>
                              );
                            }

                            const percent = Math.min(100, (t.tokens_used / limit) * 100);
                            let barColor = 'bg-indigo-500';
                            let textColor = 'text-indigo-400';
                            if (percent > 90) {
                              barColor = 'bg-red-500';
                              textColor = 'text-red-400 font-bold';
                            } else if (percent > 75) {
                              barColor = 'bg-amber-500';
                              textColor = 'text-amber-400';
                            }

                            return (
                              <div className="space-y-1.5 min-w-[140px] max-w-[180px]">
                                <div className="flex justify-between text-[11px] font-semibold">
                                  <span className="text-gray-300 font-mono">{t.tokens_used.toLocaleString()}</span>
                                  <span className={`font-mono ${textColor}`}>{percent.toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-gray-950 h-1.5 rounded-full overflow-hidden border border-gray-800">
                                  <div
                                    className={`h-full ${barColor} rounded-full transition-all duration-300`}
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>
                                <div className="text-[9px] text-gray-500">
                                  Limit: {limit.toLocaleString()}
                                </div>
                              </div>
                            );
                          })()}
                        </td>
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
                          <button onClick={() => setSelectedTenant(t)} className="px-2.5 py-1 bg-gray-850 hover:bg-gray-800 border border-gray-800 rounded text-xs font-semibold">View</button>
                          <button onClick={() => setEditingTenantPlan(t)} className="px-2.5 py-1 bg-gray-850 hover:bg-gray-800 border border-gray-800 rounded text-xs font-semibold text-indigo-400">Edit Plan</button>
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
                    );
                  })}
                  {filteredTenants.length === 0 && (
                    <tr><td colSpan={6} className="py-12 text-center text-gray-500 italic">No tenants found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Violations + Reconciliation */}
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-gray-800 flex justify-between items-center gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Rate Limit Violations</h3>
                  <p className="text-[10px] text-gray-500 mt-0.5">Logs of throttled client requests</p>
                </div>
                <input type="text" className="px-2.5 py-1 bg-gray-950 border border-gray-800 text-xs rounded outline-none focus:border-indigo-500" placeholder="Filter tenant..." value={filterTenant} onChange={e => setFilterTenant(e.target.value)} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[450px]">
                  <thead><tr className="bg-gray-950/50 border-b border-gray-800 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Tenant</th><th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Endpoint</th><th className="py-3 px-4">Limit</th>
                    <th className="py-3 px-4">Actual</th><th className="py-3 px-4 text-right">Action</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-800 text-gray-300">
                    {filteredViolations.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-gray-500 italic">No violations found.</td></tr>}
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

            <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-gray-800">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Billing Reconciliation</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">Razorpay transactions vs credited tokens</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[400px]">
                  <thead><tr className="bg-gray-950/50 border-b border-gray-800 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Tenant</th><th className="py-3 px-4">Razorpay ID</th>
                    <th className="py-3 px-4">Amount</th><th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Flags</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-800 text-gray-300">
                    {reconcile.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-gray-500 italic">No billing records.</td></tr>}
                    {reconcile.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-800/10">
                        <td className="py-3 px-4 font-bold text-white">{r.tenant}</td>
                        <td className="py-3 px-4 font-mono text-gray-500 text-[10px]">{r.razorpay_id}</td>
                        <td className="py-3 px-4 font-mono font-bold">${r.amount.toFixed(2)}</td>
                        <td className="py-3 px-4 font-semibold text-green-400">{r.status}</td>
                        <td className="py-3 px-4 text-right">
                          {r.mismatch
                            ? <span className="px-2 py-0.5 bg-red-950/30 border border-red-900/30 text-red-400 font-bold rounded text-[9px]">MISMATCH</span>
                            : <span className="px-2 py-0.5 bg-green-950/30 border border-green-900/30 text-green-400 font-bold rounded text-[9px]">OK</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black text-white">Subscription Plans</h2>
              <p className="text-gray-500 text-sm mt-1">Define pricing tiers, feature access, and model permissions for all tenants.</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/10 flex items-center gap-2"
            >
              <Plus size={16} /> Create New Plan
            </button>
          </div>

          {/* Plan stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Plans',      value: plans.length,                            icon: Package,     color: '#3B82F6' },
              { label: 'Active Plans',     value: plans.filter(p => p.isActive).length,    icon: CheckCircle, color: '#22C55E' },
              { label: 'Total Tenants',    value: tenants.length,                          icon: Users,       color: '#7C3AED' },
              { label: 'Paying Tenants',   value: tenants.filter(t => t.plan !== 'starter').length, icon: Crown, color: '#F59E0B' },
            ].map(s => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-950/40" style={{ color: s.color }}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-white">{s.value}</div>
                    <div className="text-xs text-gray-500">{s.label}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Plan cards */}
          <div className="flex flex-col gap-4">
            {plans.map(plan => {
              const meta = TIER_META[plan.tier] || TIER_META.starter;
              const TierIcon = meta.icon;
              const isExpanded = expandedPlan === plan.id;
              const subCount = subscriberCount(plan.id);
              return (
                <div
                  key={plan.id}
                  className="bg-gray-900/40 border rounded-2xl overflow-hidden transition-all duration-200"
                  style={{
                    borderColor: plan.isActive ? meta.border : 'rgba(255, 255, 255, 0.05)',
                    opacity: plan.isActive ? 1 : 0.65
                  }}
                >
                  <div className="p-5 flex items-center gap-5 flex-wrap md:flex-nowrap">
                    <div className="p-3.5 rounded-xl shrink-0" style={{ backgroundColor: meta.bg }}>
                      <TierIcon size={22} style={{ color: meta.color }} />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-base font-bold text-white">{plan.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border" style={{ color: meta.color, backgroundColor: meta.bg, borderColor: meta.border }}>
                          {meta.badge}
                        </span>
                        {plan.isRecommended && (
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-amber-950/30 border border-amber-900/30 text-amber-400">
                            ★ RECOMMENDED
                          </span>
                        )}
                        {!plan.isActive && (
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-red-950/30 border border-red-900/30 text-red-400">
                            INACTIVE
                          </span>
                        )}
                        {subCount > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-indigo-950/30 border border-indigo-900/30 text-indigo-400">
                            {subCount} subscriber{subCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">{plan.description}</span>
                    </div>
                    <div className="text-right shrink-0 min-w-[130px]">
                      {plan.billing === 'custom' ? (
                        <div className="text-base font-bold text-purple-400 font-sans">Custom Pricing</div>
                      ) : (
                        <div className="text-lg font-black text-white font-sans">
                          {plan.currency === 'INR' ? '₹' : '$'}{plan.price.toLocaleString()}
                          <span className="text-[10px] text-gray-500 font-normal font-sans ml-0.5">/mo</span>
                        </div>
                      )}
                      <div className="text-[10px] text-gray-500 font-mono mt-1">
                        {plan.tokenLimit === -1 ? '∞ tokens' : `${(plan.tokenLimit / 1000000).toFixed(1)}M tokens`}
                        {' · '}
                        {plan.tenantLimit === -1 ? '∞ tenants' : `${plan.tenantLimit} tenants`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => togglePlan(plan.id)}
                        title={plan.isActive ? 'Deactivate' : 'Activate'}
                        className={`p-2 bg-gray-850 hover:bg-gray-800 border border-gray-800 rounded-xl transition ${plan.isActive ? 'text-green-400' : 'text-gray-500'}`}
                      >
                        {plan.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      </button>
                      <button
                        onClick={() => setRecommended(plan.id)}
                        title="Set as Recommended"
                        className={`p-2 bg-gray-850 hover:bg-gray-800 border border-gray-800 rounded-xl transition ${plan.isRecommended ? 'text-amber-400' : 'text-gray-500'}`}
                      >
                        <Star size={16} fill={plan.isRecommended ? 'currentColor' : 'none'} />
                      </button>
                      <button
                        onClick={() => setEditingPlan(plan)}
                        className="px-3 py-2 bg-gray-850 hover:bg-gray-800 border border-gray-800 text-indigo-400 hover:text-indigo-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
                      >
                        <Edit2 size={13} /> Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(plan.id)}
                        className="p-2 bg-red-950/20 hover:bg-red-900/20 border border-red-900/30 text-red-400 rounded-xl transition"
                      >
                        <Trash2 size={15} />
                      </button>
                      <button
                        onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                        className="p-2 bg-gray-850 hover:bg-gray-800 border border-gray-800 rounded-xl transition text-gray-400 hover:text-white"
                      >
                        {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-gray-800/80 bg-gray-950/20 p-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Feature Flags</div>
                          <div className="space-y-2">
                            {plan.features.map(f => {
                              const FIcon = f.icon;
                              return (
                                <div key={f.key} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-850 last:border-0">
                                  <div className="flex items-center gap-2 text-gray-300">
                                    <FIcon size={13} className="text-gray-500" />
                                    <span>{f.label}</span>
                                  </div>
                                  <FeatureValue feature={f} />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Model Access</div>
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {plan.modelAccess.map(m => (
                              <span key={m} className="text-[10px] px-2.5 py-1 rounded-full font-medium tracking-wide bg-gray-950 border border-gray-850 text-gray-300">
                                {m}
                              </span>
                            ))}
                          </div>
                          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Limits Matrix</div>
                          <div className="space-y-2">
                            {[
                              { label: 'Monthly Token Cap', value: plan.tokenLimit === -1 ? 'Unlimited' : plan.tokenLimit.toLocaleString() },
                              { label: 'Max Active Tenants', value: plan.tenantLimit === -1 ? 'Unlimited' : plan.tenantLimit },
                              { label: 'Max Active Agents', value: plan.agentLimit === -1 ? 'Unlimited' : plan.agentLimit },
                              { label: 'Billing Schedule', value: plan.billing.charAt(0).toUpperCase() + plan.billing.slice(1) },
                              { label: 'Active Subscribers', value: `${subCount} active tenant${subCount !== 1 ? 's' : ''}` },
                            ].map(row => (
                              <div key={row.label} className="flex justify-between text-xs py-1 border-b border-gray-850 last:border-0">
                                <span className="text-gray-400">{row.label}</span>
                                <span className="font-semibold text-white">{row.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          TAB: API KEYS
      ══════════════════════════════════════════ */}
      {activeTab === 'apikeys' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-black text-white mb-1">API Key Management</h2>
            <p className="text-gray-500 text-sm">Generate and revoke programmatic access credentials per tenant.</p>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">Generate New Key</h3>
              <p className="text-[10px] text-gray-500 mb-5">Create isolated credentials linked to a tenant with specific rate limits.</p>
              <form onSubmit={handleGenerateKey} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Tenant Owner</label>
                  <select required className="w-full bg-gray-950 border border-gray-800 text-xs rounded-xl p-2.5 text-white" value={newKeyTenant} onChange={e => setNewKeyTenant(e.target.value)}>
                    <option value="">Select Tenant...</option>
                    {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Key Name / Label</label>
                  <input type="text" required className="w-full bg-gray-950 border border-gray-800 text-xs rounded-xl p-2.5 text-white" placeholder="e.g. Production Frontend API" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">TPM Limit</label>
                    <input type="number" className="w-full bg-gray-950 border border-gray-800 text-xs rounded-xl p-2.5 text-white" value={newKeyTpm} onChange={e => setNewKeyTpm(parseInt(e.target.value))} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">RPM Limit</label>
                    <input type="number" className="w-full bg-gray-950 border border-gray-800 text-xs rounded-xl p-2.5 text-white" value={newKeyRpm} onChange={e => setNewKeyRpm(parseInt(e.target.value))} />
                  </div>
                </div>
                <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition-all">
                  Provision API Key
                </button>
              </form>
            </div>

            <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl overflow-hidden xl:col-span-2">
              <div className="p-5 border-b border-gray-800">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Active Client Keys</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">Programmatic API integration keys with strict token budgets.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-950/50 border-b border-gray-800 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Key Label</th><th className="py-3 px-4">Tenant</th>
                      <th className="py-3 px-4">Prefix</th><th className="py-3 px-4">TPM / RPM</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 text-gray-300">
                    {apiKeys.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-gray-500 italic">No keys provisioned yet.</td></tr>}
                    {apiKeys.map(key => (
                      <tr key={key.id} className="hover:bg-gray-800/10">
                        <td className="py-3 px-4 font-bold text-white">{key.name}</td>
                        <td className="py-3 px-4 text-gray-400">{key.tenant_name}</td>
                        <td className="py-3 px-4 font-mono text-indigo-400 font-semibold">{key.key_prefix}...</td>
                        <td className="py-3 px-4 font-mono text-gray-500">{key.tpm_limit.toLocaleString()} / {key.rpm_limit}</td>
                        <td className="py-3 px-4 text-right">
                          <button onClick={() => handleRevokeKey(key.id)} className="px-2 py-0.5 bg-red-950/20 border border-red-900/30 hover:bg-red-900/20 text-red-400 rounded text-[10px] font-bold transition-all">
                            Revoke
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          TAB: WEBHOOKS
      ══════════════════════════════════════════ */}
      {activeTab === 'webhooks' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-white mb-1">Payment Webhooks</h2>
              <p className="text-gray-500 text-sm">Real-time Stripe and Razorpay webhook audit stream.</p>
            </div>
            <a href="/admin/billing/providers" className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all">
              Configure Providers
            </a>
          </div>

          {/* Provider status */}
          <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-5 flex gap-8">
            {[
              { name: 'Razorpay', active: providersActive.razorpay, mode: providersModes.razorpay, color: 'text-blue-400' },
              { name: 'Stripe',   active: providersActive.stripe,   mode: providersModes.stripe,   color: 'text-purple-400' },
            ].map(p => (
              <div key={p.name} className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-500 uppercase">{p.name}:</span>
                {p.active
                  ? <span className={`${p.color} text-xs font-bold flex items-center gap-1`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      Connected ({p.mode === 'test' ? 'Test' : 'Live'})
                    </span>
                  : <span className="text-gray-500 text-xs">Disconnected</span>
                }
              </div>
            ))}
          </div>

          {/* Webhook table */}
          <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0">
                  <tr className="bg-gray-950/90 border-b border-gray-800 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Event</th><th className="py-3 px-4">Provider</th>
                    <th className="py-3 px-4">Tenant</th><th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Signature</th><th className="py-3 px-4 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 text-gray-300">
                  {webhooks.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-gray-500 italic">No webhooks captured.</td></tr>}
                  {webhooks.map(wh => (
                    <tr key={wh.id} className="hover:bg-gray-800/10">
                      <td className="py-3 px-4 font-bold text-white text-[11px] truncate max-w-[160px]" title={wh.event_type}>{wh.event_type}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${wh.provider === 'stripe' ? 'bg-purple-900/30 text-purple-400' : 'bg-blue-900/30 text-blue-400'}`}>{wh.provider}</span>
                      </td>
                      <td className="py-3 px-4 text-gray-400">{wh.tenant_name}</td>
                      <td className="py-3 px-4 font-mono font-semibold">{wh.provider === 'stripe' ? '$' : '₹'}{wh.amount}</td>
                      <td className="py-3 px-4">
                        {wh.signature_verified
                          ? <span className="text-green-400 font-bold">Verified</span>
                          : <span className="text-red-400 font-bold">Failed</span>
                        }
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => setSelectedWebhook(wh)} className="px-2 py-0.5 bg-gray-850 hover:bg-gray-800 border border-gray-800 rounded text-[10px] font-bold text-indigo-400">
                          Payload
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          OVERLAYS / MODALS
      ══════════════════════════════════════════ */}

      {/* Tenant detail drawer */}
      {selectedTenant && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-gray-900 border-l border-gray-800 p-6 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-white">Tenant Audit Record</h3>
                <button onClick={() => setSelectedTenant(null)} className="p-1 hover:bg-gray-800 rounded"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4 text-sm">
                {[
                  { label: 'Name', value: selectedTenant.name, className: 'text-white font-bold' },
                  { label: 'Unique Slug', value: selectedTenant.slug, className: 'text-indigo-400 font-mono' },
                  { label: 'Active Users', value: String(selectedTenant.user_count), className: 'text-white font-semibold' },
                  { label: 'Cumulative Tokens Used', value: selectedTenant.tokens_used.toLocaleString(), className: 'text-white font-mono' },
                ].map(row => (
                  <div key={row.label} className="p-3 bg-gray-950/50 rounded-xl border border-gray-800">
                    <span className="text-xs text-gray-500 block">{row.label}</span>
                    <span className={row.className}>{row.value}</span>
                  </div>
                ))}
                <div className="p-4 bg-gray-950/50 rounded-xl border border-gray-800 space-y-3">
                  <div>
                    <span className="text-xs text-gray-500 block mb-0.5">Plan & Pricing Class</span>
                    <span className="text-white font-black text-sm uppercase tracking-wide">{selectedTenant.plan}</span>
                  </div>
                  {selectedTenant.price !== undefined && (
                    <div className="border-t border-gray-850 pt-2.5 grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-gray-500 block">Price</span><span className="text-gray-300 font-medium">{selectedTenant.billing === 'custom' ? 'Custom' : `₹${selectedTenant.price?.toLocaleString()}/mo`}</span></div>
                      <div><span className="text-gray-500 block">Token Limit</span><span className="text-gray-300 font-mono">{selectedTenant.token_limit === -1 ? 'Unlimited' : selectedTenant.token_limit?.toLocaleString()}</span></div>
                      <div><span className="text-gray-500 block">Max Agents</span><span className="text-gray-300">{selectedTenant.agent_limit === -1 ? 'Unlimited' : selectedTenant.agent_limit}</span></div>
                      <div><span className="text-gray-500 block">SLA Target</span><span className="text-gray-300">{selectedTenant.features?.sla_hours ? `${selectedTenant.features.sla_hours} hrs` : 'N/A'}</span></div>
                    </div>
                  )}
                  {selectedTenant.model_access && selectedTenant.model_access.length > 0 && (
                    <div className="border-t border-gray-850 pt-2.5">
                      <span className="text-xs text-gray-500 block mb-1.5">Model Permissions</span>
                      <div className="flex flex-wrap gap-1">
                        {selectedTenant.model_access.map(m => (
                          <span key={m} className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">{m}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => { handleOpenEditDetails(selectedTenant); setSelectedTenant(null); }}
                  className="w-full py-2 bg-gray-855 hover:bg-gray-800 border border-gray-850 text-white font-bold text-xs rounded-xl transition-all animate-transition"
                >
                  Edit Tenant Name & Slug
                </button>
                <button
                  onClick={() => { setEditingTenantPlan(selectedTenant); setSelectedTenant(null); }}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all"
                >
                  Change Subscription Plan
                </button>
                <button
                  onClick={() => handleToggleSuspend(selectedTenant.id, selectedTenant.status)}
                  className={`w-full py-2 rounded-xl text-xs font-bold border transition-all ${
                    selectedTenant.status === 'suspended'
                      ? 'bg-green-950/20 hover:bg-green-900/20 border-green-900/30 text-green-400'
                      : 'bg-red-950/20 hover:bg-red-900/20 border-red-900/30 text-red-400'
                  }`}
                >
                  {selectedTenant.status === 'suspended' ? 'Activate Tenant' : 'Suspend Tenant'}
                </button>
              </div>
            </div>
            <button onClick={() => setSelectedTenant(null)} className="w-full py-2.5 bg-gray-850 hover:bg-gray-800 border border-gray-800 text-sm font-semibold rounded-xl mt-4">Close</button>
          </div>
        </div>
      )}

      {/* Change plan modal */}
      {editingTenantPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-gray-900 border border-gray-800 p-6 rounded-2xl flex flex-col gap-4 text-sm text-gray-300">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-base font-black text-white">Change Tenant Plan</h3>
              <button onClick={() => setEditingTenantPlan(null)} className="p-1 hover:bg-gray-850 rounded"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <p>Select a new subscription plan for <strong>{editingTenantPlan.name}</strong>:</p>
            <div className="flex flex-col gap-2.5">
              {plans.map(p => (
                <button key={p.id} onClick={() => { handleUpdatePlan(editingTenantPlan.id, p.id); setEditingTenantPlan(null); }}
                  className={`w-full text-left p-3.5 rounded-xl border flex justify-between items-center transition ${
                    editingTenantPlan.plan.toLowerCase() === p.id.toLowerCase()
                      ? 'bg-indigo-950/30 border-indigo-500/80 text-white font-bold'
                      : 'bg-gray-950/40 border-gray-800 hover:border-gray-700 text-gray-300'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-sm">{p.name}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{p.billing === 'custom' ? 'Custom price' : `₹${p.price.toLocaleString()}/mo`}</div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                    p.tier === 'starter' ? 'bg-slate-800 text-slate-400' :
                    p.tier === 'professional' ? 'bg-indigo-900/40 text-indigo-400 border border-indigo-800/30' :
                    'bg-purple-900/40 text-purple-400 border border-purple-800/30'
                  }`}>{p.tier}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-end mt-2">
              <button onClick={() => setEditingTenantPlan(null)} className="px-4 py-2 bg-gray-850 hover:bg-gray-800 text-xs font-semibold rounded-lg text-gray-400">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Tenant Modal */}
      {showCreateTenantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-gray-900 border border-gray-800 p-6 rounded-2xl flex flex-col gap-4 text-sm text-gray-300">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-base font-black text-white">Create New Tenant</h3>
              <button onClick={() => setShowCreateTenantModal(false)} className="p-1 hover:bg-gray-850 rounded"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleCreateTenant} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1.5 font-bold">Tenant Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corporation"
                  className="w-full bg-gray-955 border border-gray-800 text-xs rounded-xl p-2.5 text-white outline-none focus:border-indigo-500"
                  value={newTenantName}
                  onChange={e => {
                    setNewTenantName(e.target.value);
                    setNewTenantSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                  }}
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1.5 font-bold">Unique Slug</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. acme-corp"
                  className="w-full bg-gray-955 border border-gray-800 text-xs rounded-xl p-2.5 text-white outline-none focus:border-indigo-500 font-mono"
                  value={newTenantSlug}
                  onChange={e => setNewTenantSlug(e.target.value.toLowerCase().replace(/[^a-z0-9\-]+/g, ''))}
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1.5 font-bold">Initial Subscription Plan</label>
                <select
                  className="w-full bg-gray-955 border border-gray-800 text-xs rounded-xl p-2.5 text-white outline-none focus:border-indigo-500 cursor-pointer"
                  value={newTenantPlan}
                  onChange={e => setNewTenantPlan(e.target.value)}
                >
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.tier.toUpperCase()})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateTenantModal(false)}
                  className="px-4 py-2 bg-gray-855 hover:bg-gray-800 text-xs font-semibold rounded-lg text-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all"
                >
                  Create Tenant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Tenant Details Modal */}
      {editingTenantDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-gray-900 border border-gray-800 p-6 rounded-2xl flex flex-col gap-4 text-sm text-gray-300">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-base font-black text-white">Edit Tenant Details</h3>
              <button onClick={() => setEditingTenantDetails(null)} className="p-1 hover:bg-gray-850 rounded"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleSaveTenantDetails} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1.5 font-bold">Tenant Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corporation"
                  className="w-full bg-gray-955 border border-gray-800 text-xs rounded-xl p-2.5 text-white outline-none focus:border-indigo-500"
                  value={editTenantName}
                  onChange={e => setEditTenantName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1.5 font-bold">Unique Slug</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. acme-corp"
                  className="w-full bg-gray-955 border border-gray-800 text-xs rounded-xl p-2.5 text-white outline-none focus:border-indigo-500 font-mono"
                  value={editTenantSlug}
                  onChange={e => setEditTenantSlug(e.target.value.toLowerCase().replace(/[^a-z0-9\-]+/g, ''))}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTenantDetails(null)}
                  className="px-4 py-2 bg-gray-855 hover:bg-gray-800 text-xs font-semibold rounded-lg text-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generated key reveal modal */}
      {generatedPlainKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-2xl">
            <h3 className="text-sm font-bold text-green-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CheckCircle size={16} /> API Key Provisioned
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed mb-4">Store this securely. It will not be shown again.</p>
            <div className="p-3 bg-gray-950 rounded-xl border border-gray-850 flex items-center justify-between gap-3 mb-5">
              <span className="font-mono text-xs text-indigo-400 break-all select-all font-semibold">{generatedPlainKey}</span>
              <button onClick={() => { navigator.clipboard.writeText(generatedPlainKey); showToast('Key copied!'); }} className="p-1.5 bg-gray-850 hover:bg-gray-800 rounded border border-gray-800 text-gray-400 hover:text-white">
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <button onClick={() => setGeneratedPlainKey(null)} className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all">
              I Have Saved the Key
            </button>
          </div>
        </div>
      )}

      {/* Webhook inspector */}
      {selectedWebhook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-2xl flex flex-col" style={{ maxHeight: '85vh' }}>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Webhook Event Inspector</h3>
                <span className="text-[10px] text-gray-500 font-semibold">{selectedWebhook.event_id}</span>
              </div>
              <button onClick={() => setSelectedWebhook(null)} className="p-1 hover:bg-gray-800 text-gray-400 hover:text-white rounded"><X size={18} /></button>
            </div>
            <div className="flex-1 min-h-0 space-y-4 mb-5 text-xs text-gray-300 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Event Type', value: <span className="font-mono text-indigo-400 font-semibold">{selectedWebhook.event_type}</span> },
                  { label: 'Gateway', value: <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${selectedWebhook.provider === 'stripe' ? 'bg-purple-900/30 text-purple-400' : 'bg-blue-900/30 text-blue-400'}`}>{selectedWebhook.provider}</span> },
                  { label: 'Signature', value: <span className={selectedWebhook.signature_verified ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>{selectedWebhook.signature_verified ? 'Verified' : 'Failed'}</span> },
                  { label: 'Tenant', value: <span className="text-gray-200">{selectedWebhook.tenant_name}</span> },
                ].map(row => (
                  <div key={row.label} className="p-3 bg-gray-950/50 rounded-xl border border-gray-800">
                    <span className="text-[10px] text-gray-500 uppercase block font-bold mb-1">{row.label}</span>
                    {row.value}
                  </div>
                ))}
              </div>
              <div className="p-3 bg-gray-950/50 rounded-xl border border-gray-800">
                <span className="text-[10px] text-gray-500 uppercase block font-bold mb-1">Raw Payload JSON</span>
                <pre className="font-mono text-[10px] text-gray-400 overflow-auto max-h-[28vh] p-2 bg-gray-950 rounded mt-1.5 border border-gray-850">
                  {JSON.stringify(selectedWebhook.payload, null, 2)}
                </pre>
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => showToast('Redelivery triggered')} className="flex-1 py-2 bg-gray-850 hover:bg-gray-800 text-white text-xs font-semibold rounded-xl border border-gray-800 transition-all">
                  Trigger Redelivery
                </button>
                <button type="button" onClick={() => { showToast('Event marked as processed'); setSelectedWebhook(null); }} className="flex-1 py-2 bg-green-950/20 hover:bg-green-900/20 text-green-400 text-xs font-semibold rounded-xl border border-green-900/30 transition-all">
                  Force Process
                </button>
              </div>
            </div>
            <button onClick={() => setSelectedWebhook(null)} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all">Close Inspector</button>
          </div>
        </div>
      )}

      {/* Plan edit modal */}
      {editingPlan && <PlanEditModal plan={editingPlan} models={AVAILABLE_MODELS} onSave={savePlan} onClose={() => setEditingPlan(null)} />}

      {/* Create plan modal */}
      {showCreateModal && (
        <PlanEditModal
          isNew
          plan={{ id: `plan_${Date.now()}`, name: 'New Plan', tier: 'professional', price: 0, billing: 'monthly', currency: 'INR', isActive: true, isRecommended: false, tokenLimit: 1000000, tenantLimit: 5, agentLimit: 10, modelAccess: ['Harikson-3B'], description: '', createdAt: new Date().toISOString(), features: INITIAL_PLANS[0].features.map(f => ({ ...f, value: false })) }}
          models={AVAILABLE_MODELS}
          onSave={createPlan}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Delete plan confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-red-950/30 border border-red-900/30 rounded-xl text-red-400">
                <AlertTriangle size={20} />
              </div>
              <h3 className="text-base font-bold text-white">Delete Plan</h3>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed mb-6">
              Are you sure you want to delete <strong>{plans.find(p => p.id === deleteConfirm)?.name}</strong>? This cannot be undone and may affect {subscriberCount(deleteConfirm)} active subscriber{subscriberCount(deleteConfirm) !== 1 ? 's' : ''}.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 bg-gray-850 hover:bg-gray-800 border border-gray-800 rounded-xl text-xs font-semibold text-gray-400 transition">Cancel</button>
              <button onClick={() => deletePlan(deleteConfirm)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition">Delete Plan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
