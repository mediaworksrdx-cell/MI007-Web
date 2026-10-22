'use client';

import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { AcademyWorkspace } from '@/components/academy/AcademyWorkspace';

export default function AcademyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--theme-page-bg)] text-[var(--theme-page-text)] transition-colors duration-300">
      <Navbar />

      <main className="flex-1 pt-28 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto w-full">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
            Academy
          </h1>
        </div>

        {/* Academy Master Workspace Container */}
        <div className="relative rounded-2xl border-2 terminal-page-panel shadow-xl p-5 sm:p-7 lg:p-8 overflow-hidden bg-[var(--theme-card-bg)]">
          <AcademyWorkspace />
        </div>
      </main>

      <Footer />
    </div>
  );
}
