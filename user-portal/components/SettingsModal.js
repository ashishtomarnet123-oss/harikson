import React, { useState, useEffect } from 'react';
import {
  User, Briefcase, Activity, CreditCard, Clock,
  HardDrive, Smartphone, Shield, Code, Palette,
  Globe, HelpCircle, X, LogOut
} from 'lucide-react';
import { useRouter } from 'next/router';

import ProfileSettings from './settings/profile';
import WorkspaceSettings from './settings/workspace';
import UsageSettings from './settings/usage';
import BillingSettings from './settings/billing';
import ActivitySettings from './settings/activity';
import StorageSettings from './settings/storage';
import DevicesSettings from './settings/devices';
import SecuritySettings from './settings/security';
import DeveloperSettings from './settings/developer';
import AppearanceSettings from './settings/appearance';
import LanguageSettings from './settings/language';
import HelpSettings from './settings/help';

const navSections = [
  {
    title: 'Personal',
    items: [
      { id: 'profile',   name: 'My Profile',            icon: User,       Component: ProfileSettings },
      { id: 'workspace', name: 'Workspace',              icon: Briefcase,  Component: WorkspaceSettings },
      { id: 'usage',     name: 'Usage & Analytics',      icon: Activity,   Component: UsageSettings },
      { id: 'billing',   name: 'Billing & Subscription', icon: CreditCard, Component: BillingSettings },
    ]
  },
  {
    title: 'Data & Activity',
    items: [
      { id: 'activity', name: 'Activity Timeline', icon: Clock,      Component: ActivitySettings },
      { id: 'storage',  name: 'Storage Manager',   icon: HardDrive,  Component: StorageSettings },
      { id: 'devices',  name: 'Connected Devices', icon: Smartphone, Component: DevicesSettings },
    ]
  },
  {
    title: 'Configuration',
    items: [
      { id: 'security',   name: 'Security',            icon: Shield,  Component: SecuritySettings },
      { id: 'developer',  name: 'Developer Settings',  icon: Code,    Component: DeveloperSettings },
      { id: 'appearance', name: 'Appearance',          icon: Palette, Component: AppearanceSettings },
      { id: 'language',   name: 'Language',            icon: Globe,   Component: LanguageSettings },
    ]
  },
  {
    title: 'Support',
    items: [
      { id: 'help', name: 'Help Center', icon: HelpCircle, Component: HelpSettings },
    ]
  }
];

// Flatten all items for easy lookup
const allItems = navSections.flatMap(s => s.items);

export default function SettingsModal({ isOpen, onClose, initialTab = 'profile' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const router = useRouter();

  // Sync if initialTab prop changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeItem = allItems.find(i => i.id === activeTab) || allItems[0];
  const ActiveComponent = activeItem.Component;

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal-container" onClick={e => e.stopPropagation()}>

        <button className="settings-modal-close" onClick={onClose} aria-label="Close settings">
          <X size={18} />
        </button>

        <div className="settings-layout">
          {/* ── Sidebar ── */}
          <div className="settings-sidebar">
            <div className="settings-sidebar-header">
              <h2>Settings</h2>
            </div>

            <nav className="settings-nav" aria-label="Settings navigation">
              {navSections.map((section, idx) => (
                <div key={idx} className="settings-nav-section">
                  <p className="settings-nav-title">{section.title}</p>
                  {section.items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`settings-nav-item${activeTab === item.id ? ' active' : ''}`}
                    >
                      <item.icon size={15} />
                      {item.name}
                    </button>
                  ))}
                </div>
              ))}
            </nav>

            <div className="settings-sidebar-footer">
              <button
                className="settings-logout-btn"
                onClick={() => {
                  localStorage.removeItem('hk_token');
                  router.push('/login');
                }}
              >
                <LogOut size={15} /> Log Out
              </button>
            </div>
          </div>

          {/* ── Content ── */}
          <div className="settings-content-wrapper">
            <div className="settings-content">
              <ActiveComponent />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
