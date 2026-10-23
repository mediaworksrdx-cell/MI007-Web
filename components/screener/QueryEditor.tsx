// ─── Screener Advanced Query Expression Editor ─────────────────────────────
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { METRIC_DEFINITIONS } from '@/lib/screener/metrics';
import { parseQuery } from '@/lib/screener/queryEngine';
import { QueryParseResult } from '@/lib/screener/types';

interface QueryEditorProps {
  query: string;
  onChangeQuery: (q: string) => void;
  onRunScreen: () => void;
  onResetQuery: () => void;
  onOpenSaveScreen?: () => void;
  matchCount?: number;
}

export function QueryEditor({
  query,
  onChangeQuery,
  onRunScreen,
  onResetQuery,
  onOpenSaveScreen,
  matchCount,
}: QueryEditorProps) {
  const [parseResult, setParseResult] = useState<QueryParseResult>({ valid: true });
  const [metricHelperOpen, setMetricHelperOpen] = useState(false);
  const [helperSearch, setHelperSearch] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const helperRef = useRef<HTMLDivElement>(null);

  const handleShareScreenLink = () => {
    if (typeof window === 'undefined' || !query.trim()) return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'screener');
      url.searchParams.set('q', query.trim());
      navigator.clipboard.writeText(url.toString());
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {}
  };

  // Validate AST on query change
  useEffect(() => {
    if (!query.trim()) {
      setParseResult({ valid: true });
      return;
    }
    const result = parseQuery(query);
    setParseResult(result);
  }, [query]);

  // Close helper on Escape or outside click
  useEffect(() => {
    if (!metricHelperOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMetricHelperOpen(false);
        textareaRef.current?.focus();
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (helperRef.current && !helperRef.current.contains(e.target as Node)) {
        setMetricHelperOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [metricHelperOpen]);

  // Clean, direct text change handler without intrusive popups
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChangeQuery(e.target.value);
  };

  const handleReset = () => {
    onChangeQuery('');
    setMetricHelperOpen(false);
    onResetQuery();
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  const handleLoadExample = () => {
    onChangeQuery('ROCE > 20\nAND Return on Equity > 18\nAND Debt to Equity < 0.5\nAND Profit Growth 3Y > 12');
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  const insertSnippet = (snippet: string) => {
    if (!query.trim()) {
      onChangeQuery(snippet);
    } else {
      onChangeQuery(`${query.trim()}\nAND ${snippet}`);
    }
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  const insertMetric = (metricLabel: string) => {
    insertSnippet(`${metricLabel} > `);
    setMetricHelperOpen(false);
  };

  // Filter metrics for the optional helper panel
  const filteredMetrics = METRIC_DEFINITIONS.filter((m) => {
    if (!helperSearch.trim()) return true;
    const s = helperSearch.toLowerCase();
    return (
      m.label.toLowerCase().includes(s) ||
      m.key.toLowerCase().includes(s) ||
      m.category.toLowerCase().includes(s) ||
      m.aliases.some((a) => a.toLowerCase().includes(s))
    );
  }).slice(0, 24);

  return (
    <div className="rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-md overflow-hidden">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 border-b border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] gap-2">
        <div className="flex items-center gap-2">
          <span className="mono text-[13.5px] font-black inst-card-text tracking-wider uppercase flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Query Expression Editor
          </span>
          <span className="mono text-[11px] font-bold px-2 py-0.5 rounded border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text-muted)]">
            AST Syntax Checked
          </span>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2">
          {parseResult.valid ? (
            <span className="mono text-[11.5px] font-bold text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
              <span>✓</span>
              <span>SYNTAX OK</span>
              {matchCount !== undefined && <span>· {matchCount} MATCHES</span>}
            </span>
          ) : (
            <span className="mono text-[11.5px] font-bold text-rose-400 flex items-center gap-1 bg-rose-500/10 border border-rose-500/30 px-2.5 py-0.5 rounded-full truncate max-w-xs sm:max-w-md">
              <span>⚠</span>
              <span className="truncate">{parseResult.error}</span>
            </span>
          )}
        </div>
      </div>

      {/* Editor Body */}
      <div className="p-4 relative">
        <textarea
          ref={textareaRef}
          rows={5}
          value={query}
          onChange={handleTextChange}
          placeholder="Type conditions here (e.g. Market Cap > 5000 AND ROCE > 20) or click metric chips below..."
          className="w-full font-mono text-[14px] leading-relaxed p-3.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] placeholder:italic placeholder:font-normal placeholder:opacity-50 placeholder-[var(--theme-card-text-muted)] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 resize-y shadow-inner"
          spellCheck={false}
        />

        {/* Quick Insert Metric Snippet Chips */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="mono text-[11px] font-bold text-[var(--theme-card-text-muted)] uppercase tracking-wider mr-1">
            Insert Metric:
          </span>
          {[
            { label: 'Market Cap > 5000', snippet: 'Market Capitalization > 5000' },
            { label: 'ROCE > 20%', snippet: 'ROCE > 20' },
            { label: 'ROE > 18%', snippet: 'Return on Equity > 18' },
            { label: 'PE < 25', snippet: 'Price to Earning < 25' },
            { label: 'Debt/Eq < 0.5', snippet: 'Debt to Equity < 0.5' },
            { label: 'Sales Growth 5Y > 15%', snippet: 'Sales Growth 5Y > 15' },
            { label: 'Free Cash Flow > 0', snippet: 'Free Cash Flow > 0' },
            { label: 'OPM > 20%', snippet: 'Operating Profit Margin > 20' },
          ].map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => insertSnippet(chip.snippet)}
              className="px-2.5 py-1 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] mono text-[11.5px] font-bold text-[var(--theme-card-text-muted)] hover:text-emerald-400 hover:border-emerald-500 transition-colors cursor-pointer"
            >
              + {chip.label}
            </button>
          ))}

          {/* Clean Metric Browser Helper Toggle */}
          <button
            type="button"
            onClick={() => setMetricHelperOpen((v) => !v)}
            className={`px-2.5 py-1 rounded-lg border mono text-[11.5px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
              metricHelperOpen
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-xs'
                : 'border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text-muted)] hover:text-emerald-400 hover:border-emerald-500'
            }`}
          >
            <span>{metricHelperOpen ? '✕ Close Helper' : '🔍 Browse 60+ Financial Metrics'}</span>
          </button>
        </div>

        {/* Docked Metric Browser Drawer (Cleanly positioned BELOW chips, never obstructing textarea) */}
        {metricHelperOpen && (
          <div
            ref={helperRef}
            className="mt-3 p-3.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] shadow-lg animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between gap-3 mb-2.5 pb-2 border-b border-[var(--theme-card-border)]">
              <div className="flex items-center gap-2">
                <span className="mono text-[12px] font-black text-emerald-400 uppercase tracking-wider">
                  Browse Financial Metrics
                </span>
                <span className="mono text-[10.5px] text-[var(--theme-card-text-muted)]">
                  (Click any metric to insert condition)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMetricHelperOpen(false)}
                className="text-xs mono font-bold text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)] px-2 py-0.5 rounded cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            {/* Metric Search Input inside Helper */}
            <input
              type="text"
              value={helperSearch}
              onChange={(e) => setHelperSearch(e.target.value)}
              placeholder="Search metrics (e.g. Sales, Debt, Margins, Cash Flow)..."
              className="w-full px-3 py-2 mb-2.5 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] mono text-[12.5px] focus:outline-none focus:border-emerald-500"
              autoFocus
            />

            {/* Grid of Available Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
              {filteredMetrics.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => insertMetric(m.label)}
                  className="p-2 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] hover:border-emerald-500 hover:bg-emerald-500/10 transition-all text-left flex flex-col gap-0.5 cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="mono text-[12px] font-black text-emerald-400 group-hover:underline truncate">
                      {m.label}
                    </span>
                    <span className="mono text-[10px] text-[var(--theme-card-text-muted)] font-bold shrink-0 ml-1">
                      {m.unit}
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--theme-card-text-muted)] line-clamp-1">
                    {m.description}
                  </span>
                </button>
              ))}
              {filteredMetrics.length === 0 && (
                <div className="col-span-full py-4 text-center mono text-xs text-[var(--theme-card-text-muted)]">
                  No metrics match &ldquo;{helperSearch}&rdquo;
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 border-t border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="mono text-[12px] font-bold text-[var(--theme-card-text-muted)] hover:text-rose-400 px-2.5 py-1 rounded-lg border border-[var(--theme-card-border)] hover:border-rose-500/40 bg-[var(--theme-card-bg)] transition-colors cursor-pointer flex items-center gap-1.5"
            title="Clear all conditions in the query box"
          >
            <span>🗑</span>
            <span>Clear Query</span>
          </button>

          <button
            type="button"
            onClick={handleLoadExample}
            className="mono text-[12px] font-bold text-[var(--theme-card-text-muted)] hover:text-emerald-400 px-2.5 py-1 rounded-lg border border-[var(--theme-card-border)] hover:border-emerald-500/40 bg-[var(--theme-card-bg)] transition-colors cursor-pointer"
            title="Load default compounder example conditions"
          >
            Load Example
          </button>

          {query.trim() === '' && (
            <span className="mono text-[11px] text-[var(--theme-card-text-muted)] italic hidden sm:inline">
              (Empty: showing all companies)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {query.trim() && parseResult.valid && (
            <button
              type="button"
              onClick={handleShareScreenLink}
              className="px-3.5 py-2 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text-muted)] hover:text-emerald-400 hover:border-emerald-500/50 mono text-[12px] font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Copy shareable deep-link URL for this exact query"
            >
              <span>{copiedLink ? '✓' : '🔗'}</span>
              <span>{copiedLink ? 'LINK COPIED' : 'SHARE LINK'}</span>
            </button>
          )}

          {onOpenSaveScreen && (
            <button
              type="button"
              onClick={onOpenSaveScreen}
              disabled={!parseResult.valid || !query.trim()}
              className="px-4 py-2 rounded-xl border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 disabled:opacity-40 mono text-[12.5px] font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Save current screening query and columns"
            >
              <span>💾</span>
              <span>SAVE SCREEN</span>
            </button>
          )}

          <button
            type="button"
            onClick={onRunScreen}
            disabled={!parseResult.valid}
            className="px-6 py-2 rounded-xl bg-emerald-500 text-slate-950 mono text-[13.5px] font-black tracking-wider hover:bg-emerald-400 disabled:opacity-50 transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <span>RUN SCREEN</span>
            <span className="text-[14px]">▶</span>
          </button>
        </div>
      </div>
    </div>
  );
}
