import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, Download, XCircle, ExternalLink, Calendar, RefreshCw } from 'lucide-react';

export default function BillingSettings() {
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const getFeaturesArray = (features) => {
    if (!features) return [];
    return [
      {
        key: 'api_access',
        label: 'API Access',
        type: 'boolean',
        value: features.api_access !== false,
      },
      {
        key: 'webhook_logging',
        label: 'Webhook Logging',
        type: 'boolean',
        value: !!features.webhook_logging,
      },
      {
        key: 'rag_documents',
        label: 'RAG Documents Limit',
        type: 'number',
        value:
          typeof features.rag_documents === 'number'
            ? features.rag_documents
            : 500,
      },
      {
        key: 'audit_trail',
        label: 'Audit Trail',
        type: 'boolean',
        value: !!features.audit_trail,
      },
      {
        key: 'priority_support',
        label: 'Priority Support',
        type: 'boolean',
        value: !!features.priority_support,
      },
      {
        key: 'custom_models',
        label: 'Custom Model Fine-Tuning',
        type: 'boolean',
        value: !!features.custom_models,
      },
      {
        key: 'dpdp_compliance',
        label: 'DPDP Compliance',
        type: 'boolean',
        value: features.dpdp_compliance !== false,
      },
      {
        key: 'sla_hours',
        label: 'SLA Response (hours)',
        type: 'number',
        value: typeof features.sla_hours === 'number' ? features.sla_hours : 72,
      },
    ];
  };

  useEffect(() => {
    fetchBilling();
  }, []);

  const fetchBilling = async () => {
    try {
      const token = localStorage.getItem('hk_user') ? 'cookie_auth' : null;
      const tenantSlug = localStorage.getItem('hk_tenant') || 'neuravolt';
      const apiBase =
        localStorage.getItem('hk_api_base') ||
        process.env.NEXT_PUBLIC_API_URL ||
        'http://localhost:3008';

      const res = await fetch(`${apiBase}/api/v1/user/billing`, {
        credentials: 'include',
        headers: {
          'x-tenant-slug': tenantSlug,
          ...(token ? {} : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        setBilling(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to load billing information');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const tenantSlug = localStorage.getItem('hk_tenant') || 'neuravolt';
      const apiBase =
        localStorage.getItem('hk_api_base') ||
        process.env.NEXT_PUBLIC_API_URL ||
        'http://localhost:3008';

      const res = await fetch(`${apiBase}/api/v1/user/billing/portal`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'x-tenant-slug': tenantSlug,
          'Content-Type': 'application/json'
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.open(data.url, '_blank');
        } else {
          throw new Error('Billing portal URL not found in response');
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to redirect to Stripe Customer Portal');
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
      const tenantSlug = localStorage.getItem('hk_tenant') || 'neuravolt';
      const apiBase =
        localStorage.getItem('hk_api_base') ||
        process.env.NEXT_PUBLIC_API_URL ||
        'http://localhost:3008';

      const res = await fetch(`${apiBase}/api/v1/user/billing/cancel`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'x-tenant-slug': tenantSlug,
          'Content-Type': 'application/json'
        },
      });

      if (res.ok) {
        alert('Your subscription has been scheduled for cancellation at the end of the billing period.');
        await fetchBilling();
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to cancel subscription');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResubscribe = () => {
    alert('To resubscribe or update your subscription tier, please use the "Manage Billing" button to open the Stripe Portal.');
  };

  if (loading)
    return (
      <div className="settings-loading">Loading subscription details...</div>
    );

  const isCanceling = billing?.status?.toUpperCase() === 'CANCELING';
  const isCancelled = billing?.status?.toUpperCase() === 'CANCELLED';
  const isFree = billing?.status?.toUpperCase() === 'FREE' || !billing?.status;

  const getStatusBadgeStyle = () => {
    const status = billing?.status?.toUpperCase();
    if (status === 'ACTIVE') return { background: '#10b981', color: '#fff' };
    if (status === 'CANCELING') return { background: '#f59e0b', color: '#fff' };
    if (status === 'CANCELLED') return { background: '#ef4444', color: '#fff' };
    return { background: 'var(--accent)', color: '#fff' };
  };

  return (
    <>
      <div className="settings-page-header">
        <h1>Billing &amp; Subscription</h1>
        <p>Manage your Harikson Enterprise plan and payment methods.</p>
      </div>

      {error && <div className="settings-alert error">{error}</div>}

      {billing && (
        <>
          {/* Current Plan */}
          <div className="settings-section">
            <h2>Current Plan</h2>
            <div className="settings-plan-card" style={{ position: 'relative' }}>
              <span className="settings-plan-badge" style={getStatusBadgeStyle()}>
                {billing.status}
              </span>
              <div className="settings-plan-body">
                <div className="settings-plan-info" style={{ flex: 1 }}>
                  <h3>{billing.planName}</h3>
                  <div className="settings-plan-price">
                    {billing.price} <span>/ user / month</span>
                  </div>
                  
                  {isCanceling && billing.currentPeriodEnd && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'rgba(245, 158, 11, 0.1)',
                      color: '#f59e0b',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      marginTop: '16px',
                      fontSize: '13.5px',
                      border: '1px solid rgba(245, 158, 11, 0.2)',
                    }}>
                      <Calendar size={16} />
                      <span>Subscription is scheduled to cancel. Access remains active until <strong>{new Date(billing.currentPeriodEnd).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>.</span>
                    </div>
                  )}

                  {isCancelled && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: '#ef4444',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      marginTop: '16px',
                      fontSize: '13.5px',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                    }}>
                      <XCircle size={16} />
                      <span>Your subscription has been canceled. To regain access to enterprise features, please resubscribe.</span>
                    </div>
                  )}

                  <ul className="settings-plan-features" style={{ marginTop: '20px' }}>
                    {billing.features ? (
                      getFeaturesArray(billing.features).map((f) => (
                        <li
                          key={f.key}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            opacity:
                              f.value ||
                              (typeof f.value === 'number' && f.value !== 0)
                                ? 1
                                : 0.6,
                          }}
                        >
                          {f.type === 'boolean' ? (
                            f.value ? (
                              <CheckCircle2 size={15} color="var(--accent)" />
                            ) : (
                              <XCircle
                                size={15}
                                style={{ color: 'var(--text-muted)' }}
                              />
                            )
                          ) : (
                            <CheckCircle2 size={15} color="var(--accent)" />
                          )}
                          <span>
                            {f.label}
                            {': '}
                            {f.type === 'number'
                              ? f.value === -1
                                ? 'Unlimited'
                                : f.key === 'sla_hours'
                                  ? `${f.value}h response SLA`
                                  : f.value.toLocaleString()
                              : f.value
                                ? 'Included'
                                : 'Not Included'}
                          </span>
                        </li>
                      ))
                    ) : (
                      <>
                        <li>
                          <CheckCircle2 size={15} color="var(--accent)" />{' '}
                          Unlimited messages (GPT-4o / Claude 3.5)
                        </li>
                        <li>
                          <CheckCircle2 size={15} color="var(--accent)" /> 100GB
                          Document Storage
                        </li>
                        <li>
                          <CheckCircle2 size={15} color="var(--accent)" />{' '}
                          Custom Agents &amp; Webhooks
                        </li>
                      </>
                    )}
                  </ul>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '160px' }}>
                  {!isFree && (
                    <button
                      className="btn-primary"
                      onClick={handleManageBilling}
                      disabled={actionLoading}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        width: '100%',
                        padding: '10px 16px',
                        fontWeight: '600'
                      }}
                    >
                      <ExternalLink size={15} />
                      {actionLoading ? 'Loading...' : 'Manage Billing'}
                    </button>
                  )}

                  {!isFree && !isCanceling && !isCancelled && (
                    <button
                      className="btn-secondary"
                      onClick={() => setShowCancelModal(true)}
                      disabled={actionLoading}
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        color: '#ef4444',
                        background: 'transparent',
                        fontWeight: '600'
                      }}
                    >
                      Cancel Plan
                    </button>
                  )}

                  {(isCanceling || isCancelled) && (
                    <button
                      className="btn-primary"
                      onClick={handleResubscribe}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        width: '100%',
                        padding: '10px 16px',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        fontWeight: '600'
                      }}
                    >
                      <RefreshCw size={15} />
                      Resubscribe
                    </button>
                  )}
                </div>
              </div>

              {/* Plan Usage Section */}
              <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                  Plan Usage &amp; Limits
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      <span>API Message Requests</span>
                      <span>24.5% (2,450 / 10,000)</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                      <div style={{ background: 'var(--accent)', width: '24.5%', height: '100%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      <span>RAG Documents Library</span>
                      <span>14.5% (14.5 GB / 100 GB)</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                      <div style={{ background: 'var(--accent)', width: '14.5%', height: '100%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Payment Method */}
          <div className="settings-section">
            <div className="settings-section-header">
              <h2>Payment Method</h2>
              {!isFree && (
                <button
                  className="btn-primary"
                  onClick={handleManageBilling}
                  disabled={actionLoading}
                >
                  Update
                </button>
              )}
            </div>
            {billing.paymentMethod ? (
              <div
                className="settings-payment-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                }}
              >
                <div className="settings-payment-icon">
                  <CreditCard size={22} color="var(--text-secondary)" />
                </div>
                <div>
                  <div style={{ fontWeight: '500', fontSize: '14px' }}>
                    {billing.paymentMethod.type} ending in{' '}
                    {billing.paymentMethod.last4}
                  </div>
                  <div
                    style={{
                      fontSize: '12.5px',
                      color: 'var(--text-muted)',
                      marginTop: '2px',
                    }}
                  >
                    Expires {billing.paymentMethod.expiry}
                  </div>
                </div>
              </div>
            ) : (
              <p
                style={{
                  fontSize: '13.5px',
                  color: 'var(--text-secondary)',
                  margin: 0,
                }}
              >
                {isFree ? 'No billing method is required for the free starter tier.' : 'No payment method on file. Add a billing card to manage automated payments.'}
              </p>
            )}
          </div>

          {/* Billing History */}
          <div className="settings-section">
            <h2>Billing History</h2>
            {!billing.invoices || billing.invoices.length === 0 ? (
              <p
                style={{
                  fontSize: '13.5px',
                  color: 'var(--text-secondary)',
                  margin: 0,
                }}
              >
                No invoices found for this billing period.
              </p>
            ) : (
              <div className="settings-table-wrapper">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr
                      style={{
                        borderBottom: '1px solid var(--border)',
                        textAlign: 'left',
                      }}
                    >
                      <th
                        style={{
                          color: 'var(--text-muted)',
                          fontWeight: '500',
                          padding: '8px',
                        }}
                      >
                        Invoice
                      </th>
                      <th
                        style={{
                          color: 'var(--text-muted)',
                          fontWeight: '500',
                          padding: '8px',
                        }}
                      >
                        Date
                      </th>
                      <th
                        style={{
                          color: 'var(--text-muted)',
                          fontWeight: '500',
                          padding: '8px',
                        }}
                      >
                        Amount
                      </th>
                      <th
                        style={{
                          color: 'var(--text-muted)',
                          fontWeight: '500',
                          padding: '8px',
                        }}
                      >
                        Status
                      </th>
                      <th
                        style={{
                          color: 'var(--text-muted)',
                          fontWeight: '500',
                          padding: '8px',
                          textAlign: 'right',
                        }}
                      >
                        Receipt
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {billing.invoices.map((inv) => (
                      <tr
                        key={inv.id}
                        style={{ borderBottom: '1px solid var(--border)' }}
                      >
                        <td style={{ fontWeight: '500', padding: '8px' }}>
                          {inv.id}
                        </td>
                        <td
                          style={{
                            color: 'var(--text-secondary)',
                            padding: '8px',
                          }}
                        >
                          {inv.date}
                        </td>
                        <td style={{ padding: '8px' }}>{inv.amount}</td>
                        <td style={{ padding: '8px' }}>
                          <span
                            className="settings-badge paid"
                            style={{
                              background: 'rgba(5, 150, 105, 0.1)',
                              color: '#059669',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                            }}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px' }}>
                          <button
                            onClick={() => {
                              if (inv.pdfUrl) window.open(inv.pdfUrl, '_blank');
                              else if (inv.invoiceUrl) window.open(inv.invoiceUrl, '_blank');
                              else alert(`Downloading receipt for ${inv.id}...`);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--text-muted)',
                              padding: '4px',
                            }}
                          >
                            <Download size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Confirmation Modal */}
      {showCancelModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: '#111827',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', color: '#f3f4f6' }}>Cancel Subscription</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#9ca3af', lineHeight: '1.5' }}>
              Are you sure you want to cancel your subscription? You will still have access to the plan features until the end of your billing cycle.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                className="btn-secondary" 
                onClick={() => setShowCancelModal(false)}
                style={{ padding: '8px 16px', fontSize: '14px' }}
              >
                No, Keep Plan
              </button>
              <button 
                className="btn-danger" 
                onClick={handleCancelSubscription}
                style={{ 
                  padding: '8px 16px', 
                  fontSize: '14px', 
                  backgroundColor: '#ef4444', 
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
