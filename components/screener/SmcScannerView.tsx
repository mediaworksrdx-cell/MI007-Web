// ─── MI007 Smart Money Concepts (SMC) Institutional Scanner Cockpit ──────────
// Shared quantitative SMC detection scanning across market instruments.
// Finds high-probability Order Block retests, Fair Value Gap taps,
// BOS continuations, CHoCH reversals, and Liquidity Sweeps.

'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { CompanyFundamental, MarketRegion } from '@/lib/screener/types';
import { useTradeEngine } from '@/lib/tradeEngineContext';
import { getVerifiedHistoricalCandles } from '@/lib/screener/verifiedHistoricalCandles';
import {
  calculateSMC,
  SmcConfirmedSetup,
  SmcSetupType,
  SmcAnalysis,
} from '@/lib/smcEngine';
import { Candle } from '@/lib/types';

interface SmcScannerViewProps {
  companies: CompanyFundamental[];
  market: MarketRegion;
  onSelectCompany: (symbol: string) => void;
  onBackToScreener: () => void;
}

interface ScannedSmcItem {
  symbol: string;
  name: string;
  market: MarketRegion;
  currentPrice: number;
  changePct: number;
  setup: SmcConfirmedSetup;
  timeframe: string;
  equilibrium: number;
  dealingRangeHigh: number;
  dealingRangeLow: number;
}

const SETUP_TYPE_LABELS: Record<SmcSetupType, { label: string; badgeClass: string }> = {
  CHOCH_REVERSAL: {
    label: 'CHoCH Reversal',
    badgeClass: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-500/40',
  },
  BOS_CONTINUATION: {
    label: 'BOS Continuation',
    badgeClass: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-500/40',
  },
  OB_RETEST: {
    label: 'Order Block Retest',
    badgeClass: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/40',
  },
  FVG_TAP: {
    label: 'FVG 50% CE Retrace',
    badgeClass: 'bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-500/40',
  },
  LIQUIDITY_SWEEP: {
    label: 'Liquidity Sweep',
    badgeClass: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-500/40',
  },
  BREAKER_RETEST: {
    label: 'Breaker Retest',
    badgeClass: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-500/40',
  },
  EQH_EQL_SWEEP: {
    label: 'Equal High/Low Sweep',
    badgeClass: 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-500/40',
  },
  PREMIUM_DISCOUNT_OTE: {
    label: 'Dealing Range OTE',
    badgeClass: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40',
  },
  MTF_CONFLUENCE: {
    label: 'Multi-Timeframe SMC',
    badgeClass: 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-500/40',
  },
  SESSION_LIQUIDITY: {
    label: 'Session Sweep (PDH/PDL)',
    badgeClass: 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-500/40',
  },
  THREE_STAGE_REVERSAL: {
    label: '3-Stage Confluence',
    badgeClass: 'bg-fuchsia-100 dark:bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-300 dark:border-fuchsia-500/40',
  },
  BOS_FVG_RETEST: {
    label: 'BOS + FVG Retest',
    badgeClass: 'bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-500/40',
  },
  OB_FVG_CONFLUENCE: {
    label: 'OB + FVG Confluence',
    badgeClass: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-500/40',
  },
  INDUCEMENT_SWEEP: {
    label: 'Inducement Sweep',
    badgeClass: 'bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-300 dark:border-pink-500/40',
  },
  POWER_OF_THREE_AMD: {
    label: 'Power of Three (AMD)',
    badgeClass: 'bg-lime-100 dark:bg-lime-500/20 text-lime-700 dark:text-lime-300 border-lime-300 dark:border-lime-500/40',
  },
  INVERSE_FVG: {
    label: 'Inverse FVG (IFVG)',
    badgeClass: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/40',
  },
};

// SMC scan cache (module-scoped: results are a pure function of the cache key)
const SMC_SCAN_CACHE = new Map<string, ScannedSmcItem[]>();

