'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Cpu, Lock, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

export default function FirstLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Missing one-time setup token.');
      setLoading(false);
      return;
    }

    // Verify token validity
    fetch(`/api-proxy/v1/admin/auth/verify-first-login?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Invalid or expired setup token');
        }
        return res.json();
      })
      .then((data) => {
        setEmail(data.email || 'admin@harikson.ai');
        setError('');
      })
      .catch((err) => {
        setError(err.message || 'Verification failed. Setup link may be expired.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 12) {
      setError('Password must be at least 12 characters long.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api-proxy/v1/admin/auth/first-login-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to initialize admin credentials');
      }

      setSuccess(true);
      setTimeout(() => {
        router.replace('/admin/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize admin credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Validating one-time setup token...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mb-4 text-blue-400">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide">
            INITIALIZE CONTROL PLANE
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Set mandatory initial password for {email}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center text-emerald-400">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3" />
            <h3 className="font-bold text-lg">Admin Credentials Configured!</h3>
            <p className="text-xs mt-1 text-slate-400">Redirecting to Control Plane Dashboard...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                New Admin Password (min 12 chars)
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-4 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-slate-800 border border-slate-700 focus:border-blue-500 text-white rounded-xl text-sm outline-none transition-all placeholder:text-slate-500"
                  placeholder="••••••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Confirm Password
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-4 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-slate-800 border border-slate-700 focus:border-blue-500 text-white rounded-xl text-sm outline-none transition-all placeholder:text-slate-500"
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
            >
              {submitting ? 'Encrypting & Saving Credentials...' : 'Establish Secure Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
