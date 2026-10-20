import React, { useState } from 'react';
import Link from 'next/link';
import HeaderNav from '../components/layout/HeaderNav';
import FooterSection from '../components/FooterSection';
import SEOHead, { defaultOrganizationSchema } from '../components/SEOHead';
import {
  Sparkles,
  Cpu,
  Layers,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  Briefcase,
  ArrowRight,
  X,
  Send,
  Zap,
  Globe,
  Heart,
} from 'lucide-react';

const OPEN_ROLES = [
  {
    id: 'ai-infra',
    title: 'Senior AI Infrastructure Engineer',
    dept: 'Engineering & Runtime',
    type: 'Full-time',
    location: 'Bangalore / Remote',
    desc: 'Scale our high-throughput distributed LLM inference gateways, vLLM clusters, and GPU orchestration pipelines.',
    tags: ['Python', 'vLLM', 'CUDA', 'TensorRT', 'Docker', 'Kubernetes'],
  },
  {
    id: 'fullstack-eng',
    title: 'Senior Fullstack Systems Engineer',
    dept: 'Platform & Product',
    type: 'Full-time',
    location: 'Remote / Hybrid (India)',
    desc: 'Own the core user portal, real-time agent canvas, workflow DAG visualizer, and streaming chat components.',
    tags: ['Next.js', 'React', 'Node.js', 'TypeScript', 'PostgreSQL', 'Tailwind'],
  },
  {
    id: 'solutions-architect',
    title: 'Enterprise Solutions Architect',
    dept: 'Solutions & Customer Engineering',
    type: 'Full-time',
    location: 'Mumbai / Delhi / Remote',
    desc: 'Partner with enterprise BFSI, Healthcare, and manufacturing leaders to architect private VPC and on-prem agent systems.',
    tags: ['Enterprise Architecture', 'DPDP Compliance', 'RAG Systems', 'VPC Peering'],
  },
  {
    id: 'security-engineer',
    title: 'AI Security & Statutory Compliance Specialist',
    dept: 'Security & Legal Tech',
    type: 'Full-time',
    location: 'Remote (India)',
    desc: 'Implement statutory compliance guardrails under the Indian DPDP Act 2023, automated audit logs, and pen-testing defenses.',
    tags: ['DPDP Act 2023', 'ISO 27001', 'SOC2', 'Data Privacy', 'Penetration Testing'],
  },
  {
    id: 'devrel-lead',
    title: 'Developer Relations & Technical Evangelist',
    dept: 'Growth & Community',
    type: 'Full-time',
    location: 'Remote',
    desc: 'Champion Xarwiz SDKs, create technical tutorials, build open-source agent recipes, and engage the Indian AI builder community.',
    tags: ['Technical Writing', 'SDKs', 'Python', 'Open Source', 'Community'],
  },
];