export function SmcScannerView({
  companies,
  market,
  onSelectCompany: _onSelectCompany,
  onBackToScreener,
}: SmcScannerViewProps) {
  const [selectedSetupType, setSelectedSetupType] = useState<SmcSetupType | 'ALL'>('ALL');
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'BULLISH' | 'BEARISH'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CONFIRMED' | 'RETESTING'>('ALL');
  const [timeframe, setTimeframe] = useState<'15m' | '1H' | '4H' | '1D'>('1H');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { getSymbolPrice } = useTradeEngine();

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedSetupType, directionFilter, statusFilter, timeframe, searchQuery]);

  // Universe selection: top 75 market cap stocks plus query matches
  const targetUniverse = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let baseList = companies;
    if (companies.length > 75) {
      const sorted = [...companies].sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
      baseList = sorted.slice(0, 75);
    }
    if (!q) return baseList;

    const matched = companies.filter(
      (c) => c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    ).slice(0, 30);

    const map = new Map<string, CompanyFundamental>();
    baseList.forEach((c) => map.set(c.symbol.toUpperCase(), c));
    matched.forEach((c) => map.set(c.symbol.toUpperCase(), c));
    return Array.from(map.values());
  }, [companies, searchQuery]);

  // SMC Scan Cache

  // Execute quantitative SMC scanning across universe
  const scanResults = useMemo(() => {
    const list: ScannedSmcItem[] = [];
    const cache = SMC_SCAN_CACHE;
    if (cache.size > 5000) cache.clear();

    targetUniverse.forEach((comp) => {
      const live = getSymbolPrice(comp.symbol);
      const price = live?.price ?? comp.currentPrice;
      const cacheKey = `${market}:${comp.symbol}:${timeframe}:${price}`;

      let items = cache.get(cacheKey);
      if (!items) {
        items = [];
        const candles: Candle[] = getVerifiedHistoricalCandles(
          comp.symbol,
          price,
          comp.high52W || price * 1.25,
          comp.low52W || price * 0.75,
          comp.volume || 2000000,
          market,
          180
        );

        if (candles && candles.length >= 20) {
          const analysis: SmcAnalysis = calculateSMC(candles, undefined, comp.symbol, timeframe);
          const setupsList = analysis.allSetups && analysis.allSetups.length > 0
            ? analysis.allSetups
            : analysis.confirmedSetups;

          for (const setup of setupsList) {
            items.push({
              symbol: comp.symbol,
              name: comp.name,
              market,
              currentPrice: price,
              changePct: comp.priceChangePct ?? 0,
              setup,
              timeframe,
              equilibrium: analysis.equilibriumPrice,
              dealingRangeHigh: analysis.dealingRange.highPrice,
              dealingRangeLow: analysis.dealingRange.lowPrice,
            });
          }
        }
        cache.set(cacheKey, items);
      }

      list.push(...items);
    });

    return list;
  }, [targetUniverse, timeframe, market, getSymbolPrice]);

  // Filtered setups
  const filteredResults = useMemo(() => {
    return scanResults.filter((item) => {
      if (selectedSetupType !== 'ALL' && item.setup.setupType !== selectedSetupType) {
        return false;
      }
      if (directionFilter !== 'ALL' && item.setup.direction !== directionFilter) {
        return false;
      }
      if (statusFilter !== 'ALL' && item.setup.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return item.symbol.toLowerCase().includes(q) || item.name.toLowerCase().includes(q);
      }
      return true;
    });
  }, [scanResults, selectedSetupType, directionFilter, statusFilter, searchQuery]);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = filteredResults.length;
    const bullish = filteredResults.filter((r) => r.setup.direction === 'BULLISH').length;
    const bearish = filteredResults.filter((r) => r.setup.direction === 'BEARISH').length;
    const retests = filteredResults.filter((r) => r.setup.status === 'RETESTING').length;
    const highRr = filteredResults.filter((r) => r.setup.riskReward >= 2.5).length;
    return { total, bullish, bearish, retests, highRr };
  }, [filteredResults]);

  // Pagination
  const totalPages = Math.ceil(filteredResults.length / pageSize) || 1;
  const paginatedResults = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredResults.slice(start, start + pageSize);
  }, [filteredResults, page, pageSize]);

  return (
    <div className="flex flex-col gap-4">
      {/* ── Top Header & Stats Strip ── */}
      <div className="flex flex-col gap-3 rounded-2xl border-2 terminal-page-panel p-4 sm:p-5 bg-[var(--theme-card-bg)] shadow-xl relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--theme-card-border)]">
          <div className="flex items-center gap-3">
            <span className="font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              SMC PRO
            </span>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-[var(--theme-card-text)]">
                Smart Money Concepts Scanner
              </h1>
              <p className="text-xs text-[var(--theme-card-text-muted)] font-mono">
                Institutional Order Flow • Liquidity Sweeps • OB Retests • BOS / CHoCH
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBackToScreener}
              className="px-3 py-1.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] hover:border-emerald-500 text-xs font-bold transition-colors cursor-pointer"
            >
              ← Back to Main Screener
            </button>
          </div>
        </div>

        {/* 4 Stat KPI Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
          <div className="p-2.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
            <div className="text-[10px] font-bold text-[var(--theme-card-text-muted)] uppercase tracking-wider">
              Setups Found
            </div>
            <div className="text-lg font-black font-mono text-[var(--theme-card-text)]">
              {stats.total}
            </div>
          </div>
          <div className="p-2.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
            <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
              Bullish (Longs)
            </div>
            <div className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
              {stats.bullish}
            </div>
          </div>
          <div className="p-2.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
            <div className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">
              Bearish (Shorts)
            </div>
            <div className="text-lg font-black font-mono text-rose-600 dark:text-rose-400">
              {stats.bearish}
            </div>
          </div>
          <div className="p-2.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
            <div className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">
              Zone Retesting
            </div>
            <div className="text-lg font-black font-mono text-amber-600 dark:text-amber-400">
              {stats.retests}
            </div>
          </div>
          <div className="p-2.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
            <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
              High R:R (≥ 2.5)
            </div>
            <div className="text-lg font-black font-mono text-indigo-600 dark:text-indigo-400">
              {stats.highRr}
            </div>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--theme-card-border)] text-xs">
          {/* Timeframe Selector */}
          <div className="flex items-center gap-1 bg-[var(--theme-card-surface)] p-1 rounded-xl border border-[var(--theme-card-border)]">
            {(['15m', '1H', '4H', '1D'] as const).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs transition-all cursor-pointer ${
                  timeframe === tf
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)]'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Setup Type Filter */}
          <select
            value={selectedSetupType}
            onChange={(e) => setSelectedSetupType(e.target.value as any)}
            className="h-8 px-2.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] font-semibold focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All SMC Setups</option>
            <option value="CHOCH_REVERSAL">CHoCH Reversal</option>
            <option value="BOS_CONTINUATION">BOS Continuation</option>
            <option value="OB_RETEST">Order Block Retest</option>
            <option value="FVG_TAP">FVG Imbalance Tap</option>
            <option value="LIQUIDITY_SWEEP">Liquidity Sweep</option>
            <option value="BREAKER_RETEST">Breaker Block Retest</option>
          </select>

          {/* Direction Filter */}
          <select
            value={directionFilter}
            onChange={(e) => setDirectionFilter(e.target.value as any)}
            className="h-8 px-2.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] font-semibold focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Directions</option>
            <option value="BULLISH">▲ Bullish (Long)</option>
            <option value="BEARISH">▼ Bearish (Short)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-8 px-2.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] font-semibold focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="CONFIRMED">Confirmed Break</option>
            <option value="RETESTING">Active Retest</option>
          </select>

          {/* Search box */}
          <div className="flex-1 min-w-[180px] max-w-xs relative">
            <input
              type="text"
              placeholder="Search symbol or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-7 pr-3 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] placeholder-[var(--theme-card-text-muted)] focus:outline-none focus:border-amber-500 text-xs"
            />
            <span className="absolute left-2.5 top-2 text-[var(--theme-card-text-muted)]">🔍</span>
          </div>
        </div>
      </div>

      {/* ── Results Table ── */}
      <div className="rounded-2xl border-2 terminal-page-panel bg-[var(--theme-card-bg)] shadow-xl overflow-hidden relative z-10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]/80 text-[var(--theme-card-text-muted)] font-mono text-[10.5px] uppercase tracking-wider">
                <th className="py-3 px-4">Instrument</th>
                <th className="py-3 px-3 text-right">LTP</th>
                <th className="py-3 px-3">Setup Pattern</th>
                <th className="py-3 px-3 text-center">Direction</th>
                <th className="py-3 px-3 text-right">Entry Zone</th>
                <th className="py-3 px-3 text-right">Invalidation (SL)</th>
                <th className="py-3 px-3 text-right">Target (TP)</th>
                <th className="py-3 px-3 text-center">R:R</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--theme-card-border)]/50">
              {paginatedResults.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[var(--theme-card-text-muted)]">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-2xl">⚡</span>
                      <span className="font-bold text-sm">No SMC setups matched current criteria</span>
                      <span className="text-xs">Try selecting a different timeframe or broadening filters</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedResults.map((item, idx) => {
                  const isBull = item.setup.direction === 'BULLISH';
                  const badgeInfo =
                    SETUP_TYPE_LABELS[item.setup.setupType] || SETUP_TYPE_LABELS.CHOCH_REVERSAL;

                  return (
                    <tr
                      key={`${item.symbol}-${item.setup.id}-${idx}`}
                      className="hover:bg-[var(--theme-card-surface)]/60 transition-colors"
                    >
                      {/* Instrument */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-black font-mono text-[13px] text-[var(--theme-card-text)] flex items-center gap-1.5">
                            {item.symbol}
                            <span className="text-[10px] px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-normal">
                              {timeframe}
                            </span>
                          </span>
                          <span className="text-[10.5px] text-[var(--theme-card-text-muted)] truncate max-w-[140px]">
                            {item.name}
                          </span>
                        </div>
                      </td>

                      {/* LTP */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-[var(--theme-card-text)]">
                        <div>₹{item.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <div
                          className={`text-[10px] font-semibold ${
                            item.changePct >= 0 ? 'text-emerald-500' : 'text-rose-500'
                          }`}
                        >
                          {item.changePct >= 0 ? '+' : ''}
                          {item.changePct.toFixed(2)}%
                        </div>
                      </td>

                      {/* Setup Pattern */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-0.5">
                          <span
                            className={`inline-block w-fit px-2 py-0.5 rounded-md font-mono font-bold text-[10.5px] border ${badgeInfo.badgeClass}`}
                          >
                            {badgeInfo.label}
                          </span>
                          <span className="text-[10px] text-[var(--theme-card-text-muted)] truncate max-w-[200px]" title={item.setup.description}>
                            {item.setup.description}
                          </span>
                        </div>
                      </td>

                      {/* Direction */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`font-mono font-black text-xs px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${
                            isBull
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          <span>{isBull ? '▲' : '▼'}</span>
                          <span>{isBull ? 'LONG' : 'SHORT'}</span>
                        </span>
                      </td>

                      {/* Entry Zone */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-[var(--theme-card-text)]">
                        ₹{item.setup.entryPrice.toFixed(2)}
                      </td>

                      {/* Invalidation (SL) */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                        ₹{item.setup.stopLoss.toFixed(2)}
                      </td>

                      {/* Target (TP) */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{item.setup.targetPrice.toFixed(2)}
                      </td>

                      {/* R:R */}
                      <td className="py-3 px-3 text-center font-mono font-black text-amber-600 dark:text-amber-400 text-xs">
                        1:{item.setup.riskReward.toFixed(1)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            item.setup.status === 'RETESTING'
                              ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 animate-pulse'
                              : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {item.setup.status}
                        </span>
                      </td>

                      {/* Action Button -> Direct Chart Launch with SMC Auto-enabled */}
                      <td className="py-3 px-4 text-center">
                        <Link
                          href={`/chart/${item.symbol}?market=${item.market}&tf=${timeframe}&smc=1&setupId=${item.setup.id}&time=${item.setup.time}&from=screener`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-xs cursor-pointer active:scale-95"
                          title={`Open ${item.symbol} Candlestick Chart with SMC Overlays Enabled`}
                        >
                          <span>Chart</span>
                          <span className="font-sans">↗</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]/50 text-xs">
            <span className="text-[var(--theme-card-text-muted)] font-mono">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredResults.length)} of {filteredResults.length} setups
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] disabled:opacity-30 disabled:pointer-events-none hover:border-amber-500 cursor-pointer"
              >
                Previous
              </button>
              <span className="font-mono font-bold text-[var(--theme-card-text)] px-2">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] disabled:opacity-30 disabled:pointer-events-none hover:border-amber-500 cursor-pointer"
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
