import { authenticatedFetch, getApiConfig } from './apiHelper';
import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle2,
  Download,
  XCircle,
  ExternalLink,
  Calendar,
  Sparkles,
  TrendingUp,
  Repeat,
  AlertCircle,
} from 'lucide-react';

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
      features: ['1,000 AI Messages / mo', '1GB Vector Knowledge Storage', 'Community Support'],
    },
    {
      id: 'starter',
      name: 'Starter Plan',
      price: '$19.00',
      period: '/ user / month',
      badge: 'Growing Teams',
      popular: false,
      features: ['5,000 AI Messages / mo', '20GB Vector Knowledge Storage', 'Standard Webhooks', 'Email Support'],
    },
    {
      id: 'professional',
      name: 'Professional Plan',
      price: '$49.00',
      period: '/ user / month',
      badge: 'Most Popular',
      popular: true,
      features: ['10,000 AI Messages / mo', '100GB Document Storage', 'Custom Agents & Webhooks', 'Priority 24/7 Support'],
    },
    {
      id: 'enterprise',
      name: 'Enterprise Tier',
      price: '$199.00',
      period: '/ user / month',
      badge: 'Scale & Governance',
      popular: false,
      features: ['Unlimited AI Messages', '1TB Document Storage', 'Dedicated GPU Node', 'Custom SLA & DPDP Compliance'],
    },
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
        // Do not fabricate plan/card/invoice data on a non-OK response — show
        // a real error state instead so a user never mistakes a fake plan or
        // card for their actual billing status.
        setBilling(null);
        setError('Unable to load billing information. Please refresh the page or contact support if this keeps happening.');
      }
    } catch (err) {
      setBilling(null);
      setError('Unable to reach the billing service. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      const { apiBase, tenantSlug } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/v1/user/billing/portal`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'x-tenant-slug': tenantSlug,
        },
      });
      if (res && res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
          return;
        }
      }
      setShowPlanModal(true);
    } catch (e) {
      setShowPlanModal(true);
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
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: plan.id,
          planName: plan.name,
          price: `${plan.price} ${plan.period}`,
        }),
      });

      if (res && res.ok) {
        setBilling((prev) => ({
          ...prev,
          planName: plan.name,
          price: `${plan.price} ${plan.period}`,
          status: 'ACTIVE',
          isTrial: false,
        }));
        setShowPlanModal(false);
      } else {
        // Previously this branch applied the exact same optimistic update as
        // the success path, so a failed plan-change silently looked like it
        // worked. Surface the real failure instead and keep the modal open.
        const data = await res?.json().catch(() => ({}));
        setError(data?.error || 'Failed to change plan. Please try again.');
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
    try {
      const { apiBase, tenantSlug } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/v1/user/billing/cancel`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'x-tenant-slug': tenantSlug,
          'Content-Type': 'application/json',
        },
      });

      if (res && res.ok) {
        setBilling((prev) => ({ ...prev, status: 'CANCELLED' }));
        setShowCancelModal(false);
      } else {
        const data = await res?.json().catch(() => ({}));
        setError(data?.error || 'Failed to cancel subscription. Please try again.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="settings-loading-state">
        <div className="login-spinner" style={{ width: '28px', height: '28px' }} />
        <span>Loading subscription details...</span>
      </div>
    );
  }

  const isCanceling = billing?.status?.toLowerCase() === 'canceling' || billing?.status?.toLowerCase() === 'canceled';

  return (
    <div className="billing-settings-container">
      {/* Page Title Header */}
      <div className="settings-header-group">
        <h1 className="settings-main-title">Billing &amp; Subscription</h1>
        <p className="settings-main-subtitle">
          Manage your plan, usage, and payment details.
        </p>
      </div>

      {error && (
        <div className="settings-toast-banner error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {!billing && !loading && (
        <div className="billing-plan-card" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <p style={{ color: '#64748b', marginBottom: '16px' }}>
            We couldn&apos;t load your billing details right now.
          </p>
          <button type="button" className="btn-change-plan-outline" onClick={fetchBilling}>
            Retry
          </button>
        </div>
      )}

      {billing && (
        <>
          {/* ── Main Current Plan Card ── */}
          <div className="billing-plan-card">
            <div className="plan-card-header-row">
              <h2 className="plan-name-heading">{billing.planName || 'No plan'}</h2>
              <span className={`billing-status-badge ${billing.status?.toLowerCase()}`}>
                {billing.status || 'UNKNOWN'}
              </span>
            </div>

            <div className="billing-card-split">
              {/* Left Side (~55%) */}
              <div className="billing-left-col">
                {billing.isTrial && (
                  <div className="trial-pill-badge">
                    <Sparkles size={13} color="#2563eb" />
                    <span>{billing.trialDays ?? '—'}-Day Free Trial Active</span>
                  </div>
                )}

                <div className="plan-price-row">
                  <span className="price-bold">{billing.price || '—'}</span>
                  {billing.isTrial && <span className="free-trial-tag">(Free Trial)</span>}
                  {billing.daysRemaining != null && (
                    <span className="days-remaining">| {billing.daysRemaining} days remaining</span>
                  )}
                </div>

                <div className="plan-subtext">
                  <Calendar size={14} />
                  <span>
                    {billing.isTrial
                      ? `Trial ends ${billing.trialEndDate || '—'}  •  Then ${billing.postTrialPrice || '—'}`
                      : `Next billing date: ${billing.nextBillingDate || '—'}`}
                  </span>
                </div>

                <div className="plan-features-list">
                  {(Array.isArray(billing.features) ? billing.features : []).map((feat, idx) => (
                    <div key={idx} className="feature-item">
                      <CheckCircle2 size={15} className="feature-check-icon" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vertical Divider */}
              <div className="billing-card-divider" />

              {/* Right Side (~45%) */}
              <div className="billing-right-col">
                <div className="usage-metric-block">
                  <div className="metric-header-row">
                    <span className="metric-title">API Message Requests</span>
                    <span className="metric-counts">
                      {billing.usageMeters?.apiRequests?.current?.toLocaleString() ?? '—'} /{' '}
                      {billing.usageMeters?.apiRequests?.limit?.toLocaleString() ?? '—'}
                    </span>
                    <span className="metric-pct-pill">
                      {billing.usageMeters?.apiRequests?.pct ?? '—'}% used
                    </span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min(billing.usageMeters?.apiRequests?.pct || 0, 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="usage-metric-block">
                  <div className="metric-header-row">
                    <span className="metric-title">RAG Documents Library</span>
                    <span className="metric-counts">
                      {billing.usageMeters?.ragDocuments?.currentGB ?? '—'} GB /{' '}
                      {billing.usageMeters?.ragDocuments?.limitGB ?? '—'} GB
                    </span>
                    <span className="metric-pct-pill">
                      {billing.usageMeters?.ragDocuments?.pct ?? '—'}% used
                    </span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min(billing.usageMeters?.ragDocuments?.pct || 0, 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="billing-actions-row">
                  <button
                    type="button"
                    className="btn-manage-billing"
                    onClick={handleManageBilling}
                  >
                    <ExternalLink size={14} />
                    <span>Manage Billing</span>
                  </button>
                  <button
                    type="button"
                    className="btn-change-plan-outline"
                    onClick={() => setShowPlanModal(true)}
                  >
                    Change Plan
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── 2-Column Row (Payment Method + Next Payment) ── */}
          <div className="billing-two-col-grid">
            {/* Card 1: Payment Method */}
            <div className="billing-sub-card">
              <div className="sub-card-header">
                <h3 className="sub-card-title">Payment Method</h3>
                <button
                  type="button"
                  className="btn-update-outline"
                  onClick={handleManageBilling}
                >
                  Update
                </button>
              </div>
              {billing.paymentMethod ? (
                <div className="payment-method-row">
                  <div className="card-brand-badge">{billing.paymentMethod.brand || 'CARD'}</div>
                  <div className="card-info">
                    <span className="card-title-text">
                      {billing.paymentMethod.brand || 'Card'} ••••{' '}
                      {billing.paymentMethod.last4 || '••••'}
                    </span>
                    {billing.paymentMethod.exp && (
                      <span className="card-sub-text">Expires {billing.paymentMethod.exp}</span>
                    )}
                    {billing.paymentMethod.lastUpdated && (
                      <span className="card-sub-text">Last updated: {billing.paymentMethod.lastUpdated}</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="empty-payment-method">
                  <span>No payment method added yet.</span>
                </div>
              )}
            </div>

            {/* Card 2: Next Payment */}
            <div className="billing-sub-card">
              <h3 className="sub-card-title">Next Payment</h3>
              <div className="next-payment-content">
                <div className="next-payment-left">
                  <div className="calendar-icon-box">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <div className="next-payment-amount">
                      {billing.nextPaymentAmount || '—'}
                    </div>
                    <div className="next-payment-due">
                      Due on {billing.nextBillingDate || '—'}
                    </div>
                  </div>
                </div>
                <div className="next-payment-meta">
                  <div className="meta-row">
                    <span>Plan</span>
                    <strong>{billing.planName?.replace(' Plan', '') || '—'}</strong>
                  </div>
                  <div className="meta-row">
                    <span>Billing cycle</span>
                    <strong>{billing.billingCycle || '—'}</strong>
                  </div>
                  <div className="meta-row">
                    <span>Payment method</span>
                    <strong>
                      {billing.paymentMethod
                        ? `${billing.paymentMethod.brand} •••• ${billing.paymentMethod.last4}`
                        : 'None'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Billing History Table ── */}
          <div className="settings-section-block">
            <div className="history-header">
              <h2 className="settings-section-heading" style={{ margin: 0 }}>
                Billing History
              </h2>
              <button
                type="button"
                className="view-all-invoices-link"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={handleManageBilling}
              >
                View all invoices →
              </button>
            </div>

            <div className="invoices-table-wrapper">
              <table className="invoices-table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Date</th>
                    <th>Plan</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {billing.invoices && billing.invoices.length > 0 ? (
                    billing.invoices.map((inv) => (
                      <tr key={inv.id || inv.code || inv.number}>
                        {/* Backend returns `number` (invoice_number) and no
                            per-invoice planName — the old fake data had
                            `code`/`planName` fields that don't exist on a
                            real invoice row, so fall back sensibly instead
                            of rendering blank cells or crashing. */}
                        <td className="inv-code">{inv.code || inv.number || '—'}</td>
                        <td>{inv.date ? new Date(inv.date).toLocaleDateString() : '—'}</td>
                        <td>{inv.planName || billing.planName || '—'}</td>
                        <td>{inv.amount != null ? `${inv.currency ? inv.currency + ' ' : ''}${inv.amount}` : '—'}</td>
                        <td>
                          <span className={`inv-status-pill ${(inv.status || '').toLowerCase()}`}>
                            {inv.status || 'Unknown'}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-inv-download"
                            onClick={() => inv.url && window.open(inv.url, '_blank')}
                            title="Download Invoice"
                          >
                            <Download size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                        No billing history recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Bottom 3 Subscription Action Cards ── */}
          <div className="billing-bottom-actions-grid">
            <div className="action-card primary-action" onClick={() => setShowPlanModal(true)}>
              <div className="action-icon-circle blue">
                <TrendingUp size={18} color="#2563eb" />
              </div>
              <div>
                <span className="action-card-title">Upgrade Plan</span>
                <span className="action-card-sub">Get more features</span>
              </div>
            </div>

            <div className="action-card primary-action" onClick={() => setShowPlanModal(true)}>
              <div className="action-icon-circle blue">
                <Repeat size={18} color="#2563eb" />
              </div>
              <div>
                <span className="action-card-title">Change Plan</span>
                <span className="action-card-sub">Downgrade or switch</span>
              </div>
            </div>

            <div className="action-card danger-action" onClick={() => setShowCancelModal(true)}>
              <div className="action-icon-circle red">
                <XCircle size={18} color="#ef4444" />
              </div>
              <div>
                <span className="action-card-title red-text">Cancel Subscription</span>
                <span className="action-card-sub red-sub">Cancel your plan</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Plan Selection Modal ── */}
      {showPlanModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '820px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    margin: 0,
                    color: '#0f172a',
                  }}
                >
                  Upgrade or Change Subscription Plan
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                  Select an enterprise tier to instantly unlock higher usage limits, RAG storage, and SLA features.
                </p>
              </div>
              <button
                onClick={() => setShowPlanModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '14px',
              }}
            >
              {PLANS.map((p) => {
                const isCurrent = billing?.planName?.toLowerCase() === p.name.toLowerCase();
                return (
                  <div
                    key={p.id}
                    style={{
                      background: isCurrent ? '#eff6ff' : '#fafafc',
                      border: isCurrent ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                      borderRadius: '14px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '10px',
                          background: p.popular ? '#3b82f6' : '#e2e8f0',
                          color: p.popular ? '#fff' : '#475569',
                        }}
                      >
                        {p.badge}
                      </span>
                      <h4
                        style={{
                          fontSize: '15px',
                          fontWeight: 700,
                          margin: '8px 0 4px 0',
                          color: '#0f172a',
                        }}
                      >
                        {p.name}
                      </h4>
                      <div
                        style={{
                          fontSize: '20px',
                          fontWeight: 800,
                          color: '#0f172a',
                          margin: '4px 0 10px 0',
                        }}
                      >
                        {p.price}{' '}
                        <span style={{ fontSize: '10px', color: '#64748b' }}>{p.period}</span>
                      </div>
                      <ul
                        style={{
                          paddingLeft: '14px',
                          margin: '0 0 14px 0',
                          fontSize: '11px',
                          color: '#475569',
                          lineHeight: '1.6',
                        }}
                      >
                        {p.features.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>

                    <button
                      onClick={() => handleSelectPlan(p)}
                      disabled={isCurrent || actionLoading}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '8px',
                        background: isCurrent ? '#cbd5e1' : '#3b82f6',
                        color: isCurrent ? '#64748b' : '#fff',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: isCurrent ? 'default' : 'pointer',
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

      {/* ── Cancel Confirmation Modal ── */}
      {showCancelModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
            }}
          >
            <h3
              style={{
                fontSize: '18px',
                fontWeight: 700,
                margin: '0 0 8px 0',
                color: '#dc2626',
              }}
            >
              Cancel Subscription?
            </h3>
            <p
              style={{
                fontSize: '13px',
                color: '#64748b',
                lineHeight: '1.5',
                margin: '0 0 20px 0',
              }}
            >
              Are you sure you want to cancel your <strong>{billing?.planName}</strong>? You will keep full access to your workspace documents and AI features until the end of your billing cycle.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCancelModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                Keep My Plan
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={actionLoading}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {actionLoading ? 'Canceling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
