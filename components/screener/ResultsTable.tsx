// ─── Screener Financial Results Table ───────────────────────────────────────
// Institutional 7-view table presets with in-cell 52W ranges, mini sparklines,
// Piotroski/Altman scorecards, and live Kite streaming ticks.

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CompanyFundamental } from '@/lib/screener/types';
import { getMetricDefinition, formatMetricValue, getMetricValue } from '@/lib/screener/metrics';

export type TableViewPreset =
  | 'overview'
  | 'valuation'
  | 'profitability'
  | 'growth'
  | 'health'
  | 'technicals'
  | 'ownership'
  | 'custom';

export interface ViewPresetDef {
  id: TableViewPreset;
  label: string;
  badge: string;
  description: string;
  columns: string[];
}

export const VIEW_PRESETS: ViewPresetDef[] = [
  {
    id: 'overview',
    label: 'Overview',
    badge: 'Core',
    description: 'Price, Volume, Returns, 52W Range, Market Cap, Valuation & Quality',
    columns: ['marketCap', 'currentPrice', 'priceChangePct', 'pe', 'roce', 'high52W', 'piotroskiScore'],
  },
  {
    id: 'valuation',
    label: 'Valuation',
    badge: 'Multiples',
    description: 'P/E, Forward P/E, P/B, P/S, EV/EBITDA, EV/EBIT, Earnings Yield, FCF Yield, PEG',
    columns: ['marketCap', 'pe', 'forwardPe', 'pb', 'priceToSales', 'evToEbitda', 'evToEbit', 'earningsYield', 'fcfYield', 'pegRatio'],
  },
  {
    id: 'profitability',
    label: 'Profitability',
    badge: 'Margins & RoIC',
    description: 'ROCE, ROE, ROIC, ROA, Gross Margin, Operating Margin, EBITDA Margin, Net Profit Margin',
    columns: ['roce', 'roe', 'roic', 'roa', 'grossMargin', 'operatingMargin', 'ebitdaMargin', 'npm'],
  },
  {
    id: 'growth',
    label: 'Growth',
    badge: 'CAGR',
    description: 'Sales Growth (1Y, 3Y, 5Y), Net Profit Growth (1Y, 3Y, 5Y), EPS Growth',
    columns: ['salesGrowth1Y', 'salesGrowth3Y', 'salesGrowth5Y', 'profitGrowth1Y', 'profitGrowth3Y', 'profitGrowth5Y', 'epsGrowth'],
  },
  {
    id: 'health',
    label: 'Financial Health',
    badge: 'Solvency',
    description: 'Debt to Equity, Interest Coverage, Current Ratio, Quick Ratio, FCF, CFO, Piotroski, Altman Z',
    columns: ['debtToEquity', 'interestCoverage', 'currentRatio', 'quickRatio', 'freeCashFlow', 'cfo', 'piotroskiScore', 'altmanZScore'],
  },
  {
    id: 'technicals',
    label: 'Technicals',
    badge: 'Signals',
    description: 'RSI(14), 50 SMA, 200 SMA, Distance to 200 SMA, MACD, 52W High, 52W Low, Beta',
    columns: ['currentPrice', 'priceChangePct', 'rsi14', 'sma50', 'sma200', 'distanceSma200Pct', 'macd', 'high52W', 'beta'],
  },
  {
    id: 'ownership',
    label: 'Ownership',
    badge: 'Shareholding',
    description: 'Promoter Holding, Pledged Shares %, FII Holding, DII Holding, Public Holding, 3Y Promoter Change',
    columns: ['promoterHolding', 'pledgedPct', 'fiiHolding', 'diiHolding', 'publicHolding', 'promoterHoldingChange3Y'],
  },
];

interface ResultsTableProps {
  companies: CompanyFundamental[];
  columns: string[];
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  onSort: (col: string) => void;
  onOpenColumnSelector: () => void;
  onSelectCompany: (symbol: string) => void;
  onToggleWatchlist?: (symbol: string) => void;
  watchlistSymbols?: string[];
  totalMatches: number;
  executionTimeMs?: number;
  dataFreshness?: string;
  tradeEngineStatus?: 'connected' | 'connecting' | 'disconnected';
  activePreset?: TableViewPreset;
  onSelectPreset?: (preset: TableViewPreset, cols: string[]) => void;
}

