'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  activateFreeLookInTrial,
  clearActiveSubscription,
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

  // Never render protected terminal content before client subscription verification completes
  if (!mounted || !access) {
    return (
      <div className="min-h-[calc(100vh-88px)] flex items-center justify-center p-6 bg-[#070B12] text-slate-300 font-mono text-xs">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span>Verifying MI-007 Terminal Subscription...</span>
        </div>
      </div>
    );
  }

  // Strictly block access when user is not signed in OR does not have an active subscription/trial
  if (access.isLockedOut) {
    return (
      <div
        style={{ paddingTop: '110px' }}
        className="min-h-screen flex items-center justify-center p-4 bg-[#070B12]"
      >
        <div className="max-w-xl w-full rounded-2xl border-2 border-emerald-500/40 bg-slate-900/95 text-slate-100 p-7 shadow-2xl text-center space-y-5">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-3xl">
            🔒
          </div>

          {!access.isSignedIn ? (
            <>
              <div className="space-y-2">
                <span className="px-3 py-0.5 rounded-full text-[11px] font-mono font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  TERMINAL ACCESS RESTRICTED
                </span>
                <h2 className="text-2xl font-black mono mt-2">
                  Sign In &amp; Subscription Required
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  The MI-007 Institutional Terminal, Live SMC Charts, Screeners, and F&amp;O Analytics are restricted to authenticated subscribers. Sign in first to activate your{' '}
                  <strong className="text-emerald-400">15-Day Free Look-In Trial</strong> or subscribe with our{' '}
                  <strong className="text-amber-400">15% New Launch Offer</strong>.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2.5 text-left p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono">
                <div>
                  <div className="text-slate-400">MARKET PULSE</div>
                  <div className="text-emerald-400 font-black text-base">₹509/mo</div>
                  <div className="text-[10px] text-slate-500">4 Options Trades</div>
                </div>
                <div>
                  <div className="text-emerald-400 font-bold">MARKET PRO</div>
                  <div className="text-emerald-400 font-black text-base">₹849/mo</div>
                  <div className="text-[10px] text-slate-500">8 Trades + Builder</div>
                </div>
                <div>
                  <div className="text-amber-400 font-bold">MASTER PRO</div>
                  <div className="text-amber-400 font-black text-base">₹1,104/mo</div>
                  <div className="text-[10px] text-slate-500">Unlimited + AI Lab</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setLoginOpen(true)}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-black tracking-wide transition cursor-pointer shadow-md"
                >
                  ⚡ Sign In with Google / OTP
                </button>
                <Link
                  href="/pricing"
                  className="w-full sm:w-auto px-5 py-3 rounded-xl border border-amber-500/50 bg-amber-500/15 hover:bg-amber-500 hover:text-slate-950 text-amber-300 font-mono text-xs font-black tracking-wide transition"
                >
                  👑 View Subscription Plans
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <span className="px-3 py-0.5 rounded-full text-[11px] font-mono font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {access.isTrialExpired ? '15-DAY FREE LOOK-IN ENDED' : 'SUBSCRIPTION REQUIRED'}
                </span>
                <h2 className="text-2xl font-black mono mt-2">
                  Activate Your MI-007 Subscription
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Signed in as <strong className="text-white">{access.user?.name}</strong> ({access.user?.email}).{' '}
                  {access.hasClaimedTrial
                    ? 'Your 15-day free look-in period has ended. Subscribe below with our 15% New Launch Discount to unlock the Terminal.'
                    : 'Choose a Razorpay subscription plan (15% Launch Discount) or activate your one-time 15-Day Free Look-In Trial to unlock the Terminal.'}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2.5 text-left p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono">
                <div>
                  <div className="text-slate-400">MARKET PULSE</div>
                  <div className="text-emerald-400 font-black text-base">₹509/mo</div>
                  <div className="text-[10px] text-slate-500">4 Options Trades</div>
                </div>
                <div>
                  <div className="text-emerald-400 font-bold">MARKET PRO</div>
                  <div className="text-emerald-400 font-black text-base">₹849/mo</div>
                  <div className="text-[10px] text-slate-500">8 Trades + Builder</div>
                </div>
                <div>
                  <div className="text-amber-400 font-bold">MASTER PRO</div>
                  <div className="text-amber-400 font-black text-base">₹1,104/mo</div>
                  <div className="text-[10px] text-slate-500">Unlimited + AI Lab</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
                <Link
                  href="/pricing"
                  className="w-full sm:w-auto py-3 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-black tracking-wide transition shadow-md"
                >
                  👑 Subscribe with Razorpay (15% Off) →
                </Link>
                {!access.hasClaimedTrial && access.user && (
                  <button
                    type="button"
                    onClick={() => {
                      activateFreeLookInTrial(access.user!);
                      refreshAccess();
                    }}
                    className="w-full sm:w-auto py-3 px-5 rounded-xl border border-amber-500/50 bg-amber-500/15 hover:bg-amber-500 hover:text-slate-950 text-amber-300 font-mono text-xs font-black tracking-wide transition cursor-pointer"
                  >
                    ⏳ Activate 15-Day Free Trial
                  </button>
                )}
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

  // Case 2: Authorized (Active Paid Plan or Explicitly Activated 15-Day Trial)
  return (
    <>
      {showStatusBanner && (
        <div className="mx-auto max-w-[1600px] px-3 sm:px-6 lg:px-8 pt-[88px] sm:pt-[94px] -mb-[80px] relative z-30">
          <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-1.5 rounded-xl border border-emerald-500/40 bg-slate-900/90 text-slate-200 text-[11px] font-mono shadow-md">
            <span>
              {access.tier === 'TRIAL' ? '⏳' : '👑'}{' '}
              <strong className="text-emerald-400">{access.tierLabel}</strong> · Max Options Portfolio Trades:{' '}
              <strong>{access.limits.maxPortfolioTrades >= 999 ? 'Unlimited' : access.limits.maxPortfolioTrades}</strong> · Backtest:{' '}
              <strong>{access.limits.allowUnlimitedBacktest ? 'Unlimited' : 'Standard'}</strong>
            </span>
            <div className="flex items-center gap-2">
              <Link
                href="/pricing"
                className="px-2.5 py-0.5 rounded-md bg-amber-400 hover:bg-amber-300 text-slate-950 font-black transition"
              >
                👑 Upgrade Plan (15% Off)
              </Link>
              <button
                type="button"
                onClick={() => {
                  clearActiveSubscription();
                  refreshAccess();
                }}
                className="px-2 py-0.5 rounded-md border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-300 font-bold transition cursor-pointer"
                title="Lock terminal & test subscription paywall"
              >
                🔒 Lock Terminal
              </button>
            </div>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
