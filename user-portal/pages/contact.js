import React, { useState } from 'react';
import Link from 'next/link';
import HeaderNav from '../components/layout/HeaderNav';
import FooterSection from '../components/FooterSection';
import SEOHead, { defaultOrganizationSchema } from '../components/SEOHead';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  ShieldCheck,
  Send,
  CheckCircle2,
  Building,
  Users,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    teamSize: '10-50',
    inquiryType: 'enterprise_sales',
    message: '',
    dpdpConsent: false,
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim() || !formData.email.trim()) {
      setError('Please provide your name and work email address.');
      return;
    }

    if (!formData.dpdpConsent) {
      setError('Please acknowledge the privacy notice to submit your inquiry.');
      return;
    }

    setLoading(true);

    try {
      // Dedicated public intake endpoint — completely decoupled from user registration
      const res = await fetch('/api/v1/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          company: formData.company.trim(),
          teamSize: formData.teamSize,
          inquiryType: formData.inquiryType,
          message: formData.message.trim(),
          privacyNoticeAcknowledged: !!formData.dpdpConsent,
          privacyNoticeVersion: '2.0-dpdp',
          marketingConsent: false,
          _hp_website: '',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit contact inquiry. Please try again.');
      }

      setSubmitted(true);
    } catch (err) {
      console.warn('Lead submission error:', err);
      setError(err.message || 'An unexpected error occurred. Please try again or contact us directly at enterprise@xarwiz.com.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contact-page">
      <SEOHead
        title="Contact Sales & Team - Xarwiz AI Cloud Platform"
        description="Get in touch with the Xarwiz team for enterprise cloud deployments, custom LLMs, DPDP compliance inquiries, and live product demos."
        canonicalPath="/contact"
        jsonLd={[
          defaultOrganizationSchema,
          {
            '@context': 'https://schema.org',
            '@type': 'ContactPage',
            name: 'Contact Xarwiz Technologies',
            url: 'https://xarwiz.com/contact',
            description:
              'Official contact channel for enterprise inquiries, demos, and support.',
          },
        ]}
      />

      <HeaderNav activePath="/contact" />

      <main className="contact-main">
        <section className="contact-hero">
          <div className="container">
            <div className="hero-content">
              <span className="hero-badge">
                <Sparkles size={14} /> Direct Enterprise Inquiries
              </span>
              <h1 className="hero-title">
                Let’s talk about your <span className="blue-text">enterprise AI</span> needs
              </h1>
              <p className="hero-subtitle">
                Whether you’re evaluating private VPC deployments, custom autonomous agents,
                or DPDP Act 2023 compliance, our engineering and solutions team is ready to assist.
              </p>
            </div>
          </div>
        </section>

        <section className="contact-body-section">
          <div className="container">
            <div className="contact-grid">
              {/* Left Column: Direct Office & Corporate Info */}
              <div className="contact-info-card">
                <div className="info-header">
                  <h2 className="info-title">Corporate Headquarters</h2>
                  <p className="info-desc">
                    Xarwiz is built and engineered in India by VoltNovate Solutions LLP.
                  </p>
                </div>

                <div className="info-items-list">
                  <div className="info-item">
                    <div className="info-icon-box">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <div className="info-item-label">Office Address</div>
                      <div className="info-item-val">
                        House No 2, Sai Dham Colony, DD Nagar,<br />
                        Gwalior, Madhya Pradesh 474005, India
                      </div>
                    </div>
                  </div>

                  <div className="info-item">
                    <div className="info-icon-box">
                      <Mail size={20} />
                    </div>
                    <div>
                      <div className="info-item-label">Direct Email Channels</div>
                      <div className="info-item-val">
                        Enterprise Sales: <a href="mailto:sales@xarwiz.com">sales@xarwiz.com</a><br />
                        General Inquiries: <a href="mailto:contact@xarwiz.com">contact@xarwiz.com</a><br />
                        Privacy & Grievance: <a href="mailto:privacy@xarwiz.com">privacy@xarwiz.com</a>
                      </div>
                    </div>
                  </div>

                  <div className="info-item">
                    <div className="info-icon-box">
                      <Clock size={20} />
                    </div>
                    <div>
                      <div className="info-item-label">Response Time SLA</div>
                      <div className="info-item-val">
                        Average response within <strong>2 hours</strong> for enterprise sales and product walkthrough requests.
                      </div>
                    </div>
                  </div>

                  <div className="info-item">
                    <div className="info-icon-box">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <div className="info-item-label">Sovereignty & Security</div>
                      <div className="info-item-val">
                        100% Indian data residency, Row-Level Security (RLS) isolation, and DPDP Act 2023 statutory compliance.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Trust Banner */}
                <div className="trust-banner-box">
                  <div className="trust-badge-row">
                    <span className="badge-flag">🇮🇳 Indian Sovereign Cloud</span>
                    <span className="badge-green">DPDP Act Compliant</span>
                  </div>
                  <p className="trust-banner-text">
                    Need a localized private VPC or on-prem deployment? Inquire about our dedicated sovereign clusters.
                  </p>
                </div>
              </div>

              {/* Right Column: Interactive Inquiry Form */}
              <div className="contact-form-card">
                {submitted ? (
                  <div className="success-state-box">
                    <div className="success-icon-wrapper">
                      <CheckCircle2 size={44} color="#16A34A" />
                    </div>
                    <h3 className="success-title">Inquiry Received</h3>
                    <p className="success-desc">
                      Thank you for reaching out, <strong>{formData.name}</strong>. Your enterprise inquiry has been assigned to our solutions team.
                    </p>
                    <p className="success-subdesc">
                      We will review your requirements and reach out to <strong>{formData.email}</strong> within 2 hours.
                    </p>
                    <div className="success-actions">
                      <Link href="/" className="btn-success-home">
                        Return to Platform
                      </Link>
                      <button
                        type="button"
                        className="btn-success-reset"
                        onClick={() => {
                          setSubmitted(false);
                          setFormData({
                            name: '',
                            email: '',
                            phone: '',
                            company: '',
                            teamSize: '10-50',
                            inquiryType: 'enterprise_sales',
                            message: '',
                            dpdpConsent: false,
                          });
                        }}
                      >
                        Send Another Note
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="inquiry-form">
                    <div className="form-header">
                      <h3 className="form-title">Send Us a Message</h3>
                      <p className="form-subtitle">
                        Fill out the details below and an enterprise architect will contact you.
                      </p>
                    </div>

                    <input type="text" name="_hp_website" tabIndex="-1" autoComplete="off" style={{ display: 'none' }} aria-hidden="true" />
                    {error && <div className="form-error-alert" role="alert" aria-live="polite">{error}</div>}

                    <div className="form-row split-2">
                      <div className="form-group">
                        <label className="form-label" htmlFor="name">
                          Full Name <span className="req">*</span>
                        </label>
                        <input
                          id="name"
                          name="name"
                          type="text"
                          required
                          placeholder="e.g. Rajesh Kumar"
                          value={formData.name}
                          onChange={handleChange}
                          className="form-input"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="email">
                          Work Email <span className="req">*</span>
                        </label>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          required
                          placeholder="rajesh@company.com"
                          value={formData.email}
                          onChange={handleChange}
                          className="form-input"
                        />
                      </div>
                    </div>

                    <div className="form-row split-2">
                      <div className="form-group">
                        <label className="form-label" htmlFor="phone">
                          Phone Number
                        </label>
                        <input
                          id="phone"
                          name="phone"
                          type="tel"
                          placeholder="+91 98765 43210"
                          value={formData.phone}
                          onChange={handleChange}
                          className="form-input"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="company">
                          Company / Organization
                        </label>
                        <input
                          id="company"
                          name="company"
                          type="text"
                          placeholder="e.g. Acme Tech Solutions"
                          value={formData.company}
                          onChange={handleChange}
                          className="form-input"
                        />
                      </div>
                    </div>

                    <div className="form-row split-2">
                      <div className="form-group">
                        <label className="form-label" htmlFor="inquiryType">
                          Inquiry Type
                        </label>
                        <select
                          id="inquiryType"
                          name="inquiryType"
                          value={formData.inquiryType}
                          onChange={handleChange}
                          className="form-select"
                        >
                          <option value="enterprise_sales">Enterprise Deployment & Pricing</option>
                          <option value="book_demo">Schedule a Live Demo</option>
                          <option value="custom_llm">Custom LLM & Private VPC</option>
                          <option value="partnership">Partnership & Integration</option>
                          <option value="support">Technical Support</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="teamSize">
                          Estimated Team Size
                        </label>
                        <select
                          id="teamSize"
                          name="teamSize"
                          value={formData.teamSize}
                          onChange={handleChange}
                          className="form-select"
                        >
                          <option value="1-10">1 - 10 Members</option>
                          <option value="10-50">10 - 50 Members</option>
                          <option value="50-250">50 - 250 Members</option>
                          <option value="250+">250+ Enterprise Users</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="message">
                        How can we help? (Optional)
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        rows={4}
                        placeholder="Tell us about your workflow automation goals, document volume, or integration requirements..."
                        value={formData.message}
                        onChange={handleChange}
                        className="form-textarea"
                      />
                    </div>

                    <div className="consent-checkbox-row">
                      <input
                        type="checkbox"
                        id="dpdpConsent"
                        name="dpdpConsent"
                        checked={formData.dpdpConsent}
                        onChange={handleChange}
                        className="consent-checkbox"
                      />
                      <label htmlFor="dpdpConsent" className="consent-label">
                        I agree to Xarwiz’s{' '}
                        <Link href="/privacy" target="_blank" className="consent-link">
                          Privacy Policy
                        </Link>{' '}
                        and acknowledge that my information will be processed securely in compliance with the Indian DPDP Act 2023.
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-submit-inquiry"
                    >
                      {loading ? (
                        'Submitting Inquiry...'
                      ) : (
                        <>
                          <span>Submit Message</span>
                          <Send size={16} />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <FooterSection />

      <style jsx>{`
        .contact-page {
          min-height: 100vh;
          background: #f8fafc;
          display: flex;
          flex-direction: column;
        }

        .contact-main {
          flex: 1;
        }

        .container {
          max-width: 1240px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .contact-hero {
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          padding: 56px 0 44px;
          text-align: center;
        }

        .hero-content {
          max-width: 760px;
          margin: 0 auto;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #2563eb;
          font-size: 0.8rem;
          font-weight: 600;
          border-radius: 20px;
          margin-bottom: 16px;
        }

        .hero-title {
          font-size: 2.6rem;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.2;
          margin-bottom: 16px;
          letter-spacing: -0.02em;
        }

        .blue-text {
          color: #2563eb;
        }

        .hero-subtitle {
          font-size: 1.05rem;
          color: #64748b;
          line-height: 1.6;
          margin: 0;
        }

        .contact-body-section {
          padding: 56px 0 80px;
        }

        .contact-grid {
          display: grid;
          grid-template-columns: 1fr 1.35fr;
          gap: 36px;
          align-items: start;
        }

        /* Left Column Info Card */
        .contact-info-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03);
        }

        .info-title {
          font-size: 1.35rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 8px;
        }

        .info-desc {
          font-size: 0.9rem;
          color: #64748b;
          margin: 0 0 28px;
          line-height: 1.5;
        }

        .info-items-list {
          display: flex;
          flex-direction: column;
          gap: 24px;
          margin-bottom: 32px;
        }

        .info-item {
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }

        .info-icon-box {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: #eff6ff;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .info-item-label {
          font-size: 0.78rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #94a3b8;
          margin-bottom: 4px;
        }

        .info-item-val {
          font-size: 0.92rem;
          color: #1e293b;
          line-height: 1.5;
        }

        .info-item-val a {
          color: #2563eb;
          text-decoration: none;
          font-weight: 500;
        }

        .info-item-val a:hover {
          text-decoration: underline;
        }

        .trust-banner-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
        }

        .trust-badge-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }

        .badge-flag {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 12px;
          background: #eff6ff;
          color: #2563eb;
          border: 1px solid #bfdbfe;
        }

        .badge-green {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 12px;
          background: #f0fdf4;
          color: #16a34a;
          border: 1px solid #bbf7d0;
        }

        .trust-banner-text {
          margin: 0;
          font-size: 0.8rem;
          color: #64748b;
          line-height: 1.45;
        }

        /* Right Column Form Card */
        .contact-form-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 36px;
          box-shadow: 0 4px 20px rgba(15, 23, 42, 0.04);
        }

        .form-header {
          margin-bottom: 24px;
        }

        .form-title {
          font-size: 1.35rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 6px;
        }

        .form-subtitle {
          font-size: 0.9rem;
          color: #64748b;
          margin: 0;
        }

        .form-error-alert {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 0.85rem;
          margin-bottom: 20px;
        }

        .form-row.split-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-group {
          margin-bottom: 18px;
        }

        .form-label {
          display: block;
          font-size: 0.82rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 6px;
        }

        .form-label .req {
          color: #ef4444;
        }

        .form-input,
        .form-select,
        .form-textarea {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 0.9rem;
          color: #0f172a;
          background: #ffffff;
          box-sizing: border-box;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          outline: none;
        }

        .form-input:focus,
        .form-select:focus,
        .form-textarea:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
        }

        .consent-checkbox-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin: 10px 0 24px;
        }

        .consent-checkbox {
          margin-top: 3px;
          cursor: pointer;
        }

        .consent-label {
          font-size: 0.78rem;
          color: #64748b;
          line-height: 1.45;
          cursor: pointer;
        }

        .consent-link {
          color: #2563eb;
          text-decoration: underline;
        }

        .btn-submit-inquiry {
          width: 100%;
          background: #2563eb;
          color: #ffffff;
          border: none;
          padding: 13px 20px;
          border-radius: 10px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }

        .btn-submit-inquiry:hover:not(:disabled) {
          background: #1d4ed8;
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
        }

        .btn-submit-inquiry:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        /* Success State */
        .success-state-box {
          text-align: center;
          padding: 30px 10px;
        }

        .success-icon-wrapper {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }

        .success-title {
          font-size: 1.6rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 10px;
        }

        .success-desc {
          font-size: 1rem;
          color: #334155;
          line-height: 1.5;
          margin: 0 0 8px;
        }

        .success-subdesc {
          font-size: 0.9rem;
          color: #64748b;
          line-height: 1.5;
          margin: 0 0 28px;
        }

        .success-actions {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }

        .btn-success-home {
          background: #2563eb;
          color: #ffffff;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.9rem;
          text-decoration: none;
        }

        .btn-success-reset {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #334155;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
        }

        @media (max-width: 900px) {
          .contact-grid {
            grid-template-columns: 1fr;
          }

          .form-row.split-2 {
            grid-template-columns: 1fr;
          }

          .hero-title {
            font-size: 2.1rem;
          }
        }
      `}</style>
    </div>
  );
}
