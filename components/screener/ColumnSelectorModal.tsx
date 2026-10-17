// ─── Screener Column Customizer Modal ───────────────────────────────────────
'use client';

import React, { useState } from 'react';
import { METRIC_DEFINITIONS } from '@/lib/screener/metrics';
import { MetricCategory } from '@/lib/screener/types';

interface ColumnSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedColumns: string[];
  onChangeColumns: (columns: string[]) => void;
  onResetDefault: () => void;
  onOpenCustomRatio?: () => void;
}

const CATEGORIES: { key: MetricCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All Metrics' },
  { key: 'valuation', label: 'Valuation' },
  { key: 'growth', label: 'Growth' },
  { key: 'profitability', label: 'Profitability' },
  { key: 'health', label: 'Health & Solvency' },
  { key: 'ownership', label: 'Ownership' },
  { key: 'market', label: 'Market' },
];

export function ColumnSelectorModal({
  isOpen,
  onClose,
  selectedColumns,
  onChangeColumns,
  onResetDefault,
  onOpenCustomRatio,
}: ColumnSelectorModalProps) {
  const [activeCategory, setActiveCategory] = useState<MetricCategory | 'all'>('all');
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filteredMetrics = METRIC_DEFINITIONS.filter((m) => {
    const matchesCat = activeCategory === 'all' || m.category === activeCategory;
    const matchesSearch =
      !search ||
      m.label.toLowerCase().includes(search.toLowerCase()) ||
      m.key.toLowerCase().includes(search.toLowerCase()) ||
      m.aliases.some((a) => a.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const toggleColumn = (key: string) => {
    if (selectedColumns.includes(key)) {
      if (selectedColumns.length <= 1) return; // Must have at least 1 column
      onChangeColumns(selectedColumns.filter((c) => c !== key));
    } else {
      onChangeColumns([...selectedColumns, key]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl rounded-2xl border-2 terminal-page-panel shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
          <div className="flex items-center gap-2.5">
            <span className="mono text-[16px] font-black inst-card-text uppercase tracking-wider">
              Customize Table Columns
            </span>
            <span className="mono text-[12px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
              {selectedColumns.length} Active
            </span>
          </div>
          <div className="flex items-center gap-2">
            {onOpenCustomRatio && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCustomRatio();
                }}
                className="px-3 py-1 rounded-xl border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 mono text-[11.5px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                title="Create a custom mathematical financial ratio formula"
              >
                <span>+ Custom Formula</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)] hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="px-6 py-3 border-b border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search financial metrics (e.g. ROCE, PE, Free Cash Flow)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-[13.5px] mono border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 text-xs text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)]"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`px-3 py-1.5 rounded-lg text-[12px] mono font-bold whitespace-nowrap transition-all ${
                  activeCategory === cat.key
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                    : 'border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)] hover:border-emerald-500'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Metric Selector Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-[var(--theme-card-bg)]">
          {filteredMetrics.map((metric) => {
            const isSelected = selectedColumns.includes(metric.key);
            return (
              <div
                key={metric.key}
                onClick={() => toggleColumn(metric.key)}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-500/10 shadow-xs'
                    : 'border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] hover:border-slate-500'
                }`}
              >
                <div
                  className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${
                    isSelected
                      ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                      : 'border-slate-500 bg-transparent'
                  }`}
                >
                  {isSelected && (
                    <svg className="w-3 h-3 stroke-[3]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="mono text-[13px] font-bold text-[var(--theme-card-text)] truncate">
                      {metric.label}
                    </span>
                    <span className="mono text-[10.5px] font-bold px-1.5 py-0.5 rounded border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text-muted)]">
                      {metric.unit || metric.dataType}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--theme-card-text-muted)] line-clamp-1 mt-0.5">
                    {metric.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] flex items-center justify-between">
          <button
            type="button"
            onClick={onResetDefault}
            className="mono text-[12.5px] font-bold text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)] transition-colors cursor-pointer"
          >
            Reset to Institutional Defaults
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 mono text-[13px] font-black tracking-wide hover:bg-emerald-400 transition-colors shadow-sm"
          >
            Apply Columns ({selectedColumns.length})
          </button>
        </div>
      </div>
    </div>
  );
}
