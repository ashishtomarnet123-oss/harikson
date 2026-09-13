import React, { useState, useEffect } from 'react';
import {
  User,
  Briefcase,
  Activity,
  CreditCard,
  Clock,
  HardDrive,
  Smartphone,
  Shield,
  Code,
  Palette,
  Globe,
  HelpCircle,
  X,
  LogOut,
  FileText,
  Link2,
  Key,
  Lock,
} from 'lucide-react';
import { useRouter } from 'next/router';

import ProfileSettings from './settings/profile';
import WorkspaceSettings from './settings/workspace';
import UsageSettings from './settings/usage';
import BillingSettings from './settings/billing';
import ActivitySettings from './settings/activity';
import DevicesSettings from './settings/devices';
import ConnectedAppsSettings from './settings/apps';
import SecuritySettings from './settings/security';
import DataPrivacySettings from './settings/privacy';
import DeveloperSettings from './settings/developer';
import DeveloperConfigSettings from './settings/developerConfig';
import AppearanceSettings from './settings/appearance';
import LanguageSettings from './settings/language';
import HelpSettings from './settings/help';

function PromptLibrarySettings() {
  const router = useRouter();
  return (
    <>
      <div className="settings-page-header">
        <h1>Prompt Library</h1>
        <p>Create and manage AI agents with custom system prompts.</p>
      </div>
      <div className="settings-section">
        <div className="settings-card" style={{ textAlign: 'center', padding: '32px' }}>
          <Code size={32} style={{ color: 'var(--accent)', marginBottom: '12px' }} />
          <p style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600, margin: '0 0 6px' }}>
            Agent management has moved
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
            Create, edit, and manage your AI agents from the dedicated Agents page with a full-featured interface.
          </p>
          <button
            className="btn-primary"
            onClick={() => router.push('/agents')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            Open AI Agents
          </button>
        </div>
      </div>
    </>
  );
}

function RagDriveSettings() {
  const router = useRouter();
  return (
    <>
      <div className="settings-page-header">
        <h1>My RAG Drive</h1>
        <p>Upload and manage documents for RAG-powered search in your conversations.</p>
      </div>
      <div className="settings-section">
        <div className="settings-card" style={{ textAlign: 'center', padding: '32px' }}>
          <HardDrive size={32} style={{ color: 'var(--accent)', marginBottom: '12px' }} />
          <p style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600, margin: '0 0 6px' }}>
            Document management has moved
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
            Upload, download, and manage your knowledge base documents from the dedicated Knowledge Base page.
          </p>
          <button
            className="btn-primary"
            onClick={() => router.push('/documents')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            Open Knowledge Base
          </button>
        </div>
      </div>
    </>
  );
}


const navSections = [
  {
    title: 'ACCOUNT',
    items: [
      {
        id: 'profile',
        name: 'My Profile',
        icon: User,
        Component: ProfileSettings,
      },
      {
        id: 'workspace',
        name: 'Workspace',
        icon: Briefcase,
        Component: WorkspaceSettings,
      },
      {
        id: 'billing',
        name: 'Billing & Subscription',
        icon: CreditCard,
        Component: BillingSettings,
      },
    ],
  },
  {
    title: 'AI & DATA',
    items: [
      {
        id: 'storage',
        name: 'My RAG Drive',
        icon: HardDrive,
        Component: RagDriveSettings,
      },
      {
        id: 'custom_presets',
        name: 'Prompt Library',
        icon: Code,
        Component: PromptLibrarySettings,
      },
      {
        id: 'usage',
        name: 'Usage & Analytics',
        icon: Activity,
        Component: UsageSettings,
      },
    ],
  },
  {
    title: 'CONNECTIONS',
    items: [
      {
        id: 'connected_apps',
        name: 'Connected Apps',
        icon: Link2,
        Component: ConnectedAppsSettings,
      },
      {
        id: 'devices',
        name: 'Connected Devices',
        icon: Smartphone,
        Component: DevicesSettings,
      },
    ],
  },
  {
    title: 'DEVELOPER',
    items: [
      {
        id: 'api_keys',
        name: 'API Keys',
        icon: Key,
        Component: DeveloperSettings,
      },
      {
        id: 'developer',
        name: 'Developer Settings',
        icon: Code,
        Component: DeveloperConfigSettings,
      },
    ],
  },
  {
    title: 'SECURITY & PRIVACY',
    items: [
      {
        id: 'security',
        name: 'Security',
        icon: Shield,
        Component: SecuritySettings,
      },
      {
        id: 'sessions',
        name: 'Sessions',
        icon: Clock,
        Component: ActivitySettings,
      },
      {
        id: 'privacy',
        name: 'Data & Privacy',
        icon: Lock,
        Component: DataPrivacySettings,
      },
    ],
  },
];

// Flatten all items for easy lookup
const allItems = navSections.flatMap((s) => s.items);

export default function SettingsModal({
  isOpen,
  onClose,
  initialTab = 'profile',
  handleLogout,
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const router = useRouter();

  // Sync if initialTab prop changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeItem = allItems.find((i) => i.id === activeTab) || allItems[0];
  const ActiveComponent = activeItem.Component;

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div
        className="settings-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="settings-modal-close"
          onClick={onClose}
          aria-label="Close settings"
        >
          <X size={18} />
        </button>

        <div className="settings-layout">
          {/* ── Sidebar ── */}
          <div className="settings-sidebar">
            <div className="settings-sidebar-header">
              <img src="/assets/xarwiz-logo.png" alt="Xarwiz" className="brand-logo-img" />
            </div>

            <nav className="settings-nav" aria-label="Settings navigation">
              {navSections.map((section, idx) => (
                <div key={idx} className="settings-nav-section">
                  <p className="settings-nav-title">{section.title}</p>
                  {section.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`settings-nav-item${activeTab === item.id ? ' active' : ''}`}
                    >
                      <item.icon size={15} />
                      <span>{item.name}</span>
                    </button>
                  ))}
                </div>
              ))}
            </nav>

            <div className="settings-sidebar-footer">
              <button
                className="settings-logout-btn"
                onClick={async () => {
                  if (handleLogout) {
                    await handleLogout();
                  } else {
                    localStorage.removeItem('hk_user');
                    localStorage.removeItem('hk_tenant');
                    localStorage.removeItem('hk_api_base');
                    localStorage.removeItem('hk_access_token');
                    localStorage.removeItem('hk_refresh_token');
                    localStorage.removeItem('is_impersonating');
                    localStorage.removeItem('impersonating_user_email');
                    localStorage.removeItem('impersonating_admin_email');
                    router.push('/login');
                  }
                }}
              >
                <LogOut size={15} /> <span>Log Out</span>
              </button>
            </div>
          </div>

          {/* ── Content ── */}
          <div className="settings-content-wrapper">
            <div className="settings-content">
              <ActiveComponent onClose={onClose} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
