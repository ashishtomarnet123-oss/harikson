import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Menu,
  X,
  ArrowRight,
  Play,
  Check,
  ShieldCheck,
  Globe,
  Users,
  Layers,
  Bot,
  Database,
  Workflow,
  Cpu,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Zap,
  Lock,
} from 'lucide-react';
import FooterSection from '../components/FooterSection';
import SEOHead, { defaultOrganizationSchema } from '../components/SEOHead';

export default function AboutPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [workflowActiveStep, setWorkflowActiveStep] = useState(0);

  // Accessible escape-key close and body scroll lock for mobile menu
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen]);

  // Subtle cyclic animation for Hero Agent workflow visual (4 steps)
  useEffect(() => {
    const timer = setInterval(() => {
      setWorkflowActiveStep((prev) => (prev + 1) % 4);
    }, 2400);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="about-page-root">
      <SEOHead
        title="About Xarwiz | India's AI Platform for Agents & Automation"
        description="Discover Xarwiz, India's AI Platform for Agents & Automation. Learn how we're connecting AI agents, business knowledge, and workflows to help businesses work smarter."
        canonicalPath="/about"
        jsonLd={[
          defaultOrganizationSchema,
          {
            '@context': 'https://schema.org',
            '@type': 'AboutPage',
            name: "About Xarwiz | India's AI Platform for Agents & Automation",
            url: 'https://xarwiz.com/about',
            description:
              "Discover Xarwiz, India's AI Platform for Agents & Automation. Learn how we're connecting AI agents, business knowledge, and workflows to help businesses work smarter.",
            mainEntity: {
              '@type': 'Organization',
              name: 'Xarwiz Technologies LLP',
              founder: {
                '@type': 'Person',
                name: 'Ashish Pratap Singh Tomar',
                jobTitle: 'Founder & Product Architect',
              },
              foundingLocation: {
                '@type': 'Place',
                name: 'Noida, Uttar Pradesh, India',
              },
            },
          },
        ]}
      />

      <style jsx global>{`
        /* -------------------------------------------------------------
           RESET & CSS VARIABLES
        ------------------------------------------------------------- */
        *, *::before, *::after {
          box-sizing: border-box;
        }

        :root {
          --color-navy: #0f172a;
          --color-navy-dark: #0a0f1d;
          --color-navy-card: #1e293b;
          --color-blue: #2563eb;
          --color-blue-hover: #1d4ed8;
          --color-blue-light: #eff6ff;
          --color-blue-border: #bfdbfe;
          --color-slate-body: #475569;
          --color-slate-muted: #64748b;
          --color-border: #e2e8f0;
          --color-bg-subtle: #f8fafc;
          --font-body: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          --font-heading: 'Outfit', 'Inter', sans-serif;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          padding: 0;
          font-family: var(--font-body);
          color: var(--color-navy);
          background-color: #ffffff;
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
        }

        .about-page-root {
          min-height: 100vh;
          background: #ffffff;
          color: var(--color-navy);
          display: flex;
          flex-direction: column;
        }

        /* -------------------------------------------------------------
           LAYOUT CONTAINERS
        ------------------------------------------------------------- */
        .section-container {
          max-width: 1240px;
          margin: 0 auto;
          padding: 0 24px;
          box-sizing: border-box;
          width: 100%;
        }

        .section-header-centered {
          text-align: center;
          max-width: 760px;
          margin: 0 auto 52px auto;
        }

        .section-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          border-radius: 9999px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #2563eb;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 16px;
        }

        .section-heading-editorial {
          font-family: var(--font-heading);
          font-size: clamp(2rem, 4vw, 2.75rem);
          font-weight: 800;
          color: var(--color-navy);
          letter-spacing: -0.025em;
          line-height: 1.2;
          margin: 0 0 16px 0;
        }

        .section-subcopy {
          font-size: clamp(1rem, 2vw, 1.1rem);
          color: var(--color-slate-body);
          line-height: 1.65;
          margin: 0;
        }

        /* -------------------------------------------------------------
           HEADER
        ------------------------------------------------------------- */
        .site-header {
          position: sticky;
          top: 0;
          z-index: 1000;
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--color-border);
          transition: background-color 0.2s ease;
        }

        .header-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 72px;
        }

        .header-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }

        .header-logo-img {
          height: 28px;
          width: auto;
          display: block;
        }

        .header-logo-badge {
          display: inline-flex;
          align-items: center;
          padding: 3px 8px;
          border-radius: 20px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          font-size: 0.7rem;
          font-weight: 700;
          color: #1e40af;
          letter-spacing: 0.02em;
        }

        .header-nav {
          display: flex;
          align-items: center;
        }

        .header-nav-list {
          display: flex;
          align-items: center;
          gap: 32px;
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .header-nav-link {
          font-size: 0.92rem;
          font-weight: 600;
          color: #475569;
          text-decoration: none;
          transition: color 0.2s ease;
          position: relative;
          padding: 8px 0;
        }

        .header-nav-link:hover {
          color: var(--color-blue);
        }

        .header-nav-link.active {
          color: var(--color-blue);
          font-weight: 700;
        }

        .header-nav-link.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--color-blue);
          border-radius: 2px;
        }

        .header-ctas {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .btn-header-login {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--color-navy);
          text-decoration: none;
          padding: 9px 18px;
          border-radius: 9px;
          border: 1px solid #cbd5e1;
          transition: all 0.2s ease;
          background: #ffffff;
        }

        .btn-header-login:hover {
          background: #f8fafc;
          border-color: #94a3b8;
        }

        .btn-header-primary {
          font-size: 0.9rem;
          font-weight: 700;
          color: #ffffff !important;
          background: var(--color-blue);
          text-decoration: none;
          padding: 9px 20px;
          border-radius: 9px;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25);
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .btn-header-primary:hover {
          background: var(--color-blue-hover);
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(37, 99, 235, 0.35);
        }

        .header-mobile-toggle {
          display: none;
          background: #ffffff;
          border: 1px solid var(--color-border);
          color: var(--color-navy);
          border-radius: 9px;
          padding: 8px;
          cursor: pointer;
          min-width: 44px;
          min-height: 44px;
          align-items: center;
          justify-content: center;
        }

        /* -------------------------------------------------------------
           MOBILE DRAWER
        ------------------------------------------------------------- */
        .mobile-drawer-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          z-index: 99999;
          display: flex;
          justify-content: flex-end;
        }

        .mobile-drawer {
          width: 85%;
          max-width: 340px;
          height: 100%;
          background: #ffffff;
          box-shadow: -10px 0 30px rgba(0, 0, 0, 0.15);
          display: flex;
          flex-direction: column;
          animation: slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          overflow-y: auto;
        }

        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        .mobile-drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 20px;
          border-bottom: 1px solid var(--color-border);
        }

        .mobile-drawer-close {
          background: #f1f5f9;
          border: none;
          border-radius: 8px;
          padding: 8px;
          color: #64748b;
          cursor: pointer;
          min-width: 44px;
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .mobile-drawer-body {
          flex: 1;
          padding: 24px 20px;
        }

        .mobile-drawer-links {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .mobile-drawer-links a {
          color: var(--color-navy);
          text-decoration: none;
          font-size: 1.05rem;
          font-weight: 600;
          display: block;
          padding: 6px 0;
        }

        .mobile-drawer-links a.active {
          color: var(--color-blue);
          font-weight: 700;
        }

        .mobile-drawer-footer {
          padding: 20px;
          border-top: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: var(--color-bg-subtle);
        }

        /* -------------------------------------------------------------
           HERO SECTION
        ------------------------------------------------------------- */
        .hero-section {
          position: relative;
          padding: clamp(56px, 8vw, 96px) 0 clamp(48px, 6vw, 80px) 0;
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          overflow: hidden;
        }

        .hero-backdrop-glow {
          position: absolute;
          top: 0;
          right: 5%;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(199, 210, 254, 0.45) 0%, rgba(224, 231, 255, 0.2) 40%, transparent 70%);
          filter: blur(50px);
          pointer-events: none;
          z-index: 1;
        }

        .hero-grid-2col {
          display: grid;
          grid-template-columns: 1.08fr 0.92fr;
          gap: 48px;
          align-items: center;
          position: relative;
          z-index: 2;
        }

        .hero-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          border-radius: 9999px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #2563eb;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin-bottom: 24px;
        }

        .hero-eyebrow-dot {
          width: 8px;
          height: 8px;
          background: #2563eb;
          border-radius: 50%;
          display: inline-block;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
        }

        .hero-h1 {
          font-family: var(--font-heading);
          font-size: clamp(2.35rem, 5vw, 3.85rem);
          font-weight: 800;
          line-height: 1.12;
          letter-spacing: -0.035em;
          color: var(--color-navy);
          margin: 0 0 24px 0;
        }

        .hero-gradient-text {
          background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          display: inline-block;
        }

        .hero-description {
          font-size: clamp(1.05rem, 2vw, 1.2rem);
          color: var(--color-slate-body);
          line-height: 1.68;
          margin: 0 0 36px 0;
          max-width: 580px;
        }

        .hero-actions-row {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .btn-primary-hero {
          background: var(--color-blue);
          color: #ffffff !important;
          padding: 14px 28px;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 700;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          min-height: 50px;
          box-shadow: 0 10px 25px -5px rgba(37, 99, 235, 0.4);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .btn-primary-hero:hover {
          background: var(--color-blue-hover);
          transform: translateY(-2px);
          box-shadow: 0 15px 30px -5px rgba(37, 99, 235, 0.5);
        }

        .btn-secondary-hero {
          background: #ffffff;
          color: var(--color-navy) !important;
          padding: 14px 26px;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 600;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 50px;
          border: 1px solid #cbd5e1;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
          transition: all 0.25s ease;
        }

        .btn-secondary-hero:hover {
          background: #f8fafc;
          border-color: #94a3b8;
          transform: translateY(-2px);
          box-shadow: 0 6px 14px rgba(0, 0, 0, 0.06);
        }

        /* -------------------------------------------------------------
           FLOATING ANGLED PRODUCT DASHBOARD
        ------------------------------------------------------------- */
        .hero-dashboard-viewport {
          position: relative;
          perspective: 1200px;
        }

        .hero-annotation-pill {
          position: absolute;
          top: -16px;
          right: 24px;
          z-index: 10;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #ffffff;
          padding: 6px 14px;
          border-radius: 20px;
          border: 1px solid #bfdbfe;
          box-shadow: 0 10px 25px rgba(37, 99, 235, 0.15);
          font-size: 0.78rem;
          font-weight: 700;
          color: #1e40af;
          animation: floatPill 4s ease-in-out infinite;
        }

        @keyframes floatPill {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        .hero-dashboard-card {
          background: #ffffff;
          border-radius: 20px;
          border: 1px solid rgba(226, 232, 240, 0.9);
          box-shadow:
            0 25px 60px -15px rgba(15, 23, 42, 0.12),
            0 10px 30px -5px rgba(37, 99, 235, 0.08);
          transform: rotateY(-5deg) rotateX(3deg);
          transform-style: preserve-3d;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease;
          overflow: hidden;
        }

        .hero-dashboard-card:hover {
          transform: rotateY(0deg) rotateX(0deg) translateY(-4px);
          box-shadow:
            0 35px 70px -15px rgba(15, 23, 42, 0.16),
            0 15px 35px -5px rgba(37, 99, 235, 0.12);
        }

        .dashboard-topbar {
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          padding: 12px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .dashboard-window-dots {
          display: flex;
          gap: 6px;
        }

        .dashboard-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .dot-red { background: #f87171; }
        .dot-yellow { background: #fbbf24; }
        .dot-green { background: #34d399; }

        .dashboard-window-title {
          font-size: 0.76rem;
          font-weight: 600;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .dashboard-status-live {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: #ecfdf5;
          color: #059669;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 12px;
          border: 1px solid #a7f3d0;
        }

        .dashboard-body-grid {
          display: grid;
          grid-template-columns: 140px 1fr;
          min-height: 380px;
          background: #ffffff;
        }

        .dashboard-mini-sidebar {
          background: #fafafa;
          border-right: 1px solid #f1f5f9;
          padding: 16px 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .mini-sidebar-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 8px;
          font-size: 0.76rem;
          font-weight: 600;
          color: #64748b;
          transition: all 0.15s ease;
        }

        .mini-sidebar-item.active {
          background: #eff6ff;
          color: #2563eb;
          font-weight: 700;
        }

        .dashboard-canvas {
          padding: 20px;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .dashboard-metrics-strip {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .metric-mini-tile {
          background: #f8fafc;
          border: 1px solid #f1f5f9;
          border-radius: 10px;
          padding: 8px 12px;
        }

        .metric-mini-label {
          font-size: 0.68rem;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
        }

        .metric-mini-value {
          font-size: 1.1rem;
          font-weight: 800;
          color: #0f172a;
        }

        .workflow-visual-builder {
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
          border-radius: 14px;
          padding: 16px;
          position: relative;
        }

        .builder-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }

        .builder-title {
          font-size: 0.8rem;
          font-weight: 700;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .builder-badge {
          font-size: 0.68rem;
          background: #eff6ff;
          color: #2563eb;
          padding: 2px 6px;
          border-radius: 6px;
          font-weight: 700;
        }

        .workflow-nodes-flow {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          position: relative;
        }

        .workflow-node-box {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 10px 8px;
          text-align: center;
          transition: all 0.3s ease;
          position: relative;
        }

        .workflow-node-box.active {
          border-color: #2563eb;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
          transform: translateY(-2px);
          background: #eff6ff;
        }

        .node-step-icon {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background: #f1f5f9;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 6px auto;
          transition: background 0.2s ease;
        }

        .workflow-node-box.active .node-step-icon {
          background: #2563eb;
          color: #ffffff;
        }

        .node-step-label {
          font-size: 0.7rem;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .node-step-desc {
          font-size: 0.62rem;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .dashboard-execution-console {
          background: #0f172a;
          border-radius: 10px;
          padding: 12px 14px;
          color: #e2e8f0;
          font-size: 0.74rem;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .console-status-text {
          color: #38bdf8;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .console-latency-tag {
          color: #94a3b8;
          font-size: 0.68rem;
        }

        /* -------------------------------------------------------------
           TRUST STRIP
        ------------------------------------------------------------- */
        .trust-strip-section {
          background: var(--color-bg-subtle);
          border-top: 1px solid var(--color-border);
          border-bottom: 1px solid var(--color-border);
          padding: 28px 0;
        }

        .trust-strip-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }

        .trust-item {
          display: flex;
          align-items: flex-start;
          gap: 14px;
        }

        .trust-icon-wrap {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .trust-content-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--color-navy);
          margin-bottom: 4px;
        }

        .trust-content-desc {
          font-size: 0.82rem;
          color: var(--color-slate-muted);
          line-height: 1.45;
          margin: 0;
        }

        /* -------------------------------------------------------------
           FOUNDER STORY SECTION
        ------------------------------------------------------------- */
        .story-section {
          padding: clamp(60px, 8vw, 100px) 0;
          background: #ffffff;
        }

        .story-grid-2col {
          display: grid;
          grid-template-columns: 0.95fr 1.05fr;
          gap: 56px;
          align-items: center;
        }

        .story-image-composition {
          position: relative;
        }

        .story-main-img-card {
          width: 100%;
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid var(--color-border);
          box-shadow: 0 20px 40px -10px rgba(15, 23, 42, 0.1);
          background: #f1f5f9;
          position: relative;
        }

        .story-portrait-img {
          width: 100%;
          height: 460px;
          object-fit: cover;
          object-position: center top;
          display: block;
        }

        .story-floating-quote-card {
          position: absolute;
          bottom: -24px;
          right: -16px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 20px 22px;
          max-width: 380px;
          box-shadow: 0 20px 35px -5px rgba(0, 0, 0, 0.12);
        }

        .quote-text {
          font-size: 0.92rem;
          font-style: italic;
          color: #1e293b;
          line-height: 1.55;
          margin-bottom: 10px;
        }

        .quote-author {
          font-size: 0.82rem;
          font-weight: 700;
          color: #2563eb;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .quote-author-role {
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 500;
        }

        .story-content-side {
          padding-left: 12px;
        }

        .story-body-copy {
          font-size: 1.05rem;
          color: var(--color-slate-body);
          line-height: 1.75;
          margin-bottom: 24px;
        }

        .editorial-text-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 1rem;
          font-weight: 700;
          color: var(--color-blue);
          text-decoration: none;
          transition: gap 0.2s ease;
        }

        .editorial-text-link:hover {
          gap: 12px;
          color: var(--color-blue-hover);
        }

        /* -------------------------------------------------------------
           PLATFORM CAPABILITIES SECTION
        ------------------------------------------------------------- */
        .capabilities-section {
          padding: clamp(60px, 8vw, 100px) 0;
          background: #ffffff;
          border-top: 1px solid var(--color-border);
        }

        .capabilities-header-row {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 48px;
          flex-wrap: wrap;
          gap: 20px;
        }

        .capabilities-grid-4col {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }

        .capability-card {
          background: #ffffff;
          border: 1px solid var(--color-border);
          border-radius: 18px;
          padding: 32px 24px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
          position: relative;
        }

        .capability-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 30px -10px rgba(37, 99, 235, 0.12);
          border-color: #cbd5e1;
        }

        .capability-icon-container {
          width: 54px;
          height: 54px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
          transition: transform 0.2s ease;
        }

        .capability-card:hover .capability-icon-container {
          transform: scale(1.06);
        }

        .icon-accent-blue {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #2563eb;
        }

        .icon-accent-green {
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          color: #059669;
        }

        .icon-accent-purple {
          background: #f5f3ff;
          border: 1px solid #ddd6fe;
          color: #7c3aed;
        }

        .icon-accent-orange {
          background: #fff7ed;
          border: 1px solid #fed7aa;
          color: #ea580c;
        }

        .capability-title {
          font-family: var(--font-heading);
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-navy);
          margin: 0 0 12px 0;
        }

        .capability-desc {
          font-size: 0.92rem;
          color: var(--color-slate-body);
          line-height: 1.6;
          margin: 0 0 24px 0;
          flex-grow: 1;
        }

        .capability-cta {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--color-blue);
          text-decoration: none;
          transition: gap 0.2s ease;
        }

        .capability-card:hover .capability-cta {
          gap: 10px;
          color: var(--color-blue-hover);
        }

        /* -------------------------------------------------------------
           INDIA-FIRST SECTION
        ------------------------------------------------------------- */
        .india-section {
          padding: clamp(60px, 8vw, 100px) 0;
          background: var(--color-bg-subtle);
          border-top: 1px solid var(--color-border);
          border-bottom: 1px solid var(--color-border);
        }

        .india-grid-2col {
          display: grid;
          grid-template-columns: 1fr 1.15fr;
          gap: 56px;
          align-items: center;
        }

        .india-visual-side {
          position: relative;
        }

        .india-main-img-card {
          width: 100%;
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid var(--color-border);
          box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.08);
          background: #f1f5f9;
        }

        .india-flag-img {
          width: 100%;
          height: 380px;
          object-fit: cover;
          display: block;
        }

        .india-floating-badge-card {
          position: absolute;
          bottom: 24px;
          left: 24px;
          right: 24px;
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.8);
          border-radius: 16px;
          padding: 20px 24px;
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.12);
        }

        .india-card-eyebrow {
          font-size: 0.72rem;
          font-weight: 800;
          color: #ea580c;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .india-card-title {
          font-family: var(--font-heading);
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--color-navy);
          margin-bottom: 8px;
        }

        .india-card-subcopy {
          font-size: 0.88rem;
          color: var(--color-slate-body);
          line-height: 1.5;
          margin: 0;
        }

        .principles-list-3col {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 32px;
        }

        .principle-item-card {
          background: #ffffff;
          border: 1px solid var(--color-border);
          border-radius: 14px;
          padding: 16px 20px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
          transition: border-color 0.2s ease;
        }

        .principle-item-card:hover {
          border-color: #cbd5e1;
        }

        .principle-title {
          font-size: 1rem;
          font-weight: 700;
          color: var(--color-navy);
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .principle-desc {
          font-size: 0.88rem;
          color: var(--color-slate-body);
          line-height: 1.55;
          margin: 0;
        }

        /* -------------------------------------------------------------
           TIMELINE SECTION
        ------------------------------------------------------------- */
        .timeline-section {
          padding: clamp(60px, 8vw, 100px) 0;
          background: #ffffff;
        }

        .timeline-grid-2col {
          display: grid;
          grid-template-columns: 0.95fr 1.6fr;
          gap: 56px;
          align-items: flex-start;
        }

        .timeline-track-desktop {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          position: relative;
          padding-top: 24px;
        }

        .timeline-track-desktop::before {
          content: '';
          position: absolute;
          top: 36px;
          left: 10%;
          right: 10%;
          height: 3px;
          background: linear-gradient(90deg, #2563eb, #8b5cf6);
          border-radius: 2px;
          z-index: 1;
        }

        .timeline-milestone-node {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .milestone-dot-badge {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #ffffff;
          border: 3px solid #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.68rem;
          font-weight: 800;
          color: #2563eb;
          margin-bottom: 18px;
          box-shadow: 0 0 0 4px #eff6ff;
        }

        .milestone-dot-badge.pulse {
          border-color: #7c3aed;
          color: #7c3aed;
          box-shadow: 0 0 0 4px #f5f3ff;
        }

        .milestone-card-inner {
          background: #ffffff;
          border: 1px solid var(--color-border);
          border-radius: 14px;
          padding: 16px 14px;
          width: 100%;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.03);
          text-align: left;
        }

        .milestone-title {
          font-size: 0.92rem;
          font-weight: 700;
          color: var(--color-navy);
          margin-bottom: 6px;
        }

        .milestone-desc {
          font-size: 0.8rem;
          color: var(--color-slate-body);
          line-height: 1.5;
          margin: 0;
        }

        /* -------------------------------------------------------------
           TEAM SECTION
        ------------------------------------------------------------- */
        .team-section {
          padding: clamp(60px, 8vw, 100px) 0;
          background: var(--color-bg-subtle);
          border-top: 1px solid var(--color-border);
        }

        .team-grid-2col {
          display: grid;
          grid-template-columns: 0.95fr 1.35fr;
          gap: 56px;
          align-items: flex-start;
        }

        .team-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
          gap: 24px;
        }

        .team-profile-card {
          background: #ffffff;
          border: 1px solid var(--color-border);
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.03);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .team-profile-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 25px -5px rgba(0, 0, 0, 0.08);
          border-color: #cbd5e1;
        }

        .team-portrait-wrap {
          width: 100%;
          height: 240px;
          background: #f1f5f9;
          overflow: hidden;
          position: relative;
        }

        .team-portrait-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
        }

        .team-card-details {
          padding: 20px;
        }

        .team-member-name {
          font-family: var(--font-heading);
          font-size: 1.15rem;
          font-weight: 800;
          color: var(--color-navy);
          margin: 0 0 4px 0;
        }

        .team-member-role {
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--color-blue);
          margin-bottom: 10px;
        }

        .team-member-bio {
          font-size: 0.85rem;
          color: var(--color-slate-body);
          line-height: 1.5;
          margin: 0 0 16px 0;
        }

        .team-social-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .social-chip-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 8px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          font-size: 0.76rem;
          font-weight: 600;
          color: #475569;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .social-chip-link:hover {
          background: #eff6ff;
          border-color: #bfdbfe;
          color: #2563eb;
        }

        /* -------------------------------------------------------------
           CLOSING CTA — DARK, PREMIUM FINISH
        ------------------------------------------------------------- */
        .closing-cta-section {
          background: #090e1a;
          color: #ffffff;
          padding: clamp(60px, 9vw, 110px) 0;
          position: relative;
          overflow: hidden;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .closing-cta-radial-glow {
          position: absolute;
          top: -20%;
          left: 30%;
          width: 700px;
          height: 700px;
          background: radial-gradient(circle, rgba(37, 99, 235, 0.22) 0%, rgba(124, 58, 237, 0.12) 50%, transparent 70%);
          filter: blur(60px);
          pointer-events: none;
          z-index: 1;
        }

        .closing-cta-grid-2col {
          display: grid;
          grid-template-columns: 1.15fr 0.95fr;
          gap: 56px;
          align-items: center;
          position: relative;
          z-index: 2;
        }

        .closing-cta-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 20px;
          background: rgba(37, 99, 235, 0.2);
          border: 1px solid rgba(59, 130, 246, 0.4);
          color: #60a5fa;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 20px;
        }

        .closing-cta-heading {
          font-family: var(--font-heading);
          font-size: clamp(2.1rem, 4.5vw, 3.25rem);
          font-weight: 800;
          color: #ffffff;
          line-height: 1.15;
          letter-spacing: -0.025em;
          margin: 0 0 20px 0;
        }

        .closing-cta-copy {
          font-size: clamp(1rem, 2vw, 1.15rem);
          color: #94a3b8;
          line-height: 1.65;
          margin: 0 0 36px 0;
          max-width: 520px;
        }

        .closing-cta-buttons {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .btn-cta-blue {
          background: #2563eb;
          color: #ffffff !important;
          padding: 14px 30px;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 700;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          min-height: 50px;
          box-shadow: 0 10px 25px -5px rgba(37, 99, 235, 0.5);
          transition: all 0.25s ease;
        }

        .btn-cta-blue:hover {
          background: #1d4ed8;
          transform: translateY(-2px);
          box-shadow: 0 15px 30px -5px rgba(37, 99, 235, 0.6);
        }

        .btn-cta-ghost {
          background: rgba(255, 255, 255, 0.06);
          color: #ffffff !important;
          padding: 14px 26px;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 600;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 50px;
          border: 1px solid rgba(255, 255, 255, 0.25);
          transition: all 0.25s ease;
        }

        .btn-cta-ghost:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.5);
          transform: translateY(-2px);
        }

        /* Journey diagram on the right */
        .closing-journey-diagram {
          display: flex;
          flex-direction: column;
          gap: 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 28px;
          backdrop-filter: blur(8px);
        }

        .journey-step-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          transition: all 0.2s ease;
        }

        .journey-step-card:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(59, 130, 246, 0.5);
          transform: translateX(4px);
        }

        .journey-step-badge {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(37, 99, 235, 0.25);
          border: 1px solid rgba(59, 130, 246, 0.5);
          color: #60a5fa;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.85rem;
          flex-shrink: 0;
        }

        .journey-step-title {
          font-size: 1rem;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 2px;
        }

        .journey-step-desc {
          font-size: 0.82rem;
          color: #94a3b8;
          margin: 0;
        }

        .journey-arrow-indicator {
          display: flex;
          justify-content: center;
          color: #3b82f6;
          margin: -6px 0;
        }

        /* -------------------------------------------------------------
           RESPONSIVE RULES
        ------------------------------------------------------------- */
        @media (max-width: 1024px) {
          .header-nav {
            display: none !important;
          }
          .header-ctas {
            display: none !important;
          }
          .header-mobile-toggle {
            display: inline-flex !important;
          }

          .hero-grid-2col {
            grid-template-columns: 1fr;
            gap: 48px;
          }

          .hero-dashboard-viewport {
            max-width: 620px;
            margin: 0 auto;
          }

          .trust-strip-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
          }

          .story-grid-2col {
            grid-template-columns: 1fr;
            gap: 48px;
          }

          .story-floating-quote-card {
            position: relative;
            bottom: auto;
            right: auto;
            margin-top: 16px;
            max-width: 100%;
          }

          .capabilities-grid-4col {
            grid-template-columns: repeat(2, 1fr);
          }

          .india-grid-2col {
            grid-template-columns: 1fr;
            gap: 48px;
          }

          .timeline-grid-2col {
            grid-template-columns: 1fr;
            gap: 40px;
          }

          .timeline-track-desktop {
            grid-template-columns: 1fr;
            gap: 16px;
            padding-top: 0;
          }

          .timeline-track-desktop::before {
            display: none;
          }

          .timeline-milestone-node {
            flex-direction: row;
            align-items: flex-start;
            gap: 16px;
            text-align: left;
          }

          .milestone-dot-badge {
            margin-bottom: 0;
            flex-shrink: 0;
          }

          .team-grid-2col {
            grid-template-columns: 1fr;
            gap: 40px;
          }

          .closing-cta-grid-2col {
            grid-template-columns: 1fr;
            gap: 40px;
          }
        }

        @media (max-width: 640px) {
          .trust-strip-grid {
            grid-template-columns: 1fr;
          }

          .capabilities-grid-4col {
            grid-template-columns: 1fr;
          }

          .dashboard-body-grid {
            grid-template-columns: 1fr;
          }

          .dashboard-mini-sidebar {
            display: none;
          }

          .workflow-nodes-flow {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }

          .hero-h1 {
            font-size: 2.15rem;
          }

          .closing-cta-buttons {
            flex-direction: column;
            width: 100%;
          }

          .btn-cta-blue, .btn-cta-ghost {
            width: 100%;
            justify-content: center;
          }
        }

        /* Reduced motion accessibility */
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
          .hero-dashboard-card {
            transform: none !important;
          }
          .hero-annotation-pill {
            animation: none !important;
          }
        }
      `}</style>

      {/* -------------------------------------------------------------
          HEADER — EXACT REFERENCE SPECIFICATION
      ------------------------------------------------------------- */}
      <header className="site-header">
        <div className="section-container header-inner">
          <Link href="/" className="header-brand" aria-label="Xarwiz Home">
            <img
              src="/assets/xarwiz-logo.png"
              alt="Xarwiz"
              className="header-logo-img"
            />
            <span className="header-logo-badge">AI Platform</span>
          </Link>

          <nav className="header-nav" aria-label="Main Navigation">
            <ul className="header-nav-list">
              <li>
                <Link href="/neuravolt" className="header-nav-link">
                  Platform
                </Link>
              </li>
              <li>
                <Link href="/neuravolt#solutions" className="header-nav-link">
                  Solutions
                </Link>
              </li>
              <li>
                <Link href="/documents" className="header-nav-link">
                  Resources
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="header-nav-link">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/about" className="header-nav-link active">
                  About
                </Link>
              </li>
            </ul>
          </nav>

          <div className="header-ctas">
            <Link href="/login" className="btn-header-login">
              Login
            </Link>
            <Link href="/signup" className="btn-header-primary">
              Get Early Access
            </Link>
          </div>

          <button
            className="header-mobile-toggle"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {/* -------------------------------------------------------------
          MOBILE DRAWER
      ------------------------------------------------------------- */}
      {mobileMenuOpen && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-drawer-header">
              <Link
                href="/"
                className="header-brand"
                onClick={() => setMobileMenuOpen(false)}
              >
                <img
                  src="/assets/xarwiz-logo.png"
                  alt="Xarwiz"
                  className="header-logo-img"
                />
              </Link>
              <button
                className="mobile-drawer-close"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mobile-drawer-body">
              <ul className="mobile-drawer-links">
                <li>
                  <Link
                    href="/neuravolt"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Platform
                  </Link>
                </li>
                <li>
                  <Link
                    href="/neuravolt#solutions"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Solutions
                  </Link>
                </li>
                <li>
                  <Link
                    href="/documents"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Resources
                  </Link>
                </li>
                <li>
                  <Link
                    href="/pricing"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    href="/about"
                    className="active"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    About Us
                  </Link>
                </li>
              </ul>
            </div>

            <div className="mobile-drawer-footer">
              <Link
                href="/login"
                className="btn-header-login"
                style={{ textAlign: 'center' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="btn-header-primary"
                style={{ textAlign: 'center' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                Get Early Access
              </Link>
            </div>
          </div>
        </div>
      )}

      <main>
        {/* -------------------------------------------------------------
            HERO SECTION — REPRODUCE REFERENCE LAYOUT
        ------------------------------------------------------------- */}
        <section className="hero-section">
          <div className="hero-backdrop-glow" aria-hidden="true" />
          <div className="section-container hero-grid-2col">
            {/* Left Column */}
            <div>
              <div className="hero-eyebrow">
                <span className="hero-eyebrow-dot" />
                OUR STORY · Built in India for a global AI future
              </div>

              <h1 className="hero-h1">
                India's AI Platform
                <br />
                <span className="hero-gradient-text">for Agents &amp; Automation</span>
              </h1>

              <p className="hero-description">
                We're building a connected AI platform where agents, business
                knowledge and workflows work together to help businesses get
                real work done — faster, smarter and at scale.
              </p>

              <div className="hero-actions-row">
                <Link href="/neuravolt" className="btn-primary-hero">
                  Explore the Platform <ArrowRight size={18} />
                </Link>
                <a href="#founder-story" className="btn-secondary-hero">
                  <Play size={15} fill="currentColor" /> Watch Our Story
                </a>
              </div>
            </div>

            {/* Right Column: Floating Angled Product Dashboard */}
            <div className="hero-dashboard-viewport">
              <div className="hero-annotation-pill">
                <Sparkles size={14} color="#2563eb" />
                Turn ideas into AI agents that work
              </div>

              <div className="hero-dashboard-card">
                <div className="dashboard-topbar">
                  <div className="dashboard-window-dots">
                    <span className="dashboard-dot dot-red" />
                    <span className="dashboard-dot dot-yellow" />
                    <span className="dashboard-dot dot-green" />
                  </div>
                  <div className="dashboard-window-title">
                    <Bot size={14} color="#2563eb" />
                    Xarwiz Agent Studio · Enterprise V2
                  </div>
                  <div className="dashboard-status-live">
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
                    Live
                  </div>
                </div>

                <div className="dashboard-body-grid">
                  <aside className="dashboard-mini-sidebar">
                    <div className="mini-sidebar-item active">
                      <Bot size={13} /> AI Agents
                    </div>
                    <div className="mini-sidebar-item">
                      <Database size={13} /> Knowledge
                    </div>
                    <div className="mini-sidebar-item">
                      <Workflow size={13} /> Workflows
                    </div>
                    <div className="mini-sidebar-item">
                      <Cpu size={13} /> Connectors
                    </div>
                  </aside>

                  <div className="dashboard-canvas">
                    <div className="dashboard-metrics-strip">
                      <div className="metric-mini-tile">
                        <div className="metric-mini-label">Active Agents</div>
                        <div className="metric-mini-value">24</div>
                      </div>
                      <div className="metric-mini-tile">
                        <div className="metric-mini-label">RAG Sync</div>
                        <div className="metric-mini-value" style={{ color: '#059669' }}>99.8%</div>
                      </div>
                      <div className="metric-mini-tile">
                        <div className="metric-mini-label">Executions</div>
                        <div className="metric-mini-value">128.4K</div>
                      </div>
                    </div>

                    <div className="workflow-visual-builder">
                      <div className="builder-header">
                        <div className="builder-title">
                          <Zap size={14} color="#2563eb" />
                          Live Connected Agent Flow
                        </div>
                        <span className="builder-badge">Autonomous</span>
                      </div>

                      <div className="workflow-nodes-flow">
                        <div className={`workflow-node-box ${workflowActiveStep === 0 ? 'active' : ''}`}>
                          <div className="node-step-icon">
                            <Users size={14} />
                          </div>
                          <div className="node-step-label">User Query</div>
                          <div className="node-step-desc">Business input</div>
                        </div>

                        <div className={`workflow-node-box ${workflowActiveStep === 1 ? 'active' : ''}`}>
                          <div className="node-step-icon">
                            <Bot size={14} />
                          </div>
                          <div className="node-step-label">AI Agent</div>
                          <div className="node-step-desc">Intent parser</div>
                        </div>

                        <div className={`workflow-node-box ${workflowActiveStep === 2 ? 'active' : ''}`}>
                          <div className="node-step-icon">
                            <Database size={14} />
                          </div>
                          <div className="node-step-label">Knowledge Base</div>
                          <div className="node-step-desc">Vector RAG</div>
                        </div>

                        <div className={`workflow-node-box ${workflowActiveStep === 3 ? 'active' : ''}`}>
                          <div className="node-step-icon">
                            <Check size={14} />
                          </div>
                          <div className="node-step-label">Outcome</div>
                          <div className="node-step-desc">Action executed</div>
                        </div>
                      </div>
                    </div>

                    <div className="dashboard-execution-console">
                      <div className="console-status-text">
                        <Check size={13} color="#34d399" />
                        Automated Contract Audit Complete
                      </div>
                      <span className="console-latency-tag">84ms · DPDP Compliant</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------
            TRUST STRIP
        ------------------------------------------------------------- */}
        <section className="trust-strip-section">
          <div className="section-container">
            <div className="trust-strip-grid">
              <div className="trust-item">
                <div className="trust-icon-wrap">
                  <Globe size={20} />
                </div>
                <div>
                  <div className="trust-content-title">Built in India</div>
                  <p className="trust-content-desc">For fast-growing global businesses.</p>
                </div>
              </div>

              <div className="trust-item">
                <div className="trust-icon-wrap">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <div className="trust-content-title">Secure by Design</div>
                  <p className="trust-content-desc">Multi-tenant RLS &amp; encryption at rest.</p>
                </div>
              </div>

              <div className="trust-item">
                <div className="trust-icon-wrap">
                  <Users size={20} />
                </div>
                <div>
                  <div className="trust-content-title">Trusted by Teams</div>
                  <p className="trust-content-desc">Across modern startups and enterprises.</p>
                </div>
              </div>

              <div className="trust-item">
                <div className="trust-icon-wrap">
                  <Layers size={20} />
                </div>
                <div>
                  <div className="trust-content-title">AI + Workflows</div>
                  <p className="trust-content-desc">Agents, RAG &amp; integrations in one OS.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------
            FOUNDER STORY SECTION
        ------------------------------------------------------------- */}
        <section className="story-section" id="founder-story">
          <div className="section-container story-grid-2col">
            <div className="story-image-composition">
              <div className="story-main-img-card">
                <img
                  src="/assets/fintech-executive.jpg"
                  alt="Ashish Pratap Singh Tomar, Founder of Xarwiz Technologies"
                  className="story-portrait-img"
                  loading="lazy"
                />
              </div>

              <div className="story-floating-quote-card">
                <div className="quote-text">
                  “Our mission is to replace fragmented software sprawl with
                  connected intelligence that actually gets real work done.”
                </div>
                <div className="quote-author">
                  Ashish Pratap Singh Tomar
                  <span className="quote-author-role">· Founder &amp; Architect</span>
                </div>
              </div>
            </div>

            <div className="story-content-side">
              <div className="section-eyebrow">OUR STORY</div>
              <h2 className="section-heading-editorial">
                From Disconnected Tools
                <br />
                to Connected Intelligence
              </h2>

              <p className="story-body-copy">
                Businesses today use too many tools. Important knowledge is
                scattered across documents, applications and teams, while
                repetitive work consumes valuable time.
              </p>

              <p className="story-body-copy">
                Xarwiz is being built to bring AI agents, business knowledge,
                workflows and integrations together in one connected platform —
                helping teams work more intelligently.
              </p>

              <a href="#journey" className="editorial-text-link">
                Our Story in Detail <ArrowRight size={18} />
              </a>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------
            PLATFORM CAPABILITIES SECTION
        ------------------------------------------------------------- */}
        <section className="capabilities-section">
          <div className="section-container">
            <div className="capabilities-header-row">
              <div>
                <div className="section-eyebrow">WHAT WE ARE BUILDING</div>
                <h2 className="section-heading-editorial" style={{ margin: 0 }}>
                  One Platform. Many Possibilities.
                </h2>
              </div>
              <Link href="/neuravolt" className="editorial-text-link">
                Explore All Features <ArrowRight size={18} />
              </Link>
            </div>

            <p className="section-subcopy" style={{ marginBottom: 44, maxWidth: 820 }}>
              Xarwiz combines AI agents, knowledge management, workflow
              automation and integrations to help businesses turn everyday tasks
              into intelligent operations.
            </p>

            <div className="capabilities-grid-4col">
              {/* Card 1: AI Agents */}
              <div className="capability-card">
                <div>
                  <div className="capability-icon-container icon-accent-blue">
                    <img
                      src="/assets/about-features-icon1.svg"
                      alt="AI Agents"
                      style={{ width: 28, height: 28 }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  <h3 className="capability-title">AI Agents</h3>
                  <p className="capability-desc">
                    Create AI agents that understand your business, handle tasks
                    and support your teams.
                  </p>
                </div>
                <Link href="/agents" className="capability-cta">
                  Build AI Agents <ArrowRight size={15} />
                </Link>
              </div>

              {/* Card 2: Knowledge & RAG */}
              <div className="capability-card">
                <div>
                  <div className="capability-icon-container icon-accent-green">
                    <img
                      src="/assets/about-features-icon2.svg"
                      alt="Knowledge & RAG"
                      style={{ width: 28, height: 28 }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  <h3 className="capability-title">Knowledge &amp; RAG</h3>
                  <p className="capability-desc">
                    Connect your documents, policies and business data for
                    accurate, context-aware AI.
                  </p>
                </div>
                <Link href="/documents" className="capability-cta">
                  Learn About Knowledge <ArrowRight size={15} />
                </Link>
              </div>

              {/* Card 3: Workflow Automation */}
              <div className="capability-card">
                <div>
                  <div className="capability-icon-container icon-accent-purple">
                    <img
                      src="/assets/about-features-icon3.svg"
                      alt="Workflow Automation"
                      style={{ width: 28, height: 28 }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  <h3 className="capability-title">Workflow Automation</h3>
                  <p className="capability-desc">
                    Design and automate multi-step processes with AI, tools and
                    integrations.
                  </p>
                </div>
                <Link href="/workflows" className="capability-cta">
                  Explore Workflows <ArrowRight size={15} />
                </Link>
              </div>

              {/* Card 4: APIs & Integrations */}
              <div className="capability-card">
                <div>
                  <div className="capability-icon-container icon-accent-orange">
                    <img
                      src="/assets/about-features-icon4.svg"
                      alt="APIs & Integrations"
                      style={{ width: 28, height: 28 }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  <h3 className="capability-title">APIs &amp; Integrations</h3>
                  <p className="capability-desc">
                    Bring AI capabilities into your existing tools and business
                    systems.
                  </p>
                </div>
                <Link href="/neuravolt#solutions" className="capability-cta">
                  View Integrations <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------
            INDIA-FIRST SECTION
        ------------------------------------------------------------- */}
        <section className="india-section">
          <div className="section-container india-grid-2col">
            <div className="india-visual-side">
              <div className="india-main-img-card">
                <img
                  src="/assets/india-flag.jpg"
                  alt="Built in India with Global Ambition"
                  className="india-flag-img"
                  loading="lazy"
                />
              </div>

              <div className="india-floating-badge-card">
                <div className="india-card-eyebrow">BUILT IN INDIA</div>
                <h3 className="india-card-title">Global Ambition. Indian Roots.</h3>
                <p className="india-card-subcopy">
                  We're building from India with a global outlook, creating
                  practical AI capabilities for businesses in India and around
                  the world.
                </p>
              </div>
            </div>

            <div>
              <div className="section-eyebrow">BUILT FOR REAL BUSINESSES</div>
              <h2 className="section-heading-editorial">
                Solving Real Problems for Real Teams
              </h2>
              <p className="section-subcopy">
                Xarwiz aims to make AI and automation practical for real business
                workflows — removing manual friction so teams can focus on growth.
              </p>

              <div className="principles-list-3col">
                <div className="principle-item-card">
                  <div className="principle-title">
                    <Check size={18} color="#2563eb" />
                    India-First Perspective
                  </div>
                  <p className="principle-desc">
                    Engineered to deliver high-performance, cost-efficient AI
                    orchestration suited for fast-scaling Indian and international
                    enterprises.
                  </p>
                </div>

                <div className="principle-item-card">
                  <div className="principle-title">
                    <Check size={18} color="#2563eb" />
                    Practical AI Adoption
                  </div>
                  <p className="principle-desc">
                    Moving beyond standalone chat to actively execute multi-step
                    workflows, analyze enterprise documents, and automate repetitive tasks.
                  </p>
                </div>

                <div className="principle-item-card">
                  <div className="principle-title">
                    <Check size={18} color="#2563eb" />
                    Responsible AI
                  </div>
                  <p className="principle-desc">
                    Built with strict multi-tenant isolation, role-based access
                    controls, and statutory compliance keeping your business data secure.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------
            COMPANY JOURNEY TIMELINE
        ------------------------------------------------------------- */}
        <section className="timeline-section" id="journey">
          <div className="section-container timeline-grid-2col">
            <div>
              <div className="section-eyebrow">OUR JOURNEY</div>
              <h2 className="section-heading-editorial">
                From an Idea to a Platform for What's Next
              </h2>
              <p className="story-body-copy">
                What started as a vision to make AI more practical for
                businesses is evolving into a connected platform for agents,
                knowledge and automation.
              </p>
              <Link href="/neuravolt" className="editorial-text-link">
                Our Journey <ArrowRight size={18} />
              </Link>
            </div>

            <div className="timeline-track-desktop">
              {/* Milestone 1 */}
              <div className="timeline-milestone-node">
                <div className="milestone-dot-badge">01</div>
                <div className="milestone-card-inner">
                  <div className="milestone-title">The Beginning</div>
                  <p className="milestone-desc">
                    Identified SaaS tool sprawl and envisioned unified connected
                    intelligence for teams.
                  </p>
                </div>
              </div>

              {/* Milestone 2 */}
              <div className="timeline-milestone-node">
                <div className="milestone-dot-badge">02</div>
                <div className="milestone-card-inner">
                  <div className="milestone-title">Building Core</div>
                  <p className="milestone-desc">
                    Engineered multi-model orchestration, vector RAG search, and
                    secure multi-tenant database.
                  </p>
                </div>
              </div>

              {/* Milestone 3 */}
              <div className="timeline-milestone-node">
                <div className="milestone-dot-badge">03</div>
                <div className="milestone-card-inner">
                  <div className="milestone-title">Early Access</div>
                  <p className="milestone-desc">
                    Onboarded innovative teams to build autonomous agents and
                    automated workflows.
                  </p>
                </div>
              </div>

              {/* Milestone 4 */}
              <div className="timeline-milestone-node">
                <div className="milestone-dot-badge pulse">04</div>
                <div className="milestone-card-inner">
                  <div className="milestone-title">What's Next</div>
                  <p className="milestone-desc">
                    Expanding autonomous enterprise workflows and deeper
                    business integrations globally.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------
            TEAM SECTION
        ------------------------------------------------------------- */}
        <section className="team-section">
          <div className="section-container team-grid-2col">
            <div>
              <div className="section-eyebrow">MEET THE TEAM</div>
              <h2 className="section-heading-editorial">
                A Team That Believes in Practical AI for Real Impact
              </h2>
              <p className="story-body-copy">
                We're building practical AI experiences to help businesses
                connect knowledge, automate workflows and solve real operational
                problems.
              </p>
              <a
                href="mailto:careers@xarwiz.com"
                className="btn-secondary-hero"
                style={{ display: 'inline-flex' }}
              >
                Join Our Journey <ArrowRight size={16} />
              </a>
            </div>

            <div className="team-cards-grid">
              {/* Founder Profile */}
              <div className="team-profile-card">
                <div className="team-portrait-wrap">
                  <img
                    src="/assets/fintech-executive.jpg"
                    alt="Ashish Pratap Singh Tomar"
                    className="team-portrait-img"
                    loading="lazy"
                  />
                </div>
                <div className="team-card-details">
                  <h3 className="team-member-name">Ashish Pratap Singh Tomar</h3>
                  <div className="team-member-role">Founder &amp; Product Architect</div>
                  <p className="team-member-bio">
                    Directing product architecture, agent orchestration systems,
                    and connected intelligence foundations at Xarwiz.
                  </p>
                  <div className="team-social-row">
                    <a
                      href="https://linkedin.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-chip-link"
                    >
                      LinkedIn <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              </div>

              {/* Core Engineering Profile */}
              <div className="team-profile-card">
                <div className="team-portrait-wrap">
                  <img
                    src="/assets/user-avatar.jpg"
                    alt="Core Engineering Team"
                    className="team-portrait-img"
                    loading="lazy"
                  />
                </div>
                <div className="team-card-details">
                  <h3 className="team-member-name">AI &amp; Systems Team</h3>
                  <div className="team-member-role">Core Architecture &amp; Research</div>
                  <p className="team-member-bio">
                    Building resilient vector pipelines, low-latency workflow
                    execution engines, and enterprise security guardrails.
                  </p>
                  <div className="team-social-row">
                    <span className="social-chip-link">
                      Xarwiz Engineering
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------
            CLOSING CTA — DARK, PREMIUM FINISH
        ------------------------------------------------------------- */}
        <section className="closing-cta-section">
          <div className="closing-cta-radial-glow" aria-hidden="true" />
          <div className="section-container closing-cta-grid-2col">
            <div>
              <div className="closing-cta-eyebrow">JOIN THE NEXT CHAPTER</div>
              <h2 className="closing-cta-heading">
                Let's Build a Smarter,
                <br />
                More Productive Future — Together.
              </h2>
              <p className="closing-cta-copy">
                Be part of a platform that turns ideas into practical business
                outcomes with AI agents and automation.
              </p>
              <div className="closing-cta-buttons">
                <Link href="/signup" className="btn-cta-blue">
                  Get Early Access <ArrowRight size={18} />
                </Link>
                <Link href="/login" className="btn-cta-ghost">
                  <Play size={15} fill="currentColor" /> Contact Our Team
                </Link>
              </div>
            </div>

            {/* Visual journey: Your Ideas -> AI Agents -> Real Impact */}
            <div className="closing-journey-diagram">
              <div className="journey-step-card">
                <div className="journey-step-badge">01</div>
                <div>
                  <div className="journey-step-title">Your Ideas &amp; Goals</div>
                  <p className="journey-step-desc">
                    Connect documents, workflows, and repetitive operational tasks.
                  </p>
                </div>
              </div>

              <div className="journey-arrow-indicator">
                <ArrowRight size={20} style={{ transform: 'rotate(90deg)' }} />
              </div>

              <div className="journey-step-card" style={{ borderColor: 'rgba(37, 99, 235, 0.4)' }}>
                <div className="journey-step-badge" style={{ background: 'rgba(37, 99, 235, 0.4)' }}>
                  <Bot size={18} color="#60a5fa" />
                </div>
                <div>
                  <div className="journey-step-title">AI Agents &amp; Workflows</div>
                  <p className="journey-step-desc">
                    Autonomous reasoning, vector retrieval, and automated multi-step actions.
                  </p>
                </div>
              </div>

              <div className="journey-arrow-indicator">
                <ArrowRight size={20} style={{ transform: 'rotate(90deg)' }} />
              </div>

              <div className="journey-step-card">
                <div className="journey-step-badge" style={{ background: 'rgba(16, 185, 129, 0.25)', borderColor: 'rgba(16, 185, 129, 0.5)', color: '#34d399' }}>
                  <Check size={18} />
                </div>
                <div>
                  <div className="journey-step-title">Real Business Impact</div>
                  <p className="journey-step-desc">
                    Faster turnaround, reduced manual effort, and scaled execution.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* -------------------------------------------------------------
          FOOTER PRESERVATION — STRICTLY REUSED EXISTING GLOBAL FOOTER
      ------------------------------------------------------------- */}
      <FooterSection />
    </div>
  );
}
