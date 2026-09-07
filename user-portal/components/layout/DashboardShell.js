import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  MessageSquare,
  Workflow,
  Settings,
  LogOut,
  User,
  Shield,
  Search,
  ChevronRight,
  Database,
  Cpu,
  Layers,
  Bell
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import SettingsModal from '../SettingsModal';
import GlobalSearch from '../GlobalSearch';
import { authenticatedFetch, getApiConfig } from '../settings/apiHelper';

export default function DashboardShell({ children, title = 'Dashboard' }) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { apiBase } = getApiConfig();
        const res = await authenticatedFetch(`${apiBase}/api/v1/notifications`);
        if (res?.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (e) { /* silent */ }
    };
    fetchNotifications();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      const { apiBase } = getApiConfig();
      await authenticatedFetch(`${apiBase}/api/v1/notifications/read-all`, { method: 'PUT' });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) { /* silent */ }
  };

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Layers },
    { name: 'AI Workspaces', href: '/chat', icon: MessageSquare },
    { name: 'AI Agents', href: '/agents', icon: Cpu },
    { name: 'Agent Workflows', href: '/workflows', icon: Workflow },
    { name: 'Knowledge Base', href: '/documents', icon: Database },
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
            <img src="/assets/xarwiz-logo.png" alt="Xarwiz" style={{ height: '26px', width: 'auto' }} />
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
            onClick={() => setShowSearch(true)}
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
            <Search size={18} color="#9ca3af" />
            Search
            <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#4b5563', padding: '1px 5px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)' }}>⌘K</span>
          </button>
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
                {user?.tenantSlug || 'Xarwiz Cloud'}
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Notification Bell */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px', position: 'relative' }}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: '-2px', right: '-2px',
                    width: '16px', height: '16px', borderRadius: '50%',
                    backgroundColor: '#ef4444', color: 'white',
                    fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700,
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div style={{
                  position: 'absolute', top: '36px', right: 0, width: '340px', maxHeight: '400px',
                  overflow: 'auto', backgroundColor: '#1f2937',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 100, padding: '8px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#f3f4f6' }}>Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} style={{ fontSize: '11px', color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer' }}>
                        Mark all read
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <p style={{ padding: '20px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>No notifications</p>
                  ) : notifications.map(n => (
                    <div key={n.id} style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', opacity: n.read ? 0.6 : 1 }}>
                      <p style={{ fontSize: '13px', color: '#f3f4f6', margin: 0 }}>{n.title}</p>
                      <p style={{ fontSize: '11px', color: '#6b7280', margin: '2px 0 0' }}>{n.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

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

      <GlobalSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />
    </div>
  );
}
