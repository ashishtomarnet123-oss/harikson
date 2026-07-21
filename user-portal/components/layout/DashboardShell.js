import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  MessageSquare,
  Workflow,
  Settings,
  Zap,
  LogOut,
  User,
  Shield,
  Search,
  ChevronRight,
  Database,
  Cpu,
  Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import SettingsModal from '../SettingsModal';

export default function DashboardShell({ children, title = 'Dashboard' }) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Layers },
    { name: 'AI Workspaces', href: '/chat', icon: MessageSquare },
    { name: 'Agent Workflows', href: '/workflows', icon: Workflow },
    { name: 'Security & Compliance', href: '/security', icon: Shield },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#030712',
      color: '#f9fafb',
      display: 'flex',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Sidebar */}
      <aside style={{
        width: '260px',
        backgroundColor: 'rgba(17, 24, 39, 0.6)',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '20px 16px',
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        zIndex: 50
      }}>
        <div>
          {/* Brand Logo */}
          <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px', paddingLeft: '8px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(99, 102, 241, 0.4)'
            }}>
              <Zap size={18} color="#ffffff" />
            </div>
            <span style={{ fontSize: '17px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em' }}>
              Neuravolt <span style={{ color: '#a855f7', fontWeight: 400 }}>AI</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = router.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    color: isActive ? '#ffffff' : '#9ca3af',
                    backgroundColor: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                    border: isActive ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: isActive ? 600 : 500,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Icon size={18} color={isActive ? '#818cf8' : '#9ca3af'} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Settings & User Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={() => setShowSettingsModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 12px',
              borderRadius: '8px',
              color: '#9ca3af',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              width: '100%',
              textAlign: 'left'
            }}
          >
            <Settings size={18} color="#9ca3af" />
            Workspace Settings
          </button>

          <div style={{
            padding: '12px',
            borderRadius: '10px',
            backgroundColor: 'rgba(31, 41, 55, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#f3f4f6', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {user?.name || user?.email || 'Authenticated User'}
              </p>
              <p style={{ fontSize: '11px', color: '#6b7280', margin: '2px 0 0 0', textTransform: 'capitalize' }}>
                {user?.tenantSlug || 'Neuravolt Cloud'}
              </p>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              style={{
                background: 'none',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        marginLeft: '260px',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh'
      }}>
        {/* Top Header Bar */}
        <header style={{
          height: '64px',
          backgroundColor: 'rgba(17, 24, 39, 0.4)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '0 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          backdropFilter: 'blur(8px)'
        }}>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
            {title}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{
              fontSize: '12px',
              padding: '4px 10px',
              borderRadius: '20px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              fontWeight: 500
            }}>
              ● System Normal
            </span>
          </div>
        </header>

        <div style={{ flex: 1, padding: '28px' }}>
          {children}
        </div>
      </main>

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        initialTab="profile"
        handleLogout={logout}
      />
    </div>
  );
}
