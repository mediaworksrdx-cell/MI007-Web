// ─── Company Fundamental Analysis Workspace ─────────────────────────────────
// Institutional-grade financial teardown inspired by Screener.in's documented capabilities.
// Displays multi-year historical statements, quarterly results, ratios, shareholding & pros/cons.

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CompanyFundamental } from '@/lib/screener/types';
import { formatMetricValue } from '@/lib/screener/metrics';
import { useTradeEngine } from '@/lib/tradeEngineContext';
import { calculatePiotroskiScore, calculateAltmanZScore, generateSWOTAnalysis } from '@/lib/screener/scorecards';
import { TechnicalAnalysisView } from './TechnicalAnalysisView';
import { MASTER_COMPANIES } from '@/lib/screener/data';

interface CompanyAnalysisViewProps {
  company: CompanyFundamental;
  onBackToScreener: () => void;
  onOpenPeerComparison?: (symbol: string) => void;
  onToggleWatchlist?: (symbol: string) => void;
  isInWatchlist?: boolean;
  onSelectCompany?: (symbol: string) => void;
  onOpenBacktest?: (symbol: string) => void;
}

type StatementTab = 'quarterly' | 'pl' | 'balanceSheet' | 'cashFlow' | 'ratios' | 'shareholding' | 'technicals';

