import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, Download } from 'lucide-react';

export default function BillingSettings() {
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBilling();
  }, []);

  const fetchBilling = async () => {
    try {
      const token = localStorage.getItem('hk_token');
      const apiBase = localStorage.getItem('hk_api_base') || 'http://localhost:3008';
      const res = await fetch(`${apiBase}/api/user/billing`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBilling(data);
      } else {
        throw new Error('Failed to load billing history');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="settings-loading">Loading subscription details...</div>;

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
                    <li><CheckCircle2 size={15} color="var(--accent)" /> Unlimited messages (GPT-4o / Claude 3.5)</li>
                    <li><CheckCircle2 size={15} color="var(--accent)" /> 100GB Document Storage</li>
                    <li><CheckCircle2 size={15} color="var(--accent)" /> Custom Agents &amp; Webhooks</li>
                  </ul>
                </div>
                <div>
                  <button className="btn-secondary" onClick={() => alert('Plan change is managed by workspace administrator.')}>Change Plan</button>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="settings-section">
            <div className="settings-section-header">
              <h2>Payment Method</h2>
              <button className="btn-primary" onClick={() => alert('Update payment method feature is locked.')}>Update</button>
            </div>
            <div className="settings-payment-card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: '1px solid var(--border)', borderRadius: '8px' }}>
              <div className="settings-payment-icon">
                <CreditCard size={22} color="var(--text-secondary)" />
              </div>
              <div>
                <div style={{ fontWeight: '500', fontSize: '14px' }}>{billing.paymentMethod.type} ending in {billing.paymentMethod.last4}</div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>Expires {billing.paymentMethod.expiry}</div>
              </div>
            </div>
          </div>

          {/* Billing History */}
          <div className="settings-section">
            <h2>Billing History</h2>
            <div className="settings-table-wrapper">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                    <th style={{ color: 'var(--text-muted)', fontWeight: '500', padding: '8px' }}>Invoice</th>
                    <th style={{ color: 'var(--text-muted)', fontWeight: '500', padding: '8px' }}>Date</th>
                    <th style={{ color: 'var(--text-muted)', fontWeight: '500', padding: '8px' }}>Amount</th>
                    <th style={{ color: 'var(--text-muted)', fontWeight: '500', padding: '8px' }}>Status</th>
                    <th style={{ color: 'var(--text-muted)', fontWeight: '500', padding: '8px', textAlign: 'right' }}>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {billing.invoices.map(inv => (
                    <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ fontWeight: '500', padding: '8px' }}>{inv.id}</td>
                      <td style={{ color: 'var(--text-secondary)', padding: '8px' }}>{inv.date}</td>
                      <td style={{ padding: '8px' }}>{inv.amount}</td>
                      <td style={{ padding: '8px' }}>
                        <span className="settings-badge paid" style={{ background: 'rgba(5, 150, 105, 0.1)', color: '#059669', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>{inv.status}</span>
                      </td>
                      <td style={{ textAlign: 'right', padding: '8px' }}>
                        <button 
                          onClick={() => alert(`Downloading receipt for ${inv.id}...`)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
                        >
                          <Download size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}
