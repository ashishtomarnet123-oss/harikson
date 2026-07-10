'use client';

import React, { useState, useEffect } from 'react';
import { getCookie } from 'cookies-next';
import { Users, Loader2, BadgeCheck, Clock, Building, Search, MessageSquare, Zap, Ban, CheckCircle, MoreHorizontal } from 'lucide-react';

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
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const apiBase = '/api-proxy';
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    const token = getCookie('admin_token') || localStorage.getItem('admin_token') || 'TEST_ADMIN_TOKEN';
    try {
      const res = await fetch(`${apiBase}/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [apiBase]);

  const toggleSuspendUser = (userId: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return { ...u, is_suspended: !u.is_suspended };
      }
      return u;
    }));
  };

  const getInitials = (email: string) => {
    if (!email) return 'US';
    return email.split('@')[0].substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (email: string) => {
    const hash = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      'from-blue-500 to-indigo-600',
      'from-purple-500 to-pink-600',
      'from-emerald-400 to-teal-600',
      'from-amber-400 to-orange-600',
      'from-rose-500 to-red-600'
    ];
    return colors[hash % colors.length];
  };

  // Calculations
  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.tenant_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalUsers = users.length;
  const totalConversations = users.reduce((acc, u) => acc + (Number(u.conversations_count) || 0), 0);
  const totalMessages = users.reduce((acc, u) => acc + (Number(u.messages_count) || 0), 0);
  const totalTokens = users.reduce((acc, u) => acc + (Number(u.total_tokens) || 0), 0);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
              <Users className="w-5 h-5 text-indigo-400" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Registered Users</h1>
          </div>
          <p className="text-xs text-gray-400">
            Monitor activity metrics, configure system roles, and manage tenant scope details across the sovereign stack.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search users..."
            className="w-full pl-9 pr-4 py-2 bg-gray-900/40 border border-gray-800/80 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-xl text-red-400 text-xs font-semibold">
          Error: {error}
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-900/30 border border-gray-800/60 p-4 rounded-xl flex flex-col justify-between">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Users</span>
          <div className="text-xl font-black text-white mt-1">{totalUsers}</div>
        </div>
        <div className="bg-gray-900/30 border border-gray-800/60 p-4 rounded-xl flex flex-col justify-between">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Chats</span>
          <div className="text-xl font-black text-indigo-400 mt-1">{totalConversations}</div>
        </div>
        <div className="bg-gray-900/30 border border-gray-800/60 p-4 rounded-xl flex flex-col justify-between">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Messages</span>
          <div className="text-xl font-black text-emerald-400 mt-1">{totalMessages}</div>
        </div>
        <div className="bg-gray-900/30 border border-gray-800/60 p-4 rounded-xl flex flex-col justify-between">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tokens Consumed</span>
          <div className="text-xl font-black text-purple-400 mt-1">{(totalTokens / 1000).toFixed(1)}k</div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-gray-900/40 border border-gray-800/80 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-950/40 border-b border-gray-800 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3.5 px-6">User Email</th>
                <th className="py-3.5 px-6">Tenant Name</th>
                <th className="py-3.5 px-6">Usage Stats</th>
                <th className="py-3.5 px-6">Role</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Joined Date</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50 text-xs">
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
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-800/10 transition-all text-gray-300">
                    {/* User Profile */}
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getAvatarColor(user.email)} flex items-center justify-center shrink-0 shadow-sm text-[11px] font-black text-white`}>
                          {getInitials(user.email)}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-200">{user.email}</div>
                          <div className="text-[9px] font-mono text-gray-600 truncate max-w-[140px] mt-0.5">{user.id}</div>
                        </div>
                      </div>
                    </td>

                    {/* Tenant Info */}
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-2">
                        <Building className="w-3.5 h-3.5 text-indigo-500/40 shrink-0" />
                        <span className="font-medium text-gray-300">{user.tenant_name || 'No Tenant'}</span>
                      </div>
                    </td>

                    {/* Usage telemetry stats */}
                    <td className="py-3 px-6">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <MessageSquare className="w-3 h-3 text-indigo-400" />
                          <span>{user.conversations_count || 0} chats ({user.messages_count || 0} msgs)</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <Zap className="w-3 h-3 text-purple-400" />
                          <span>{Number(user.total_tokens || 0).toLocaleString()} tokens</span>
                        </div>
                      </div>
                    </td>

                    {/* Role Badge */}
                    <td className="py-3 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide border ${
                        user.role === 'admin' || user.role === 'superadmin' 
                          ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                          : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                      }`}>
                        {user.role === 'admin' || user.role === 'superadmin' ? <BadgeCheck className="w-3 h-3" /> : null}
                        {user.role}
                      </span>
                    </td>

                    {/* Status Pill */}
                    <td className="py-3 px-6">
                      {user.is_suspended ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide bg-rose-500/10 border border-rose-500/20 text-rose-400">
                          <span className="w-1 h-1 rounded-full bg-rose-500" />
                          Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          <span className="w-1 h-1 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      )}
                    </td>

                    {/* Joined Date */}
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-1.5 text-gray-400 text-[10px] font-medium">
                        <Clock className="w-3 h-3" />
                        {new Date(user.created_at).toLocaleDateString(undefined, { 
                          year: 'numeric', month: 'short', day: 'numeric'
                        })}
                      </div>
                    </td>

                    {/* Row Actions */}
                    <td className="py-3 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => toggleSuspendUser(user.id)}
                          className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase border transition-colors flex items-center gap-1 ${
                            user.is_suspended
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                              : 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20'
                          }`}
                        >
                          {user.is_suspended ? <CheckCircle className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                          {user.is_suspended ? 'Unsuspend' : 'Suspend'}
                        </button>
                        <button className="p-1 hover:bg-gray-800/80 rounded-md text-gray-500 hover:text-gray-300">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
