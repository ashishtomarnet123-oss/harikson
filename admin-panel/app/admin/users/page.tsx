'use client';

import React, { useState, useEffect } from 'react';
import { getCookie } from 'cookies-next';
import { Users, Loader2, Mail, BadgeCheck, Clock, Building } from 'lucide-react';

interface User {
  id: string;
  email: string;
  role: string;
  tenant_name: string;
  created_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
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

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-6 h-6 text-indigo-500" />
            <h1 className="text-2xl font-black tracking-tight text-white">Registered Users</h1>
          </div>
          <p className="text-sm text-gray-400">
            View all users and their respective tenants across the platform.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-xl text-red-400 text-sm font-semibold">
          Error: {error}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-950/50 border-b border-gray-800 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-4 px-6">User Email</th>
                <th className="py-4 px-6">Tenant Name</th>
                <th className="py-4 px-6">Role</th>
                <th className="py-4 px-6">Joined Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                    Fetching user records...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-gray-500 font-medium">
                    No users found in the system.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-800/20 transition-all text-gray-300">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center shrink-0">
                          <Mail className="w-4 h-4 text-gray-400" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-200">{user.email}</div>
                          <div className="text-[10px] font-mono text-gray-600 truncate max-w-[150px] mt-0.5">{user.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-indigo-500/50 shrink-0" />
                        <span className="font-medium text-gray-300">{user.tenant_name || 'No Tenant'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                        user.role === 'admin' || user.role === 'superadmin' 
                          ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                          : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                      }`}>
                        {user.role === 'admin' || user.role === 'superadmin' ? <BadgeCheck className="w-3 h-3" /> : null}
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-gray-400 text-xs font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(user.created_at).toLocaleDateString(undefined, { 
                          year: 'numeric', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
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
