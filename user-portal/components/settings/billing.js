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
        <h1>Billing & Subscription</h1>
        <p>Manage your Harikson Enterprise plan and payment methods.</p>
      </div>

      <div className="settings-section">
        <h2>Current Plan</h2>
        <div style={{border: '2px solid var(--accent)', borderRadius: 'var(--radius-lg)', padding: '24px', background: 'var(--bg-primary)', position: 'relative', overflow: 'hidden'}}>
          <div style={{position: 'absolute', top: 0, right: 0, background: 'var(--accent)', color: '#fff', padding: '4px 12px', fontSize: '12px', fontWeight: 'bold', borderBottomLeftRadius: 'var(--radius-md)'}}>
            ACTIVE
          </div>
          <div className="settings-flex-row" style={{ alignItems: 'flex-start' }}>
            <div>
              <h3 style={{fontSize: '24px', margin: '0 0 8px 0'}}>Pro Plan</h3>
              <div style={{fontSize: '32px', fontWeight: 'bold', marginBottom: '16px'}}>$49 <span style={{fontSize: '16px', color: 'var(--text-muted)', fontWeight: 'normal'}}>/ user / month</span></div>
              <ul style={{listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px'}}>
                <li style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px'}}><CheckCircle2 size={16} color="var(--accent)" /> Unlimited messages (GPT-4o / Claude 3.5)</li>
                <li style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px'}}><CheckCircle2 size={16} color="var(--accent)" /> 100GB Document Storage</li>
                <li style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px'}}><CheckCircle2 size={16} color="var(--accent)" /> Custom Agents & Webhooks</li>
              </ul>
            </div>
            <button className="btn-primary" style={{background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}>Change Plan</button>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-flex-row" style={{ marginBottom: '20px' }}>
          <h2 style={{margin: 0, border: 'none', padding: 0}}>Payment Method</h2>
          <button className="btn-primary">Update</button>
        </div>
        <div className="settings-card" style={{display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{background: 'var(--bg-hover)', padding: '8px', borderRadius: '4px'}}>
            <CreditCard size={24} color="var(--text-secondary)" />
          </div>
          <div>
            <div style={{fontWeight: '500'}}>Mastercard ending in 4242</div>
            <div style={{fontSize: '13px', color: 'var(--text-muted)'}}>Expires 12/2028</div>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2>Billing History</h2>
        <div className="settings-table-wrapper">
          <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '14px'}}>
            <thead>
            <tr style={{borderBottom: '1px solid var(--border)', textAlign: 'left'}}>
              <th style={{padding: '12px 8px', color: 'var(--text-muted)', fontWeight: '500'}}>Invoice</th>
              <th style={{padding: '12px 8px', color: 'var(--text-muted)', fontWeight: '500'}}>Date</th>
              <th style={{padding: '12px 8px', color: 'var(--text-muted)', fontWeight: '500'}}>Amount</th>
              <th style={{padding: '12px 8px', color: 'var(--text-muted)', fontWeight: '500'}}>Status</th>
              <th style={{padding: '12px 8px', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'right'}}>Receipt</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map(inv => (
              <tr key={inv.id} style={{borderBottom: '1px solid var(--border)'}}>
                <td style={{padding: '16px 8px', fontWeight: '500'}}>{inv.id}</td>
                <td style={{padding: '16px 8px', color: 'var(--text-secondary)'}}>{inv.date}</td>
                <td style={{padding: '16px 8px'}}>{inv.amount}</td>
                <td style={{padding: '16px 8px'}}><span style={{background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600'}}>{inv.status}</span></td>
                <td style={{padding: '16px 8px', textAlign: 'right'}}>
                  <button style={{background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)'}}><Download size={16} /></button>
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
