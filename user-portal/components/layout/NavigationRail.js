import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Layers,
  MessageSquare,
  Cpu,
  Workflow,
  Database,
  Shield,
  Settings,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: Layers, label: 'Dashboard' },
  { href: '/chat', icon: MessageSquare, label: 'AI Workspaces' },
  { href: '/agents', icon: Cpu, label: 'AI Agents' },
  { href: '/workflows', icon: Workflow, label: 'Workflows' },
  { href: '/documents', icon: Database, label: 'Knowledge Base' },
  { href: '/security', icon: Shield, label: 'Security' },
];

export default function NavigationRail({ onSettingsClick }) {
  const router = useRouter();
  const currentPath = router.pathname;

  return (
    <nav style={{
      width: '56px',
      minWidth: '56px',
      height: '100vh',
      backgroundColor: '#0B1120',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: '12px',
      paddingBottom: '12px',
      position: 'relative',
      zIndex: 30,
    }}>
      {/* Logo */}
      <Link href="/dashboard" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '36px',
        height: '36px',
        marginBottom: '16px',
        textDecoration: 'none',
      }}>
        <img
          src="/assets/xarwiz-logo-icon.png"
          alt="Xarwiz"
          style={{ width: '28px', height: '28px', objectFit: 'contain' }}
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.parentElement.innerHTML = '<span style="font-size:18px;font-weight:800;color:#6366f1;">X</span>';
          }}
        />
      </Link>

      {/* Divider */}
      <div style={{
        width: '24px',
        height: '1px',
        backgroundColor: 'rgba(255,255,255,0.08)',
        marginBottom: '8px',
      }} />

      {/* Nav Items */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2px',
        flex: 1,
      }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
                border: isActive ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent',
                color: isActive ? '#818cf8' : '#64748b',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={20} />
            </Link>
          );
        })}
      </div>

      {/* Settings at bottom */}
      {onSettingsClick && (
        <button
          onClick={onSettingsClick}
          title="Settings"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Settings size={20} />
        </button>
      )}
    </nav>
  );
}
