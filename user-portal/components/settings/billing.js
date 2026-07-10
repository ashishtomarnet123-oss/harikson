import React from 'react';
import { CreditCard, CheckCircle2, Download } from 'lucide-react';

export default function BillingSettings() {
  const invoices = [
    { id: 'INV-2026-004', date: 'Jul 1, 2026', amount: '$49.00', status: 'Paid' },
    { id: 'INV-2026-003', date: 'Jun 1, 2026', amount: '$49.00', status: 'Paid' },
    { id: 'INV-2026-002', date: 'May 1, 2026', amount: '$49.00', status: 'Paid' }
  ];

  return (
    <>
      <div className="settings-page-header">
        <h1>Billing &amp; Subscription</h1>
        <p>Manage your Harikson Enterprise plan and payment methods.</p>
      </div>

      {/* Current Plan */}
      <div className="settings-section">
        <h2>Current Plan</h2>
        <div className="settings-plan-card">
          <span className="settings-plan-badge">ACTIVE</span>
          <div className="settings-plan-body">
            <div className="settings-plan-info">
              <h3>Pro Plan</h3>
              <div className="settings-plan-price">
                $49 <span>/ user / month</span>
              </div>
              <ul className="settings-plan-features">
                <li><CheckCircle2 size={15} color="var(--accent)" /> Unlimited messages (GPT-4o / Claude 3.5)</li>
                <li><CheckCircle2 size={15} color="var(--accent)" /> 100GB Document Storage</li>
                <li><CheckCircle2 size={15} color="var(--accent)" /> Custom Agents &amp; Webhooks</li>
              </ul>
            </div>
            <div>
              <button className="btn-secondary">Change Plan</button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Method */}
      <div className="settings-section">
        <div className="settings-section-header">
          <h2>Payment Method</h2>
          <button className="btn-primary">Update</button>
        </div>
        <div className="settings-payment-card">
          <div className="settings-payment-icon">
            <CreditCard size={22} color="var(--text-secondary)" />
          </div>
          <div>
            <div style={{ fontWeight: '500', fontSize: '14px' }}>Mastercard ending in 4242</div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>Expires 12/2028</div>
          </div>
        </div>
      </div>

      {/* Billing History */}
      <div className="settings-section">
        <h2>Billing History</h2>
        <div className="settings-table-wrapper">
          <table>
            <thead>
              <tr>
                <th style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Invoice</th>
                <th style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Date</th>
                <th style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Amount</th>
                <th style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Status</th>
                <th style={{ color: 'var(--text-muted)', fontWeight: '500', textAlign: 'right' }}>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id}>
                  <td style={{ fontWeight: '500' }}>{inv.id}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{inv.date}</td>
                  <td>{inv.amount}</td>
                  <td>
                    <span className="settings-badge paid">{inv.status}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}>
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
  );
}
