import React, { useState } from 'react';
import Link from 'next/link';
import HeaderNav from '../components/layout/HeaderNav';
import FooterSection from '../components/FooterSection';
import SEOHead from '../components/SEOHead';
import {
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Send,
  Search,
  Clock,
  Mail,
  User,
  FileText,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Shield,
  Phone,
} from 'lucide-react';

export default function GrievancePage() {
  const [activeTab, setActiveTab] = useState('file'); // 'file' | 'track' | 'faq'

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    category: 'consent_withdrawal',
    subject: '',
    description: '',
    dpdpConsent: false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submissionSuccess, setSubmissionSuccess] = useState(null);

  // Track State
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingEmail, setTrackingEmail] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState('');
  const [trackingResult, setTrackingResult] = useState(null);

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmitGrievance = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmissionSuccess(null);

    if (!formData.name.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.description.trim()) {
      setSubmitError('Please fill in all required fields marked with an asterisk (*).');
      return;
    }

    if (!formData.dpdpConsent) {
      setSubmitError('Please acknowledge the DPDP statutory declaration before submitting.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/privacy/grievances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          complainantName: formData.name.trim(),
          complainantEmail: formData.email.trim(),
          complainantPhone: formData.phone.trim() || undefined,
          category: formData.category,
          subject: formData.subject.trim(),
          description: formData.description.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit grievance. Please verify details and try again.');
      }

      setSubmissionSuccess(data);
      setFormData({
        name: '',
        email: '',
        phone: '',
        category: 'consent_withdrawal',
        subject: '',
        description: '',
        dpdpConsent: false,
      });
    } catch (err) {
      console.error('Grievance submission error:', err);
      setSubmitError(err.message || 'An unexpected error occurred. Please contact grievance@xarwiz.com directly.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrackGrievance = async (e) => {
    e.preventDefault();
    setTrackingError('');
    setTrackingResult(null);

    if (!trackingNumber.trim() || !trackingEmail.trim()) {
      setTrackingError('Please enter both your Grievance Tracking Number and the registered email address.');
      return;
    }

    setTrackingLoading(true);

    try {
      const formattedNum = trackingNumber.trim();
      const res = await fetch(
        `/api/privacy/grievances/${encodeURIComponent(formattedNum)}?email=${encodeURIComponent(trackingEmail.trim())}`
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Grievance record not found. Please ensure tracking number and email match.');
      }

      setTrackingResult(data.grievance);
    } catch (err) {
      console.error('Grievance track error:', err);
      setTrackingError(err.message || 'Failed to look up grievance status.');
    } finally {
      setTrackingLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0f172a', color: '#f8fafc' }}>
      <SEOHead
        title="DPDP Grievance Redressal Mechanism - Xarwiz AI Cloud Platform"
        description="Formal statutory grievance redressal cell under Section 13 of the Digital Personal Data Protection Act 2023. File complaints directly with designated Grievance Officer Ashish Pratap Singh Tomar."
      />
      <HeaderNav />

      <main style={{ flex: 1, maxWidth: '1100px', width: '100%', margin: '0 auto', padding: '40px 20px 80px 20px' }}>
        {/* Hero Section */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '999px',
            backgroundColor: 'rgba(124, 58, 237, 0.15)',
            border: '1px solid rgba(124, 58, 237, 0.3)',
            color: '#c4b5fd',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '16px'
          }}>
            <ShieldCheck size={16} /> Digital Personal Data Protection Act 2023 &bull; Section 13 Redressal
          </div>
          <h1 style={{ fontSize: '36px', fontWeight: 800, margin: '0 0 16px 0', letterSpacing: '-0.02em', color: '#ffffff' }}>
            Data Principal Grievance Redressal
          </h1>
          <p style={{ fontSize: '16px', color: '#94a3b8', maxWidth: '720px', margin: '0 auto', lineHeight: '1.6' }}>
            Under Section 13 of India&apos;s DPDP Act 2023, every data principal has the right to a readily available means of grievance redressal provided by the Data Fiduciary regarding any act or omission in relation to personal data.
          </p>
        </div>

        {/* Officer Card */}
        <div style={{
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '16px',
          padding: '24px 28px',
          marginBottom: '36px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
          alignItems: 'center',
        }}>
          <div>
            <h3 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a78bfa', margin: '0 0 8px 0' }}>
              Designated Grievance Officer
            </h3>
            <p style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 4px 0', color: '#f8fafc' }}>
              Ashish Pratap Singh Tomar
            </p>
            <p style={{ fontSize: '13.5px', color: '#94a3b8', margin: 0 }}>
              Lead Privacy &amp; Data Protection Officer &bull; Xarwiz AI Cloud Platform
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#cbd5e1' }}>
              <Mail size={16} color="#38bdf8" />
              <span>Email: <strong>grievance@xarwiz.com</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#cbd5e1' }}>
              <Clock size={16} color="#38bdf8" />
              <span>Statutory SLA: <strong>Acknowledgment &le; 48 hrs &bull; Resolution &le; 30 days</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#94a3b8' }}>
              <Shield size={16} color="#a78bfa" />
              <span>Escalation: Data Protection Board of India (DPBI)</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid #334155',
          marginBottom: '32px',
        }}>
          <button
            onClick={() => setActiveTab('file')}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'none',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              color: activeTab === 'file' ? '#38bdf8' : '#94a3b8',
              borderBottom: activeTab === 'file' ? '2px solid #38bdf8' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <FileText size={16} /> File New Grievance
          </button>
          <button
            onClick={() => setActiveTab('track')}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'none',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              color: activeTab === 'track' ? '#38bdf8' : '#94a3b8',
              borderBottom: activeTab === 'track' ? '2px solid #38bdf8' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Search size={16} /> Track Grievance Status
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'none',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              color: activeTab === 'faq' ? '#38bdf8' : '#94a3b8',
              borderBottom: activeTab === 'faq' ? '2px solid #38bdf8' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <HelpCircle size={16} /> Statutory Rights &amp; FAQs
          </button>
        </div>

        {/* Tab 1: File New Grievance */}
        {activeTab === 'file' && (
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px 0', color: '#ffffff' }}>
              Register a Statutory Privacy Grievance
            </h2>
            <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 24px 0' }}>
              Submit a formal grievance regarding personal data processing, consent withdrawal, access requests, or unauthorized disclosures. All complaints receive a unique tracking reference and formal determination.
            </p>

            {submissionSuccess && (
              <div style={{
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '28px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#34d399', fontWeight: 700, fontSize: '17px', marginBottom: '8px' }}>
                  <CheckCircle2 size={22} />
                  Grievance Registered Successfully
                </div>
                <p style={{ fontSize: '14px', color: '#e2e8f0', margin: '0 0 12px 0' }}>
                  Your grievance reference number is: <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#a78bfa', fontSize: '16px' }}>{submissionSuccess.grievanceNumber}</span>
                </p>
                <p style={{ fontSize: '13.5px', color: '#94a3b8', margin: '0 0 16px 0', lineHeight: '1.5' }}>
                  An automated acknowledgment receipt has been dispatched to your email. Our Grievance Officer (<strong>{submissionSuccess.assignedOfficer}</strong>) has been notified and will deliver resolution notes within 30 statutory days.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setTrackingNumber(submissionSuccess.grievanceNumber);
                    setActiveTab('track');
                  }}
                  style={{
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Track This Grievance &rarr;
                </button>
              </div>
            )}

            {submitError && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '14px 18px',
                color: '#f87171',
                fontSize: '14px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                <AlertCircle size={18} />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitGrievance}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleFormChange}
                    placeholder="Enter full name"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleFormChange}
                    placeholder="email@example.com"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleFormChange}
                    placeholder="+91 98765 43210"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                    Grievance Category *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleFormChange}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="consent_withdrawal">Withdrawal of Consent (DPDP Sec 6)</option>
                    <option value="data_erasure">Right to Erasure / Deletion (DPDP Sec 12)</option>
                    <option value="data_access">Right to Access Information (DPDP Sec 11)</option>
                    <option value="correction_request">Correction / Updation of Personal Data</option>
                    <option value="unauthorized_processing">Unauthorized Data Processing / Disclosure</option>
                    <option value="security_incident">Personal Data Breach / Security Concern</option>
                    <option value="other">Other Statutory DPDP Complaint</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Grievance Subject *
                </label>
                <input
                  type="text"
                  name="subject"
                  required
                  value={formData.subject}
                  onChange={handleFormChange}
                  placeholder="Summary of your privacy grievance"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Detailed Description *
                </label>
                <textarea
                  name="description"
                  required
                  rows={5}
                  value={formData.description}
                  onChange={handleFormChange}
                  placeholder="Please describe the grievance in detail, including relevant dates, accounts, and the specific resolution requested under the DPDP Act 2023..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{ marginBottom: '28px' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: '#94a3b8', cursor: 'pointer', lineHeight: '1.5' }}>
                  <input
                    type="checkbox"
                    name="dpdpConsent"
                    checked={formData.dpdpConsent}
                    onChange={handleFormChange}
                    style={{ marginTop: '3px' }}
                  />
                  <span>
                    I hereby certify that I am the Data Principal or their legally authorized representative. I consent to the processing of this information by Xarwiz AI and its Grievance Redressal Cell strictly for the investigation and resolution of this statutory grievance under the DPDP Act 2023.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#7c3aed',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 28px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                <Send size={16} />
                {submitting ? 'Registering Grievance...' : 'Submit Formal Grievance'}
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: Track Existing Grievance */}
        {activeTab === 'track' && (
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px 0', color: '#ffffff' }}>
              Track Grievance Investigation Status
            </h2>
            <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 24px 0' }}>
              Check live investigation notes, officer assignments, and statutory resolutions using your registered Grievance Reference Number and email.
            </p>

            <form onSubmit={handleTrackGrievance} style={{ marginBottom: '32px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                    Grievance Tracking Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="e.g. GRV-20261016-5678"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontFamily: 'monospace',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                    Registered Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={trackingEmail}
                    onChange={(e) => setTrackingEmail(e.target.value)}
                    placeholder="email@example.com"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={trackingLoading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 24px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: trackingLoading ? 'not-allowed' : 'pointer',
                  opacity: trackingLoading ? 0.7 : 1,
                }}
              >
                <Search size={16} />
                {trackingLoading ? 'Searching...' : 'Lookup Status'}
              </button>
            </form>

            {trackingError && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '14px 18px',
                color: '#f87171',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                <AlertCircle size={18} />
                <span>{trackingError}</span>
              </div>
            )}

            {trackingResult && (
              <div style={{
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '12px',
                padding: '24px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #1e293b', paddingBottom: '16px', marginBottom: '16px' }}>
                  <div>
                    <span style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reference</span>
                    <p style={{ margin: '2px 0 0 0', fontFamily: 'monospace', fontWeight: 700, fontSize: '18px', color: '#38bdf8' }}>
                      {trackingResult.grievance_number}
                    </p>
                  </div>
                  <div>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: '999px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      backgroundColor:
                        trackingResult.status === 'resolved'
                          ? 'rgba(16, 185, 129, 0.2)'
                          : trackingResult.status === 'under_investigation'
                          ? 'rgba(245, 158, 11, 0.2)'
                          : 'rgba(59, 130, 246, 0.2)',
                      color:
                        trackingResult.status === 'resolved'
                          ? '#34d399'
                          : trackingResult.status === 'under_investigation'
                          ? '#fbbf24'
                          : '#60a5fa',
                      border: '1px solid currentColor',
                    }}>
                      Status: {trackingResult.status}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block' }}>Subject</span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>{trackingResult.subject}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block' }}>Category</span>
                    <span style={{ fontSize: '14px', color: '#cbd5e1', textTransform: 'capitalize' }}>
                      {trackingResult.category?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block' }}>Assigned Officer</span>
                    <span style={{ fontSize: '14px', color: '#cbd5e1' }}>{trackingResult.assigned_officer}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block' }}>Registered Date</span>
                    <span style={{ fontSize: '14px', color: '#cbd5e1' }}>
                      {new Date(trackingResult.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                    </span>
                  </div>
                </div>

                {trackingResult.resolution_notes && (
                  <div style={{
                    marginTop: '16px',
                    padding: '16px',
                    backgroundColor: 'rgba(30, 41, 59, 0.8)',
                    borderRadius: '8px',
                    border: '1px solid #334155',
                  }}>
                    <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a78bfa', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                      Official Resolution Determination
                    </span>
                    <p style={{ margin: 0, fontSize: '13.5px', color: '#e2e8f0', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                      {trackingResult.resolution_notes}
                    </p>
                    {trackingResult.resolved_at && (
                      <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                        Resolved on: {new Date(trackingResult.resolved_at).toLocaleString('en-IN')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Statutory Rights & FAQs */}
        {activeTab === 'faq' && (
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 16px 0', color: '#ffffff' }}>
              Data Principal Rights Under DPDP Act 2023
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
              <div style={{ padding: '20px', backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #334155' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#38bdf8', margin: '0 0 8px 0' }}>
                  Right to Access Information (Sec 11)
                </h4>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: '1.5' }}>
                  You have the right to obtain a summary of personal data being processed, processing activities undertaken, and the identities of data fiduciaries or data processors with whom data has been shared.
                </p>
              </div>

              <div style={{ padding: '20px', backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #334155' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#38bdf8', margin: '0 0 8px 0' }}>
                  Right to Correction &amp; Erasure (Sec 12)
                </h4>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: '1.5' }}>
                  You have the right to correction of inaccurate personal data, completion of incomplete data, updating of records, and erasure of personal data that is no longer necessary for the specified purpose.
                </p>
              </div>

              <div style={{ padding: '20px', backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #334155' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#38bdf8', margin: '0 0 8px 0' }}>
                  Right of Grievance Redressal (Sec 13)
                </h4>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: '1.5' }}>
                  You have the right to an accessible means of grievance redressal regarding data fiduciary obligations. Fiduciaries must acknowledge complaints promptly and resolve them within prescribed timelines.
                </p>
              </div>

              <div style={{ padding: '20px', backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #334155' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#38bdf8', margin: '0 0 8px 0' }}>
                  Right to Nominate (Sec 14)
                </h4>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: '1.5' }}>
                  You have the right to nominate any other individual who shall, in the event of death or incapacity of the data principal, exercise your statutory data principal rights.
                </p>
              </div>
            </div>

            <div style={{
              padding: '20px 24px',
              backgroundColor: 'rgba(124, 58, 237, 0.1)',
              borderRadius: '12px',
              border: '1px solid rgba(124, 58, 237, 0.3)',
            }}>
              <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#c4b5fd', margin: '0 0 8px 0' }}>
                Escalation to Data Protection Board of India (DPBI)
              </h4>
              <p style={{ fontSize: '13.5px', color: '#cbd5e1', margin: 0, lineHeight: '1.6' }}>
                If you do not receive an acknowledgment or formal determination from our Grievance Officer within 30 statutory days, or if you are dissatisfied with the resolution provided, you may escalate your grievance directly to the <strong>Data Protection Board of India (DPBI)</strong> in the manner prescribed under Section 13(3) and Section 27 of the DPDP Act 2023.
              </p>
            </div>
          </div>
        )}
      </main>

      <FooterSection />
    </div>
  );
}

