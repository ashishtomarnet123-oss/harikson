'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  Terminal,
  FileCheck,
  LogOut,
  Menu,
  X,
  Cpu,
  CreditCard,
  Bot,
  Activity,
  Database,
  FlaskConical,
  GitBranch,
  Shield,
  Plug,
  HardDrive,
  MonitorSpeaker,
  Bell,
  Search,
} from 'lucide-react';
import { getCookie, deleteCookie } from 'cookies-next';

const menuSections = [
  {
    label: 'Core',
    items: [
      { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
      { name: 'Live Activity', path: '/admin/activity', icon: Activity },
      { name: 'AI Agents', path: '/v1/admin/agents', icon: Bot },
      { name: 'Knowledge', path: '/admin/knowledge', icon: Database },
      { name: 'Playground', path: '/admin/playground', icon: FlaskConical },
    ],
  },
  {
    label: 'Operations',
    items: [
      { name: 'Tenants & Plans', path: '/admin/tenants', icon: Users },
      { name: 'Users', path: '/admin/users', icon: Users },
      { name: 'Workflows', path: '/admin/workflows', icon: GitBranch },
      { name: 'Billing', path: '/admin/billing/providers', icon: CreditCard },
    ],
  },
  {
    label: 'Infrastructure',
    items: [
      { name: 'GPU Monitor', path: '/admin/gpu', icon: MonitorSpeaker },
      { name: 'Security', path: '/admin/security', icon: Shield },
      { name: 'Integrations', path: '/admin/integrations', icon: Plug },
      { name: 'Backups', path: '/admin/backups', icon: HardDrive },
    ],
  },
  {
    label: 'Logs',
    items: [
      { name: 'System Logs', path: '/admin/logs', icon: Terminal },
      { name: 'Audit Trail', path: '/admin/audit', icon: FileCheck },
    ],
  },
];

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminEmail, setAdminEmail] = useState('');
  const apiBase = '/api-proxy';

  // Notification Bell
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);

  // Cmd+K Search
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (pathname === '/admin/login') {
      setLoading(false);
      return;
    }
    const token =
      getCookie('admin_token') || localStorage.getItem('admin_token');
    if (!token) {
      router.push('/admin/login');
    } else {
      setAuthenticated(true);
      const userStr = localStorage.getItem('admin_user');
      if (userStr) {
        try {
          const u = JSON.parse(userStr);
          setAdminEmail(u.email || 'admin@harikson.ai');
        } catch {
          setAdminEmail('admin@harikson.ai');
        }
      }
      setLoading(false);
    }
  }, [router, pathname]);

  // Fetch notifications
  const fetchNotifications = async () => {
    const token =
      getCookie('admin_token') || localStorage.getItem('admin_token');
    try {
      const res = await fetch(`${apiBase}/v1/admin/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        deleteCookie('admin_token');
        localStorage.removeItem('admin_token');
        setAuthenticated(false);
        router.push('/admin/login');
        return;
      }
      if (res.ok) {
        const d = await res.json();
        setNotifications(d.notifications || []);
        setUnreadCount(d.unread_count || 0);
      }
    } catch (err: any) {
      console.error('Error fetching admin notifications:', err);
    }
  };

  useEffect(() => {
    if (authenticated && apiBase) {
      fetchNotifications();
      const i = setInterval(fetchNotifications, 30000);
      return () => clearInterval(i);
    }
  }, [authenticated, apiBase]);

  const markRead = async (id: string) => {
    const token =
      getCookie('admin_token') || localStorage.getItem('admin_token');
    await fetch(`${apiBase}/v1/admin/notifications/${id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    }).catch((err) => {
      console.warn('Warning marking notification as read:', err.message);
    });
    fetchNotifications();
  };

  // Global Search
  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    const token =
      getCookie('admin_token') || localStorage.getItem('admin_token');
    try {
      const res = await fetch(
        `${apiBase}/v1/admin/search?q=${encodeURIComponent(q)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const d = await res.json();
        setSearchResults(d.results || []);
      }
    } catch (err: any) {
      console.error('Error performing global admin search:', err);
    }
  };

  const resultIcons: Record<string, string> = {
    tenant: '🏢',
    agent: '🤖',
    knowledge_base: '📚',
    workflow: '⚡',
  };
  const resultLinks: Record<string, string> = {
    tenant: '/admin/tenants',
    agent: '/v1/admin/agents',
    knowledge_base: '/admin/knowledge',
    workflow: '/admin/workflows',
  };

  useEffect(() => {
    let fCount = 0;
    let timer: NodeJS.Timeout | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch((s) => !s);
      }
      // Escape to close
      if (e.key === 'Escape') {
        setShowSearch(false);
        setShowNotifs(false);
      }
      // Shift+F+F for founder
      if (e.shiftKey && e.key.toLowerCase() === 'f') {
        fCount++;
        if (timer) clearTimeout(timer);
        if (fCount >= 2) {
          fCount = 0;
          router.push('/admin/founder');
        } else {
          timer = setTimeout(() => {
            fCount = 0;
          }, 500);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  useEffect(() => {
    if (showSearch) setTimeout(() => searchRef.current?.focus(), 50);
  }, [showSearch]);

  const handleLogout = () => {
    deleteCookie('admin_token');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    router.push('/admin/login');
  };

  if (pathname === '/admin/login') return <>{children}</>;
  if (loading)
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center flex-col gap-4">
        <Cpu className="w-10 h-10 text-indigo-500 animate-spin" />
        <span className="text-gray-400 text-sm font-semibold">
          Verifying credentials...
        </span>
      </div>
    );
  if (!authenticated && pathname !== '/admin/login') return null;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex font-sans">
      {/* Mobile Header */}
      <header className="lg:hidden w-full h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 fixed top-0 left-0 z-30">
        <div className="flex items-center gap-2">
          <Cpu className="w-6 h-6 text-indigo-500" />
          <span className="font-extrabold tracking-tight text-white">
            HARIKSON ADMIN
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch(true)}
            className="p-1.5 hover:bg-gray-800 rounded-lg"
          >
            <Search className="w-5 h-5 text-gray-400" />
          </button>
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="p-1.5 hover:bg-gray-800 rounded-lg relative"
          >
            <Bell className="w-5 h-5 text-gray-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-gray-800 rounded"
          >
            {sidebarOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 bg-gray-900 border-r border-gray-800 flex flex-col justify-between transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-14 flex items-center justify-between px-5 border-b border-gray-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <Cpu className="w-6 h-6 text-indigo-500" />
              <span className="font-extrabold tracking-wider text-sm bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
                HARIKSON
              </span>
            </div>
            <div className="hidden lg:flex items-center gap-1.5">
              <button
                onClick={() => setShowSearch(true)}
                className="p-1.5 hover:bg-gray-800 rounded-lg"
                title="Search (⌘K)"
              >
                <Search className="w-4 h-4 text-gray-500" />
              </button>
              <button
                onClick={() => setShowNotifs(!showNotifs)}
                className="p-1.5 hover:bg-gray-800 rounded-lg relative"
                title="Notifications"
              >
                <Bell className="w-4 h-4 text-gray-500" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* User Profile */}
          <div className="px-4 py-3 border-b border-gray-800 shrink-0">
            <div className="flex items-center gap-2.5 px-2 py-1.5 bg-gray-950/50 border border-gray-800/80 rounded-xl">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-xs shrink-0">
                A
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-gray-300 truncate">
                  {adminEmail}
                </p>
                <p className="text-[10px] text-indigo-400 font-bold uppercase mt-0.5">
                  Administrator
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
            {menuSections.map((section) => (
              <div key={section.label}>
                <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-2 mb-1">
                  {section.label}
                </div>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      pathname === item.path ||
                      pathname.startsWith(item.path + '/');
                    return (
                      <Link
                        key={item.path}
                        href={item.path}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'}`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer Logout */}
          <div className="px-4 py-3 border-t border-gray-800 shrink-0">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2 bg-red-950/20 border border-red-900/30 hover:bg-red-900/20 text-red-400 hover:text-red-300 rounded-xl text-sm font-semibold transition-all"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 pt-16 lg:pt-0">
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto min-h-0">
          {children}
        </main>
      </div>

      {/* Notification Panel */}
      {showNotifs && (
        <div className="fixed right-4 top-16 z-50 w-80">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <span className="font-bold text-white text-sm">
                Notifications
              </span>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={async () => {
                      const token =
                        getCookie('admin_token') ||
                        localStorage.getItem('admin_token');
                      await fetch(`${apiBase}/v1/admin/notifications/read-all`, {
                        method: 'PATCH',
                        headers: { Authorization: `Bearer ${token}` },
                      }).catch(() => {});
                      fetchNotifications();
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setShowNotifs(false)}
                  className="text-gray-600 hover:text-gray-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 && (
                <div className="text-center text-gray-500 text-sm py-8">
                  No notifications
                </div>
              )}
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`px-4 py-3 border-b border-gray-800/50 cursor-pointer hover:bg-gray-800/40 transition-colors ${!n.is_read ? 'bg-indigo-950/20' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    {!n.is_read && (
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                    )}
                    <div className={!n.is_read ? '' : 'ml-3.5'}>
                      <div className="text-sm font-medium text-gray-200">
                        {n.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {n.message}
                      </div>
                      <div className="text-xs text-gray-700 mt-1">
                        {new Date(n.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cmd+K Search Modal */}
      {showSearch && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
          onClick={() => {
            setShowSearch(false);
            setSearchQuery('');
            setSearchResults([]);
          }}
        >
          <div
            className="w-full max-w-lg bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
              <Search className="w-4 h-4 text-gray-500 shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search tenants, agents, knowledge bases, workflows..."
                className="flex-1 bg-transparent text-sm text-gray-200 focus:outline-none placeholder:text-gray-600"
              />
              <kbd className="text-xs bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded font-mono">
                ESC
              </kbd>
            </div>
            {searchResults.length > 0 && (
              <div className="max-h-72 overflow-y-auto py-2">
                {searchResults.map((r) => (
                  <Link
                    key={r.id}
                    href={`${resultLinks[r.type] || '/admin'}?id=${r.id}`}
                    onClick={() => {
                      setShowSearch(false);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800/60 transition-colors cursor-pointer"
                  >
                    <span className="text-lg">
                      {resultIcons[r.type] || '📄'}
                    </span>
                    <div>
                      <div className="text-sm font-medium text-gray-200">
                        {r.name}
                      </div>
                      {r.subtitle && (
                        <div className="text-xs text-gray-500">
                          {r.subtitle}
                        </div>
                      )}
                    </div>
                    <span className="ml-auto text-xs text-gray-600 capitalize">
                      {r.type?.replace('_', ' ')}
                    </span>
                  </Link>
                ))}
              </div>
            )}
            {searchQuery.length >= 2 && searchResults.length === 0 && (
              <div className="py-8 text-center text-gray-500 text-sm">
                No results for "{searchQuery}"
              </div>
            )}
            {searchQuery.length === 0 && (
              <div className="py-4 px-4">
                <div className="text-xs text-gray-600 mb-2">Quick links</div>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    ['Dashboard', '/admin/dashboard'],
                    ['Agents', '/v1/admin/agents'],
                    ['Activity', '/admin/activity'],
                    ['Playground', '/admin/playground'],
                  ].map(([name, path]) => (
                    <Link
                      key={path}
                      href={path}
                      onClick={() => {
                        setShowSearch(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-200 text-xs transition-colors"
                    >
                      {name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
