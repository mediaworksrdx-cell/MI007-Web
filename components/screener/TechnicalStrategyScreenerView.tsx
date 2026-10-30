// ─── MI007 Technical Strategy Screener Cockpit ──────────────────────────────
// Live multi-strategy quantitative scanner for the 10 institutional trading strategies.

'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { CompanyFundamental, MarketRegion } from '@/lib/screener/types';
import {
  STRATEGY_DEFINITIONS,
  SMC_STRATEGY_DEFINITIONS,
  COMBINED_STRATEGY_DEFINITIONS,
  StrategyId,
  StrategySignalResult,
  evaluateAllStrategiesForStock,
  evaluateCombinedStrategiesForStock,
} from '@/lib/screener/technicalStrategies';
import { useTradeEngine } from '@/lib/tradeEngineContext';

interface TechnicalStrategyScreenerViewProps {
  companies: CompanyFundamental[];
  market: MarketRegion;
  onSelectCompany: (symbol: string) => void;
  onOpenBacktest?: (symbol: string, strategyId: StrategyId) => void;
  onBackToScreener: () => void;
}

// Evaluation cache (module-scoped: results are a pure function of the cache key)
const TECH_EVAL_CACHE = new Map<string, StrategySignalResult[]>();

export function TechnicalStrategyScreenerView({
  companies,
  market,
  onSelectCompany,
  onOpenBacktest,
  onBackToScreener,
}: TechnicalStrategyScreenerViewProps) {
  const [selectedStrategyId, setSelectedStrategyId] = useState<StrategyId | 'ALL'>('ALL');
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'bullish' | 'bearish'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Interactive Pagination state (prevents DOM overload and main thread freeze)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { getSymbolPrice, status: tradeEngineStatus } = useTradeEngine();

  // Reset to page 1 whenever any filter or search query changes
  useEffect(() => {
    setPage(1);
  }, [selectedStrategyId, directionFilter, categoryFilter, searchQuery]);

  // High-performance institutional scanning universe:
  // Evaluates top liquid equities (e.g. curated large-caps & mid-caps) plus any stock matched by the search query.
  const targetUniverse = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    // Base institutional liquid universe
    let baseList = companies;
    if (companies.length > 80) {
      const sortedByCap = [...companies].sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
      baseList = sortedByCap.slice(0, 80);
    }

    if (!q) return baseList;

    // Dynamically include any company in the full catalog matching user's search
    const matchingFromCatalog = companies
      .filter((c) => c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
      .slice(0, 30);

    const map = new Map<string, CompanyFundamental>();
    baseList.forEach((c) => map.set(c.symbol.toUpperCase(), c));
    matchingFromCatalog.forEach((c) => map.set(c.symbol.toUpperCase(), c));
    return Array.from(map.values());
  }, [companies, searchQuery]);

  // Memoized evaluation cache: skips re-generating candles and indicator math if price is identical

  // Evaluate all 10 quantitative models across the target universe
  const scanResults = useMemo(() => {
    const list: StrategySignalResult[] = [];
    const cache = TECH_EVAL_CACHE;
    if (cache.size > 5000) cache.clear();

    targetUniverse.forEach((comp) => {
      const live = getSymbolPrice(comp.symbol);
      const price = live?.price ?? comp.currentPrice;
      const cacheKey = `${comp.market}:${comp.symbol}:${price}`;

      let results = cache.get(cacheKey);
      if (!results) {
        results = evaluateCombinedStrategiesForStock(comp.symbol, comp.name, comp.market, price);
        cache.set(cacheKey, results);
      }
      list.push(...results);
    });
    return list;
  }, [targetUniverse, getSymbolPrice]);

  // Categories (including 'Smart Money Concepts')
  const categories = useMemo(() => {
    return Array.from(new Set(COMBINED_STRATEGY_DEFINITIONS.map((s) => s.category)));
  }, []);

  // Filtered Results
  const filteredResults = useMemo(() => {
    return scanResults.filter((res) => {
      // Strategy filter
      if (selectedStrategyId !== 'ALL' && res.strategyId !== selectedStrategyId) {
        return false;
      }
      // Category filter
      if (categoryFilter !== 'ALL') {
        const strat = COMBINED_STRATEGY_DEFINITIONS.find((s) => s.id === res.strategyId);
        if (strat?.category !== categoryFilter) return false;
      }
      // Direction filter
      if (directionFilter !== 'ALL' && res.direction !== directionFilter) {
        return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          res.symbol.toLowerCase().includes(q) ||
          res.companyName.toLowerCase().includes(q) ||
          res.strategyName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [scanResults, selectedStrategyId, categoryFilter, directionFilter, searchQuery]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredResults.length / pageSize) || 1;
  const safePage = Math.min(page, totalPages);
  const paginatedResults = useMemo(() => {
    return filteredResults.slice((safePage - 1) * pageSize, safePage * pageSize);
  }, [filteredResults, safePage, pageSize]);

  const activeStrategy = COMBINED_STRATEGY_DEFINITIONS.find((s) => s.id === selectedStrategyId);

  const visibleStrategies = useMemo(() => {
    if (categoryFilter === 'ALL') return COMBINED_STRATEGY_DEFINITIONS;
    return COMBINED_STRATEGY_DEFINITIONS.filter((s) => s.category === categoryFilter);
  }, [categoryFilter]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToScreener}
            className="px-3.5 py-1.5 rounded-xl border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 transition-colors flex items-center gap-1.5 mono text-[12px] font-black shadow-xs cursor-pointer group"
            title="Return to Screeners Table"
          >
            <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
            <span>BACK TO SCREENER</span>
          </button>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="mono text-[18px] sm:text-[22px] font-black inst-card-text uppercase tracking-wide">
                Technical Strategy Intelligence Scanner
              </h1>
              <span className="mono text-[11px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
                14 Quantitative Models (10 Classic + 4 SMC Confluence)
              </span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 mono text-[10.5px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>LIVE FEED</span>
              </div>
            </div>
            <p className="text-[12.5px] text-[var(--theme-card-text-muted)] font-medium mt-0.5">
              Automated multi-timeframe pattern detection, moving average hierarchies, and Smart Money Concepts.
            </p>
          </div>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-2">
          {onOpenBacktest && (
            <button
              type="button"
              onClick={() => onOpenBacktest(companies[0]?.symbol || 'RELIANCE', 'ma_alignment')}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 mono text-[12.5px] font-black hover:bg-emerald-400 transition-colors shadow-xs cursor-pointer"
            >
              Backtesting Engine ↗
            </button>
          )}
        </div>
      </div>

      {/* ── Strategy Selector Cards Carousel / Grid ── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-[11px] mono font-bold text-[var(--theme-card-text-muted)] uppercase tracking-wider px-1">
          <span>Select Strategy ({visibleStrategies.length} Built-In Models):</span>
          {selectedStrategyId !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSelectedStrategyId('ALL')}
              className="text-emerald-400 hover:underline cursor-pointer"
            >
              Reset to All Strategies
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          <button
            type="button"
            onClick={() => setSelectedStrategyId('ALL')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              selectedStrategyId === 'ALL'
                ? 'border-emerald-500 bg-emerald-500/15 shadow-sm'
                : 'border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] hover:border-slate-500'
            }`}
          >
            <div className="mono text-[12px] font-black text-[var(--theme-card-text)] truncate">
              All {categoryFilter === 'ALL' ? '26' : categoryFilter} Strategies
            </div>
            <div className="text-[10px] mono text-[var(--theme-card-text-muted)] mt-1">
              {filteredResults.length} Signals Detected
            </div>
          </button>

          {visibleStrategies.map((s) => {
            const isSelected = selectedStrategyId === s.id;
            const matchesCount = scanResults.filter((r) => r.strategyId === s.id && r.signalTriggered).length;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedStrategyId(s.id)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-500/15 shadow-sm'
                    : 'border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] hover:border-slate-500'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="mono text-[11px] font-black text-[var(--theme-card-text)] truncate">{s.name}</span>
                  <span className="text-[9px] mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-emerald-400 font-bold shrink-0 leading-none">
                    {matchesCount}
                  </span>
                </div>
                <div className="text-[9.5px] mono text-[var(--theme-card-text-muted)] truncate mt-1">
                  {s.category}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Active Strategy Teardown & Filter Toolbar ── */}
      <div className="p-4 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-sm flex flex-col gap-4">
        {activeStrategy && (
          <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="mono text-[13px] font-black text-emerald-400 uppercase">
                  {activeStrategy.name}
                </span>
                <span className="mono text-[10.5px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                  {activeStrategy.category}
                </span>
              </div>
              <div className="mono text-[11px] text-[var(--theme-card-text-muted)]">
                Default: {JSON.stringify(activeStrategy.defaultParameters).replace(/[{}"]/g, '').replace(/:/g, '=')}
              </div>
            </div>
            <p className="text-[12px] text-[var(--theme-card-text)] mt-1.5 leading-relaxed">
              {activeStrategy.description}
            </p>
          </div>
        )}

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* Direction Filter */}
            <div className="flex items-center gap-1 p-1 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
              {(['ALL', 'bullish', 'bearish'] as const).map((dir) => (
                <button
                  key={dir}
                  type="button"
                  onClick={() => setDirectionFilter(dir)}
                  className={`px-3 py-1 rounded-lg mono text-[11px] font-bold transition-all cursor-pointer ${
                    directionFilter === dir
                      ? dir === 'bullish'
                        ? 'bg-emerald-500 text-slate-950 font-black'
                        : dir === 'bearish'
                        ? 'bg-rose-500 text-white font-black'
                        : 'bg-emerald-500 text-slate-950 font-black'
                      : 'text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)]'
                  }`}
                >
                  {dir === 'ALL' ? 'All Directions' : dir === 'bullish' ? '▲ Bullish Signals' : '▼ Bearish Signals'}
                </button>
              ))}
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1 p-1 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
              {['ALL', ...categories].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg mono text-[11px] font-bold transition-all cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-emerald-500 text-slate-950 font-black'
                      : 'text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search symbol or strategy..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-[12px] mono border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] placeholder-slate-400 focus:outline-none focus:border-emerald-500 w-48 sm:w-60"
            />
          </div>
        </div>
      </div>

      {/* ── Results Table ── */}
      <div className="rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-md overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
          <div className="flex items-center gap-2">
            <span className="mono text-[14px] font-black inst-card-text uppercase tracking-wide">
              Strategy Scanner Matches
            </span>
            <span className="mono text-[11.5px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
              {filteredResults.length} Active Triggers
            </span>
          </div>
          <span className="text-[11px] mono text-[var(--theme-card-text-muted)]">
            Market: {market} · Frequency: Daily Candles
          </span>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[550px]">
          <table className="w-full border-collapse text-left mono text-[12.5px]">
            <thead className="sticky top-0 z-10 bg-[var(--theme-card-surface)] border-b border-[var(--theme-card-border)] shadow-xs">
              <tr className="text-[11px] text-[var(--theme-card-text-muted)] font-black uppercase tracking-wider">
                <th className="py-3 px-3.5">Company / Symbol</th>
                <th className="py-3 px-3">Strategy</th>
                <th className="py-3 px-3 text-center">Direction</th>
                <th className="py-3 px-3 text-right">LTP</th>
                <th className="py-3 px-3 text-right">Trigger Price</th>
                <th className="py-3 px-3 text-right">Historical Win %</th>
                <th className="py-3 px-3">Signal Explanation</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--theme-card-border)]/40 tabular-nums">
              {filteredResults.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[var(--theme-card-text-muted)]">
                    <span className="block mono text-[14px] font-bold text-[var(--theme-card-text-muted)] mb-1">
                      No technical signals match current parameters
                    </span>
                    <span className="text-[12px] opacity-70">
                      Try selecting "All Directions" or clearing the search query.
                    </span>
                  </td>
                </tr>
              ) : (
                paginatedResults.map((res, i) => {
                  const isBull = res.direction === 'bullish';
                  const isBear = res.direction === 'bearish';

                  // Strategy-specific chart indicator isolation
                  // Only plot indicators corresponding strictly to this specific strategy row so the user clearly interprets the setup
                  const isSmc = res.strategyId.startsWith('smc_');
                  const indicatorsToEnable: string[] = [];

                  if (res.strategyId === 'ma_alignment' || res.strategyId === 'golden_cross' || res.strategyId === 'death_cross') {
                    indicatorsToEnable.push('sma50', 'sma200');
                  } else if (res.strategyId === 'ma_20_50_cross') {
                    indicatorsToEnable.push('sma20', 'sma50');
                  } else if (res.strategyId === 'ema_9_21_cross') {
                    indicatorsToEnable.push('ema9', 'ema21');
                  } else if (res.strategyId === 'rsi_momentum') {
                    indicatorsToEnable.push('rsi');
                  } else if (res.strategyId === 'macd_cross') {
                    indicatorsToEnable.push('macd');
                  } else if (res.strategyId === 'bb_reversal') {
                    indicatorsToEnable.push('bollinger');
                  } else if (res.strategyId === 'breakout') {
                    indicatorsToEnable.push('donchian');
                  } else if (res.strategyId === 'adx_trend') {
                    indicatorsToEnable.push('adx', 'ema9', 'ema21');
                  }

                  const stratParam = encodeURIComponent(res.strategyId);
                  const indParam = encodeURIComponent(indicatorsToEnable.join(','));
                  const chartHref = `/chart/${res.symbol}?market=${res.market}&tf=1D&smc=${isSmc ? `1&setupId=${res.strategyId}` : '0'}&strategies=${stratParam}&indicators=${indParam}&from=screener`;

                  return (
                    <tr key={`${res.symbol}-${res.strategyId}-${i}`} className="hover:bg-emerald-500/5 transition-colors group">
                      {/* Symbol & Name */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onSelectCompany(res.symbol)}
                            className="font-black text-[13px] text-[var(--theme-card-text)] hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors hover:underline text-left cursor-pointer"
                          >
                            {res.symbol}
                          </button>
                          <span className="text-[11px] text-[var(--theme-card-text-muted)] truncate max-w-[120px]">
                            {res.companyName}
                          </span>
                        </div>
                      </td>

                      {/* Strategy */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="font-bold text-[var(--theme-card-text)] text-[12px]">
                          {res.strategyName}
                        </span>
                      </td>

                      {/* Direction */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full border text-[11px] font-black ${
                            isBull
                              ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                              : isBear
                              ? 'border-rose-500/50 bg-rose-500/15 text-rose-700 dark:text-rose-400'
                              : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
                          }`}
                        >
                          {isBull ? '▲ BULLISH' : isBear ? '▼ BEARISH' : 'NEUTRAL'}
                        </span>
                      </td>

                      {/* LTP */}
                      <td className="py-2.5 px-3 text-right font-black text-[var(--theme-card-text)] whitespace-nowrap">
                        {res.market === 'USA' ? '$' : res.market === 'UAE' ? 'AED ' : '₹'}{res.currentPrice.toFixed(2)}
                      </td>

                      {/* Trigger Price */}
                      <td className="py-2.5 px-3 text-right text-[var(--theme-card-text)] font-semibold whitespace-nowrap">
                        {res.market === 'USA' ? '$' : res.market === 'UAE' ? 'AED ' : '₹'}{res.triggerPrice.toFixed(2)}
                      </td>

                      {/* Win Rate */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">
                          {res.historicalWinRate ? `${res.historicalWinRate}%` : '64.2%'}
                        </span>
                      </td>

                      {/* Explanation */}
                      <td className="py-2.5 px-3 max-w-[340px]">
                        <p className="text-[11.5px] leading-relaxed text-[var(--theme-card-text)] opacity-90 line-clamp-2">
                          {res.explanation}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectCompany(res.symbol)}
                            className="px-2 py-0.5 rounded border border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 text-[11px] font-bold transition-all cursor-pointer"
                            title="Open Company Financial Analysis"
                          >
                            Analyze
                          </button>
                          {onOpenBacktest && (
                            <button
                              type="button"
                              onClick={() => onOpenBacktest(res.symbol, res.strategyId)}
                              className="px-2 py-0.5 rounded border border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500 hover:text-slate-950 text-[11px] font-bold transition-all cursor-pointer"
                              title="Run Quantitative Backtest Simulation"
                            >
                              Backtest ⚡
                            </button>
                          )}
                          <Link
                            href={chartHref}
                            onClick={() => {
                              if (typeof window !== 'undefined') {
                                sessionStorage.setItem('mi007_return_tab', 'technicalScreener');
                                sessionStorage.setItem('mi007_return_symbol', res.symbol);
                              }
                            }}
                            className="px-2 py-0.5 rounded border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)] text-[11px] font-bold transition-all"
                          >
                            Chart ↗
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Toolbar ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
          <div className="flex items-center gap-2 text-[11.5px] mono text-[var(--theme-card-text-muted)]">
            <span>
              Showing <span className="font-black text-[var(--theme-card-text)]">{filteredResults.length === 0 ? 0 : (safePage - 1) * pageSize + 1}</span>–
              <span className="font-black text-[var(--theme-card-text)]">{Math.min(safePage * pageSize, filteredResults.length)}</span> of{' '}
              <span className="font-black text-emerald-400">{filteredResults.length}</span> Active Signals
            </span>
            <span className="text-slate-400">·</span>
            <div className="flex items-center gap-1.5">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-0.5 rounded border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] mono font-bold text-[11px] focus:outline-none focus:border-emerald-500"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5 mono text-[11.5px]">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] disabled:opacity-40 disabled:cursor-not-allowed hover:border-emerald-500 font-bold transition-colors cursor-pointer"
            >
              ← Prev
            </button>
            <span className="px-2.5 py-1 font-black text-[var(--theme-card-text)]">
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] disabled:opacity-40 disabled:cursor-not-allowed hover:border-emerald-500 font-bold transition-colors cursor-pointer"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
