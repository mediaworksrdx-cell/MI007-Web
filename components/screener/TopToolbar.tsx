// ─── Screener Master Top Toolbar ───────────────────────────────────────────
'use client';

import React from 'react';
import { MarketRegion, SavedScreen } from '@/lib/screener/types';
import { deduplicateScreens } from '@/lib/screener/persistence';

interface TopToolbarProps {
  market: MarketRegion;
  onChangeMarket?: (m: MarketRegion) => void;
  sector: string;
  onChangeSector: (s: string) => void;
  indexFilter?: string;
  onChangeIndexFilter?: (idx: string) => void;
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
  market,
  onChangeMarket: _onChangeMarket,
  sector,
  onChangeSector,
  indexFilter = 'ALL',
  onChangeIndexFilter,
  availableSectors,
  savedScreens,
  selectedScreenId,
  onSelectSavedScreen,
  onOpenSearchModal,
  activeTab,
  onChangeTab,
  selectedSymbol: _selectedSymbol,
  tradeEngineStatus: _tradeEngineStatus = 'connected',
}: TopToolbarProps) {
  // Filter saved/predefined screens strictly to the active country
  const marketScreens = deduplicateScreens(savedScreens).filter(
    (s) => !s.market || s.market === market
  );

  const TABS = [
    { id: 'screener', label: '1. Screeners' },
    { id: 'smcScanner', label: '2. SMC Scanner' },
    { id: 'mi007Strategies', label: '3. MI-007 Strategies' },
    { id: 'tradingStrategies', label: '4. Trading Strategies' },
    { id: 'investmentStrategies', label: '5. Investment Strategies' },
    { id: 'queryBuilder', label: '6. Query Builder' },
    { id: 'discover', label: '7. Discover Screens' },
    { id: 'watchlists', label: '8. Watchlists' },
    { id: 'analysis', label: '9. Company Analysis' },
    { id: 'peers', label: '10. Peer Matrix' },
    { id: 'alerts', label: '11. Alerts' },
  ];

  return (
    <div className="flex flex-col gap-3 rounded-2xl border-2 terminal-page-panel p-4 sm:p-5 bg-[var(--theme-card-bg)] shadow-xl relative z-10">
      {/* Top Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--theme-card-border)]">
        {/* Title & Direct Country Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="mono text-[15px] sm:text-[17px] font-black inst-card-text tracking-wide uppercase">
            SCREENERS
          </span>
        </div>

        {/* Global Search & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 flex-1 justify-end min-w-0">
          {/* Company Search trigger */}
          <button
            type="button"
            onClick={onOpenSearchModal}
            className="flex-1 min-w-[180px] max-w-xs sm:max-w-sm md:max-w-md h-9 px-4 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] mono text-[12.5px] font-bold hover:border-emerald-500 transition-all flex items-center justify-between gap-3 shadow-xs group cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span className="truncate text-[var(--theme-card-text-muted)] group-hover:text-[var(--theme-card-text)] transition-colors">
                {market === 'INDIA' ? 'Search 3,800+ Stocks...' : 'Search Companies...'}
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text-muted)] shrink-0 font-mono font-semibold">
              /
            </span>
          </button>

          {/* US Index Filter (S&P 500, NASDAQ 100, Dow 30) */}
          {market === 'USA' && onChangeIndexFilter && (
            <select
              value={indexFilter || 'ALL'}
              onChange={(e) => onChangeIndexFilter(e.target.value)}
              className="h-9 px-3 rounded-xl mono text-[12.5px] font-bold border border-blue-500/40 bg-[var(--theme-card-surface)] text-blue-400 focus:outline-none focus:border-blue-500 max-w-44"
              title="Filter by US Benchmark Index"
            >
              <option value="ALL">All 3 Indices (517)</option>
              <option value="SP500">S&P 500 (503)</option>
              <option value="NASDAQ100">NASDAQ 100 (100)</option>
              <option value="DOW30">Dow Jones 30 (30)</option>
            </select>
          )}

          {/* Sector filter (Filtered to active country) */}
          <select
            value={sector}
            onChange={(e) => onChangeSector(e.target.value)}
            className="h-9 px-3 rounded-xl mono text-[12.5px] font-bold border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] focus:outline-none focus:border-emerald-500 max-w-44"
          >
            <option value="ALL">All {market === 'INDIA' ? 'India' : market === 'USA' ? 'US' : 'UAE'} Sectors</option>
            {availableSectors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Saved Screen Dropdown Selector (Filtered to active country) */}
          <select
            value={selectedScreenId || ''}
            onChange={(e) => {
              const found = marketScreens.find((s) => s.id === e.target.value);
              if (found) onSelectSavedScreen(found);
            }}
            className="h-9 px-3 rounded-xl mono text-[12.5px] font-bold border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] focus:outline-none focus:border-emerald-500 max-w-48"
          >
            <option value="">Load {market === 'INDIA' ? 'India' : market === 'USA' ? 'US' : 'UAE'} Preset...</option>
            {marketScreens.map((s) => (
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
          const isActive = activeTab === tab.id || (tab.id === 'technicalScreener' && activeTab === 'backtesting');
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
