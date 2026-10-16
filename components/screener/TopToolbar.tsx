// ─── Screener Master Top Toolbar ───────────────────────────────────────────
'use client';

import React from 'react';
import { MarketRegion, SavedScreen } from '@/lib/screener/types';

interface TopToolbarProps {
  market: MarketRegion;
  onChangeMarket: (m: MarketRegion) => void;
  sector: string;
  onChangeSector: (s: string) => void;
  availableSectors: string[];
  savedScreens: SavedScreen[];
  selectedScreenId?: string;
  onSelectSavedScreen: (screen: SavedScreen) => void;
  onOpenSaveModal: () => void;
  onOpenCustomRatioModal: () => void;
  onOpenSearchModal: () => void;
  activeTab: string;
  onChangeTab: (tab: any) => void;
  selectedSymbol?: string;
}

export function TopToolbar({
  market,
  onChangeMarket,
  sector,
  onChangeSector,
  availableSectors,
  savedScreens,
  selectedScreenId,
  onSelectSavedScreen,
  onOpenSaveModal,
  onOpenCustomRatioModal,
  onOpenSearchModal,
  activeTab,
  onChangeTab,
  selectedSymbol,
}: TopToolbarProps) {
  const TABS = [
    { id: 'screener', label: '1. Stock Screener' },
    { id: 'discover', label: '2. Discover Screens' },
    { id: 'queryBuilder', label: '3. Query Builder' },
    { id: 'saved', label: '4. Saved Screens' },
    { id: 'watchlists', label: '5. Watchlists' },
    { id: 'analysis', label: `6. Company Analysis ${selectedSymbol ? `(${selectedSymbol})` : ''}` },
    { id: 'peers', label: '7. Peer Comparison' },
    { id: 'alerts', label: '8. Screening Alerts' },
  ];

  return (
    <div className="flex flex-col gap-3 rounded-2xl border-2 terminal-page-panel p-4 sm:p-5 bg-[var(--theme-card-bg)] shadow-xl relative z-10">
      {/* Top Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--theme-card-border)]">
        {/* Title and Market Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="mono text-[16px] sm:text-[18px] font-black inst-card-text tracking-wide uppercase">
              MI-007 Stock Screener
            </span>
            <span className="mono text-[10.5px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
              Institutional Terminal
            </span>
          </div>

          {/* Market selector */}
          <div className="flex items-center gap-1 p-1 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
            {[
              { id: 'INDIA', label: 'IN (NSE/BSE)', flag: '🇮🇳' },
              { id: 'USA', label: 'US (NASDAQ)', flag: '🇺🇸' },
              { id: 'UAE', label: 'AE (DFM/ADX)', flag: '🇦🇪' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onChangeMarket(m.id as MarketRegion)}
                className={`px-2.5 py-1 rounded-lg mono text-[12px] font-bold transition-all flex items-center gap-1.5 ${
                  market === m.id
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                    : 'text-[var(--theme-card-text-muted)] hover:text-white'
                }`}
              >
                <span>{m.flag}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Global Search & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Company Search trigger */}
          <button
            type="button"
            onClick={onOpenSearchModal}
            className="px-3.5 py-1.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] mono text-[12.5px] font-bold hover:border-emerald-500 transition-all flex items-center gap-2 shadow-xs"
          >
            <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span>Search Companies...</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-slate-400">
              /
            </span>
          </button>

          {/* Sector filter */}
          <select
            value={sector}
            onChange={(e) => onChangeSector(e.target.value)}
            className="px-3 py-1.5 rounded-xl mono text-[12.5px] font-bold border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] focus:outline-none focus:border-emerald-500 max-w-44"
          >
            <option value="ALL">All Sectors</option>
            {availableSectors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Saved Screen Dropdown Selector */}
          <select
            value={selectedScreenId || ''}
            onChange={(e) => {
              const found = savedScreens.find((s) => s.id === e.target.value);
              if (found) onSelectSavedScreen(found);
            }}
            className="px-3 py-1.5 rounded-xl mono text-[12.5px] font-bold border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] focus:outline-none focus:border-emerald-500 max-w-48"
          >
            <option value="">Load Screen Preset...</option>
            {savedScreens.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Custom Ratio Creator */}
          <button
            type="button"
            onClick={onOpenCustomRatioModal}
            className="px-3 py-1.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] mono text-[12.5px] font-bold hover:border-emerald-500 hover:text-emerald-400 transition-all shadow-xs"
            title="Create Custom Ratio"
          >
            + Ratio Formula
          </button>

          {/* Save Screen Button */}
          <button
            type="button"
            onClick={onOpenSaveModal}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-500 text-slate-950 mono text-[12.5px] font-black hover:bg-emerald-400 transition-colors shadow-xs flex items-center gap-1.5"
          >
            <span>💾</span>
            <span>Save Screen</span>
          </button>
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
                  : 'border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text-muted)] hover:text-white'
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
