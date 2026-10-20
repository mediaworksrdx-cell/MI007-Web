'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log runtime exception to console
    console.error('Terminal runtime error caught by boundary:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#060A11] text-slate-200 flex flex-col items-center justify-center p-6 select-none font-mono">
      <div className="max-w-md w-full bg-[#0C121D] border border-slate-800 rounded-xl p-8 shadow-2xl text-center">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto mb-4 text-xl">
          ⚠️
        </div>

        <h2 className="text-lg font-black text-white tracking-wide mb-2 uppercase">
          Terminal Stream Interrupted
        </h2>

        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          The chart telemetry session encountered a temporary exception. You can reload the stream or return to the main terminal dashboard.
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            Reconnect Stream
          </button>

          <Link
            href="/terminal"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-colors border border-slate-700"
          >
            Terminal Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
