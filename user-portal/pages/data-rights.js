import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, Shield, Download, FileText, CheckCircle, Clock, AlertTriangle, UserCheck, Search, Send, RefreshCw } from 'lucide-react';
import FooterSection from '../components/FooterSection';
import HeaderNav from '../components/layout/HeaderNav';
import SEOHead, { defaultOrganizationSchema } from '../components/SEOHead';

export default function DataRightsPage() {
  const [activeTab, setActiveTab] = useState('submit'); // 'submit' or 'track'
  const [requestType, setRequestType] = useState('access_export');
  const [details, setDetails] = useState('');
  const [nomineeName, setNomineeName] = useState('');
  const [nomineeContact, setNomineeContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [submitError, setSubmitError] = useState('');

  // Tracking state
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingResult, setTrackingResult] = useState(null);
  const [trackingError, setTrackingError] = useState('');

  // Existing requests if logged in
  const [userRequests, setUserRequests] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('hk_user');
    if (userStr) {
      setIsAuthenticated(true);
      fetchUserRequests();
    }
  }, []);

  const fetchUserRequests = async () => {
    try {
      const res = await fetch('/api/privacy/requests', {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.requests) {
          setUserRequests(data.requests);
        }
      }
    } catch (_) {}
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    setSubmitResult(null);

    const payload = {
      requestType,
      details: {
        description: details,
        ...(requestType === 'nomination' ? { nomineeName, nomineeContact } : {}),
      },
    };

    try {
      const res = await fetch('/api/privacy/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit privacy request');
      }

      setSubmitResult(data.request);
      setDetails('');
      setNomineeName('');
      setNomineeContact('');
      fetchUserRequests();
    } catch (err) {
      setSubmitError(err.message || 'Error submitting request. Please try again or log in.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrackRequest = async (e) => {
    e.preventDefault();
    if (!trackingNumber.trim()) return;

    setTrackingLoading(true);
    setTrackingError('');
    setTrackingResult(null);

    try {
      const res = await fetch(`/api/privacy/requests/${encodeURIComponent(trackingNumber.trim())}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Request tracking number not found');
      }
      setTrackingResult(data.request);
    } catch (err) {
      setTrackingError(err.message || 'Tracking number not found or access unauthorized.');
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleDirectExport = async () => {
    try {
      window.location.href = '/api/privacy/export-data';
    } catch (err) {
      alert('Failed to initiate instant export. Please ensure you are logged in.');
    }
  };

  return (
    <>
      <SEOHead
        title="Data Principal Rights & Privacy Requests"
        description="Exercise your statutory Data Principal rights under India's Digital Personal Data Protection Act, 2023 (DPDP Act). Access, correct, erase, or nominate representatives."
        canonicalPath="/data-rights"
        jsonLd={[
          defaultOrganizationSchema,
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Data Principal Rights Portal - Xarwiz AI Platform',
            url: 'https://xarwiz.com/data-rights',
          },
        ]}
      />

      <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <HeaderNav activePath="/data-rights" />
        {/* Hero Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: '#ffffff',
          padding: '48px 24px 64px 24px',
          textAlign: 'center',
          position: 'relative'
        }}>
          <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'left', marginBottom: '24px' }}>
            <Link href="/privacy">
              <a style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                color: 'rgba(255,255,255,0.8)',
                textDecoration: 'none',
                fontSize: '14px',
                background: 'rgba(255,255,255,0.1)',
                padding: '6px 14px',
                borderRadius: '20px',
              }}>
                <ArrowLeft size={16} />
                Back to Privacy Policy
              </a>
            </Link>
          </div>

          <div style={{ maxWidth: '750px', margin: '0 auto' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '20px',
              background: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              color: '#93c5fd',
              fontSize: '13px',
              fontWeight: '500',
              marginBottom: '16px'
            }}>
              <Shield size={16} />
              India DPDP Act 2023 &bull; Section 11, 12, 14
            </div>
            <h1 style={{ fontSize: '36px', fontWeight: '800', margin: '0 0 12px 0', letterSpacing: '-0.5px' }}>
              Data Principal Rights Portal
            </h1>
            <p style={{ fontSize: '16px', color: '#94a3b8', lineHeight: '1.6', margin: 0 }}>
              Under India's Digital Personal Data Protection Act, you have explicit rights to access, correct, erase, nominate, and manage your personal data across the Xarwiz Platform.
            </p>
          </div>
        </div>

        {/* Main Content Container */}
        <div style={{ maxWidth: '900px', margin: '-32px auto 60px auto', padding: '0 20px', position: 'relative', zIndex: 10 }}>
          {/* Tabs */}
          <div style={{
            display: 'flex',
            backgroundColor: '#ffffff',
            borderRadius: '12px 12px 0 0',
            border: '1px solid #e2e8f0',
            borderBottom: 'none',
            overflow: 'hidden'
          }}>
            <button
              onClick={() => setActiveTab('submit')}
              style={{
                flex: 1,
                padding: '16px 20px',
                background: activeTab === 'submit' ? '#ffffff' : '#f1f5f9',
                border: 'none',
                borderBottom: activeTab === 'submit' ? '3px solid #2563eb' : '1px solid #e2e8f0',
                color: activeTab === 'submit' ? '#1e293b' : '#64748b',
                fontWeight: '600',
                fontSize: '15px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Send size={18} />
              Submit Privacy Request
            </button>
            <button
              onClick={() => setActiveTab('track')}
              style={{
                flex: 1,
                padding: '16px 20px',
                background: activeTab === 'track' ? '#ffffff' : '#f1f5f9',
                border: 'none',
                borderBottom: activeTab === 'track' ? '3px solid #2563eb' : '1px solid #e2e8f0',
                color: activeTab === 'track' ? '#1e293b' : '#64748b',
                fontWeight: '600',
                fontSize: '15px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Search size={18} />
              Track Existing Request
            </button>
          </div>

          {/* Form Box */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '0 0 12px 12px',
            padding: '32px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)'
          }}>
            {activeTab === 'submit' ? (
              <div>
                {/* Instant Export Card */}
                {isAuthenticated && (
                  <div style={{
                    padding: '18px 20px',
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '8px',
                    marginBottom: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    flexWrap: 'wrap'
                  }}>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', color: '#1e3a8a', fontSize: '15px' }}>
                        ⚡ Instant Personal Data Export
                      </h4>
                      <p style={{ margin: 0, fontSize: '13px', color: '#3b82f6' }}>
                        Download your active profile, workspace metadata, consent audit records, and conversation titles as a JSON bundle immediately.
                      </p>
                    </div>
                    <button
                      onClick={handleDirectExport}
                      style={{
                        padding: '10px 18px',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <Download size={16} />
                      Download My Data
                    </button>
                  </div>
                )}

                <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#0f172a' }}>
                  Select Statutory Request Type
                </h3>
                <p style={{ margin: '0 0 24px 0', color: '#64748b', fontSize: '14px' }}>
                  Please select the right you wish to exercise under the DPDP Act 2023. Our privacy team will process and respond within statutory deadlines.
                </p>

                <form onSubmit={handleSubmitRequest}>
                  {/* Radio Cards for Request Types */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                    {[
                      {
                        id: 'access_export',
                        title: 'Right to Access (Export)',
                        desc: 'Receive a structured copy of personal data processed by Xarwiz.',
                        icon: Download,
                      },
                      {
                        id: 'correction',
                        title: 'Right to Correction & Update',
                        desc: 'Correct inaccurate or outdated personal details in your account.',
                        icon: FileText,
                      },
                      {
                        id: 'erasure',
                        title: 'Right to Erasure (Forgotten)',
                        desc: 'Request deletion of personal data no longer required for services.',
                        icon: AlertTriangle,
                      },
                      {
                        id: 'nomination',
                        title: 'Right to Nominate (DPDP Sec 14)',
                        desc: 'Nominate a trusted individual to exercise rights in event of incapacity.',
                        icon: UserCheck,
                      },
                    ].map((item) => {
                      const Icon = item.icon;
                      const isSelected = requestType === item.id;
                      return (
                        <div
                          key={item.id}
                          onClick={() => setRequestType(item.id)}
                          style={{
                            padding: '16px',
                            borderRadius: '8px',
                            border: `2px solid ${isSelected ? '#2563eb' : '#e2e8f0'}`,
                            backgroundColor: isSelected ? '#f0f7ff' : '#ffffff',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                            <Icon size={18} color={isSelected ? '#2563eb' : '#64748b'} />
                            <strong style={{ fontSize: '14.5px', color: isSelected ? '#1e3a8a' : '#1e293b' }}>
                              {item.title}
                            </strong>
                          </div>
                          <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b', lineHeight: '1.4' }}>
                            {item.desc}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Nomination Specific Inputs */}
                  {requestType === 'nomination' && (
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#1e293b' }}>Nominee Information (Section 14 DPDP Act)</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#334155' }}>
                            Nominee Full Name *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Full Legal Name"
                            value={nomineeName}
                            onChange={(e) => setNomineeName(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#334155' }}>
                            Nominee Contact (Email / Phone) *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="nominee@domain.com or phone"
                            value={nomineeContact}
                            onChange={(e) => setNomineeContact(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Details Field */}
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>
                      Additional Details or Specification (Optional)
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Specify particular datasets, workspace scope, or specific corrections requested..."
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {submitError && (
                    <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontSize: '14px', marginBottom: '20px' }}>
                      ⚠ {submitError}
                    </div>
                  )}

                  {submitResult && (
                    <div style={{ padding: '16px 20px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', marginBottom: '24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#065f46', fontWeight: '700', fontSize: '16px', marginBottom: '6px' }}>
                        <CheckCircle size={20} color="#059669" />
                        Request Successfully Registered
                      </div>
                      <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#047857' }}>
                        Your Data Principal request has been logged. An official acknowledgment has been dispatched to your email.
                      </p>
                      <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '6px', border: '1px solid #d1fae5', display: 'inline-block' }}>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>Tracking Reference: </span>
                        <strong style={{ fontFamily: 'monospace', fontSize: '15px', color: '#047857' }}>{submitResult.tracking_number}</strong>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      opacity: submitting ? 0.7 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    {submitting ? <RefreshCw size={18} className="spin" /> : <Send size={18} />}
                    {submitting ? 'Submitting Request...' : 'Submit Privacy Request'}
                  </button>
                </form>
              </div>
            ) : (
              <div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#0f172a' }}>
                  Track Privacy Request Status
                </h3>
                <p style={{ margin: '0 0 24px 0', color: '#64748b', fontSize: '14px' }}>
                  Enter the unique tracking number issued upon submission (e.g. <code>DPR-20261016-XXXXXX</code>) to view current status and reviewer determinations.
                </p>

                <form onSubmit={handleTrackRequest} style={{ display: 'flex', gap: '12px', marginBottom: '28px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DPR-20261016-1A2B3C"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    style={{
                      flex: 1,
                      minWidth: '240px',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '15px',
                      fontFamily: 'monospace'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={trackingLoading}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: '#1e293b',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: trackingLoading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    {trackingLoading ? 'Checking...' : 'Check Status'}
                  </button>
                </form>

                {trackingError && (
                  <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontSize: '14px', marginBottom: '20px' }}>
                    ⚠ {trackingError}
                  </div>
                )}

                {trackingResult && (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '16px', color: '#2563eb' }}>
                        {trackingResult.tracking_number}
                      </span>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        background: trackingResult.status === 'completed' ? '#dcfce7' : '#fef3c7',
                        color: trackingResult.status === 'completed' ? '#15803d' : '#b45309'
                      }}>
                        {trackingResult.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#334155' }}>
                      <strong>Request Category:</strong> {trackingResult.request_type.replace(/_/g, ' ').toUpperCase()}
                    </p>
                    <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#64748b' }}>
                      <strong>Submitted At:</strong> {new Date(trackingResult.created_at).toLocaleString()}
                    </p>

                    {trackingResult.resolved_at && (
                      <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#64748b' }}>
                        <strong>Resolved At:</strong> {new Date(trackingResult.resolved_at).toLocaleString()}
                      </p>
                    )}

                    {trackingResult.rejection_reason && (
                      <div style={{ marginTop: '12px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#991b1b', fontSize: '13px' }}>
                        <strong>Determination Notes:</strong> {trackingResult.rejection_reason}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User's Past Requests List if Logged In */}
          {userRequests.length > 0 && (
            <div style={{ marginTop: '40px', background: '#ffffff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#0f172a' }}>
                Your Submitted Privacy Rights Requests
              </h3>
              <div style={{ display: 'grid', gap: '10px' }}>
                {userRequests.map((req) => (
                  <div
                    key={req.id}
                    style={{
                      padding: '14px 18px',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}
                  >
                    <div>
                      <div style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#2563eb', fontSize: '14px' }}>
                        {req.tracking_number}
                      </div>
                      <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                        {req.request_type.replace(/_/g, ' ').toUpperCase()} &bull; Submitted {new Date(req.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      background: req.status === 'completed' ? '#dcfce7' : '#fef3c7',
                      color: req.status === 'completed' ? '#15803d' : '#b45309'
                    }}>
                      {req.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <FooterSection />
      </div>
    </>
  );
}
