'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  evaluateSubscriptionAccess,
  SubscriptionAccessState,
} from '@/lib/auth/subscriptionAccess';
import { LoginModal } from '@/components/auth/LoginModal';

interface TerminalAccessGateProps {
  children: React.ReactNode;
  showStatusBanner?: boolean;
}

export function TerminalAccessGate({
  children,
  showStatusBanner = true,
}: TerminalAccessGateProps) {
  const [mounted, setMounted] = useState(false);
  const [access, setAccess] = useState<SubscriptionAccessState | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  const refreshAccess = () => {
    setAccess(evaluateSubscriptionAccess());
  };

  useEffect(() => {
    setMounted(true);
    refreshAccess();
    const onUpdate = () => refreshAccess();
    window.addEventListener('mi007-user-updated', onUpdate);
    window.addEventListener('storage', onUpdate);
    return () => {
      window.removeEventListener('mi007-user-updated', onUpdate);
      window.removeEventListener('storage', onUpdate);
    };
  }, []);

  if (!mounted || !access) {
    return <>{children}</>;
  }

  // Case 1: Locked out (Not signed in OR 3-Day Free Look-In Trial expired without a paid subscription)
  if (access.isLockedOut) {
    return (
      <div className="relative min-h-[calc(100vh-88px)] flex items-center justify-center p-4 bg-[#070B12]">
        <div className="max-w-lg w-full rounded-2xl border border-emerald-500/40 bg-slate-900/95 text-slate-100 p-7 shadow-2xl text-center space-y-5">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-2xl">
            👑
          </div>

          {!access.isSignedIn ? (
            <>
              <div className="space-y-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  TERMINAL ACCESS RESTRICTED
                </span>
                <h2 className="text-2xl font-black mono mt-2">
                  Sign In to Launch MI-007 Terminal
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Access live multi-market dashboards, non-repainting Smart Money Concepts (SMC) charts, F&amp;O Open Interest &amp; Greeks, and Screeners. Includes a{' '}
                  <strong className="text-emerald-400">15-Day Free Look-In Trial</strong> + <strong className="text-amber-400">15% New Launch Offer</strong> upon sign-in.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setLoginOpen(true)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-black tracking-wide transition cursor-pointer shadow-md"
                >
                  ⚡ Sign In / Start Free Trial
                </button>
                <Link
                  href="/pricing"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-amber-500/50 bg-amber-500/10 hover:bg-amber-500 hover:text-slate-950 text-amber-300 font-mono text-xs font-black tracking-wide transition"
                >
                  👑 View Subscription Plans
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-black bg-rose-500/20 text-rose-400 border border-rose-500/40">
                  FREE LOOK-IN PERIOD ENDED
                </span>
                <h2 className="text-2xl font-black mono mt-2">
                  Upgrade Your MI-007 Subscription
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Hi <strong className="text-white">{access.user?.name}</strong>, your 15-day free look-in trial has ended. Choose a plan to continue accessing Live Charts, F&amp;O Analytics, Screeners, and MI-007 AI Intelligence with our{' '}
                  <strong className="text-amber-400">15% New Launch Discount</strong>.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2.5 text-left p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] font-mono">
                <div>
                  <div className="text-slate-400">PULSE BASIC</div>
                  <div className="text-emerald-400 font-black text-sm">₹509/mo</div>
                  <div className="text-[10px] text-slate-500">4 Options Trades</div>
                </div>
                <div>
                  <div className="text-emerald-400 font-bold">MARKET PRO</div>
                  <div className="text-emerald-400 font-black text-sm">₹849/mo</div>
                  <div className="text-[10px] text-slate-500">8 Trades + Builder</div>
                </div>
                <div>
                  <div className="text-amber-400 font-bold">MASTER PRO</div>
                  <div className="text-amber-400 font-black text-sm">₹1,104/mo</div>
                  <div className="text-[10px] text-slate-500">Unlimited + AI Lab</div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-1">
                <Link
                  href="/pricing"
                  className="w-full py-3 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-black tracking-wide transition shadow-md"
                >
                  👑 Subscribe Now with Razorpay (15% Launch Off) →
                </Link>
              </div>
            </>
          )}
        </div>

        <LoginModal
          isOpen={loginOpen}
          onClose={() => setLoginOpen(false)}
          onLoginSuccess={() => {
            setLoginOpen(false);
            refreshAccess();
          }}
        />
      </div>
    );
  }

  // Case 2: Authorized (Active Free Look-In Trial or Paid Tier)
  return (
    <>
      {showStatusBanner && access.tier === 'TRIAL' && (
        <div className="mx-auto max-w-[1600px] px-3 sm:px-6 lg:px-8 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-200 text-[11px] font-mono">
            <span>
              ⏳ <strong>FREE LOOK-IN TRIAL:</strong> {access.daysRemaining} day(s) remaining · Tier Limits: Max {access.limits.maxPortfolioTrades} Options Portfolio Trades, Standard Backtest
            </span>
            <Link
              href="/pricing"
              className="px-2.5 py-0.5 rounded-md bg-amber-400 hover:bg-amber-300 text-slate-950 font-black transition"
            >
              👑 Upgrade Plan (15% Off) →
            </Link>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
