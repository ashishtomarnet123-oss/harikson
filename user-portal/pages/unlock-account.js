import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

export default function UnlockAccountPage() {
  const router = useRouter();
  const [status, setStatus] = useState('unlocking'); // 'unlocking' | 'success' | 'error'
  const [message, setMessage] = useState('Unlocking your account...');
  const [countdown, setCountdown] = useState(5);
  const [apiBase, setApiBase] = useState('http://localhost:3008');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        if (window.location.port) {
          setApiBase(`http://${hostname}:3008`);
        } else {
          setApiBase(
            process.env.NEXT_PUBLIC_API_URL ||
              `${window.location.protocol}//api.${hostname.split('.').slice(1).join('.')}`
          );
        }
      }
    }
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    const { token } = router.query;

    if (!token) {
      setStatus('error');
      setMessage('Missing unlock token. Please check your unlock link.');
      return;
    }

    const unlockAccount = async () => {
      try {
        const res = await fetch(`${apiBase}/api/auth/unlock-account?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (res.ok) {
          setStatus('success');
          setMessage(data.message || 'Account unlocked successfully! You may now sign in.');
        } else {
          setStatus('error');
          setMessage(data.error || 'Unlock link is invalid or has already been used.');
        }
      } catch (err) {
        setStatus('error');
        setMessage('Network error unlocking account. Please try again later.');
      }
    };

    unlockAccount();
  }, [router.isReady, router.query, apiBase]);

  // Countdown timer for automatic redirect on success
  useEffect(() => {
    if (status !== 'success') return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          router.replace('/login?unlocked=true');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status, router]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100 font-sans">
      <Head>
        <title>Unlock Account — Neuravolt AI</title>
      </Head>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-emerald-600/20 border border-emerald-500/30 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        <h2 className="text-center text-2xl font-extrabold text-white tracking-tight">
          Account Lockout Restoration
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900/80 backdrop-blur-md py-8 px-6 shadow-2xl border border-slate-800 rounded-3xl sm:px-10 text-center">
          {status === 'unlocking' && (
            <div className="space-y-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
              <p className="text-sm text-slate-400">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-6">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-base text-emerald-300 font-medium">{message}</p>
              <p className="text-xs text-slate-400">
                Redirecting to login in <span className="font-bold text-white">{countdown}</span> seconds...
              </p>
              <Link
                href="/login?unlocked=true"
                className="w-full inline-flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors"
              >
                Sign In Now
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-6">
              <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto text-rose-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-base text-rose-300 font-medium">{message}</p>
              <Link
                href="/login"
                className="w-full inline-flex justify-center py-3 px-4 border border-slate-700 rounded-xl shadow-sm text-sm font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Back to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
