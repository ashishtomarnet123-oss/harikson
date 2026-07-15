import React from 'react';
import { ExternalLink, BookOpen, MessageCircle, Bug } from 'lucide-react';

const resources = [
  {
    icon: BookOpen,
    title: 'Documentation',
    description:
      'Read our comprehensive guides on how to use Harikson AI for your business.',
    label: 'View Docs',
    href: '#',
  },
  {
    icon: MessageCircle,
    title: 'Contact Support',
    description: 'Need help? Reach out to our enterprise support team 24/7.',
    label: 'Email Support',
    href: 'mailto:support@harikson.com',
  },
  {
    icon: Bug,
    title: 'Report an Issue',
    description:
      'Found a bug? Let our engineering team know so we can fix it quickly.',
    label: 'Report Bug',
    href: '#',
  },
];

export default function HelpCenter() {
  return (
    <>
      <div className="settings-page-header">
        <h1>Help Center</h1>
        <p>Find documentation, tutorials, and support resources.</p>
      </div>

      <div className="settings-section">
        <h2>Resources</h2>
        <div className="settings-help-grid">
          {resources.map((r, i) => {
            const Icon = r.icon;
            return (
              <div key={i} className="settings-help-card">
                <div style={{ color: 'var(--accent)' }}>
                  <Icon size={22} />
                </div>
                <h3>{r.title}</h3>
                <p>{r.description}</p>
                <a
                  href={r.href}
                  className="back-link"
                  style={{ color: 'var(--accent)', marginTop: 'auto' }}
                >
                  {r.label} <ExternalLink size={12} />
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
