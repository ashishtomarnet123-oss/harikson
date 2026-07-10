import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  User, Briefcase, Activity, CreditCard, Clock, 
  HardDrive, Smartphone, Shield, Code, Palette, 
  Globe, HelpCircle, ArrowLeft, LogOut
} from 'lucide-react';

const navSections = [
  {
    title: 'Personal',
    items: [
      { name: 'My Profile', href: '/settings/profile', icon: User },
      { name: 'Workspace', href: '/settings/workspace', icon: Briefcase },
      { name: 'Usage & Analytics', href: '/settings/usage', icon: Activity },
      { name: 'Billing & Subscription', href: '/settings/billing', icon: CreditCard },
    ]
  },
  {
    title: 'Data & Activity',
    items: [
      { name: 'Activity Timeline', href: '/settings/activity', icon: Clock },
      { name: 'Storage Manager', href: '/settings/storage', icon: HardDrive },
      { name: 'Connected Devices', href: '/settings/devices', icon: Smartphone },
    ]
  },
  {
    title: 'Configuration',
    items: [
      { name: 'Security', href: '/settings/security', icon: Shield },
      { name: 'Developer Settings', href: '/settings/developer', icon: Code },
      { name: 'Appearance', href: '/settings/appearance', icon: Palette },
      { name: 'Language', href: '/settings/language', icon: Globe },
    ]
  }
];

export default function SettingsLayout({ children }) {
  const router = useRouter();

  return (
    <div className="settings-layout">
      <Head>
        <title>Settings - Harikson AI</title>
      </Head>

      <div className="settings-sidebar">
        <div className="settings-sidebar-header">
          <Link href="/chat" className="back-link">
            <ArrowLeft size={16} /> Back to Chat
          </Link>
          <h2>Settings</h2>
        </div>

        <div className="settings-nav">
          {navSections.map((section, idx) => (
            <div key={idx} className="settings-nav-section">
              <h3 className="settings-nav-title">{section.title}</h3>
              {section.items.map(item => (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={`settings-nav-item ${router.pathname === item.href ? 'active' : ''}`}
                >
                  <item.icon size={16} /> {item.name}
                </Link>
              ))}
            </div>
          ))}

          <div className="settings-nav-section">
            <h3 className="settings-nav-title">Support</h3>
            <Link href="/settings/help" className={`settings-nav-item ${router.pathname === '/settings/help' ? 'active' : ''}`}>
              <HelpCircle size={16} /> Help Center
            </Link>
          </div>
        </div>

        <div className="settings-sidebar-footer">
          <button className="settings-logout-btn" onClick={() => {
            localStorage.removeItem('hk_token');
            router.push('/login');
          }}>
            <LogOut size={16} /> Log Out
          </button>
        </div>
      </div>

      <div className="settings-content-wrapper">
        <div className="settings-content">
          {children}
        </div>
      </div>
    </div>
  );
}
