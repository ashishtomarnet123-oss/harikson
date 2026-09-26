'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin Panel Route Error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-14 h-14 rounded-2xl bg-red-950/40 border border-red-900/50 flex items-center justify-center mb-4">
        <AlertTriangle className="w-7 h-7 text-red-400" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">
        An error occurred while loading this view
      </h2>
      <p className="text-sm text-gray-400 max-w-md mb-6">
        {error?.message || 'A client-side exception occurred. You can retry loading or refresh the page.'}
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-xl transition"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}
