import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, Search, HelpCircle, Shield, AlertOctagon, Scale, BookOpen, ChevronRight } from 'lucide-react';

export default function AcceptableUsePolicyPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All Policy Sections', icon: BookOpen },
    { id: 'intro', name: 'Introduction & Basics', icon: HelpCircle, range: [1, 3] },
    { id: 'permitted', name: 'Permitted & Prohibited', icon: AlertOctagon, range: [4, 5] },
    { id: 'ai', name: 'AI & High-Risk Case', icon: Shield, range: [6, 7] },
    { id: 'ip', name: 'IP & User Content', icon: Scale, range: [8, 10] },
    { id: 'developer', name: 'API & Workspaces', icon: LockIcon, range: [11, 13] },
    { id: 'enforce', name: 'Enforcement & Appeals', icon: AlertOctagon, range: [14, 18] },
    { id: 'governance', name: 'Governance & Contacts', icon: Scale, range: [19, 19] },
    { id: 'appendices', name: 'Appendices (A-E)', icon: BookOpen, range: [20, 24] }
  ];

  // Helper custom icon
  function LockIcon(props) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    );
  }

  const sectionsData = [
    { num: 1, cat: 'intro', title: 'Introduction', content: 'This Acceptable Use Policy ("AUP") governs the access and use of the website, applications, APIs, SDKs, browser extensions, and developer portals provided by Harikson AI Technologies Private Limited, Noida, Uttar Pradesh, India - 201301.' },
    { num: 2, cat: 'intro', title: 'Definitions', content: 'AI Model/LLM: Machine learning algorithms processing prompts. Prompt: Text, query, dataset, or file uploaded to generate a response. Output: AI-generated responses. Malicious Activity: Attempts to bypass system security, rate limits, or RLS parameters.' },
    { num: 3, cat: 'intro', title: 'General Principles', content: 'Every user must comply with applicable Indian and global laws, respect third-party intellectual property under the Copyright Act 1957, protect personal data privacy, and safeguard login credentials and API keys.' },
    
    { num: 4, cat: 'permitted', title: 'Permitted Uses', content: 'Permitted activities include business productivity enhancement, programming help, educational research, automatic database indexing, and workspace document classification using RAG configurations.' },
    { num: 5, cat: 'permitted', title: 'Prohibited Uses', content: 'Prohibited activities include: illegal activity & fraud; harassment & hate speech; cybersecurity exploits (ransomware, keyloggers, SQL injections, CSRF attacks); adversarial AI attacks (jailbreaking, safety bypass); and unauthorized automated scraping.' },
    
    { num: 6, cat: 'ai', title: 'AI-Specific Restrictions', content: 'Users must not use AI outputs to train competing machine learning models, deploy AI agents to generate spam or fake reviews, create deepfakes to impersonate real persons, or use AI for academic cheating.' },
    { num: 7, cat: 'ai', title: 'High-Risk Use Cases', content: 'The platform must not be the sole decision-maker for critical cases. Prohibited high-risk activities include medical diagnostics, legal advice, financial investment decisions, military operations, and nuclear system control.' },
    
    { num: 8, cat: 'ip', title: 'Intellectual Property Compliance', content: 'Users must not upload copyrighted files or pirated software without ownership rights, misuse trademarks, or bypass digital rights management (DRM) protections.' },
    { num: 9, cat: 'ip', title: 'User Content Responsibilities', content: 'You are solely responsible for all prompts, files, and vector indices uploaded to your tenant workspace. Ensure that uploads do not contain malicious scripts or infringe on privacy.' },
    { num: 10, cat: 'ip', title: 'Privacy and Confidentiality Requirements', content: 'Do not upload proprietary source code without authorization, plaintext passwords, private key files, or sensitive personal records without active consent.' },
    
    { num: 11, cat: 'developer', title: 'API Usage Rules', content: 'You must limit queries to the rate boundaries of your subscription tier. Prevent API key exposure (e.g. do not check keys into git), and do not deploy bots to create multiple API accounts.' },
    { num: 12, cat: 'developer', title: 'Enterprise Workspace Responsibilities', content: 'Workspace Administrators are responsible for revoking access for inactive team members, enforcing Multi-Factor Authentication (MFA), and auditing workspace prompt metadata logs.' },
    { num: 13, cat: 'developer', title: 'System Security Standards', content: 'Clients must access services through updated browsers. Security vulnerabilities must be reported immediately to security@harikson.ai. Do not exploit logical security flaws.' },
    
    { num: 14, cat: 'enforce', title: 'Abuse Detection and Monitoring', content: 'We run automated moderation scans on prompts to identify prohibited content, and monitor request frequencies to block mass automation, bot calls, and credential abuse.' },
    { num: 15, cat: 'enforce', title: 'Enforcement and Sanctions', content: 'Violations will result in formal warning warnings, temporary workspace rate limiting, permanent account termination, or reporting to legal authorities (CERT-In).' },
    { num: 16, cat: 'enforce', title: 'Reporting Violations', content: 'Submit reports of AUP infractions to: support@harikson.ai (support issues), security@harikson.ai (security concerns), or legal@harikson.ai (copyright alerts).' },
    { num: 17, cat: 'enforce', title: 'Appeals Process', content: 'You can submit review requests to appeals@harikson.ai within 14 business days. All decisions by our trust and safety audit team are final.' },
    { num: 18, cat: 'enforce', title: 'Changes to this Policy', content: 'We reserve the right to modify this AUP. Changes are published on this page with updated version histories.' },
    
    { num: 19, cat: 'governance', title: 'Contact Information', content: 'Company: Harikson AI Technologies Private Limited, Sector 62, Noida, Uttar Pradesh, India - 201301. Grievance Officer: Ashish Pratap Singh Tomar (grievance@harikson.ai).' },
    
    { num: 20, cat: 'appendices', title: 'APPENDIX A: Examples of Acceptable Use', content: 'Creating client summaries from parsed transcripts, converting legacy code to Python, or draft layout suggestions for interfaces.' },
    { num: 21, cat: 'appendices', title: 'APPENDIX B: Examples of Prohibited Use', content: 'Generating phishing email formats, or configuring bots to harvest database tables.' },
    { num: 22, cat: 'appendices', title: 'APPENDIX C: Examples of AI Misuse', content: 'Exploiting LLMs to write malware, or generating deepfake voice profiles to authorize financial transactions.' },
    { num: 23, cat: 'appendices', title: 'APPENDIX D: Security Best Practices', content: 'Set strong passwords, enable Multi-Factor Authentication (MFA), and store API keys in environment variables.' },
    { num: 24, cat: 'appendices', title: 'APPENDIX E: Responsible AI Principles', content: 'Users must align query practices with: Fairness (avoid bias), Transparency (state where AI is utilized), and Human Oversight (verify critical outputs before use).' }
  ];

  // Filter sections by search query and category tab
  const filteredSections = sectionsData.filter(sec => {
    const matchesCategory = activeCategory === 'all' || sec.cat === activeCategory;
    const matchesSearch = searchQuery === '' || 
      sec.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      sec.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `section ${sec.num}`.includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div style={{
      backgroundColor: '#f8fafc',
      color: '#1e293b',
      minHeight: '100vh',
      fontFamily: "'Outfit', sans-serif"
    }}>
      <Head>
        <title>Acceptable Use Policy | Harikson AI Platform</title>
        <meta name="description" content="Harikson AI Acceptable Use Policy - safe usage guidelines compliant with Indian and global regulations." />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      {/* Top Banner Gradient Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%)',
        color: '#ffffff',
        padding: '80px 20px 120px 20px',
        textAlign: 'center',
        position: 'relative',
        boxShadow: 'inset 0 -30px 40px rgba(0,0,0,0.03)'
      }}>
        <div style={{
          position: 'absolute',
          top: '25px',
          left: '20px'
        }}>
          <Link href="/">
            <a style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'rgba(255, 255, 255, 0.85)',
              textDecoration: 'none',
              fontSize: '14.5px',
              fontWeight: '500',
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '6px 14px',
              borderRadius: '20px',
              backdropFilter: 'blur(8px)',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            >
              <ArrowLeft size={16} />
              Back to Home
            </a>
          </Link>
        </div>

        <h1 style={{
          fontSize: '48px',
          fontWeight: '800',
          margin: '0 0 16px 0',
          letterSpacing: '-0.75px',
          textShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          Acceptable Use Policy
        </h1>
        <p style={{
          fontSize: '18px',
          color: 'rgba(255,255,255,0.9)',
          maxWidth: '700px',
          margin: '0 auto',
          lineHeight: '1.6',
          fontWeight: '300'
        }}>
          Clear boundaries governing developer integration parameters, workspace security, and model safety constraints on Harikson.
        </p>

        {/* Floating Search Container */}
        <div style={{
          position: 'absolute',
          bottom: '-30px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '650px',
          background: '#ffffff',
          borderRadius: '30px',
          padding: '4px 8px 4px 20px',
          display: 'flex',
          alignItems: 'center',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e2e8f0'
        }}>
          <Search size={20} color="#94a3b8" style={{ marginRight: '10px' }} />
          <input
            type="text"
            placeholder="Search across AUP rules (e.g. jailbreaking, RAG, scraping...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              width: '100%',
              fontSize: '15px',
              color: '#1e293b',
              padding: '10px 0'
            }}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                marginRight: '10px',
                fontSize: '13px'
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Container Layout */}
      <div style={{
        maxWidth: '1200px',
        margin: '60px auto 100px auto',
        padding: '0 20px',
        display: 'flex',
        gap: '40px',
        flexWrap: 'wrap'
      }}>
        {/* Sidebar Table of Contents */}
        <div style={{
          flex: '1 1 280px',
          position: 'relative'
        }}>
          <div style={{
            position: 'sticky',
            top: '40px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '24px 16px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
          }}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: '700',
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              margin: '0 0 16px 8px'
            }}>
              Table of Contents
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {categories.map(cat => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      background: isActive ? '#f0f6ff' : 'none',
                      border: 'none',
                      color: isActive ? '#1d4ed8' : '#475569',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: isActive ? '600' : '400',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.background = 'none';
                    }}
                  >
                    <Icon size={18} color={isActive ? '#1d4ed8' : '#94a3b8'} />
                    <span style={{ flex: 1 }}>{cat.name}</span>
                    <ChevronRight size={14} style={{
                      opacity: isActive ? 1 : 0,
                      transform: isActive ? 'translateX(0)' : 'translateX(-4px)',
                      transition: 'all 0.2s'
                    }} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div style={{
          flex: '3 1 600px'
        }}>
          {/* Metadata banner */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '20px 24px',
            marginBottom: '30px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
          }}>
            <div>
              <span style={{ color: '#64748b', fontSize: '13px' }}>Corporate Registry:</span>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginTop: '2px' }}>
                Harikson AI Technologies Pvt. Ltd. (CIN: U72900UP2026PTC123456)
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ color: '#64748b', fontSize: '13px' }}>Version:</span>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginTop: '2px' }}>
                v1.0.0 (Effective)
              </div>
            </div>
          </div>

          {/* Sections List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {filteredSections.length > 0 ? (
              filteredSections.map(sec => (
                <div
                  key={sec.num}
                  id={`section-${sec.num}`}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '24px 30px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.02)';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '12px'
                  }}>
                    <span style={{
                      fontSize: '13px',
                      fontWeight: '700',
                      background: '#eff6ff',
                      color: '#2563eb',
                      padding: '4px 10px',
                      borderRadius: '6px'
                    }}>
                      Section {sec.num}
                    </span>
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: '700',
                      color: '#0f172a',
                      margin: 0
                    }}>
                      {sec.title}
                    </h3>
                  </div>
                  <p style={{
                    fontSize: '15px',
                    lineHeight: '1.75',
                    color: '#475569',
                    margin: 0,
                    whiteSpace: 'pre-line' // Preserve line breaks for lists or appendices
                  }}>
                    {sec.content}
                  </p>
                </div>
              ))
            ) : (
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '60px 20px',
                textAlign: 'center',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
              }}>
                <Search size={40} color="#94a3b8" style={{ marginBottom: '16px' }} />
                <h4 style={{ fontSize: '18px', color: '#1e293b', margin: '0 0 8px 0' }}>No Sections Found</h4>
                <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
                  We couldn&apos;t find any safety rules matching &ldquo;{searchQuery}&rdquo;. Try using another query term.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