export default function CareersPage() {
  const [selectedRole, setSelectedRole] = useState(null);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    links: '',
    note: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dpdpConsent, setDpdpConsent] = useState(false);

  const handleApplyClick = (role) => {
    setSelectedRole(role);
    setSubmitted(false);
    setError('');
    setDpdpConsent(false);
    setApplyModalOpen(true);
  };

  const handleModalClose = () => {
    setApplyModalOpen(false);
    setSelectedRole(null);
    setError('');
    setDpdpConsent(false);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim() || !formData.email.trim() || !formData.links.trim()) {
      setError('Please provide your name, email, and portfolio/profile URL.');
      return;
    }

    if (!dpdpConsent) {
      setError('Please acknowledge the privacy notice to submit your application.');
      return;
    }

    setLoading(true);

    try {
      // Dedicated public careers intake endpoint — completely decoupled from user registration
      const res = await fetch('/api/v1/careers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          roleId: selectedRole?.id || 'general_engineering',
          roleTitle: selectedRole?.title || 'Open Role',
          portfolioLinks: formData.links.trim(),
          coverNote: formData.note.trim(),
          privacyNoticeAcknowledged: !!dpdpConsent,
          privacyNoticeVersion: '2.0-dpdp',
          _hp_website: '',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit application. Please try again.');
      }

      setSubmitted(true);
    } catch (err) {
      console.warn('Careers submission error:', err);
      setError(err.message || 'An unexpected error occurred. Please try again or email us directly at careers@xarwiz.com.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="careers-page">
      <SEOHead
        title="Careers & Engineering Culture - Xarwiz AI Cloud Platform"
        description="Join Xarwiz in building India's sovereign AI operating system. Explore open engineering, product, and solutions engineering roles."
        canonicalPath="/careers"
        jsonLd={[
          defaultOrganizationSchema,
          {
            '@context': 'https://schema.org',
            '@type': 'CareersPage',
            name: 'Careers at Xarwiz Technologies',
            url: 'https://xarwiz.com/careers',
            description: 'Engineering and product opportunities at Xarwiz AI Platform.',
          },
        ]}
      />

      <HeaderNav activePath="/careers" />

      <main className="careers-main">
        {/* Hero Section */}
        <section className="careers-hero">
          <div className="container">
            <div className="hero-content">
              <span className="hero-badge">
                <Sparkles size={14} /> Join Our Engineering Mission
              </span>
              <h1 className="hero-title">
                Build India’s Sovereign <span className="blue-text">AI Operating System</span>
              </h1>
              <p className="hero-subtitle">
                We’re a team of systems thinkers, AI practitioners, and builders on a mission to
                democratize autonomous agentic workflows and sovereign AI infrastructure across India.
              </p>
            </div>
          </div>
        </section>

        {/* Culture & Benefits Section */}
        <section className="perks-section">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">Why Build at Xarwiz?</h2>
              <p className="section-subtitle">
                High-leverage impact, world-class compute infrastructure, and an engineering-first culture.
              </p>
            </div>

            <div className="perks-grid">
              <div className="perk-card">
                <div className="perk-icon-wrapper">
                  <Cpu size={22} />
                </div>
                <h3 className="perk-title">Unrestricted Compute & GPUs</h3>
                <p className="perk-desc">
                  Direct access to dedicated NVIDIA clusters, custom model fine-tuning environments, and fast hardware iterations.
                </p>
              </div>

              <div className="perk-card">
                <div className="perk-icon-wrapper">
                  <Zap size={22} />
                </div>
                <h3 className="perk-title">Extreme Velocity & Ownership</h3>
                <p className="perk-desc">
                  No bureaucracy. Ship production features in hours, observe real enterprise workloads, and own systems end-to-end.
                </p>
              </div>

              <div className="perk-card">
                <div className="perk-icon-wrapper">
                  <Globe size={22} />
                </div>
                <h3 className="perk-title">Flexible Remote-First Work</h3>
                <p className="perk-desc">
                  Collaborate with talented teammates across India with full remote flexibility and home-office equipment support.
                </p>
              </div>

              <div className="perk-card">
                <div className="perk-icon-wrapper">
                  <Heart size={22} />
                </div>
                <h3 className="perk-title">Top Compensation & ESOPs</h3>
                <p className="perk-desc">
                  Competitive base compensation, meaningful equity stakes, comprehensive health coverage for you and your family.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Open Roles Section */}
        <section className="roles-section">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">Open Positions</h2>
              <p className="section-subtitle">
                Explore open opportunities to join our team in building sovereign AI technology.
              </p>
            </div>

            <div className="roles-list">
              {OPEN_ROLES.map((role) => (
                <div key={role.id} className="role-card">
                  <div className="role-main-info">
                    <div className="role-header-row">
                      <h3 className="role-title">{role.title}</h3>
                      <span className="role-dept-badge">{role.dept}</span>
                    </div>

                    <div className="role-meta-row">
                      <span className="meta-item">
                        <MapPin size={14} /> {role.location}
                      </span>
                      <span className="meta-item">
                        <Briefcase size={14} /> {role.type}
                      </span>
                    </div>

                    <p className="role-desc">{role.desc}</p>

                    <div className="role-tags-row">
                      {role.tags.map((tag, tIdx) => (
                        <span key={tIdx} className="role-tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="role-action-col">
                    <button
                      type="button"
                      className="btn-apply-role"
                      onClick={() => handleApplyClick(role)}
                    >
                      <span>Apply Now</span>
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* General Inquiries Box */}
            <div className="general-apply-box">
              <div className="general-text">
                <h4 className="general-title">Don’t see your exact role listed?</h4>
                <p className="general-desc">
                  We are always looking for exceptional engineers, researchers, and builders. Send us your GitHub or portfolio.
                </p>
              </div>
              <Link href="/contact" className="btn-general-contact">
                Get in Touch
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Application Modal */}
      {applyModalOpen && (
        <div className="modal-overlay" onClick={handleModalClose}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Apply for {selectedRole?.title}</h3>
                <p className="modal-subtitle">
                  {selectedRole?.dept} • {selectedRole?.location}
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={handleModalClose}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {submitted ? (
              <div className="modal-success-box">
                <CheckCircle2 size={44} color="#16A34A" />
                <h4 className="success-heading">Application Submitted!</h4>
                <p className="success-text">
                  Thank you for applying, <strong>{formData.name}</strong>. Our engineering team will review your application and reach out to <strong>{formData.email}</strong>.
                </p>
                <button
                  type="button"
                  className="btn-close-modal"
                  onClick={handleModalClose}
                >
                  Close Window
                </button>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="modal-form">
                <input type="text" name="_hp_website" tabIndex="-1" autoComplete="off" style={{ display: 'none' }} aria-hidden="true" />
                {error && (
                  <div
                    className="form-error-alert"
                    role="alert"
                    aria-live="polite"
                    style={{
                      marginBottom: '16px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#ef4444',
                      fontSize: '13px',
                    }}
                  >
                    {error}
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label" htmlFor="candName">
                    Full Name <span className="req">*</span>
                  </label>
                  <input
                    id="candName"
                    type="text"
                    required
                    placeholder="e.g. Ananya Sharma"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="candEmail">
                    Email Address <span className="req">*</span>
                  </label>
                  <input
                    id="candEmail"
                    type="email"
                    required
                    placeholder="ananya@example.com"
                    className="form-input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="candPhone">
                    Phone Number
                  </label>
                  <input
                    id="candPhone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    className="form-input"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="candLinks">
                    LinkedIn / GitHub / Portfolio URL <span className="req">*</span>
                  </label>
                  <input
                    id="candLinks"
                    type="url"
                    required
                    placeholder="https://github.com/your-username or https://linkedin.com/in/..."
                    className="form-input"
                    value={formData.links}
                    onChange={(e) => setFormData({ ...formData, links: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="candNote">
                    Why Xarwiz? (Brief Cover Note)
                  </label>
                  <textarea
                    id="candNote"
                    rows={3}
                    placeholder="Tell us what excites you about autonomous multi-agent AI and what systems you've built..."
                    className="form-textarea"
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  />
                </div>

                <div className="consent-checkbox-row" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '20px' }}>
                  <input
                    type="checkbox"
                    id="careerDpdpConsent"
                    checked={dpdpConsent}
                    onChange={(e) => setDpdpConsent(e.target.checked)}
                    style={{ marginTop: '3px', cursor: 'pointer' }}
                  />
                  <label htmlFor="careerDpdpConsent" style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.4, cursor: 'pointer' }}>
                    I agree to Xarwiz’s{' '}
                    <Link href="/privacy" target="_blank" style={{ color: '#38bdf8', textDecoration: 'underline' }}>
                      Privacy Policy
                    </Link>{' '}
                    and acknowledge that my application data will be processed securely under the Indian DPDP Act 2023.
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-submit-application"
                >
                  {loading ? (
                    'Submitting Application...'
                  ) : (
                    <>
                      <span>Submit Application</span>
                      <Send size={15} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <FooterSection />

      <style jsx>{`
        .careers-page {
          min-height: 100vh;
          background: #f8fafc;
          display: flex;
          flex-direction: column;
        }

        .careers-main {
          flex: 1;
        }

        .container {
          max-width: 1240px;
          margin: 0 auto;
          padding: 0 24px;
        }

        /* Hero */
        .careers-hero {
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

        /* Perks Section */
        .perks-section {
          padding: 60px 0;
          border-bottom: 1px solid #e2e8f0;
          background: #ffffff;
        }

        .section-header {
          text-align: center;
          max-width: 680px;
          margin: 0 auto 44px;
        }

        .section-title {
          font-size: 1.85rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 10px;
        }

        .section-subtitle {
          font-size: 0.95rem;
          color: #64748b;
          margin: 0;
          line-height: 1.5;
        }

        .perks-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }

        .perk-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 24px 20px;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .perk-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.05);
        }

        .perk-icon-wrapper {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: #eff6ff;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }

        .perk-title {
          font-size: 1.02rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 8px;
        }

        .perk-desc {
          margin: 0;
          font-size: 0.85rem;
          color: #64748b;
          line-height: 1.5;
        }

        /* Roles Section */
        .roles-section {
          padding: 60px 0 80px;
        }

        .roles-list {
          display: flex;
          flex-direction: column;
          gap: 18px;
          margin-bottom: 40px;
        }

        .role-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 24px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.02);
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .role-card:hover {
          border-color: #bfdbfe;
          box-shadow: 0 8px 24px -4px rgba(37, 99, 235, 0.08);
        }

        .role-main-info {
          flex: 1;
        }

        .role-header-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 6px;
          flex-wrap: wrap;
        }

        .role-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .role-dept-badge {
          font-size: 0.72rem;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 12px;
          background: #eff6ff;
          color: #2563eb;
          border: 1px solid #dbeafe;
        }

        .role-meta-row {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 10px;
          font-size: 0.82rem;
          color: #64748b;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .role-desc {
          margin: 0 0 12px;
          font-size: 0.88rem;
          color: #475569;
          line-height: 1.5;
        }

        .role-tags-row {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .role-tag {
          font-size: 0.72rem;
          background: #f1f5f9;
          color: #475569;
          padding: 3px 8px;
          border-radius: 6px;
          font-weight: 500;
        }

        .btn-apply-role {
          background: #2563eb;
          color: #ffffff;
          border: none;
          padding: 10px 20px;
          border-radius: 9px;
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
          transition: all 0.2s ease;
          box-shadow: 0 3px 10px rgba(37, 99, 235, 0.25);
        }

        .btn-apply-role:hover {
          background: #1d4ed8;
          box-shadow: 0 5px 14px rgba(37, 99, 235, 0.35);
        }

        /* General Box */
        .general-apply-box {
          background: #ffffff;
          border: 1px dashed #cbd5e1;
          border-radius: 14px;
          padding: 28px 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .general-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 4px;
        }

        .general-desc {
          margin: 0;
          font-size: 0.85rem;
          color: #64748b;
        }

        .btn-general-contact {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #0f172a;
          padding: 9px 18px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.88rem;
          text-decoration: none;
          white-space: nowrap;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(15, 23, 42, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }

        .modal-card {
          background: #ffffff;
          width: 100%;
          max-width: 520px;
          border-radius: 16px;
          padding: 28px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
          animation: modalScaleUp 0.18s ease-out;
        }

        @keyframes modalScaleUp {
          from {
            opacity: 0;
            transform: scale(0.96);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 16px;
          margin-bottom: 20px;
        }

        .modal-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 4px;
        }

        .modal-subtitle {
          margin: 0;
          font-size: 0.82rem;
          color: #64748b;
        }

        .modal-close-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
        }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .form-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: #1e293b;
        }

        .form-label .req {
          color: #ef4444;
        }

        .form-input,
        .form-textarea {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 9px 12px;
          font-size: 0.88rem;
          color: #0f172a;
          box-sizing: border-box;
          outline: none;
        }

        .form-input:focus,
        .form-textarea:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
        }

        .btn-submit-application {
          background: #2563eb;
          color: #ffffff;
          border: none;
          padding: 12px;
          border-radius: 9px;
          font-size: 0.92rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 8px;
        }

        .modal-success-box {
          text-align: center;
          padding: 24px 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .success-heading {
          font-size: 1.35rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .success-text {
          font-size: 0.92rem;
          color: #475569;
          line-height: 1.5;
          margin: 0;
        }

        .btn-close-modal {
          margin-top: 14px;
          background: #2563eb;
          color: #ffffff;
          border: none;
          padding: 9px 22px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }

        @media (max-width: 900px) {
          .perks-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .role-card {
            flex-direction: column;
            align-items: flex-start;
          }

          .btn-apply-role {
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 600px) {
          .perks-grid {
            grid-template-columns: 1fr;
          }
          .general-apply-box {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
