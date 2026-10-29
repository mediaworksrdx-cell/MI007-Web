// ─── MI007 Trading Strategies Cockpit (34 Trading & Chart Strategies) ─────────
// Unified cockpit for Flagship Quantum AI, 10 Classic Technical, 16 SMC, and 7 Order Flow models.
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { CompanyFundamental, MarketRegion } from '@/lib/screener/types';
import {
  TRADING_STRATEGIES,
  StrategyItem,
  TradingStrategyCategory,
} from '@/lib/screener/strategiesCatalog';
import {
  StrategyId as LegacyStrategyId,
  evaluateCombinedStrategiesForStock,
  StrategySignalResult,
} from '@/lib/screener/technicalStrategies';
import { useTradeEngine } from '@/lib/tradeEngineContext';

interface TradingStrategiesViewProps {
  companies: CompanyFundamental[];
  market: MarketRegion;
  onSelectCompany: (symbol: string) => void;
  onOpenBacktest?: (symbol: string, strategyId: LegacyStrategyId) => void;
  onBackToScreener: () => void;
}

const TRADING_EVAL_CACHE = new Map<string, StrategySignalResult[]>();

export function TradingStrategiesView({
  companies,
  market,
  onSelectCompany,
  onOpenBacktest,
  onBackToScreener,
}: TradingStrategiesViewProps) {
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'bullish' | 'bearish'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { getSymbolPrice } = useTradeEngine();

  // Reset pagination on filter change
  useEffect(() => {
    setPage(1);
  }, [selectedStrategyId, categoryFilter, directionFilter, searchQuery]);

  // Universe for scanning
  const targetUniverse = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let baseList = companies;
    if (companies.length > 80) {
      const sortedByCap = [...companies].sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
      baseList = sortedByCap.slice(0, 80);
    }
    if (!q) return baseList;
    const matching = companies
      .filter((c) => c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
      .slice(0, 30);
    const map = new Map<string, CompanyFundamental>();
    baseList.forEach((c) => map.set(c.symbol.toUpperCase(), c));
    matching.forEach((c) => map.set(c.symbol.toUpperCase(), c));
    return Array.from(map.values());
  }, [companies, searchQuery]);

  // Scan execution
  const scanResults = useMemo(() => {
    const list: StrategySignalResult[] = [];
    const cache = TRADING_EVAL_CACHE;
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

  // Categories list
  const categories: string[] = useMemo(() => {
    return Array.from(new Set(TRADING_STRATEGIES.map((s) => s.category)));
  }, []);

  // Filtered Strategy Definitions
  const visibleStrategies = useMemo(() => {
    return TRADING_STRATEGIES.filter((s) => {
      if (categoryFilter !== 'ALL' && s.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [categoryFilter, searchQuery]);

  const activeStrategy = useMemo(() => {
    return TRADING_STRATEGIES.find((s) => s.id === selectedStrategyId) || null;
  }, [selectedStrategyId]);

  // Filtered Scan Results
  const filteredResults = useMemo(() => {
    return scanResults.filter((res) => {
      if (selectedStrategyId !== 'ALL' && res.strategyId !== selectedStrategyId) {
        return false;
      }
      if (directionFilter !== 'ALL' && res.direction !== directionFilter) {
        return false;
      }
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
  }, [scanResults, selectedStrategyId, directionFilter, searchQuery]);

  const totalPages = Math.ceil(filteredResults.length / pageSize) || 1;
  const safePage = Math.min(page, totalPages);
  const paginatedResults = useMemo(() => {
    return filteredResults.slice((safePage - 1) * pageSize, safePage * pageSize);
  }, [filteredResults, safePage, pageSize]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToScreener}
            className="px-3.5 py-1.5 rounded-xl border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 transition-colors flex items-center gap-1.5 mono text-[12px] font-black shadow-xs cursor-pointer group"
          >
            <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
            <span>BACK TO SCREENER</span>
          </button>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="mono text-[18px] sm:text-[22px] font-black inst-card-text uppercase tracking-wide">
                Trading Strategies Intelligence Cockpit
              </h1>
              <span className="mono text-[11px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
                34 Trading & Chart Models
              </span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 mono text-[10.5px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>LIVE FEED</span>
              </div>
            </div>
            <p className="text-[12.5px] text-[var(--theme-card-text-muted)] font-medium mt-0.5">
              Flagship Quantum AI SMC & Resonance, 10 Classic Technical, 16 Institutional SMC, and 7 Order Flow Footprint strategies.
            </p>
          </div>
        </div>

        {/* Global Search and Reset */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search strategies or symbols..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 px-3 rounded-xl mono text-[12px] font-bold border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] focus:border-emerald-500 outline-none w-52 sm:w-64"
          />
        </div>
      </div>

      {/* ── Category Filter Bar ── */}
      <div className="flex flex-wrap items-center gap-2 pb-1">
        <button
          type="button"
          onClick={() => {
            setCategoryFilter('ALL');
            setSelectedStrategyId('ALL');
          }}
          className={`px-3 py-1.5 rounded-xl mono text-[11.5px] font-bold transition-all ${
            categoryFilter === 'ALL'
              ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
              : 'border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)]'
          }`}
        >
          All Categories (34)
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => {
              setCategoryFilter(cat);
              setSelectedStrategyId('ALL');
            }}
            className={`px-3 py-1.5 rounded-xl mono text-[11.5px] font-bold transition-all ${
              categoryFilter === cat
                ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                : 'border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── Active Strategy Hero Card (when one is specifically selected) ── */}
      {activeStrategy && (
        <div className="p-5 rounded-2xl border-2 border-emerald-500/50 bg-gradient-to-r from-emerald-950/20 via-[var(--theme-card-bg)] to-cyan-950/20 shadow-lg">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="mono text-[18px] font-black text-emerald-400">
                  {activeStrategy.name}
                </span>
                <span className="px-2 py-0.5 rounded-md mono text-[10.5px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {activeStrategy.category}
                </span>
                <span className="px-2 py-0.5 rounded-md mono text-[10.5px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  {activeStrategy.horizon} Horizon
                </span>
                <span className="px-2 py-0.5 rounded-md mono text-[10.5px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  {activeStrategy.riskProfile} Risk
                </span>
              </div>
              <p className="text-[13px] text-[var(--theme-card-text)] font-medium mt-1.5 max-w-3xl">
                {activeStrategy.description}
              </p>
              <div className="mt-3 flex flex-col gap-1">
                <span className="mono text-[10.5px] font-bold uppercase text-[var(--theme-card-text-muted)]">
                  Execution Rules:
                </span>
                <ul className="list-disc list-inside text-[12px] text-[var(--theme-card-text-muted)] space-y-0.5">
                  {activeStrategy.rules.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedStrategyId('ALL')}
                className="px-3 py-1.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)] mono text-[11px] font-bold"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Strategy Selection Grid (Compact) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {visibleStrategies.map((strat) => {
          const isSelected = selectedStrategyId === strat.id;
          return (
            <div
              key={strat.id}
              onClick={() => setSelectedStrategyId(isSelected ? 'ALL' : strat.id)}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-500/10 shadow-md ring-1 ring-emerald-500'
                  : 'border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] hover:border-emerald-500/50 hover:bg-[var(--theme-card-surface)]/60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="mono text-[10px] font-bold uppercase text-[var(--theme-card-text-muted)] truncate">
                    {strat.category}
                  </span>
                  {strat.isFlagship && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-cyan-500 text-slate-950 uppercase">
                      FLAGSHIP
                    </span>
                  )}
                </div>
                <div className="mono text-[13px] font-bold text-[var(--theme-card-text)] line-clamp-1">
                  {strat.name}
                </div>
                <p className="text-[11px] text-[var(--theme-card-text-muted)] mt-1 line-clamp-2">
                  {strat.description}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-[var(--theme-card-border)]/50 flex items-center justify-between text-[10.5px] mono">
                <span className="text-emerald-400 font-bold">{strat.horizon}</span>
                <span className="text-[var(--theme-card-text-muted)]">{strat.riskProfile}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Live Scanner Signals Table ── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] p-5 shadow-md mt-2">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--theme-card-border)]">
          <div>
            <h2 className="mono text-[16px] font-black inst-card-text uppercase">
              Live Strategy Signals Universe ({filteredResults.length} Signals)
            </h2>
            <p className="text-[12px] text-[var(--theme-card-text-muted)]">
              Real-time pattern detections and completed candle mathematical triggers.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value as any)}
              className="h-8 px-2.5 rounded-lg mono text-[11.5px] font-bold border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)]"
            >
              <option value="ALL">All Directions</option>
              <option value="bullish">Bullish Only</option>
              <option value="bearish">Bearish Only</option>
            </select>
          </div>
        </div>

        {/* Signals Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12.5px] mono">
            <thead>
              <tr className="border-b border-[var(--theme-card-border)] text-[var(--theme-card-text-muted)] text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3">Symbol</th>
                <th className="py-2.5 px-3">Strategy</th>
                <th className="py-2.5 px-3">Direction</th>
                <th className="py-2.5 px-3">Trigger Price</th>
                <th className="py-2.5 px-3">Setup Details</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--theme-card-border)]/50">
              {paginatedResults.map((r, i) => (
                <tr key={`${r.symbol}-${r.strategyId}-${i}`} className="hover:bg-[var(--theme-card-surface)]/50 transition-colors">
                  <td className="py-2.5 px-3">
                    <button
                      type="button"
                      onClick={() => onSelectCompany(r.symbol)}
                      className="font-bold text-emerald-400 hover:underline cursor-pointer"
                    >
                      {r.symbol}
                    </button>
                    <div className="text-[10px] text-[var(--theme-card-text-muted)]">{r.companyName}</div>
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-[var(--theme-card-text)]">
                    {r.strategyName}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
                        r.direction === 'bullish'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {r.direction === 'bullish' ? '▲ BULLISH' : '▼ BEARISH'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-bold text-emerald-300">
                    ₹{r.triggerPrice ? r.triggerPrice.toFixed(2) : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-[11.5px] text-[var(--theme-card-text-muted)] max-w-md truncate">
                    {r.explanation || 'Condition confirmed'}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {onOpenBacktest && (
                        <button
                          type="button"
                          onClick={() => onOpenBacktest(r.symbol, r.strategyId as any)}
                          className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-slate-950 font-bold transition-colors text-[10.5px] cursor-pointer"
                        >
                          Backtest
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onSelectCompany(r.symbol)}
                        className="px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500 hover:text-slate-950 font-bold transition-colors text-[10.5px] cursor-pointer"
                      >
                        Chart →
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 border-t border-[var(--theme-card-border)] text-[12px] mono">
            <span className="text-[var(--theme-card-text-muted)]">
              Page {safePage} of {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded border border-[var(--theme-card-border)] disabled:opacity-40"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded border border-[var(--theme-card-border)] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
