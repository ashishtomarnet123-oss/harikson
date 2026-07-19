import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, Search, Shield, Eye, ShieldAlert, Cpu, Database, RefreshCw, AlertCircle, HelpCircle, ChevronRight } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All Policy Sections', icon: Shield },
    { id: 'intro', name: 'Introduction & Scope', icon: Eye, range: [1, 4] },
    { id: 'collection', name: 'Data Collection & Flow', icon: Database, range: [5, 7] },
    { id: 'legal', name: 'Legal Basis & Purpose', icon: ShieldAlert, range: [8, 9] },
    { id: 'ai', name: 'AI & Inference Handling', icon: Cpu, range: [10, 13] },
    { id: 'sharing', name: 'Sharing & Transfers', icon: RefreshCw, range: [14, 16] },
    { id: 'security', name: 'Security & Retention', icon: LockIcon, range: [17, 18] },
    { id: 'rights', name: 'Data Rights & SLA', icon: AlertCircle, range: [19, 21] },
    { id: 'thirdparty', name: 'Integrations & Incident', icon: HelpCircle, range: [22, 27] },
    { id: 'governance', name: 'Governance & Contacts', icon: Shield, range: [28, 33] }
  ];

  // Helper custom icon since lock is often used
  function LockIcon(props) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    );
  }

  const sectionsData = [
    { num: 1, cat: 'intro', title: 'Introduction', content: 'This Privacy Policy describes how Harikson AI Technologies Private Limited ("Harikson", "Company", "we", "us", or "our") processes, collects, stores, and protects personal data obtained from users of our Platform.' },
    { num: 2, cat: 'intro', title: 'About Us', content: 'Company: Harikson AI Technologies Private Limited. Registered Office Address: Sector 62, Noida, Uttar Pradesh, India - 201301. CIN: U72900UP2026PTC123456. Support Email: support@harikson.ai. Privacy Email: privacy@harikson.ai.' },
    { num: 3, cat: 'intro', title: 'Definitions', content: 'Personal Data: Data about an individual who is identifiable. Sensitive Personal Data: Passwords, financial or biometric credentials. Processing: Automated operations performed on data. Data Principal: The individual whose data is processed. Data Fiduciary: Entity determining processing purposes (Harikson).' },
    { num: 4, cat: 'intro', title: 'Scope of this Policy', content: 'This policy applies to our websites, dashboards, user portals, developer APIs, SDKs, mobile systems, browser extensions, and collaborative workspaces.' },
    
    { num: 5, cat: 'collection', title: 'Information We Collect', content: 'We collect: 1. Identity & Profile: Names, login credentials, dates of birth. 2. Contact & Billing: Corporate email, address, tax records (GSTIN), subscription history. 3. Metadata: IP addresses, timezone, language. 4. Prompt Data: Prompts, vector index documents, chat histories. 5. Telemetry Logs: Token counts, CPU usage, GPU latency.' },
    { num: 6, cat: 'collection', title: 'Information We Do NOT Collect', content: 'We do not collect passwords in cleartext (all entries are cryptographically hashed), primary card numbers (processed entirely by Stripe/Razorpay), or government identity numbers unless explicitly required under KYC laws.' },
    { num: 7, cat: 'collection', title: 'How We Collect Information', content: 'Data is collected directly when you register or upload prompts, automatically via platform diagnostic telemetry logs, and through third-party integrations (such as Google SSO or payment verification notifications).' },
    
    { num: 8, cat: 'legal', title: 'Legal Basis of Processing', content: 'We process personal data based on: 1. Consent (unconditional and unambiguous choice under the DPDP Act 2023). 2. Contractual Necessity (to fulfill billing plan limits). 3. Legal Obligations (complying with Indian tax rules and CERT-In directions). 4. Legitimate Interests (monitoring system abuse).' },
    { num: 9, cat: 'legal', title: 'Purpose of Processing', content: 'Your data is used for user account authentication, running RAG search pipelines, subscription renewals, security safety logs (preventing jailbreaks), system diagnostic optimizations, and support communications.' },
    
    { num: 10, cat: 'ai', title: 'AI-Specific Data Processing', content: 'During model inference, prompt inputs are vectorized and processed by baseline AI nodes. Prompts are also dynamically parsed through content moderation layers to identify malicious boundaries or illegal content.' },
    { num: 11, cat: 'ai', title: 'AI Training Policy', content: 'Harikson does NOT use prompt inputs, RAG documents, or generated outputs to train public baseline AI models. All workspace assets are isolated from public training runs. Opt-in consent is required for custom model refinements.' },
    { num: 12, cat: 'ai', title: 'Conversation History', content: 'We store history to display past queries. Users can delete chats to purge entries from active databases. History metrics can be exported in JSON format, and workspace owners can turn history logging off.' },
    { num: 13, cat: 'ai', title: 'Uploaded Files', content: 'Files uploaded to RAG vectors are parsed and stored in logically separated databases. Uploaded files are encrypted at rest using AES-256 and scanned for malware.' },
    
    { num: 14, cat: 'sharing', title: 'Sharing of Personal Data', content: 'We share data with hosting services, Stripe/Razorpay, and legal nodes when compelled by valid CERT-In security directives or Indian court warrants. Workspace owners have access to log actions of team members.' },
    { num: 15, cat: 'sharing', title: 'International Data Transfers', content: 'To comply with local localization rules, database instances of Indian clients are hosted within the borders of India. International transfers comply with DPDP guidelines and Standard Contractual Clauses.' },
    { num: 16, cat: 'sharing', title: 'Cookies and Tracking Technologies', content: 'We use cookies, web storage, and local IndexedDB parameters to preserve workspace settings. Read our Cookie Policy page for details.' },
    
    { num: 17, cat: 'security', title: 'Data Retention', content: 'Accounts are kept for active plan lifecycles plus 90 days. Server logs are kept for 180 days (IT Rules 2021). Billing documents are stored for 8 years to meet statutory Indian auditing rules.' },
    { num: 18, cat: 'security', title: 'Data Security', content: 'Technical safety measures include AES-256 database encryption, TLS 1.3 encryption in transit, multi-tenant RLS segregation, regular penetration tests, and alignment with SOC 2 and ISO 27001 guidelines.' },
    
    { num: 19, cat: 'rights', title: 'Your Rights as a Data Principal', content: 'Under the DPDP Act 2023, you have the right to access a summary of your processed data, correct anomalies, request erasures, nominate an individual to act in the event of incapacity, and submit complaints to our Grievance Officer.' },
    { num: 20, cat: 'rights', title: 'Children\'s Privacy', content: 'Our service blocks registration for minors under 18. We do not knowingly track or process minors data. If discovered, minor accounts are immediately erased.' },
    { num: 21, cat: 'rights', title: 'Enterprise Customers', content: 'Workspace admins hold complete authority to delete indexes, restrict member queries, export conversation logs, and request complete database purges.' },
    
    { num: 22, cat: 'thirdparty', title: 'Third-Party Services', content: 'Integrations with third-party tools (Google SSO, Stripe, Razorpay, Cloudflare, OpenAI, Anthropic APIs) are governed by their respective privacy policies.' },
    { num: 23, cat: 'thirdparty', title: 'Security Incident Response', content: 'We investigate breaches immediately. Safe guards are implemented and breaches are reported to affected users and CERT-In within 6 hours of discovery.' },
    { num: 24, cat: 'thirdparty', title: 'Marketing Communications', content: 'Users can opt-out of promotional alerts or email newsletters using the unsubscribe link at the footer of emails.' },
    { num: 25, cat: 'thirdparty', title: 'Automated Decision-Making', content: 'We do not perform decisions carrying legally binding or significant consequences solely based on automated AI processing. Human review is implemented for operational choices.' },
    { num: 26, cat: 'thirdparty', title: 'Data Accuracy', content: 'You must ensure that the personal details you submit are correct and complete. Update records using the Account Settings page.' },
    { num: 27, cat: 'thirdparty', title: 'Data Deletion Requests', content: 'Deletion requests sent to privacy@harikson.ai are verified and processed within 30 days, subject to legal auditing requirements.' },
    
    { num: 28, cat: 'governance', title: 'Grievance Redressal', content: 'Grievances can be submitted to our designated Grievance Officer: Ashish Pratap Singh Tomar, Email: grievance@harikson.ai, Address: Sector 62, Noida, Uttar Pradesh, India - 201301. We reply within 72 hours.' },
    { num: 29, cat: 'governance', title: 'Changes to Privacy Policy', content: 'Policy revisions are posted on this page with updated version numbers. Users are notified of significant changes via email.' },
    { num: 30, cat: 'governance', title: 'Contact Us', content: 'Company: Harikson AI Technologies Private Limited. Office: Sector 62, Noida, UP, India. Email: privacy@harikson.ai.' },
    { num: 31, cat: 'governance', title: 'Governing Law', content: 'This policy is governed by the laws of India. Legal disputes are subject to the exclusive jurisdiction of the courts of Noida, Uttar Pradesh, India.' },
    { num: 32, cat: 'governance', title: 'Definitions Appendix', content: 'Data Fiduciary: Harikson AI. Data Principal: User. Processing: Any operation performed on personal data.' },
    { num: 33, cat: 'governance', title: 'Annexures', content: 'Annexure A: Categories of Personal Data.\nAnnexure B: Retention Schedule.\nAnnexure C: Third-Party Service Providers.\nAnnexure D: International Transfers.\nAnnexure E: Security Measures.' }
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
        <title>Privacy Policy | Harikson AI Platform</title>
        <meta name="description" content="Harikson AI Privacy Policy - comprehensive data disclosures compliant with Indian and global regulations." />
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
          Privacy Policy
        </h1>
        <p style={{
          fontSize: '18px',
          color: 'rgba(255,255,255,0.9)',
          maxWidth: '700px',
          margin: '0 auto',
          lineHeight: '1.6',
          fontWeight: '300'
        }}>
          Comprehensive data processing guidelines, model inference boundaries, and DPDP Act 2023 regulations on Harikson.
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
            placeholder="Search across 33 legal sections (e.g. CERT-In, OAuth, RLS...)"
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
                  We couldn&apos;t find any rules matching &ldquo;{searchQuery}&rdquo;. Try using another query term.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
