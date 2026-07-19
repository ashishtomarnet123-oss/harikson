import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, Search, Shield, Eye, ShieldAlert, Cpu, Database, RefreshCw, AlertCircle, HelpCircle, ChevronRight } from 'lucide-react';

export default function SecurityPolicyPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All Policy Sections', icon: Shield },
    { id: 'intro', name: 'Introduction & Basics', icon: Eye, range: [1, 4] },
    { id: 'iam', name: 'Access Control & Data Tiers', icon: LockIcon, range: [5, 7] },
    { id: 'ai', name: 'AI Safety & Infrastructure', icon: Cpu, range: [8, 10] },
    { id: 'devsecops', name: 'DevSecOps & Application', icon: Database, range: [11, 13] },
    { id: 'monitoring', name: 'Telemetry & Detection', icon: RefreshCw, range: [14, 16] },
    { id: 'incident', name: 'Incident & Continuity', icon: AlertCircle, range: [17, 18] },
    { id: 'vendor', name: 'Vendors & Operations', icon: HelpCircle, range: [19, 21] },
    { id: 'governance', name: 'Rights & Enforcement', icon: ScaleIcon, range: [22, 29] },
    { id: 'appendices', name: 'Appendices (A-F)', icon: Shield, range: [30, 35] }
  ];

  // Helper custom icons
  function LockIcon(props) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    );
  }

  function ScaleIcon(props) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="m16 16 3-8 3 8c-.87.74-1.92 1-3 1s-2.13-.26-3-1Z" />
        <path d="m2 16 3-8 3 8c-.87.74-1.92 1-3 1s-2.13-.26-3-1Z" />
        <path d="M7 21h10" />
        <path d="M12 2v19" />
      </svg>
    );
  }

  const sectionsData = [
    { num: 1, cat: 'intro', title: 'Introduction', content: 'This Security Policy governs the technological safeguards, cloud architecture, and organizational security protocols deployed by Harikson AI Technologies Private Limited, Sector 62, Noida, Uttar Pradesh, India - 201301.' },
    { num: 2, cat: 'intro', title: 'Security Principles', content: 'Our security architecture is governed by Confidentiality & Least Privilege (restricting data using Row-Level Security), Defense in Depth (multi-layered network boundaries), Zero Trust validation, and Privacy/AI Safety by Design.' },
    { num: 3, cat: 'intro', title: 'Governance', content: 'Our security operations are led by our CISO, who coordinates threat assessments. DevSecOps handles pipeline safety and container updates, while Risk Management conducts quarterly audits.' },
    { num: 4, cat: 'intro', title: 'Compliance', content: 'We comply with India\'s DPDP Act 2023, IT Act 2000, CERT-In Directions (incident notification reporting within 6 hours), ISO/IEC 27001 standard practices, and SOC 2 Type II controls.' },
    
    { num: 5, cat: 'iam', title: 'Identity & Access Management (IAM)', content: 'We enforce identity controls including mandatory Multi-Factor Authentication (MFA), SAML SSO integrations, Role-Based Access Control (RBAC), and immediate token revocation upon user offboarding.' },
    { num: 6, cat: 'iam', title: 'Data Classification', content: 'We classify data into: Tier 1 (Public specs), Tier 2 (Internal telemetry), Tier 3 (Confidential customer profiles), and Tier 4 (Restricted vector contexts, hashed passwords, API keys).' },
    { num: 7, cat: 'iam', title: 'Data Protection', content: 'We enforce TLS 1.3 encryption in transit and AES-256 encryption at rest. Decryption keys are rotated annually via cloud KMS. Hashing is used for credentials.' },
    
    { num: 8, cat: 'ai', title: 'AI & LLM Security', content: 'To address the OWASP LLM Top 10 risks, we implement real-time prompt moderation, jailbreak filters, indirect prompt injection shields, and database multi-tenant RLS boundaries.' },
    { num: 9, cat: 'ai', title: 'Infrastructure Security', content: 'We isolate internal databases inside secure cloud Virtual Private Clouds (VPCs). Docker containers are scanned daily and traffic is routed via CDNs with DDoS mitigation.' },
    { num: 10, cat: 'ai', title: 'API Security', content: 'APIs are secured using cryptographically signed JWT auth tokens, rate limiting via Redis middleware, request schema validation, and strict API key isolation.' },
    
    { num: 11, cat: 'devsecops', title: 'Application Security', content: 'Static analysis (SAST) and Software Composition Analysis (SCA) run automatically on pull requests. Outdated dependencies are updated daily, and secret scanners block exposed keys.' },
    { num: 12, cat: 'devsecops', title: 'DevSecOps', content: 'CI/CD pipeline builds require signed commits. Pipeline security and artifact signing ensure build integrity, supported by automated rollbacks.' },
    { num: 13, cat: 'devsecops', title: 'Endpoint Security', content: 'Developer laptops enforce full disk encryption, MDM software rules, antivirus checks, and remote wipe capabilities.' },
    
    { num: 14, cat: 'monitoring', title: 'Logging & Monitoring', content: 'We log user actions (logins, workspace updates, plan cancels) in database logs. Logs are consolidated to SIEM alerts and kept for 180 days per IT Rules 2021.' },
    { num: 15, cat: 'monitoring', title: 'Threat Detection', content: 'Automated monitors identify rate abuses, spikes in failed logins (indicative of credential stuffing), and prompt patterns matching jailbreaks.' },
    { num: 16, cat: 'monitoring', title: 'Vulnerability Management', content: 'We run daily composition scans. SLA for critical fixes is 48 hours; high-severity fixes within 7 days. Independent penetration tests are conducted annually.' },
    
    { num: 17, cat: 'incident', title: 'Incident Response', content: 'We utilize a six-phase incident plan: Preparation, Detection, Containment, Eradication, Recovery, and Reporting. Incident alerts are reported to CERT-In within 6 hours.' },
    { num: 18, cat: 'incident', title: 'Disaster Recovery (BCDR)', content: 'Geo-redundant logical backups are created daily. Target RPO is 24 hours and RTO is 4 hours, verified by annual failover tests.' },
    
    { num: 19, cat: 'vendor', title: 'Third-Party Vendor Security', content: 'We audit subprocessors before integration. Main vendors include cloud hosts (AWS India, Cloudflare), billing gates (Stripe, Razorpay), and model providers (OpenAI, Anthropic).' },
    { num: 20, cat: 'vendor', title: 'Physical Security', content: 'Noida offices enforce visitor logs and keycards. Vector indices are stored in ISO 27001 certified AWS server centers.' },
    { num: 21, cat: 'vendor', title: 'Employee Security', content: 'Background checks are run before onboarding. Security awareness and phishing tests are conducted annually.' },
    
    { num: 22, cat: 'governance', title: 'Customer Responsibilities', content: 'Users must set long passwords, activate Multi-Factor Authentication (MFA), and protect workspace keys.' },
    { num: 23, cat: 'governance', title: 'Security Incident Reporting', content: 'Security flaws can be reported directly to security@harikson.ai. We investigate all bug reports under responsible disclosure.' },
    { num: 24, cat: 'governance', title: 'Security Audits', content: 'Internal code audits are run before key upgrades. Independent external compliance reviews are run annually.' },
    { num: 25, cat: 'governance', title: 'Data Retention & Secure Deletion', content: 'Active database rows are purged within 30 days of user erasure. Billing invoices are stored for 8 years to meet statutory tax audits.' },
    { num: 26, cat: 'governance', title: 'Privacy & Data Protection', content: 'We collect minimal user metrics. Consent is requested for cross-border transfers. Check our Privacy Policy for more details.' },
    { num: 27, cat: 'governance', title: 'AI Risk Management', content: 'We monitor prompt leakage, model theft risks, and output manipulation using safety boundaries.' },
    { num: 28, cat: 'governance', title: 'Enforcement', content: 'Policy violations result in warning emails, temporary query limits, workspace suspension, or reporting to law authorities.' },
    { num: 29, cat: 'governance', title: 'Contact Information', content: 'Harikson AI Technologies Private Limited, Sector 62, Noida, Uttar Pradesh, India - 201301. Grievance Officer: Ashish Pratap Singh Tomar (grievance@harikson.ai).' },
    
    { num: 30, cat: 'appendices', title: 'APPENDIX A: Controls Mapping', content: 'Our security controls map directly to ISO 27001, SOC 2 Criteria, and the NIST CSF.' },
    { num: 31, cat: 'appendices', title: 'APPENDIX B: Encryption Standards', content: 'We mandate TLS 1.3 in transit and AES-256 for database tables.' },
    { num: 32, cat: 'appendices', title: 'APPENDIX C: Password Requirements', content: 'Minimum 12 characters, including capital letters, numbers, and symbols.' },
    { num: 33, cat: 'appendices', title: 'APPENDIX D: Incident Severity Matrix', content: 'P1 (Critical): Resolved within 12 hours. P2 (High): Resolved within 24 hours.' },
    { num: 34, cat: 'appendices', title: 'APPENDIX E: Customer Best Practices', content: 'Enable MFA, rotate API keys, and monitor workspace member rights.' },
    { num: 35, cat: 'appendices', title: 'APPENDIX F: Enterprise Security Features', content: 'Enterprise plans support SAML SSO, Custom Vector Keys (BYOK), IP allowlists, and dedicated VPC configurations.' }
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
        <title>Security Policy | Harikson AI Platform</title>
        <meta name="description" content="Harikson AI Security Policy - comprehensive technical controls compliant with Indian and global regulations." />
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
          Security Policy
        </h1>
        <p style={{
          fontSize: '18px',
          color: 'rgba(255,255,255,0.9)',
          maxWidth: '700px',
          margin: '0 auto',
          lineHeight: '1.6',
          fontWeight: '300'
        }}>
          Detailed technical safeguards, multi-tenant row isolation boundaries, vulnerability SLA, and CERT-In compliance.
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
            placeholder="Search security controls (e.g. CERT-In, SSO, BYOK...)"
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
                    whiteSpace: 'pre-line' // Preserve line breaks for tables, lists or annexures
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
                  We couldn&apos;t find any security controls matching &ldquo;{searchQuery}&rdquo;. Try using another query term.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
