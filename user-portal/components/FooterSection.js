import React from 'react';
import Link from 'next/link';

export default function FooterSection() {
  return (
    <>
      <style jsx global>{`
        /* FINAL CTA BLUE BANNER */
        .final-blue-banner {
          background: linear-gradient(135deg, #1E40AF 0%, #1D4ED8 50%, #1E3A8A 100%);
          border-radius: 24px;
          padding: 48px 40px;
          color: #FFFFFF;
          display: grid;
          grid-template-columns: 180px 1fr 180px;
          align-items: center;
          gap: 32px;
          box-shadow: 0 25px 50px -12px rgba(29, 78, 216, 0.3);
          margin: 60px auto 40px auto;
          max-width: 1200px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .ai-3d-badge-graphic {
          width: 120px;
          height: 120px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.03) 100%);
          border: 1px solid rgba(255, 255, 255, 0.25);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3.2rem;
          font-weight: 800;
          color: #FFFFFF;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15), inset 0 2px 2px rgba(255,255,255,0.15);
          text-shadow: 0 2px 8px rgba(37,99,235,0.5);
          transition: all 0.3s ease;
        }
        .final-blue-banner:hover .ai-3d-badge-graphic {
          transform: translateY(-2px);
          box-shadow: 0 15px 35px rgba(37, 99, 235, 0.3), inset 0 2px 2px rgba(255,255,255,0.25);
          border-color: rgba(255, 255, 255, 0.4);
        }
        .final-cta-center { text-align: center; }
        .final-cta-title { font-family: 'Outfit', sans-serif; font-size: 2.3rem; font-weight: 800; color: #FFFFFF; margin-bottom: 10px; }
        .final-cta-sub { font-size: 0.95rem; color: #DBEAFE; margin-bottom: 28px; }
        .final-cta-btns { display: flex; align-items: center; justify-content: center; gap: 16px; }
        .btn-cta-white { background: #FFFFFF; color: #1D4ED8; border: none; padding: 14px 28px; border-radius: 12px; font-size: 0.95rem; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,0.12); transition: all 0.25s ease; }
        .btn-cta-white:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15); background: #F8FAFC; }
        .btn-cta-outline { background: rgba(255, 255, 255, 0.05); color: #FFFFFF; border: 1px solid rgba(255, 255, 255, 0.4); padding: 14px 28px; border-radius: 12px; font-size: 0.95rem; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; transition: all 0.25s ease; }
        .btn-cta-outline:hover { background: rgba(255, 255, 255, 0.15); border-color: rgba(255, 255, 255, 0.8); transform: translateY(-2px); }
        .final-cta-right { display: flex; flex-direction: column; gap: 12px; font-size: 0.85rem; font-weight: 600; color: #DBEAFE; }

        /* FOOTER */
        .footer-container { padding: 60px 0 30px 0; border-top: 1px solid #e2e8f0; background: #FFFFFF; font-family: 'Outfit', sans-serif; }
        .footer-inner-wrapper { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
        .footer-grid-7col { display: grid; grid-template-columns: 2.2fr repeat(6, 1fr); gap: 24px; margin-bottom: 44px; }
        .logo-container { display: flex; align-items: center; gap: 8px; text-decoration: none; }
        .logo-icon { width: 32px; height: 32px; background: #2563eb; color: #fff; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem; }
        .logo-text { font-weight: 800; font-size: 1.25rem; color: #0f172a; letter-spacing: -0.02em; }
        .footer-brand-desc { font-size: 0.82rem; color: #64748b; line-height: 1.55; margin-top: 12px; margin-bottom: 18px; max-width: 260px; }
        .social-icons-row { display: flex; gap: 14px; font-size: 1.1rem; color: #64748b; }
        .social-icons-row a { text-decoration: none; color: #64748b; transition: color 0.2s; }
        .social-icons-row a:hover { color: #2563EB; }
        .footer-col-title { font-size: 0.82rem; font-weight: 700; color: #0F172A; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 16px; }
        .footer-links { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
        .footer-links a { text-decoration: none; font-size: 0.82rem; color: #64748b; transition: color 0.2s; }
        .footer-links a:hover { color: #2563EB; }
        .footer-bottom-bar { border-top: 1px solid #e2e8f0; padding-top: 24px; display: flex; align-items: center; justify-content: space-between; font-size: 0.78rem; color: #94a3b8; }
        .footer-bottom-selectors { display: flex; align-items: center; gap: 20px; }

        @media (max-width: 1024px) {
          .final-blue-banner { grid-template-columns: 1fr; text-align: center; justify-items: center; }
          .final-cta-right { display: none; }
          .footer-grid-7col { grid-template-columns: repeat(3, 1fr); }
        }

        @media (max-width: 640px) {
          .footer-grid-7col { grid-template-columns: 1fr; }
          .footer-bottom-bar { flex-direction: column; gap: 12px; text-align: center; }
        }
      `}</style>

      {/* FINAL BLUE CTA BANNER */}
      <div className="final-blue-banner">
        <div className="ai-3d-badge-graphic">N</div>

        <div className="final-cta-center">
          <h2 className="final-cta-title">Ready to Build the Future with AI?</h2>
          <div className="final-cta-sub">
            Join thousands of Indian businesses building secure and compliant AI applications with Xarwiz.
          </div>

          <div className="final-cta-btns">
            <Link href="/signup" className="btn-cta-white">Request Access</Link>
            <Link href="/login" className="btn-cta-outline">Book Live Demo</Link>
          </div>
        </div>

        <div className="final-cta-right">
          <div><span style={{ color: '#10B981', fontWeight: 800, marginRight: 6 }}>✓</span> No Credit Card</div>
          <div><span style={{ color: '#10B981', fontWeight: 800, marginRight: 6 }}>✓</span> Deploy in 5 Minutes</div>
          <div><span style={{ color: '#10B981', fontWeight: 800, marginRight: 6 }}>✓</span> Cancel Anytime</div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="footer-container">
        <div className="footer-inner-wrapper">
          <div className="footer-grid-7col">
            <div>
              <Link href="/neuravolt" className="logo-container" style={{ marginBottom: 8 }}>
                <div className="logo-icon">N</div>
                <span className="logo-text">XARWIZ</span>
              </Link>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: 10 }}>AI Cloud Platform</div>
              <p className="footer-brand-desc">
                India&apos;s DPDP-compliant AI cloud platform for AI Agents, Workflows, Multi-Language LLMs and Enterprise AI applications.
              </p>
              <div className="social-icons-row">
                <a href="#" style={{ color: '#64748b', textDecoration: 'none', fontSize: '1.1rem' }}>𝕏</a>
                <a href="#" style={{ color: '#64748b', textDecoration: 'none', fontSize: '1.1rem', fontWeight: 'bold' }}>in</a>
                <a href="#" style={{ color: '#64748b', textDecoration: 'none', fontSize: '1.1rem' }}>▶</a>
                <a href="#" style={{ color: '#64748b', textDecoration: 'none', fontSize: '1.1rem' }}>🐙</a>
              </div>
            </div>

            <div>
              <div className="footer-col-title">Platform</div>
              <ul className="footer-links">
                <li><Link href="/signup">AI Agent Builder</Link></li>
                <li><Link href="/signup">Knowledge Base</Link></li>
                <li><Link href="/signup">Workflows</Link></li>
                <li><Link href="/signup">Multi-Language LLMs</Link></li>
              </ul>
            </div>

            <div>
              <div className="footer-col-title">Solutions</div>
              <ul className="footer-links">
                <li><Link href="/signup">Enterprise AI</Link></li>
                <li><Link href="/privacy">DPDP Compliance</Link></li>
                <li><Link href="/signup">Customer Support</Link></li>
                <li><Link href="/signup">Healthcare AI</Link></li>
              </ul>
            </div>

            <div>
              <div className="footer-col-title">Developers</div>
              <ul className="footer-links">
                <li><Link href="/signup">API Documentation</Link></li>
                <li><Link href="/signup">REST &amp; SDKs</Link></li>
                <li><Link href="/signup">Webhooks</Link></li>
                <li><Link href="/signup">GitHub Integration</Link></li>
              </ul>
            </div>

            <div>
              <div className="footer-col-title">Pricing</div>
              <ul className="footer-links">
                <li><Link href="/neuravolt#pricing">Starter Plan</Link></li>
                <li><Link href="/neuravolt#pricing">Growth Plan</Link></li>
                <li><Link href="/neuravolt#pricing">Enterprise Custom</Link></li>
                <li><Link href="/neuravolt#pricing">Save 20% Annual</Link></li>
              </ul>
            </div>

            <div>
              <div className="footer-col-title">Resources</div>
              <ul className="footer-links">
                <li><Link href="/security">Security</Link></li>
                <li><Link href="/privacy">Privacy Policy</Link></li>
                <li><Link href="/terms">Terms of Service</Link></li>
                <li><Link href="/aup">Acceptable Use Policy</Link></li>
              </ul>
            </div>

            <div>
              <div className="footer-col-title">Company</div>
              <ul className="footer-links">
                <li><Link href="/neuravolt">About Xarwiz</Link></li>
                <li><Link href="/login">Contact Team</Link></li>
                <li><Link href="/login">Careers</Link></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom-bar">
            <div>© 2025 Neuravolt Technologies Pvt. Ltd. All rights reserved.</div>
            <div className="footer-bottom-selectors">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>Made in India <img src="/assets/india-flag.svg" alt="India Flag" style={{ width: 16, height: 11, borderRadius: 1, objectFit: 'cover' }} /> ▾</span>
              <span>English ▾</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
