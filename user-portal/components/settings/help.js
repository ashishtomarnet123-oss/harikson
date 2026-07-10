import React from 'react';
import { ExternalLink, BookOpen, MessageCircle, Bug } from 'lucide-react';

export default function HelpCenter() {
  return (
    <>
      <div className="settings-page-header">
        <h1>Help Center</h1>
        <p>Find documentation, tutorials, and support resources.</p>
      </div>

      <div className="settings-section">
        <h2>Resources</h2>
        <div className="settings-grid-cards">
          
          <div style={{ padding: '20px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)' }}>
            <BookOpen size={24} style={{ color: 'var(--accent)', marginBottom: '16px' }} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>Documentation</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
              Read our comprehensive guides on how to use Harikson AI for your business.
            </p>
            <a href="#" className="back-link" style={{ color: 'var(--accent)' }}>View Docs <ExternalLink size={14} /></a>
          </div>

          <div style={{ padding: '20px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)' }}>
            <MessageCircle size={24} style={{ color: 'var(--accent)', marginBottom: '16px' }} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>Contact Support</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
              Need help? Reach out to our enterprise support team 24/7.
            </p>
            <a href="mailto:support@harikson.com" className="back-link" style={{ color: 'var(--accent)' }}>Email Support <ExternalLink size={14} /></a>
          </div>
          
          <div style={{ padding: '20px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)' }}>
            <Bug size={24} style={{ color: 'var(--accent)', marginBottom: '16px' }} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>Report an Issue</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
              Found a bug? Let our engineering team know so we can fix it.
            </p>
            <a href="#" className="back-link" style={{ color: 'var(--accent)' }}>Report Bug <ExternalLink size={14} /></a>
          </div>

        </div>
      </div>
    </>
  );
}
