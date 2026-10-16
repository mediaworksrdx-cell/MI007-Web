// ─── Discover Curated Screens Workspace ─────────────────────────────────────
'use client';

import React, { useState } from 'react';
import { SavedScreen } from '@/lib/screener/types';
import { PREDEFINED_SCREENS } from '@/lib/screener/templates';

interface DiscoverScreensViewProps {
  onRunScreen: (screen: SavedScreen) => void;
  onCustomizeScreen: (screen: SavedScreen) => void;
  onBackToScreener?: () => void;
}

const CATEGORIES = [
  'All',
  'Quality',
  'Growth',
  'Valuation',
  'Cash Flow',
  'Ownership',
  'Special',
];

export function DiscoverScreensView({
  onRunScreen,
  onCustomizeScreen,
  onBackToScreener,
}: DiscoverScreensViewProps) {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [search, setSearch] = useState('');

  const filteredScreens = PREDEFINED_SCREENS.filter((screen) => {
    const matchesCat = activeCategory === 'All' || screen.category === activeCategory;
    const matchesSearch =
      !search ||
      screen.name.toLowerCase().includes(search.toLowerCase()) ||
      screen.description.toLowerCase().includes(search.toLowerCase()) ||
      screen.query.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-150">
      {/* Header bar */}
      <div className="p-6 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          {onBackToScreener && (
            <button
              type="button"
              onClick={onBackToScreener}
              className="px-3.5 py-1.5 rounded-xl border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 transition-colors flex items-center gap-1.5 mono text-[12px] font-black shadow-xs shrink-0 group cursor-pointer"
              title="Return to Stock Screener Table"
            >
              <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
              <span>BACK TO SCREENER</span>
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <h2 className="mono text-[18px] sm:text-[22px] font-black inst-card-text uppercase tracking-wide">
                Discover Curated Screening Strategies
              </h2>
            </div>
            <p className="text-[13px] text-[var(--theme-card-text-muted)] font-medium mt-1">
              Proven institutional fundamental screens inspired by Screener.in frameworks. Click any strategy to inspect matching companies or customize.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="w-full md:w-72">
          <input
            type="text"
            placeholder="Search strategies (e.g. GARP, High ROCE, Debt Free)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl text-[13px] mono border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-xl text-[12.5px] mono font-bold whitespace-nowrap transition-all ${
              activeCategory === cat
                ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                : 'border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text-muted)] hover:text-white'
            }`}
          >
            {cat} Screens
          </button>
        ))}
      </div>

      {/* Grid of Screen Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredScreens.map((screen) => (
          <div
            key={screen.id}
            className="p-5 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] hover:border-emerald-500/80 transition-all shadow-sm flex flex-col justify-between group"
          >
            <div>
              {/* Card Header */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="mono text-[10.5px] font-black px-2 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 uppercase tracking-wider">
                  {screen.category || 'Institutional'}
                </span>
                <span className="mono text-[10.5px] font-bold text-[var(--theme-card-text-muted)] uppercase">
                  {screen.market}
                </span>
              </div>

              {/* Title */}
              <h3 className="mono text-[16px] font-black text-[var(--theme-card-text)] group-hover:text-emerald-400 transition-colors leading-snug">
                {screen.name}
              </h3>

              {/* Description */}
              <p className="text-[12.5px] leading-relaxed text-[var(--theme-card-text-muted)] mt-2 line-clamp-3">
                {screen.description}
              </p>

              {/* Query conditions preview */}
              <div className="mt-3.5 p-3 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
                <span className="mono text-[10px] font-bold text-[var(--theme-card-text-muted)] uppercase tracking-wider block mb-1">
                  Conditions
                </span>
                <pre className="mono text-[11.5px] font-bold text-emerald-300 whitespace-pre-wrap line-clamp-3">
                  {screen.query}
                </pre>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 mt-5 pt-3.5 border-t border-[var(--theme-card-border)]/60">
              <button
                type="button"
                onClick={() => onRunScreen(screen)}
                className="flex-1 py-2 rounded-xl bg-emerald-500 text-slate-950 mono text-[12.5px] font-black hover:bg-emerald-400 transition-colors shadow-xs text-center"
              >
                Run Screen ▶
              </button>
              <button
                type="button"
                onClick={() => onCustomizeScreen(screen)}
                className="px-3.5 py-2 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] mono text-[12px] font-bold text-[var(--theme-card-text)] hover:border-emerald-500 hover:text-emerald-400 transition-colors"
                title="Edit query in query editor"
              >
                Customize
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
