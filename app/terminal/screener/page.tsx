// ─── MI007 Screeners Terminal Page ───────────────────────────────────────────
'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useMarket } from '@/lib/marketContext';
import { MARKETS } from '@/lib/types';
import { ScreenerWorkspace } from '@/components/screener/ScreenerWorkspace';
import { Falcon3DLogo } from '@/components/3d/logos/Falcon3DLogo';

export default function ScreenerTerminalPage() {
  const { market, setMarket } = useMarket();

  return (
    <>
      <Navbar market={market} onMarketChange={setMarket} />

      <main className="min-h-screen pt-28 sm:pt-32 relative z-20 bg-transparent pb-24">
        {/* ── Master Dashboard Shell ── */}
        <div className="mx-auto max-w-[1600px] px-3 sm:px-4 lg:px-6 relative z-20 isolate">
          <div className="relative rounded-2xl border-2 terminal-page-panel shadow-xl p-3.5 sm:p-6 lg:p-8 overflow-hidden">
            {/* Top Outer Hairline Accent */}
            <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 pointer-events-none" />

            {/* ── Outer Bezel Header ── */}
            <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 mb-5 sm:mb-6 pb-4 sm:pb-5 border-b border-[var(--theme-card-border)] relative z-10">
              <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                <Link
                  href="/terminal"
                  className="px-3 py-1.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] hover:border-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-2 mono text-[12px] font-bold shadow-xs shrink-0 group"
                  title="Return to Dashboard"
                >
                  <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
                  <span className="font-black">BACK TO DASHBOARD</span>
                </Link>

                <div className="flex h-11 w-11 sm:h-13 sm:w-13 items-center justify-center flex-shrink-0 overflow-visible">
                  <Falcon3DLogo
                    src="/images/logo-falcon-transparent.png"
                    alt="MARKET INTELLIGENCE MI-007"
                    width={52}
                    height={52}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <h1 className="mono text-[17px] sm:text-[23px] font-black inst-card-text tracking-wider uppercase whitespace-nowrap">
                    MARKET INTELLIGENCE MI-007
                  </h1>
                  <p className="text-[12px] sm:text-[14px] inst-card-text-muted font-medium mt-0.5 truncate">
                    Intelligence Beyond the Noise · Equity Screeners
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[13px] sm:text-[15px] mono inst-card-text font-bold shadow-xs">
                  <span>{MARKETS[market].flag}</span>
                  <span className="inst-card-text font-black">{MARKETS[market].label}</span>
                </div>
              </div>
            </div>

            {/* ── Terminal Suite Module Tabs ── */}
            <div className="flex items-center gap-2 mb-6 p-1.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
              <Link
                href="/terminal"
                className="flex-1 sm:flex-none px-4 py-2 rounded-lg mono text-[13px] font-bold tracking-wide text-center transition-all text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)] hover:bg-slate-200/50 dark:hover:bg-white/5 flex items-center justify-center gap-2"
              >
                <span>⚡</span>
                <span>DASHBOARD</span>
              </Link>
              <Link
                href="/terminal/screener"
                className="flex-1 sm:flex-none px-4 py-2 rounded-lg mono text-[13px] font-black tracking-wide text-center transition-all bg-emerald-500 text-slate-950 shadow-xs flex items-center justify-center gap-2"
              >
                <span>🔍</span>
                <span>SCREENERS</span>
              </Link>
            </div>

            {/* Master Screener Workspace */}
            <Suspense fallback={<div className="p-8 text-center text-slate-400 mono text-[13px]">Loading Screener...</div>}>
              <ScreenerWorkspace />
            </Suspense>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
