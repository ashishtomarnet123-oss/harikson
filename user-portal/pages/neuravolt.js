import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  Shield, Zap, ChevronDown, ShieldCheck, DownloadCloud, FileText, Receipt,
  Search, MessageSquare, ThumbsUp, ThumbsDown, Copy, Sparkles, Terminal,
  Package, Webhook, Share2, Lock, Leaf, ShieldAlert, CheckCircle2,
  Clock, LayoutDashboard, Bot, Database, GitBranch, BarChart2, Key, Blocks,
  Settings, RotateCw, Bell, MapPin, Target, Cpu, Sliders, CheckCircle, Send, Plus, Minus, X, Layers
} from 'lucide-react';

export default function NeuravoltLandingPage() {
  // Billing Toggle State
  const [billingPeriod, setBillingPeriod] = useState('monthly'); // 'monthly' | 'yearly'

  // Interactive Demo Tab State
  const [activeDemoTab, setActiveDemoTab] = useState('contract');

  // Demo Tab Data dictionary
  const demoTabData = {
    contract: {
      docName: 'Service_Agreement.pdf',
      docMeta: 'PDF • 2.4 MB • 12 pages',
      userPrompt: 'Summarize this contract',
      responseTitle: 'Here is a summary of the contract:',
      bullets: [
        'Agreement between ABC Corp and XYZ Pvt. Ltd.',
        'Duration: 12 months from 1 May 2024',
        'Scope: Supply of software licenses',
        'Payment Terms: 30 days from invoice date',
        'Termination: 30 days written notice'
      ]
    },
    invoice: {
      docName: 'Invoice_INV_2024_089.pdf',
      docMeta: 'PDF • 450 KB • 1 page',
      userPrompt: 'Generate invoice summary',
      responseTitle: 'Invoice Summary Generated:',
      bullets: [
        'Invoice ID: #INV-2024-089',
        'Total Amount: ₹48,500 + 18% GST (₹57,230)',
        'Vendor: Xarwiz Technologies Pvt. Ltd.',
        'Due Date: 15 June 2024 (Auto-scheduled)'
      ]
    },
    policy: {
      docName: 'HR_Leave_&_IT_Policy_2025.docx',
      docMeta: 'DOCX • 850 KB • 8 pages',
      userPrompt: 'Search company policy',
      responseTitle: 'Company Policy Search Results:',
      bullets: [
        'Maternity & Paternity Leave: 26 weeks paid maternity leave.',
        'Data Security: ISO 27001 compliant laptop encryption policy.'
      ]
    },
    customer: {
      docName: 'WhatsApp_Support_Log_#4029',
      docMeta: 'LOG • 140 KB • Live Stream',
      userPrompt: 'Answer customer query',
      responseTitle: 'AI Customer Support Agent Response:',
      bullets: [
        'Automated Resolution: Sent tax invoice link via WhatsApp.',
        'Satisfaction Score: 5/5'
      ]
    }
  };

  const [guestPromptsUsed, setGuestPromptsUsed] = useState(0);
  const [guestInputText, setGuestInputText] = useState('');
  const [guestOutput, setGuestOutput] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const count = parseInt(localStorage.getItem('hk_guest_prompt_count') || '0', 10);
      setGuestPromptsUsed(count);
    }
  }, []);

  const handleRunGuestPrompt = (customText) => {
    if (guestPromptsUsed >= 1) {
      router.push('/signup');
      return;
    }
    const textToRun = customText || guestInputText.trim() || currentDemo.userPrompt;
    setGuestOutput({
      userPrompt: textToRun,
      responseTitle: `AI Agent Output for "${textToRun}":`,
      bullets: [
        `Executed prompt via Xarwiz Sovereign AI Orchestration Node in 114ms.`,
        `Vector Boundary: Verified isolated PostgreSQL tenant boundary.`,
        `Compliance Status: DPDP Act 2023 check PASSED.`
      ]
    });
    const nextCount = guestPromptsUsed + 1;
    setGuestPromptsUsed(nextCount);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hk_guest_prompt_count', nextCount.toString());
    }
  };

  const currentDemo = demoTabData[activeDemoTab];

  return (
    <div style={{ backgroundColor: '#FFFFFF', color: '#0F172A', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      <Head>
        <title>India's All-in-One AI Platform for Agents &amp; Automation</title>
        <meta name="description" content="India's all-in-one AI platform to build AI agents, automate workflows, chat with leading AI models, create RAG knowledge bases, and accelerate development with agentic coding." />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      {/* Embedded Xarwiz Design System CSS */}
      <style jsx global>{`
        :root {
          --bg-main: #FFFFFF;
          --bg-subtle: #FAFAFC;
          --border-color: #E2E8F0;
          --border-dark: #CBD5E1;
          --primary-blue: #2563EB;
          --primary-blue-hover: #1D4ED8;
          --text-dark: #0F172A;
          --text-muted: #475569;
          --text-dim: #64748B;
          --font-heading: 'Outfit', sans-serif;
          --font-body: 'Inter', sans-serif;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background-color: #FFFFFF; color: #0F172A; font-family: var(--font-body); -webkit-font-smoothing: antialiased; }

        .container { max-width: 1360px; margin: 0 auto; padding: 0 24px; }

        /* HEADER */
        .header { position: sticky; top: 0; z-index: 100; background: #FFFFFF; border-bottom: 1px solid var(--border-color); padding: 14px 0; }
        .header-inner { display: flex; align-items: center; justify-content: space-between; }
        .logo-container { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .logo-icon { width: 32px; height: 32px; background: #2563EB; border-radius: 8px; color: #fff; font-weight: 800; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; }
        .logo-text { font-family: var(--font-heading); font-size: 1.25rem; font-weight: 800; letter-spacing: 0.03em; color: #0F172A; }
        .logo-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 20px; background: #EFF6FF; border: 1px solid #BFDBFE; font-size: 0.72rem; font-weight: 600; color: #2563EB; }
        .nav-menu { display: flex; align-items: center; gap: 28px; list-style: none; }
        .nav-menu a { text-decoration: none; font-size: 0.92rem; font-weight: 500; color: var(--text-muted); display: flex; align-items: center; gap: 4px; transition: color 0.2s; }
        .nav-menu a:hover { color: #2563EB; }
        .header-ctas { display: flex; align-items: center; gap: 12px; }
        .btn-demo { background: #FFFFFF; border: 1px solid var(--border-color); padding: 10px 20px; border-radius: 10px; font-size: 0.9rem; font-weight: 600; color: #0F172A; text-decoration: none; box-shadow: 0 1px 2px rgba(0,0,0,0.04); transition: all 0.2s; }
        .btn-demo:hover { background: #F8FAFC; border-color: #CBD5E1; }
        .btn-trial { background: #2563EB; border: none; padding: 10px 20px; border-radius: 10px; font-size: 0.9rem; font-weight: 600; color: #FFFFFF; text-decoration: none; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); transition: all 0.2s; }
        .btn-trial:hover { background: #1D4ED8; box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4); }

        /* HERO SECTION */
        .hero-section { padding: 40px 0 40px 0; background: #FFFFFF; }
        .hero-grid { display: grid; grid-template-columns: 0.9fr 1.45fr; gap: 28px; align-items: center; }
        .hero-left { display: flex; flex-direction: column; align-items: flex-start; }
        .dpdp-pill { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 30px; background: #EFF6FF; border: 1px solid #DBEAFE; font-size: 0.82rem; font-weight: 600; color: #2563EB; margin-bottom: 20px; }
        .dpdp-icon-dot { width: 16px; height: 16px; background: #2563EB; border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; }
        .hero-title { font-family: var(--font-heading); font-size: 3.1rem; line-height: 1.12; font-weight: 800; color: #0F172A; margin-bottom: 16px; letter-spacing: -0.02em; }
        .hero-title .blue-text { color: #2563EB; }
        .hero-subtitle { font-size: 0.98rem; color: var(--text-muted); line-height: 1.55; margin-bottom: 22px; max-width: 440px; }
        .hero-checks { display: flex; align-items: center; gap: 16px; margin-bottom: 26px; }
        .check-item { display: flex; align-items: center; gap: 6px; font-size: 0.82rem; font-weight: 700; color: #0F172A; }
        .check-circle { width: 18px; height: 18px; border-radius: 50%; border: 1.5px solid #22C55E; color: #22C55E; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 800; }
        .hero-buttons-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; width: 100%; max-width: 420px; }
        .btn-hero-primary { background: #2563EB; color: #FFFFFF; border: none; padding: 13px 24px; border-radius: 12px; font-size: 0.92rem; font-weight: 700; text-decoration: none; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35); transition: all 0.2s; flex: 1; text-align: center; display: inline-flex; align-items: center; justify-content: center; }
        .btn-hero-secondary { background: #FFFFFF; color: #0F172A; border: 1px solid var(--border-color); padding: 13px 24px; border-radius: 12px; font-size: 0.92rem; font-weight: 700; text-decoration: none; transition: all 0.2s; flex: 1; text-align: center; display: inline-flex; align-items: center; justify-content: center; }
        .microcopy-row { display: flex; align-items: center; justify-content: space-between; width: 100%; max-width: 420px; font-size: 0.75rem; color: var(--text-dim); padding: 0 4px; }

        /* DASHBOARD MOCKUP */
        .dashboard-card { background: #FFFFFF; border: 1px solid var(--border-color); border-radius: 16px; box-shadow: 0 15px 35px -10px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.02); overflow: hidden; width: 100%; }
        .dash-grid { display: grid; grid-template-columns: 155px 1fr; }
        .dash-sidebar { background: #F8FAFC; border-right: 1px solid var(--border-color); padding: 14px 8px; display: flex; flex-direction: column; gap: 2px; }
        .sidebar-logo { display: flex; align-items: center; gap: 6px; padding-bottom: 12px; margin-bottom: 8px; border-bottom: 1px solid var(--border-color); font-weight: 800; font-size: 0.85rem; color: #0F172A; }
        .nav-item { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 8px; font-size: 0.72rem; font-weight: 500; color: var(--text-muted); }
        .nav-item.active { background: #EFF6FF; color: #2563EB; font-weight: 700; }
        .dash-main { padding: 16px 18px; background: #FFFFFF; }
        .dash-header-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .dash-user-info { display: flex; align-items: center; gap: 8px; font-size: 0.76rem; color: var(--text-muted); }
        .avatar-img { width: 22px; height: 22px; border-radius: 50%; object-fit: cover; }
        .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px; }
        .stat-box { background: #FFFFFF; border: 1px solid var(--border-color); border-radius: 10px; padding: 8px 10px; }
        .stat-label { font-size: 0.65rem; color: var(--text-dim); margin-bottom: 3px; white-space: nowrap; }
        .stat-val-row { display: flex; align-items: center; justify-content: space-between; gap: 4px; }
        .stat-num { font-size: 1.15rem; font-weight: 800; color: #0F172A; line-height: 1; white-space: nowrap; }
        .stat-green { font-size: 0.64rem; font-weight: 700; color: #16A34A; white-space: nowrap; }
        .stat-subtext { font-size: 0.6rem; color: var(--text-dim); margin-top: 3px; white-space: nowrap; }
        .main-split { display: grid; grid-template-columns: 1.1fr 1fr; gap: 14px; align-items: stretch; }
        .builder-box { border: 1px solid var(--border-color); border-radius: 12px; padding: 14px; background: #FFFFFF; display: flex; flex-direction: column; justify-content: space-between; }
        .builder-title { font-size: 0.78rem; font-weight: 700; color: #1E293B; margin-bottom: 16px; display: flex; align-items: center; gap: 6px; }
        .diagram-flow-exact { display: flex; align-items: center; justify-content: space-between; gap: 4px; margin-bottom: 16px; }
        .diagram-node-card { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 8px 6px; border-radius: 10px; width: 66px; height: 68px; text-align: center; flex-shrink: 0; }
        .diagram-node-card.blue-node { background: #EFF6FF; border: 1px solid #BFDBFE; }
        .diagram-node-card.green-node { background: #F0FDF4; border: 1px solid #86EFAC; }
        .diagram-node-card.purple-node { background: #F5F3FF; border: 1px solid #DDD6FE; }
        .diagram-node-card.white-node { background: #FFFFFF; border: 1px solid var(--border-color); }
        .node-label-text { font-size: 0.58rem; font-weight: 700; margin-top: 4px; line-height: 1.1; }
        .connector-arrow { font-size: 0.7rem; color: var(--text-dim); font-weight: 800; }
        .branch-split-col { display: flex; flex-direction: column; gap: 4px; justify-content: center; }

        .builder-metrics-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 8px 10px; font-size: 0.68rem; }
        .metrics-box-title { font-size: 0.68rem; font-weight: 700; color: #0F172A; margin-bottom: 6px; display: flex; justify-content: space-between; }
        .activity-row { display: flex; align-items: center; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #EDF2F7; font-size: 0.62rem; }
        .activity-row:last-child { border-bottom: none; }
        .act-name { font-weight: 600; color: #1E293B; }
        .act-badge { background: #DCFCE7; color: #166534; font-size: 0.55rem; font-weight: 700; padding: 1px 4px; border-radius: 4px; }
        .act-meta { color: var(--text-dim); }

        .preview-box { border: 1px solid var(--border-color); border-radius: 12px; padding: 14px; background: #FAFAFC; display: flex; flex-direction: column; justify-content: space-between; }
        .preview-title { font-size: 0.78rem; font-weight: 700; color: #1E293B; margin-bottom: 12px; }
        .chat-bubble-sys { background: #EFF6FF; color: #1E40AF; padding: 8px 10px; border-radius: 8px; font-size: 0.72rem; line-height: 1.4; margin-bottom: 8px; border: 1px solid #DBEAFE; }
        .chat-bubble-user { background: #2563EB; color: #fff; padding: 8px 10px; border-radius: 8px; font-size: 0.72rem; line-height: 1.4; margin-bottom: 8px; margin-left: auto; max-width: 80%; }
        .chat-card-ai { background: #fff; border: 1px solid var(--border-color); border-radius: 8px; padding: 8px 10px; font-size: 0.7rem; margin-bottom: 8px; }
        .chat-input-bar { display: flex; gap: 6px; margin-top: auto; }
        .chat-input-field { flex: 1; border: 1px solid var(--border-color); border-radius: 8px; padding: 6px 10px; font-size: 0.7rem; background: #fff; }
        .send-sq-btn { width: 28px; height: 28px; background: #2563EB; color: #fff; border: none; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer; }

        /* TRUST STRIP */
        .trust-strip { padding: 20px 0 40px 0; }
        .trust-outer-card { background: #FAFAFC; border: 1px solid var(--border-color); border-radius: 16px; padding: 24px; text-align: center; }
        .trust-title { font-size: 0.85rem; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 20px; }

        /* DEMO & BENTO SECTION */
        .demo-section { padding: 40px 0; }
        .demo-card-outer { background: #FFFFFF; border: 1px solid var(--border-color); border-radius: 24px; padding: 36px; box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.03); }
        .demo-header { margin-bottom: 28px; }
        .demo-title-row { display: flex; align-items: center; gap: 8px; font-family: var(--font-heading); font-size: 1.8rem; font-weight: 800; color: #0F172A; }
        .sparkles-icon { color: #2563EB; width: 22px; height: 22px; }
        .demo-subtitle { font-size: 0.95rem; color: var(--text-muted); margin-top: 4px; }
        .demo-grid-layout { display: grid; grid-template-columns: 300px 1fr; gap: 28px; }
        .demo-tabs-flex { display: flex; flex-direction: column; gap: 10px; }
        .demo-tab-btn { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 12px; border: 1px solid var(--border-color); background: #FFFFFF; font-size: 0.88rem; font-weight: 600; color: #0F172A; cursor: pointer; text-align: left; transition: all 0.2s; }
        .demo-tab-btn.active { background: #EFF6FF; border-color: #2563EB; color: #2563EB; font-weight: 700; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1); }
        .tab-icon-box { width: 28px; height: 28px; border-radius: 8px; background: #F1F5F9; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .demo-tab-btn.active .tab-icon-box { background: #2563EB; color: #fff; }

        .demo-output-container { background: #F8FAFC; border: 1px solid var(--border-color); border-radius: 16px; padding: 24px; display: flex; flex-direction: column; justify-content: space-between; }
        .doc-pill-card { background: #FFFFFF; border: 1px solid var(--border-color); border-radius: 12px; padding: 12px 16px; display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
        .doc-file-icon { width: 36px; height: 36px; border-radius: 8px; background: #EFF6FF; color: #2563EB; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .user-msg-row { display: flex; align-items: center; justify-content: flex-end; gap: 10px; margin-bottom: 20px; }
        .user-bubble { background: #2563EB; color: #FFFFFF; padding: 10px 16px; border-radius: 16px 16px 2px 16px; font-size: 0.85rem; font-weight: 500; }
        .user-avatar-sm { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }
        .ai-response-card { background: #FFFFFF; border: 1px solid var(--border-color); border-radius: 14px; padding: 20px; box-shadow: 0 4px 15px -3px rgba(0, 0, 0, 0.03); }
        .response-title { font-size: 0.9rem; font-weight: 700; color: #0F172A; margin-bottom: 12px; }
        .response-bullets { list-style: none; display: flex; flex-direction: column; gap: 8px; font-size: 0.85rem; color: var(--text-muted); line-height: 1.5; }
        .response-bullets li { position: relative; padding-left: 16px; }
        .response-bullets li::before { content: "•"; position: absolute; left: 0; color: #2563EB; font-weight: 800; }
        .action-bar-icons { display: flex; align-items: center; gap: 8px; margin-top: 16px; padding-top: 14px; border-top: 1px solid #F1F5F9; color: var(--text-dim); }
        .action-icon-btn { width: 28px; height: 28px; border-radius: 6px; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
        .action-icon-btn:hover { background: #F1F5F9; color: #2563EB; }
        .demo-disclaimer { font-size: 0.72rem; color: var(--text-dim); text-align: right; margin-top: 14px; }

        /* BENTO GRID */
        .bento-section { padding: 40px 0; }
        .bento-header { text-align: center; margin-bottom: 40px; }
        .bento-header-top { font-size: 0.9rem; font-weight: 700; color: #2563EB; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
        .bento-header-title { font-family: var(--font-heading); font-size: 2.6rem; font-weight: 800; color: #0F172A; }
        .bento-header-title span { color: #2563EB; }
        .bento-grid-container { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .bento-card-item { background: #FFFFFF; border: 1px solid var(--border-color); border-radius: 20px; padding: 28px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 4px 15px -3px rgba(0, 0, 0, 0.02); transition: all 0.3s; }
        .bento-card-item:hover { transform: translateY(-4px); box-shadow: 0 20px 40px -12px rgba(37,99,235,0.08); border-color: #BFDBFE; }
        .bento-title { font-family: var(--font-heading); font-size: 1.25rem; font-weight: 800; color: #0F172A; margin-bottom: 8px; }
        .bento-desc { font-size: 0.88rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 16px; }
        .bento-link { font-size: 0.85rem; font-weight: 700; color: #2563EB; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; margin-bottom: 24px; }
        .bento-preview-box { background: #F8FAFC; border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; margin-top: auto; }

        /* INDIA COMPLIANCE SECTION */
        .india-section { padding: 40px 0; }
        .india-card-outer { background: #FFFFFF; border: 1px solid var(--border-color); border-radius: 24px; padding: 40px; display: grid; grid-template-columns: 0.85fr 1.15fr; gap: 40px; align-items: center; box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.03); }
        .india-left-title { font-family: var(--font-heading); font-size: 2.2rem; font-weight: 800; color: #0F172A; margin-bottom: 8px; line-height: 1.15; }
        .india-left-title span { color: #2563EB; }
        .flag-line { display: flex; align-items: center; margin-top: 8px; margin-bottom: 16px; }
        .flag-line img { width: 36px; height: 24px; border-radius: 4px; object-fit: cover; box-shadow: 0 1.5px 4px rgba(0,0,0,0.12); }
        .india-left-desc { font-size: 0.95rem; color: var(--text-muted); line-height: 1.55; margin-bottom: 24px; max-width: 420px; }
        .btn-compliance-pager { background: #FFFFFF; border: 1px solid var(--border-color); padding: 12px 20px; border-radius: 10px; font-size: 0.88rem; font-weight: 700; color: #0F172A; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.04); transition: all 0.2s; }
        .btn-compliance-pager:hover { background: #F8FAFC; border-color: #CBD5E1; }

        .india-right-split { display: flex; align-items: center; gap: 24px; }
        .security-features-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; flex: 1; }
        .sec-feature-item { display: flex; align-items: flex-start; gap: 10px; }
        .sec-feature-icon { width: 22px; height: 22px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; flex-shrink: 0; }
        .sec-feature-icon.blue-bg { background: #EFF6FF; color: #2563EB; }
        .sec-feature-icon.green-bg { background: #F0FDF4; color: #166534; }
        .sec-feature-title { font-size: 0.88rem; font-weight: 700; color: #0F172A; line-height: 1.2; }
        .sec-feature-desc { font-size: 0.75rem; color: var(--text-dim); margin-top: 2px; }

        /* CREATIVE 3D SHIELD EMBLEM */
        .shield-3d-visual { position: relative; width: 190px; height: 210px; display: flex; align-items: center; justify-content: center; perspective: 1000px; flex-shrink: 0; }
        .shield-aura-glow { position: absolute; width: 200px; height: 200px; border-radius: 50%; background: radial-gradient(circle, rgba(37, 99, 235, 0.35) 0%, rgba(37, 99, 235, 0) 70%); animation: auraPulse 3s infinite alternate ease-in-out; pointer-events: none; }
        @keyframes auraPulse { 0% { transform: scale(0.9); opacity: 0.5; } 100% { transform: scale(1.15); opacity: 0.95; } }
        .shield-card-3d { width: 145px; height: 165px; background: linear-gradient(145deg, #3B82F6 0%, #1D4ED8 55%, #1E3A8A 100%); border-radius: 24px; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 16px 12px; color: #FFFFFF; box-shadow: 0 20px 45px -10px rgba(29, 78, 216, 0.45), 0 8px 16px rgba(0, 0, 0, 0.1), inset 0 2px 3px rgba(255, 255, 255, 0.45), inset 0 -4px 10px rgba(0, 0, 0, 0.25); border: 1px solid rgba(255, 255, 255, 0.25); position: relative; z-index: 2; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); transform-style: preserve-3d; }
        .shield-3d-visual:hover .shield-card-3d { transform: rotateY(-10deg) rotateX(8deg) translateY(-6px); box-shadow: 0 30px 60px -12px rgba(29, 78, 216, 0.55), inset 0 3px 4px rgba(255, 255, 255, 0.6), inset 0 -4px 12px rgba(0, 0, 0, 0.3); }
        .shield-top-pill { display: inline-flex; align-items: center; gap: 5px; background: rgba(255, 255, 255, 0.18); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 20px; padding: 3px 8px; font-size: 0.62rem; font-weight: 800; letter-spacing: 0.05em; color: #FFFFFF; }
        .shield-live-dot { width: 6px; height: 6px; background: #10B981; border-radius: 50%; box-shadow: 0 0 8px #10B981; }
        .shield-center-circle { width: 58px; height: 58px; border-radius: 50%; background: linear-gradient(135deg, #10B981 0%, #059669 100%); display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px rgba(16, 185, 129, 0.4), inset 0 2px 2px rgba(255, 255, 255, 0.5); border: 2px solid rgba(255, 255, 255, 0.4); margin: 6px 0; position: relative; }
        .shield-check-icon { width: 30px; height: 30px; color: #FFFFFF; filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15)); }
        .shield-bottom-label { font-size: 0.68rem; font-weight: 800; letter-spacing: 0.08em; color: rgba(255, 255, 255, 0.95); text-transform: uppercase; }
        .shield-float-tag { position: absolute; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 5px 9px; font-size: 0.65rem; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 5px; box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08); z-index: 3; transition: transform 0.3s ease; }
        .shield-float-tag.top-right { top: 10px; right: -10px; transform: translateZ(20px); }
        .shield-float-tag.bottom-left { bottom: 12px; left: -12px; transform: translateZ(20px); }
        .shield-3d-visual:hover .shield-float-tag.top-right { transform: translateZ(35px) translateY(-3px); }
        .shield-3d-visual:hover .shield-float-tag.bottom-left { transform: translateZ(35px) translateY(3px); }

        /* CUSTOMER STORIES */
        .stories-section { padding: 40px 0; }
        .stories-header { font-family: var(--font-heading); font-size: 1.6rem; font-weight: 800; color: #0F172A; text-align: center; margin-bottom: 32px; }
        .stories-grid-container { display: grid; grid-template-columns: repeat(3, 1fr) 260px; gap: 20px; }
        .story-card-item { background: #FFFFFF; border: 1px solid var(--border-color); border-radius: 20px; padding: 24px; box-shadow: 0 4px 15px -3px rgba(0, 0, 0, 0.02); display: flex; align-items: center; justify-content: space-between; position: relative; overflow: hidden; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .story-card-item:hover { transform: translateY(-4px); border-color: #BFDBFE; box-shadow: 0 20px 40px -12px rgba(37,99,235,0.08); }
        .story-card-content { display: flex; flex-direction: column; justify-content: space-between; height: 100%; z-index: 2; }
        .story-type-badge { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; font-weight: 700; color: #0F172A; margin-bottom: 14px; }
        .story-stat-num { font-family: var(--font-heading); font-size: 3rem; font-weight: 800; line-height: 1; margin-bottom: 4px; }
        .story-stat-label { font-size: 0.82rem; font-weight: 600; color: var(--text-muted); margin-bottom: 16px; max-width: 130px; }
        .story-case-link { font-size: 0.82rem; font-weight: 700; color: #2563EB; text-decoration: none; }
        .story-portrait-img { width: 110px; height: 150px; object-fit: cover; border-radius: 14px; z-index: 1; transition: transform 0.3s ease; }
        .story-card-item:hover .story-portrait-img { transform: scale(1.04); }

        .waitlist-card-item { background: #F8FAFC; border: 1px solid var(--border-color); border-radius: 20px; padding: 24px; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .waitlist-card-item:hover { transform: translateY(-4px); background: #FFFFFF; border-color: #BFDBFE; box-shadow: 0 20px 40px -12px rgba(37,99,235,0.08); }
        .waitlist-title { font-size: 0.9rem; font-weight: 700; color: #0F172A; margin-bottom: 2px; }
        .waitlist-sub { font-size: 0.78rem; color: var(--text-dim); margin-bottom: 16px; }
        .btn-join-waitlist { background: #FFFFFF; border: 1px solid var(--border-color); padding: 10px 16px; border-radius: 10px; font-size: 0.85rem; font-weight: 700; color: #0F172A; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 1px 2px rgba(0,0,0,0.04); transition: all 0.2s ease; }
        .btn-join-waitlist:hover { background: #2563EB; color: #FFFFFF; border-color: #2563EB; box-shadow: 0 4px 12px rgba(37,99,235,0.2); }
        .waitlist-avatars-row { display: flex; align-items: center; gap: 8px; margin-top: 16px; }
        .avatar-stack { display: flex; }
        .avatar-stack img { width: 24px; height: 24px; border-radius: 50%; border: 2px solid #FFFFFF; margin-left: -8px; }
        .avatar-stack img:first-child { margin-left: 0; }
        .waitlist-count-pill { font-size: 0.72rem; color: var(--text-dim); }

        .integrations-row-container { margin-top: 36px; }
        .integrations-flex-bar { background: #FAFAFC; border: 1px solid var(--border-color); border-radius: 16px; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .integrations-label { font-size: 0.85rem; font-weight: 700; color: #0F172A; }
        .integration-badge-item { display: flex; align-items: center; gap: 6px; font-size: 0.82rem; font-weight: 600; color: var(--text-muted); background: #fff; padding: 6px 12px; border-radius: 8px; border: 1px solid #E2E8F0; }

        /* PRICING SECTION */
        .pricing-section { padding: 60px 0 40px 0; }
        .pricing-header { text-align: center; margin-bottom: 24px; }
        .pricing-title { font-family: var(--font-heading); font-size: 2.5rem; font-weight: 800; color: #0F172A; margin-bottom: 6px; }
        .pricing-sub { font-size: 0.95rem; color: var(--text-muted); }
        .billing-toggle-container { display: flex; align-items: center; justify-content: center; margin-bottom: 40px; }
        .billing-switch-bg { background: #F1F5F9; border-radius: 30px; padding: 4px; display: inline-flex; align-items: center; position: relative; cursor: pointer; user-select: none; }
        .billing-switch-btn { border: none; border-radius: 26px; padding: 6px 18px; font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: all 0.25s ease; }
        .billing-switch-btn.active { background: #FFFFFF; color: #2563EB; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
        .billing-switch-btn.inactive { background: transparent; color: #64748B; }
        .billing-switch-btn.inactive:hover { color: #0F172A; }
        .save-badge { background: #EFF6FF; color: #2563EB; font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 4px; margin-left: 6px; }

        .pricing-cards-grid { display: grid; grid-template-columns: repeat(3, 1fr) 280px; gap: 20px; align-items: stretch; }
        .price-card { background: #FFFFFF; border: 1px solid var(--border-color); border-radius: 20px; padding: 32px 24px; display: flex; flex-direction: column; justify-content: space-between; position: relative; box-shadow: 0 4px 15px -3px rgba(0, 0, 0, 0.02); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .price-card:hover { transform: translateY(-6px); box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.06); border-color: #BFDBFE; }
        .price-card.popular { border-color: #2563EB; border-width: 2px; box-shadow: 0 10px 30px rgba(37, 99, 235, 0.12); }
        .price-card.popular:hover { border-color: #2563EB; box-shadow: 0 25px 50px -12px rgba(37, 99, 235, 0.18); }
        .most-popular-badge { position: absolute; top: -14px; right: 24px; background: #2563EB; color: #FFFFFF; padding: 4px 14px; border-radius: 20px; font-size: 0.72rem; font-weight: 700; }
        .plan-title { font-family: var(--font-heading); font-size: 1.3rem; font-weight: 800; color: #0F172A; margin-bottom: 2px; }
        .plan-sub { font-size: 0.8rem; color: var(--text-dim); margin-bottom: 20px; }
        .plan-amount { font-family: var(--font-heading); font-size: 2.6rem; font-weight: 800; color: #0F172A; line-height: 1; }
        .tax-label { font-size: 0.72rem; color: var(--text-dim); margin-top: 4px; margin-bottom: 20px; }
        .plan-feature-list { list-style: none; display: flex; flex-direction: column; gap: 12px; font-size: 0.88rem; color: var(--text-muted); margin-bottom: 28px; }
        .plan-feature-list li { display: flex; align-items: center; gap: 8px; }
        .check-blue { color: #2563EB; font-weight: 800; }
        .sub-trial-label { font-size: 0.72rem; color: var(--text-dim); text-align: center; margin-top: 6px; }

        .pricing-guarantees-bar { display: flex; align-items: center; justify-content: center; gap: 32px; margin-top: 32px; font-size: 0.85rem; font-weight: 600; color: var(--text-muted); }
        .pricing-guarantees-bar span { display: flex; align-items: center; gap: 6px; }

        /* FINAL CTA BLUE BANNER */
        .final-blue-banner { background: linear-gradient(135deg, #1E40AF 0%, #1D4ED8 50%, #1E3A8A 100%); border-radius: 24px; padding: 48px 40px; color: #FFFFFF; display: grid; grid-template-columns: 180px 1fr 180px; align-items: center; gap: 32px; box-shadow: 0 25px 50px -12px rgba(29, 78, 216, 0.3); margin: 60px 0; border: 1px solid rgba(255, 255, 255, 0.08); }
        .ai-3d-badge-graphic { width: 120px; height: 120px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.03) 100%); border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 20px; display: flex; align-items: center; justify-content: center; font-size: 3.2rem; font-weight: 800; color: #FFFFFF; box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15), inset 0 2px 2px rgba(255,255,255,0.15); text-shadow: 0 2px 8px rgba(37,99,235,0.5); transition: all 0.3s ease; }
        .final-blue-banner:hover .ai-3d-badge-graphic { transform: translateY(-2px); box-shadow: 0 15px 35px rgba(37, 99, 235, 0.3), inset 0 2px 2px rgba(255,255,255,0.25); border-color: rgba(255, 255, 255, 0.4); }
        .final-cta-center { text-align: center; }
        .final-cta-title { font-family: var(--font-heading); font-size: 2.5rem; font-weight: 800; color: #FFFFFF; margin-bottom: 10px; }
        .final-cta-sub { font-size: 0.95rem; color: #DBEAFE; margin-bottom: 28px; }
        .final-cta-btns { display: flex; align-items: center; justify-content: center; gap: 16px; }
        .btn-cta-white { background: #FFFFFF; color: #1D4ED8; border: none; padding: 14px 28px; border-radius: 12px; font-size: 0.95rem; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,0.12); transition: all 0.25s ease; }
        .btn-cta-white:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15); background: #F8FAFC; }
        .btn-cta-outline { background: rgba(255, 255, 255, 0.05); color: #FFFFFF; border: 1px solid rgba(255, 255, 255, 0.4); padding: 14px 28px; border-radius: 12px; font-size: 0.95rem; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; transition: all 0.25s ease; }
        .btn-cta-outline:hover { background: rgba(255, 255, 255, 0.15); border-color: rgba(255, 255, 255, 0.8); transform: translateY(-2px); }
        .final-cta-right { display: flex; flex-direction: column; gap: 12px; font-size: 0.85rem; font-weight: 600; color: #DBEAFE; }

        /* FOOTER */
        .footer-container { padding: 60px 0 30px 0; border-top: 1px solid var(--border-color); background: #FFFFFF; }
        .footer-grid-6col { display: grid; grid-template-columns: 2.2fr repeat(6, 1fr); gap: 24px; margin-bottom: 44px; }
        .footer-brand-desc { font-size: 0.82rem; color: var(--text-muted); line-height: 1.55; margin-top: 12px; margin-bottom: 18px; max-width: 260px; }
        .social-icons-row { display: flex; gap: 14px; font-size: 1.1rem; color: var(--text-muted); }
        .social-icons-row a:hover { color: #2563EB; }
        .footer-col-title { font-size: 0.82rem; font-weight: 700; color: #0F172A; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 16px; }
        .footer-links { list-style: none; display: flex; flex-direction: column; gap: 10px; }
        .footer-links a { text-decoration: none; font-size: 0.82rem; color: var(--text-muted); transition: color 0.2s; }
        .footer-links a:hover { color: #2563EB; }
        .footer-bottom-bar { border-top: 1px solid var(--border-color); padding-top: 24px; display: flex; align-items: center; justify-content: space-between; font-size: 0.78rem; color: var(--text-dim); }
        .footer-bottom-selectors { display: flex; align-items: center; gap: 20px; }

        @media (max-width: 1024px) {
          .hero-grid { grid-template-columns: 1fr; }
          .bento-grid-container { grid-template-columns: repeat(2, 1fr); }
          .pricing-cards-grid { grid-template-columns: repeat(2, 1fr); }
          .stories-grid-container { grid-template-columns: repeat(2, 1fr); }
          .india-card-outer { grid-template-columns: 1fr; }
          .final-blue-banner { grid-template-columns: 1fr; text-align: center; }
          .footer-grid-6col { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>

      {/* HEADER */}
      <header class="header">
        <div class="container header-inner">
          <Link href="/neuravolt" class="logo-container">
            <img src="/assets/xarwiz-logo.png" alt="Xarwiz" className="brand-logo-img" />
            <span class="logo-badge">
              <Shield style={{ width: 12, height: 12 }} /> AI Cloud Platform
            </span>
          </Link>

          <nav>
            <ul class="nav-menu">
              <li><a href="#platform">Platform <ChevronDown style={{ width: 14, height: 14 }} /></a></li>
              <li><a href="#solutions">Solutions <ChevronDown style={{ width: 14, height: 14 }} /></a></li>
              <li><a href="#developers">Developers <ChevronDown style={{ width: 14, height: 14 }} /></a></li>
              <li><a href="#pricing">Pricing</a></li>
              <li><a href="#resources">Resources <ChevronDown style={{ width: 14, height: 14 }} /></a></li>
              <li><a href="#company">Company <ChevronDown style={{ width: 14, height: 14 }} /></a></li>
            </ul>
          </nav>

          <div class="header-ctas">
            <Link href="/login" class="btn-demo">Book a Demo</Link>
            <Link href="/signup" class="btn-trial">Request Access</Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section class="hero-section">
        <div class="container hero-grid">
          <div class="hero-left">
            <div class="dpdp-pill">
              <span class="dpdp-icon-dot"><Zap style={{ width: 10, height: 10 }} /></span>
              <span>🇮🇳 India's AI Platform for Agents &amp; Automation</span>
            </div>

            <h1 class="hero-title">
              AI That Works the <br />
              Way Your <span class="blue-text">Business Works</span>.
            </h1>

            <p class="hero-subtitle">
              From AI agents and workflow automation to agentic coding, multilingual AI chat, and knowledge management—everything works together in one platform.
            </p>

            <div class="hero-checks">
              <div class="check-item">
                <span class="check-circle">✓</span>
                <span>DPDP Ready</span>
              </div>
              <div class="check-item">
                <span class="check-circle">✓</span>
                <span>Data Stays in India</span>
              </div>
              <div class="check-item">
                <span class="check-circle">✓</span>
                <span>Deploy in 5 Minutes</span>
              </div>
            </div>

            <div class="hero-buttons-row">
              <Link href="/signup" class="btn-hero-primary">Request Access</Link>
              <Link href="/login" class="btn-hero-secondary">Book Live Demo</Link>
            </div>

            <div class="microcopy-row">
              <span>Join the invitation list</span>
              <span>Talk to our India team</span>
            </div>
          </div>

          {/* HERO DASHBOARD CARD VISUAL */}
          <div class="dashboard-card">
            <div class="dash-grid">
              {/* Sidebar */}
              <div class="dash-sidebar">
                <div class="sidebar-logo">
                  <img src="/assets/xarwiz-logo.png" alt="Xarwiz" style={{ height: 18, width: 'auto' }} />
                </div>

                <div class="nav-item active"><LayoutDashboard style={{ width: 14, height: 14 }} /> Overview</div>
                <div class="nav-item"><Bot style={{ width: 14, height: 14 }} /> AI Agents</div>
                <div class="nav-item"><Database style={{ width: 14, height: 14 }} /> Knowledge Base</div>
                <div class="nav-item"><GitBranch style={{ width: 14, height: 14 }} /> Workflows</div>
                <div class="nav-item"><BarChart2 style={{ width: 14, height: 14 }} /> Analytics</div>
                <div class="nav-item"><Key style={{ width: 14, height: 14 }} /> API Keys</div>
                <div class="nav-item"><Blocks style={{ width: 14, height: 14 }} /> Integrations</div>
                <div class="nav-item"><Settings style={{ width: 14, height: 14 }} /> Settings</div>
              </div>

              {/* Main Content */}
              <div class="dash-main">
                <div class="dash-header-row">
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>Dashboard</h3>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Welcome back!</div>
                  </div>

                  <div class="dash-user-info">
                    <RotateCw style={{ width: 13, height: 13, cursor: 'pointer' }} />
                    <Bell style={{ width: 13, height: 13, cursor: 'pointer' }} />
                    <img src="/assets/user-avatar.jpg" class="avatar-img" alt="User" />
                    <span style={{ fontWeight: 600, fontSize: '0.78rem', color: '#0F172A' }}>Team Xarwiz <ChevronDown style={{ width: 12, height: 12 }} /></span>
                  </div>
                </div>

                {/* Stats Row */}
                <div class="stats-row">
                  <div class="stat-box">
                    <div class="stat-label">Total Agents</div>
                    <div class="stat-val-row">
                      <span class="stat-num">24</span>
                      <span class="stat-green">↑ 18%</span>
                    </div>
                    <div class="stat-subtext">vs last month</div>
                  </div>

                  <div class="stat-box">
                    <div class="stat-label">Total Conversations</div>
                    <div class="stat-val-row">
                      <span class="stat-num">128.4K</span>
                      <span class="stat-green">↑ 24%</span>
                    </div>
                    <div class="stat-subtext">vs last month</div>
                  </div>

                  <div class="stat-box">
                    <div class="stat-label">Knowledge Bases</div>
                    <div class="stat-val-row">
                      <span class="stat-num">16</span>
                      <span class="stat-green">↑ 12%</span>
                    </div>
                    <div class="stat-subtext">vs last month</div>
                  </div>

                  <div class="stat-box">
                    <div class="stat-label">Success Rate</div>
                    <div class="stat-val-row">
                      <span class="stat-num">98.6%</span>
                      <span class="stat-green">↑ 2.7%</span>
                    </div>
                    <div class="stat-subtext">vs last month</div>
                  </div>
                </div>

                {/* Main Content Split */}
                <div class="main-split">
                  {/* AI Agent Builder Diagram */}
                  <div class="builder-box">
                    <div>
                      <div class="builder-title">
                        <Zap style={{ width: 15, height: 15, color: '#2563EB' }} /> AI Agent Builder
                      </div>
                      <div class="diagram-flow-exact">
                        {/* Node 1 */}
                        <div class="diagram-node-card blue-node">
                          <div class="diagram-icon-circle" style={{ background: '#DBEAFE', color: '#2563EB', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <MapPin style={{ width: 14, height: 14 }} />
                          </div>
                          <span class="node-label-text" style={{ color: '#1E40AF' }}>User Query</span>
                        </div>

                        <span class="connector-arrow">→</span>

                        {/* Node 2 */}
                        <div class="diagram-node-card green-node">
                          <div class="diagram-icon-circle" style={{ background: '#DCFCE7', color: '#166534', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Target style={{ width: 14, height: 14 }} />
                          </div>
                          <span class="node-label-text" style={{ color: '#166534' }}>Knowledge Base</span>
                        </div>

                        <span class="connector-arrow">→</span>

                        {/* Node 3 */}
                        <div class="diagram-node-card purple-node">
                          <div class="diagram-icon-circle" style={{ background: '#F3E8FF', color: '#6B21A8', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Cpu style={{ width: 14, height: 14 }} />
                          </div>
                          <span class="node-label-text" style={{ color: '#6B21A8' }}>LLM (GPT-4o)</span>
                        </div>

                        <span class="connector-arrow">→</span>

                        {/* Branch Split */}
                        <div class="branch-split-col">
                          <div class="diagram-node-card white-node" style={{ height: 32, padding: '4px 8px', flexDirection: 'row', gap: 4, width: 58 }}>
                            <Sliders style={{ width: 11, height: 11, color: '#2563EB' }} />
                            <span class="node-label-text" style={{ color: '#0F172A' }}>API</span>
                          </div>

                          <div class="diagram-node-card purple-node" style={{ height: 32, padding: '4px 8px', flexDirection: 'row', gap: 4, width: 58 }}>
                            <CheckCircle style={{ width: 11, height: 11, color: '#6B21A8' }} />
                            <span class="node-label-text" style={{ color: '#6B21A8' }}>Response</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* LIVE EXECUTIONS STREAM */}
                    <div class="builder-metrics-box">
                      <div class="metrics-box-title">
                        <span>Recent Agent Executions</span>
                        <span style={{ color: '#2563EB', fontWeight: 600, cursor: 'pointer' }}>View All →</span>
                      </div>

                      <div class="activity-row">
                        <span class="act-name">Document Summarizer</span>
                        <span class="act-badge">Success</span>
                        <span class="act-meta">GPT-4o • 420ms</span>
                      </div>

                      <div class="activity-row">
                        <span class="act-name">Support Ticket Router</span>
                        <span class="act-badge">Success</span>
                        <span class="act-meta">Claude 3.5 • 310ms</span>
                      </div>

                      <div class="activity-row">
                        <span class="act-name">Invoice Extractor RAG</span>
                        <span class="act-badge">Success</span>
                        <span class="act-meta">DeepSeek V3 • 580ms</span>
                      </div>
                    </div>
                  </div>

                  {/* Live Agent Preview Chat */}
                  <div class="preview-box">
                    <div>
                      <div class="preview-title">Live Agent Preview</div>

                      <div class="chat-bubble-sys">
                        Hello! I am your AI Agent. How can I help you today?
                      </div>

                      <div class="chat-bubble-user">
                        Summarize this contract
                      </div>

                      <div class="chat-card-ai">
                        <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Here is a summary of the contract:</div>
                        <div style={{ fontSize: '0.68rem', color: '#475569', lineHeight: 1.45 }}>
                          • Agreement between ABC Corp and XYZ Pvt. Ltd.<br />
                          • Duration: 12 months<br />
                          • Payment: 30 days from invoice date<br />
                          • Termination: 30 days notice
                        </div>
                      </div>
                    </div>

                    <div class="chat-input-bar">
                      <input type="text" class="chat-input-field" placeholder="Ask anything..." readOnly />
                      <button class="send-sq-btn">
                        <Send style={{ width: 12, height: 12 }} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BADGES STRIP */}
      <section class="trust-strip">
        <div class="container">
          <div class="trust-outer-card">
            <div class="trust-title">Trusted by businesses across India</div>

            <div class="trust-logos-exact-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: 32, flexWrap: 'wrap', maxWidth: 1080, margin: '0 auto' }}>
              {/* 1. DPDP COMPLIANT */}
              <div class="trust-badge-exact dpdp-badge" style={{ display: 'flex', alignItems: 'center', gap: 12, height: 48 }}>
                <ShieldCheck style={{ color: '#16A34A', width: 32, height: 32, flexShrink: 0 }} />
                <div class="dpdp-text-col" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                  <span class="dpdp-bold-title" style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>DPDP</span>
                  <span class="dpdp-sub-label" style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.05em' }}>COMPLIANT</span>
                </div>
              </div>

              {/* 2. Built in INDIA */}
              <div class="trust-badge-exact india-badge-flex" style={{ display: 'flex', alignItems: 'center', gap: 12, height: 48 }}>
                <img src="/assets/india-flag.svg" class="flag-img-thumb" alt="India Flag" style={{ width: 30, height: 20, borderRadius: 4, objectFit: 'cover', boxShadow: '0 1px 3px rgba(0,0,0,0.12)', flexShrink: 0 }} />
                <div class="dpdp-text-col" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-dim)' }}>Built in</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', letterSpacing: '0.04em' }}>INDIA</span>
                </div>
              </div>

              {/* 3. Razorpay SECURED PAYMENTS */}
              <div class="trust-badge-exact" style={{ display: 'flex', alignItems: 'center', gap: 12, height: 48 }}>
                <img src="/assets/razorpay.svg" class="razorpay-logo-img" alt="Razorpay" style={{ height: 24, objectFit: 'contain', flexShrink: 0 }} />
                <div class="dpdp-text-col" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.06em' }}>SECURED</span>
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.06em' }}>PAYMENTS</span>
                </div>
              </div>

              {/* 4. Startup India */}
              <div class="trust-badge-exact" style={{ display: 'flex', alignItems: 'center', height: 48 }}>
                <img src="/assets/startup-india.png" class="startup-india-logo-img" alt="Startup India" style={{ height: 32, objectFit: 'contain', flexShrink: 0 }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: TRY AN AI AGENT DEMO & BENTO GRID */}
      <section class="demo-section" id="platform">
        <div class="container">
          <div class="demo-card-outer">
            <div class="demo-header">
              <div class="demo-title-row">
                <span>Try an AI Agent</span>
                <Sparkles class="sparkles-icon" />
              </div>
              <div class="demo-subtitle">
                Experience the power of Xarwiz AI Agents. No sign-up. No credit card. Just try.
              </div>
            </div>

            <div class="demo-grid-layout">
              {/* Left Tabs */}
              <div class="demo-tabs-flex">
                <button class={`demo-tab-btn ${activeDemoTab === 'contract' ? 'active' : ''}`} onClick={() => setActiveDemoTab('contract')}>
                  <div class="tab-icon-box"><FileText style={{ width: 16, height: 16 }} /></div>
                  <span>Summarize this contract</span>
                </button>
                <button class={`demo-tab-btn ${activeDemoTab === 'invoice' ? 'active' : ''}`} onClick={() => setActiveDemoTab('invoice')}>
                  <div class="tab-icon-box"><Receipt style={{ width: 16, height: 16 }} /></div>
                  <span>Generate invoice</span>
                </button>
                <button class={`demo-tab-btn ${activeDemoTab === 'policy' ? 'active' : ''}`} onClick={() => setActiveDemoTab('policy')}>
                  <div class="tab-icon-box"><Search style={{ width: 16, height: 16 }} /></div>
                  <span>Search company policy</span>
                </button>
                <button class={`demo-tab-btn ${activeDemoTab === 'customer' ? 'active' : ''}`} onClick={() => setActiveDemoTab('customer')}>
                  <div class="tab-icon-box"><MessageSquare style={{ width: 16, height: 16 }} /></div>
                  <span>Answer customer query</span>
                </button>
              </div>

              {/* Right Output */}
              <div class="demo-output-container">
                <div>
                  <div class="doc-pill-card">
                    <div class="doc-file-icon"><FileText style={{ width: 16, height: 16 }} /></div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F172A' }}>{currentDemo.docName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{currentDemo.docMeta}</div>
                    </div>
                  </div>

                  <div class="user-msg-row">
                    <div class="user-bubble">{guestOutput ? guestOutput.userPrompt : currentDemo.userPrompt}</div>
                    <img src="/assets/user-avatar.jpg" class="user-avatar-sm" alt="User" />
                  </div>

                  <div class="ai-response-card">
                    <div class="response-title">{(guestOutput || currentDemo).responseTitle}</div>
                    <ul class="response-bullets">
                      {(guestOutput || currentDemo).bullets.map((bText, idx) => (
                        <li key={idx}><strong>{bText}</strong></li>
                      ))}
                    </ul>
                    <div class="action-bar-icons">
                      <span class="action-icon-btn"><ThumbsUp style={{ width: 14, height: 14 }} /></span>
                      <span class="action-icon-btn"><ThumbsDown style={{ width: 14, height: 14 }} /></span>
                      <span class="action-icon-btn"><Copy style={{ width: 14, height: 14 }} /></span>
                    </div>
                  </div>
                </div>

                {guestPromptsUsed >= 1 ? (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: '12px',
                    padding: '16px',
                    marginTop: '16px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: 0, fontWeight: 700, color: '#dc2626', fontSize: '0.88rem' }}>
                      1 Free Guest Prompt Used
                    </p>
                    <p style={{ margin: '6px 0 12px 0', fontSize: '0.8rem', color: '#475569' }}>
                      You've experienced your 1 free guest prompt trial. To continue using Xarwiz Cloud, please request access.
                    </p>
                    <Link href="/signup" class="btn-hero-primary" style={{ display: 'inline-block', padding: '8px 24px', fontSize: '0.82rem', textDecoration: 'none' }}>
                      Request Access
                    </Link>
                  </div>
                ) : (
                  <form onSubmit={(e) => { e.preventDefault(); handleRunGuestPrompt(); }} style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="Type a guest prompt to try (1 free prompt limit)..."
                      value={guestInputText}
                      onChange={(e) => setGuestInputText(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.85rem',
                        outline: 'none'
                      }}
                    />
                    <button type="submit" class="btn-hero-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                      Run Free Guest Prompt
                    </button>
                  </form>
                )}

                <div class="demo-disclaimer" style={{ marginTop: '12px' }}>
                  Guest trial is limited to 1 prompt usage without login. Access request required for full platform access.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BENTO GRID SECTION */}
      <section class="bento-section">
        <div class="container">
          <div class="bento-header">
            <div class="bento-header-top">Everything you need to build</div>
            <h2 class="bento-header-title"><span>Enterprise</span> AI Applications</h2>
          </div>

          <div class="bento-grid-container">
            {/* 1. AI Agent Builder */}
            <div class="bento-card-item">
              <div>
                <div class="bento-title">AI Agent Builder</div>
                <p class="bento-desc">Build intelligent AI agents with memory, tools and actions in minutes.</p>
                <Link href="/signup" class="bento-link">Explore →</Link>
              </div>
              <div class="bento-preview-box">
                <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, padding: 10 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>Agent Details</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Customer Support Assistant</div>
                </div>
              </div>
            </div>

            {/* 2. RAG Knowledge Base */}
            <div class="bento-card-item">
              <div>
                <div class="bento-title">RAG Knowledge Base</div>
                <p class="bento-desc">Upload PDFs, docs, URLs and connectors. Encrypted with AES-256-GCM encryption.</p>
                <Link href="/signup" class="bento-link">Explore →</Link>
              </div>
              <div class="bento-preview-box" style={{ position: 'relative', height: 95, width: '100%', overflow: 'hidden' }}>
                <svg width="100%" height="100%" viewBox="0 0 300 95" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 1 }}>
                  <path d="M 55,25 Q 90,75 150,75" fill="none" stroke="#EF4444" strokeWidth="1.5" strokeDasharray="3,4" opacity="0.5" />
                  <path d="M 150,25 L 150,75" fill="none" stroke="#3B82F6" strokeWidth="1.5" strokeDasharray="3,4" opacity="0.5" />
                  <path d="M 245,25 Q 210,75 150,75" fill="none" stroke="#0E7490" strokeWidth="1.5" strokeDasharray="3,4" opacity="0.5" />
                </svg>

                <div style={{ position: 'absolute', left: '18%', top: 25, transform: 'translate(-50%, -50%)', zIndex: 2, background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: 6, padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 5, color: '#DC2626', fontSize: '0.7rem', fontWeight: 700 }}>
                  <FileText style={{ width: 12, height: 12, strokeWidth: 2.5 }} /> PDF
                </div>

                <div style={{ position: 'absolute', left: '50%', top: 25, transform: 'translate(-50%, -50%)', zIndex: 2, background: 'rgba(37, 99, 235, 0.06)', border: '1px solid rgba(37, 99, 235, 0.15)', borderRadius: 6, padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 5, color: '#1D4ED8', fontSize: '0.7rem', fontWeight: 700 }}>
                  <FileText style={{ width: 12, height: 12, strokeWidth: 2.5 }} /> DOCX
                </div>

                <div style={{ position: 'absolute', left: '82%', top: 25, transform: 'translate(-50%, -50%)', zIndex: 2, background: 'rgba(14, 116, 144, 0.06)', border: '1px solid rgba(14, 116, 144, 0.15)', borderRadius: 6, padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 5, color: '#0E7490', fontSize: '0.7rem', fontWeight: 700 }}>
                  <Search style={{ width: 12, height: 12, strokeWidth: 2.5 }} /> URL
                </div>

                <div style={{ position: 'absolute', left: '50%', top: 75, transform: 'translate(-50%, -50%)', zIndex: 2, width: 34, height: 34, background: '#EFF6FF', border: '1.5px solid #BFDBFE', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Database style={{ width: 16, height: 16, color: '#2563EB' }} />
                </div>
              </div>
            </div>

            {/* 3. Workflow Automation */}
            <div class="bento-card-item">
              <div>
                <div class="bento-title">Workflow Automation</div>
                <p class="bento-desc">Visual workflow builder powered by n8n. Automate complex business processes.</p>
                <Link href="/signup" class="bento-link">Explore →</Link>
              </div>
              <div class="bento-preview-box" style={{ position: 'relative', height: 90, width: '100%', overflow: 'hidden' }}>
                <svg width="100%" height="100%" viewBox="0 0 300 90" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 1 }}>
                  <path d="M 60,65 Q 105,24 150,24" fill="none" stroke="#2563EB" strokeWidth="2" strokeDasharray="4,6" opacity="0.65" />
                  <path d="M 150,24 Q 195,24 240,65" fill="none" stroke="#10B981" strokeWidth="2" strokeDasharray="4,6" opacity="0.65" />
                </svg>

                <div style={{ position: 'absolute', left: '20%', top: '72%', transform: 'translate(-50%, -50%)', zIndex: 2, width: 30, height: 30, background: '#EFF6FF', border: '1.5px solid #BFDBFE', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Cpu style={{ width: 14, height: 14, color: '#2563EB' }} />
                </div>

                <div style={{ position: 'absolute', left: '50%', top: '27%', transform: 'translate(-50%, -50%)', zIndex: 2, width: 34, height: 34, background: '#DCFCE7', border: '1.5px solid #BBF7D0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GitBranch style={{ width: 16, height: 16, color: '#166534' }} />
                </div>

                <div style={{ position: 'absolute', left: '80%', top: '72%', transform: 'translate(-50%, -50%)', zIndex: 2, width: 30, height: 30, background: '#EFF6FF', border: '1.5px solid #BFDBFE', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Database style={{ width: 14, height: 14, color: '#2563EB' }} />
                </div>
              </div>
            </div>

            {/* 4. Embeddable Widget */}
            <div class="bento-card-item">
              <div>
                <div class="bento-title">Embeddable Widget</div>
                <p class="bento-desc">Add AI power to your website with our secure embeddable chat widget.</p>
                <Link href="/signup" class="bento-link">Explore →</Link>
              </div>
              <div class="bento-preview-box">
                <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden', width: '100%' }}>
                  <div style={{ background: '#F8FAFC', borderBottom: '1px solid #F1F5F9', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#fff', fontWeight: 800, position: 'relative' }}>
                        N
                        <span style={{ position: 'absolute', bottom: -1, right: -1, width: 6, height: 6, background: '#10B981', border: '1px solid #fff', borderRadius: '50%' }}></span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0F172A' }}>AI Assistant</span>
                        <span style={{ fontSize: '0.55rem', color: '#64748B' }}>Agent • Online</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, color: '#94A3B8' }}>
                      <Minus style={{ width: 12, height: 12 }} />
                      <X style={{ width: 12, height: 12 }} />
                    </div>
                  </div>

                  <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, background: '#fff', minHeight: 85 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', maxWidth: '85%' }}>
                      <div style={{ background: '#F1F5F9', color: '#1E293B', borderRadius: '10px 10px 10px 2px', padding: '6px 10px', fontSize: '0.68rem', lineHeight: 1.35 }}>
                        Hi! How can I help you today?
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', maxWidth: '85%', marginLeft: 'auto' }}>
                      <div style={{ background: '#2563EB', color: '#fff', borderRadius: '10px 10px 2px 10px', padding: '6px 10px', fontSize: '0.68rem', lineHeight: 1.35 }}>
                        Analyze our user feedback.
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #F1F5F9', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, background: '#F8FAFC' }}>
                    <div style={{ flex: 1, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 6, padding: '4px 8px', fontSize: '0.65rem', color: '#94A3B8' }}>
                      Write a reply...
                    </div>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Send style={{ width: 10, height: 10, color: '#fff' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Multi-Language Support */}
            <div class="bento-card-item">
              <div>
                <div class="bento-title">Multi-Language Support</div>
                <p class="bento-desc">Localize workflows and chat interfaces with support for 22+ languages.</p>
                <Link href="/signup" class="bento-link">Explore →</Link>
              </div>
              <div class="bento-preview-box">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, textAlign: 'left' }}>
                  {[
                    { bg: '#FEF2F2', color: '#EF4444', char: 'हि', name: 'Hindi' },
                    { bg: '#EEF2FF', color: '#4F46E5', char: 'En', name: 'English' },
                    { bg: '#ECFDF5', color: '#10B981', char: 'த', name: 'Tamil' },
                    { bg: '#FFFBEB', color: '#D97706', char: 'తె', name: 'Telugu' },
                    { bg: '#F0FDFA', color: '#0D9488', char: 'ਪੰ', name: 'Punjabi' },
                    { bg: '#FFF1F2', color: '#F43F5E', char: 'বা', name: 'Bengali' },
                    { bg: '#FAF5FF', color: '#8B5CF6', char: 'অ', name: 'Assamese' },
                    { bg: '#F0F9FF', color: '#0284C7', char: 'मै', name: 'Maithili' },
                    { bg: '#FFF7ED', color: '#EA580C', char: 'सं', name: 'Sanskrit' }
                  ].map((lang, lIdx) => (
                    <div key={lIdx} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 1px 3px rgba(0,0,0,0.02)', minWidth: 0 }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: lang.bg, color: lang.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.58rem', fontWeight: 800, flexShrink: 0 }}>{lang.char}</div>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lang.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 6. APIs & Integrations */}
            <div class="bento-card-item">
              <div>
                <div class="bento-title">APIs & Integrations</div>
                <p class="bento-desc">Robust APIs and pre-built integrations with your favorite tools.</p>
                <Link href="/signup" class="bento-link">Explore →</Link>
              </div>
              <div class="bento-preview-box">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, textAlign: 'left' }}>
                  <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 5, background: '#EFF6FF', border: '1px solid #DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Terminal style={{ width: 10, height: 10, color: '#2563EB' }} />
                    </div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#0F172A' }}>REST</span>
                  </div>

                  <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 5, background: '#F5F3FF', border: '1px solid #DDD6FE', display: 'flex', alignItems: 'center', justify: 'center' }}>
                      <Package style={{ width: 10, height: 10, color: '#7C3AED' }} />
                    </div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#0F172A' }}>SDK</span>
                  </div>

                  <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 5, background: '#F0FDFA', border: '1px solid #CCFBF1', display: 'flex', alignItems: 'center', justify: 'center' }}>
                      <Webhook style={{ width: 10, height: 10, color: '#0D9488' }} />
                    </div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#0F172A' }}>Webhooks</span>
                  </div>

                  {[
                    { img: '/assets/github-logo.png', name: 'GitHub' },
                    { img: '/assets/gdrive-logo.png', name: 'G Drive' },
                    { img: '/assets/slack-logo.png', name: 'Slack' },
                    { img: '/assets/jira-logo.png', name: 'Jira' },
                    { img: '/assets/notion-logo.png', name: 'Notion' },
                    { img: '/assets/discord-logo.png', name: 'Discord' }
                  ].map((integ, iIdx) => (
                    <div key={iIdx} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 20, height: 20, borderRadius: 5, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        <img src={integ.img} style={{ width: 12, height: 12, objectFit: 'contain' }} alt={integ.name} />
                      </div>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#0F172A' }}>{integ.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: BUILT FOR INDIA & CUSTOMER STORIES */}
      <section class="india-section">
        <div class="container">
          <div class="india-card-outer">
            <div>
              <h2 class="india-left-title">
                Built for India. <br />
                <span>Built for Enterprises.</span>
              </h2>
              <div class="flag-line"><img src="/assets/india-flag.svg" alt="India Flag" /></div>

              <p class="india-left-desc">
                Xarwiz is DPDP-ready and designed to meet the highest standards of security, privacy and compliance.
              </p>

              <button class="btn-compliance-pager">
                <span>Download Compliance One-Pager</span>
                <DownloadCloud style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <div class="india-right-split">
              <div class="security-features-grid">
                {[
                  { icon: ShieldCheck, title: 'Data Localization', desc: 'All data stored securely in India', color: 'blue-bg' },
                  { icon: Share2, title: 'Row-Level Security', desc: 'True tenant isolation with RLS', color: 'blue-bg' },
                  { icon: Shield, title: 'Right to Erasure', desc: 'One-click data export & deletion', color: 'green-bg' },
                  { icon: Lock, title: 'AES-256-GCM Encryption', desc: 'At-rest and in-transit encryption', color: 'green-bg' },
                  { icon: Leaf, title: 'Data Retention Controls', desc: 'Define retention as per your policy', color: 'green-bg' },
                  { icon: FileText, title: 'Audit Logs', desc: 'Comprehensive activity logging', color: 'green-bg' },
                  { icon: ShieldAlert, title: 'Legal Holds', desc: 'Lock data for legal or compliance needs', color: 'green-bg' },
                  { icon: CheckCircle2, title: 'DPDP Compliance', desc: 'Designed for DPDP Act, 2023', color: 'green-bg' }
                ].map((feat, fIdx) => {
                  const IconComp = feat.icon;
                  return (
                    <div key={fIdx} class="sec-feature-item">
                      <div class={`sec-feature-icon ${feat.color}`}><IconComp style={{ width: 14, height: 14 }} /></div>
                      <div>
                        <div class="sec-feature-title">{feat.title}</div>
                        <div class="sec-feature-desc">{feat.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div class="shield-3d-visual">
                <div class="shield-aura-glow"></div>
                
                <div class="shield-float-tag top-right">
                  <Lock style={{ width: 12, height: 12, color: '#2563EB' }} />
                  <span>AES-256</span>
                </div>
                
                <div class="shield-card-3d">
                  <div class="shield-top-pill">
                    <span class="shield-live-dot"></span>
                    <span>DPDP 100%</span>
                  </div>
                  
                  <div class="shield-center-circle">
                    <svg class="shield-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  
                  <div class="shield-bottom-label">Verified Data</div>
                </div>

                <div class="shield-float-tag bottom-left">
                  <ShieldCheck style={{ width: 12, height: 12, color: '#10B981' }} />
                  <span>RLS Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CUSTOMER STORIES SECTION */}
      <section class="stories-section">
        <div class="container">
          <div class="stories-header">Loved by innovators across India</div>

          <div class="stories-grid-container">
            {/* Story 1 */}
            <div class="story-card-item">
              <div class="story-card-content">
                <div>
                  <div class="story-type-badge">
                    <Shield style={{ width: 16, height: 16 }} /> Legal Tech Startup
                  </div>
                  <div class="story-stat-num" style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>65%</div>
                  <div class="story-stat-label">Faster document review</div>
                </div>
                <Link href="/signup" class="story-case-link">Read Case Study →</Link>
              </div>
              <img src="/assets/legal-executive.jpg" class="story-portrait-img" alt="Legal Executive" />
            </div>

            {/* Story 2 */}
            <div class="story-card-item">
              <div class="story-card-content">
                <div>
                  <div class="story-type-badge">
                    <Package style={{ width: 16, height: 16, color: '#2563EB' }} /> Healthcare Platform
                  </div>
                  <div class="story-stat-num" style={{ background: 'linear-gradient(135deg, #10B981, #047857)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>72%</div>
                  <div class="story-stat-label">Support automation</div>
                </div>
                <Link href="/signup" class="story-case-link">Read Case Study →</Link>
              </div>
              <img src="/assets/doctor.jpg" class="story-portrait-img" alt="Healthcare Doctor" />
            </div>

            {/* Story 3 */}
            <div class="story-card-item">
              <div class="story-card-content">
                <div>
                  <div class="story-type-badge">
                    <Layers style={{ width: 16, height: 16 }} /> Fintech Company
                  </div>
                  <div class="story-stat-num" style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>48%</div>
                  <div class="story-stat-label">Reduction in manual workflows</div>
                </div>
                <Link href="/signup" class="story-case-link">Read Case Study →</Link>
              </div>
              <img src="/assets/fintech-executive.jpg" class="story-portrait-img" alt="Fintech Executive" />
            </div>

            {/* Waitlist Card */}
            <div class="waitlist-card-item">
              <div>
                <div class="waitlist-title">More stories coming soon</div>
                <div class="waitlist-sub">Be a part of our journey</div>
                <Link href="/signup" class="btn-join-waitlist">Join Waitlist</Link>
              </div>

              <div class="waitlist-avatars-row">
                <div class="avatar-stack">
                  <img src="/assets/user-avatar.jpg" alt="Avatar" />
                  <img src="/assets/avatar2.jpg" alt="Avatar" />
                  <img src="/assets/avatar3.jpg" alt="Avatar" />
                </div>
                <div class="waitlist-count-pill">
                  <strong>+1.2K</strong> Join 1,200+ others
                </div>
              </div>
            </div>
          </div>

          <div class="integrations-row-container">
            <div class="integrations-flex-bar">
              <div class="integrations-label">Integrates with your favorite tools</div>
              <div class="integration-badge-item"><MessageSquare style={{ width: 16, height: 16, color: '#2563EB' }} /> <strong>WhatsApp</strong></div>
              <div class="integration-badge-item"><MessageSquare style={{ width: 16, height: 16, color: '#2563EB' }} /> <strong>Slack</strong></div>
              <div class="integration-badge-item"><Database style={{ width: 16, height: 16, color: '#2563EB' }} /> <strong>Google Drive</strong></div>
              <div class="integration-badge-item"><Package style={{ width: 16, height: 16, color: '#2563EB' }} /> <strong>Microsoft 365</strong></div>
              <div class="integration-badge-item"><Zap style={{ width: 16, height: 16, color: '#2563EB' }} /> <strong>Salesforce</strong></div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#2563EB', cursor: 'pointer' }}>• And more...</div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: PRICING SECTION */}
      <section class="pricing-section" id="pricing">
        <div class="container">
          <div class="pricing-header">
            <h2 class="pricing-title">Simple, Transparent Pricing</h2>
            <div class="pricing-sub">All plans include DPDP compliance, encryption, RLS and 24/7 support.</div>
          </div>

          {/* Billing Toggle */}
          <div class="billing-toggle-container">
            <div class="billing-switch-bg">
              <button
                class={`billing-switch-btn ${billingPeriod === 'monthly' ? 'active' : 'inactive'}`}
                onClick={() => setBillingPeriod('monthly')}
              >
                Monthly
              </button>
              <button
                class={`billing-switch-btn ${billingPeriod === 'yearly' ? 'active' : 'inactive'}`}
                onClick={() => setBillingPeriod('yearly')}
              >
                Yearly <span class="save-badge">Save 20%</span>
              </button>
            </div>
          </div>

          {/* 4 Cards Grid */}
          <div class="pricing-cards-grid">
            {/* Starter Card */}
            <div class="price-card">
              <div>
                <div class="plan-title">Starter</div>
                <div class="plan-sub">Perfect for startups and small teams</div>
                <div class="plan-amount">
                  <span>{billingPeriod === 'monthly' ? '₹999' : '₹799'}</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                    /month {billingPeriod === 'yearly' && <span style={{ fontSize: '0.62rem', display: 'block', color: 'var(--text-dim)', fontWeight: 'normal', marginTop: 2 }}>(billed ₹9,588 annually)</span>}
                  </span>
                </div>
                <div class="tax-label">GST included</div>
                <ul class="plan-feature-list">
                  <li><span class="check-blue">✓</span> 5 AI Agents</li>
                  <li><span class="check-blue">✓</span> 10 GB Knowledge Storage</li>
                  <li><span class="check-blue">✓</span> 1,000 Messages / month</li>
                  <li><span class="check-blue">✓</span> Email Support</li>
                </ul>
              </div>
              <div>
                <Link href="/signup" class="btn-hero-primary" style={{ width: '100%' }}>Request Access</Link>
                <div class="sub-trial-label">Join Invitation List</div>
              </div>
            </div>

            {/* Growth Card */}
            <div class="price-card popular">
              <span class="most-popular-badge">Most Popular</span>
              <div>
                <div class="plan-title">Growth</div>
                <div class="plan-sub">For growing businesses and teams</div>
                <div class="plan-amount">
                  <span>{billingPeriod === 'monthly' ? '₹4,999' : '₹3,999'}</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                    /month {billingPeriod === 'yearly' && <span style={{ fontSize: '0.62rem', display: 'block', color: 'var(--text-dim)', fontWeight: 'normal', marginTop: 2 }}>(billed ₹47,988 annually)</span>}
                  </span>
                </div>
                <div class="tax-label">GST included</div>
                <ul class="plan-feature-list">
                  <li><span class="check-blue">✓</span> 25 AI Agents</li>
                  <li><span class="check-blue">✓</span> 50 GB Knowledge Storage</li>
                  <li><span class="check-blue">✓</span> 10,000 Messages / month</li>
                  <li><span class="check-blue">✓</span> Priority Support</li>
                </ul>
              </div>
              <div>
                <Link href="/signup" class="btn-hero-primary" style={{ width: '100%' }}>Request Access</Link>
                <div class="sub-trial-label">Join Invitation List</div>
              </div>
            </div>

            {/* Enterprise Card */}
            <div class="price-card">
              <div>
                <div class="plan-title">Enterprise</div>
                <div class="plan-sub">For large organizations</div>
                <div class="plan-amount">Custom</div>
                <div class="tax-label">Talk to sales</div>
                <ul class="plan-feature-list">
                  <li><span class="check-blue">✓</span> Unlimited Agents</li>
                  <li><span class="check-blue">✓</span> Custom Storage</li>
                  <li><span class="check-blue">✓</span> Custom Messages</li>
                  <li><span class="check-blue">✓</span> Dedicated Support & SLA</li>
                </ul>
              </div>
              <div>
                <Link href="/login" class="btn-hero-secondary" style={{ width: '100%' }}>Book a Demo</Link>
              </div>
            </div>

            {/* Custom Solution Card */}
            <div class="price-card" style={{ background: '#F8FAFC' }}>
              <div>
                <div class="plan-title" style={{ fontSize: '1.15rem' }}>Need something custom?</div>
                <div class="plan-sub">We'll build it for your Business.</div>
                <ul class="plan-feature-list" style={{ marginTop: 16 }}>
                  <li><span class="check-blue">✓</span> On-Premise Deployment</li>
                  <li><span class="check-blue">✓</span> VPC & Network Isolation</li>
                  <li><span class="check-blue">✓</span> Custom Integrations</li>
                  <li><span class="check-blue">✓</span> Dedicated Account Manager</li>
                </ul>
              </div>
              <div>
                <a href="mailto:sales@neuravolt.cloud" class="btn-hero-primary" style={{ width: '100%' }}>Talk to Sales Team</a>
                <div class="waitlist-avatars-row" style={{ justifyContent: 'center', marginTop: 8 }}>
                  <div class="avatar-stack">
                    <img src="/assets/user-avatar.jpg" alt="Team" />
                    <img src="/assets/avatar2.jpg" alt="Team" />
                    <img src="/assets/avatar3.jpg" alt="Team" />
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>India based team</span>
                </div>
              </div>
            </div>
          </div>

          <div class="pricing-guarantees-bar">
            <span><ShieldCheck style={{ width: 14, height: 14, color: '#2563EB' }} /> No Credit Card Required</span>
            <span><Clock style={{ width: 14, height: 14, color: '#2563EB' }} /> Instant Invitation List</span>
            <span><FileText style={{ width: 14, height: 14, color: '#2563EB' }} /> GST Invoice Provided</span>
          </div>

          {/* FINAL BLUE CTA BANNER */}
          <div class="final-blue-banner">
            <div class="ai-3d-badge-graphic">N</div>

            <div class="final-cta-center">
              <h2 class="final-cta-title">Ready to Build the Future with AI?</h2>
              <div class="final-cta-sub">
                Join thousands of Indian businesses building secure and compliant AI applications with Xarwiz.
              </div>

              <div class="final-cta-btns">
                <Link href="/signup" class="btn-cta-white">Request Access</Link>
                <Link href="/login" class="btn-cta-outline">Book Live Demo</Link>
              </div>
            </div>

            <div class="final-cta-right">
              <div><span style={{ color: '#10B981', fontWeight: 800, marginRight: 6 }}>✓</span> No Credit Card</div>
              <div><span style={{ color: '#10B981', fontWeight: 800, marginRight: 6 }}>✓</span> Deploy in 5 Minutes</div>
              <div><span style={{ color: '#10B981', fontWeight: 800, marginRight: 6 }}>✓</span> Cancel Anytime</div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer class="footer-container">
        <div class="container">
          <div class="footer-grid-6col">
            <div>
              <div class="logo-container" style={{ marginBottom: 8 }}>
                <img src="/assets/xarwiz-logo.png" alt="Xarwiz" className="brand-logo-img" />
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: 10 }}>AI Cloud Platform</div>
              <p class="footer-brand-desc">
                India's DPDP-compliant AI cloud platform for AI Agents, Workflows, Multi-Language LLMs and Enterprise AI applications.
              </p>
              <div class="social-icons-row">
                <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '1.1rem' }}>𝕏</a>
                <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '1.1rem', fontWeight: 'bold' }}>in</a>
                <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '1.1rem' }}>▶</a>
                <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '1.1rem' }}>🐙</a>
              </div>
            </div>

            <div>
              <div class="footer-col-title">Platform</div>
              <ul class="footer-links">
                <li><Link href="/signup">AI Agent Builder</Link></li>
                <li><Link href="/signup">Knowledge Base</Link></li>
                <li><Link href="/signup">Workflows</Link></li>
                <li><Link href="/signup">Multi-Language LLMs</Link></li>
              </ul>
            </div>

            <div>
              <div class="footer-col-title">Solutions</div>
              <ul class="footer-links">
                <li><Link href="/signup">Enterprise AI</Link></li>
                <li><Link href="/signup">DPDP Compliance</Link></li>
                <li><Link href="/signup">Customer Support</Link></li>
                <li><Link href="/signup">Healthcare AI</Link></li>
              </ul>
            </div>

            <div>
              <div class="footer-col-title">Developers</div>
              <ul class="footer-links">
                <li><Link href="/signup">API Documentation</Link></li>
                <li><Link href="/signup">REST & SDKs</Link></li>
                <li><Link href="/signup">Webhooks</Link></li>
                <li><Link href="/signup">GitHub Integration</Link></li>
              </ul>
            </div>

            <div>
              <div class="footer-col-title">Pricing</div>
              <ul class="footer-links">
                <li><a href="#pricing">Starter Plan</a></li>
                <li><a href="#pricing">Growth Plan</a></li>
                <li><a href="#pricing">Enterprise Custom</a></li>
                <li><a href="#pricing">Save 20% Annual</a></li>
              </ul>
            </div>

            <div>
              <div class="footer-col-title">Resources</div>
              <ul class="footer-links">
                <li><Link href="/security">Security</Link></li>
                <li><Link href="/privacy">Privacy Policy</Link></li>
                <li><Link href="/terms">Terms of Service</Link></li>
                <li><Link href="/aup">Acceptable Use</Link></li>
              </ul>
            </div>

            <div>
              <div class="footer-col-title">Company</div>
              <ul class="footer-links">
                <li><Link href="/neuravolt">About Xarwiz</Link></li>
                <li><Link href="/login">Contact Team</Link></li>
                <li><Link href="/login">Careers</Link></li>
              </ul>
            </div>
          </div>

          <div class="footer-bottom-bar">
            <div>© 2025 Neuravolt Technologies Pvt. Ltd. All rights reserved.</div>
            <div class="footer-bottom-selectors">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>Made in India <img src="/assets/india-flag.svg" alt="India Flag" style={{ width: 16, height: 11, borderRadius: 1, objectFit: 'cover' }} /> ▾</span>
              <span>English ▾</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
