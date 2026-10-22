'use client';

import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { AcademyWorkspace } from '@/components/academy/AcademyWorkspace';

export default function AcademyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--theme-page-bg)] text-[var(--theme-page-text)] transition-colors duration-300">
      <Navbar />

      <main className="flex-1 pt-20 sm:pt-22 pb-8 px-3 sm:px-5 lg:px-6 max-w-[1600px] mx-auto w-full">
        {/* Header */}
        <div className="mb-4 sm:mb-5">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Academy
          </h1>
        </div>

        {/* Academy Master Workspace Container */}
        <div className="relative rounded-2xl border-2 terminal-page-panel shadow-xl p-3 sm:p-5 overflow-hidden bg-[var(--theme-card-bg)]">
          <AcademyWorkspace />
        </div>
      </main>

      <Footer />
    </div>
  );
}
