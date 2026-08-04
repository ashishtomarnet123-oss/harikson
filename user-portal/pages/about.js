import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import FooterSection from '../components/FooterSection';

export default function AboutPage() {
  const [activeFaq, setActiveFaq] = useState(null);

  const toggleFaq = (idx) => {
    setActiveFaq(activeFaq === idx ? null : idx);
  };

  return (
    <div style={{
      backgroundColor: '#ffffff',
      color: '#0f172a',
      minHeight: '100vh',
      fontFamily: "'Inter', sans-serif"
    }}>
      <Head>
        <title>About Xarwiz — India's AI Business Operating System</title>
        <meta name="description" content="Xarwiz is an AI-native business operating system that unifies AI agents, workflow automation, knowledge management, cloud services, and enterprise security into one intelligent platform." />
        <meta property="og:title" content="About Xarwiz — India's AI Business Operating System" />
        <meta property="og:description" content="Xarwiz unifies essential business capabilities into one intelligent platform—from AI agents and workflow automation to knowledge management, collaboration, and enterprise-grade security." />
        <meta property="og:type" content="website" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      {/* HEADER */}
      <header className="header" style={{ position: 'sticky', top: 0, zIndex: 100, background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '14px 0' }}>
        <div className="container" style={{ maxWidth: '1360px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" className="logo-container" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <img src="/assets/xarwiz-logo.png" alt="Xarwiz" className="logo-img" style={{ height: '30px', width: 'auto' }} />
            <span className="logo-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '20px', background: '#EFF6FF', border: '1px solid #BFDBFE', fontSize: '0.72rem', color: '#1E40AF', fontWeight: '700' }}>
              AI Cloud Platform
            </span>
          </Link>

          <nav>
            <ul style={{ display: 'flex', gap: '28px', listStyle: 'none', fontSize: '0.92rem', fontWeight: '600', color: '#475569' }}>
              <li><Link href="/neuravolt" style={{ textDecoration: 'none', color: '#475569' }}>Platform</Link></li>
              <li><Link href="/neuravolt#solutions" style={{ textDecoration: 'none', color: '#475569' }}>Solutions</Link></li>
              <li><Link href="/pricing" style={{ textDecoration: 'none', color: '#475569' }}>Pricing</Link></li>
              <li><Link href="/about" style={{ textDecoration: 'none', color: '#2563eb', fontWeight: '700' }}>About Xarwiz</Link></li>
            </ul>
          </nav>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Link href="/login" style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', textDecoration: 'none', color: '#0f172a', fontSize: '0.88rem', fontWeight: '600' }}>Book a Demo</Link>
            <Link href="/signup" style={{ padding: '8px 16px', borderRadius: '8px', background: '#2563eb', color: '#ffffff', textDecoration: 'none', fontSize: '0.88rem', fontWeight: '600' }}>Start Free Trial</Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section style={{
        position: 'relative',
        background: 'radial-gradient(circle at 50% 0%, #1e293b 0%, #0f172a 70%)',
        color: '#ffffff',
        padding: '100px 20px 120px 20px',
        textAlign: 'center',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 5, maxWidth: '920px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 18px', borderRadius: '20px', background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(59,130,246,0.25)', color: '#3b82f6', fontSize: '0.88rem', fontWeight: '700', marginBottom: '20px' }}>
            India's AI Business Operating System
          </div>

          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '3.4rem', fontWeight: 800, lineHeight: 1.15, marginBottom: '20px', letterSpacing: '-0.03em' }}>
            Everything Your Business Needs.<br />
            <span style={{ background: 'linear-gradient(90deg, #60a5fa, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>One Intelligent Platform.</span>
          </h1>

          <p style={{ fontSize: '1.2rem', color: '#94a3b8', lineHeight: 1.65, maxWidth: '840px', margin: '0 auto 36px auto' }}>
            Running a business shouldn't mean juggling dozens of disconnected tools. Xarwiz brings everything together from AI agents and workflow automation to knowledge management, collaboration, cloud services, and enterprise security so your team can focus on building, growing, and delivering better results.
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" style={{ padding: '14px 32px', fontSize: '1rem', background: '#2563eb', color: '#ffffff', borderRadius: '8px', textDecoration: 'none', fontWeight: '700' }}>Start Free Trial</Link>
            <Link href="/login" style={{ padding: '14px 32px', fontSize: '1rem', border: '1px solid rgba(255,255,255,0.4)', color: '#0f172a', background: '#ffffff', borderRadius: '8px', textDecoration: 'none', fontWeight: '600' }}>Book a Demo</Link>
          </div>
        </div>
      </section>

      {/* SECTION 2 — WHO WE ARE */}
      <section style={{ padding: '90px 20px', background: '#ffffff' }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', padding: '4px 14px', borderRadius: '20px', background: '#eff6ff', color: '#2563eb', fontSize: '0.82rem', fontWeight: '700', marginBottom: '16px' }}>Who We Are</div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>Building the Future of AI-Powered Business</h2>
            <p style={{ fontSize: '1.1rem', color: '#475569', maxWidth: '780px', margin: '0 auto 40px auto', lineHeight: 1.65 }}>Technology has transformed the way businesses operate, but the software they rely on is still fragmented. Teams switch between countless applications every day—one for communication, another for documents, another for automation, another for analytics, and yet another for AI. Instead of making work simpler, technology often creates more complexity.</p>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '36px', margin: '32px 0 48px 0', fontSize: '1.05rem', lineHeight: 1.75, color: '#334155' }}>
            <p style={{ marginBottom: '16px', fontWeight: 700, color: '#0f172a', fontSize: '1.25rem' }}>Xarwiz was founded to change that.</p>
            <p style={{ marginBottom: '16px' }}>We are building an AI-native business operating system that brings together everything modern organizations need to work smarter. From intelligent AI agents and workflow automation to knowledge management, cloud infrastructure, collaboration, and enterprise-grade security, Xarwiz unifies essential business capabilities into one intelligent platform.</p>
            <p style={{ marginBottom: '16px' }}>Rather than adding another tool to your workflow, Xarwiz becomes the platform that connects your workflows.</p>
            <p style={{ margin: 0 }}>Whether you're a startup building your first product, a growing agency managing multiple clients, or an enterprise looking to modernize operations, Xarwiz helps your teams automate repetitive work, organize knowledge, collaborate efficiently, and make faster decisions with AI.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px' }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '32px' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>Who We Build For</h3>
              <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '16px' }}>Xarwiz is designed for organizations that want to spend less time managing software and more time creating value.</p>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.92rem', color: '#334155' }}>
                <li>• Startups scaling quickly with limited resources</li>
                <li>• Small and medium businesses modernizing their operations</li>
                <li>• Marketing and creative agencies managing multiple clients</li>
                <li>• Developers building AI-powered products</li>
                <li>• Enterprise teams looking for secure AI adoption</li>
                <li>• Founders who want one platform instead of ten</li>
              </ul>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '32px' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>What Makes Xarwiz Different</h3>
              <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '14px' }}>Most software solves a single problem. <strong>Xarwiz solves how businesses work as a whole.</strong></p>
              <p style={{ color: '#475569', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '14px' }}>Instead of offering isolated features, we combine AI, automation, collaboration, cloud services, knowledge management, and enterprise infrastructure into one connected ecosystem where every product works together seamlessly.</p>
              <div style={{ background: '#eff6ff', borderLeft: '4px solid #2563eb', padding: '12px 16px', borderRadius: '0 8px 8px 0', fontSize: '0.9rem', color: '#1e40af', fontWeight: 600 }}>
                We believe businesses shouldn't have to build their workflows around software. Software should adapt to the way businesses work.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3 — WHY XARWIZ EXISTS */}
      <section style={{ padding: '90px 20px', background: '#fafafc', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', padding: '4px 14px', borderRadius: '20px', background: '#eff6ff', color: '#2563eb', fontSize: '0.82rem', fontWeight: '700', marginBottom: '16px' }}>Why Xarwiz Exists</div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>The Way We Work Has Changed. Business Software Hasn't.</h2>
            <p style={{ fontSize: '1.1rem', color: '#475569', maxWidth: '780px', margin: '0 auto 40px auto', lineHeight: 1.65 }}>Businesses today have access to more software than ever before, yet productivity continues to suffer.</p>
          </div>

          <div style={{ fontSize: '1.02rem', lineHeight: 1.7, color: '#334155', maxWidth: '900px', margin: '0 auto' }}>
            <p style={{ marginBottom: '16px' }}>Teams spend valuable hours switching between applications, copying information, managing repetitive tasks, and trying to keep disconnected systems synchronized. Instead of helping businesses move faster, technology often slows them down.</p>
            <p style={{ marginBottom: '16px' }}>A simple customer journey may involve a CRM, project management software, communication tools, cloud storage, spreadsheets, AI assistants, email platforms, analytics dashboards, and automation software. Each tool stores information separately. Each tool requires another subscription. Each tool creates another workflow to manage.</p>
            
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px 32px', margin: '24px 0' }}>
              <strong style={{ color: '#dc2626', fontSize: '1.05rem', display: 'block', marginBottom: '8px' }}>The Result of Disconnected Tools:</strong>
              <div style={{ color: '#64748b', fontSize: '0.95rem' }}>Scattered knowledge, duplicated work, higher software costs, and unnecessary operational complexity.</div>
            </div>

            <p style={{ marginBottom: '16px' }}>Artificial intelligence has introduced incredible new possibilities, but most AI products exist as standalone chat interfaces with little connection to the systems businesses actually use every day. Businesses don't need another AI chatbot. They need AI that understands their data, connects their tools, automates their processes, and works alongside their teams.</p>

            <p style={{ marginBottom: '16px', fontWeight: 700, color: '#0f172a', fontSize: '1.15rem' }}>That's why we created Xarwiz.</p>

            <p style={{ marginBottom: '16px' }}>Our goal isn't simply to build another software platform. Our goal is to simplify the way businesses operate by bringing intelligence, automation, collaboration, and knowledge into one unified ecosystem.</p>

            <p style={{ margin: 0, fontWeight: 600, color: '#2563eb' }}>When everything works together, teams move faster, decisions become smarter, and businesses can focus on growth instead of managing technology.</p>
          </div>
        </div>
      </section>

      {/* SECTION 4 — OUR MISSION */}
      <section style={{ padding: '90px 20px', background: '#ffffff' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', padding: '4px 14px', borderRadius: '20px', background: '#eff6ff', color: '#2563eb', fontSize: '0.82rem', fontWeight: '700', marginBottom: '16px' }}>Our Mission</div>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '2.8rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.25, marginBottom: '24px' }}>
            "Our mission is to make artificial intelligence practical, accessible, and genuinely useful for every business."
          </h2>
          <p style={{ fontSize: '1.12rem', color: '#475569', lineHeight: 1.7, marginBottom: '24px' }}>
            We believe AI should do more than answer questions. It should reduce repetitive work, simplify complex processes, improve collaboration, and help people make better decisions every day. At Xarwiz, we are building technology that empowers people—not replaces them.
          </p>
          <div style={{ background: '#eff6ff', borderRadius: '16px', padding: '24px', fontSize: '1.05rem', color: '#1e40af', fontWeight: 600, maxWidth: '720px', margin: '0 auto' }}>
            Guided by a simple principle: Technology should remove friction, not create it.
          </div>
        </div>
      </section>

      {/* SECTION 5 — OUR VISION */}
      <section style={{ padding: '90px 20px', background: '#0f172a', color: '#ffffff' }}>
        <div style={{ maxWidth: '1140px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <div style={{ display: 'inline-flex', padding: '4px 14px', borderRadius: '20px', background: 'rgba(255,255,255,0.1)', color: '#60a5fa', fontSize: '0.82rem', fontWeight: '700', marginBottom: '16px' }}>The Horizon Ahead</div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '2.5rem', fontWeight: 800, color: '#ffffff', marginBottom: '16px' }}>Building the Next Generation Business Operating System</h2>
            <p style={{ fontSize: '1.1rem', color: '#94a3b8', maxWidth: '780px', margin: '0 auto' }}>We don't see AI as another software category. We believe it will become the foundation of how every business operates.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px' }}>
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '32px', color: '#ffffff' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Our Five-Year Vision</div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '12px' }}>Leading Intelligent Automation Platform</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.65 }}>To become one of the leading AI platforms helping startups, agencies, and businesses automate everyday work through intelligent agents, connected workflows, and enterprise-ready infrastructure.</p>
            </div>

            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '32px', color: '#ffffff' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Our Ten-Year Vision</div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '12px' }}>Global Unified Operating System</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.65 }}>To power organizations around the world with an AI operating system where communication, automation, knowledge, cloud infrastructure, and business intelligence work together seamlessly.</p>
            </div>

            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '32px', color: '#ffffff' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Our Long-Term Ambition</div>
              <h3 style={{ fontSize: '1.35rem', fontWeight 700, marginBottom: '12px' }}>One Single Intelligent Ecosystem</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.65 }}>Our ambition is to build a platform where businesses no longer need dozens of disconnected applications. We envision a future where every organization has its own intelligent workforce powered by AI—and Xarwiz becomes the platform that makes it possible.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 8 — THE XARWIZ SOLUTION */}
      <section style={{ padding: '90px 20px', background: '#ffffff' }}>
        <div style={{ maxWidth: '1140px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', padding: '4px 14px', borderRadius: '20px', background: '#eff6ff', color: '#2563eb', fontSize: '0.82rem', fontWeight: '700', marginBottom: '16px' }}>The Solution</div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '2.5rem', fontWeight 800, color: '#0f172a', marginBottom: '16px' }}>One Platform. Endless Possibilities.</h2>
            <p style={{ fontSize: '1.1rem', color: '#475569', maxWidth: '780px', margin: '0 auto 40px auto', lineHeight: 1.65 }}>Xarwiz brings together everything businesses need into one connected platform designed for the AI era. Instead of managing separate applications, your team works from a single intelligent workspace where every product, workflow, and piece of information is connected.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px' }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>AI Workspace</h3>
              <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.65, margin: 0 }}>A centralized environment where your team can collaborate with AI, access information, and complete work faster without switching between multiple applications.</p>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight 700, color: '#0f172a', marginBottom: '12px' }}>AI Agents</h3>
              <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.65, margin: 0 }}>Create intelligent AI agents that assist employees, automate routine tasks, answer questions, and execute business workflows around the clock.</p>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight 700, color: '#0f172a', marginBottom: '12px' }}>Workflow Automation</h3>
              <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.65, margin: 0 }}>Automate repetitive processes across departments, reduce manual effort, and ensure work moves efficiently from one stage to the next.</p>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight 700, color: '#0f172a', marginBottom: '12px' }}>Business Intelligence</h3>
              <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.65, margin: 0 }}>Transform your business data into actionable insights with AI-powered reporting, analytics, and decision support.</p>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight 700, color: '#0f172a', marginBottom: '12px' }}>Cloud Infrastructure</h3>
              <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.65, margin: 0 }}>Securely store, organize, and manage business data with scalable cloud services built for performance and reliability.</p>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight 700, color: '#0f172a', marginBottom: '12px' }}>Team Collaboration</h3>
              <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.65, margin: 0 }}>Bring conversations, documents, tasks, and projects into one shared workspace so teams can collaborate more effectively.</p>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight 700, color: '#0f172a', marginBottom: '12px' }}>Integrations &amp; APIs</h3>
              <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.65, margin: 0 }}>Connect Xarwiz with your existing tools and workflows through flexible APIs and integrations, ensuring a seamless experience without disrupting your current systems.</p>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight 700, color: '#0f172a', marginBottom: '12px' }}>Secure Data Management</h3>
              <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.65, margin: 0 }}>Protect your organization's information with enterprise-grade encryption, access controls, audit logs, and compliance-ready security architecture.</p>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight 700, color: '#0f172a', marginBottom: '12px' }}>Enterprise AI</h3>
              <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.65, margin: 0 }}>Deliver AI experiences that understand your organization's knowledge, context, and workflows—providing relevant, accurate, and secure assistance tailored to your business.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQS SECTION */}
      <section style={{ padding: '90px 20px', background: '#fafafc', borderTop: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ display: 'inline-flex', padding: '4px 14px', borderRadius: '20px', background: '#eff6ff', color: '#2563eb', fontSize: '0.82rem', fontWeight: '700', marginBottom: '16px' }}>FAQ</div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '2.5rem', fontWeight 800, color: '#0f172a' }}>Frequently Asked Questions</h2>
          </div>

          {[
            { q: "What is Xarwiz?", a: "Xarwiz is India's AI Business Operating System. Running a business shouldn't mean juggling dozens of disconnected tools. Xarwiz brings everything together—from AI agents and workflow automation to knowledge management, collaboration, cloud services, and enterprise security." },
            { q: "How does Xarwiz protect our enterprise data?", a: "Xarwiz is built with enterprise-grade security, role-based access controls (RBAC), end-to-end encryption, audit logs, and compliance-ready architecture keeping your business secure at every step." }
          ].map((item, idx) => (
            <div key={idx} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', marginBottom: '12px', background: '#ffffff', overflow: 'hidden' }}>
              <div
                onClick={() => toggleFaq(idx)}
                style={{ padding: '20px 24px', fontWeight 700, fontSize: '1.05rem', color: '#0f172a', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span>{item.q}</span>
                <span>{activeFaq === idx ? '▲' : '▼'}</span>
              </div>
              {activeFaq === idx && (
                <div style={{ padding: '0 24px 20px 24px', fontSize: '0.95rem', color: '#475569', lineHeight: 1.6 }}>
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CALL TO ACTION SECTION */}
      <section style={{ background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)', color: '#ffffff', padding: '90px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '3rem', fontWeight 800, marginBottom: '20px', lineHeight: 1.15 }}>
            Everything Your Business Needs.<br />One Intelligent Platform.
          </h2>
          <p style={{ fontSize: '1.15rem', color: 'rgba(255,255,255,0.9)', marginBottom: '36px', lineHeight: 1.6 }}>
            Build, grow, and deliver better results with India's AI Business Operating System.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" style={{ background: '#ffffff', color: '#1e40af', fontWeight: 700, padding: '14px 32px', borderRadius: '8px', textDecoration: 'none', fontSize: '1rem' }}>Start Free Trial</Link>
            <Link href="/login" style={{ border: '1px solid rgba(255,255,255,0.4)', color: '#ffffff', padding: '14px 32px', borderRadius: '8px', textDecoration: 'none', fontSize: '1rem', fontWeight: 600 }}>Book a Demo</Link>
          </div>
        </div>
      </section>

      {/* EXACT REUSED SHARED GLOBAL FOOTER */}
      <FooterSection />
    </div>
  );
}
