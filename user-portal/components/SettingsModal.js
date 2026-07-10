import React, { useState, useEffect } from 'react';
import { 
  User, Briefcase, Activity, CreditCard, Clock, 
  HardDrive, Smartphone, Shield, Code, Palette, 
  Globe, HelpCircle, X, LogOut
} from 'lucide-react';
import { useRouter } from 'next/router';

// Import all settings components
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
      { id: 'profile', name: 'My Profile', icon: User, Component: ProfileSettings },
      { id: 'workspace', name: 'Workspace', icon: Briefcase, Component: WorkspaceSettings },
      { id: 'usage', name: 'Usage & Analytics', icon: Activity, Component: UsageSettings },
      { id: 'billing', name: 'Billing & Subscription', icon: CreditCard, Component: BillingSettings },
    ]
  },
  {
    title: 'Data & Activity',
    items: [
      { id: 'activity', name: 'Activity Timeline', icon: Clock, Component: ActivitySettings },
      { id: 'storage', name: 'Storage Manager', icon: HardDrive, Component: StorageSettings },
      { id: 'devices', name: 'Connected Devices', icon: Smartphone, Component: DevicesSettings },
    ]
  },
  {
    title: 'Configuration',
    items: [
      { id: 'security', name: 'Security', icon: Shield, Component: SecuritySettings },
      { id: 'developer', name: 'Developer Settings', icon: Code, Component: DeveloperSettings },
      { id: 'appearance', name: 'Appearance', icon: Palette, Component: AppearanceSettings },
      { id: 'language', name: 'Language', icon: Globe, Component: LanguageSettings },
    ]
  }
];

export default function SettingsModal({ isOpen, onClose, initialTab = 'profile' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const router = useRouter();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  let ActiveComponent = ProfileSettings;
  let found = false;
  
  for (const section of navSections) {
    const item = section.items.find(i => i.id === activeTab);
    if (item) {
      ActiveComponent = item.Component;
      found = true;
      break;
    }
  }

  if (!found && activeTab === 'help') {
    ActiveComponent = HelpSettings;
  }

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal-container" onClick={e => e.stopPropagation()}>
        <button className="settings-modal-close" onClick={onClose}>
          <X size={20} />
        </button>
        
        <div className="settings-layout" style={{ height: '100%', margin: 0 }}>
          <div className="settings-sidebar">
            <div className="settings-sidebar-header">
              <h2>Settings</h2>
            </div>

            <div className="settings-nav">
              {navSections.map((section, idx) => (
                <div key={idx} className="settings-nav-section">
                  <h3 className="settings-nav-title">{section.title}</h3>
                  {section.items.map(item => (
                    <button 
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`settings-nav-item ${activeTab === item.id ? 'active' : ''}`}
                      style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      <item.icon size={16} /> {item.name}
                    </button>
                  ))}
                </div>
              ))}

              <div className="settings-nav-section">
                <h3 className="settings-nav-title">Support</h3>
                <button 
                  onClick={() => setActiveTab('help')}
                  className={`settings-nav-item ${activeTab === 'help' ? 'active' : ''}`}
                  style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  <HelpCircle size={16} /> Help Center
                </button>
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

          <div className="settings-content-wrapper" style={{ overflowY: 'auto' }}>
            <div className="settings-content">
              <ActiveComponent />
            </div>
          </div>
        </div>
      </div>
      <style jsx global>{`
        .settings-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.2s ease-out;
        }

        .settings-modal-container {
          background: var(--bg-surface);
          width: 90%;
          max-width: 1100px;
          height: 85vh;
          border-radius: var(--radius-lg);
          border: 1px solid var(--border);
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
          overflow: hidden;
          position: relative;
          display: flex;
          flex-direction: column;
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .settings-modal-close {
          position: absolute;
          top: 16px;
          right: 16px;
          z-index: 10;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.2s;
        }
        
        .settings-modal-close:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
