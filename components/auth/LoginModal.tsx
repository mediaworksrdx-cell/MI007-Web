'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: (user: { name: string; role: string; deskId: string }) => void;
}

export function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [remember, setRemember] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'institutional' | 'retail'>('institutional');

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      const user = {
        name: email.split('@')[0] || 'QUANT-TRADER',
        role: activeTab === 'institutional' ? 'Tier-1 Institutional' : 'Pro Day Trader',
        deskId: `DESK-${Math.floor(100 + Math.random() * 900)}`,
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('mi007_user_session', JSON.stringify(user));
      }
      setIsLoading(false);
      setIsSuccess(true);
      setTimeout(() => {
        onLoginSuccess?.(user);
        setIsSuccess(false);
        onClose();
      }, 1000);
    }, 700);
  };

  const handleDemoLogin = () => {
    setEmail('alpha.quant@institutional.mi007');
    setKey('MI007-QUANT-VIP-9921');
    setIsLoading(true);

    setTimeout(() => {
      const demoUser = {
        name: 'ALPHA-QUANT',
        role: 'Tier-1 Institutional Desk',
        deskId: 'HQ-DESK-007',
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('mi007_user_session', JSON.stringify(demoUser));
      }
      setIsLoading(false);
      setIsSuccess(true);
      setTimeout(() => {
        onLoginSuccess?.(demoUser);
        setIsSuccess(false);
        onClose();
      }, 900);
    }, 600);
  };

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-[460px] rounded-3xl border border-amber-400/30 bg-slate-900/98 text-slate-100 p-6 sm:p-7 shadow-[0_25px_70px_rgba(0,0,0,0.65)] backdrop-blur-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-amber-500/10 blur-2xl pointer-events-none rounded-full" />

        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Close Login Modal"
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header with Falcon Crest Badge */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="relative mb-3 flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-b from-amber-50 via-amber-100 to-amber-200/90 border-2 border-amber-400 shadow-[0_4px_16px_rgba(217,119,6,0.3)]">
            <Image
              src="/images/branding/falcon-crest.png"
              alt="MI007 Falcon"
              width={42}
              height={42}
              className="object-contain drop-shadow-[0_2px_6px_rgba(180,83,9,0.35)]"
              priority
            />
          </div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="mono text-[10px] uppercase font-black tracking-widest text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              MI-007 SECURE ACCESS
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white font-sans">
            Terminal Client Portal
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs font-sans">
            Institutional order routing, quantitative alpha signals & dynamic options architecture.
          </p>
        </div>

        {/* Account Type Tabs */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950/80 rounded-xl border border-white/10 mb-4 font-mono text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('institutional')}
            className={`py-2 rounded-lg font-bold transition-all ${
              activeTab === 'institutional'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🏛️ Institutional Desk
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('retail')}
            className={`py-2 rounded-lg font-bold transition-all ${
              activeTab === 'retail'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ⚡ Pro Trader
          </button>
        </div>

        {/* Success Banner */}
        {isSuccess ? (
          <div className="py-6 flex flex-col items-center text-center animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 text-2xl mb-3">
              ✓
            </div>
            <h3 className="text-base font-bold text-white mb-1">Session Authenticated</h3>
            <p className="text-xs text-emerald-400 mono">Launching Secure Telemetry Bridge...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Input: Institutional ID / Email */}
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-300 font-bold mb-1">
                {activeTab === 'institutional' ? 'Institutional Desk ID / Work Email' : 'Account Email'}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                  ✉️
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={activeTab === 'institutional' ? 'trader@propfirm.com' : 'you@domain.com'}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-white placeholder-slate-500 text-xs sm:text-sm font-sans outline-none transition-all"
                />
              </div>
            </div>

            {/* Input: Access Key / Passphrase */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-mono uppercase tracking-wider text-slate-300 font-bold">
                  Terminal License Key / Passphrase
                </label>
                <a
                  href="/contact"
                  className="text-[10px] text-amber-400 hover:text-amber-300 mono underline underline-offset-2"
                >
                  Request Key?
                </a>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                  🔒
                </span>
                <input
                  type={showKey ? 'text' : 'password'}
                  required
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="MI007-••••-••••-••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-white placeholder-slate-500 text-xs sm:text-sm font-mono outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs mono"
                >
                  {showKey ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Checkbox: Remember Session */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-sans">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-400 focus:ring-offset-slate-900"
                />
                <span>Remember this terminal session</span>
              </label>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                TLS 256-Bit
              </span>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg transition-all active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>⚡ Authenticate & Launch Cockpit</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>🔑 Instant Demo Trader Access (One-Click)</span>
              </button>
            </div>
          </form>
        )}

        {/* Footnote */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span>Synthetix Analytics Network</span>
          <span>NYSE · NASDAQ · NSE · DFM</span>
        </div>
      </div>
    </div>
  );
}
