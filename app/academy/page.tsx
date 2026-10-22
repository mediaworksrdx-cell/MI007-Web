'use client';

import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { AcademyWorkspace } from '@/components/academy/AcademyWorkspace';

export default function AcademyPage() {
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
                INSTITUTIONAL QUANTITATIVE ACADEMY
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight uppercase">
              Cognitive Academy & Simulation Runtime
            </h1>
            <p className="text-sm opacity-70 mt-1 max-w-2xl font-sans">
              Institutional learning framework, Aarka AI 7B cognitive mentoring, Greeks delta-neutral hedging drills, and mathematical risk discipline.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-3 py-1.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-right">
              <div className="text-[10px] mono font-bold uppercase opacity-60">Curriculum</div>
              <div className="mono text-[13px] font-black text-emerald-400">IN · US · UAE</div>
            </div>
            <div className="px-3 py-1.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-right">
              <div className="text-[10px] mono font-bold uppercase opacity-60">Runtime</div>
              <div className="mono text-[13px] font-black text-emerald-400">● SIM ONLINE</div>
            </div>
          </div>
        </div>

        {/* Academy Master Workspace Container */}
        <div className="relative rounded-2xl border-2 terminal-page-panel shadow-xl p-3.5 sm:p-6 lg:p-8 overflow-hidden bg-[var(--theme-card-bg)]">
          <AcademyWorkspace />
        </div>
      </main>

      <Footer />
    </div>
  );
}
