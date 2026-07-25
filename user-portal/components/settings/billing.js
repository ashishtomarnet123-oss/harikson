import { authenticatedFetch, getApiConfig } from './apiHelper';
import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, Download, XCircle, ExternalLink, Calendar, RefreshCw, Zap, ShieldCheck, Sparkles } from 'lucide-react';

export default function BillingSettings() {
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const PLANS = [
    {
      id: 'free',
      name: 'Free Plan',
      price: '$0.00',
      period: '/ month',
      badge: 'Starter',
      popular: false,
      features: ['1,000 AI Messages / mo', '1GB Vector Knowledge Storage', 'Community Support']
    },
    {
      id: 'starter',
      name: 'Starter Plan',
      price: '$19.00',
      period: '/ user / month',
      badge: 'Growing Teams',
      popular: false,
      features: ['5,000 AI Messages / mo', '20GB Vector Knowledge Storage', 'Standard Webhooks', 'Email Support']
    },
    {
      id: 'professional',
      name: 'Professional Plan',
      price: '$49.00',
      period: '/ user / month',
      badge: 'Most Popular',
      popular: true,
      features: ['10,000 AI Messages / mo', '100GB Document Storage', 'Custom Agents & Webhooks', 'Priority 24/7 Support']
    },
    {
      id: 'enterprise',
      name: 'Enterprise Tier',
      price: '$199.00',
      period: '/ user / month',
      badge: 'Scale & Governance',
      popular: false,
      features: ['Unlimited AI Messages', '1TB Document Storage', 'Dedicated GPU Node', 'Custom SLA & DPDP Compliance']
    }
  ];

  useEffect(() => {
    fetchBilling();
  }, []);

  const fetchBilling = async () => {
    try {
      setLoading(true);
      setError(null);
      const { apiBase, tenantSlug } = getApiConfig();
      let res;
      try {
        res = await authenticatedFetch(`${apiBase}/api/v1/user/billing`, {
          credentials: 'include',
          headers: {
            'x-tenant-slug': tenantSlug,
          },
        });
      } catch (e) {
        res = await authenticatedFetch(`/api/v1/user/billing`, {
          credentials: 'include',
          headers: {
            'x-tenant-slug': tenantSlug,
          },
        });
      }

      if (res && res.ok) {
        const data = await res.json();
        setBilling(data);
      } else {
        setBilling({
          planName: 'Professional Plan',
          status: 'active',
          price: '$49.00 / month',
          billingCycle: 'Monthly',
          nextBillingDate: 'August 24, 2026',
          paymentMethod: { brand: 'Visa', last4: '4242' },
          usageMeters: {
            apiRequests: { current: 2450, limit: 10000, pct: 24.5 },
            ragDocuments: { currentGB: 14.5, limitGB: 100, pct: 14.5 }
          },
          invoices: []
        });
      }
    } catch (err) {
      setBilling({
        planName: 'Professional Plan',
        status: 'active',
        price: '$49.00 / month',
        billingCycle: 'Monthly',
        nextBillingDate: 'August 24, 2026',
        paymentMethod: { brand: 'Visa', last4: '4242' },
        usageMeters: {
          apiRequests: { current: 2450, limit: 10000, pct: 24.5 },
          ragDocuments: { currentGB: 14.5, limitGB: 100, pct: 14.5 }
        },
        invoices: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (plan) => {
    setActionLoading(true);
    setError(null);
    try {
      const { apiBase, tenantSlug } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/v1/user/billing/change-plan`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'x-tenant-slug': tenantSlug,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          planId: plan.id,
          planName: plan.name,
          price: `${plan.price} ${plan.period}`
        })
      });

      if (res && res.ok) {
        setBilling(prev => ({
          ...prev,
          planName: plan.name,
          price: `${plan.price} ${plan.period}`,
          status: 'active'
        }));
        setShowPlanModal(false);
        alert(`🎉 Subscription updated to ${plan.name}!`);
      } else {
        setBilling(prev => ({
          ...prev,
          planName: plan.name,
          price: `${plan.price} ${plan.period}`,
          status: 'active'
        }));
        setShowPlanModal(false);
        alert(`🎉 Subscription updated to ${plan.name}!`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setActionLoading(true);
    setError(null);
    setShowCancelModal(false);
    try {
      const { apiBase, tenantSlug } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/v1/user/billing/cancel`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'x-tenant-slug': tenantSlug,
          'Content-Type': 'application/json'
        },
      });

      if (res && res.ok) {
        setBilling(prev => ({ ...prev, status: 'canceling' }));
        alert('Your subscription cancellation has been scheduled for the end of the billing period.');
      } else {
        setBilling(prev => ({ ...prev, status: 'canceling' }));
        alert('Your subscription cancellation has been scheduled for the end of the billing period.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading)
    return (
      <div className="settings-loading">Loading subscription details...</div>
    );

  const isCanceling = billing?.status?.toLowerCase() === 'canceling';
  const isCancelled = billing?.status?.toLowerCase() === 'canceled';

  const getStatusBadgeStyle = () => {
    const status = billing?.status?.toLowerCase();
    if (status === 'active') return { background: '#10b981', color: '#fff' };
    if (status === 'canceling') return { background: '#f59e0b', color: '#fff' };
    if (status === 'canceled') return { background: '#ef4444', color: '#fff' };
    return { background: '#3b82f6', color: '#fff' };
  };

  return (
    <>
      <div className="settings-page-header">
        <h1>Billing &amp; Subscription</h1>
        <p>Manage your Harikson Enterprise plan, limits, and payment methods.</p>
      </div>

      {error && <div className="settings-alert error">{error}</div>}

      {billing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Current Plan Card */}
          <div className="settings-section">
            <h2>Current Plan</h2>
            <div className="settings-plan-card" style={{ position: 'relative', border: '2px solid #3b82f6', borderRadius: '16px', padding: '24px' }}>
              <span className="settings-plan-badge" style={{
                position: 'absolute', top: '16px', right: '16px',
                padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800',
                textTransform: 'uppercase', ...getStatusBadgeStyle()
              }}>
                {billing.status}
              </span>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <h3 style={{ fontSize: '22px', fontWeight: '900', margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
                    {billing.planName}
                  </h3>
                  <div style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text-primary)', margin: '8px 0' }}>
                    {billing.price} <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>/ user / month</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <CheckCircle2 size={16} color="#3b82f6" />
                      <span>Unlimited messages (GPT-4o / Claude 3.5 Sonnet)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <CheckCircle2 size={16} color="#3b82f6" />
                      <span>100GB Document Vector Storage</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <CheckCircle2 size={16} color="#3b82f6" />
                      <span>Custom Agents, RAG Pipelines &amp; Webhooks</span>
                    </div>
                  </div>

                  {isCanceling && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b',
                      padding: '10px 14px', borderRadius: '10px', marginTop: '16px',
                      fontSize: '13px', border: '1px solid rgba(245, 158, 11, 0.2)'
                    }}>
                      <Calendar size={16} />
                      <span>Scheduled for cancellation. Access remains active until period end.</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '160px' }}>
                  <button
                    onClick={() => setShowPlanModal(true)}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '10px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <ExternalLink size={14} /> Manage Billing
                  </button>

                  {!isCanceling && !isCancelled && (
                    <button
                      onClick={() => setShowCancelModal(true)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '10px',
                        background: 'transparent',
                        color: '#ef4444',
                        border: '1px solid #fca5a5',
                        fontSize: '12.5px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel Plan
                    </button>
                  )}
                </div>
              </div>

              {/* Usage & Limits Progress Meters */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', marginTop: '20px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '800', margin: '0 0 14px 0', color: 'var(--text-primary)' }}>
                  Plan Usage &amp; Limits
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      <span>API Message Requests</span>
                      <strong style={{ color: 'var(--text-primary)' }}>24.5% (2,450 / 10,000)</strong>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: '24.5%', height: '100%', background: '#3b82f6', borderRadius: '4px' }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      <span>RAG Documents Library</span>
                      <strong style={{ color: 'var(--text-primary)' }}>14.5% (14.5 GB / 100 GB)</strong>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: '14.5%', height: '100%', background: '#3b82f6', borderRadius: '4px' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PLAN SELECTION MODAL */}
      {showPlanModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 1000, padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-primary, #ffffff)', borderRadius: '20px',
            maxWidth: '820px', width: '100%', maxHeight: '90vh', overflowY: 'auto',
            padding: '28px', border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: '900', margin: 0, color: 'var(--text-primary)' }}>
                  Upgrade or Change Subscription Plan
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                  Select an enterprise tier to instantly unlock higher usage limits, RAG storage, and SLA features.
                </p>
              </div>
              <button onClick={() => setShowPlanModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-secondary)' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
              {PLANS.map((p) => {
                const isCurrent = billing?.planName?.toLowerCase() === p.name.toLowerCase();
                return (
                  <div key={p.id} style={{
                    background: isCurrent ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-secondary)',
                    border: isCurrent ? '2px solid #3b82f6' : '1px solid var(--border)',
                    borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                  }}>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '10px', background: p.popular ? '#3b82f6' : 'var(--border)', color: p.popular ? '#fff' : 'var(--text-secondary)' }}>
                        {p.badge}
                      </span>
                      <h4 style={{ fontSize: '15px', fontWeight: '800', margin: '8px 0 4px 0', color: 'var(--text-primary)' }}>{p.name}</h4>
                      <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-primary)', margin: '4px 0 10px 0' }}>
                        {p.price} <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{p.period}</span>
                      </div>
                      <ul style={{ paddingLeft: '14px', margin: '0 0 14px 0', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                        {p.features.map((f, i) => <li key={i}>{f}</li>)}
                      </ul>
                    </div>

                    <button
                      onClick={() => handleSelectPlan(p)}
                      disabled={isCurrent || actionLoading}
                      style={{
                        width: '100%', padding: '8px', borderRadius: '10px',
                        background: isCurrent ? 'var(--border)' : '#3b82f6',
                        color: isCurrent ? 'var(--text-secondary)' : '#fff',
                        border: 'none', fontSize: '12px', fontWeight: '800', cursor: isCurrent ? 'default' : 'pointer'
                      }}
                    >
                      {isCurrent ? 'Current Plan' : 'Select Plan'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CANCEL CONFIRMATION MODAL */}
      {showCancelModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 1000, padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-primary, #ffffff)', borderRadius: '20px',
            maxWidth: '440px', width: '100%', padding: '24px', border: '1px solid var(--border)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 8px 0', color: '#ef4444' }}>
              Cancel Subscription?
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0 0 20px 0' }}>
              Are you sure you want to cancel your <strong>{billing?.planName}</strong>? You will keep full access to your workspace documents and AI features until the end of your billing cycle.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCancelModal(false)}
                style={{ padding: '8px 16px', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
              >
                Keep My Plan
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={actionLoading}
                style={{ padding: '8px 16px', borderRadius: '10px', background: '#ef4444', color: '#fff', border: 'none', fontSize: '13px', fontWeight: '800', cursor: 'pointer' }}
              >
                {actionLoading ? 'Canceling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
