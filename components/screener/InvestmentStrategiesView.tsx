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
                Institutional Investment Strategies Cockpit
              </h1>
              <span className="mono text-[11px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
                35 Fundamental Models
              </span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 mono text-[10.5px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>UNIVERSE SCREENED</span>
              </div>
            </div>
            <p className="text-[12.5px] text-[var(--theme-card-text-muted)] font-medium mt-0.5">
              Deep Value, Graham Net-Net, Piotroski F-Score, Altman Z, High ROCE Moats, CAN SLIM, and Dividend Aristocrats.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search investment models or companies..."
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
          onClick={() => setCategoryFilter('ALL')}
          className={`px-3 py-1.5 rounded-xl mono text-[11.5px] font-bold transition-all ${
            categoryFilter === 'ALL'
              ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
              : 'border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)]'
          }`}
        >
          All Categories (35)
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoryFilter(cat)}
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

      {/* ── Active Investment Strategy Hero Card ── */}
      <div className="p-5 rounded-2xl border-2 border-emerald-500/50 bg-gradient-to-r from-emerald-950/20 via-[var(--theme-card-bg)] to-cyan-950/20 shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="mono text-[18px] sm:text-[20px] font-black text-emerald-400">
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
                Screening Rules & Criteria:
              </span>
              <ul className="list-disc list-inside text-[12px] text-[var(--theme-card-text-muted)] space-y-0.5">
                {activeStrategy.rules.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 mono text-[11.5px] text-[var(--theme-card-text)] font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={onlyQualifying}
                onChange={(e) => setOnlyQualifying(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400"
              />
              <span>Only Qualifying Candidates</span>
            </label>
          </div>
        </div>
      </div>

      {/* ── Investment Strategies Selection Grid (Horizontal scroll / compact grid) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {visibleStrategies.map((strat) => {
          const isSelected = selectedStrategyId === strat.id;
          return (
            <div
              key={strat.id}
              onClick={() => setSelectedStrategyId(strat.id)}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-500/10 shadow-md ring-1 ring-emerald-500'
                  : 'border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] hover:border-emerald-500/50 hover:bg-[var(--theme-card-surface)]/60'
              }`}
            >
              <div>
                <div className="mono text-[10px] font-bold uppercase text-[var(--theme-card-text-muted)] truncate mb-1">
                  {strat.category}
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

      {/* ── Screened Companies Table for Active Investment Strategy ── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] p-5 shadow-md mt-2">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--theme-card-border)]">
          <div>
            <h2 className="mono text-[16px] font-black inst-card-text uppercase">
              Screened Candidates: {activeStrategy.name} ({filteredEvaluations.length} Results)
            </h2>
            <p className="text-[12px] text-[var(--theme-card-text-muted)]">
              Ranked by model qualification score and criteria adherence.
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12.5px] mono">
            <thead>
              <tr className="border-b border-[var(--theme-card-border)] text-[var(--theme-card-text-muted)] text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3">Company</th>
                <th className="py-2.5 px-3">Price</th>
                <th className="py-2.5 px-3">Market Cap</th>
                <th className="py-2.5 px-3">Model Status</th>
                <th className="py-2.5 px-3">Adherence Score</th>
                <th className="py-2.5 px-3">P/E</th>
                <th className="py-2.5 px-3">P/B</th>
                <th className="py-2.5 px-3">ROE %</th>
                <th className="py-2.5 px-3">ROCE %</th>
                <th className="py-2.5 px-3">D/E</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--theme-card-border)]/50">
              {paginatedEvaluations.map(({ company, eval: ev }) => (
                <tr key={company.id} className="hover:bg-[var(--theme-card-surface)]/50 transition-colors">
                  <td className="py-2.5 px-3">
                    <button
                      type="button"
                      onClick={() => onSelectCompany(company.symbol)}
                      className="font-bold text-emerald-400 hover:underline cursor-pointer"
                    >
                      {company.symbol}
                    </button>
                    <div className="text-[10px] text-[var(--theme-card-text-muted)] truncate max-w-[140px]">
                      {company.name}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-semibold">₹{company.currentPrice.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-[var(--theme-card-text-muted)]">
                    ₹{company.marketCap.toLocaleString()} Cr
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
                        ev.qualifies
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {ev.qualifies ? '✓ QUALIFIED' : 'PARTIAL MATCH'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-black text-emerald-400">{ev.score}%</td>
                  <td className="py-2.5 px-3">{company.pe ? company.pe.toFixed(1) : '-'}</td>
                  <td className="py-2.5 px-3">{company.pb ? company.pb.toFixed(2) : '-'}</td>
                  <td className="py-2.5 px-3 font-semibold text-emerald-300">
                    {company.roe ? `${company.roe.toFixed(1)}%` : '-'}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-emerald-300">
                    {company.roce ? `${company.roce.toFixed(1)}%` : '-'}
                  </td>
                  <td className="py-2.5 px-3">{company.debtToEquity ? company.debtToEquity.toFixed(2) : '-'}</td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => onSelectCompany(company.symbol)}
                      className="px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500 hover:text-slate-950 font-bold transition-colors text-[10.5px] cursor-pointer"
                    >
                      Analyze →
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
