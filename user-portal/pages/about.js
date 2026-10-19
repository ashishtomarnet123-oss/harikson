import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  ChevronDown,
  Sparkles,
  MessageSquare,
  BarChart3,
  Zap,
  Settings,
} from 'lucide-react';
import FooterSection from '../components/FooterSection';
import SEOHead, { defaultOrganizationSchema } from '../components/SEOHead';

export default function AboutPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCanvasTab, setActiveCanvasTab] = useState('Flow');
  const [deployStatus, setDeployStatus] = useState('idle');
  const [videoModalOpen, setVideoModalOpen] = useState(false);

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

  return (
    <div className="about-page">
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
              name: 'VoltNovate Solutions LLP',
              founder: {
                '@type': 'Person',
                name: 'Ashish Tomar',
                jobTitle: 'Founder & CEO',
              },
            },
          },
        ]}
      />

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Inter:wght@400;500;600;700;800&display=swap');

        /* ==============================================================
           CORE STYLING & VARIABLES - EXACT MATCH TO REFERENCE
        ============================================================== */
        *, *::before, *::after {
          box-sizing: border-box;
        }

        :root {
          --brand-blue: #1b68ff;
          --brand-blue-hover: #1355db;
          --brand-navy: #0b132b;
          --text-dark: #0f172a;
          --text-body: #475569;
          --text-muted: #64748b;
          --border-light: #e2e8f0;
          --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        body {
          margin: 0;
          padding: 0;
          font-family: var(--font-sans);
          color: var(--text-dark);
          background-color: #ffffff;
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
        }

        .about-page {
          min-height: 100vh;
          background: #ffffff;
          overflow-x: hidden;
        }

        /* Unified crisp container across all sections */
        .container {
          max-width: 1220px;
          margin: 0 auto;
          padding: 0 24px;
          box-sizing: border-box;
          width: 100%;
        }

        /* Hide the redundant middle CTA banner from the shared footer on this specific page */
        .about-page .final-blue-banner {
          display: none !important;
        }

        /* ==============================================================
           1. HEADER - CLEAN WHITE, REFINED NAVIGATION
        ============================================================== */
        .site-nav {
          position: sticky;
          top: 0;
          z-index: 1000;
          background: #ffffff;
          border-bottom: 1px solid #f1f5f9;
          height: 72px;
          display: flex;
          align-items: center;
        }

        .nav-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .nav-left-group {
          display: flex;
          align-items: center;
          gap: 40px;
        }

        .brand-link {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }

        .brand-logo-mark {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .brand-logo-text {
          font-size: 1.28rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #0b132b;
        }

        .nav-menu-links {
          display: flex;
          align-items: center;
          gap: 28px;
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .nav-item-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.92rem;
          font-weight: 500;
          color: #475569;
          text-decoration: none;
          padding: 6px 0;
          transition: color 0.15s ease;
          position: relative;
        }

        .nav-item-link:hover {
          color: var(--brand-blue);
        }

        .nav-item-link.active {
          color: var(--brand-blue);
          font-weight: 600;
        }

        .nav-item-link.active::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--brand-blue);
          border-radius: 2px;
        }

        .nav-right-ctas {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .btn-nav-login {
          font-size: 0.9rem;
          font-weight: 500;
          color: #111827;
          text-decoration: none;
          padding: 8px 18px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          transition: all 0.15s ease;
        }

        .btn-nav-login:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        .btn-nav-primary {
          font-size: 0.9rem;
          font-weight: 600;
          color: #ffffff !important;
          background: var(--brand-blue);
          text-decoration: none;
          padding: 9px 20px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 4px 12px rgba(27, 104, 255, 0.25);
          transition: all 0.2s ease;
        }

        .btn-nav-primary:hover {
          background: var(--brand-blue-hover);
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(27, 104, 255, 0.35);
        }

        .nav-mobile-toggle {
          display: none;
          background: #ffffff;
          border: 1px solid var(--border-light);
          color: var(--text-dark);
          border-radius: 8px;
          padding: 8px;
          cursor: pointer;
          min-width: 44px;
          min-height: 44px;
          align-items: center;
          justify-content: center;
        }

        /* Mobile Drawer */
        .mobile-drawer-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.5);
          backdrop-filter: blur(4px);
          z-index: 9999;
          display: flex;
          justify-content: flex-end;
        }

        .mobile-drawer {
          width: 82%;
          max-width: 320px;
          height: 100%;
          background: #ffffff;
          box-shadow: -8px 0 25px rgba(0, 0, 0, 0.12);
          display: flex;
          flex-direction: column;
          padding: 24px;
        }

        /* ==============================================================
           2. HERO SECTION - EXACT REFERENCE TWO-COLUMN COMPOSITION
        ============================================================== */
        .hero-section {
          padding: 60px 0 56px 0;
          background: #ffffff;
          position: relative;
        }

        .hero-grid {
          display: grid;
          grid-template-columns: 1.05fr 1fr;
          gap: 52px;
          align-items: center;
        }

        .hero-eyebrow-wrap {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 22px;
        }

        .hero-pill-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 9999px;
          background: #ffffff;
          border: 1px solid #bfdbfe;
          color: var(--brand-blue);
          font-size: 0.74rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .pill-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--brand-blue);
        }

        .hero-eyebrow-sub {
          font-size: 0.88rem;
          color: #475569;
          font-weight: 500;
        }

        .hero-h1 {
          font-size: clamp(2.35rem, 3.8vw, 3.35rem);
          font-weight: 800;
          line-height: 1.15;
          letter-spacing: -0.03em;
          color: #0b132b;
          margin: 0 0 22px 0;
        }

        .h1-line-1 {
          display: block;
        }

        .h1-line-2 {
          display: block;
          white-space: nowrap;
        }

        .text-gradient-hero {
          background: linear-gradient(135deg, #1b68ff 0%, #7c3aed 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-description {
          font-size: 1.02rem;
          line-height: 1.65;
          color: var(--text-body);
          margin: 0 0 32px 0;
          max-width: 500px;
        }

        .hero-btns-row {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }

        .btn-hero-primary {
          background: var(--brand-blue);
          color: #ffffff !important;
          font-size: 0.95rem;
          font-weight: 600;
          padding: 13px 26px;
          border-radius: 8px;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 6px 18px rgba(27, 104, 255, 0.35);
          transition: all 0.2s ease;
        }

        .btn-hero-primary:hover {
          background: var(--brand-blue-hover);
          transform: translateY(-1px);
          box-shadow: 0 8px 22px rgba(27, 104, 255, 0.45);
        }

        .btn-hero-secondary {
          background: #ffffff;
          color: #0b132b !important;
          font-size: 0.95rem;
          font-weight: 500;
          padding: 13px 22px;
          border-radius: 8px;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid var(--border-light);
          transition: all 0.15s ease;
        }

        .btn-hero-secondary:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        /* -------------------------------------------------------------
           HERO RIGHT COLUMN: AMBIENT GLOW & ANGLED DASHBOARD
        ------------------------------------------------------------- */
        .hero-visual-wrap {
          position: relative;
          padding: 34px 18px 26px 10px;
        }

        .hero-ambient-glow {
          position: absolute;
          top: 48%;
          left: 52%;
          transform: translate(-50%, -50%);
          width: 500px;
          height: 400px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.18) 0%, rgba(147, 51, 234, 0.08) 50%, transparent 72%);
          pointer-events: none;
          z-index: 0;
        }

        .hero-sketch-doodle {
          position: absolute;
          top: -20px;
          left: 80px;
          z-index: 10;
          display: flex;
          align-items: flex-end;
          gap: 8px;
        }

        .sketch-doodle-text {
          font-family: 'Caveat', cursive, sans-serif;
          font-size: 1.28rem;
          color: #1e293b;
          line-height: 1.05;
          font-weight: 700;
          transform: rotate(-3deg);
        }

        .floating-top-avatar {
          position: absolute;
          top: 14px;
          right: 20px;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 3px solid #ffffff;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.14);
          overflow: hidden;
          z-index: 10;
        }

        .floating-top-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .hero-dashboard-mockup {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          box-shadow:
            0 24px 50px -12px rgba(15, 23, 42, 0.12),
            0 0 0 1px rgba(226, 232, 240, 0.8);
          transform: perspective(1200px) rotateY(-5deg) rotateX(2.5deg);
          transform-style: preserve-3d;
          transition: transform 0.35s ease, box-shadow 0.35s ease;
          overflow: hidden;
          position: relative;
          z-index: 2;
        }

        .hero-dashboard-mockup:hover {
          transform: perspective(1200px) rotateY(0deg) rotateX(0deg) translateY(-3px);
          box-shadow:
            0 30px 60px -12px rgba(15, 23, 42, 0.16),
            0 0 0 1px rgba(226, 232, 240, 1);
        }

        .dash-topbar {
          background: #fbfcfd;
          border-bottom: 1px solid #f1f5f9;
          padding: 10px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .dash-topbar-title {
          font-size: 0.82rem;
          font-weight: 600;
          color: #334155;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .badge-active-green {
          font-size: 0.68rem;
          font-weight: 600;
          background: #ecfdf5;
          color: #059669;
          padding: 2px 8px;
          border-radius: 12px;
          border: 1px solid #a7f3d0;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .avatar-cluster {
          display: flex;
          align-items: center;
        }

        .avatar-mini {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 2px solid #ffffff;
          margin-left: -6px;
          overflow: hidden;
        }

        .avatar-mini img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .dash-layout-grid {
          display: grid;
          grid-template-columns: 110px 1fr;
          min-height: 285px;
        }

        .dash-sidebar {
          background: #fafafb;
          border-right: 1px solid #f1f5f9;
          padding: 12px 8px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .dash-brand-small {
          font-size: 0.72rem;
          font-weight: 800;
          color: #0b132b;
          padding: 2px 6px 10px 6px;
          letter-spacing: -0.02em;
        }

        .dash-nav-pill {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 5px 8px;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 500;
          color: #64748b;
        }

        .dash-nav-pill.active {
          background: var(--brand-blue);
          color: #ffffff;
          font-weight: 600;
        }

        .dash-main-canvas {
          padding: 14px 16px;
          background: #ffffff;
          position: relative;
        }

        .dash-canvas-tabs {
          display: flex;
          gap: 16px;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 8px;
          margin-bottom: 16px;
        }

        .canvas-tab {
          font-size: 0.74rem;
          font-weight: 500;
          color: #64748b;
        }

        .canvas-tab.active {
          color: var(--brand-blue);
          font-weight: 600;
          border-bottom: 2px solid var(--brand-blue);
          padding-bottom: 8px;
          margin-bottom: -9px;
        }

        .flow-diagram-container {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding-left: 6px;
          gap: 6px;
        }

        .node-pill {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 5px 10px;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.03);
          min-width: 140px;
        }

        .node-pill.trigger {
          border-left: 3px solid #1b68ff;
        }

        .node-pill.agent {
          border-left: 3px solid #7c3aed;
        }

        .node-title-bold {
          font-size: 0.7rem;
          font-weight: 700;
          color: #0b132b;
        }

        .node-subtext {
          font-size: 0.62rem;
          color: #64748b;
        }

        .flow-branch-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .branch-node {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 5px 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.03);
          min-width: 110px;
        }

        .branch-node.kb {
          border-left: 3px solid #10b981;
        }

        .branch-node.tools {
          border-left: 3px solid #ec4899;
        }

        /* Floating Deploy Card - OVERHANGING OUTSIDE BOTTOM-RIGHT (Zero overlap with Tools node) */
        .deploy-agent-card {
          position: absolute;
          bottom: 2px;
          right: -8px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px 14px;
          box-shadow: 0 14px 30px rgba(15, 23, 42, 0.14);
          width: 135px;
          z-index: 10;
        }

        .deploy-card-title {
          font-size: 0.74rem;
          font-weight: 700;
          color: #0b132b;
          margin-bottom: 6px;
        }

        .deploy-checklist {
          display: flex;
          flex-direction: column;
          gap: 3px;
          font-size: 0.66rem;
          color: #475569;
          margin-bottom: 8px;
        }

        .check-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .check-item span {
          color: #10b981;
          font-weight: bold;
        }

        .btn-deploy-blue {
          background: var(--brand-blue);
          color: #ffffff;
          font-size: 0.7rem;
          font-weight: 600;
          border: none;
          border-radius: 6px;
          padding: 6px 10px;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .btn-deploy-blue:hover {
          background: var(--brand-blue-hover);
        }

        /* ==============================================================
           3. TRUST STRIP
        ============================================================== */
        .trust-strip {
          padding: 26px 0;
          border-top: 1px solid #f1f5f9;
          border-bottom: 1px solid #f1f5f9;
          background: #ffffff;
        }

        .trust-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }

        .trust-col {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .trust-icon-box {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .box-blue {
          background: #eff6ff;
          color: var(--brand-blue);
        }

        .box-green {
          background: #ecfdf5;
          color: #059669;
        }

        .trust-title {
          font-size: 0.92rem;
          font-weight: 700;
          color: #0b132b;
          margin-bottom: 2px;
        }

        .trust-sub {
          font-size: 0.78rem;
          color: var(--text-muted);
          margin: 0;
        }

        /* ==============================================================
           4. FOUNDER STORY SECTION
        ============================================================== */
        .founder-story-sec {
          padding: 88px 0;
          background: #ffffff;
        }

        .story-2col-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 56px;
          align-items: center;
        }

        .founder-img-wrapper {
          position: relative;
          width: 100%;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
        }

        .founder-photo,
        .founder-img-wrapper :global(img) {
          width: 100%;
          height: auto;
          aspect-ratio: 4 / 3;
          object-fit: cover;
          object-position: center top;
          display: block;
        }

        .founder-quote-floating {
          position: absolute;
          top: 20px;
          right: 20px;
          background: #ffffff;
          border: 1px solid var(--border-light);
          border-radius: 14px;
          padding: 18px 20px;
          max-width: 275px;
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.12);
          z-index: 5;
        }

        .quote-icon-svg {
          margin-bottom: 8px;
          display: block;
        }

        .quote-body-text {
          font-size: 0.86rem;
          line-height: 1.5;
          color: #1e293b;
          margin-bottom: 12px;
          font-weight: 500;
        }

        .quote-author-line {
          font-size: 0.8rem;
          font-weight: 700;
          color: #0b132b;
        }

        .quote-author-title {
          font-size: 0.72rem;
          color: #64748b;
        }

        .founder-watch-floating {
          position: absolute;
          bottom: 20px;
          left: 20px;
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.9);
          border-radius: 30px;
          padding: 7px 16px 7px 8px;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12);
          z-index: 5;
        }

        .play-circle-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
        }

        .watch-text-primary {
          font-size: 0.78rem;
          font-weight: 700;
          color: #0b132b;
        }

        .watch-text-dur {
          font-size: 0.7rem;
          color: #64748b;
        }

        .sec-eyebrow-text {
          font-size: 0.76rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 12px;
        }

        .sec-h2-title {
          font-size: clamp(1.85rem, 2.5vw, 2.35rem);
          font-weight: 800;
          line-height: 1.2;
          letter-spacing: -0.025em;
          color: #0b132b;
          margin: 0 0 18px 0;
        }

        .story-paragraph {
          font-size: 0.98rem;
          line-height: 1.68;
          color: var(--text-body);
          margin: 0 0 16px 0;
        }

        .btn-outline-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--brand-blue);
          text-decoration: none;
          padding: 10px 22px;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          background: #ffffff;
          margin-top: 8px;
          transition: all 0.2s ease;
        }

        .btn-outline-pill:hover {
          background: #eff6ff;
          border-color: #93c5fd;
          gap: 12px;
        }

        /* ==============================================================
           5. PLATFORM CAPABILITIES SECTION
        ============================================================== */
        .capabilities-sec {
          padding: 88px 0;
          background: #ffffff;
          border-top: 1px solid #f1f5f9;
        }

        .capabilities-topbar {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .capabilities-subtext {
          font-size: 0.98rem;
          color: #64748b;
          max-width: 740px;
          margin: 0 0 36px 0;
          line-height: 1.6;
        }

        .capabilities-4grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        .cap-card {
          background: #ffffff;
          border: 1px solid var(--border-light);
          border-radius: 16px;
          padding: 26px 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }

        .cap-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 14px 28px -6px rgba(27, 104, 255, 0.1);
          border-color: #cbd5e1;
        }

        .cap-icon-box {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 18px;
        }

        .bg-purple { background: #f5f3ff; color: #7c3aed; }
        .bg-green { background: #ecfdf5; color: #059669; }
        .bg-blue { background: #eff6ff; color: #1b68ff; }
        .bg-orange { background: #fff7ed; color: #ea580c; }

        .cap-card-title {
          font-size: 1.08rem;
          font-weight: 700;
          color: #0b132b;
          margin: 0 0 8px 0;
        }

        .cap-card-desc {
          font-size: 0.85rem;
          color: var(--text-body);
          line-height: 1.55;
          margin: 0 0 20px 0;
          flex-grow: 1;
        }

        .cap-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.86rem;
          font-weight: 600;
          color: var(--brand-blue);
          text-decoration: none;
          transition: gap 0.15s ease;
        }

        .cap-card:hover .cap-link {
          gap: 9px;
        }

        /* ==============================================================
           6. INDIA-FIRST SECTION ("BUILT FOR REAL BUSINESSES")
           Exact 3-column horizontal alignment under the paragraph
        ============================================================== */
        .india-sec {
          padding: 88px 0;
          background: #ffffff;
          border-top: 1px solid #f1f5f9;
        }

        .india-2col-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 56px;
          align-items: center;
        }

        .india-visual-wrap {
          position: relative;
          width: 100%;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
        }

        .india-gate-photo,
        .india-visual-wrap :global(img) {
          width: 100%;
          height: auto;
          aspect-ratio: 16 / 11;
          object-fit: cover;
          display: block;
        }

        .india-badge-floating {
          position: absolute;
          bottom: 20px;
          right: 20px;
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.8);
          border-radius: 14px;
          padding: 16px 18px;
          max-width: 280px;
          box-shadow: 0 14px 30px rgba(0, 0, 0, 0.14);
          z-index: 5;
        }

        .india-badge-eyebrow {
          font-size: 0.68rem;
          font-weight: 800;
          color: #64748b;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .india-badge-title {
          font-size: 1rem;
          font-weight: 800;
          color: #0b132b;
          margin-bottom: 5px;
        }

        .india-badge-desc {
          font-size: 0.78rem;
          color: #475569;
          line-height: 1.45;
          margin: 0;
        }

        .flag-icon-corner {
          display: inline-block;
          margin-top: 6px;
          font-size: 1.15rem;
        }

        /* 3-Column horizontal feature grid matching reference */
        .india-3col-features {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-top: 28px;
        }

        .india-feat-box {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .feat-icon-head {
          color: var(--brand-blue);
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .india-feat-title {
          font-size: 0.88rem;
          font-weight: 700;
          color: #0b132b;
          margin-bottom: 4px;
          line-height: 1.3;
        }

        .india-feat-desc {
          font-size: 0.76rem;
          color: #64748b;
          line-height: 1.45;
          margin: 0;
        }

        /* ==============================================================
           7. COMPANY JOURNEY TIMELINE
        ============================================================== */
        .journey-sec {
          padding: 96px 0;
          background: #ffffff;
          border-top: 1px solid #f1f5f9;
        }

        .journey-2col-grid {
          display: grid;
          grid-template-columns: 430px 1fr;
          gap: 44px;
          align-items: center;
        }

        .btn-journey-solid {
          background: var(--brand-blue);
          color: #ffffff !important;
          font-size: 0.92rem;
          font-weight: 600;
          padding: 12px 24px;
          border-radius: 8px;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 14px rgba(27, 104, 255, 0.3);
          transition: all 0.2s ease;
        }

        .btn-journey-solid:hover {
          background: var(--brand-blue-hover);
          transform: translateY(-2px);
        }

        .timeline-track-wrap {
          position: relative;
          padding: 40px 0 10px 0;
          width: 100%;
        }

        .timeline-line-svg {
          position: absolute;
          top: 48px;
          left: 5%;
          right: 5%;
          height: 30px;
          width: 90%;
          z-index: 1;
          pointer-events: none;
        }

        .milestones-flex-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          position: relative;
          z-index: 2;
        }

        .milestone-col {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .milestone-year-dot {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 14px;
        }

        .year-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--brand-blue);
          margin-bottom: 6px;
        }

        .dot-circle {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--brand-blue);
          border: 3px solid #ffffff;
          box-shadow: 0 0 0 2px var(--brand-blue);
        }

        .dot-circle.active-ring {
          box-shadow: 0 0 0 4px rgba(27, 104, 255, 0.25);
        }

        .milestone-card-box {
          text-align: left;
        }

        .milestone-h3 {
          font-size: 0.88rem;
          font-weight: 700;
          color: #0b132b;
          margin-bottom: 4px;
        }

        .milestone-p {
          font-size: 0.75rem;
          color: #64748b;
          line-height: 1.45;
          margin: 0;
        }

        .paper-plane-svg {
          position: absolute;
          top: 0;
          right: 15px;
          width: 40px;
          height: 40px;
          filter: drop-shadow(0 6px 12px rgba(124, 58, 237, 0.25));
          z-index: 3;
        }

        /* ==============================================================
           8. TEAM SECTION - 4 REFINED PERSONA CARDS
        ============================================================== */
        .team-sec {
          padding: 96px 0;
          background: #ffffff;
          border-top: 1px solid #f1f5f9;
        }

        .team-2col-grid {
          display: grid;
          grid-template-columns: 440px 1fr;
          gap: 44px;
          align-items: center;
        }

        .team-cards-4row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }

        .team-member-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .team-member-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.08);
        }

        .member-photo-frame {
          width: 100%;
          aspect-ratio: 1 / 1;
          overflow: hidden;
          background: #e2e8f0;
        }

        .member-photo-img,
        .member-photo-frame :global(img) {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center 20%;
          display: block;
        }

        .member-info-footer {
          padding: 10px 10px 12px 10px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 6px;
          background: #f8fafc;
        }

        .member-name-text {
          font-size: 0.82rem;
          font-weight: 700;
          color: #0b132b;
          line-height: 1.2;
        }

        .member-role-text {
          font-size: 0.7rem;
          color: #64748b;
          font-weight: 500;
          margin-top: 2px;
        }

        .linkedin-badge-btn {
          width: 18px;
          height: 18px;
          background: #0077b5;
          color: #ffffff;
          border-radius: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.62rem;
          font-weight: 800;
          text-decoration: none;
          flex-shrink: 0;
        }

        /* ==============================================================
           9. CLOSING CTA - DARK NAVY FINISH WITH GLOWING CURVED EARTH
        ============================================================== */
        .closing-cta-sec {
          background: #030712;
          color: #ffffff;
          padding: 96px 0 160px 0;
          position: relative;
          overflow: hidden;
        }

        .earth-glow-backdrop {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 380px;
          background-size: cover;
          background-position: center bottom;
          pointer-events: none;
          z-index: 1;
          opacity: 0.95;
          mask-image: linear-gradient(to top, rgba(0,0,0,1) 55%, rgba(0,0,0,0) 100%);
          -webkit-mask-image: linear-gradient(to top, rgba(0,0,0,1) 55%, rgba(0,0,0,0) 100%);
        }

        .closing-grid-2col {
          display: grid;
          grid-template-columns: 1.15fr 0.95fr;
          gap: 48px;
          align-items: center;
          position: relative;
          z-index: 2;
        }

        .closing-eyebrow {
          font-size: 0.76rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #93c5fd;
          text-transform: uppercase;
          margin-bottom: 14px;
        }

        .closing-h2 {
          font-size: clamp(2rem, 3.4vw, 2.85rem);
          font-weight: 800;
          color: #ffffff;
          line-height: 1.16;
          letter-spacing: -0.025em;
          margin: 0 0 16px 0;
        }

        .closing-subcopy {
          font-size: 1rem;
          color: #94a3b8;
          line-height: 1.6;
          margin: 0 0 28px 0;
          max-width: 480px;
        }

        .closing-btns-row {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }

        .btn-cta-blue-vibrant {
          background: var(--brand-blue);
          color: #ffffff !important;
          font-size: 0.95rem;
          font-weight: 600;
          padding: 13px 24px;
          border-radius: 8px;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 18px rgba(27, 104, 255, 0.45);
          transition: all 0.2s ease;
        }

        .btn-cta-blue-vibrant:hover {
          background: var(--brand-blue-hover);
          transform: translateY(-2px);
        }

        .btn-cta-dark-trans {
          background: rgba(255, 255, 255, 0.06);
          color: #ffffff !important;
          font-size: 0.95rem;
          font-weight: 500;
          padding: 13px 22px;
          border-radius: 8px;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(8px);
          transition: all 0.2s ease;
        }

        .btn-cta-dark-trans:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.4);
        }

        /* 3 Step Floating Cards Journey */
        .journey-flow-cards {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .flow-step-box {
          background: rgba(15, 23, 42, 0.72);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 14px;
          padding: 22px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          flex: 1;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
        }

        .flow-step-icon-aura {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
        }

        .aura-yellow {
          background: rgba(245, 158, 11, 0.18);
          color: #fbbf24;
          box-shadow: 0 0 20px rgba(245, 158, 11, 0.25);
        }

        .aura-purple {
          background: rgba(124, 58, 237, 0.22);
          color: #a78bfa;
          box-shadow: 0 0 20px rgba(124, 58, 237, 0.3);
        }

        .aura-cyan {
          background: rgba(6, 182, 212, 0.22);
          color: #38bdf8;
          box-shadow: 0 0 20px rgba(6, 182, 212, 0.3);
        }

        .flow-step-name {
          font-size: 0.84rem;
          font-weight: 600;
          color: #ffffff;
        }

        .flow-dash-arrow {
          color: rgba(255, 255, 255, 0.35);
          font-size: 1.1rem;
        }

        /* ==============================================================
           RESPONSIVE BREAKPOINTS
        ============================================================== */
        @media (max-width: 1024px) {
          .nav-menu-links, .nav-right-ctas {
            display: none !important;
          }
          .nav-mobile-toggle {
            display: inline-flex !important;
          }

          .hero-grid {
            grid-template-columns: 1fr;
            gap: 48px;
          }

          .hero-dashboard-mockup {
            transform: none !important;
            max-width: 580px;
            margin: 0 auto;
          }

          .deploy-agent-card {
            right: 20px;
          }

          .trust-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
          }

          .story-2col-grid {
            grid-template-columns: 1fr;
            gap: 40px;
          }

          .founder-quote-floating {
            top: 16px;
            right: 16px;
            max-width: 260px;
          }

          .capabilities-4grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .india-2col-grid {
            grid-template-columns: 1fr;
            gap: 40px;
          }

          .journey-2col-grid {
            grid-template-columns: 1fr;
            gap: 40px;
          }

          .milestones-flex-row {
            grid-template-columns: 1fr;
            gap: 20px;
          }

          .timeline-line-svg {
            display: none;
          }

          .team-2col-grid {
            grid-template-columns: 1fr;
            gap: 40px;
          }

          .team-cards-4row {
            grid-template-columns: repeat(2, 1fr);
          }

          .closing-grid-2col {
            grid-template-columns: 1fr;
            gap: 48px;
          }
        }

        @media (max-width: 640px) {
          .h1-line-2 {
            white-space: normal;
          }

          .trust-grid {
            grid-template-columns: 1fr;
          }

          .capabilities-4grid {
            grid-template-columns: 1fr;
          }

          .india-3col-features {
            grid-template-columns: 1fr;
            gap: 20px;
          }

          .team-cards-4row {
            grid-template-columns: 1fr;
          }

          .dash-layout-grid {
            grid-template-columns: 1fr;
          }

          .dash-sidebar {
            display: none;
          }

          .deploy-agent-card {
            position: relative;
            bottom: auto;
            right: auto;
            width: 100%;
            margin-top: 12px;
          }

          .journey-flow-cards {
            flex-direction: column;
            width: 100%;
          }

          .flow-step-box {
            width: 100%;
          }
        }
      `}</style>

      {/* ==============================================================
          1. HEADER COMPONENT - EXACT REFERENCE NAVIGATION
      ============================================================== */}
      <header className="site-nav">
        <div className="container nav-inner">
          <div className="nav-left-group">
            <Link href="/" className="brand-link" aria-label="Xarwiz Home">
              <div className="brand-logo-mark">
                <svg width="30" height="28" viewBox="0 0 32 30" fill="none">
                  <path d="M4 4L14 15L4 26H9L16.5 17.5L24 26H29L19 15L29 4H24L16.5 12.5L9 4H4Z" fill="url(#brand-x-grad)" />
                  <defs>
                    <linearGradient id="brand-x-grad" x1="4" y1="4" x2="29" y2="26" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#1b68ff" />
                      <stop offset="1" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <span className="brand-logo-text">XARWIZ</span>
            </Link>

            <nav aria-label="Main Navigation">
              <ul className="nav-menu-links">
                <li>
                  <Link href="/#platform" className="nav-item-link">
                    Platform <ChevronDown size={14} color="#94a3b8" />
                  </Link>
                </li>
                <li>
                  <Link href="/#solutions" className="nav-item-link">
                    Solutions <ChevronDown size={14} color="#94a3b8" />
                  </Link>
                </li>
                <li>
                  <Link href="/documents" className="nav-item-link">
                    Resources <ChevronDown size={14} color="#94a3b8" />
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="nav-item-link">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="nav-item-link active">
                    About
                  </Link>
                </li>
              </ul>
            </nav>
          </div>

          <div className="nav-right-ctas">
            <Link href="/login" className="btn-nav-login">
              Login
            </Link>
            <Link href="/signup" className="btn-nav-primary">
              Get Early Access <ArrowRight size={15} />
            </Link>
          </div>

          <button
            className="nav-mobile-toggle"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="24" height="22" viewBox="0 0 32 30" fill="none">
                  <path d="M4 4L14 15L4 26H9L16.5 17.5L24 26H29L19 15L29 4H24L16.5 12.5L9 4H4Z" fill="#1b68ff" />
                </svg>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0b132b' }}>XARWIZ</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Link href="/#platform" onClick={() => setMobileMenuOpen(false)} style={{ color: '#0b132b', textDecoration: 'none', fontWeight: 600 }}>Platform</Link>
              <Link href="/#solutions" onClick={() => setMobileMenuOpen(false)} style={{ color: '#0b132b', textDecoration: 'none', fontWeight: 600 }}>Solutions</Link>
              <Link href="/documents" onClick={() => setMobileMenuOpen(false)} style={{ color: '#0b132b', textDecoration: 'none', fontWeight: 600 }}>Resources</Link>
              <Link href="/pricing" onClick={() => setMobileMenuOpen(false)} style={{ color: '#0b132b', textDecoration: 'none', fontWeight: 600 }}>Pricing</Link>
              <Link href="/about" onClick={() => setMobileMenuOpen(false)} style={{ color: '#1b68ff', textDecoration: 'none', fontWeight: 700 }}>About</Link>
            </div>
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="btn-nav-login" style={{ textAlign: 'center' }}>Login</Link>
              <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="btn-nav-primary" style={{ textAlign: 'center', justifyContent: 'center' }}>Get Early Access</Link>
            </div>
          </div>
        </div>
      )}

      <main>
        {/* ==============================================================
            2. HERO SECTION - EXACT REFERENCE TWO-COLUMN COMPOSITION
        ============================================================== */}
        <section className="hero-section">
          <div className="container hero-grid">
            {/* Left Column */}
            <div>
              <div className="hero-eyebrow-wrap">
                <div className="hero-pill-badge">
                  <span className="pill-dot" />
                  OUR STORY
                </div>
                <span className="hero-eyebrow-sub">
                  Built in India for a global AI future
                </span>
              </div>

              <h1 className="hero-h1">
                <span className="h1-line-1">India's AI Platform</span>
                <span className="h1-line-2">
                  for <span className="text-gradient-hero">Agents &amp; Automation</span>
                </span>
              </h1>

              <p className="hero-description">
                We're building a connected AI platform where agents, business
                knowledge and workflows work together to help businesses get
                real work done - faster, smarter and at scale.
              </p>

              <div className="hero-btns-row">
                <Link href="/" className="btn-hero-primary">
                  Explore the Platform <ArrowRight size={18} />
                </Link>
                <a href="#founder-story" className="btn-hero-secondary">
                  <Play size={13} fill="currentColor" /> Watch Our Story
                </a>
              </div>
            </div>

            {/* Right Column: Floating Angled Product Dashboard */}
            <div className="hero-visual-wrap">
              {/* Soft Ambient Radial Glow */}
              <div className="hero-ambient-glow" />

              {/* Handwritten Note Doodle */}
              <div className="hero-sketch-doodle">
                <div className="sketch-doodle-text">
                  Turn ideas into<br />AI agents that work
                </div>
                <svg width="42" height="34" viewBox="0 0 42 34" fill="none">
                  <path d="M2 4 C15 12, 28 20, 36 28" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="3 3" />
                  <path d="M27 28 L37 29 L35 19" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              {/* Floating User Avatar circle at top right */}
              <div className="floating-top-avatar">
                <Image
                  src="/assets/about/team-product.webp"
                  alt="Active team member"
                  width={38}
                  height={38}
                  priority
                />
              </div>

              {/* Angled 3D Dashboard Mockup */}
              <div className="hero-dashboard-mockup">
                <div className="dash-topbar">
                  <div className="dash-topbar-title">
                    Customer Support Agent
                    <span className="badge-active-green">
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
                      Active
                    </span>
                  </div>
                  <div className="avatar-cluster">
                    <div className="avatar-mini">
                      <Image
                        src="/assets/about/team-ashish.webp"
                        alt=""
                        width={22}
                        height={22}
                        priority
                      />
                    </div>
                    <div className="avatar-mini">
                      <Image
                        src="/assets/about/team-product.webp"
                        alt=""
                        width={22}
                        height={22}
                        priority
                      />
                    </div>
                    <div className="avatar-mini">
                      <Image
                        src="/assets/about/team-engineer.webp"
                        alt=""
                        width={22}
                        height={22}
                        priority
                      />
                    </div>
                  </div>
                </div>

                <div className="dash-layout-grid">
                  <aside className="dash-sidebar">
                    <div className="dash-brand-small">XARWIZ</div>
                    <div className="dash-nav-pill"><Users size={12} /> Home</div>
                    <div className="dash-nav-pill active"><Bot size={12} /> Agents</div>
                    <div className="dash-nav-pill"><Database size={12} /> Knowledge</div>
                    <div className="dash-nav-pill"><Workflow size={12} /> Workflows</div>
                    <div className="dash-nav-pill"><Cpu size={12} /> Integrations</div>
                    <div className="dash-nav-pill"><Zap size={12} /> Analytics</div>
                    <div className="dash-nav-pill"><Settings size={12} /> Settings</div>
                  </aside>

                  <div className="dash-main-canvas">
                    <div className="dash-canvas-tabs">
                      {['Flow', 'Configuration', 'Analytics', 'Logs'].map((tab) => (
                        <span
                          key={tab}
                          className={`canvas-tab ${activeCanvasTab === tab ? 'active' : ''}`}
                          onClick={() => setActiveCanvasTab(tab)}
                          style={{ cursor: 'pointer' }}
                        >
                          {tab}
                        </span>
                      ))}
                    </div>

                    {activeCanvasTab === 'Flow' && (
                      <div className="flow-diagram-container">
                        <div className="node-pill trigger">
                          <MessageSquare size={13} color="#1b68ff" />
                          <div>
                            <div className="node-title-bold">Trigger</div>
                            <div className="node-subtext">New customer query</div>
                          </div>
                        </div>

                        <div style={{ color: '#cbd5e1', lineHeight: 1, paddingLeft: 12 }}>↓</div>

                        <div className="node-pill agent">
                          <Bot size={14} color="#7c3aed" />
                          <div>
                            <div className="node-title-bold">AI Agent</div>
                            <div className="node-subtext">Understands &amp; Responds</div>
                          </div>
                        </div>

                        <div style={{ color: '#cbd5e1', lineHeight: 1, paddingLeft: 12 }}>↓</div>

                        <div className="flow-branch-row">
                          <div className="branch-node kb">
                            <Database size={12} color="#10b981" />
                            <div>
                              <div className="node-title-bold">Knowledge Base</div>
                              <div className="node-subtext">Search documents</div>
                            </div>
                          </div>

                          <div className="branch-node tools">
                            <Cpu size={12} color="#ec4899" />
                            <div>
                              <div className="node-title-bold">Tools</div>
                              <div className="node-subtext">Take action</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeCanvasTab === 'Configuration' && (
                      <div style={{ padding: '16px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                          <span style={{ color: '#64748b' }}>Model:</span>
                          <span style={{ fontWeight: 600 }}>Qwen 2.5 (3B / 7B)</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                          <span style={{ color: '#64748b' }}>Vector RAG:</span>
                          <span style={{ fontWeight: 600, color: '#10b981' }}>pgvector (Active)</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                          <span style={{ color: '#64748b' }}>Tenant Isolation:</span>
                          <span style={{ fontWeight: 600, color: '#1b68ff' }}>PostgreSQL RLS</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Compliance:</span>
                          <span style={{ fontWeight: 600 }}>DPDP Act 2023 Verified</span>
                        </div>
                      </div>
                    )}

                    {activeCanvasTab === 'Analytics' && (
                      <div style={{ padding: '16px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#64748b' }}>Avg. Response Latency</span>
                          <span style={{ fontWeight: 700, color: '#10b981' }}>118 ms</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#64748b' }}>Query Success Rate</span>
                          <span style={{ fontWeight: 700, color: '#1b68ff' }}>99.85%</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#64748b' }}>Daily Tokens Processed</span>
                          <span style={{ fontWeight: 700 }}>2.4M</span>
                        </div>
                      </div>
                    )}

                    {activeCanvasTab === 'Logs' && (
                      <div style={{ padding: '12px', fontSize: '0.72rem', fontFamily: 'monospace', color: '#334155', display: 'flex', flexDirection: 'column', gap: '6px', background: '#f8fafc', borderRadius: '8px' }}>
                        <div><span style={{ color: '#10b981' }}>[INFO]</span> Agent initialized in tenant scope</div>
                        <div><span style={{ color: '#1b68ff' }}>[QUERY]</span> Customer support inquiry received</div>
                        <div><span style={{ color: '#7c3aed' }}>[RAG]</span> Vector similarity match score 0.94</div>
                        <div><span style={{ color: '#10b981' }}>[SSE]</span> Response streamed in 1.4s</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Floating Deploy Agent Card */}
              <div className="deploy-agent-card">
                <div className="deploy-card-title">Deploy Agent</div>
                <div className="deploy-checklist">
                  <div className="check-item"><span>✓</span> Test</div>
                  <div className="check-item"><span>✓</span> Configure</div>
                  <div className="check-item"><span>✓</span> Deploy</div>
                </div>
                <button
                  className="btn-deploy-blue"
                  onClick={() => {
                    setDeployStatus('deploying');
                    setTimeout(() => {
                      setDeployStatus('deployed');
                      setTimeout(() => setDeployStatus('idle'), 2500);
                    }, 1000);
                  }}
                  disabled={deployStatus === 'deploying'}
                >
                  {deployStatus === 'deploying' ? 'Deploying...' : deployStatus === 'deployed' ? '✓ Deployed!' : 'Deploy →'}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ==============================================================
            3. TRUST STRIP
        ============================================================== */}
        <section className="trust-strip">
          <div className="container">
            <div className="trust-grid">
              <div className="trust-col">
                <div className="trust-icon-box box-blue">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="4" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </div>
                <div>
                  <div className="trust-title">Built in India</div>
                  <p className="trust-sub">For global businesses</p>
                </div>
              </div>

              <div className="trust-col">
                <div className="trust-icon-box box-green">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <div className="trust-title">Secure by design</div>
                  <p className="trust-sub">Your data. Your control.</p>
                </div>
              </div>

              <div className="trust-col">
                <div className="trust-icon-box box-blue">
                  <Globe size={20} />
                </div>
                <div>
                  <div className="trust-title">Trusted by teams</div>
                  <p className="trust-sub">Across industries</p>
                </div>
              </div>

              <div className="trust-col">
                <div className="trust-icon-box box-blue">
                  <Layers size={20} />
                </div>
                <div>
                  <div className="trust-title">AI + Workflows + Integrations</div>
                  <p className="trust-sub">All in one platform</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==============================================================
            4. FOUNDER STORY SECTION
        ============================================================== */}
        <section className="founder-story-sec" id="founder-story">
          <div className="container story-2col-grid">
            <div className="founder-img-wrapper">
              <Image
                src="/assets/about/founder-ashish-v2.webp"
                alt="Ashish Tomar, Founder & CEO of Xarwiz"
                width={1200}
                height={896}
                className="founder-photo"
                loading="lazy"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />

              {/* Floating Quote Card */}
              <div className="founder-quote-floating">
                <svg className="quote-icon-svg" width="22" height="16" viewBox="0 0 24 18" fill="none">
                  <path d="M0 18V11.2C0 4.6 3.6 1.2 9.2 0L10.6 2.6C7.2 3.4 5.2 5.4 4.8 8.4H10V18H0ZM13.4 18V11.2C13.4 4.6 17 1.2 22.6 0L24 2.6C20.6 3.4 18.6 5.4 18.2 8.4H23.4V18H13.4Z" fill="#ef4444" />
                </svg>
                <div className="quote-body-text">
                  “We started Xarwiz to make AI useful in the places where real business work happens.”
                </div>
                <div className="quote-author-line">- Ashish Tomar</div>
                <div className="quote-author-title">Founder &amp; CEO, Xarwiz</div>
              </div>

              {/* Floating Play Button */}
              <div
                className="founder-watch-floating"
                onClick={() => setVideoModalOpen(true)}
                style={{ cursor: 'pointer' }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') setVideoModalOpen(true); }}
              >
                <div className="play-circle-btn">
                  <Play size={12} fill="#0b132b" />
                </div>
                <div>
                  <div className="watch-text-primary">Watch Founder's Message</div>
                  <div className="watch-text-dur">2:36</div>
                </div>
              </div>
            </div>

            <div>
              <div className="sec-eyebrow-text">OUR STORY</div>
              <h2 className="sec-h2-title">
                <span style={{ display: 'block' }}>From Disconnected Tools</span>
                <span style={{ display: 'block' }}>to Connected Intelligence</span>
              </h2>

              <p className="story-paragraph">
                Businesses today use too many tools. Important knowledge is
                scattered across documents, apps and people. Teams spend hours on
                repetitive work that AI should be able to handle.
              </p>

              <p className="story-paragraph">
                We started Xarwiz to bring everything together - AI agents,
                business knowledge, workflows and integrations - in one platform
                that helps teams work more intelligently.
              </p>

              <a href="#journey" className="btn-outline-pill">
                Our Story in Detail <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </section>

        {/* ==============================================================
            5. PLATFORM CAPABILITIES SECTION
        ============================================================== */}
        <section className="capabilities-sec">
          <div className="container">
            <div className="capabilities-topbar">
              <div>
                <div className="sec-eyebrow-text">WHAT WE ARE BUILDING</div>
                <h2 className="sec-h2-title" style={{ margin: 0 }}>
                  One Platform. Many Possibilities.
                </h2>
              </div>
              <Link href="/#features" className="btn-outline-pill" style={{ margin: 0 }}>
                Explore All Features <ArrowRight size={16} />
              </Link>
            </div>

            <p className="capabilities-subtext">
              Xarwiz combines AI agents, knowledge management, workflow
              automation and integrations to help businesses turn everyday tasks
              into intelligent operations.
            </p>

            <div className="capabilities-4grid">
              {/* Card 1 */}
              <div className="cap-card">
                <div>
                  <div className="cap-icon-box bg-purple">
                    <Bot size={22} />
                  </div>
                  <h3 className="cap-card-title">AI Agents</h3>
                  <p className="cap-card-desc">
                    Create AI agents that understand your business, handle tasks
                    and support your teams.
                  </p>
                </div>
                <Link href="/agents" className="cap-link">
                  Build AI Agents <ArrowRight size={14} />
                </Link>
              </div>

              {/* Card 2 */}
              <div className="cap-card">
                <div>
                  <div className="cap-icon-box bg-green">
                    <Database size={22} />
                  </div>
                  <h3 className="cap-card-title">Knowledge &amp; RAG</h3>
                  <p className="cap-card-desc">
                    Connect your documents, policies and business data for
                    accurate, context-aware AI.
                  </p>
                </div>
                <Link href="/documents" className="cap-link">
                  Learn About Knowledge <ArrowRight size={14} />
                </Link>
              </div>

              {/* Card 3 */}
              <div className="cap-card">
                <div>
                  <div className="cap-icon-box bg-blue">
                    <Workflow size={22} />
                  </div>
                  <h3 className="cap-card-title">Workflow Automation</h3>
                  <p className="cap-card-desc">
                    Design and automate multi-step processes with AI, tools and
                    integrations.
                  </p>
                </div>
                <Link href="/workflows" className="cap-link">
                  Explore Workflows <ArrowRight size={14} />
                </Link>
              </div>

              {/* Card 4 */}
              <div className="cap-card">
                <div>
                  <div className="cap-icon-box bg-orange">
                    <Cpu size={22} />
                  </div>
                  <h3 className="cap-card-title">APIs &amp; Integrations</h3>
                  <p className="cap-card-desc">
                    Bring AI capabilities into your existing tools and business
                    systems.
                  </p>
                </div>
                <Link href="/#solutions" className="cap-link">
                  View Integrations <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ==============================================================
            6. INDIA-FIRST SECTION ("BUILT FOR REAL BUSINESSES")
            3-Column horizontal feature grid matching reference
        ============================================================== */}
        <section className="india-sec">
          <div className="container india-2col-grid">
            <div className="india-visual-wrap">
              <Image
                src="/assets/about/india-gate.webp"
                alt="India Gate at golden hour"
                width={1200}
                height={896}
                className="india-gate-photo"
                loading="lazy"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />

              <div className="india-badge-floating">
                <div className="india-badge-eyebrow">BUILT IN INDIA</div>
                <div className="india-badge-title">Global Ambition, Indian Roots.</div>
                <p className="india-badge-desc">
                  We're a proudly Indian company building for businesses in India
                  and around the world.
                </p>
                <div className="flag-icon-corner" aria-label="Indian Flag">🇮🇳</div>
              </div>
            </div>

            <div>
              <div className="sec-eyebrow-text">BUILT FOR REAL BUSINESSES</div>
              <h2 className="sec-h2-title">
                Solving Real Problems for Real Teams
              </h2>

              <p className="story-paragraph">
                We understand the unique needs of Indian businesses - from
                diverse languages and workflows to the way teams actually work.
                Our goal is to make advanced AI and automation accessible,
                practical and valuable for every organization.
              </p>

              {/* 3-Column horizontal feature layout */}
              <div className="india-3col-features">
                <div className="india-feat-box">
                  <div className="feat-icon-head">
                    <Sparkles size={22} />
                  </div>
                  <div className="india-feat-title">India-First Perspective</div>
                  <p className="india-feat-desc">Local needs, global standards</p>
                </div>

                <div className="india-feat-box">
                  <div className="feat-icon-head">
                    <MessageSquare size={22} />
                  </div>
                  <div className="india-feat-title">Multilingual Support</div>
                  <p className="india-feat-desc">Work in your language</p>
                </div>

                <div className="india-feat-box">
                  <div className="feat-icon-head">
                    <ShieldCheck size={22} />
                  </div>
                  <div className="india-feat-title">Responsible AI</div>
                  <p className="india-feat-desc">Privacy and security by design</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==============================================================
            7. COMPANY JOURNEY TIMELINE
        ============================================================== */}
        <section className="journey-sec" id="journey">
          <div className="container journey-2col-grid">
            <div>
              <div className="sec-eyebrow-text">OUR JOURNEY</div>
              <h2 className="sec-h2-title">
                <span style={{ display: 'block' }}>From an idea to a platform</span>
                <span style={{ display: 'block' }}>for what's next</span>
              </h2>

              <p className="story-paragraph">
                What started as a vision to make AI more practical for
                businesses is now evolving into a comprehensive platform for
                agents, knowledge and automation.
              </p>

              <div style={{ marginTop: '24px' }}>
                <a href="#journey" className="btn-journey-solid">
                  Our Journey <ArrowRight size={16} />
                </a>
              </div>
            </div>

            <div className="timeline-track-wrap">
              {/* Paper Plane Origami at top right of 2026+ */}
              <div className="paper-plane-svg">
                <svg width="40" height="40" viewBox="0 0 44 44" fill="none">
                  <path d="M4 22L40 4L24 40L18 26L4 22Z" fill="url(#plane-grad)" />
                  <path d="M18 26L40 4" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.5" />
                  <defs>
                    <linearGradient id="plane-grad" x1="4" y1="4" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#a78bfa" />
                      <stop offset="1" stopColor="#6366f1" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              {/* Connecting curved line */}
              <svg className="timeline-line-svg" viewBox="0 0 500 40" fill="none">
                <path d="M10 20 L380 20 C420 20, 440 10, 480 4" stroke="#bfdbfe" strokeWidth="2" strokeDasharray="4 4" />
              </svg>

              <div className="milestones-flex-row">
                {/* 2023 */}
                <div className="milestone-col">
                  <div className="milestone-year-dot">
                    <span className="year-label">2023</span>
                    <span className="dot-circle" />
                  </div>
                  <div className="milestone-card-box">
                    <div className="milestone-h3">The Beginning</div>
                    <p className="milestone-p">Vision, research and early development.</p>
                  </div>
                </div>

                {/* 2024 */}
                <div className="milestone-col">
                  <div className="milestone-year-dot">
                    <span className="year-label">2024</span>
                    <span className="dot-circle" />
                  </div>
                  <div className="milestone-card-box">
                    <div className="milestone-h3">Building the Core</div>
                    <p className="milestone-p">Platform, AI agents and key integrations.</p>
                  </div>
                </div>

                {/* 2025 */}
                <div className="milestone-col">
                  <div className="milestone-year-dot">
                    <span className="year-label">2025</span>
                    <span className="dot-circle" />
                  </div>
                  <div className="milestone-card-box">
                    <div className="milestone-h3">Early Access</div>
                    <p className="milestone-p">Pilot customers and real-world use cases.</p>
                  </div>
                </div>

                {/* 2026+ */}
                <div className="milestone-col">
                  <div className="milestone-year-dot">
                    <span className="year-label">2026+</span>
                    <span className="dot-circle active-ring" />
                  </div>
                  <div className="milestone-card-box">
                    <div className="milestone-h3">Scaling Impact</div>
                    <p className="milestone-p">Growing with businesses across India and globally.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==============================================================
            8. TEAM SECTION - 4 REFINED PERSONA CARDS
        ============================================================== */}
        <section className="team-sec">
          <div className="container team-2col-grid">
            <div>
              <div className="sec-eyebrow-text">MEET THE TEAM</div>
              <h2 className="sec-h2-title">
                <span style={{ display: 'block' }}>A Team That Believes in</span>
                <span style={{ display: 'block' }}>Practical AI for Real Impact</span>
              </h2>

              <p className="story-paragraph">
                We are a team of builders, engineers and business professionals
                passionate about using AI to solve real-world problems. Our focus
                is on creating practical, reliable and scalable solutions that
                help businesses grow.
              </p>

              <div style={{ marginTop: '24px' }}>
                <a href="mailto:careers@xarwiz.com" className="btn-journey-solid">
                  Join Our Journey <ArrowRight size={16} />
                </a>
              </div>
            </div>

            <div className="team-cards-4row">
              {/* Member 1: Ashish Tomar */}
              <div className="team-member-card">
                <div className="member-photo-frame">
                  <Image
                    src="/assets/about/team-ashish.webp"
                    alt="Ashish Tomar"
                    width={1024}
                    height={1024}
                    className="member-photo-img"
                    loading="lazy"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                </div>
                <div className="member-info-footer">
                  <div>
                    <div className="member-name-text">Ashish Tomar</div>
                    <div className="member-role-text">Founder &amp; CEO</div>
                  </div>
                  <a
                    href="https://linkedin.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="linkedin-badge-btn"
                    aria-label="Ashish Tomar LinkedIn"
                  >
                    in
                  </a>
                </div>
              </div>

              {/* Member 2: Product & Design */}
              <div className="team-member-card">
                <div className="member-photo-frame">
                  <Image
                    src="/assets/about/team-product.webp"
                    alt="Product & Design Lead"
                    width={1024}
                    height={1024}
                    className="member-photo-img"
                    loading="lazy"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                </div>
                <div className="member-info-footer">
                  <div>
                    <div className="member-name-text" style={{ fontSize: '0.8rem' }}>
                      Product &amp; Design
                    </div>
                  </div>
                  <a
                    href="https://linkedin.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="linkedin-badge-btn"
                    aria-label="Product & Design LinkedIn"
                  >
                    in
                  </a>
                </div>
              </div>

              {/* Member 3: Engineering */}
              <div className="team-member-card">
                <div className="member-photo-frame">
                  <Image
                    src="/assets/about/team-engineer.webp"
                    alt="Engineering Lead"
                    width={1024}
                    height={1024}
                    className="member-photo-img"
                    loading="lazy"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                </div>
                <div className="member-info-footer">
                  <div>
                    <div className="member-name-text" style={{ fontSize: '0.8rem' }}>
                      Engineering
                    </div>
                  </div>
                  <a
                    href="https://linkedin.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="linkedin-badge-btn"
                    aria-label="Engineering LinkedIn"
                  >
                    in
                  </a>
                </div>
              </div>

              {/* Member 4: Operations */}
              <div className="team-member-card">
                <div className="member-photo-frame">
                  <Image
                    src="/assets/about/team-operations.webp"
                    alt="Operations Lead"
                    width={1024}
                    height={1024}
                    className="member-photo-img"
                    loading="lazy"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                </div>
                <div className="member-info-footer">
                  <div>
                    <div className="member-name-text" style={{ fontSize: '0.8rem' }}>
                      Operations
                    </div>
                  </div>
                  <a
                    href="https://linkedin.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="linkedin-badge-btn"
                    aria-label="Operations LinkedIn"
                  >
                    in
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==============================================================
            9. CLOSING CTA - DARK NAVY FINISH WITH GLOWING CURVED EARTH
        ============================================================== */}
        <section className="closing-cta-sec">
          {/* Luminous Curved Earth Atmospheric Limb */}
          <div
            className="earth-glow-backdrop"
            style={{
              backgroundImage: 'url(/assets/about/earth-glow.webp)',
            }}
          />

          <div className="container closing-grid-2col">
            <div>
              <div className="closing-eyebrow">JOIN THE NEXT CHAPTER</div>
              <h2 className="closing-h2">
                <span style={{ display: 'block' }}>Let's Build a Smarter,</span>
                <span style={{ display: 'block' }}>More Productive Future - Together.</span>
              </h2>
              <p className="closing-subcopy">
                Be part of a platform that turns ideas into real impact with AI
                agents and automation.
              </p>
              <div className="closing-btns-row">
                <Link href="/signup" className="btn-cta-blue-vibrant">
                  Get Early Access <ArrowRight size={17} />
                </Link>
                <Link href="/login" className="btn-cta-dark-trans">
                  <Play size={13} fill="currentColor" /> Contact Our Team
                </Link>
              </div>
            </div>

            {/* Visual 3-Step Floating Cards: Your Ideas -> AI Agents -> Real Impact */}
            <div className="journey-flow-cards">
              <div className="flow-step-box">
                <div className="flow-step-icon-aura aura-yellow">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18h6" />
                    <path d="M10 22h4" />
                    <path d="M12 2a7 7 0 0 0-7 7c0 2.5 1.5 4.5 3 6h8c1.5-1.5 3-3.5 3-6a7 7 0 0 0-7-7z" />
                  </svg>
                </div>
                <div className="flow-step-name">Your Ideas</div>
              </div>

              <div className="flow-dash-arrow">→</div>

              <div className="flow-step-box">
                <div className="flow-step-icon-aura aura-purple">
                  <Zap size={22} />
                </div>
                <div className="flow-step-name">AI Agents</div>
              </div>

              <div className="flow-dash-arrow">→</div>

              <div className="flow-step-box">
                <div className="flow-step-icon-aura aura-cyan">
                  <BarChart3 size={22} />
                </div>
                <div className="flow-step-name">Real Impact</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Video Modal */}
      {videoModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setVideoModalOpen(false)}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '720px',
              backgroundColor: '#0b132b',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '1rem' }}>Founder's Message - Ashish Tomar</div>
              <button
                onClick={() => setVideoModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                aria-label="Close video"
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '30px', textAlign: 'center', color: '#e2e8f0' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #1b68ff, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Play size={36} fill="#ffffff" color="#ffffff" style={{ marginLeft: '4px' }} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '10px', color: '#ffffff' }}>Empowering Indian Enterprises with Autonomous AI</h3>
              <p style={{ fontSize: '0.9rem', color: '#94a3b8', maxWidth: '480px', margin: '0 auto 20px', lineHeight: 1.6 }}>
                &ldquo;We built Xarwiz to bridge the gap between fragmented software tools and sovereign, reliable AI workflows tailored for high-growth businesses.&rdquo;
              </p>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Length: 2 min 36 sec • Sovereign Cloud AI Overview</div>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          10. FOOTER PRESERVATION - STRICTLY REUSED SITE FOOTER
      ============================================================== */}
      <FooterSection />
    </div>
  );
}
