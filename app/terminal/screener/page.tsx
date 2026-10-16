// ─── MI007 Institutional Stock Screener Terminal Page ────────────────────────
'use client';

import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useMarket } from '@/lib/marketContext';
import { ScreenerWorkspace } from '@/components/screener/ScreenerWorkspace';
import { Falcon3DLogo } from '@/components/3d/logos/Falcon3DLogo';
import Link from 'next/link';

export default function ScreenerPage() {
  const { market, setMarket } = useMarket();

  return (
    <>
      <Navbar market={market} onMarketChange={setMarket} />

      <main className="min-h-screen pt-24 sm:pt-28 relative z-20 bg-transparent pb-24">
        <div className="mx-auto max-w-[1700px] px-3 sm:px-5 lg:px-8 relative z-20 isolate">
          {/* Breadcrumb Header */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 mono text-[12px] sm:text-[13px] text-[var(--theme-card-text-muted)] font-bold">
              <Link href="/terminal" className="hover:text-emerald-400 transition-colors">
                TERMINAL
              </Link>
              <span>›</span>
              <span className="text-emerald-400 font-black">STOCK SCREENER</span>
              <span>›</span>
              <span className="text-[var(--theme-card-text)]">FUNDAMENTAL RESEARCH</span>
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="mono text-[11px] font-bold text-emerald-400">
                LIVE FINANCIAL DATA ENGINE ONLINE
              </span>
            </div>
          </div>

          {/* Master Screener Workspace */}
          <ScreenerWorkspace />
        </div>
      </main>

      <Footer />
    </>
  );
}
