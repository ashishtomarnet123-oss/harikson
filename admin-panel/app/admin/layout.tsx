'use client';

import React, { useEffect, useState } from 'react';
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
  Lock,
  CreditCard
} from 'lucide-react';
import { getCookie, deleteCookie } from 'cookies-next';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminEmail, setAdminEmail] = useState('');

  useEffect(() => {
    if (pathname === '/admin/login') {
      setLoading(false);
      return;
    }

    const token = getCookie('admin_token') || localStorage.getItem('admin_token');
    if (!token) {
      router.push('/admin/login');
    } else {
      setAuthenticated(true);
      const userStr = localStorage.getItem('admin_user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          setAdminEmail(user.email || 'admin@harikson.ai');
        } catch {
          setAdminEmail('admin@harikson.ai');
        }
      }
      setLoading(false);
    }
  }, [router, pathname]);

  const handleLogout = () => {
    deleteCookie('admin_token');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    router.push('/admin/login');
  };

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center flex-col gap-4">
        <Cpu className="w-10 h-10 text-indigo-500 animate-spin" />
        <span className="text-gray-400 text-sm font-semibold">Verifying credentials...</span>
      </div>
    );
  }

  if (!authenticated && pathname !== '/admin/login') {
    return null;
  }

  const menuItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Tenants', path: '/admin/tenants', icon: Users },
    { name: 'Billing', path: '/admin/billing/providers', icon: CreditCard },
    { name: 'Logs', path: '/admin/logs', icon: Terminal },
    { name: 'Audits', path: '/admin/audit', icon: FileCheck },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex font-sans">
      {/* Mobile Header */}
      <header className="lg:hidden w-full h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 fixed top-0 left-0 z-30">
        <div className="flex items-center gap-2">
          <Cpu className="w-6 h-6 text-indigo-500" />
          <span className="font-extrabold tracking-tight text-white">HARIKSON ADMIN</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 hover:bg-gray-800 rounded">
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-gray-900 border-r border-gray-800 flex flex-col justify-between
        transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div>
          {/* Logo */}
          <div className="h-16 flex items-center gap-3 px-6 border-b border-gray-800">
            <Cpu className="w-7 h-7 text-indigo-500" />
            <span className="font-extrabold tracking-wider bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
              HARIKSON
            </span>
          </div>

          {/* User profile info */}
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center gap-3 px-2 py-1.5 bg-gray-950/50 border border-gray-800/80 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-sm">
                A
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-gray-300 truncate">{adminEmail}</p>
                <p className="text-[10px] text-indigo-400 font-bold uppercase mt-0.5">Administrator</p>
              </div>
            </div>
          </div>

          {/* Links */}
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all
                    ${isActive 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10' 
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'}
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Logout */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-950/20 border border-red-900/30 hover:bg-red-900/20 text-red-400 hover:text-red-300 rounded-xl text-sm font-semibold transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col min-w-0 pt-16 lg:pt-0">
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
