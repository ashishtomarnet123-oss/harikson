'use client';

import React, { useState, useEffect } from 'react';
import {
  Package, Plus, Edit2, Trash2, CheckCircle, XCircle,
  ToggleLeft, ToggleRight, Star, Zap, Shield, Crown,
  ChevronDown, ChevronUp, X, Save, AlertTriangle,
  Users, Cpu, Database, Clock, Webhook, Code2, Lock
} from 'lucide-react';
import { getCookie } from 'cookies-next';

interface Feature {
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
  features: Feature[];
  description: string;
  createdAt: string;
}

const INITIAL_PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    tier: 'starter',
    price: 0,
    billing: 'monthly',
    currency: 'INR',
    isActive: true,
    isRecommended: false,
    tokenLimit: 100000,
    tenantLimit: 1,
    agentLimit: 2,
    modelAccess: ['Harikson-3B'],
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
    id: 'professional',
    name: 'Professional',
    tier: 'professional',
    price: 4999,
    billing: 'monthly',
    currency: 'INR',
    isActive: true,
    isRecommended: true,
    tokenLimit: 5000000,
    tenantLimit: 10,
    agentLimit: 20,
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
    id: 'enterprise',
    name: 'Enterprise',
    tier: 'enterprise',
    price: 0,
    billing: 'custom',
    currency: 'INR',
    isActive: true,
    isRecommended: false,
    tokenLimit: -1,
    tenantLimit: -1,
    agentLimit: -1,
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
  starter:      { color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0', icon: Zap,   badge: 'FREE' },
  professional: { color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE', icon: Star,  badge: 'GROWTH' },
  enterprise:   { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', icon: Crown, badge: 'CUSTOM' },
};

const AVAILABLE_MODELS = ['Harikson-3B', 'Qwen3-8B', 'Qwen3-32B', 'Qwen3-72B', 'Custom Fine-Tuned', 'Mistral-7B', 'Llama-3-8B'];

function FeatureValue({ feature }: { feature: Feature }) {
  if (feature.type === 'boolean') {
    return feature.value
      ? <CheckCircle size={16} style={{ color: '#22C55E' }} />
      : <XCircle size={16} style={{ color: '#CBD5E1' }} />;
  }
  const val = feature.value as number;
  return <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{val === -1 ? '∞ Unlimited' : val.toLocaleString()}</span>;
}

export default function SubscriptionPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [tab, setTab] = useState<'plans' | 'subscribers'>('plans');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const apiBase = '/api-proxy';

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchPlans = async () => {
    const token = getCookie('admin_token') || localStorage.getItem('admin_token') || 'TEST_ADMIN_TOKEN';
    try {
      const res = await fetch(`${apiBase}/admin/plans`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const dbPlans = (data.plans || []).map((p: any) => {
          const features = [
            { key: 'api_access', label: 'API Access', type: 'boolean', value: p.features?.api_access !== false, icon: Code2 },
            { key: 'webhook_logging', label: 'Webhook Logging', type: 'boolean', value: !!p.features?.webhook_logging, icon: Webhook },
            { key: 'rag_documents', label: 'RAG Documents Limit', type: 'number', value: typeof p.features?.rag_documents === 'number' ? p.features.rag_documents : 500, icon: Database },
            { key: 'audit_trail', label: 'Audit Trail', type: 'boolean', value: !!p.features?.audit_trail, icon: Shield },
            { key: 'priority_support', label: 'Priority Support', type: 'boolean', value: !!p.features?.priority_support, icon: Star },
            { key: 'custom_models', label: 'Custom Model Fine-Tuning', type: 'boolean', value: !!p.features?.custom_models, icon: Cpu },
            { key: 'dpdp_compliance', label: 'DPDP Compliance', type: 'boolean', value: p.features?.dpdp_compliance !== false, icon: Lock },
            { key: 'sla_hours', label: 'SLA Response (hours)', type: 'number', value: typeof p.features?.sla_hours === 'number' ? p.features.sla_hours : 72, icon: Clock }
          ];
          return {
            id: p.id,
            name: p.name,
            tier: p.tier,
            price: Number(p.price),
            billing: p.billing,
            currency: p.currency,
            isActive: p.is_active,
            isRecommended: p.is_recommended,
            tokenLimit: p.token_limit,
            tenantLimit: p.tenant_limit,
            agentLimit: p.agent_limit,
            modelAccess: p.model_access || [],
            features,
            description: p.description,
            createdAt: p.created_at
          };
        });
        setPlans(dbPlans);
      }
    } catch (err) {
      console.warn('Failed to load plans from API, using default plans fallback', err);
      setPlans(INITIAL_PLANS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const togglePlan = async (id: string) => {
    const plan = plans.find(p => p.id === id);
    if (!plan) return;
    const token = getCookie('admin_token') || localStorage.getItem('admin_token') || 'TEST_ADMIN_TOKEN';
    try {
      const res = await fetch(`${apiBase}/admin/plans/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: !plan.isActive })
      });
      if (res.ok) {
        setPlans(prev => prev.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p));
        showToast(`Plan "${plan.name}" ${plan.isActive ? 'deactivated' : 'activated'}`);
      } else {
        showToast('Failed to toggle plan status', 'error');
      }
    } catch (err) {
      showToast('API communication error', 'error');
    }
  };

  const deletePlan = async (id: string) => {
    const plan = plans.find(p => p.id === id);
    if (!plan) return;
    const token = getCookie('admin_token') || localStorage.getItem('admin_token') || 'TEST_ADMIN_TOKEN';
    try {
      const res = await fetch(`${apiBase}/admin/plans/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setPlans(prev => prev.filter(p => p.id !== id));
        setDeleteConfirm(null);
        showToast(`Plan "${plan.name}" deleted`, 'error');
      } else {
        showToast('Failed to delete plan', 'error');
      }
    } catch (err) {
      showToast('API communication error', 'error');
    }
  };

  const setRecommended = async (id: string) => {
    const token = getCookie('admin_token') || localStorage.getItem('admin_token') || 'TEST_ADMIN_TOKEN';
    try {
      await Promise.all(plans.map(async p => {
        const checkRecommended = p.id === id;
        if (p.isRecommended !== checkRecommended) {
          await fetch(`${apiBase}/admin/plans/${p.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ is_recommended: checkRecommended })
          });
        }
      }));
      setPlans(prev => prev.map(p => ({ ...p, isRecommended: p.id === id })));
      showToast('Recommended plan updated');
    } catch (err) {
      showToast('Failed to set recommended plan', 'error');
    }
  };

  const savePlan = async (updated: Plan) => {
    const token = getCookie('admin_token') || localStorage.getItem('admin_token') || 'TEST_ADMIN_TOKEN';
    const featuresObj = updated.features.reduce((acc: any, f) => {
      acc[f.key] = f.value;
      return acc;
    }, {});
    
    try {
      const res = await fetch(`${apiBase}/admin/plans/${updated.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: updated.name,
          tier: updated.tier,
          price: updated.price,
          billing: updated.billing,
          currency: updated.currency,
          is_active: updated.isActive,
          is_recommended: updated.isRecommended,
          token_limit: updated.tokenLimit,
          tenant_limit: updated.tenantLimit,
          agent_limit: updated.agentLimit,
          model_access: updated.modelAccess,
          features: featuresObj,
          description: updated.description
        })
      });
      if (res.ok) {
        setPlans(prev => prev.map(p => p.id === updated.id ? updated : p));
        setEditingPlan(null);
        showToast(`Plan "${updated.name}" saved successfully`);
      } else {
        showToast('Failed to save plan changes', 'error');
      }
    } catch (err) {
      showToast('API communication error', 'error');
    }
  };
  const createPlan = async (newPlan: Plan) => {
    const token = getCookie('admin_token') || localStorage.getItem('admin_token') || 'TEST_ADMIN_TOKEN';
    const featuresObj = newPlan.features.reduce((acc: any, f) => {
      acc[f.key] = f.value;
      return acc;
    }, {});

    try {
      const res = await fetch(`${apiBase}/admin/plans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: newPlan.id || `plan_${Date.now()}`,
          name: newPlan.name,
          tier: newPlan.tier,
          price: newPlan.price,
          billing: newPlan.billing,
          currency: newPlan.currency,
          is_active: newPlan.isActive,
          is_recommended: newPlan.isRecommended,
          token_limit: newPlan.tokenLimit,
          tenant_limit: newPlan.tenantLimit,
          agent_limit: newPlan.agentLimit,
          model_access: newPlan.modelAccess,
          features: featuresObj,
          description: newPlan.description
        })
      });
      if (res.ok) {
        await fetchPlans();
        setShowCreateModal(false);
        showToast(`Plan "${newPlan.name}" created!`);
      } else {
        showToast('Failed to create plan', 'error');
      }
    } catch (err) {
      showToast('API communication error', 'error');
    }
  };

  const subscribers = [
    { tenant: 'Acme Corp', plan: 'Professional', since: '2025-03-12', tokens: '3.2M / 5M', status: 'active' },
    { tenant: 'TechStartup AI', plan: 'Starter', since: '2025-05-01', tokens: '82K / 100K', status: 'active' },
    { tenant: 'GovIndia Dept.', plan: 'Enterprise', since: '2025-01-20', tokens: '∞', status: 'active' },
    { tenant: 'MediChain Labs', plan: 'Professional', since: '2025-04-08', tokens: '4.9M / 5M', status: 'warning' },
    { tenant: 'FinEdge Capital', plan: 'Professional', since: '2025-02-28', tokens: '1.1M / 5M', status: 'active' },
  ];

  return (
    <div style={{ padding: '32px', maxWidth: 1280, margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          background: toast.type === 'success' ? '#22C55E' : '#EF4444',
          color: '#fff', padding: '12px 20px', borderRadius: 10,
          fontSize: 14, fontWeight: 500, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{ background: 'linear-gradient(135deg, #3B82F6, #7C3AED)', borderRadius: 10, padding: 8 }}>
              <Package size={20} color="#fff" />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', margin: 0 }}>Subscription Plans</h1>
          </div>
          <p style={{ color: '#64748B', fontSize: 14, margin: 0 }}>Define, edit and manage pricing tiers and feature access for all tenants.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'linear-gradient(135deg, #3B82F6, #7C3AED)',
            color: '#fff', border: 'none', borderRadius: 10,
            padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer'
          }}
        >
          <Plus size={16} /> Create New Plan
        </button>
      </div>

      {/* Stats Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Plans',       value: plans.length,                                    icon: Package,      color: '#3B82F6' },
          { label: 'Active Plans',       value: plans.filter(p => p.isActive).length,            icon: CheckCircle,  color: '#22C55E' },
          { label: 'Total Subscribers',  value: subscribers.length,                              icon: Users,        color: '#7C3AED' },
          { label: 'Paying Tenants',     value: subscribers.filter(s => s.plan !== 'Starter').length, icon: Crown, color: '#F59E0B' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: stat.color + '15', borderRadius: 8, padding: 8 }}>
                  <Icon size={18} color={stat.color} />
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#0F172A' }}>{stat.value}</div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>{stat.label}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#F1F5F9', borderRadius: 10, padding: 4, marginBottom: 28, width: 'fit-content' }}>
        {(['plans', 'subscribers'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: tab === t ? '#fff' : 'transparent',
            color: tab === t ? '#0F172A' : '#64748B',
            fontWeight: tab === t ? 600 : 400, fontSize: 14,
            boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            textTransform: 'capitalize' as const
          }}>
            {t === 'plans' ? 'Manage Plans' : 'Subscribers'}
          </button>
        ))}
      </div>

      {/* PLANS TAB */}
      {tab === 'plans' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {plans.map(plan => {
            const meta = TIER_META[plan.tier];
            const TierIcon = meta.icon;
            const isExpanded = expandedPlan === plan.id;
            return (
              <div key={plan.id} style={{
                background: '#fff',
                border: `1px solid ${plan.isActive ? meta.border : '#E2E8F0'}`,
                borderRadius: 16,
                overflow: 'hidden',
                opacity: plan.isActive ? 1 : 0.65,
              }}>
                {/* Row */}
                <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{ background: meta.bg, borderRadius: 12, padding: 12, flexShrink: 0 }}>
                    <TierIcon size={22} color={meta.color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>{plan.name}</span>
                      <span style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, letterSpacing: '0.05em' }}>{meta.badge}</span>
                      {plan.isRecommended && <span style={{ background: '#FEF3C7', color: '#D97706', border: '1px solid #FCD34D', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>★ RECOMMENDED</span>}
                      {!plan.isActive && <span style={{ background: '#FEE2E2', color: '#DC2626', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>INACTIVE</span>}
                    </div>
                    <span style={{ fontSize: 13, color: '#64748B' }}>{plan.description}</span>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 130 }}>
                    {plan.billing === 'custom'
                      ? <div style={{ fontSize: 18, fontWeight: 700, color: '#7C3AED' }}>Custom Pricing</div>
                      : <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A' }}>
                          {plan.currency === 'INR' ? '₹' : '$'}{plan.price.toLocaleString()}
                          <span style={{ fontSize: 12, fontWeight: 400, color: '#94A3B8' }}>/mo</span>
                        </div>
                    }
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                      {plan.tokenLimit === -1 ? '∞ tokens' : `${(plan.tokenLimit / 1000000).toFixed(1)}M tokens`}
                      {' · '}
                      {plan.tenantLimit === -1 ? '∞ tenants' : `${plan.tenantLimit} tenants`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <button onClick={() => togglePlan(plan.id)} title={plan.isActive ? 'Deactivate' : 'Activate'} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: plan.isActive ? '#22C55E' : '#94A3B8' }}>
                      {plan.isActive ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                    </button>
                    <button onClick={() => setRecommended(plan.id)} title="Set as Recommended" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: plan.isRecommended ? '#F59E0B' : '#CBD5E1' }}>
                      <Star size={18} fill={plan.isRecommended ? '#F59E0B' : 'none'} />
                    </button>
                    <button onClick={() => setEditingPlan(plan)} style={{ background: '#EFF6FF', border: 'none', cursor: 'pointer', padding: '7px 14px', borderRadius: 8, color: '#3B82F6', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Edit2 size={14} /> Edit
                    </button>
                    <button onClick={() => setDeleteConfirm(plan.id)} style={{ background: '#FEF2F2', border: 'none', cursor: 'pointer', padding: 8, borderRadius: 8, color: '#EF4444' }}>
                      <Trash2 size={16} />
                    </button>
                    <button onClick={() => setExpandedPlan(isExpanded ? null : plan.id)} style={{ background: '#F8FAFC', border: 'none', cursor: 'pointer', padding: 8, borderRadius: 8, color: '#64748B' }}>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Feature Panel */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid #F1F5F9', padding: '20px 24px', background: '#FAFBFD' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.06em', marginBottom: 14 }}>FEATURE FLAGS</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {plan.features.map(f => {
                            const FIcon = f.icon;
                            return (
                              <div key={f.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <FIcon size={14} color="#64748B" />
                                  <span style={{ fontSize: 13, color: '#475569' }}>{f.label}</span>
                                </div>
                                <FeatureValue feature={f} />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.06em', marginBottom: 14 }}>MODEL ACCESS</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                          {plan.modelAccess.map(m => (
                            <span key={m} style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`, fontSize: 12, fontWeight: 500, padding: '4px 10px', borderRadius: 20 }}>{m}</span>
                          ))}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.06em', marginBottom: 14 }}>LIMITS</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {[
                            { label: 'Monthly Tokens', value: plan.tokenLimit === -1 ? 'Unlimited' : plan.tokenLimit.toLocaleString() },
                            { label: 'Max Tenants', value: plan.tenantLimit === -1 ? 'Unlimited' : plan.tenantLimit },
                            { label: 'Max Agents', value: plan.agentLimit === -1 ? 'Unlimited' : plan.agentLimit },
                            { label: 'Billing Cycle', value: plan.billing.charAt(0).toUpperCase() + plan.billing.slice(1) },
                          ].map(row => (
                            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: 13, color: '#64748B' }}>{row.label}</span>
                              <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{row.value}</span>
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
      )}

      {/* SUBSCRIBERS TAB */}
      {tab === 'subscribers' && (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9' }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>Active Subscribers</h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>Tenants currently enrolled in subscription plans</p>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {['Tenant', 'Plan', 'Since', 'Token Usage', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subscribers.map((s, i) => {
                const planMeta = plans.find(p => p.name === s.plan);
                const meta = planMeta ? TIER_META[planMeta.tier] : TIER_META.starter;
                return (
                  <tr key={i} style={{ borderTop: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '14px 20px', fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{s.tenant}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`, fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>{s.plan}</span>
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: 13, color: '#64748B' }}>{s.since}</td>
                    <td style={{ padding: '14px 20px', fontSize: 13, color: '#334155', fontFamily: 'monospace' }}>{s.tokens}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{
                        background: s.status === 'active' ? '#DCFCE7' : '#FEF3C7',
                        color: s.status === 'active' ? '#16A34A' : '#D97706',
                        fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                        textTransform: 'uppercase' as const
                      }}>
                        {s.status === 'warning' ? '⚠ Near Limit' : '● Active'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button style={{ background: '#EFF6FF', border: 'none', color: '#3B82F6', padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Change Plan</button>
                        <button style={{ background: '#FEF2F2', border: 'none', color: '#EF4444', padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingPlan && <PlanEditModal plan={editingPlan} models={AVAILABLE_MODELS} onSave={savePlan} onClose={() => setEditingPlan(null)} />}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <PlanEditModal
          isNew
          plan={{
            id: `plan_${Date.now()}`, name: 'New Plan', tier: 'professional', price: 0,
            billing: 'monthly', currency: 'INR', isActive: true, isRecommended: false,
            tokenLimit: 1000000, tenantLimit: 5, agentLimit: 10, modelAccess: ['Harikson-3B'],
            description: '', createdAt: new Date().toISOString(),
            features: INITIAL_PLANS[0].features.map(f => ({ ...f, value: false }))
          }}
          models={AVAILABLE_MODELS}
          onSave={(p) => createPlan(p)}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* DELETE CONFIRM */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 400, width: '90%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ background: '#FEE2E2', borderRadius: 10, padding: 10 }}><AlertTriangle size={20} color="#EF4444" /></div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>Delete Plan</h3>
            </div>
            <p style={{ color: '#64748B', fontSize: 14, marginBottom: 24 }}>
              Are you sure you want to delete <strong>{plans.find(p => p.id === deleteConfirm)?.name}</strong>? This action cannot be undone and may affect active subscribers.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ background: '#F1F5F9', border: 'none', padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => deletePlan(deleteConfirm)} style={{ background: '#EF4444', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Delete Plan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
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

  const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 600, color: '#64748B' };
  const inputStyle: React.CSSProperties = { padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 14, color: '#0F172A', outline: 'none', background: '#fff' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '90%', maxWidth: 680, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px 28px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0F172A' }}>{isNew ? 'Create New Plan' : `Edit — ${plan.name}`}</h2>
          <button onClick={onClose} style={{ background: '#F1F5F9', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#64748B' }}><X size={18} /></button>
        </div>
        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <label style={labelStyle}>Plan Name<input value={draft.name} onChange={e => update('name', e.target.value)} style={inputStyle} /></label>
            <label style={labelStyle}>Tier
              <select value={draft.tier} onChange={e => update('tier', e.target.value)} style={inputStyle}>
                <option value="starter">Starter</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </label>
            <label style={labelStyle}>Price ({draft.currency})<input type="number" value={draft.price} onChange={e => update('price', Number(e.target.value))} style={inputStyle} /></label>
            <label style={labelStyle}>Billing Cycle
              <select value={draft.billing} onChange={e => update('billing', e.target.value)} style={inputStyle}>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            <label style={labelStyle}>Token Limit/month (-1 = unlimited)<input type="number" value={draft.tokenLimit} onChange={e => update('tokenLimit', Number(e.target.value))} style={inputStyle} /></label>
            <label style={labelStyle}>Tenant Limit (-1 = unlimited)<input type="number" value={draft.tenantLimit} onChange={e => update('tenantLimit', Number(e.target.value))} style={inputStyle} /></label>
            <label style={labelStyle}>Agent Limit (-1 = unlimited)<input type="number" value={draft.agentLimit} onChange={e => update('agentLimit', Number(e.target.value))} style={inputStyle} /></label>
            <label style={labelStyle}>Currency
              <select value={draft.currency} onChange={e => update('currency', e.target.value)} style={inputStyle}>
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
              </select>
            </label>
          </div>
          <label style={labelStyle}>Description<textarea value={draft.description} onChange={e => update('description', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' as const }} /></label>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.05em', marginBottom: 10 }}>MODEL ACCESS</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {models.map(m => (
                <button key={m} onClick={() => toggleModel(m)} style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  background: draft.modelAccess.includes(m) ? '#EFF6FF' : '#F8FAFC',
                  color: draft.modelAccess.includes(m) ? '#3B82F6' : '#94A3B8',
                  border: draft.modelAccess.includes(m) ? '1.5px solid #BFDBFE' : '1.5px solid #E2E8F0',
                }}>
                  {draft.modelAccess.includes(m) ? '✓ ' : ''}{m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.05em', marginBottom: 10 }}>FEATURE FLAGS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {draft.features.map(f => {
                const FIcon = f.icon;
                return (
                  <div key={f.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#F8FAFC', borderRadius: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FIcon size={14} color="#64748B" />
                      <span style={{ fontSize: 14, color: '#334155' }}>{f.label}</span>
                    </div>
                    {f.type === 'boolean'
                      ? <button onClick={() => updateFeature(f.key, !f.value)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: f.value ? '#22C55E' : '#CBD5E1' }}>
                          {f.value ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
                        </button>
                      : <input type="number" value={f.value as number} onChange={e => updateFeature(f.key, Number(e.target.value))}
                          style={{ width: 120, padding: '6px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, textAlign: 'right' as const }} />
                    }
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div style={{ padding: '16px 28px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={onClose} style={{ background: '#F1F5F9', border: 'none', padding: '10px 22px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#64748B' }}>Cancel</button>
          <button onClick={() => onSave(draft)} style={{ background: 'linear-gradient(135deg, #3B82F6, #7C3AED)', border: 'none', color: '#fff', padding: '10px 22px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Save size={15} /> {isNew ? 'Create Plan' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
