'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCookie, deleteCookie } from 'cookies-next';
import {
  Users,
  Loader2,
  BadgeCheck,
  Clock,
  Building,
  Search,
  MessageSquare,
  Zap,
  X,
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  role: string;
  tenant_name: string;
  created_at: string;
  conversations_count?: number;
  messages_count?: number;
  total_tokens?: number;
  is_suspended?: boolean;
  name?: string;
  username?: string;
  phone?: string;
  company?: string;
  job_title?: string;
  department?: string;
  country?: string;
  bio?: string;
  billing_info?: any;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const apiBase = '/api-proxy';
  const [error, setError] = useState('');

  // Details drawer state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userConversations, setUserConversations] = useState<any[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(false);

  // Subscription plan modification state
  const [plans, setPlans] = useState<any[]>([]);
  const [updatingPlan, setUpdatingPlan] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    const token =
      getCookie('admin_token') || localStorage.getItem('admin_token');
    if (!token) {
      // No token at all — redirect to login
      router.replace('/admin/login');
      return;
    }
    try {
      const res = await fetch(`${apiBase}/v1/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        // Token expired or invalid — clear and redirect to login
        deleteCookie('admin_token');
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        router.replace('/admin/login');
        return;
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error (${res.status})`);
      }
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to admin API');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    const token =
      getCookie('admin_token') || localStorage.getItem('admin_token');
    if (!token) return;
    try {
      const res = await fetch(`${apiBase}/v1/admin/plans`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUserPlanChange = async (planId: string) => {
    if (!selectedUser) return;
    setUpdatingPlan(true);
    const token =
      getCookie('admin_token') || localStorage.getItem('admin_token');
    if (!token) return;
    try {
      const idempotencyKey = `plan:user:${selectedUser.id}:${planId || 'clear'}:${Date.now()}:${Math.random()}`;
      const res = await fetch(
        `${apiBase}/v1/admin/users/${selectedUser.id}/plan`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey,
          },
          body: JSON.stringify({ planId: planId || null }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        setUsers((prev) =>
          prev.map((u) => {
            if (u.id === selectedUser.id) {
              return { ...u, billing_info: data.billing_info };
            }
            return u;
          })
        );
        setSelectedUser((prev) =>
          prev ? { ...prev, billing_info: data.billing_info } : null
        );
      } else {
        alert('Failed to update user plan');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating user plan');
    } finally {
      setUpdatingPlan(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPlans();
  }, [apiBase]);

  // Fetch recent conversations for selected user
  useEffect(() => {
    if (!selectedUser) {
      setUserConversations([]);
      return;
    }
    const fetchConversations = async () => {
      setLoadingConvs(true);
      const token =
        getCookie('admin_token') || localStorage.getItem('admin_token');
      try {
        const res = await fetch(
          `${apiBase}/v1/admin/users/${selectedUser.id}/conversations`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (res.ok) {
          const data = await res.json();
          setUserConversations(data.conversations || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingConvs(false);
      }
    };
    fetchConversations();
  }, [selectedUser]);

  const toggleSuspendUser = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          return { ...u, is_suspended: !u.is_suspended };
        }
        return u;
      })
    );
  };

  const handleImpersonateUser = async (userId: string) => {
    try {
      const token = getCookie('admin_token') || localStorage.getItem('admin_token');
      if (!token) return;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/admin/users/${userId}/impersonate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      const userPortalBase = process.env.NEXT_PUBLIC_USER_PORTAL_URL || 'http://localhost:3028';
      const redirectPath = data.redirectUrl || `/impersonate?token=${data.token}`;
      const userPortalUrl = `${userPortalBase}${redirectPath}`;
      window.open(userPortalUrl, '_blank');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (
      !confirm(
        `Are you sure you want to permanently delete user "${email}"? This action cannot be undone.`
      )
    ) {
      return;
    }
    const token =
      getCookie('admin_token') || localStorage.getItem('admin_token');
    if (!token) return;
    try {
      const res = await fetch(`${apiBase}/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        if (selectedUser?.id === userId) {
          setSelectedUser(null);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Failed to delete user');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting user');
    }
  };

  const getInitials = (email: string) => {
    if (!email) return 'US';
    return email.split('@')[0].substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (email: string) => {
    const hash = email
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      'from-blue-500 to-indigo-600',
      'from-purple-500 to-pink-600',
      'from-emerald-400 to-teal-600',
      'from-amber-400 to-orange-600',
      'from-rose-500 to-red-600',
    ];
    return colors[hash % colors.length];
  };

  // Calculations
  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.tenant_name || '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalUsers = users.length;
  const totalConversations = users.reduce(
    (acc, u) => acc + (Number(u.conversations_count) || 0),
    0
  );
  const totalMessages = users.reduce(
    (acc, u) => acc + (Number(u.messages_count) || 0),
    0
  );
  const totalTokens = users.reduce(
    (acc, u) => acc + (Number(u.total_tokens) || 0),
    0
  );

  return (
    <div className="space-y-6 max-w-6xl">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slideIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `,
        }}
      />

      {/* Header */}
      <div className="space-y-1.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
              <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
              Registered Users
            </h1>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800/80 rounded-xl text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Monitor activity metrics, configure system roles, and manage tenant
          scope details across the sovereign stack.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-xl text-red-400 text-xs font-semibold">
          Error: {error}
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800/60 p-4 rounded-xl flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            Total Users
          </span>
          <div className="text-xl font-black text-gray-900 dark:text-white mt-1">
            {totalUsers}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800/60 p-4 rounded-xl flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            Total Chats
          </span>
          <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
            {totalConversations}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800/60 p-4 rounded-xl flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            Total Messages
          </span>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {totalMessages}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800/60 p-4 rounded-xl flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            Tokens Consumed
          </span>
          <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">
            {(totalTokens / 1000).toFixed(1)}k
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800/80 rounded-xl overflow-hidden shadow-sm dark:shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-950/40 border-b border-gray-200 dark:border-gray-800 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3.5 px-6 w-[28%] min-w-[220px]">
                  User Email
                </th>
                <th className="py-3.5 px-6 w-[20%] min-w-[160px]">
                  Tenant Name
                </th>
                <th className="py-3.5 px-6 w-[18%] min-w-[150px]">
                  Usage Stats
                </th>
                <th className="py-3.5 px-6 w-[10%] min-w-[100px]">Role</th>
                <th className="py-3.5 px-6 w-[10%] min-w-[100px]">Status</th>
                <th className="py-3.5 px-6 w-[14%] min-w-[120px]">
                  Joined Date
                </th>
                <th className="py-3.5 px-6 w-[10%] min-w-[100px] text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800/50 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-500 mb-2" />
                    Fetching user records...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-12 text-center text-gray-500 font-medium"
                  >
                    No matching users found in the system.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/10 border-b border-gray-100 dark:border-gray-800/40 transition-all text-gray-700 dark:text-gray-300 cursor-pointer"
                  >
                    {/* User Profile */}
                    <td className="py-3 px-6 text-gray-900 dark:text-gray-200">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getAvatarColor(user.email)} flex items-center justify-center shrink-0 shadow-sm text-[11px] font-black text-white`}
                        >
                          {getInitials(user.email)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 dark:text-gray-200 truncate">
                            {user.email}
                          </div>
                          <div className="text-[9px] font-mono text-gray-400 dark:text-gray-600 truncate mt-0.5">
                            {user.id}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Tenant Info */}
                    <td className="py-3 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Building className="w-3.5 h-3.5 text-indigo-500/40 shrink-0" />
                        <span className="font-medium text-gray-800 dark:text-gray-300">
                          {user.tenant_name || 'No Tenant'}
                        </span>
                      </div>
                    </td>

                    {/* Usage telemetry stats */}
                    <td className="py-3 px-6 whitespace-nowrap">
                      <div className="flex flex-col gap-1 text-[11px] text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1.5">
                          <MessageSquare className="w-3 h-3 text-indigo-500 shrink-0" />
                          <span>
                            {user.conversations_count || 0} chats (
                            {user.messages_count || 0} msgs)
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Zap className="w-3 h-3 text-purple-500 shrink-0" />
                          <span>
                            {Number(user.total_tokens || 0).toLocaleString()}{' '}
                            tokens
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Role Badge */}
                    <td className="py-3 px-6 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide border ${
                          user.role === 'admin' || user.role === 'superadmin'
                            ? 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-500/10 dark:border-purple-500/20 dark:text-purple-400'
                            : 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-400'
                        }`}
                      >
                        {user.role === 'admin' || user.role === 'superadmin' ? (
                          <BadgeCheck className="w-3 h-3 shrink-0" />
                        ) : null}
                        {user.role}
                      </span>
                    </td>

                    {/* Status Pill */}
                    <td className="py-3 px-6 whitespace-nowrap">
                      {user.is_suspended ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      )}
                    </td>

                    {/* Joined Date */}
                    <td className="py-3 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-[10px] font-medium">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        {new Date(user.created_at).toLocaleDateString(
                          undefined,
                          {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          }
                        )}
                      </div>
                    </td>

                    {/* Row Actions */}
                    <td
                      className="py-3 px-6 text-right whitespace-nowrap space-x-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => toggleSuspendUser(user.id)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 shadow-sm ${
                          user.is_suspended
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                            : 'bg-rose-600 hover:bg-rose-700 text-white active:scale-95'
                        }`}
                      >
                        {user.is_suspended ? 'Unsuspend' : 'Suspend'}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id, user.email)}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 shadow-sm bg-red-600 hover:bg-red-700 text-white active:scale-95"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Detail Side Drawer */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-gray-900 h-full shadow-2xl flex flex-col p-6 overflow-y-auto border-l border-gray-200 dark:border-gray-800 animate-slide-in text-gray-900 dark:text-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-850 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarColor(selectedUser.email)} flex items-center justify-center text-white font-black text-sm`}
                >
                  {getInitials(selectedUser.email)}
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-gray-900 dark:text-white truncate max-w-[280px]">
                    User Details
                  </h2>
                  <span className="text-[10px] text-gray-500 font-mono select-all block mt-0.5">
                    {selectedUser.id}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info Grid */}
            <div className="space-y-6">
              <div>
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-2">
                  Account Status
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                      selectedUser.is_suspended
                        ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${selectedUser.is_suspended ? 'bg-rose-500' : 'bg-emerald-500'}`}
                    />
                    {selectedUser.is_suspended ? 'Suspended' : 'Active'}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                      selectedUser.role === 'admin' ||
                      selectedUser.role === 'superadmin'
                        ? 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-500/10 dark:border-purple-500/20 dark:text-purple-400'
                        : 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-400'
                    }`}
                  >
                    {selectedUser.role}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-950/40 p-4 rounded-xl border border-gray-200 dark:border-gray-800/60">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                    Joined Stack
                  </span>
                  <span className="text-xs text-gray-800 dark:text-gray-300 font-semibold block mt-1.5">
                    {new Date(selectedUser.created_at).toLocaleDateString(
                      undefined,
                      {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }
                    )}
                  </span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-950/40 p-4 rounded-xl border border-gray-200 dark:border-gray-800/60">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                    Scope Tenant
                  </span>
                  <span className="text-xs text-gray-800 dark:text-gray-300 font-semibold block mt-1.5 truncate">
                    {selectedUser.tenant_name || 'System Default'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-2">
                  Identity Details
                </span>
                <div className="space-y-2.5 bg-gray-50 dark:bg-gray-950/40 p-4 rounded-xl border border-gray-200 dark:border-gray-800/60 text-xs">
                  <div className="flex justify-between items-center py-1 gap-2">
                    <span className="text-gray-500 font-medium shrink-0">
                      Email Address
                    </span>
                    <span className="text-gray-900 dark:text-gray-200 font-bold select-all break-all text-right">
                      {selectedUser.email}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-t border-gray-200 dark:border-gray-800/50 gap-2">
                    <span className="text-gray-500 font-medium shrink-0">
                      User Unique ID
                    </span>
                    <span className="text-gray-900 dark:text-gray-200 font-mono select-all text-[11px] break-all text-right">
                      {selectedUser.id}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-2">
                  Profile Details
                </span>
                <div className="space-y-2.5 bg-gray-50 dark:bg-gray-950/40 p-4 rounded-xl border border-gray-200 dark:border-gray-800/60 text-xs">
                  <div className="flex justify-between items-center py-1 gap-2">
                    <span className="text-gray-500 font-medium shrink-0">
                      Full Name
                    </span>
                    <span className="text-gray-900 dark:text-gray-200 font-bold text-right">
                      {selectedUser.name || 'Not Provided'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-t border-gray-200 dark:border-gray-800/50 gap-2">
                    <span className="text-gray-500 font-medium shrink-0">
                      Username
                    </span>
                    <span className="text-gray-900 dark:text-gray-200 font-semibold text-right">
                      {selectedUser.username || 'Not Provided'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-t border-gray-200 dark:border-gray-800/50 gap-2">
                    <span className="text-gray-500 font-medium shrink-0">
                      Phone
                    </span>
                    <span className="text-gray-900 dark:text-gray-200 font-semibold text-right">
                      {selectedUser.phone || 'Not Provided'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-t border-gray-200 dark:border-gray-800/50 gap-2">
                    <span className="text-gray-500 font-medium shrink-0">
                      Company
                    </span>
                    <span className="text-gray-900 dark:text-gray-200 font-semibold text-right">
                      {selectedUser.company || 'Not Provided'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-t border-gray-200 dark:border-gray-800/50 gap-2">
                    <span className="text-gray-500 font-medium shrink-0">
                      Title &amp; Dept
                    </span>
                    <span className="text-gray-900 dark:text-gray-200 font-semibold text-right">
                      {selectedUser.job_title || selectedUser.department
                        ? `${selectedUser.job_title || ''} ${selectedUser.department ? `(${selectedUser.department})` : ''}`.trim()
                        : 'Not Provided'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-t border-gray-200 dark:border-gray-800/50 gap-2">
                    <span className="text-gray-500 font-medium shrink-0">
                      Country
                    </span>
                    <span className="text-gray-900 dark:text-gray-200 font-semibold text-right">
                      {selectedUser.country || 'Not Provided'}
                    </span>
                  </div>
                  <div className="flex flex-col py-1 border-t border-gray-200 dark:border-gray-800/50 gap-1.5">
                    <span className="text-gray-500 font-medium">Bio</span>
                    <span className="text-gray-800 dark:text-gray-300 italic whitespace-pre-wrap leading-normal bg-white/40 dark:bg-black/10 p-2 rounded-lg border border-gray-200/50 dark:border-gray-800/50">
                      {selectedUser.bio || 'No biography written.'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Plan Assignment Override */}
              <div>
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-2">
                  Assigned Subscription Plan
                </span>
                <div className="bg-gray-50 dark:bg-gray-950/40 p-4 rounded-xl border border-gray-200 dark:border-gray-800/60 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs text-gray-500 font-medium">
                      Active Override:
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                        selectedUser.billing_info &&
                        Object.keys(selectedUser.billing_info).length > 0
                          ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400'
                          : 'bg-gray-50 border-gray-200 text-gray-500 dark:bg-gray-800/40 dark:border-gray-850 dark:text-gray-400'
                      }`}
                    >
                      {selectedUser.billing_info &&
                      Object.keys(selectedUser.billing_info).length > 0
                        ? selectedUser.billing_info.planName || 'Custom Plan'
                        : 'Workspace Default'}
                    </span>
                  </div>
                  <div className="relative">
                    <select
                      className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-indigo-500 shadow-sm disabled:opacity-50"
                      value={(() => {
                        if (
                          !selectedUser?.billing_info ||
                          Object.keys(selectedUser.billing_info).length === 0
                        )
                          return '';
                        const name = (
                          selectedUser.billing_info.planName || ''
                        ).toLowerCase();
                        if (name.includes('starter')) return 'starter';
                        if (name.includes('professional'))
                          return 'professional';
                        if (name.includes('enterprise')) return 'enterprise';
                        const matchedPlan = plans.find((p) =>
                          name.includes(p.name.toLowerCase())
                        );
                        return matchedPlan ? matchedPlan.id : '';
                      })()}
                      disabled={updatingPlan}
                      onChange={(e) => handleUserPlanChange(e.target.value)}
                    >
                      <option value="">Default (Use Workspace Plan)</option>
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.currency === 'INR' ? '₹' : '$'}
                          {Number(p.price).toFixed(0)}/{p.billing})
                        </option>
                      ))}
                    </select>
                    {updatingPlan && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 leading-normal">
                    Setting an override assigns a custom subscription billing
                    tier directly to this specific user. Clear the override to
                    revert back to tenant defaults.
                  </p>
                </div>
              </div>

              {/* Telemetry Stats */}
              <div>
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-2">
                  Usage Telemetry
                </span>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 dark:bg-gray-950/40 p-3 rounded-xl border border-gray-200 dark:border-gray-800/60 text-center">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Chats
                    </span>
                    <div className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-1">
                      {selectedUser.conversations_count || 0}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-950/40 p-3 rounded-xl border border-gray-200 dark:border-gray-800/60 text-center">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Messages
                    </span>
                    <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">
                      {selectedUser.messages_count || 0}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-950/40 p-3 rounded-xl border border-gray-200 dark:border-gray-800/60 text-center">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Tokens
                    </span>
                    <div className="text-lg font-black text-purple-600 dark:text-purple-400 mt-1">
                      {Number(selectedUser.total_tokens || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* User Conversations List */}
              <div>
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-2">
                  Recent User Chats
                </span>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {loadingConvs ? (
                    <div className="text-center py-6 text-gray-500 text-xs">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto text-indigo-500 mb-1" />
                      Loading conversations...
                    </div>
                  ) : userConversations.length === 0 ? (
                    <div className="text-center py-6 text-gray-500 text-xs font-medium bg-gray-50 dark:bg-gray-950/20 rounded-xl border border-gray-200 dark:border-gray-800/40">
                      No active chats found for this user.
                    </div>
                  ) : (
                    userConversations.map((conv) => (
                      <div
                        key={conv.id}
                        className="bg-gray-50 dark:bg-gray-950/40 p-3 rounded-xl border border-gray-200 dark:border-gray-800/60 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 dark:text-gray-200 truncate">
                            {conv.title || 'Untitled Chat'}
                          </div>
                          <div className="text-[9px] text-gray-500 font-mono mt-0.5">
                            {conv.model} · {conv.messages_count} messages
                          </div>
                        </div>
                        <span className="text-[9px] text-gray-400 shrink-0">
                          {new Date(conv.created_at).toLocaleDateString(
                            undefined,
                            { month: 'short', day: 'numeric' }
                          )}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex gap-3">
                <button
                  onClick={() => {
                    toggleSuspendUser(selectedUser.id);
                    setSelectedUser((prev) =>
                      prev
                        ? { ...prev, is_suspended: !prev.is_suspended }
                        : null
                    );
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-sm ${
                    selectedUser.is_suspended
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-rose-600 hover:bg-rose-700 text-white'
                  }`}
                >
                  {selectedUser.is_suspended ? 'Activate User' : 'Suspend User'}
                </button>
                <button
                  onClick={() => handleImpersonateUser(selectedUser.id)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-sm bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Impersonate
                </button>
                <button
                  onClick={() =>
                    handleDeleteUser(selectedUser.id, selectedUser.email)
                  }
                  className="flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-sm bg-red-600 hover:bg-red-700 text-white"
                >
                  Delete User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
