// ─── Discover Curated & Saved Screens Workspace ─────────────────────────────
'use client';

import React, { useState } from 'react';
import { SavedScreen } from '@/lib/screener/types';
import { PREDEFINED_SCREENS } from '@/lib/screener/templates';
import { deduplicateScreens } from '@/lib/screener/persistence';

interface DiscoverScreensViewProps {
  screens?: SavedScreen[];
  onRunScreen: (screen: SavedScreen) => void;
  onCustomizeScreen: (screen: SavedScreen) => void;
  onEditScreen?: (screen: SavedScreen) => void;
  onDuplicateScreen?: (screen: SavedScreen) => void;
  onDeleteScreen?: (screenId: string) => void;
  onBackToScreener?: () => void;
  onOpenQueryBuilder?: () => void;
}

const CATEGORIES = [
  'All',
  'My Strategies',
  'Quality',
  'Growth',
  'Valuation',
  'Cash Flow',
  'Ownership',
  'Special',
];

export function DiscoverScreensView({
  screens = PREDEFINED_SCREENS,
  onRunScreen,
  onCustomizeScreen,
  onEditScreen,
  onDuplicateScreen,
  onDeleteScreen,
  onBackToScreener,
  onOpenQueryBuilder,
}: DiscoverScreensViewProps) {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [search, setSearch] = useState('');

  const allScreens = deduplicateScreens(screens && screens.length > 0 ? screens : PREDEFINED_SCREENS);
  const userSavedScreens = allScreens.filter((s) => !s.isPredefined);
  const predefinedScreens = allScreens.filter((s) => s.isPredefined);

  const exportScreenJson = (screen: SavedScreen) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(screen, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${screen.name.replace(/\s+/g, '_')}_screen.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleEdit = (screen: SavedScreen) => {
    if (onEditScreen) {
      onEditScreen(screen);
    } else {
      onCustomizeScreen(screen);
    }
  };

  const filterScreenItem = (screen: SavedScreen) => {
    let matchesCat = true;
    if (activeCategory === 'My Strategies') {
      matchesCat = !screen.isPredefined;
    } else if (activeCategory !== 'All') {
      matchesCat = screen.category === activeCategory;
    }
    const matchesSearch =
      !search ||
      screen.name.toLowerCase().includes(search.toLowerCase()) ||
      (screen.description && screen.description.toLowerCase().includes(search.toLowerCase())) ||
      screen.query.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  };

  const filteredScreens = allScreens.filter(filterScreenItem);
  const filteredUserScreens = userSavedScreens.filter(filterScreenItem);
  const filteredPredefinedScreens = predefinedScreens.filter(filterScreenItem);

  const renderScreenCard = (screen: SavedScreen) => {
    const isCustom = !screen.isPredefined;
    return (
      <div
        key={screen.id}
        className={`p-5 rounded-2xl border transition-all shadow-sm flex flex-col justify-between group ${
          isCustom
            ? 'border-emerald-500/60 bg-[var(--theme-card-bg)] hover:border-emerald-500 shadow-emerald-500/5'
            : 'border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] hover:border-emerald-500/70'
        }`}
      >
        <div>
          {/* Card Header */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              {isCustom ? (
                <span className="mono text-[10.5px] font-black px-2 py-0.5 rounded border border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                  ★ My Saved Strategy
                </span>
              ) : (
                <span className="mono text-[10.5px] font-black px-2 py-0.5 rounded border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text-muted)] uppercase tracking-wider">
                  {screen.category || 'Institutional'}
                </span>
              )}
              {screen.category && isCustom && (
                <span className="mono text-[10px] font-bold px-1.5 py-0.5 rounded border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text-muted)]">
                  {screen.category}
                </span>
              )}
            </div>
            <span className="mono text-[10.5px] font-bold text-[var(--theme-card-text-muted)] uppercase shrink-0">
              {screen.market || 'INDIA'}
            </span>
          </div>

          {/* Title */}
          <h3 className="mono text-[16px] font-black text-[var(--theme-card-text)] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-snug">
            {screen.name}
          </h3>

          {/* Description */}
          {screen.description && (
            <p className="text-[12.5px] leading-relaxed text-[var(--theme-card-text-muted)] mt-2 line-clamp-3">
              {screen.description}
            </p>
          )}

          {/* Query conditions preview */}
          <div className="mt-3.5 p-3 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
            <span className="mono text-[10px] font-bold text-[var(--theme-card-text-muted)] uppercase tracking-wider block mb-1">
              Logic Conditions
            </span>
            <pre className="mono text-[11.5px] font-bold text-[var(--theme-card-text)] whitespace-pre-wrap line-clamp-3">
              {screen.query}
            </pre>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 mt-5 pt-3.5 border-t border-[var(--theme-card-border)]/60">
          <button
            type="button"
            onClick={() => onRunScreen(screen)}
            className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 text-slate-950 mono text-[12px] font-black hover:bg-emerald-400 transition-colors shadow-xs text-center cursor-pointer shrink-0"
            title="Run screen and inspect results in Stock Screener table"
          >
            Run Strategy ▶
          </button>

          <button
            type="button"
            onClick={() => handleEdit(screen)}
            className="px-3 py-2 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] mono text-[11.5px] font-bold text-[var(--theme-card-text)] hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
            title="Open in Query Builder"
          >
            {isCustom ? 'Edit ✏️' : 'Customize'}
          </button>

          {isCustom && onDuplicateScreen && (
            <button
              type="button"
              onClick={() => onDuplicateScreen(screen)}
              className="px-2.5 py-2 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] mono text-[11.5px] font-bold text-[var(--theme-card-text)] hover:border-emerald-500 transition-colors cursor-pointer"
              title="Duplicate strategy"
            >
              Clone
            </button>
          )}

          <button
            type="button"
            onClick={() => exportScreenJson(screen)}
            className="px-2 py-2 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] mono text-[11px] font-bold text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)] hover:border-emerald-500 transition-colors cursor-pointer"
            title="Export JSON definition"
          >
            Export
          </button>

          {isCustom && onDeleteScreen && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete "${screen.name}"?`)) {
                  onDeleteScreen(screen.id);
                }
              }}
              className="px-2 py-2 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white mono text-[11.5px] font-bold transition-all cursor-pointer"
              title="Delete saved strategy"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    );
  };

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
                Discover Screening Strategies
              </h2>
            </div>
            <p className="text-[13px] text-[var(--theme-card-text-muted)] font-medium mt-1">
              Curated institutional screens and your custom saved strategies. Click any strategy to execute or edit.
            </p>
          </div>
        </div>

        {/* Action button & Search */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {onOpenQueryBuilder && (
            <button
              type="button"
              onClick={onOpenQueryBuilder}
              className="px-3.5 py-2 rounded-xl border border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 mono text-[12px] font-black transition-all shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <span>+</span>
              <span>New in Query Builder</span>
            </button>
          )}
          <div className="w-full md:w-72">
            <input
              type="text"
              placeholder="Search strategies (e.g. GARP, High ROCE)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-[13px] mono border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const isMyStrat = cat === 'My Strategies';
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-[12.5px] mono font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                  : 'border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)]'
              }`}
            >
              <span>{cat}</span>
              {isMyStrat && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    isActive
                      ? 'bg-slate-950 text-emerald-400'
                      : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {userSavedScreens.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* My Strategies Empty State */}
      {activeCategory === 'My Strategies' && filteredScreens.length === 0 && (
        <div className="p-8 rounded-2xl border-2 border-dashed border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-center flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-[22px]">
            💾
          </div>
          <h3 className="mono text-[16px] font-black text-[var(--theme-card-text)] uppercase">
            No Custom Strategies Saved Yet
          </h3>
          <p className="text-[13px] text-[var(--theme-card-text-muted)] max-w-md">
            Construct complex multi-variable compound screens using boolean and arithmetic operators in Query Builder and click <strong className="text-emerald-700 dark:text-emerald-400">Save Strategy</strong>.
          </p>
          {onOpenQueryBuilder && (
            <button
              type="button"
              onClick={onOpenQueryBuilder}
              className="mt-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 mono text-[13px] font-black hover:bg-emerald-400 transition-colors shadow-xs cursor-pointer"
            >
              Build Strategy in Query Builder ▶
            </button>
          )}
        </div>
      )}

      {/* When 'All' is selected and there are saved screens and no search active: Split into Sections */}
      {activeCategory === 'All' && !search && userSavedScreens.length > 0 ? (
        <div className="flex flex-col gap-8">
          {/* My Saved Strategies Section */}
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--theme-card-border)]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="mono text-[15px] sm:text-[17px] font-black inst-card-text uppercase tracking-wide">
                  My Saved Strategies ({userSavedScreens.length})
                </h3>
              </div>
              <span className="mono text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                Created in Query Builder
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userSavedScreens.map(renderScreenCard)}
            </div>
          </div>

          {/* Curated Institutional Screens Section */}
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--theme-card-border)]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                <h3 className="mono text-[15px] sm:text-[17px] font-black inst-card-text uppercase tracking-wide">
                  Curated Institutional Screens ({predefinedScreens.length})
                </h3>
              </div>
              <span className="mono text-[11px] font-bold text-[var(--theme-card-text-muted)]">
                Predefined Templates
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {predefinedScreens.map(renderScreenCard)}
            </div>
          </div>
        </div>
      ) : (
        /* Regular Flat Grid when filtered or no custom screens */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredScreens.map(renderScreenCard)}
        </div>
      )}
    </div>
  );
}
