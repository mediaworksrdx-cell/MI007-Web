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
  matchCount?: number;
}

export function QueryEditor({
  query,
  onChangeQuery,
  onRunScreen,
  onResetQuery,
  matchCount,
}: QueryEditorProps) {
  const [parseResult, setParseResult] = useState<QueryParseResult>({ valid: true });
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [filterWord, setFilterWord] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Validate on query change
  useEffect(() => {
    if (!query.trim()) {
      setParseResult({ valid: true });
      return;
    }
    const result = parseQuery(query);
    setParseResult(result);
  }, [query]);

  // Autocomplete suggestions
  const suggestions = METRIC_DEFINITIONS.filter((m) => {
    if (!filterWord) return false;
    const fw = filterWord.toLowerCase();
    return (
      m.label.toLowerCase().includes(fw) ||
      m.key.toLowerCase().includes(fw) ||
      m.aliases.some((a) => a.toLowerCase().includes(fw))
    );
  }).slice(0, 5);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChangeQuery(val);

    // Detect word at cursor for autocomplete
    const cursorPos = e.target.selectionStart;
    const textBefore = val.slice(0, cursorPos);
    const lastWordMatch = textBefore.match(/([a-zA-Z0-9%]+)$/);

    if (lastWordMatch && lastWordMatch[1].length >= 2) {
      setFilterWord(lastWordMatch[1]);
      setSuggestionOpen(true);
    } else {
      setSuggestionOpen(false);
    }
  };

  const insertSuggestion = (metricLabel: string) => {
    if (!textareaRef.current) return;
    const cursorPos = textareaRef.current.selectionStart;
    const textBefore = query.slice(0, cursorPos);
    const textAfter = query.slice(cursorPos);
    const newTextBefore = textBefore.replace(/([a-zA-Z0-9%]+)$/, metricLabel);
    onChangeQuery(`${newTextBefore} > `);
    setSuggestionOpen(false);
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
  };

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
          placeholder={`Enter financial screening conditions, e.g.:\nMarket Capitalization > 5000\nAND Sales Growth 5Y > 15\nAND ROCE > 18\nAND Debt to Equity < 0.5\nAND Interest Coverage Ratio > 5`}
          className="w-full font-mono text-[14px] leading-relaxed p-3.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] placeholder-[var(--theme-card-text-muted)] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 resize-y shadow-inner"
          spellCheck={false}
        />

        {/* Autocomplete Popup */}
        {suggestionOpen && suggestions.length > 0 && (
          <div className="absolute left-6 bottom-20 z-30 w-80 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-2xl p-1.5 divide-y divide-[var(--theme-card-border)]/50">
            <div className="px-2 py-1 text-[10.5px] mono font-bold text-[var(--theme-card-text-muted)] uppercase tracking-wider">
              Autocomplete Financial Metrics
            </div>
            {suggestions.map((m) => (
              <div
                key={m.key}
                onClick={() => insertSuggestion(m.label)}
                className="p-2 hover:bg-emerald-500/10 rounded-lg cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="mono text-[12.5px] font-bold text-emerald-400">{m.label}</span>
                  <span className="mono text-[10.5px] text-[var(--theme-card-text-muted)] font-bold">{m.unit}</span>
                </div>
                <div className="text-[10.5px] text-[var(--theme-card-text-muted)] truncate">{m.description}</div>
              </div>
            ))}
          </div>
        )}

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
              className="px-2.5 py-1 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] mono text-[11.5px] font-bold text-[var(--theme-card-text-muted)] hover:text-emerald-400 hover:border-emerald-500 transition-colors"
            >
              + {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Footer bar */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
        <button
          type="button"
          onClick={onResetQuery}
          className="mono text-[12.5px] font-bold text-[var(--theme-card-text-muted)] hover:text-white transition-colors"
        >
          Reset Filters
        </button>

        <div className="flex items-center gap-2.5">
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
