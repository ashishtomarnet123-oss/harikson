'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface LegalHold {
  id: string;
  tenant_id: string;
  case_name: string;
  description: string;
  created_by_admin_email: string;
  status: 'active' | 'lifted';
  expires_at: string | null;
  lifted_at: string | null;
  lifted_by_admin_email: string | null;
  lift_reason: string | null;
  created_at: string;
}

export default function TenantLegalHoldsPage() {
  const params = useParams();
  const tenantId = params.id as string;

  const [holds, setHolds] = useState<LegalHold[]>([]);
  const [hasActiveHold, setHasActiveHold] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [caseName, setCaseName] = useState('');
  const [description, setDescription] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchLegalHolds = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/tenants/${tenantId}/legal-holds`);
      const data = await res.json();
      if (data.success) {
        setHolds(data.legalHolds);
        setHasActiveHold(data.hasActiveLegalHold);
      }
    } catch (err) {
      console.error('Failed to fetch legal holds:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) fetchLegalHolds();
  }, [tenantId]);

  const handleCreateHold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseName) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/admin/tenants/${tenantId}/legal-holds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseName, description, expiresAt: expiresAt || null }),
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        setCaseName('');
        setDescription('');
        setExpiresAt('');
        fetchLegalHolds();
      }
    } catch (err) {
      console.error('Failed to create legal hold:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLiftHold = async (holdId: string) => {
    const reason = prompt('Enter reason for lifting legal hold:');
    if (!reason) return;

    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/legal-holds/${holdId}/lift`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (data.success) {
        fetchLegalHolds();
      }
    } catch (err) {
      console.error('Failed to lift legal hold:', err);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
            ⚖️ Tenant Legal Holds & Litigation Locks
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>
            Tenant ID: <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{tenantId}</code>
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          style={{
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            padding: '10px 18px',
            borderRadius: '6px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          + Place Legal Hold
        </button>
      </div>

      {hasActiveHold && (
        <div style={{ backgroundColor: '#fef2f2', borderLeft: '4px solid #ef4444', padding: '16px', borderRadius: '6px', marginBottom: '24px' }}>
          <h3 style={{ margin: 0, color: '#991b1b', fontSize: '1.1rem' }}>⚠️ ACTIVE LEGAL HOLD IN EFFECT</h3>
          <p style={{ margin: '4px 0 0', color: '#b91c1c', fontSize: '0.9rem' }}>
            Automatic background retention purges and hard deletions are paused for this tenant while a legal hold is active.
          </p>
        </div>
      )}

      {loading ? (
        <div>Loading legal holds...</div>
      ) : (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#475569' }}>Case Name</th>
                <th style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#475569' }}>Status</th>
                <th style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#475569' }}>Placed By</th>
                <th style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#475569' }}>Created Date</th>
                <th style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#475569' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {holds.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                    No legal holds on record for this tenant.
                  </td>
                </tr>
              ) : (
                holds.map((hold) => (
                  <tr key={hold.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{hold.case_name}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          backgroundColor: hold.status === 'active' ? '#fee2e2' : '#f1f5f9',
                          color: hold.status === 'active' ? '#dc2626' : '#64748b',
                        }}
                      >
                        {hold.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#334155' }}>
                      {hold.created_by_admin_email || 'Admin System'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#64748b' }}>
                      {new Date(hold.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {hold.status === 'active' ? (
                        <button
                          onClick={() => handleLiftHold(hold.id)}
                          style={{
                            padding: '6px 12px',
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                          }}
                        >
                          Lift Hold
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Lifted on {new Date(hold.lifted_at!).toLocaleDateString()}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '8px', width: '480px' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '1.3rem' }}>Place Legal Hold</h2>
            <form onSubmit={handleCreateHold}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Case Name / Reference *</label>
                <input
                  type="text"
                  required
                  value={caseName}
                  onChange={(e) => setCaseName(e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  placeholder="e.g. SEC-Litigation-2026-04"
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Description / Reason</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', height: '80px' }}
                  placeholder="Specify legal hold order scope..."
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Target Expiration (Optional)</label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ padding: '8px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  {submitting ? 'Placing...' : 'Confirm Legal Hold'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
