// ─── Screener Master Top Toolbar ───────────────────────────────────────────
'use client';

import React from 'react';
import { MarketRegion, SavedScreen } from '@/lib/screener/types';
import { deduplicateScreens } from '@/lib/screener/persistence';

interface TopToolbarProps {
  market: MarketRegion;
  onChangeMarket: (m: MarketRegion) => void;
  sector: string;
  onChangeSector: (s: string) => void;
  availableSectors: string[];
  savedScreens: SavedScreen[];
  selectedScreenId?: string;
  onSelectSavedScreen: (screen: SavedScreen) => void;
  onOpenSearchModal: () => void;
  activeTab: string;
  onChangeTab: (tab: any) => void;
  selectedSymbol?: string;
  tradeEngineStatus?: 'connected' | 'connecting' | 'disconnected';
}

export function TopToolbar({
  market: _market,
  onChangeMarket: _onChangeMarket,
  sector,
  onChangeSector,
  availableSectors,
  savedScreens,
  selectedScreenId,
  onSelectSavedScreen,
  onOpenSearchModal,
  activeTab,
  onChangeTab,
  selectedSymbol,
  tradeEngineStatus: _tradeEngineStatus = 'connected',
}: TopToolbarProps) {
  const TABS = [
    { id: 'screener', label: '1. Stock Screener' },
    { id: 'technicalScreener', label: '2. Technical Strategies' },
    { id: 'queryBuilder', label: '3. Query Builder' },
    { id: 'discover', label: '4. Discover Screens' },
    { id: 'watchlists', label: '5. Watchlists' },
    { id: 'analysis', label: `6. Company Analysis ${selectedSymbol ? `(${selectedSymbol})` : ''}` },
    { id: 'peers', label: '7. Peer Matrix' },
    { id: 'alerts', label: '8. Alerts' },
  ];

  return (
    <div className="flex flex-col gap-3 rounded-2xl border-2 terminal-page-panel p-4 sm:p-5 bg-[var(--theme-card-bg)] shadow-xl relative z-10">
      {/* Top Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--theme-card-border)]">
        {/* Title */}
        <div className="flex items-center gap-2">
          <span className="mono text-[15px] sm:text-[17px] font-black inst-card-text tracking-wide uppercase">
            STOCK SCREENER
          </span>
        </div>

        {/* Global Search & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Company Search trigger */}
          <button
            type="button"
            onClick={onOpenSearchModal}
            className="w-72 sm:w-88 md:w-[420px] h-9 px-4 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] mono text-[12.5px] font-bold hover:border-emerald-500 transition-all flex items-center justify-between gap-3 shadow-xs group cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span className="truncate text-[var(--theme-card-text-muted)] group-hover:text-[var(--theme-card-text)] transition-colors">
                Search Companies...
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-slate-400 shrink-0 font-mono font-semibold">
              /
            </span>
          </button>

          {/* Sector filter */}
          <select
            value={sector}
            onChange={(e) => onChangeSector(e.target.value)}
            className="h-9 px-3 rounded-xl mono text-[12.5px] font-bold border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] focus:outline-none focus:border-emerald-500 max-w-44"
          >
            <option value="ALL">All Sectors</option>
            {availableSectors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Saved Screen Dropdown Selector (Deduplicated) */}
          <select
            value={selectedScreenId || ''}
            onChange={(e) => {
              const found = deduplicateScreens(savedScreens).find((s) => s.id === e.target.value);
              if (found) onSelectSavedScreen(found);
            }}
            className="h-9 px-3 rounded-xl mono text-[12.5px] font-bold border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] focus:outline-none focus:border-emerald-500 max-w-48"
          >
            <option value="">Load Screen Preset...</option>
            {deduplicateScreens(savedScreens).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 8 Main Workspace Tabs Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl mono text-[12px] sm:text-[12.5px] font-bold whitespace-nowrap transition-all select-none ${
                isActive
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                  : 'border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)] hover:border-emerald-500'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
