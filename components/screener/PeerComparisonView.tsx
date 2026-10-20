// ─── Peer Comparison Matrix Workspace ───────────────────────────────────────
'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { CompanyFundamental } from '@/lib/screener/types';
import { MASTER_COMPANIES } from '@/lib/screener/data';
import { formatMetricValue, getMetricValue, METRIC_DEFINITIONS } from '@/lib/screener/metrics';
import { useTradeEngine } from '@/lib/tradeEngineContext';

interface PeerComparisonViewProps {
  initialSymbols?: string[];
  onSelectCompany: (symbol: string) => void;
  onBackToScreener?: () => void;
  companies?: CompanyFundamental[];
}

export function PeerComparisonView({
  initialSymbols = ['TCS', 'INFY'],
  onSelectCompany,
  onBackToScreener,
  companies = MASTER_COMPANIES,
}: PeerComparisonViewProps) {
  const { getSymbolPrice } = useTradeEngine();
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(initialSymbols);
  const [candidateSymbol, setCandidateSymbol] = useState('');

  const selectedCompanies: CompanyFundamental[] = useMemo(() => {
    return selectedSymbols
      .map((sym) => companies.find((c) => c.symbol.toUpperCase() === sym.toUpperCase()))
      .filter(Boolean) as CompanyFundamental[];
  }, [selectedSymbols, companies]);

  // Sector peer suggestions
  const suggestedPeers = useMemo(() => {
    if (selectedCompanies.length === 0) return [];
    const targetSector = selectedCompanies[0].sector;
    return companies.filter(
      (c) => c.sector === targetSector && !selectedSymbols.includes(c.symbol)
    );
  }, [selectedCompanies, selectedSymbols, companies]);

  const addCompany = (sym: string) => {
    const clean = sym.trim().toUpperCase();
    if (clean && !selectedSymbols.includes(clean)) {
      setSelectedSymbols([...selectedSymbols, clean]);
    }
  };

  const removeCompany = (sym: string) => {
    if (selectedSymbols.length <= 1) return; // Keep at least one
    setSelectedSymbols(selectedSymbols.filter((s) => s !== sym));
  };

  const COMPARISON_METRICS = [
    { key: 'marketCap', label: 'Market Cap' },
    { key: 'currentPrice', label: 'Current Price' },
    { key: 'pe', label: 'P/E Ratio' },
    { key: 'pb', label: 'P/B Ratio' },
    { key: 'evToEbitda', label: 'EV / EBITDA' },
    { key: 'roce', label: 'ROCE %', highlight: true },
    { key: 'roe', label: 'ROE %', highlight: true },
    { key: 'opm', label: 'Operating Margin %' },
    { key: 'npm', label: 'Net Profit Margin %' },
    { key: 'salesGrowth3Y', label: 'Sales Growth 3Y' },
    { key: 'profitGrowth3Y', label: 'Profit Growth 3Y' },
    { key: 'debtToEquity', label: 'Debt to Equity' },
    { key: 'freeCashFlow', label: 'Free Cash Flow' },
    { key: 'dividendYield', label: 'Dividend Yield' },
    { key: 'fiiHolding', label: 'FII Holding %' },
    { key: 'diiHolding', label: 'DII Holding %' },
    { key: 'pledgedPct', label: 'Promoter Pledge %' },
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-150">
      {/* Header Bar */}
      <div className="p-6 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
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
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <h2 className="mono text-[18px] sm:text-[22px] font-black inst-card-text uppercase tracking-wide">
                Peer Comparison Matrix
              </h2>
            </div>
            <p className="text-[13px] text-[var(--theme-card-text-muted)] font-medium mt-1">
              Side-by-side cross-sectional analysis across valuation multiples, capital efficiency, and earnings power.
            </p>
          </div>
        </div>

        {/* Add Company selector */}
        <div className="flex items-center gap-2">
          <select
            value={candidateSymbol}
            onChange={(e) => {
              if (e.target.value) {
                addCompany(e.target.value);
                setCandidateSymbol('');
              }
            }}
            className="px-3.5 py-2 rounded-xl mono text-[13px] font-bold border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] focus:outline-none focus:border-emerald-500"
          >
            <option value="">+ Add Company to Compare</option>
            {companies
              .filter((c) => !selectedSymbols.includes(c.symbol))
              .map((c) => (
                <option key={c.symbol} value={c.symbol}>
                  {c.symbol} ({c.name})
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Selected Companies Badge Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="mono text-[11px] font-bold text-[var(--theme-card-text-muted)] uppercase mr-1">
          Comparing:
        </span>
        {selectedCompanies.map((c) => (
          <div
            key={c.symbol}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 mono text-[13px] font-bold shadow-xs"
          >
            <span>{c.symbol}</span>
            <span className="text-slate-400 font-normal">({c.sector})</span>
            {selectedCompanies.length > 1 && (
              <button
                type="button"
                onClick={() => removeCompany(c.symbol)}
                className="text-slate-400 hover:text-rose-400 font-bold ml-1"
                title="Remove company"
              >
                ✕
              </button>
            )}
          </div>
        ))}

        {/* Peer Suggestions */}
        {suggestedPeers.length > 0 && (
          <div className="flex items-center gap-1.5 ml-2">
            <span className="mono text-[11px] text-[var(--theme-card-text-muted)]">Suggested:</span>
            {suggestedPeers.slice(0, 3).map((sp) => (
              <button
                key={sp.symbol}
                type="button"
                onClick={() => addCompany(sp.symbol)}
                className="mono text-[11px] px-2 py-0.5 rounded border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-slate-300 hover:border-emerald-500 transition-colors"
              >
                + {sp.symbol}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Comparison Matrix Table */}
      <div className="rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left mono text-[13px]">
            <thead>
              <tr className="border-b border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text-muted)] text-[11px] font-black uppercase">
                <th className="py-3 px-4 sticky left-0 z-20 bg-[var(--theme-card-surface)] border-r border-[var(--theme-card-border)]">
                  Fundamental Dimension
                </th>
                {selectedCompanies.map((c) => {
                  const live = getSymbolPrice(c.symbol);
                  return (
                    <th key={c.symbol} className="py-3 px-4 text-right whitespace-nowrap min-w-36">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectCompany(c.symbol)}
                          className="font-black text-[14px] text-[var(--theme-card-text)] hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline transition-colors cursor-pointer"
                        >
                          {c.symbol}
                        </button>
                        {live && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              live.tickDirection === 'up'
                                ? 'bg-emerald-400'
                                : live.tickDirection === 'down'
                                ? 'bg-rose-400'
                                : 'bg-emerald-400/70'
                            } animate-pulse`}
                            title="Live Streaming"
                          />
                        )}
                      </div>
                      <span className="text-[11px] text-[var(--theme-card-text-muted)] font-normal truncate block">
                        {c.name}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--theme-card-border)]/50 tabular-nums">
              {COMPARISON_METRICS.map((metric) => {
                const def = METRIC_DEFINITIONS.find((m) => m.key === metric.key);
                return (
                  <tr
                    key={metric.key}
                    className={`hover:bg-emerald-500/5 transition-colors ${
                      metric.highlight ? 'bg-[var(--theme-card-surface)]/20 font-bold' : ''
                    }`}
                  >
                    <td className="py-2.5 px-4 font-bold text-[var(--theme-card-text)] sticky left-0 z-10 bg-[var(--theme-card-bg)] border-r border-[var(--theme-card-border)] whitespace-nowrap">
                      <span>{metric.label}</span>
                      <span className="text-[10px] text-[var(--theme-card-text-muted)] font-normal ml-2">
                        {def?.unit || ''}
                      </span>
                    </td>

                    {selectedCompanies.map((c) => {
                      const raw = getMetricValue(c, metric.key);
                      const formatted = formatMetricValue(raw, metric.key, c.currencySymbol);
                      return (
                        <td
                          key={c.symbol}
                          className={`py-2.5 px-4 text-right ${
                            metric.highlight
                              ? 'text-emerald-400 font-black'
                              : 'text-[var(--theme-card-text)] font-medium'
                          }`}
                        >
                          {formatted}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