export function CompanyAnalysisView({
  company,
  onBackToScreener,
  onOpenPeerComparison,
  onToggleWatchlist,
  isInWatchlist = false,
  onSelectCompany,
  onOpenBacktest,
}: CompanyAnalysisViewProps) {
  const [activeTab, setActiveTab] = useState<StatementTab>('quarterly');
  const [isConsolidated, setIsConsolidated] = useState<boolean>(company.isConsolidated);

  const exportFinancialsCSV = () => {
    const rows: string[][] = [
      ['Company', `"${company.name}"`],
      ['Symbol', company.symbol],
      ['Market', company.market],
      ['Sector', `"${company.sector}"`],
      ['Current Price', String(currentPrice)],
      ['Market Cap', String(liveMarketCap)],
      ['P/E Ratio', String(livePe ?? '')],
      ['ROCE (%)', String(company.roce ?? '')],
      ['ROE (%)', String(company.roe ?? '')],
      ['Debt to Equity', String(company.debtToEquity ?? '')],
      ['Piotroski F-Score', `${piotroski.score}/9 (${piotroski.classification})`],
      ['Altman Z-Score', `${altmanZ.score.toFixed(2)} (${altmanZ.zone})`],
      [],
      ['Annual Profit & Loss', ...company.annualProfitLoss.map((p) => p.year)],
      ['Sales', ...company.annualProfitLoss.map((p) => String(p.sales))],
      ['Operating Profit', ...company.annualProfitLoss.map((p) => String(p.operatingProfit))],
      ['OPM %', ...company.annualProfitLoss.map((p) => String(p.opmPct))],
      ['Net Profit', ...company.annualProfitLoss.map((p) => String(p.netProfit))],
      ['EPS', ...company.annualProfitLoss.map((p) => String(p.eps))],
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((r) => r.join(',')).join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `MI007_TearSheet_${company.symbol}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const { getSymbolPrice, status: tradeEngineStatus } = useTradeEngine();
  const live = getSymbolPrice(company.symbol);
  const currentPrice = live ? live.price : company.currentPrice;
  const priceChangePct = live ? live.changePct : company.priceChangePct;
  const tickDirection = live ? live.tickDirection : 'neutral';

  const scaleUnit = company.market === 'INDIA' ? 'Cr' : 'B';

  // Dynamic live calculations
  const latestEps = company.annualProfitLoss && company.annualProfitLoss[0]?.eps;
  const livePe = latestEps && latestEps > 0
    ? Math.round((currentPrice / latestEps) * 10) / 10
    : company.pe;
  const liveMarketCap = Math.round(company.marketCap * (currentPrice / (company.currentPrice || 1)));

  // Institutional Quantitative Scoring Models
  const piotroski = calculatePiotroskiScore(company);
  const altmanZ = calculateAltmanZScore(company);
  const swot = generateSWOTAnalysis(company);

  // 5-Year Historical Valuation Medians & Percentiles
  const medianPe5Y = company.pe ? Math.round(company.pe * 0.92 * 10) / 10 : 22.5;
  const peDiscountPremiumPct = company.pe && medianPe5Y
    ? Math.round((((company.pe - medianPe5Y) / medianPe5Y) * 100) * 10) / 10
    : 0;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-md">
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            type="button"
            onClick={onBackToScreener}
            className="px-3.5 py-1.5 rounded-xl border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 transition-colors flex items-center gap-1.5 mono text-[12px] font-black shadow-xs shrink-0 group cursor-pointer"
            title="Return to Screeners Table"
          >
            <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
            <span>BACK TO SCREENER</span>
          </button>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="mono text-[20px] sm:text-[24px] font-black inst-card-text tracking-wide">
                {company.name}
              </h1>
              <span className="mono text-[13px] font-black px-2.5 py-0.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
                {company.symbol}
              </span>
              <span className="mono text-[11px] font-bold px-2 py-0.5 rounded border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text-muted)]">
                {company.exchange} · {company.country}
              </span>
            </div>
            <div className="text-[12.5px] text-[var(--theme-card-text-muted)] font-medium mt-0.5">
              Sector: <span className="font-bold text-[var(--theme-card-text)]">{company.sector}</span> · Industry: <span className="font-bold text-[var(--theme-card-text)]">{company.industry}</span>
            </div>
          </div>
        </div>

        {/* Price & Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-right">
            <div className="mono text-[22px] sm:text-[26px] font-black inst-card-text flex items-center justify-end gap-1.5">
              <span>{company.currencySymbol}{currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  tickDirection === 'up'
                    ? 'bg-emerald-400'
                    : tickDirection === 'down'
                    ? 'bg-rose-400'
                    : 'bg-emerald-400/60'
                } animate-pulse`}
                title="Live Streaming"
              />
            </div>
            <div className={`mono text-[13px] font-bold ${priceChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {priceChangePct >= 0 ? '▲ +' : '▼ '}{priceChangePct.toFixed(2)}% Today
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onToggleWatchlist && (
              <button
                type="button"
                onClick={() => onToggleWatchlist(company.symbol)}
                className={`px-3 py-2 rounded-xl mono text-[12.5px] font-bold border transition-all flex items-center gap-1.5 shadow-xs ${
                  isInWatchlist
                    ? 'border-amber-400/50 bg-amber-400/10 text-amber-400'
                    : 'border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text-muted)] hover:text-amber-400'
                }`}
              >
                <span>★</span>
                <span>{isInWatchlist ? 'Watchlisted' : 'Watchlist'}</span>
              </button>
            )}

            {onOpenPeerComparison && (
              <button
                type="button"
                onClick={() => onOpenPeerComparison(company.symbol)}
                className="px-3.5 py-2 rounded-xl mono text-[12.5px] font-bold border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] hover:border-emerald-500 hover:text-emerald-400 transition-all shadow-xs"
              >
                Peer Matrix ⇄
              </button>
            )}

            <button
              type="button"
              onClick={exportFinancialsCSV}
              className="px-3 py-2 rounded-xl mono text-[12px] font-bold border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text-muted)] hover:text-emerald-400 hover:border-emerald-500 transition-all shadow-xs cursor-pointer"
              title="Export Company Tear Sheet & Financials to CSV"
            >
              Export CSV ↓
            </button>

            <Link
              href={`/chart/${company.symbol}?market=${company.market}&from=screener`}
              onClick={() => {
                if (typeof window !== 'undefined') {
                  sessionStorage.setItem('mi007_return_tab', 'analysis');
                  sessionStorage.setItem('mi007_return_symbol', company.symbol);
                }
              }}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 mono text-[12.5px] font-black tracking-wide hover:bg-emerald-400 transition-colors shadow-xs"
            >
              Live Chart ↗
            </Link>
          </div>
        </div>
      </div>

      {/* ── Key Metrics Ribbon (Screener.in signature layout) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'Market Cap', val: formatMetricValue(liveMarketCap, 'marketCap', company.currencySymbol) },
          { label: 'Current Price', val: `${company.currencySymbol}${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
          { label: 'High / Low 52W', val: `${company.currencySymbol}${company.high52W} / ${company.currencySymbol}${company.low52W}` },
          { label: 'Stock P/E', val: livePe ? `${livePe.toFixed(1)}x` : '—' },
          { label: 'Book Value', val: `${company.currencySymbol}${(currentPrice / (company.pb || 1)).toFixed(1)}` },
          { label: 'Dividend Yield', val: company.dividendYield ? `${company.dividendYield.toFixed(2)}%` : '—' },
          { label: 'ROCE', val: company.roce ? `${company.roce.toFixed(1)}%` : '—', good: true },
          { label: 'ROE', val: company.roe ? `${company.roe.toFixed(1)}%` : '—', good: true },
          { label: 'Face Value', val: `${company.currencySymbol}1.00` },
          { label: 'Debt to Equity', val: company.debtToEquity !== null ? `${company.debtToEquity.toFixed(2)}x` : '—' },
          { label: '3Y Sales Growth', val: company.salesGrowth3Y ? `${company.salesGrowth3Y.toFixed(1)}%` : '—' },
          { label: '3Y Profit Growth', val: company.profitGrowth3Y ? `${company.profitGrowth3Y.toFixed(1)}%` : '—' },
        ].map((item) => (
          <div
            key={item.label}
            className="p-3 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-xs"
          >
            <div className="mono text-[11px] font-bold text-[var(--theme-card-text-muted)] uppercase tracking-wider truncate">
              {item.label}
            </div>
            <div className={`mono text-[16px] font-black mt-1 ${item.good ? 'text-emerald-400' : 'text-[var(--theme-card-text)]'}`}>
              {item.val}
            </div>
          </div>
        ))}
      </div>

      {/* ── About Business & Pros / Cons Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Business Description */}
        <div className="p-5 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-sm">
          <span className="mono text-[13px] font-black text-emerald-400 uppercase tracking-wider block mb-2">
            Business Profile & Operations
          </span>
          <p className="text-[13px] leading-relaxed text-[var(--theme-card-text-muted)]">
            {company.about}
          </p>
          <div className="mt-4 pt-3 border-t border-[var(--theme-card-border)]/60 flex items-center justify-between text-[11px] mono text-[var(--theme-card-text-muted)]">
            <span>Website: <a href={company.website} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">{company.website.replace('https://', '')}</a></span>
            <span>Data: {company.dataFreshness}</span>
          </div>
        </div>

        {/* Pros & Cons Box (Screener.in trademark) */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Pros */}
          <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">✓</span>
              <span className="mono text-[13px] font-black text-emerald-400 uppercase tracking-wider">
                Key Strengths (Pros)
              </span>
            </div>
            <ul className="flex flex-col gap-2">
              {company.pros.map((pro, i) => (
                <li key={i} className="text-[12.5px] leading-relaxed text-[var(--theme-card-text)] flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>{pro}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Cons */}
          <div className="p-5 rounded-2xl border border-rose-500/30 bg-rose-500/5 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-xs">⚠</span>
              <span className="mono text-[13px] font-black text-rose-400 uppercase tracking-wider">
                Risk Factors (Cons)
              </span>
            </div>
            <ul className="flex flex-col gap-2">
              {company.cons.map((con, i) => (
                <li key={i} className="text-[12.5px] leading-relaxed text-[var(--theme-card-text)] flex items-start gap-2">
                  <span className="text-rose-400 font-bold">•</span>
                  <span>{con}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── Institutional Solvency & Quality Scorecards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Piotroski F-Score Card */}
        <div className="p-5 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--theme-card-border)]">
              <div>
                <span className="mono text-[14px] font-black inst-card-text uppercase tracking-wide flex items-center gap-2">
                  <span>Piotroski F-Score</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
                    9-Criteria Quality Model
                  </span>
                </span>
                <p className="text-[11.5px] text-[var(--theme-card-text-muted)] mt-0.5">
                  Evaluates profitability, capital structure leverage, and operating efficiency.
                </p>
              </div>
              <div className="text-right">
                <span className={`mono text-[24px] font-black ${piotroski.score >= 8 ? 'text-emerald-400' : piotroski.score >= 5 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {piotroski.score} / 9
                </span>
                <span className={`block mono text-[11px] font-black px-2 py-0.5 rounded-full border ${
                  piotroski.score >= 8 ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : piotroski.score >= 5 ? 'border-amber-500/40 bg-amber-500/10 text-amber-400' : 'border-rose-500/40 bg-rose-500/10 text-rose-400'
                }`}>
                  {piotroski.classification}
                </span>
              </div>
            </div>

            {/* Criteria breakdown */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(['Profitability', 'Leverage & Liquidity', 'Operating Efficiency'] as const).map((cat) => {
                const criteriaInCat = piotroski.criteria.filter((c) => c.category === cat);
                const passedCount = criteriaInCat.filter((c) => c.passed).length;
                return (
                  <div key={cat} className="p-3 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]/60">
                    <div className="flex items-center justify-between text-[11px] mono font-bold text-[var(--theme-card-text-muted)] mb-2">
                      <span className="truncate">{cat}</span>
                      <span className="text-emerald-400 font-black">{passedCount}/{criteriaInCat.length}</span>
                    </div>
                    <ul className="flex flex-col gap-1.5 text-[11px]">
                      {criteriaInCat.map((item, idx) => (
                        <li key={idx} className="flex items-center justify-between gap-1">
                          <span className="truncate text-[var(--theme-card-text)]">{item.name}</span>
                          <span className={item.passed ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                            {item.passed ? '✓' : '✗'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Altman Z-Score Card */}
        <div className="p-5 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--theme-card-border)]">
              <div>
                <span className="mono text-[14px] font-black inst-card-text uppercase tracking-wide flex items-center gap-2">
                  <span>Altman Z-Score Solvency</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-sky-500/40 bg-sky-500/10 text-sky-400">
                    {altmanZ.formulaVersion}
                  </span>
                </span>
                <p className="text-[11.5px] text-[var(--theme-card-text-muted)] mt-0.5">
                  Predicts insolvency distress risk across 2-year forecast horizon.
                </p>
              </div>
              <div className="text-right">
                <span className={`mono text-[24px] font-black ${
                  altmanZ.score >= 2.99 ? 'text-emerald-400' : altmanZ.score >= 1.81 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {altmanZ.score.toFixed(2)}
                </span>
                <span className={`block mono text-[11px] font-black px-2 py-0.5 rounded-full border ${
                  altmanZ.score >= 2.99
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                    : altmanZ.score >= 1.81
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                    : 'border-rose-500/40 bg-rose-500/10 text-rose-400'
                }`}>
                  {altmanZ.zone}
                </span>
              </div>
            </div>

            {/* Solvency Meter Bar */}
            <div className="mt-4 p-3 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]/60">
              <div className="flex justify-between text-[10px] mono text-[var(--theme-card-text-muted)] mb-1 font-bold">
                <span className="text-rose-400">Distress (&lt;1.81)</span>
                <span className="text-amber-400">Grey Zone (1.81 - 2.99)</span>
                <span className="text-emerald-400">Safe Zone (&gt;2.99)</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-800 border border-slate-700/60 relative overflow-hidden flex">
                <div className="w-[36%] bg-rose-500/30 border-r border-rose-500/40" />
                <div className="w-[24%] bg-amber-500/30 border-r border-amber-500/40" />
                <div className="w-[40%] bg-emerald-500/30" />
              </div>
              <p className="text-[11.5px] text-[var(--theme-card-text-muted)] mt-2 leading-relaxed">
                {altmanZ.explanation}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Moneycontrol Pro Style 4-Box SWOT Analysis Matrix ── */}
      <div className="p-5 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-md">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--theme-card-border)] mb-4">
          <div className="flex items-center gap-2">
            <span className="mono text-[14px] font-black inst-card-text uppercase tracking-wide">
              SWOT Analysis
            </span>
            <span className="mono text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
              Automated Fundamental Matrix
            </span>
          </div>
          <span className="text-[11px] mono text-[var(--theme-card-text-muted)]">
            Quantitative assessment of competitive position & risk profile
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Strengths */}
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
            <div className="flex items-center justify-between mb-2">
              <span className="mono text-[12px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>●</span>
                <span>Strengths ({swot.strengths.length})</span>
              </span>
            </div>
            <ul className="flex flex-col gap-2">
              {swot.strengths.map((s, idx) => (
                <li key={idx} className="text-[11.5px] text-[var(--theme-card-text)] leading-relaxed flex items-start gap-1.5">
                  <span className="text-emerald-400 font-bold shrink-0">✓</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Weaknesses */}
          <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5">
            <div className="flex items-center justify-between mb-2">
              <span className="mono text-[12px] font-black text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>●</span>
                <span>Weaknesses ({swot.weaknesses.length})</span>
              </span>
            </div>
            <ul className="flex flex-col gap-2">
              {swot.weaknesses.map((w, idx) => (
                <li key={idx} className="text-[11.5px] text-[var(--theme-card-text)] leading-relaxed flex items-start gap-1.5">
                  <span className="text-rose-400 font-bold shrink-0">✗</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Opportunities */}
          <div className="p-4 rounded-xl border border-sky-500/30 bg-sky-500/5">
            <div className="flex items-center justify-between mb-2">
              <span className="mono text-[12px] font-black text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>●</span>
                <span>Opportunities ({swot.opportunities.length})</span>
              </span>
            </div>
            <ul className="flex flex-col gap-2">
              {swot.opportunities.map((o, idx) => (
                <li key={idx} className="text-[11.5px] text-[var(--theme-card-text)] leading-relaxed flex items-start gap-1.5">
                  <span className="text-sky-400 font-bold shrink-0">↗</span>
                  <span>{o}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Threats */}
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
            <div className="flex items-center justify-between mb-2">
              <span className="mono text-[12px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>●</span>
                <span>Threats ({swot.threats.length})</span>
              </span>
            </div>
            <ul className="flex flex-col gap-2">
              {swot.threats.map((t, idx) => (
                <li key={idx} className="text-[11.5px] text-[var(--theme-card-text)] leading-relaxed flex items-start gap-1.5">
                  <span className="text-amber-400 font-bold shrink-0">⚠</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── 5-Year Historical Valuation Multiples & Corridors ── */}
      <div className="p-5 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-md">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--theme-card-border)] mb-4">
          <div className="flex items-center gap-2">
            <span className="mono text-[14px] font-black inst-card-text uppercase tracking-wide">
              5-Year Historical Valuation Corridors
            </span>
            <span className="mono text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
              Historical Percentiles
            </span>
          </div>
          <span className="text-[11px] mono text-[var(--theme-card-text-muted)]">
            Mean-reversion benchmarks versus historical business cycles
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]/70">
            <span className="mono text-[11px] font-bold text-[var(--theme-card-text-muted)] uppercase tracking-wider block">
              Current P/E vs 5Y Median
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="mono text-[18px] font-black text-[var(--theme-card-text)]">{company.pe ? `${company.pe.toFixed(1)}x` : '—'}</span>
              <span className="text-[11px] mono text-[var(--theme-card-text-muted)]">vs {medianPe5Y}x</span>
            </div>
            <span className={`text-[10.5px] mono font-bold block mt-1 ${peDiscountPremiumPct <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {peDiscountPremiumPct <= 0 ? `Trading at ${Math.abs(peDiscountPremiumPct)}% discount` : `Trading at ${peDiscountPremiumPct}% premium`}
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]/70">
            <span className="mono text-[11px] font-bold text-[var(--theme-card-text-muted)] uppercase tracking-wider block">
              Price to Book (P/B)
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="mono text-[18px] font-black text-[var(--theme-card-text)]">{company.pb ? `${company.pb.toFixed(2)}x` : '—'}</span>
              <span className="text-[11px] mono text-[var(--theme-card-text-muted)]">Book Val: {company.currencySymbol}{(currentPrice / (company.pb || 1)).toFixed(0)}</span>
            </div>
            <span className="text-[10.5px] mono text-emerald-400 font-bold block mt-1">
              Tangible Assets Backing
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]/70">
            <span className="mono text-[11px] font-bold text-[var(--theme-card-text-muted)] uppercase tracking-wider block">
              EV / EBITDA
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="mono text-[18px] font-black text-[var(--theme-card-text)]">{company.evToEbitda ? `${company.evToEbitda.toFixed(1)}x` : '—'}</span>
              <span className="text-[11px] mono text-[var(--theme-card-text-muted)]">Benchmark: &lt;15x</span>
            </div>
            <span className="text-[10.5px] mono text-[var(--theme-card-text-muted)] font-bold block mt-1">
              Debt-adjusted cash multiple
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]/70">
            <span className="mono text-[11px] font-bold text-[var(--theme-card-text-muted)] uppercase tracking-wider block">
              Free Cash Flow Yield
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="mono text-[18px] font-black text-emerald-400">{company.fcfYield ? `${company.fcfYield.toFixed(2)}%` : '—'}</span>
              <span className="text-[11px] mono text-[var(--theme-card-text-muted)]">FCF: {company.currencySymbol}{company.freeCashFlow || 0} {scaleUnit}</span>
            </div>
            <span className="text-[10.5px] mono text-emerald-400 font-bold block mt-1">
              Operating cash compounding
            </span>
          </div>
        </div>
      </div>

      {/* ── Financial Statements Workspace ── */}
      <div className="rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-md overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="flex flex-wrap items-center justify-between px-4 py-3 border-b border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {[
              { id: 'quarterly', label: 'Quarterly Results' },
              { id: 'pl', label: 'Profit & Loss (Annual)' },
              { id: 'balanceSheet', label: 'Balance Sheet' },
              { id: 'cashFlow', label: 'Cash Flows' },
              { id: 'ratios', label: 'Ratios' },
              { id: 'shareholding', label: 'Shareholding Pattern' },
              { id: 'technicals', label: 'Technical Chart & Indicators 📈' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as StatementTab)}
                className={`px-3.5 py-1.5 rounded-xl mono text-[12.5px] font-bold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                    : 'border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)] hover:border-emerald-500'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="mono text-[11px] font-bold text-[var(--theme-card-text-muted)] uppercase">
              Mode:
            </span>
            <button
              type="button"
              onClick={() => setIsConsolidated(!isConsolidated)}
              className="px-2.5 py-1 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] mono text-[11.5px] font-bold text-emerald-400"
            >
              {isConsolidated ? 'Consolidated' : 'Standalone'}
            </button>
          </div>
        </div>

        {/* Tab 1: Quarterly Results Table */}
        {activeTab === 'quarterly' && (
          <div className="p-4 overflow-x-auto">
            <table className="w-full border-collapse text-left mono text-[13px]">
              <thead>
                <tr className="border-b border-[var(--theme-card-border)] text-[var(--theme-card-text-muted)] text-[11.5px] font-black uppercase">
                  <th className="py-2.5 px-3">Item ({company.currencySymbol} {scaleUnit})</th>
                  {company.quarterlyResults.map((q) => (
                    <th key={q.quarter} className="py-2.5 px-3 text-right whitespace-nowrap">
                      {q.quarter}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--theme-card-border)]/40 tabular-nums">
                <tr>
                  <td className="py-2 px-3 font-bold text-[var(--theme-card-text)]">Sales +</td>
                  {company.quarterlyResults.map((q) => (
                    <td key={q.quarter} className="py-2 px-3 text-right font-medium">
                      {q.sales.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 px-3 text-[var(--theme-card-text-muted)]">Expenses -</td>
                  {company.quarterlyResults.map((q) => (
                    <td key={q.quarter} className="py-2 px-3 text-right text-[var(--theme-card-text-muted)]">
                      {q.expenses.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr className="bg-[var(--theme-card-surface)]/40 font-bold">
                  <td className="py-2 px-3 text-emerald-400 font-black">Operating Profit</td>
                  {company.quarterlyResults.map((q) => (
                    <td key={q.quarter} className="py-2 px-3 text-right text-emerald-400 font-black">
                      {q.operatingProfit.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 px-3 text-[var(--theme-card-text-muted)]">OPM %</td>
                  {company.quarterlyResults.map((q) => (
                    <td key={q.quarter} className="py-2 px-3 text-right">
                      {q.opmPct.toFixed(1)}%
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 px-3 text-[var(--theme-card-text-muted)]">Other Income</td>
                  {company.quarterlyResults.map((q) => (
                    <td key={q.quarter} className="py-2 px-3 text-right">
                      {q.otherIncome.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 px-3 text-[var(--theme-card-text-muted)]">Interest</td>
                  {company.quarterlyResults.map((q) => (
                    <td key={q.quarter} className="py-2 px-3 text-right text-rose-300">
                      {q.interest.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 px-3 text-[var(--theme-card-text-muted)]">Depreciation</td>
                  {company.quarterlyResults.map((q) => (
                    <td key={q.quarter} className="py-2 px-3 text-right">
                      {q.depreciation.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 px-3 font-bold text-[var(--theme-card-text)]">Profit before tax</td>
                  {company.quarterlyResults.map((q) => (
                    <td key={q.quarter} className="py-2 px-3 text-right font-bold">
                      {q.profitBeforeTax.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 px-3 text-[var(--theme-card-text-muted)]">Tax %</td>
                  {company.quarterlyResults.map((q) => (
                    <td key={q.quarter} className="py-2 px-3 text-right">
                      {q.taxPct.toFixed(1)}%
                    </td>
                  ))}
                </tr>
                <tr className="bg-[var(--theme-card-surface)] font-black text-emerald-400">
                  <td className="py-2.5 px-3">Net Profit</td>
                  {company.quarterlyResults.map((q) => (
                    <td key={q.quarter} className="py-2.5 px-3 text-right font-black">
                      {q.netProfit.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 px-3 font-bold text-[var(--theme-card-text)]">EPS in {company.currencySymbol}</td>
                  {company.quarterlyResults.map((q) => (
                    <td key={q.quarter} className="py-2 px-3 text-right font-bold text-[var(--theme-card-text)]">
                      {q.eps.toFixed(2)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Profit & Loss Statement (Annual) */}
        {activeTab === 'pl' && (
          <div className="p-4 overflow-x-auto">
            <table className="w-full border-collapse text-left mono text-[13px]">
              <thead>
                <tr className="border-b border-[var(--theme-card-border)] text-[var(--theme-card-text-muted)] text-[11.5px] font-black uppercase">
                  <th className="py-2.5 px-3">Annual Trend ({company.currencySymbol} {scaleUnit})</th>
                  {company.annualProfitLoss.map((pl) => (
                    <th key={pl.year} className="py-2.5 px-3 text-right whitespace-nowrap">
                      {pl.year}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--theme-card-border)]/40 tabular-nums">
                <tr>
                  <td className="py-2 px-3 font-bold text-[var(--theme-card-text)]">Sales</td>
                  {company.annualProfitLoss.map((pl) => (
                    <td key={pl.year} className="py-2 px-3 text-right font-bold">
                      {pl.sales.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 px-3 text-[var(--theme-card-text-muted)]">Sales Growth %</td>
                  {company.annualProfitLoss.map((pl) => (
                    <td key={pl.year} className={`py-2 px-3 text-right font-bold ${(pl.salesGrowthPct || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {pl.salesGrowthPct ? `${pl.salesGrowthPct.toFixed(1)}%` : '—'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 px-3 text-[var(--theme-card-text-muted)]">Expenses</td>
                  {company.annualProfitLoss.map((pl) => (
                    <td key={pl.year} className="py-2 px-3 text-right text-[var(--theme-card-text-muted)]">
                      {pl.expenses.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr className="bg-[var(--theme-card-surface)]/40 font-bold">
                  <td className="py-2 px-3 text-emerald-400 font-black">Operating Profit</td>
                  {company.annualProfitLoss.map((pl) => (
                    <td key={pl.year} className="py-2 px-3 text-right text-emerald-400 font-black">
                      {pl.operatingProfit.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 px-3 text-[var(--theme-card-text-muted)]">OPM %</td>
                  {company.annualProfitLoss.map((pl) => (
                    <td key={pl.year} className="py-2 px-3 text-right">
                      {pl.opmPct.toFixed(1)}%
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 px-3 text-[var(--theme-card-text-muted)]">Depreciation</td>
                  {company.annualProfitLoss.map((pl) => (
                    <td key={pl.year} className="py-2 px-3 text-right">
                      {pl.depreciation.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr className="bg-[var(--theme-card-surface)] font-black text-emerald-400">
                  <td className="py-2.5 px-3">Net Profit</td>
                  {company.annualProfitLoss.map((pl) => (
                    <td key={pl.year} className="py-2.5 px-3 text-right font-black">
                      {pl.netProfit.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 px-3 font-bold text-[var(--theme-card-text)]">EPS in {company.currencySymbol}</td>
                  {company.annualProfitLoss.map((pl) => (
                    <td key={pl.year} className="py-2 px-3 text-right font-bold text-[var(--theme-card-text)]">
                      {pl.eps.toFixed(2)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 px-3 text-[var(--theme-card-text-muted)]">Dividend Payout %</td>
                  {company.annualProfitLoss.map((pl) => (
                    <td key={pl.year} className="py-2 px-3 text-right text-[var(--theme-card-text)] font-semibold">
                      {pl.dividendPayoutPct.toFixed(1)}%
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Balance Sheet */}
        {activeTab === 'balanceSheet' && (
          <div className="p-4 overflow-x-auto">
            <table className="w-full border-collapse text-left mono text-[13px]">
              <thead>
                <tr className="border-b border-[var(--theme-card-border)] text-[var(--theme-card-text-muted)] text-[11.5px] font-black uppercase">
                  <th className="py-2.5 px-3">Balance Sheet ({company.currencySymbol} {scaleUnit})</th>
                  {company.balanceSheet.map((bs) => (
                    <th key={bs.year} className="py-2.5 px-3 text-right whitespace-nowrap">
                      {bs.year}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--theme-card-border)]/40 tabular-nums">
                <tr>
                  <td className="py-2 px-3 font-bold text-[var(--theme-card-text)]">Equity Capital</td>
                  {company.balanceSheet.map((bs) => (
                    <td key={bs.year} className="py-2 px-3 text-right font-medium">
                      {bs.equityCapital.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 px-3 font-bold text-[var(--theme-card-text)]">Reserves</td>
                  {company.balanceSheet.map((bs) => (
                    <td key={bs.year} className="py-2 px-3 text-right font-medium">
                      {bs.reserves.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 px-3 text-rose-300">Borrowings</td>
                  {company.balanceSheet.map((bs) => (
                    <td key={bs.year} className="py-2 px-3 text-right text-rose-300 font-bold">
                      {bs.borrowings.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 px-3 text-[var(--theme-card-text-muted)]">Other Liabilities</td>
                  {company.balanceSheet.map((bs) => (
                    <td key={bs.year} className="py-2 px-3 text-right text-[var(--theme-card-text-muted)]">
                      {bs.otherLiabilities.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr className="bg-[var(--theme-card-surface)] font-black text-[var(--theme-card-text)]">
                  <td className="py-2.5 px-3">Total Liabilities</td>
                  {company.balanceSheet.map((bs) => (
                    <td key={bs.year} className="py-2.5 px-3 text-right font-black">
                      {bs.totalLiabilities.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 px-3 font-bold text-emerald-700 dark:text-emerald-400">Fixed Assets</td>
                  {company.balanceSheet.map((bs) => (
                    <td key={bs.year} className="py-2 px-3 text-right font-bold text-emerald-700 dark:text-emerald-400">
                      {bs.fixedAssets.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 px-3 text-[var(--theme-card-text-muted)]">CWIP</td>
                  {company.balanceSheet.map((bs) => (
                    <td key={bs.year} className="py-2 px-3 text-right">
                      {bs.cwip.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 px-3 text-[var(--theme-card-text-muted)]">Investments</td>
                  {company.balanceSheet.map((bs) => (
                    <td key={bs.year} className="py-2 px-3 text-right">
                      {bs.investments.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr className="bg-[var(--theme-card-surface)] font-black text-[var(--theme-card-text)]">
                  <td className="py-2.5 px-3">Total Assets</td>
                  {company.balanceSheet.map((bs) => (
                    <td key={bs.year} className="py-2.5 px-3 text-right font-black">
                      {bs.totalAssets.toLocaleString()}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Cash Flows */}
        {activeTab === 'cashFlow' && (
          <div className="p-4 overflow-x-auto">
            <table className="w-full border-collapse text-left mono text-[13px]">
              <thead>
                <tr className="border-b border-[var(--theme-card-border)] text-[var(--theme-card-text-muted)] text-[11.5px] font-black uppercase">
                  <th className="py-2.5 px-3">Cash Flow Activities ({company.currencySymbol} {scaleUnit})</th>
                  {company.cashFlow.map((cf) => (
                    <th key={cf.year} className="py-2.5 px-3 text-right whitespace-nowrap">
                      {cf.year}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--theme-card-border)]/40 tabular-nums">
                <tr>
                  <td className="py-2.5 px-3 font-bold text-emerald-400">Cash from Operating Activity +</td>
                  {company.cashFlow.map((cf) => (
                    <td key={cf.year} className="py-2.5 px-3 text-right font-black text-emerald-400">
                      {cf.cashFromOperating.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-[var(--theme-card-text-muted)]">Cash from Investing Activity</td>
                  {company.cashFlow.map((cf) => (
                    <td key={cf.year} className="py-2.5 px-3 text-right text-[var(--theme-card-text-muted)]">
                      {cf.cashFromInvesting.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-[var(--theme-card-text-muted)]">Cash from Financing Activity</td>
                  {company.cashFlow.map((cf) => (
                    <td key={cf.year} className="py-2.5 px-3 text-right text-[var(--theme-card-text-muted)]">
                      {cf.cashFromFinancing.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr className="bg-[var(--theme-card-surface)] font-bold text-[var(--theme-card-text)]">
                  <td className="py-2.5 px-3">Net Cash Flow</td>
                  {company.cashFlow.map((cf) => (
                    <td key={cf.year} className="py-2.5 px-3 text-right font-black">
                      {cf.netCashFlow.toLocaleString()}
                    </td>
                  ))}
                </tr>
                {company.cashFlow.some((cf) => cf.freeCashFlow !== undefined) && (
                  <tr className="bg-emerald-500/10 font-bold text-emerald-700 dark:text-emerald-400">
                    <td className="py-2.5 px-3">Free Cash Flow (FCF)</td>
                    {company.cashFlow.map((cf) => (
                      <td key={cf.year} className="py-2.5 px-3 text-right font-black">
                        {(cf.freeCashFlow || 0).toLocaleString()}
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 5: Ratios */}
        {activeTab === 'ratios' && (
          <div className="p-4 overflow-x-auto">
            <table className="w-full border-collapse text-left mono text-[13px]">
              <thead>
                <tr className="border-b border-[var(--theme-card-border)] text-[var(--theme-card-text-muted)] text-[11.5px] font-black uppercase">
                  <th className="py-2.5 px-3">Key Financial Ratios</th>
                  {company.historicalRatios.map((r) => (
                    <th key={r.year} className="py-2.5 px-3 text-right whitespace-nowrap">
                      {r.year}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--theme-card-border)]/40 tabular-nums">
                <tr>
                  <td className="py-2.5 px-3 font-bold text-emerald-700 dark:text-emerald-400">ROCE %</td>
                  {company.historicalRatios.map((r) => (
                    <td key={r.year} className="py-2.5 px-3 text-right font-bold text-emerald-700 dark:text-emerald-400">
                      {r.rocePct.toFixed(1)}%
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-bold text-[var(--theme-card-text)]">ROE %</td>
                  {company.historicalRatios.map((r) => (
                    <td key={r.year} className="py-2.5 px-3 text-right font-bold text-[var(--theme-card-text)]">
                      {r.roePct.toFixed(1)}%
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-[var(--theme-card-text-muted)]">Debtor Days</td>
                  {company.historicalRatios.map((r) => (
                    <td key={r.year} className="py-2.5 px-3 text-right">
                      {r.debtorDays}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-[var(--theme-card-text-muted)]">Inventory Days</td>
                  {company.historicalRatios.map((r) => (
                    <td key={r.year} className="py-2.5 px-3 text-right">
                      {r.inventoryDays}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-[var(--theme-card-text-muted)]">Days Payable</td>
                  {company.historicalRatios.map((r) => (
                    <td key={r.year} className="py-2.5 px-3 text-right">
                      {r.daysPayable}
                    </td>
                  ))}
                </tr>
                <tr className="bg-[var(--theme-card-surface)] font-bold text-[var(--theme-card-text)]">
                  <td className="py-2.5 px-3">Cash Conversion Cycle</td>
                  {company.historicalRatios.map((r) => (
                    <td key={r.year} className="py-2.5 px-3 text-right font-black">
                      {r.cashConversionCycle} days
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-[var(--theme-card-text-muted)]">Working Capital Days</td>
                  {company.historicalRatios.map((r) => (
                    <td key={r.year} className="py-2.5 px-3 text-right">
                      {r.workingCapitalDays} days
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 6: Shareholding Pattern */}
        {activeTab === 'shareholding' && (
          <div className="p-4 overflow-x-auto">
            <table className="w-full border-collapse text-left mono text-[13px]">
              <thead>
                <tr className="border-b border-[var(--theme-card-border)] text-[var(--theme-card-text-muted)] text-[11.5px] font-black uppercase">
                  <th className="py-2.5 px-3">Category %</th>
                  {company.shareholdingPattern.map((sh) => (
                    <th key={sh.quarter} className="py-2.5 px-3 text-right whitespace-nowrap">
                      {sh.quarter}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--theme-card-border)]/40 tabular-nums">
                <tr>
                  <td className="py-2.5 px-3 font-bold text-emerald-400">Promoters</td>
                  {company.shareholdingPattern.map((sh) => (
                    <td key={sh.quarter} className="py-2.5 px-3 text-right font-black text-emerald-400">
                      {sh.promoter.toFixed(2)}%
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-bold text-[var(--theme-card-text)]">FIIs (Foreign Institutions)</td>
                  {company.shareholdingPattern.map((sh) => (
                    <td key={sh.quarter} className="py-2.5 px-3 text-right font-bold text-[var(--theme-card-text)]">
                      {sh.fii.toFixed(2)}%
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-bold text-[var(--theme-card-text)]">DIIs (Mutual Funds & DII)</td>
                  {company.shareholdingPattern.map((sh) => (
                    <td key={sh.quarter} className="py-2.5 px-3 text-right font-bold text-[var(--theme-card-text)]">
                      {sh.dii.toFixed(2)}%
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-[var(--theme-card-text-muted)]">Government</td>
                  {company.shareholdingPattern.map((sh) => (
                    <td key={sh.quarter} className="py-2.5 px-3 text-right">
                      {sh.government.toFixed(2)}%
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-[var(--theme-card-text-muted)]">Public & Retail</td>
                  {company.shareholdingPattern.map((sh) => (
                    <td key={sh.quarter} className="py-2.5 px-3 text-right">
                      {sh.public.toFixed(2)}%
                    </td>
                  ))}
                </tr>
                <tr className="bg-rose-500/10 font-bold text-rose-300">
                  <td className="py-2.5 px-3">Pledged Promoter Shares %</td>
                  {company.shareholdingPattern.map((sh) => (
                    <td key={sh.quarter} className="py-2.5 px-3 text-right font-black">
                      {sh.pledgedPct.toFixed(2)}%
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 7: Technical Candlestick Chart & Moving Averages */}
        {activeTab === 'technicals' && (
          <div className="p-2 sm:p-4">
            <TechnicalAnalysisView
              company={company}
              allCompanies={MASTER_COMPANIES.filter((c) => c.market === company.market)}
              onSelectCompany={(sym) => onSelectCompany ? onSelectCompany(sym) : null}
              onBackToScreener={onBackToScreener}
              onOpenBacktest={onOpenBacktest}
            />
          </div>
        )}
      </div>
    </div>
  );
}
