'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Cpu, Lock, Mail, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAdminAuth } from '../../../context/AdminAuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/admin/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Connection failure to admin API gateway.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans p-4">
      <div className="w-full max-w-md p-10 bg-white border border-slate-200 rounded-3xl shadow-2xl relative z-10">
        {/* Logo and Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 bg-white border-2 border-blue-100 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
            <Cpu className="w-7 h-7 text-blue-600" />
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-wide">
            HARIKSON CONTROL PLANE
          </h1>
          <p className="text-[11px] text-slate-500 mt-1 uppercase font-bold tracking-widest">
            Administrator Authentication
          </p>
        </div>

        {/* Security Banner */}
        <div className="mb-6 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 flex-shrink-0 text-blue-600" />
          <span>Sessions protected by HttpOnly SameSite=Strict cookies.</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Input */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-2">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-4 w-5 h-5 text-slate-400 pointer-events-none" />
              <input
                type="email"
                required
                className="w-full pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm rounded-xl text-slate-900 outline-none transition-all placeholder:text-slate-400"
                style={{ paddingLeft: '48px' }}
                placeholder="admin@harikson.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-2">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-4 w-5 h-5 text-slate-400 pointer-events-none" />
              <input
                type="password"
                required
                className="w-full pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm rounded-xl text-slate-900 outline-none transition-all placeholder:text-slate-400"
                style={{ paddingLeft: '48px' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 mt-2"
          >
            {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
          </button>
        </form>

        {/* Footer */}
        <p className="text-[11px] text-slate-600 text-center mt-10 uppercase tracking-widest font-bold">
          Harikson AI · Secure Control Panel
        </p>
      </div>
    </div>
  );
}
