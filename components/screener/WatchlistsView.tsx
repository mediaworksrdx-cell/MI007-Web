// ─── Watchlists & Tracking Workspace ─────────────────────────────────────────
'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Watchlist, CompanyFundamental } from '@/lib/screener/types';
import { MASTER_COMPANIES } from '@/lib/screener/data';
import { useTradeEngine } from '@/lib/tradeEngineContext';
import { addSymbolToWatchlist } from '@/lib/screener/persistence';
import { searchZerodhaStocks } from '@/lib/screener/zerodhaStocks';

interface WatchlistsViewProps {
  watchlists: Watchlist[];
  onSelectCompany: (symbol: string) => void;
  onRemoveSymbol: (watchlistId: string, symbol: string) => void;
  onAddSymbol?: (watchlistId: string, symbol: string) => void;
  onCreateWatchlist: (name: string, description: string) => void;
  onOpenPeerComparison?: (symbols: string[]) => void;
  onBackToScreener?: () => void;
  companies?: CompanyFundamental[];
}

export function WatchlistsView({
  watchlists,
  onSelectCompany,
  onRemoveSymbol,
  onAddSymbol,
  onCreateWatchlist,
  onOpenPeerComparison,
  onBackToScreener,
  companies = MASTER_COMPANIES,
}: WatchlistsViewProps) {
  const { getSymbolPrice } = useTradeEngine();
  const [activeWatchlistId, setActiveWatchlistId] = useState<string>(
    watchlists[0]?.id || ''
  );
  const [newWlModalOpen, setNewWlModalOpen] = useState(false);
  const [newWlName, setNewWlName] = useState('');
  const [newWlDesc, setNewWlDesc] = useState('');

  // Search & Add state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'warn' } | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const activeWatchlist = watchlists.find((w) => w.id === activeWatchlistId) || watchlists[0];

  // Resolve companies with resilient fallback for any symbol added
  const watchlistCompanies: CompanyFundamental[] = useMemo(() => {
    if (!activeWatchlist?.symbols) return [];
    return activeWatchlist.symbols
      .map((sym) => {
        const clean = sym.trim().toUpperCase();
        const found = companies.find((c) => c.symbol.toUpperCase() === clean);
        if (found) return found;

        // Dynamic fallback for any Zerodha 3,800+ stock or external symbol
        const live = getSymbolPrice(clean);
        return {
          id: clean.toLowerCase(),
          symbol: clean,
          name: clean,
          sector: 'Equities',
          industry: 'Diversified',
          market: activeWatchlist.market || 'INDIA',
          currencySymbol: activeWatchlist.market === 'USA' ? '$' : activeWatchlist.market === 'UAE' ? 'AED ' : '₹',
          currentPrice: live ? live.price : 100,
          priceChangePct: live ? live.changePct : 0,
          marketCap: 0,
          pe: 0,
          roce: 0,
          roe: 0,
          debtToEquity: 0,
          salesGrowth3Y: 0,
          dividendYield: 0,
        } as CompanyFundamental;
      })
      .filter(Boolean) as CompanyFundamental[];
  }, [activeWatchlist, companies, getSymbolPrice]);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchDropdownOpen(false);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const showToast = (text: string, type: 'success' | 'warn' = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => {
      setFeedback((prev) => (prev?.text === text ? null : prev));
    }, 3500);
  };

  const handleAddStock = (rawSymbol: string) => {
    if (!rawSymbol.trim() || !activeWatchlist) return;
    const cleanSym = rawSymbol.trim().toUpperCase();

    const existingSymbols = (activeWatchlist.symbols || []).map((s) => s.toUpperCase());
    if (existingSymbols.includes(cleanSym)) {
      showToast(`${cleanSym} is already in "${activeWatchlist.name}"`, 'warn');
      return;
    }

    if (onAddSymbol) {
      onAddSymbol(activeWatchlist.id, cleanSym);
    } else {
      addSymbolToWatchlist(activeWatchlist.id, cleanSym);
    }

    showToast(`✓ Added ${cleanSym} to "${activeWatchlist.name}"`, 'success');
    setSearchQuery('');
    setSearchDropdownOpen(false);
    searchInputRef.current?.focus();
  };

  // Search matches across screened universe AND 3,800+ Zerodha stocks
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return { screened: [], zerodha: [], total: 0 };

    const screenedMatches = companies.filter(
      (c) =>
        c.symbol.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.sector.toLowerCase().includes(q)
    ).slice(0, 8);

    const screenedSymSet = new Set(screenedMatches.map((c) => c.symbol.toUpperCase()));

    const zerodhaMatches = searchZerodhaStocks(q, 10).filter(
      (z) => !screenedSymSet.has(z.symbol.toUpperCase())
    );

    return {
      screened: screenedMatches,
      zerodha: zerodhaMatches,
      total: screenedMatches.length + zerodhaMatches.length,
    };
  }, [searchQuery, companies]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWlName.trim()) return;
    onCreateWatchlist(newWlName.trim(), newWlDesc.trim());
    setNewWlName('');
    setNewWlDesc('');
    setNewWlModalOpen(false);
  };

  const isSymbolInWatchlist = (sym: string) => {
    return (activeWatchlist?.symbols || []).map((s) => s.toUpperCase()).includes(sym.toUpperCase());
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-150">
      {/* Header bar */}
      <div className="p-6 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          {onBackToScreener && (
            <button
              type="button"
              onClick={onBackToScreener}
              className="px-3.5 py-1.5 rounded-xl border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 transition-colors flex items-center gap-1.5 mono text-[12px] font-black shadow-xs shrink-0 group cursor-pointer"
              title="Return to Screeners Table"
            >
              <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
              <span>BACK TO SCREENER</span>
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="mono text-[18px] sm:text-[22px] font-black inst-card-text uppercase tracking-wide">
                Watchlist Monitor
              </h2>
            </div>
            <p className="text-[13px] text-[var(--theme-card-text-muted)] font-medium mt-1">
              Track fundamental health and valuation drift across your curated conviction holdings.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {onOpenPeerComparison && watchlistCompanies.length >= 2 && (
            <button
              type="button"
              onClick={() => onOpenPeerComparison(watchlistCompanies.map((c) => c.symbol))}
              className="px-3.5 py-2 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] mono text-[12.5px] font-bold text-[var(--theme-card-text)] hover:border-emerald-500 hover:text-emerald-400 transition-all shadow-xs cursor-pointer"
            >
              Compare All Watchlist ⇄
            </button>
          )}

          <button
            type="button"
            onClick={() => setNewWlModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 mono text-[12.5px] font-black hover:bg-emerald-400 transition-colors shadow-xs cursor-pointer"
          >
            + New Watchlist
          </button>
        </div>
      </div>

      {/* Watchlist Tabs Row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {watchlists.map((wl) => (
          <button
            key={wl.id}
            onClick={() => setActiveWatchlistId(wl.id)}
            className={`px-4 py-2 rounded-xl text-[12.5px] mono font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeWatchlist?.id === wl.id
                ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                : 'border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)] hover:border-emerald-500'
            }`}
          >
            {wl.name} ({wl.symbols.length})
          </button>
        ))}
      </div>

      {/* ── Search Bar & Add Stock Control ── */}
      <div className="p-4 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-30">
        <div ref={searchContainerRef} className="relative flex-1 max-w-2xl">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchDropdownOpen(true);
                }}
                onFocus={() => {
                  if (searchQuery.trim()) setSearchDropdownOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (searchQuery.trim()) {
                      handleAddStock(searchQuery);
                    }
                  }
                }}
                placeholder={`Search stock (e.g. INFY, TATAMOTORS, NVDA, AAPL) to add to "${activeWatchlist?.name || 'Watchlist'}"...`}
                className="w-full h-10 pl-10 pr-9 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] mono text-[13px] font-bold placeholder:italic placeholder:font-normal placeholder:opacity-50 placeholder-[var(--theme-card-text-muted)] focus:outline-none focus:border-emerald-500 shadow-inner"
              />
              <svg
                className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchDropdownOpen(false);
                  }}
                  className="absolute right-3 top-2.5 text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)] text-xs mono font-bold cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleAddStock(searchQuery)}
              disabled={!searchQuery.trim()}
              className="h-10 px-5 rounded-xl bg-emerald-500 text-slate-950 mono text-[12.5px] font-black hover:bg-emerald-400 disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
            >
              <span>+</span>
              <span>Add Stock</span>
            </button>
          </div>

          {/* Interactive Search Suggestions Dropdown */}
          {searchDropdownOpen && searchQuery.trim() && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-40 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-2xl overflow-hidden divide-y divide-[var(--theme-card-border)]/50 max-h-80 overflow-y-auto">
              <div className="px-3 py-1.5 bg-[var(--theme-card-surface)] flex items-center justify-between text-[11px] mono font-bold text-[var(--theme-card-text-muted)]">
                <span>
                  {searchResults.total > 0
                    ? `Found ${searchResults.total} matching stocks`
                    : 'Search Directory'}
                </span>
                <span className="text-[10px]">Press Enter or click + Add</span>
              </div>

              {/* Screened Universe Matches */}
              {searchResults.screened.map((comp) => {
                const live = getSymbolPrice(comp.symbol);
                const price = live ? live.price : comp.currentPrice;
                const inWl = isSymbolInWatchlist(comp.symbol);

                return (
                  <div
                    key={comp.id}
                    className="p-2.5 px-3 hover:bg-emerald-500/10 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="mono text-[13px] font-black text-emerald-400">
                          {comp.symbol}
                        </span>
                        <span className="mono text-[10px] px-1.5 py-0.2 rounded border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text-muted)] font-bold">
                          {comp.market} · {comp.sector}
                        </span>
                      </div>
                      <div className="text-[11.5px] text-[var(--theme-card-text-muted)] truncate font-medium">
                        {comp.name}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="mono text-[12.5px] font-bold text-[var(--theme-card-text)]">
                        {comp.currencySymbol}{price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      {inWl ? (
                        <span className="px-2.5 py-1 rounded-lg mono text-[11px] font-bold text-slate-400 bg-slate-500/10 border border-slate-500/20">
                          ✓ In Watchlist
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddStock(comp.symbol)}
                          className="px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 mono text-[11px] font-black hover:bg-emerald-400 transition-colors shadow-xs cursor-pointer"
                        >
                          + Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Zerodha Catalog Matches */}
              {searchResults.zerodha.map((z) => {
                const inWl = isSymbolInWatchlist(z.symbol);
                const live = getSymbolPrice(z.symbol);

                return (
                  <div
                    key={z.token || z.symbol}
                    className="p-2.5 px-3 hover:bg-emerald-500/10 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="mono text-[13px] font-black text-emerald-400">
                          {z.symbol}
                        </span>
                        <span className="mono text-[10px] px-1.5 py-0.2 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-bold">
                          NSE · Zerodha
                        </span>
                      </div>
                      <div className="text-[11.5px] text-[var(--theme-card-text-muted)] truncate font-medium">
                        {z.name}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {live && (
                        <span className="mono text-[12.5px] font-bold text-[var(--theme-card-text)]">
                          ₹{live.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      )}
                      {inWl ? (
                        <span className="px-2.5 py-1 rounded-lg mono text-[11px] font-bold text-slate-400 bg-slate-500/10 border border-slate-500/20">
                          ✓ In Watchlist
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddStock(z.symbol)}
                          className="px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 mono text-[11px] font-black hover:bg-emerald-400 transition-colors shadow-xs cursor-pointer"
                        >
                          + Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Quick direct add option if symbol isn't listed */}
              <div className="p-2.5 px-3 bg-[var(--theme-card-surface)] flex items-center justify-between gap-3">
                <span className="mono text-[11.5px] text-[var(--theme-card-text-muted)]">
                  Add <strong className="text-emerald-400">{searchQuery.toUpperCase()}</strong> directly to watchlist
                </span>
                <button
                  type="button"
                  onClick={() => handleAddStock(searchQuery)}
                  className="px-3 py-1 rounded-lg border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 mono text-[11px] font-black transition-colors cursor-pointer"
                >
                  + Add Stock
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Status / Feedback badge */}
        <div className="flex items-center gap-2">
          {feedback ? (
            <span
              className={`px-3 py-1.5 rounded-xl mono text-[12px] font-bold flex items-center gap-1.5 animate-in fade-in duration-150 ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              }`}
            >
              <span>{feedback.type === 'success' ? '✓' : 'ℹ'}</span>
              <span>{feedback.text}</span>
            </span>
          ) : (
            <span className="mono text-[11.5px] text-[var(--theme-card-text-muted)] font-medium">
              Tracking <strong className="text-[var(--theme-card-text)]">{watchlistCompanies.length}</strong> stocks in {activeWatchlist?.name}
            </span>
          )}
        </div>
      </div>

      {/* Watchlist Table */}
      <div className="rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-md overflow-hidden relative z-10">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left mono text-[13px]">
            <thead>
              <tr className="border-b border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text-muted)] text-[11px] font-black uppercase">
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4 text-right">Current Price</th>
                <th className="py-3 px-4 text-right">Today</th>
                <th className="py-3 px-4 text-right">P/E</th>
                <th className="py-3 px-4 text-right">ROCE %</th>
                <th className="py-3 px-4 text-right">ROE %</th>
                <th className="py-3 px-4 text-right">3Y Sales CAGR</th>
                <th className="py-3 px-4 text-right">Debt / Eq</th>
                <th className="py-3 px-4 text-right">Div Yield</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--theme-card-border)]/50 tabular-nums">
              {watchlistCompanies.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[var(--theme-card-text-muted)]">
                    <p className="mono text-[14px] font-bold text-slate-400 mb-1">
                      This watchlist is empty
                    </p>
                    <p className="text-[12px] opacity-70">
                      Use the search bar above to add stocks, or star companies from the Screener table.
                    </p>
                  </td>
                </tr>
              ) : (
                watchlistCompanies.map((comp) => {
                  const live = getSymbolPrice(comp.symbol);
                  const currentPrice = live ? live.price : comp.currentPrice;
                  const priceChangePct = live ? live.changePct : comp.priceChangePct;
                  const tickDirection = live ? live.tickDirection : 'neutral';
                  const latestEps = comp.annualProfitLoss && comp.annualProfitLoss[0]?.eps;
                  const pe = latestEps && latestEps > 0
                    ? Math.round((currentPrice / latestEps) * 10) / 10
                    : comp.pe;

                  return (
                    <tr key={comp.id || comp.symbol} className="hover:bg-emerald-500/5 transition-colors group">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onSelectCompany(comp.symbol)}
                            className="font-black text-[13.5px] text-[var(--theme-card-text)] group-hover:text-emerald-400 hover:underline transition-colors text-left flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>{comp.symbol}</span>
                            {live && (
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  tickDirection === 'up'
                                    ? 'bg-emerald-400'
                                    : tickDirection === 'down'
                                    ? 'bg-rose-400'
                                    : 'bg-emerald-400/70'
                                } animate-pulse`}
                                title="Kite Live Streaming"
                              />
                            )}
                          </button>
                          <span className="text-[12px] text-[var(--theme-card-text-muted)] font-bold">
                            {comp.name}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-black text-[var(--theme-card-text)]">
                        {comp.currencySymbol}{currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      <td className={`py-3 px-4 text-right font-bold ${priceChangePct >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                        {priceChangePct >= 0 ? '+' : ''}{priceChangePct.toFixed(2)}%
                      </td>

                      <td className="py-3 px-4 text-right font-medium text-[var(--theme-card-text)]">
                        {pe ? `${pe.toFixed(1)}x` : '—'}
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-emerald-700 dark:text-emerald-400">
                        {comp.roce ? `${comp.roce.toFixed(1)}%` : '—'}
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-[var(--theme-card-text)]">
                        {comp.roe ? `${comp.roe.toFixed(1)}%` : '—'}
                      </td>

                      <td className="py-3 px-4 text-right font-medium text-[var(--theme-card-text)]">
                        {comp.salesGrowth3Y ? `${comp.salesGrowth3Y.toFixed(1)}%` : '—'}
                      </td>

                      <td className="py-3 px-4 text-right font-medium text-[var(--theme-card-text)]">
                        {comp.debtToEquity !== null && comp.debtToEquity !== undefined && comp.debtToEquity > 0 ? `${comp.debtToEquity.toFixed(2)}x` : '—'}
                      </td>

                      <td className="py-3 px-4 text-right font-medium text-[var(--theme-card-text)]">
                        {comp.dividendYield ? `${comp.dividendYield.toFixed(2)}%` : '—'}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectCompany(comp.symbol)}
                            className="px-2 py-0.5 rounded border border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold hover:bg-emerald-500 hover:text-slate-950 transition-all cursor-pointer"
                          >
                            Analyze
                          </button>

                          <Link
                            href={`/chart/${comp.symbol}?market=${comp.market}&from=screener`}
                            onClick={() => {
                              if (typeof window !== 'undefined') {
                                sessionStorage.setItem('mi007_return_tab', 'watchlists');
                                sessionStorage.setItem('mi007_return_symbol', comp.symbol);
                              }
                            }}
                            className="px-2 py-0.5 rounded border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text-muted)] text-[11px] font-bold hover:text-[var(--theme-card-text)] transition-all cursor-pointer"
                          >
                            Chart ↗
                          </Link>

                          <button
                            type="button"
                            onClick={() => onRemoveSymbol(activeWatchlist.id, comp.symbol)}
                            className="p-1 text-rose-400 hover:text-rose-300 text-xs cursor-pointer"
                            title="Remove from Watchlist"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Watchlist Modal */}
      {newWlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border-2 terminal-page-panel p-6 bg-[var(--theme-card-bg)] shadow-2xl">
            <h3 className="mono text-[16px] font-black inst-card-text uppercase tracking-wider mb-4">
              Create New Watchlist
            </h3>
            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-3.5">
              <div>
                <label className="block mono text-[12px] font-bold text-[var(--theme-card-text-muted)] uppercase mb-1">
                  Watchlist Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Turnaround Radar"
                  value={newWlName}
                  onChange={(e) => setNewWlName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl mono text-[13px] border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block mono text-[12px] font-bold text-[var(--theme-card-text-muted)] uppercase mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Companies under recovery observation"
                  value={newWlDesc}
                  onChange={(e) => setNewWlDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl mono text-[13px] border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setNewWlModalOpen(false)}
                  className="px-4 py-2 mono text-[12px] text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 mono text-[12px] font-black hover:bg-emerald-400 cursor-pointer"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
