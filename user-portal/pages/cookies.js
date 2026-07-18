import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, Search, Cookie, Shield, RefreshCw, Lock, Eye, AlertCircle, HelpCircle, ChevronRight } from 'lucide-react';

export default function CookiePolicyPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All Policy Sections', icon: Cookie },
    { id: 'intro', name: 'Introduction & Basics', icon: Eye, range: [1, 2] },
    { id: 'types', name: 'Categories & Uses', icon: Shield, range: [3, 4] },
    { id: 'records', name: 'Cookie Records Set', icon: AlertCircle, range: [5, 5] },
    { id: 'thirdparty', name: 'Third-Party & AI Tracker', icon: RefreshCw, range: [6, 7] },
    { id: 'consent', name: 'Consent & Settings', icon: Lock, range: [8, 11] },
    { id: 'security', name: 'Security & Transfers', icon: HelpCircle, range: [12, 14] },
    { id: 'rights', name: 'Rights & Contacts', icon: Shield, range: [15, 18] }
  ];

  const sectionsData = [
    { num: 1, cat: 'intro', title: 'Introduction', content: 'This Cookie Policy explains what cookies are, how we use them, the types of cookies we deploy, and how you can manage your preferences. Our use of cookies may involve the collection and processing of Personal Data. For more information, please refer to our Privacy Policy.' },
    { num: 2, cat: 'intro', title: 'What Are Cookies and Tracking Technologies?', content: 'Cookies are small text files placed on your device. We use standard browser HTTP cookies to maintain session states and credentials. We also utilize local/session storage (Web Storage) for interface selections, IndexedDB for caching heavy vector indexes or schemas locally, and pixel tags/web beacons to track email delivery.' },
    
    { num: 3, cat: 'types', title: 'Types of Cookies We Use', content: '1. Strictly Necessary/Essential: Mandatory for security validation and logins. 2. Functional/Preference: Remembers user settings like Dark/Light theme and locale. 3. Analytics/Performance: Measures traffic, latencies, and GPU metrics. 4. Advertising/Marketing: Delivers targeted promotional upgrades. 5. AI Personalization/ML: Stores chat history pointers and LLM nodes.' },
    { num: 4, cat: 'types', title: 'Why We Use Cookies', content: 'We deploy cookies for key reasons: Authentication and Session Management (keeping you logged in), Security and Abuse Prevention (preventing CSRF and tracking abnormal access patterns), user preference storage, AI Personalization (managing chat interface history context), and Billing operations (verifying Stripe invoice records).' },
    
    { num: 5, cat: 'records', title: 'Cookies We May Set', content: 'Below are the key cookies we set: \n- session_id (Essential, Session): Identifies current active user session.\n- csrf_token (Essential, Session): Prevents CSRF security threats.\n- refresh_token (Essential, 30 days): Automatically refreshes access tokens.\n- remember_me (Preference, 30 days): Remembers login status.\n- preferred_language (Preference, 1 year): Stores user language.\n- theme (Preference, 1 year): Preserves light/dark modes.\n- analytics_id (Analytics, 2 years): Third-party visitor tracking.\n- device_id (Security, Persistent): Identifies client hardware.\n- security_token (Essential, Session): Encrypted auth validation.' },
    
    { num: 6, cat: 'thirdparty', title: 'Third-Party Cookies', content: 'Third-party cookies may be set on your device by our integration partners. Some potential providers include Google Analytics and Mixpanel for metrics; Cloudflare and AWS for infrastructure security; Stripe and Razorpay for invoice processing; and OpenAI, Anthropic, or Google AI APIs for model coordination.' },
    { num: 7, cat: 'thirdparty', title: 'AI-Specific Cookies', content: 'To deliver responsive AI agent behaviors, we utilize memory cookies including: Conversation History (links chat queries to active sessions), Context Memory (saves state between prompts), Workspace Selection (remembers active PostgreSQL tenant RLS directory), and Rate Limits (monitors local query frequencies per user).' },
    
    { num: 8, cat: 'consent', title: 'Consent Management', content: 'We deploy a Consent Management banner on our Services. When you first visit, you can choose to Accept All, Reject All, or Customize settings. GDPR & DPDP Act 2023 compliance ensures no non-essential cookies are set before you provide active, affirmative consent.' },
    { num: 9, cat: 'consent', title: 'Managing Cookies via Browser Settings', content: 'You can block or delete cookies directly in your browser settings. Refer to Chrome (Third-party Cookies), Safari (Manage Website Data), Firefox (Enhanced Tracking Protection), Edge (Site Permissions), or Brave/Opera configuration pages to modify parameters.' },
    { num: 10, cat: 'consent', title: 'Browser Do Not Track & GPC', content: 'We support the Global Privacy Control (GPC) signal. If your browser broadcasts a GPC signal, our system interprets it as an opt-out request for non-essential cookies. We do not currently track users across third-party properties in response to legacy Do Not Track (DNT) settings.' },
    { num: 11, cat: 'consent', title: 'Cookie Retention', content: 'Session Cookies: Deleted automatically when you close your browser or log out. Persistent Cookies: Remain stored on your device for a set period (maximum two years) unless cleared manually.' },
    
    { num: 12, cat: 'security', title: 'Security of Cookies', content: 'We implement strict security flags on all cookies: Secure (forces cookies to be sent only over HTTPS), HttpOnly (prevents client-side scripts from reading auth cookies, mitigating XSS risks), and SameSite=Strict/Lax (mitigates CSRF vulnerabilities).' },
    { num: 13, cat: 'security', title: 'International Data Transfers', content: 'Cookies set by third-party infrastructure (such as payment gateways or cloud nodes) may involve cross-border transfers. All such transfers comply with applicable DPDP Act 2023 regulations and Standard Contractual Clauses (SCCs).' },
    { num: 14, cat: 'security', title: 'Children\'s Privacy', content: 'Our Services are restricted to individuals above the age of majority. We do not knowingly track or deploy analytics cookies on devices used by children under the age of 18 without parental authority.' },
    
    { num: 15, cat: 'rights', title: 'Your Rights as a Data Principal', content: 'Under India\'s DPDP Act, 2023 and global privacy frameworks (GDPR, CCPA), you hold legal rights over your cookies data, including the right to access and review cookie-linked data, request correction or erasure, and withdraw consent at any time.' },
    { num: 16, cat: 'rights', title: 'Updates to Cookie Policy', content: 'We may update this policy periodically to reflect changes in our operational procedures. We will publish the revised policy with a new version number and effective date on this page.' },
    { num: 17, cat: 'rights', title: 'Contact Information', content: 'Company: Harikson AI Technologies Private Limited. Registered Office Address: Sector 62, Noida, Uttar Pradesh, India - 201301. Support Email: support@harikson.ai. Privacy Email: privacy@harikson.ai. Grievance Officer: Ashish Pratap Singh Tomar (grievance@harikson.ai).' },
    { num: 18, cat: 'rights', title: 'Definitions', content: 'Cookie: A small text file sent to register identifiers. Personal Data: Details identifying a real person. Third Party: Entities other than the user or primary provider. Tracking Technology: Pixels, beacons, SDKs, or local database segments.' }
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
        <title>Cookie Policy | Harikson AI Platform</title>
        <meta name="description" content="Harikson AI Cookie Policy - comprehensive tracking disclosures compliant with Indian and global regulations." />
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
          Cookie Policy
        </h1>
        <p style={{
          fontSize: '18px',
          color: 'rgba(255,255,255,0.9)',
          maxWidth: '700px',
          margin: '0 auto',
          lineHeight: '1.6',
          fontWeight: '300'
        }}>
          Detailed tracking disclosures, cookie registries, consent management, and DPDP Act 2023 boundaries on Harikson.
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
            placeholder="Search across cookie rules (e.g. Sentry, HttpOnly, GPC...)"
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
                    whiteSpace: 'pre-line' // Preserve line breaks for lists like cookie records
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
                  We couldn&apos;t find any cookie rules matching &ldquo;{searchQuery}&rdquo;. Try using another query term.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
