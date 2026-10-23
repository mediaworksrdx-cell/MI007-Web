// ─── Screener Column Customizer Modal ───────────────────────────────────────
'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [mounted, setMounted] = useState(false);
  const [activeCategory, setActiveCategory] = useState<MetricCategory | 'all'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

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

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl my-auto rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] shadow-2xl flex flex-col max-h-[calc(100vh-60px)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header Bar ── */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">▦</span>
            <span className="mono text-[15px] sm:text-[16px] font-black uppercase tracking-wider text-[var(--theme-card-text)]">
              Customize Table Columns
            </span>
            <span className="mono text-[11px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
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
                className="hidden sm:flex px-3 py-1 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 mono text-[11.5px] font-bold transition-all items-center gap-1 cursor-pointer"
                title="Create a custom mathematical financial ratio formula"
              >
                <span>+ Custom Formula</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)] hover:bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] transition-colors cursor-pointer text-sm font-bold"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── Search & Category Filter Toolbar ── */}
        <div className="px-5 sm:px-6 py-3.5 border-b border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] space-y-3 shrink-0">
          {/* Row 1: Dedicated Full-Width Search Input */}
          <div className="relative w-full">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-[var(--theme-card-text-muted)] select-none">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search financial metrics (e.g. Market Cap, PE, ROCE, Free Cash Flow, Debt)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 rounded-xl text-[13px] mono border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] placeholder-[var(--theme-card-text-muted)] focus:outline-none focus:border-emerald-500 transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)] p-1 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Row 2: Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setActiveCategory(cat.key)}
                  className={`px-3 py-1.5 rounded-lg text-[11.5px] mono font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                      : 'border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)] hover:border-emerald-500/50'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Metric Selector Grid ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-[var(--theme-card-bg)]">
          {filteredMetrics.length === 0 ? (
            <div className="col-span-full py-12 text-center text-sm font-mono text-[var(--theme-card-text-muted)]">
              No financial metrics found matching &ldquo;{search}&rdquo;
            </div>
          ) : (
            filteredMetrics.map((metric) => {
              const isSelected = selectedColumns.includes(metric.key);
              return (
                <div
                  key={metric.key}
                  onClick={() => toggleColumn(metric.key)}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-xs'
                      : 'border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] hover:border-slate-500/80 hover:bg-[var(--theme-card-surface)]/80'
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
                      <span className="mono text-[10px] font-bold px-1.5 py-0.5 rounded border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text-muted)]">
                        {metric.unit || metric.dataType}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--theme-card-text-muted)] line-clamp-1 mt-0.5">
                      {metric.description}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Modal Footer Bar ── */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onResetDefault}
            className="mono text-[12px] font-bold text-[var(--theme-card-text-muted)] hover:text-emerald-400 transition-colors cursor-pointer"
          >
            Reset to System Defaults
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)] mono text-[12.5px] font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 mono text-[12.5px] font-black tracking-wide hover:bg-emerald-400 transition-colors shadow-sm cursor-pointer"
            >
              Apply Columns ({selectedColumns.length})
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
