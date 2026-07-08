'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Cpu, Lock, Mail, AlertCircle } from 'lucide-react';
import { setCookie, getCookie } from 'cookies-next';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [apiBase, setApiBase] = useState('http://localhost:4008');

  useEffect(() => {
    // If already logged in, redirect to dashboard
    const token = getCookie('admin_token');
    if (token) {
      router.replace('/admin/dashboard');
    }

    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        setApiBase(`http://${hostname}:4008`);
      }
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${apiBase}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Save token in cookie with 24 hours duration
      setCookie('admin_token', data.token, { maxAge: 24 * 60 * 60 });
      localStorage.setItem('admin_token', data.token);
      localStorage.setItem('admin_user', JSON.stringify(data.user));

      router.replace('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Connection failure to admin API gateway.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center relative overflow-hidden font-sans">
      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-md p-8 bg-gray-900/40 border border-gray-800/80 backdrop-blur-xl rounded-2xl shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-indigo-600/10 border border-indigo-500/20 rounded-xl flex items-center justify-center mb-3">
            <Cpu className="w-6 h-6 text-indigo-500" />
          </div>
          <h1 className="text-xl font-extrabold text-white tracking-wider">HARIKSON CONTROL PLANE</h1>
          <p className="text-xs text-gray-500 mt-1 uppercase font-bold tracking-wider">Administrator Authentication</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4.5 h-4.5 text-gray-500" />
              <input
                type="email"
                required
                className="w-full pl-11 pr-4 py-2.5 bg-gray-950/60 border border-gray-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm rounded-xl text-white outline-none transition-all"
                placeholder="admin@harikson.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4.5 h-4.5 text-gray-500" />
              <input
                type="password"
                required
                className="w-full pl-11 pr-4 py-2.5 bg-gray-950/60 border border-gray-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm rounded-xl text-white outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-950/20 border border-red-900/30 rounded-xl text-xs text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/10 transition-all flex items-center justify-center gap-2"
          >
            {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
          </button>
        </form>

        <p className="text-[10px] text-gray-600 text-center mt-6 uppercase tracking-wider font-bold">
          Harikson AI · Secure Control Panel
        </p>
      </div>
    </div>
  );
}
