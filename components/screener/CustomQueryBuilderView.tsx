// ─── Custom Query Builder & Diagnostic Lab Workspace ───────────────────────
'use client';

import React, { useState, useMemo } from 'react';
import { METRIC_DEFINITIONS } from '@/lib/screener/metrics';
import { parseQuery } from '@/lib/screener/queryEngine';
import { MASTER_COMPANIES } from '@/lib/screener/data';
import { CompanyFundamental } from '@/lib/screener/types';

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
  companies: _companies = MASTER_COMPANIES,
}: CustomQueryBuilderViewProps) {
  const [queryText, setQueryText] = useState(initialQuery);
  const [metricFilter, setMetricFilter] = useState('');

  const parseResult = useMemo(() => {
    return parseQuery(queryText);
  }, [queryText]);

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
              className="px-3.5 py-1.5 rounded-xl border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 transition-colors flex items-center gap-1.5 mono text-[12px] font-black shadow-xs shrink-0 group cursor-pointer"
              title="Return to Stock Screener Table"
            >
              <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
              <span>BACK TO SCREENER</span>
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
              Construct complex multi-variable compound screens using boolean and arithmetic operators.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onApplyQuery(queryText)}
          disabled={!parseResult.valid}
          className="px-6 py-2.5 rounded-xl bg-emerald-500 text-slate-950 mono text-[13px] font-black tracking-wide hover:bg-emerald-400 disabled:opacity-50 transition-all shadow-sm shrink-0 cursor-pointer"
        >
          Apply to Main Screener ▶
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Query Editor (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Query Textarea Box */}
          <div className="p-5 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-sm flex flex-col flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="mono text-[13px] font-black inst-card-text uppercase tracking-wider">
                Financial Logic Expression
              </span>
              <span className="mono text-[11px] font-bold text-[var(--theme-card-text-muted)]">
                Supports AND, OR, NOT, ( ), BETWEEN
              </span>
            </div>
            <textarea
              rows={14}
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder={`Market Capitalization > 5000\nAND Sales Growth 5Y > 15\nAND ROCE > 18\nAND Debt to Equity < 0.5`}
              className="w-full font-mono text-[14px] leading-relaxed p-4 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-emerald-300 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-bold resize-y flex-1"
              spellCheck={false}
            />

            {!parseResult.valid && parseResult.error && (
              <div className="mt-3 p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-[12px] mono font-bold">
                ✕ Syntax Error: {parseResult.error}
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
