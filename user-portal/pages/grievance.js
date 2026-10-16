import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert, Mail, Send, Search, CheckCircle, Clock, AlertTriangle, Building, User, RefreshCw } from 'lucide-react';
import FooterSection from '../components/FooterSection';
import SEOHead, { defaultOrganizationSchema } from '../components/SEOHead';

export default function GrievancePage() {
  const [activeTab, setActiveTab] = useState('file'); // 'file' or 'track'

  // Filing state
  const [complainantName, setComplainantName] = useState('');
  const [complainantEmail, setComplainantEmail] = useState('');
  const [complainantPhone, setComplainantPhone] = useState('');
  const [category, setCategory] = useState('consent_violation');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fileSuccess, setFileSuccess] = useState(null);
  const [fileError, setFileError] = useState('');

  // Tracking state
  const [trackNumber, setTrackNumber] = useState('');
  const [trackEmail, setTrackEmail] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackResult, setTrackResult] = useState(null);
  const [trackError, setTrackError] = useState('');

  const handleFileGrievance = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFileError('');
    setFileSuccess(null);

    try {
      const res = await fetch('/api/privacy/grievances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complainantName,
          complainantEmail,
          complainantPhone,
          category,
          subject,
          description,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit grievance');
      }

      setFileSuccess(data);
      setSubject('');
      setDescription('');
    } catch (err) {
      setFileError(err.message || 'An error occurred while submitting grievance.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrackGrievance = async (e) => {
    e.preventDefault();
    if (!trackNumber.trim()) return;

    setTrackingLoading(true);
    setTrackError('');
    setTrackResult(null);

    try {
      const url = `/api/privacy/grievances/${encodeURIComponent(trackNumber.trim())}${
        trackEmail.trim() ? `?email=${encodeURIComponent(trackEmail.trim())}` : ''
      }`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Grievance record not found');
      }
      setTrackResult(data.grievance);
    } catch (err) {
      setTrackError(err.message || 'Grievance not found or verification mismatch.');
    } finally {
      setTrackingLoading(false);
    }
  };

  return (
    <>
      <SEOHead
        title="Grievance Redressal Mechanism"
        description="File and track personal data grievances with the designated Grievance Officer in compliance with Section 13 of India's Digital Personal Data Protection Act, 2023."
        canonicalPath="/grievance"
        jsonLd={[
          defaultOrganizationSchema,
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Grievance Redressal Mechanism — Xarwiz DPDP',
            url: 'https://xarwiz.com/grievance',
          },
        ]}
      />

      <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
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
              background: 'rgba(139, 92, 246, 0.25)',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              color: '#c4b5fd',
              fontSize: '13px',
              fontWeight: '500',
              marginBottom: '16px'
            }}>
              <ShieldAlert size={16} />
              Section 13, Digital Personal Data Protection Act, 2023
            </div>
            <h1 style={{ fontSize: '36px', fontWeight: '800', margin: '0 0 12px 0', letterSpacing: '-0.5px' }}>
              DPDP Grievance Redressal Cell
            </h1>
            <p style={{ fontSize: '16px', color: '#cbd5e1', lineHeight: '1.6', margin: 0 }}>
              Xarwiz provides a formal, statutory mechanism for Data Principals to register complaints and resolve grievances regarding personal data processing and privacy rights.
            </p>
          </div>
        </div>

        {/* Content Box */}
        <div style={{ maxWidth: '900px', margin: '-32px auto 60px auto', padding: '0 20px', position: 'relative', zIndex: 10 }}>
          {/* Official Officer Contact Card */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            marginBottom: '24px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '20px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', fontWeight: '700', fontSize: '15px', marginBottom: '8px' }}>
                <User size={18} color="#7c3aed" />
                Designated Grievance Officer
              </div>
              <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#334155', fontWeight: '600' }}>
                Ashish Pratap Singh Tomar
              </p>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                Grievance &amp; Compliance Redressal Officer
              </p>
              <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#2563eb' }}>
                <Mail size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
                <a href="mailto:grievance@xarwiz.com" style={{ color: '#2563eb', textDecoration: 'none' }}>
                  grievance@xarwiz.com
                </a>
              </p>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', fontWeight: '700', fontSize: '15px', marginBottom: '8px' }}>
                <Building size={18} color="#7c3aed" />
                Fiduciary Corporate Office
              </div>
              <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#334155', fontWeight: '600' }}>
                Xarwiz Technologies LLP
              </p>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.4' }}>
                Sector 62, Noida, Uttar Pradesh, India - 201301
              </p>
              <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                Statutory Response Period: As notified under DPDP Rules
              </p>
            </div>
          </div>

          {/* Form Tabs */}
          <div style={{
            display: 'flex',
            backgroundColor: '#ffffff',
            borderRadius: '12px 12px 0 0',
            border: '1px solid #e2e8f0',
            borderBottom: 'none',
            overflow: 'hidden'
          }}>
            <button
              onClick={() => setActiveTab('file')}
              style={{
                flex: 1,
                padding: '16px 20px',
                background: activeTab === 'file' ? '#ffffff' : '#f1f5f9',
                border: 'none',
                borderBottom: activeTab === 'file' ? '3px solid #7c3aed' : '1px solid #e2e8f0',
                color: activeTab === 'file' ? '#1e293b' : '#64748b',
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
              Register Formal Grievance
            </button>
            <button
              onClick={() => setActiveTab('track')}
              style={{
                flex: 1,
                padding: '16px 20px',
                background: activeTab === 'track' ? '#ffffff' : '#f1f5f9',
                border: 'none',
                borderBottom: activeTab === 'track' ? '3px solid #7c3aed' : '1px solid #e2e8f0',
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
              Track Grievance Resolution
            </button>
          </div>

          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '0 0 12px 12px',
            padding: '32px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
          }}>
            {activeTab === 'file' ? (
              <form onSubmit={handleFileGrievance}>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '20px', color: '#0f172a' }}>
                  Grievance Submission Form
                </h3>
                <p style={{ margin: '0 0 20px 0', color: '#64748b', fontSize: '14px' }}>
                  Please fill out the details below. You will immediately receive a statutory reference tracking number and automated confirmation.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>
                      Complainant Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Your full legal name"
                      value={complainantName}
                      onChange={(e) => setComplainantName(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>
                      Complainant Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="you@domain.com"
                      value={complainantEmail}
                      onChange={(e) => setComplainantEmail(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>
                      Contact Phone (Optional)
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={complainantPhone}
                      onChange={(e) => setComplainantPhone(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>
                      Grievance Category *
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', backgroundColor: '#ffffff' }}
                    >
                      <option value="consent_violation">Consent Withdrawal or Purpose Violation</option>
                      <option value="unauthorized_processing">Unauthorized Data Processing</option>
                      <option value="delayed_erasure">Delayed Data Erasure Request</option>
                      <option value="data_inaccuracy">Inaccurate or Incomplete Records</option>
                      <option value="security_concern">Data Security or Breach Suspicion</option>
                      <option value="other">Other Statutory Concern</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>
                    Subject / Summary *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Brief summary of the privacy concern"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>
                    Detailed Statement of Grievance *
                  </label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Describe specific occurrences, workspace names, dates, or communication history relating to this grievance..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>

                {fileError && (
                  <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontSize: '14px', marginBottom: '20px' }}>
                    ⚠ {fileError}
                  </div>
                )}

                {fileSuccess && (
                  <div style={{ padding: '18px 20px', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '8px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#5b21b6', fontWeight: '700', fontSize: '16px', marginBottom: '6px' }}>
                      <CheckCircle size={20} color="#7c3aed" />
                      Grievance Formally Registered
                    </div>
                    <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#6d28d9' }}>
                      Your grievance has been assigned to designated Grievance Officer <strong>{fileSuccess.assignedOfficer}</strong>. An acknowledgment email has been dispatched.
                    </p>
                    <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e9d5ff', display: 'inline-block' }}>
                      <span style={{ fontSize: '13px', color: '#64748b' }}>Statutory Grievance Reference: </span>
                      <strong style={{ fontFamily: 'monospace', fontSize: '15px', color: '#7c3aed' }}>{fileSuccess.grievanceNumber}</strong>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#7c3aed',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {submitting ? <RefreshCw size={18} className="spin" /> : <Send size={18} />}
                  {submitting ? 'Registering Grievance...' : 'Submit Formal Grievance'}
                </button>
              </form>
            ) : (
              <div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '20px', color: '#0f172a' }}>
                  Track Grievance Resolution
                </h3>
                <p style={{ margin: '0 0 20px 0', color: '#64748b', fontSize: '14px' }}>
                  Enter your Grievance Reference Number (e.g. <code>GRV-20261016-XXXXXX</code>) and verification email.
                </p>

                <form onSubmit={handleTrackGrievance} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', marginBottom: '24px' }}>
                  <input
                    type="text"
                    required
                    placeholder="Grievance Reference Number"
                    value={trackNumber}
                    onChange={(e) => setTrackNumber(e.target.value)}
                    style={{ padding: '12px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', fontFamily: 'monospace' }}
                  />
                  <input
                    type="email"
                    placeholder="Complainant Email (Optional Verification)"
                    value={trackEmail}
                    onChange={(e) => setTrackEmail(e.target.value)}
                    style={{ padding: '12px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                  <button
                    type="submit"
                    disabled={trackingLoading}
                    style={{
                      padding: '12px 20px',
                      backgroundColor: '#1e293b',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: trackingLoading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {trackingLoading ? 'Checking...' : 'Track'}
                  </button>
                </form>

                {trackError && (
                  <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontSize: '14px', marginBottom: '20px' }}>
                    ⚠ {trackError}
                  </div>
                )}

                {trackResult && (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '16px', color: '#7c3aed' }}>
                        {trackResult.grievance_number}
                      </span>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        background: trackResult.status === 'resolved' ? '#dcfce7' : '#fef3c7',
                        color: trackResult.status === 'resolved' ? '#15803d' : '#b45309'
                      }}>
                        {trackResult.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <p style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#334155' }}>
                      <strong>Subject:</strong> {trackResult.subject}
                    </p>
                    <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#64748b' }}>
                      <strong>Category:</strong> {trackResult.category}
                    </p>
                    <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#64748b' }}>
                      <strong>Assigned Officer:</strong> {trackResult.assigned_officer}
                    </p>

                    {trackResult.resolution_notes && (
                      <div style={{ marginTop: '12px', padding: '12px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', color: '#065f46', fontSize: '13px' }}>
                        <strong>Resolution Notes:</strong> {trackResult.resolution_notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Statutory Escalation Information (DPDP Section 13(3)) */}
          <div style={{ marginTop: '24px', padding: '16px 20px', background: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
            <strong>Statutory Escalation Note (DPDP Act 2023):</strong> If you are not satisfied with the resolution provided by our Grievance Officer, or if no resolution is provided within the statutory timeframe, you may escalate your complaint to the <strong>Data Protection Board of India</strong> in the prescribed form and manner.
          </div>
        </div>

        <FooterSection />
      </div>
    </>
  );
}
