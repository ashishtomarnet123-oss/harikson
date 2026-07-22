import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const router = useRouter();
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('Verifying your email address...');
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
      setMessage('Missing verification token. Please check your verification link.');
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await fetch(`${apiBase}/api/auth/verify-email?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (res.ok) {
          setStatus('success');
          setMessage(data.message || 'Email verified successfully! You can now log in.');
        } else {
          setStatus('error');
          setMessage(data.error || 'Verification link is invalid or has expired.');
        }
      } catch (err) {
        setStatus('error');
        setMessage('Network error verifying email. Please try again later.');
      }
    };

    verifyToken();
  }, [router.isReady, router.query, apiBase]);

  // Countdown timer for automatic redirect on success
  useEffect(() => {
    if (status !== 'success') return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          router.replace('/login?verified=true');
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
        <title>Email Verification — Neuravolt AI</title>
      </Head>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-blue-600/20 border border-blue-500/30 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/10">
            <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        <h2 className="text-center text-2xl font-extrabold text-white tracking-tight">
          Email Verification
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900/80 backdrop-blur-md py-8 px-6 shadow-2xl border border-slate-800 rounded-3xl sm:px-10 text-center">
          {status === 'verifying' && (
            <div className="space-y-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
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
                href="/login?verified=true"
                className="w-full inline-flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors"
              >
                Go to Login Immediately
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-6">
              <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto text-rose-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