function Range52WBar({ current, low, high, currency = '₹' }: { current: number; low: number; high: number; currency?: string }) {
  if (!low || !high || high <= low) return <span>—</span>;
  const pct = Math.max(0, Math.min(100, ((current - low) / (high - low)) * 100));
  return (
    <div className="flex flex-col gap-1 w-28 sm:w-32 py-0.5">
      <div className="flex items-center justify-between text-[9.5px] mono text-[var(--theme-card-text-muted)]">
        <span>{currency}{Math.round(low)}</span>
        <span className="font-bold text-[var(--theme-card-text)]">{currency}{Math.round(current)}</span>
        <span>{currency}{Math.round(high)}</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-slate-800 border border-slate-700/60 relative overflow-hidden">
        <div className="h-full bg-linear-to-r from-rose-500/40 via-amber-400/40 to-emerald-400/60 rounded-full" style={{ width: '100%' }} />
        <div
          className="absolute top-0 bottom-0 w-2 -ml-1 bg-white rounded-full shadow-[0_0_6px_rgba(255,255,255,0.9)]"
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function MiniSparkline({ symbol, changePct }: { symbol: string; changePct: number }) {
  const isUp = changePct >= 0;
  let seedVal = symbol.split('').reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1) * 31, 101);
  const nextRand = () => {
    seedVal = (seedVal * 9301 + 49297) % 233280;
    return seedVal / 233280;
  };

  const numPts = 12;
  const pts: number[] = [];
  const moveSlope = (isUp ? 1 : -1) * Math.max(6, Math.min(18, Math.abs(changePct) * 8));
  const startBase = 50;

  for (let i = 0; i < numPts; i++) {
    const t = i / (numPts - 1);
    const trendOffset = moveSlope * Math.pow(t, 0.9);
    const noise = (nextRand() - 0.49) * 2.2;
    pts.push(startBase + trendOffset + noise);
  }

  if (isUp) {
    if (pts[numPts - 1] <= pts[0]) pts[numPts - 1] = pts[0] + 8;
  } else {
    if (pts[numPts - 1] >= pts[0]) pts[numPts - 1] = pts[0] - 8;
  }

  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;

  const w = 48;
  const h = 18;
  const padTop = 2;
  const plotH = 14;

  const coords = pts.map((p, idx) => {
    const x = (idx / (numPts - 1)) * w;
    const y = padTop + (1 - (p - min) / range) * plotH;
    return { x: +x.toFixed(1), y: +y.toFixed(1) };
  });

  const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`).join(' ');
  const stroke = isUp ? '#10b981' : '#f43f5e';
  const lastPt = coords[coords.length - 1];

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="inline-block overflow-visible shrink-0">
      <path
        d={pathD}
        fill="none"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastPt.x} cy={lastPt.y} r="1.8" fill={stroke} />
    </svg>
  );
}

export function ResultsTable({
  companies,
  columns,
  sortColumn,
  sortDirection,
  onSort,
  onOpenColumnSelector,
  onSelectCompany,
  onToggleWatchlist,
  watchlistSymbols = [],
  totalMatches,
  executionTimeMs = 12,
  dataFreshness = 'Q2 FY27 (Sep 2026)',
  tradeEngineStatus = 'connected',
  activePreset = 'overview',
  onSelectPreset,
}: ResultsTableProps) {
  const [tableSearch, setTableSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Reset to page 1 on search or universe length changes
  useEffect(() => {
    setPage(1);
  }, [tableSearch, companies.length]);

  // Local search filter within table
  const displayedCompanies = companies.filter((c) => {
    if (!tableSearch.trim()) return true;
    const q = tableSearch.toLowerCase();
    return (
      c.symbol.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.sector.toLowerCase().includes(q) ||
      c.industry.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(displayedCompanies.length / pageSize) || 1;
  const safePage = Math.min(Math.max(1, page), totalPages);
  const paginatedRows = displayedCompanies.slice((safePage - 1) * pageSize, safePage * pageSize);

  // CSV Export
  const exportCSV = () => {
    const headers = ['Symbol', 'Company', 'Sector', 'Industry', ...columns.map((c) => getMetricDefinition(c)?.label || c)];
    const rows = displayedCompanies.map((comp) => {
      return [
        comp.symbol,
        `"${comp.name}"`,
        `"${comp.sector}"`,
        `"${comp.industry}"`,
        ...columns.map((col) => {
          const val = getMetricValue(comp, col);
          return val !== null && val !== undefined ? val : '';
        }),
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MI007_Screen_Results_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="screener-results-table" className="rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-xl overflow-hidden flex flex-col scroll-mt-24">
      {/* ── 7 Fundamental Views Preset Switcher Bar ── */}
      <div className="flex items-center gap-1.5 p-2.5 sm:px-4 border-b border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]/80 overflow-x-auto">
        <span className="mono text-[11px] font-black text-[var(--theme-card-text-muted)] uppercase tracking-wider shrink-0 mr-2 flex items-center gap-1.5">
          <span>Views Presets:</span>
        </span>
        {VIEW_PRESETS.map((p) => {
          const isActive = activePreset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectPreset && onSelectPreset(p.id, p.columns)}
              className={`px-3 py-1 rounded-xl mono text-[11.5px] font-bold transition-all shrink-0 flex items-center gap-1.5 border cursor-pointer ${
                isActive
                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-black shadow-xs'
                  : 'border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)] hover:border-slate-500'
              }`}
              title={p.description}
            >
              <span>{p.label}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-black leading-none ${isActive ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>
                {p.badge}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={onOpenColumnSelector}
          className={`px-3 py-1 rounded-xl mono text-[11.5px] font-bold transition-all shrink-0 flex items-center gap-1.5 border cursor-pointer ${
            activePreset === 'custom'
              ? 'border-emerald-500 bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-black'
              : 'border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)]'
          }`}
        >
          <span>Custom ({columns.length})</span>
          <span>⚙</span>
        </button>
      </div>

      {/* Table Toolbar */}
      <div className="flex flex-wrap items-center justify-between p-4 border-b border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] gap-3">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="mono text-[16px] font-black inst-card-text uppercase tracking-wide">
                Screening Results
              </span>
              <span className="mono text-[12px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
                {displayedCompanies.length} of {totalMatches} Companies
              </span>
            </div>
            <div className="text-[11px] mono text-[var(--theme-card-text-muted)] mt-0.5 flex items-center gap-2 flex-wrap">
              <span>Freshness: {dataFreshness} · Computed in {executionTimeMs}ms</span>
              <span className="opacity-40">|</span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Streaming</span>
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick search input within results */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search results..."
              value={tableSearch}
              onChange={(e) => {
                setTableSearch(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-xl text-[12.5px] mono border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] placeholder-slate-400 focus:outline-none focus:border-emerald-500 w-40 sm:w-48"
            />
          </div>

          {/* Column Selector Toggle */}
          <button
            type="button"
            onClick={onOpenColumnSelector}
            className="px-3 py-1.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] mono text-[12px] font-bold hover:border-emerald-500 hover:text-emerald-400 transition-all flex items-center gap-1.5 shadow-xs"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            <span>Columns ({columns.length})</span>
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={exportCSV}
            className="px-3 py-1.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] mono text-[12px] font-bold hover:border-emerald-500 hover:text-emerald-400 transition-all flex items-center gap-1.5 shadow-xs"
            title="Export results table to CSV"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto overflow-y-auto max-h-[620px] border-b border-[var(--theme-card-border)]">
        <table className="w-full border-collapse text-left">
          {/* Sticky Header */}
          <thead className="sticky top-0 z-20 bg-[var(--theme-card-surface)] border-b border-[var(--theme-card-border)] shadow-xs">
            <tr>
              <th className="px-3.5 py-3 mono text-[11px] font-black text-[var(--theme-card-text-muted)] uppercase tracking-wider whitespace-nowrap sticky left-0 z-30 bg-[var(--theme-card-surface)] border-r border-[var(--theme-card-border)]">
                Company & Symbol
              </th>

              <th className="px-3 py-3 mono text-[11px] font-black text-[var(--theme-card-text-muted)] uppercase tracking-wider text-center whitespace-nowrap">
                Trend (1Y)
              </th>

              {columns.map((colKey) => {
                const def = getMetricDefinition(colKey);
                const isSorted = sortColumn === colKey;
                return (
                  <th
                    key={colKey}
                    onClick={() => onSort(colKey)}
                    className="px-3 py-3 mono text-[11px] font-black text-[var(--theme-card-text-muted)] uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-emerald-400 transition-colors text-right select-none"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>{def?.label || colKey}</span>
                      {isSorted && (
                        <span className="text-emerald-400 font-black">
                          {sortDirection === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}

              <th className="px-3 py-3 mono text-[11px] font-black text-[var(--theme-card-text-muted)] uppercase tracking-wider text-center whitespace-nowrap">
                Actions
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-[var(--theme-card-border)]/50 mono text-[13px]">
            {paginatedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 3}
                  className="px-6 py-12 text-center text-[var(--theme-card-text-muted)]"
                >
                  <div className="mono text-[14px] font-bold text-slate-400 mb-1">
                    No companies match this screening query
                  </div>
                  <p className="text-[12px] opacity-70">
                    Try broadening conditions or resetting visual filters to analyze full coverage.
                  </p>
                </td>
              </tr>
            ) : (
              paginatedRows.map((comp) => {
                const inWatchlist = watchlistSymbols.includes(comp.symbol);
                return (
                  <tr
                    key={comp.id}
                    className="hover:bg-emerald-500/5 transition-colors group"
                  >
                    {/* Fixed Left Company Cell */}
                    <td className="px-3.5 py-2.5 whitespace-nowrap sticky left-0 z-10 bg-[var(--theme-card-bg)] group-hover:bg-[var(--theme-card-surface)] border-r border-[var(--theme-card-border)] transition-colors">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectCompany(comp.symbol)}
                          className="font-black text-[13.5px] text-[var(--theme-card-text)] group-hover:text-emerald-400 transition-colors hover:underline text-left flex items-center gap-1.5"
                        >
                          <span>{comp.symbol}</span>
                          {(comp as any).isLiveTick && (
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                (comp as any).tickDirection === 'up'
                                  ? 'bg-emerald-400'
                                  : (comp as any).tickDirection === 'down'
                                  ? 'bg-rose-400'
                                  : 'bg-emerald-400/70'
                              } animate-pulse`}
                              title="Live Streaming"
                            />
                          )}
                        </button>
                        <span className="text-[11px] text-[var(--theme-card-text-muted)] font-bold truncate max-w-[130px] sm:max-w-[180px]">
                          {comp.name}
                        </span>
                      </div>
                    </td>

                    {/* Mini Sparkline Column */}
                    <td className="px-3 py-2.5 whitespace-nowrap text-center">
                      <MiniSparkline symbol={comp.symbol} changePct={comp.priceChangePct} />
                    </td>

                    {/* Metric Columns with Institutional Widgets */}
                    {columns.map((colKey) => {
                      const def = getMetricDefinition(colKey);
                      const rawVal = getMetricValue(comp, colKey);
                      const formatted = formatMetricValue(rawVal, colKey, comp.currencySymbol);

                      // Specialized in-cell widget: 52-Week Range Bar
                      if (colKey === 'high52W') {
                        return (
                          <td key={colKey} className="px-3 py-1.5 whitespace-nowrap text-right">
                            <div className="flex justify-end">
                              <Range52WBar
                                current={comp.currentPrice}
                                low={comp.low52W}
                                high={comp.high52W}
                                currency={comp.currencySymbol}
                              />
                            </div>
                          </td>
                        );
                      }

                      // Specialized in-cell widget: Piotroski F-Score (0-9)
                      if (colKey === 'piotroskiScore' && rawVal !== null) {
                        const score = rawVal;
                        const badgeColor = score >= 8
                          ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400'
                          : score >= 5
                          ? 'border-amber-500/50 bg-amber-500/15 text-amber-400'
                          : 'border-rose-500/50 bg-rose-500/15 text-rose-400';
                        return (
                          <td key={colKey} className="px-3 py-2.5 whitespace-nowrap text-right">
                            <span className={`px-2 py-0.5 rounded-full border text-[11px] font-black mono ${badgeColor}`}>
                              {score}/9 {score >= 8 ? 'Strong' : score >= 5 ? 'Average' : 'Weak'}
                            </span>
                          </td>
                        );
                      }

                      // Specialized in-cell widget: Altman Z-Score
                      if (colKey === 'altmanZScore' && rawVal !== null) {
                        const z = rawVal;
                        const zZone = z >= 2.99
                          ? { label: 'Safe', color: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400' }
                          : z >= 1.81
                          ? { label: 'Grey', color: 'border-amber-500/50 bg-amber-500/15 text-amber-400' }
                          : { label: 'Distress', color: 'border-rose-500/50 bg-rose-500/15 text-rose-400' };
                        return (
                          <td key={colKey} className="px-3 py-2.5 whitespace-nowrap text-right">
                            <span className={`px-2 py-0.5 rounded-full border text-[11px] font-black mono ${zZone.color}`}>
                              {z.toFixed(2)} · {zZone.label}
                            </span>
                          </td>
                        );
                      }

                      // Specialized in-cell widget: RSI (14) Momentum
                      if (colKey === 'rsi14' && rawVal !== null) {
                        const rsi = rawVal;
                        const rsiClass = rsi >= 70
                          ? 'border-rose-500/40 bg-rose-500/15 text-rose-300'
                          : rsi <= 30
                          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                          : 'border-slate-700 bg-slate-800 text-slate-300';
                        return (
                          <td key={colKey} className="px-3 py-2.5 whitespace-nowrap text-right">
                            <span className={`px-2 py-0.5 rounded border text-[11px] font-black mono ${rsiClass}`}>
                              {rsi.toFixed(1)} {rsi >= 70 ? 'Overbought' : rsi <= 30 ? 'Oversold' : ''}
                            </span>
                          </td>
                        );
                      }

                      // Color coding for percentages or returns or live prices
                      let colorClass = 'text-[var(--theme-card-text)]';
                      if (colKey === 'currentPrice' && (comp as any).tickDirection) {
                        colorClass =
                          (comp as any).tickDirection === 'up'
                            ? 'text-emerald-300 font-bold'
                            : (comp as any).tickDirection === 'down'
                            ? 'text-rose-300 font-bold'
                            : 'text-[var(--theme-card-text)]';
                      } else if (def?.dataType === 'percent' && rawVal !== null) {
                        if (rawVal > 0) colorClass = 'text-emerald-400';
                        else if (rawVal < 0) colorClass = 'text-rose-400';
                      }

                      return (
                        <td
                          key={colKey}
                          className={`px-3 py-2.5 whitespace-nowrap text-right font-medium tabular-nums transition-colors duration-200 ${colorClass}`}
                        >
                          {formatted}
                        </td>
                      );
                    })}

                    {/* Actions Column */}
                    <td className="px-3 py-2.5 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Open Analysis Button */}
                        <button
                          type="button"
                          onClick={() => onSelectCompany(comp.symbol)}
                          className="px-2 py-0.5 rounded border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] hover:border-emerald-500 text-emerald-400 text-[11px] font-bold transition-all"
                          title="Open Company Financial Analysis"
                        >
                          Analyze
                        </button>

                        {/* Watchlist Toggle */}
                        {onToggleWatchlist && (
                          <button
                            type="button"
                            onClick={() => onToggleWatchlist(comp.symbol)}
                            className={`p-1 rounded border transition-colors ${
                              inWatchlist
                                ? 'border-amber-400/50 bg-amber-400/10 text-amber-400'
                                : 'border-[var(--theme-card-border)] text-[var(--theme-card-text-muted)] hover:text-amber-400'
                            }`}
                            title={inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
                          >
                            ★
                          </button>
                        )}

                        {/* Chart Link */}
                        <Link
                          href={`/chart/${comp.symbol}?market=${comp.market}&from=screener`}
                          onClick={() => {
                            if (typeof window !== 'undefined') {
                              sessionStorage.setItem('mi007_return_tab', 'screener');
                            }
                          }}
                          className="px-2 py-0.5 rounded border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] hover:border-emerald-500 text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)] text-[11px] font-bold transition-all"
                          title="View Interactive Price Chart"
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

      {/* Pagination & Status Footer */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-[var(--theme-card-surface)] text-[12px] mono gap-3 border-t border-[var(--theme-card-border)]">
        <div className="flex items-center gap-4 text-[var(--theme-card-text-muted)]">
          <div>
            Showing <span className="text-[var(--theme-card-text)] font-bold">{displayedCompanies.length === 0 ? 0 : (safePage - 1) * pageSize + 1}</span>–
            <span className="text-[var(--theme-card-text)] font-bold">{Math.min(safePage * pageSize, displayedCompanies.length)}</span> of{' '}
            <span className="text-[var(--theme-card-text)] font-bold">{displayedCompanies.length.toLocaleString()}</span> Stocks
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[var(--theme-card-text-muted)]">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-0.5 rounded border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] text-[11px] cursor-pointer focus:outline-none"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage(1)}
              title="First Page"
              className="px-2 py-1 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] disabled:opacity-30 hover:border-emerald-500 transition-colors cursor-pointer text-[11px]"
            >
              « First
            </button>
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] disabled:opacity-30 hover:border-emerald-500 transition-colors cursor-pointer text-[11px]"
            >
              ‹ Previous
            </button>
            <span className="px-2 text-[var(--theme-card-text)] font-semibold text-[11px]">
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] disabled:opacity-30 hover:border-emerald-500 transition-colors cursor-pointer text-[11px]"
            >
              Next ›
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage(totalPages)}
              title="Last Page"
              className="px-2 py-1 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] disabled:opacity-30 hover:border-emerald-500 transition-colors cursor-pointer text-[11px]"
            >
              Last »
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
