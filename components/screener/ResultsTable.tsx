// ─── Screener Financial Results Table ───────────────────────────────────────
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CompanyFundamental } from '@/lib/screener/types';
import { getMetricDefinition, formatMetricValue, getMetricValue } from '@/lib/screener/metrics';

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
  dataFreshness = 'Q3 FY25 (Dec 2024)',
  tradeEngineStatus = 'connected',
}: ResultsTableProps) {
  const [tableSearch, setTableSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

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
  const paginatedRows = displayedCompanies.slice((page - 1) * pageSize, page * pageSize);

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
    <div className="rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-xl overflow-hidden flex flex-col">
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
                <span>Kite Engine Streaming</span>
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
      <div className="overflow-x-auto overflow-y-auto max-h-[600px] border-b border-[var(--theme-card-border)]">
        <table className="w-full border-collapse text-left">
          {/* Sticky Header */}
          <thead className="sticky top-0 z-20 bg-[var(--theme-card-surface)] border-b border-[var(--theme-card-border)] shadow-xs">
            <tr>
              <th className="px-3.5 py-3 mono text-[11px] font-black text-[var(--theme-card-text-muted)] uppercase tracking-wider whitespace-nowrap sticky left-0 z-30 bg-[var(--theme-card-surface)] border-r border-[var(--theme-card-border)]">
                Company & Symbol
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
                  colSpan={columns.length + 2}
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
                              title="Kite Live Streaming"
                            />
                          )}
                        </button>
                        <span className="text-[11px] text-[var(--theme-card-text-muted)] font-bold truncate max-w-[130px] sm:max-w-[180px]">
                          {comp.name}
                        </span>
                      </div>
                    </td>

                    {/* Metric Columns */}
                    {columns.map((colKey) => {
                      const def = getMetricDefinition(colKey);
                      const rawVal = getMetricValue(comp, colKey);
                      const formatted = formatMetricValue(rawVal, colKey, comp.currencySymbol);

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
                          href={`/chart/${comp.symbol}?market=${comp.market}`}
                          className="px-2 py-0.5 rounded border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] hover:border-emerald-500 text-[var(--theme-card-text-muted)] hover:text-white text-[11px] font-bold transition-all"
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
      <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-[var(--theme-card-surface)] text-[12px] mono gap-2">
        <div className="text-[var(--theme-card-text-muted)]">
          Page <span className="text-white font-bold">{page}</span> of{' '}
          <span className="text-white font-bold">{totalPages}</span> ·{' '}
          {displayedCompanies.length} Total Rows
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] disabled:opacity-40 hover:border-emerald-500 transition-colors"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] disabled:opacity-40 hover:border-emerald-500 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
