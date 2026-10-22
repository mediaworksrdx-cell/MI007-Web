'use client';

import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { EconomicCalendarView } from '@/components/calendar/EconomicCalendarView';

export default function EconomicCalendarPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--theme-page-bg)] text-[var(--theme-page-text)] transition-colors duration-300">
      <Navbar />

      <main className="flex-1 pt-24 sm:pt-28 pb-12 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto w-full">
        {/* Header Telemetry Banner */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="mono text-[11px] font-black tracking-widest uppercase text-emerald-400">
                MACRO CATALYST ENGINE
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight uppercase">
              Global Economic Calendar
            </h1>
            <p className="text-sm opacity-70 mt-1 max-w-2xl">
              Real-time macroeconomic telemetry, central bank rate decisions (RBI, Fed, ECB), and global data releases with institutional consensus deviations.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-3 py-1.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-right">
              <div className="text-[10px] mono font-bold uppercase opacity-60">Coverage</div>
              <div className="mono text-[13px] font-black text-emerald-400">IN · US · EU · UAE</div>
            </div>
            <div className="px-3 py-1.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-right">
              <div className="text-[10px] mono font-bold uppercase opacity-60">Status</div>
              <div className="mono text-[13px] font-black text-emerald-400">● LIVE FEED</div>
            </div>
          </div>
        </div>

        {/* Calendar View Container */}
        <div className="relative rounded-2xl border-2 terminal-page-panel shadow-xl p-3.5 sm:p-6 lg:p-8 overflow-hidden bg-[var(--theme-card-bg)]">
          <EconomicCalendarView />
        </div>
      </main>

      <Footer />
    </div>
  );
}
