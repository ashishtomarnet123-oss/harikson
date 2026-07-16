import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, Download, XCircle } from 'lucide-react';

export default function BillingSettings() {
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  if (loading)
    return (
      <div className="settings-loading">Loading subscription details...</div>
    );

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
            <div className="settings-plan-card">
              <span className="settings-plan-badge">{billing.status}</span>
              <div className="settings-plan-body">
                <div className="settings-plan-info">
                  <h3>{billing.planName}</h3>
                  <div className="settings-plan-price">
                    {billing.price} <span>/ user / month</span>
                  </div>
                  <ul className="settings-plan-features">
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
                <div>
                  <button
                    className="btn-secondary"
                    onClick={() =>
                      alert(
                        'Plan change is managed by workspace administrator.'
                      )
                    }
                  >
                    Change Plan
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="settings-section">
            <div className="settings-section-header">
              <h2>Payment Method</h2>
              <button
                className="btn-primary"
                onClick={() =>
                  alert('Update payment method feature is locked.')
                }
              >
                {billing.paymentMethod ? 'Update' : 'Add Card'}
              </button>
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
                No payment method on file. Add a billing card to manage
                automated payments.
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
                            onClick={() =>
                              alert(`Downloading receipt for ${inv.id}...`)
                            }
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
    </>
  );
}
