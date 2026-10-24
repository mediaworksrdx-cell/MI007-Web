// ─── Save Screen Configuration Modal ─────────────────────────────────────────
'use client';

import React, { useState } from 'react';
import { SavedScreen, MarketRegion } from '@/lib/screener/types';

interface SaveScreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (screen: SavedScreen) => void;
  currentQuery: string;
  selectedColumns: string[];
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  market: MarketRegion;
  matchCount: number;
  initialScreen?: SavedScreen | null;
}

export function SaveScreenModal({
  isOpen,
  onClose,
  onSave,
  currentQuery,
  selectedColumns,
  sortColumn,
  sortDirection,
  market,
  matchCount,
  initialScreen,
}: SaveScreenModalProps) {
  const [name, setName] = useState(initialScreen?.name || '');
  const [description, setDescription] = useState(initialScreen?.description || '');
  const [category, setCategory] = useState(initialScreen?.category || 'Custom');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const screenToSave: SavedScreen = {
      id: initialScreen?.id || `user-screen-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      category,
      query: currentQuery,
      columns: selectedColumns,
      sortColumn,
      sortDirection,
      market,
      isPredefined: false,
      matchCount,
      createdAt: initialScreen?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(screenToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl border-2 terminal-page-panel shadow-2xl overflow-hidden bg-[var(--theme-card-bg)]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
          <span className="mono text-[16px] font-black inst-card-text uppercase tracking-wider">
            {initialScreen ? 'Update Saved Screen' : 'Save Screen Configuration'}
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)] hover:bg-slate-500/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block mono text-[12px] font-bold text-[var(--theme-card-text-muted)] uppercase tracking-wider mb-1.5">
              Screen Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Low Debt Compounders Under 25 PE"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-[14px] mono border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block mono text-[12px] font-bold text-[var(--theme-card-text-muted)] uppercase tracking-wider mb-1.5">
              Investment Philosophy / Description
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Filters companies with ROCE > 20% and net debt below 0.3 for quality compounding."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-[13px] mono border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] placeholder-slate-400 focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          <div>
            <label className="block mono text-[12px] font-bold text-[var(--theme-card-text-muted)] uppercase tracking-wider mb-1.5">
              Screen Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-[13px] mono border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] focus:outline-none focus:border-emerald-500"
            >
              <option value="Custom">Custom Research</option>
              <option value="Quality">Quality & Moats</option>
              <option value="Growth">Growth & Scale</option>
              <option value="Valuation">Valuation & Deep Value</option>
              <option value="Cash Flow">Cash Flow & Dividends</option>
              <option value="Special">Special Situations</option>
            </select>
          </div>

          {/* Screen Query Summary */}
          <div className="p-3 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
            <div className="flex items-center justify-between text-[11px] mono text-[var(--theme-card-text-muted)] font-bold mb-1.5">
              <span>QUERY EXPRESSION</span>
              <span className="text-emerald-400">{matchCount} Companies Matching</span>
            </div>
            <pre className="mono text-[12px] text-[var(--theme-card-text)] font-bold whitespace-pre-wrap max-h-24 overflow-y-auto">
              {currentQuery || 'All Companies (No filter)'}
            </pre>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 mt-2 pt-3 border-t border-[var(--theme-card-border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl mono text-[13px] font-bold text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 mono text-[13px] font-black tracking-wide hover:bg-emerald-400 disabled:opacity-50 transition-all shadow-sm"
            >
              {initialScreen ? 'Update Screen' : 'Save Screen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
