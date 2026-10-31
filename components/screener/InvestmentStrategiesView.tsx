// ─── MI007 Investment Strategies Cockpit (35 Fundamental Models) ──────────────
// Comprehensive quantitative screening cockpit for Graham Net-Net, Piotroski F-Score,
// Altman Z-Score, Magic Formula, CAN SLIM, High Dividend Aristocrats, and Factor models.
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { CompanyFundamental, MarketRegion } from '@/lib/screener/types';
import {
  INVESTMENT_STRATEGIES,
  StrategyItem,
  InvestmentStrategyCategory,
  evaluateInvestmentStrategyForCompany,
  InvestmentEvaluationResult,
} from '@/lib/screener/strategiesCatalog';

interface InvestmentStrategiesViewProps {
  companies: CompanyFundamental[];
  market: MarketRegion;
  onSelectCompany: (symbol: string) => void;
  onBackToScreener: () => void;
}

export function InvestmentStrategiesView({
  companies,
  market,
  onSelectCompany,
  onBackToScreener,
}: InvestmentStrategiesViewProps) {
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('inv_piotroski_f_score');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyQualifying, setOnlyQualifying] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [showAllStrategies, setShowAllStrategies] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [selectedStrategyId, categoryFilter, searchQuery, onlyQualifying]);

  const categories: string[] = useMemo(() => {
    return Array.from(new Set(INVESTMENT_STRATEGIES.map((s) => s.category)));
  }, []);

  const visibleStrategies = useMemo(() => {
    return INVESTMENT_STRATEGIES.filter((s) => {
      if (categoryFilter !== 'ALL' && s.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [categoryFilter, searchQuery]);

  const activeStrategy = useMemo(() => {
    return (
      INVESTMENT_STRATEGIES.find((s) => s.id === selectedStrategyId) ||
      INVESTMENT_STRATEGIES[0]
    );
  }, [selectedStrategyId]);

  // Evaluate active strategy across companies
  const evaluationResults = useMemo(() => {
    const list: { company: CompanyFundamental; eval: InvestmentEvaluationResult }[] = [];
    companies.forEach((comp) => {
      const res = evaluateInvestmentStrategyForCompany(activeStrategy.id, comp);
      list.push({ company: comp, eval: res });
    });

    return list.sort((a, b) => {
      // Sort qualifying first, then by score descending, then market cap
      if (a.eval.qualifies && !b.eval.qualifies) return -1;
      if (!a.eval.qualifies && b.eval.qualifies) return 1;
      if (b.eval.score !== a.eval.score) return b.eval.score - a.eval.score;
      return (b.company.marketCap || 0) - (a.company.marketCap || 0);
    });
  }, [companies, activeStrategy.id]);

  const filteredEvaluations = useMemo(() => {
    return evaluationResults.filter((item) => {
      if (onlyQualifying && !item.eval.qualifies) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.company.symbol.toLowerCase().includes(q) ||
          item.company.name.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [evaluationResults, onlyQualifying, searchQuery]);

  const totalPages = Math.ceil(filteredEvaluations.length / pageSize) || 1;
  const safePage = Math.min(page, totalPages);
  const paginatedEvaluations = useMemo(() => {
    return filteredEvaluations.slice((safePage - 1) * pageSize, safePage * pageSize);
  }, [filteredEvaluations, safePage, pageSize]);

  return (
    <div className="flex flex-col gap-3 animate-in fade-in duration-200">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToScreener}
            className="px-3 py-1 rounded-lg border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 transition-colors flex items-center gap-1.5 mono text-[11px] font-black shadow-xs cursor-pointer group"
          >
            <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
            <span>BACK TO SCREENER</span>
          </button>

          <div className="flex items-center gap-2">
            <h1 className="mono text-[16px] sm:text-[18px] font-black inst-card-text uppercase tracking-wide">
              Investment Strategies
            </h1>
            <span className="mono text-[10.5px] font-bold px-2 py-0.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
              35 Models
            </span>
          </div>
        </div>

        {/* Strategy Selector Dropdown & Search */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedStrategyId}
            onChange={(e) => setSelectedStrategyId(e.target.value)}
            className="h-8 px-2.5 rounded-lg mono text-[11.5px] font-bold border border-emerald-500/50 bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] focus:border-emerald-500 outline-none cursor-pointer max-w-[240px] sm:max-w-[280px]"
          >
            {visibleStrategies.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.category})
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Search stocks or models..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 px-2.5 rounded-lg mono text-[11.5px] font-bold border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] focus:border-emerald-500 outline-none w-44 sm:w-56"
          />

          <button
            type="button"
            onClick={() => setShowAllStrategies((prev) => !prev)}
            className="h-8 px-2.5 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)] mono text-[11px] font-bold cursor-pointer transition-colors"
          >
            {showAllStrategies ? 'Hide Grid ▴' : 'Browse All 35 ▾'}
          </button>
        </div>
      </div>

      {/* ── Category Filter Bar ── */}
      <div className="flex flex-wrap items-center gap-1.5 pb-0.5">
        <button
          type="button"
          onClick={() => setCategoryFilter('ALL')}
          className={`px-2.5 py-1 rounded-lg mono text-[11px] font-bold transition-all ${
            categoryFilter === 'ALL'
              ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
              : 'border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)]'
          }`}
        >
          All (35)
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoryFilter(cat)}
            className={`px-2.5 py-1 rounded-lg mono text-[11px] font-bold transition-all ${
              categoryFilter === cat
                ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                : 'border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── Active Strategy Compact Banner ── */}
      <div className="px-3.5 py-2.5 rounded-xl border border-emerald-500/40 bg-[var(--theme-card-bg)] shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="mono text-[14px] sm:text-[15px] font-black text-emerald-400">
            {activeStrategy.name}
          </span>
          <span className="px-1.5 py-0.5 rounded mono text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            {activeStrategy.category}
          </span>
          <span className="text-[11.5px] text-[var(--theme-card-text-muted)] font-medium truncate max-w-xl">
            Rules: {activeStrategy.rules.join(' • ')}
          </span>
        </div>

        <label className="flex items-center gap-2 mono text-[11px] text-[var(--theme-card-text)] font-bold cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={onlyQualifying}
            onChange={(e) => setOnlyQualifying(e.target.checked)}
            className="w-3.5 h-3.5 rounded text-emerald-500 focus:ring-emerald-400 cursor-pointer"
          />
          <span>Only Qualifying Candidates</span>
        </label>
      </div>

      {/* ── Expandable Strategy Selection Grid ── */}
      {showAllStrategies && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 p-3 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]/40 max-h-80 overflow-y-auto">
          {visibleStrategies.map((strat) => {
            const isSelected = selectedStrategyId === strat.id;
            return (
              <div
                key={strat.id}
                onClick={() => {
                  setSelectedStrategyId(strat.id);
                  setShowAllStrategies(false);
                }}
                className={`p-2.5 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-500/15 shadow-xs ring-1 ring-emerald-500'
                    : 'border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] hover:border-emerald-500/50 hover:bg-[var(--theme-card-surface)]/60'
                }`}
              >
                <div>
                  <div className="mono text-[9.5px] font-bold uppercase text-[var(--theme-card-text-muted)] truncate mb-0.5">
                    {strat.category}
                  </div>
                  <div className="mono text-[12px] font-bold text-[var(--theme-card-text)] line-clamp-1">
                    {strat.name}
                  </div>
                  <p className="text-[10.5px] text-[var(--theme-card-text-muted)] mt-0.5 line-clamp-1">
                    {strat.rules.join(', ')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Screened Companies Table for Active Investment Strategy ── */}
      <div className="flex flex-col gap-2 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] p-3.5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-[var(--theme-card-border)]">
          <div>
            <h2 className="mono text-[15px] font-black inst-card-text uppercase">
              Results: {activeStrategy.name} ({filteredEvaluations.length})
            </h2>
            <p className="text-[12px] text-[var(--theme-card-text-muted)]">
              Ranked by qualification score.
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12.5px] mono">
            <thead>
              <tr className="border-b border-[var(--theme-card-border)] text-[var(--theme-card-text-muted)] text-[10.5px] uppercase tracking-wider">
                <th className="py-2 px-2.5">Company</th>
                <th className="py-2 px-2.5">Price</th>
                <th className="py-2 px-2.5">MCap</th>
                <th className="py-2 px-2.5">Status</th>
                <th className="py-2 px-2.5">Score</th>
                <th className="py-2 px-2.5">P/E</th>
                <th className="py-2 px-2.5">P/B</th>
                <th className="py-2 px-2.5">ROE</th>
                <th className="py-2 px-2.5">ROCE</th>
                <th className="py-2 px-2.5">D/E</th>
                <th className="py-2 px-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--theme-card-border)]/50">
              {paginatedEvaluations.map(({ company, eval: ev }) => (
                <tr key={company.id} className="hover:bg-[var(--theme-card-surface)]/50 transition-colors">
                  <td className="py-1.5 px-2.5">
                    <button
                      type="button"
                      onClick={() => onSelectCompany(company.symbol)}
                      className="font-bold text-emerald-400 hover:underline cursor-pointer"
                    >
                      {company.symbol}
                    </button>
                    <div className="text-[10px] text-[var(--theme-card-text-muted)] truncate max-w-[130px]">
                      {company.name}
                    </div>
                  </td>
                  <td className="py-1.5 px-2.5 font-semibold">
                    {company.currencySymbol || '₹'}{company.currentPrice.toFixed(2)}
                  </td>
                  <td className="py-1.5 px-2.5 text-[var(--theme-card-text-muted)]">
                    {company.market === 'INDIA'
                      ? `₹${company.marketCap.toLocaleString('en-IN')} Cr`
                      : company.marketCap >= 1000
                      ? `${company.currencySymbol || '$'}${(company.marketCap / 1000).toFixed(2)}T`
                      : `${company.currencySymbol || '$'}${company.marketCap.toLocaleString('en-US', { maximumFractionDigits: 2 })}B`}
                  </td>
                  <td className="py-1.5 px-2.5">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        ev.qualifies
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {ev.qualifies ? '✓ Qualified' : 'Partial'}
                    </span>
                  </td>
                  <td className="py-1.5 px-2.5 font-black text-emerald-400">{ev.score}%</td>
                  <td className="py-1.5 px-2.5">{company.pe ? company.pe.toFixed(1) : '-'}</td>
                  <td className="py-1.5 px-2.5">{company.pb ? company.pb.toFixed(2) : '-'}</td>
                  <td className="py-1.5 px-2.5 font-semibold text-emerald-300">
                    {company.roe ? `${company.roe.toFixed(1)}%` : '-'}
                  </td>
                  <td className="py-1.5 px-2.5 font-semibold text-emerald-300">
                    {company.roce ? `${company.roce.toFixed(1)}%` : '-'}
                  </td>
                  <td className="py-1.5 px-2.5">{company.debtToEquity ? company.debtToEquity.toFixed(2) : '-'}</td>
                  <td className="py-1.5 px-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => onSelectCompany(company.symbol)}
                      className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-slate-950 font-bold transition-colors text-[10.5px] cursor-pointer"
                    >
                      Analyze
                    </button>
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
