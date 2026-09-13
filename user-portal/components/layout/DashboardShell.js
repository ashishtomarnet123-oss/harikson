import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Settings,
  LogOut,
  Search,
  Bell,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import SettingsModal from '../SettingsModal';
import GlobalSearch from '../GlobalSearch';
import NavigationRail from './NavigationRail';
import { authenticatedFetch, getApiConfig } from '../settings/apiHelper';

export default function DashboardShell({ children, title = 'Dashboard' }) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  return (
    <div className="ds-root">
      {/* Navigation Rail */}
      <div className="ds-nav-rail">
        <NavigationRail onSettingsClick={() => setShowSettingsModal(true)} />
      </div>

      {/* Mobile overlay */}
      <div
        className={`ds-mobile-overlay${sidebarOpen ? ' open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Context Sidebar */}
      <aside className={`ds-sidebar${sidebarOpen ? ' open' : ''}`}>
        <div>
          <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingLeft: '4px' }}>
            <img src="/assets/xarwiz-logo.png" alt="Xarwiz" style={{ height: '22px', width: 'auto' }} />
          </Link>

          <div style={{
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--shell-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            padding: '0 4px',
            marginBottom: '12px',
          }}>
            {title}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={() => { setShowSearch(true); setSidebarOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 12px', borderRadius: '8px',
              color: 'var(--shell-text-secondary)', backgroundColor: 'transparent',
              border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 500,
              width: '100%', textAlign: 'left',
            }}
          >
            <Search size={18} />
            Search
            <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--shell-text-muted)', padding: '1px 5px', borderRadius: '4px', border: '1px solid var(--shell-card-border)' }}>⌘K</span>
          </button>
          <button
            onClick={() => { setShowSettingsModal(true); setSidebarOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 12px', borderRadius: '8px',
              color: 'var(--shell-text-secondary)', backgroundColor: 'transparent',
              border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 500,
              width: '100%', textAlign: 'left',
            }}
          >
            <Settings size={18} />
            Workspace Settings
          </button>

          <div style={{
            padding: '12px', borderRadius: '10px',
            backgroundColor: 'var(--shell-surface-alt)',
            border: '1px solid var(--shell-card-border-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--shell-text)', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {user?.name || user?.email || 'Authenticated User'}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--shell-text-muted)', margin: '2px 0 0 0', textTransform: 'capitalize' }}>
                {user?.tenantSlug || 'Xarwiz Cloud'}
              </p>
            </div>
            <button onClick={logout} title="Sign Out" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="ds-main">
        <header className="ds-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="ds-hamburger" onClick={() => setSidebarOpen(prev => !prev)}>
              {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--shell-text)', margin: 0 }}>
              {title}
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Notification Bell */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--shell-text-secondary)', padding: '4px', position: 'relative' }}
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
                  overflow: 'auto', backgroundColor: 'var(--shell-dropdown-bg)',
                  border: '1px solid var(--shell-card-border)', borderRadius: '12px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 100, padding: '8px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid var(--shell-card-border-subtle)' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--shell-text)' }}>Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} style={{ fontSize: '11px', color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer' }}>
                        Mark all read
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <p style={{ padding: '20px', textAlign: 'center', color: 'var(--shell-text-muted)', fontSize: '13px' }}>No notifications</p>
                  ) : notifications.map(n => (
                    <div key={n.id} style={{ padding: '10px 12px', borderBottom: '1px solid var(--shell-card-border-subtle)', opacity: n.read ? 0.6 : 1 }}>
                      <p style={{ fontSize: '13px', color: 'var(--shell-text)', margin: 0 }}>{n.title}</p>
                      <p style={{ fontSize: '11px', color: 'var(--shell-text-muted)', margin: '2px 0 0' }}>{n.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <span style={{
              fontSize: '12px', padding: '4px 10px', borderRadius: '20px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.3)', fontWeight: 500,
            }}>
              ● System Normal
            </span>
          </div>
        </header>

        <div className="ds-content">
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
