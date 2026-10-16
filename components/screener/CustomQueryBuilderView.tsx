// ─── Custom Query Builder & Diagnostic Lab Workspace ───────────────────────
'use client';

import React, { useState, useMemo } from 'react';
import { METRIC_DEFINITIONS } from '@/lib/screener/metrics';
import { parseQuery, evaluateNode } from '@/lib/screener/queryEngine';
import { MASTER_COMPANIES } from '@/lib/screener/data';
import { QueryNode, CompanyFundamental } from '@/lib/screener/types';

interface CustomQueryBuilderViewProps {
  initialQuery: string;
  onApplyQuery: (query: string) => void;
  onBackToScreener?: () => void;
  companies?: CompanyFundamental[];
}

export function CustomQueryBuilderView({
  initialQuery,
  onApplyQuery,
  onBackToScreener,
  companies = MASTER_COMPANIES,
}: CustomQueryBuilderViewProps) {
  const [queryText, setQueryText] = useState(initialQuery);
  const [testSymbol, setTestSymbol] = useState(companies[0]?.symbol || 'TCS');
  const [metricFilter, setMetricFilter] = useState('');

  const parseResult = useMemo(() => {
    return parseQuery(queryText);
  }, [queryText]);

  const testCompany = useMemo(() => {
    return companies.find((c) => c.symbol === testSymbol) || companies[0];
  }, [testSymbol, companies]);

  const testPassed = useMemo(() => {
    if (!parseResult.valid || !parseResult.ast || !testCompany) return false;
    return evaluateNode(parseResult.ast, testCompany);
  }, [parseResult, testCompany]);

  const filteredMetrics = METRIC_DEFINITIONS.filter((m) => {
    if (!metricFilter) return true;
    const f = metricFilter.toLowerCase();
    return (
      m.label.toLowerCase().includes(f) ||
      m.key.toLowerCase().includes(f) ||
      m.aliases.some((a) => a.toLowerCase().includes(f))
    );
  });

  const appendCondition = (metricLabel: string, op: string = '>', val: string = '15') => {
    const snippet = `${metricLabel} ${op} ${val}`;
    if (!queryText.trim()) {
      setQueryText(snippet);
    } else {
      setQueryText(`${queryText.trim()}\nAND ${snippet}`);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="p-6 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          {onBackToScreener && (
            <button
              type="button"
              onClick={onBackToScreener}
              className="px-3 py-1.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] hover:border-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-1.5 mono text-[12px] font-bold shadow-xs shrink-0 group cursor-pointer"
              title="Back to Screener"
            >
              <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
              <span>BACK</span>
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <h2 className="mono text-[18px] sm:text-[22px] font-black inst-card-text uppercase tracking-wide">
                Advanced Financial Query Lab
              </h2>
            </div>
            <p className="text-[13px] text-[var(--theme-card-text-muted)] font-medium mt-1">
              Construct complex multi-variable compound screens using safe AST parsing. Test logic interactively before applying.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onApplyQuery(queryText)}
          disabled={!parseResult.valid}
          className="px-6 py-2.5 rounded-xl bg-emerald-500 text-slate-950 mono text-[13px] font-black tracking-wide hover:bg-emerald-400 disabled:opacity-50 transition-all shadow-sm shrink-0"
        >
          Apply to Main Screener ▶
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Query Editor & Test Runner (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Query Textarea Box */}
          <div className="p-5 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="mono text-[13px] font-black inst-card-text uppercase tracking-wider">
                Financial Logic Expression
              </span>
              <span className="mono text-[11px] font-bold text-[var(--theme-card-text-muted)]">
                Supports AND, OR, NOT, ( ), BETWEEN
              </span>
            </div>
            <textarea
              rows={7}
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder={`Market Capitalization > 5000\nAND Sales Growth 5Y > 15\nAND ROCE > 18\nAND Debt to Equity < 0.5`}
              className="w-full font-mono text-[14px] leading-relaxed p-4 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-emerald-300 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-bold resize-y"
              spellCheck={false}
            />

            {/* Validation Feedback */}
            <div className="mt-3 p-3 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] flex items-center justify-between text-[12px] mono">
              <div>
                <span className="text-[var(--theme-card-text-muted)] font-bold mr-2">AST PARSER:</span>
                {parseResult.valid ? (
                  <span className="text-emerald-400 font-black">
                    ✓ VALID — Safe Abstract Syntax Tree Generated
                  </span>
                ) : (
                  <span className="text-rose-400 font-black">
                    ✕ ERROR — {parseResult.error}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Company Simulation Runner */}
          <div className="p-5 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="mono text-[13px] font-black inst-card-text uppercase tracking-wider">
                Interactive Test Evaluator
              </span>
              <select
                value={testSymbol}
                onChange={(e) => setTestSymbol(e.target.value)}
                className="px-3 py-1 rounded-lg mono text-[12px] font-bold border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] focus:outline-none"
              >
                {companies.map((c) => (
                  <option key={c.symbol} value={c.symbol}>
                    Test on: {c.symbol} ({c.name})
                  </option>
                ))}
              </select>
            </div>

            {testCompany && (
              <div className="p-4 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] flex items-center justify-between">
                <div>
                  <div className="mono text-[15px] font-black text-white">
                    {testCompany.symbol} — {testCompany.name}
                  </div>
                  <div className="mono text-[12px] text-[var(--theme-card-text-muted)] mt-0.5">
                    Sector: {testCompany.sector} · MCap: {testCompany.currencySymbol}{testCompany.marketCap.toLocaleString()} Cr
                  </div>
                </div>

                <div className="text-right">
                  <span className="mono text-[11px] font-bold text-[var(--theme-card-text-muted)] block uppercase">
                    Evaluation Result
                  </span>
                  <span
                    className={`mono text-[16px] font-black px-3 py-1 rounded-lg inline-block mt-1 ${
                      testPassed
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    }`}
                  >
                    {testPassed ? '✓ PASSES SCREEN' : '✕ DOES NOT PASS'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Financial Metrics Library & Snippet Inserter (5 cols) */}
        <div className="lg:col-span-5 p-5 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-sm flex flex-col max-h-[700px]">
          <div className="flex items-center justify-between mb-3">
            <span className="mono text-[13px] font-black inst-card-text uppercase tracking-wider">
              Metrics Dictionary
            </span>
            <span className="mono text-[11px] font-bold text-emerald-400">
              {filteredMetrics.length} Available
            </span>
          </div>

          <input
            type="text"
            placeholder="Search metrics library..."
            value={metricFilter}
            onChange={(e) => setMetricFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-[12.5px] mono border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] placeholder-slate-400 focus:outline-none focus:border-emerald-500 mb-3"
          />

          <div className="flex-1 overflow-y-auto divide-y divide-[var(--theme-card-border)]/50 pr-1">
            {filteredMetrics.map((m) => (
              <div
                key={m.key}
                className="py-2.5 flex items-start justify-between gap-2 group"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="mono text-[12.5px] font-bold text-[var(--theme-card-text)]">
                      {m.label}
                    </span>
                    <span className="mono text-[10px] font-bold px-1.5 rounded border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text-muted)]">
                      {m.unit || m.dataType}
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--theme-card-text-muted)] line-clamp-1 mt-0.5">
                    {m.description}
                  </div>
                  {m.benchmarkGood && (
                    <div className="text-[10.5px] mono text-emerald-400/80 mt-0.5">
                      Target: {m.benchmarkGood}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => appendCondition(m.label, '>', '15')}
                  className="px-2 py-1 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-emerald-400 mono text-[11px] font-black opacity-80 group-hover:opacity-100 hover:border-emerald-500 transition-all shrink-0"
                  title="Append to query"
                >
                  + Add
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
