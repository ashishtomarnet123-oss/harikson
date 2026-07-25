'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCookie } from 'cookies-next';
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
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Mail,
  Send,
  Key,
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  role: string;
  status?: string;
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'suspended'>('all');
  const apiBase = '/api-proxy';
  const [error, setError] = useState('');

  // Details drawer state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userConversations, setUserConversations] = useState<any[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(false);

  // Subscription plan modification state
  const [plans, setPlans] = useState<any[]>([]);
  const [updatingPlan, setUpdatingPlan] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('starter');

  const handleAssignPlan = async (userId: string, planId: string) => {
    setUpdatingPlan(true);
    const token = getCookie('admin_token') || localStorage.getItem('admin_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${apiBase}/v1/admin/users/${userId}/plan`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ planId }),
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`Success: ${data.message || 'Subscription plan updated successfully'}`);
        fetchUsers();
        if (selectedUser?.id === userId) {
          setSelectedUser((prev: any) => (prev ? { ...prev, billing_info: data.billing_info } : null));
        }
      } else {
        alert(`Error: ${data.error || 'Failed to update plan'}`);
      }
    } catch (err: any) {
      alert(`Error updating plan: ${err?.message || err}`);
    } finally {
      setUpdatingPlan(false);
    }
  };

  // Manual transactional email dispatch state
  const [emailSending, setEmailSending] = useState<string | null>(null);

  const handleSendUserEmail = async (userId: string, emailType: string) => {
    setEmailSending(emailType);
    const token = getCookie('admin_token') || localStorage.getItem('admin_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${apiBase}/v1/admin/users/${userId}/send-email`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ emailType }),
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`Success: ${data.message || 'Email dispatched successfully'}`);
      } else {
        alert(`Error: ${data.error || 'Failed to dispatch email'}`);
      }
    } catch (err: any) {
      alert(`Error sending email: ${err?.message || err}`);
    } finally {
      setEmailSending(null);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    const token = getCookie('admin_token') || localStorage.getItem('admin_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${apiBase}/v1/admin/users`, {
        headers,
        credentials: 'include',
      });
      if (res.status === 401 || res.status === 403) {
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
    const token = getCookie('admin_token') || localStorage.getItem('admin_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${apiBase}/v1/admin/plans`, {
        headers,
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPlans();
  }, []);

  const handleUserPlanChange = async (planId: string) => {
    if (!selectedUser) return;
    setUpdatingPlan(true);
    const token = getCookie('admin_token') || localStorage.getItem('admin_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${apiBase}/v1/admin/users/${selectedUser.id}/plan`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify({ planId }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to update plan');
      }
      const data = await res.json();
      const updatedUser = data.user;
      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? { ...u, billing_info: updatedUser.billing_info } : u))
      );
      setSelectedUser((prev) => (prev ? { ...prev, billing_info: updatedUser.billing_info } : null));
    } catch (err: any) {
      alert(err.message || 'Error assigning subscription plan');
    } finally {
      setUpdatingPlan(false);
    }
  };

  useEffect(() => {
    if (!selectedUser) {
      setUserConversations([]);
      return;
    }
    const fetchConversations = async () => {
      setLoadingConvs(true);
      const token = getCookie('admin_token') || localStorage.getItem('admin_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      try {
        const res = await fetch(
          `${apiBase}/v1/admin/users/${selectedUser.id}/conversations`,
          { headers, credentials: 'include' }
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

  const handleUpdateStatus = async (userId: string, newStatus: string) => {
    const token = getCookie('admin_token') || localStorage.getItem('admin_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${apiBase}/v1/admin/users/${userId}/status`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, status: newStatus, is_suspended: newStatus === 'suspended' } : u))
        );
        if (selectedUser?.id === userId) {
          setSelectedUser((prev) =>
            prev ? { ...prev, status: newStatus, is_suspended: newStatus === 'suspended' } : null
          );
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Failed to update user status');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating user status');
    }
  };

  const handleImpersonateUser = async (userId: string) => {
    try {
      const token = getCookie('admin_token') || localStorage.getItem('admin_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${apiBase}/v1/admin/users/${userId}/impersonate`, {
        method: 'POST',
        headers,
        credentials: 'include',
      });
      const data = await res.json();
      const userPortalBase = process.env.NEXT_PUBLIC_USER_PORTAL_URL || 'http://154.201.127.68:3028';
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
    const token = getCookie('admin_token') || localStorage.getItem('admin_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${apiBase}/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
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

  // Filter Calculations
  const pendingCount = users.filter((u) => (u.status || 'active') === 'pending').length;
  const activeCount = users.filter((u) => (u.status || 'active') === 'active').length;
  const suspendedCount = users.filter((u) => u.status === 'suspended').length;

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.tenant_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase());
    
    const userStatus = user.status || 'active';
    const matchesStatus = statusFilter === 'all' || userStatus === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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
            <div>
              <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
                User Access & Management
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Invite-only platform control. Approve pending signups and manage tenant user permissions.
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users by email or tenant..."
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800/80 rounded-xl text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-xl text-red-400 text-xs font-semibold">
          Error: {error}
        </div>
      )}

      {/* Pending Approval Banner */}
      {pendingCount > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-sm font-bold text-amber-900 dark:text-amber-200">
                {pendingCount} Registration Request{pendingCount > 1 ? 's' : ''} Awaiting Approval
              </div>
              <div className="text-xs text-amber-700 dark:text-amber-400">
                These users submitted public signup and require administrator authorization before they can log in.
              </div>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter('pending')}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0"
          >
            Review Pending ({pendingCount})
          </button>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800/60 p-4 rounded-xl flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            Total Registrations
          </span>
          <div className="text-2xl font-black text-gray-900 dark:text-white mt-1">
            {totalUsers}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800/60 p-4 rounded-xl flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
            Pending Approval
          </span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {pendingCount}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800/60 p-4 rounded-xl flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
            Active Users
          </span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {activeCount}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800/60 p-4 rounded-xl flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
            Total LLM Tokens
          </span>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
            {totalTokens.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Table Card */}
      <div className="bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800/60 rounded-2xl overflow-hidden shadow-sm">
        
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 p-3 bg-gray-50/50 dark:bg-gray-950/40 border-b border-gray-200 dark:border-gray-800/60 overflow-x-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-800/50'
            }`}
          >
            All Users ({totalUsers})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              statusFilter === 'pending'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Pending Approval ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Active ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter('suspended')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              statusFilter === 'suspended'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-rose-600 dark:text-rose-400 hover:bg-rose-500/10'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Suspended ({suspendedCount})
          </button>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800/60 bg-gray-50/50 dark:bg-gray-950/40 text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400">
                <th className="py-3.5 px-6 w-[28%]">User Identity</th>
                <th className="py-3.5 px-6 w-[18%]">Tenant Name</th>
                <th className="py-3.5 px-6 w-[18%]">Usage Telemetry</th>
                <th className="py-3.5 px-6 w-[10%]">Role</th>
                <th className="py-3.5 px-6 w-[12%]">Access Status</th>
                <th className="py-3.5 px-6 w-[14%]">Joined Date</th>
                <th className="py-3.5 px-6 w-[10%] text-right">Actions</th>
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
                  <td colSpan={7} className="py-12 text-center text-gray-500 font-medium">
                    No matching users found in the system.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const currentStatus = user.status || 'active';
                  return (
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
                              {user.name || user.email}
                            </div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                              {user.email}
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
                              {user.conversations_count || 0} chats ({user.messages_count || 0} msgs)
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Zap className="w-3 h-3 text-purple-500 shrink-0" />
                            <span>
                              {Number(user.total_tokens || 0).toLocaleString()} tokens
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

                      {/* Status Badge */}
                      <td className="py-3 px-6 whitespace-nowrap">
                        {currentStatus === 'pending' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wide bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-400">
                            <Clock className="w-3 h-3 text-amber-500 animate-pulse" />
                            Pending Approval
                          </span>
                        ) : currentStatus === 'suspended' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wide bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wide bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td className="py-3 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-[10px] font-medium">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          {new Date(user.created_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      </td>

                      {/* Row Actions */}
                      <td
                        className="py-3 px-6 text-right whitespace-nowrap space-x-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {currentStatus === 'pending' ? (
                          <button
                            onClick={() => handleUpdateStatus(user.id, 'active')}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 flex items-center gap-1 inline-flex"
                          >
                            <CheckCircle2 className="w-3 h-3" /> ALLOW ACCESS
                          </button>
                        ) : currentStatus === 'suspended' ? (
                          <button
                            onClick={() => handleUpdateStatus(user.id, 'active')}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95"
                          >
                            Reactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatus(user.id, 'suspended')}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 shadow-sm bg-rose-600 hover:bg-rose-700 text-white active:scale-95"
                          >
                            Suspend
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 shadow-sm bg-red-600 hover:bg-red-700 text-white active:scale-95"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details Slide-over Drawer */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-xl bg-white dark:bg-gray-900 h-full shadow-2xl border-l border-gray-200 dark:border-gray-800 animate-slide-in flex flex-col">
            {/* Drawer Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-950/40">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarColor(
                    selectedUser.email
                  )} flex items-center justify-center text-white font-black text-sm shadow-md`}
                >
                  {getInitials(selectedUser.email)}
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    {selectedUser.name || selectedUser.email}
                  </h2>
                  <p className="text-xs text-gray-500 font-mono">
                    {selectedUser.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Approval Alert if Pending */}
              {(selectedUser.status === 'pending') && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      User Awaiting Approval
                    </div>
                    <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                      This user submitted public signup and cannot access the platform until approved.
                    </div>
                  </div>
                  <button
                    onClick={() => handleUpdateStatus(selectedUser.id, 'active')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" /> ALLOW ACCESS
                  </button>
                </div>
              )}

              {/* Status & Role Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-950/40 p-4 rounded-xl border border-gray-200 dark:border-gray-800/60">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                    Access Status
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    {selectedUser.status === 'pending' ? (
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-400">
                        Pending Approval
                      </span>
                    ) : selectedUser.status === 'suspended' ? (
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-400">
                        Suspended
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400">
                        Active
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-950/40 p-4 rounded-xl border border-gray-200 dark:border-gray-800/60">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                    Role & Scope
                  </span>
                  <div className="flex items-center gap-2 mt-1 font-bold text-xs text-gray-800 dark:text-gray-200">
                    <BadgeCheck className="w-4 h-4 text-purple-500" />
                    {selectedUser.role}
                  </div>
                </div>
              </div>

              {/* Quick Transactional Email Dispatch */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                  Transactional Email Dispatches
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleSendUserEmail(selectedUser.id, 'approval')}
                    disabled={!!emailSending}
                    className="py-2.5 px-3 bg-indigo-50 border border-indigo-200 text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/30 dark:text-indigo-400 rounded-xl text-[11px] font-extrabold shadow-sm hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Mail className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Approval
                  </button>
                  <button
                    onClick={() => handleSendUserEmail(selectedUser.id, 'welcome')}
                    disabled={!!emailSending}
                    className="py-2.5 px-3 bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400 rounded-xl text-[11px] font-extrabold shadow-sm hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Welcome
                  </button>
                  <button
                    onClick={() => handleSendUserEmail(selectedUser.id, 'password_reset')}
                    disabled={!!emailSending}
                    className="py-2.5 px-3 bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-400 rounded-xl text-[11px] font-extrabold shadow-sm hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Key className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Reset Pass
                  </button>
                </div>
              </div>

              {/* Internal Subscription Plan Assignment & Override */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Internal Subscription Plan Override
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                    {selectedUser.billing_info?.planName || 'Free Guest Plan'}
                  </span>
                </div>

                <div className="flex gap-2">
                  <select
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                    className="flex-1 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-900 dark:text-white outline-none"
                  >
                    <option value="free">Free / Guest Trial ($0 - 1 Prompt)</option>
                    <option value="starter">Starter Plan ($19/mo - 100K Tokens)</option>
                    <option value="professional">Professional Plan ($49/mo - 1M Tokens)</option>
                    <option value="enterprise">Enterprise AI OS ($199/mo - Unlimited)</option>
                  </select>
                  <button
                    onClick={() => handleAssignPlan(selectedUser.id, selectedPlanId)}
                    disabled={updatingPlan}
                    className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 shrink-0"
                  >
                    <Zap className={`w-3.5 h-3.5 ${updatingPlan ? 'animate-spin' : ''}`} /> Assign Plan
                  </button>
                </div>
              </div>

              {/* System Knowledge & Data Identifiers */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  System Knowledge & Identifiers
                </span>

                <div className="bg-gray-50 dark:bg-gray-950/40 p-4 rounded-xl border border-gray-200 dark:border-gray-800/60 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-medium">User UUID:</span>
                    <code className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                      {selectedUser.id}
                    </code>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-medium">Tenant Workspace:</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">
                      {selectedUser.tenant_name || 'Neuravolt Default Workspace'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-medium">Registration Date:</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      {new Date(selectedUser.created_at).toLocaleDateString()} ({new Date(selectedUser.created_at).toLocaleTimeString()})
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-medium">Conversations History:</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {selectedUser.conversations_count || 0} chats ({selectedUser.messages_count || 0} messages)
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex gap-3">
                {selectedUser.status === 'pending' ? (
                  <button
                    onClick={() => handleUpdateStatus(selectedUser.id, 'active')}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" /> ALLOW ACCESS
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      handleUpdateStatus(
                        selectedUser.id,
                        selectedUser.status === 'suspended' ? 'active' : 'suspended'
                      )
                    }
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-sm ${
                      selectedUser.status === 'suspended'
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-rose-600 hover:bg-rose-700 text-white'
                    }`}
                  >
                    {selectedUser.status === 'suspended' ? 'Activate User' : 'Suspend User'}
                  </button>
                )}
                <button
                  onClick={() => handleImpersonateUser(selectedUser.id)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-sm bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Impersonate
                </button>
                <button
                  onClick={() => handleDeleteUser(selectedUser.id, selectedUser.email)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-sm bg-red-600 hover:bg-red-700 text-white"
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
