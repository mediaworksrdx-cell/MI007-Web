// ─── Company Quick Search & Navigation Modal ────────────────────────────────
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CompanyFundamental } from '@/lib/screener/types';
import { MASTER_COMPANIES } from '@/lib/screener/data';

interface CompanySearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCompany: (symbol: string) => void;
  companies?: CompanyFundamental[];
}

export function CompanySearchModal({
  isOpen,
  onClose,
  onSelectCompany,
  companies = MASTER_COMPANIES,
}: CompanySearchModalProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = companies.filter((c) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      c.symbol.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.sector.toLowerCase().includes(q) ||
      c.industry.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl rounded-2xl border-2 terminal-page-panel shadow-2xl overflow-hidden bg-[var(--theme-card-bg)] flex flex-col">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] flex items-center gap-3">
          <svg className="w-5 h-5 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search company or ticker (e.g. RELIANCE, TCS, AAPL, EMAAR)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent mono text-[15px] font-bold text-[var(--theme-card-text)] placeholder-slate-400 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)] hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-[var(--theme-card-border)]/50">
          {filtered.length === 0 ? (
            <div className="p-8 text-center mono text-[13px] text-[var(--theme-card-text-muted)]">
              No matching companies found for &quot;{query}&quot;
            </div>
          ) : (
            filtered.map((comp) => (
              <div
                key={comp.id}
                onClick={() => {
                  onSelectCompany(comp.symbol);
                  onClose();
                }}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-emerald-500/10 cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] flex items-center justify-center mono text-[12px] font-black text-emerald-400">
                    {comp.symbol.slice(0, 3)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="mono text-[14px] font-black text-[var(--theme-card-text)] group-hover:text-emerald-400 transition-colors">
                        {comp.symbol}
                      </span>
                      <span className="mono text-[11px] font-bold px-1.5 py-0.2 rounded border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text-muted)]">
                        {comp.exchange}
                      </span>
                    </div>
                    <div className="text-[12px] text-[var(--theme-card-text-muted)] font-medium truncate max-w-xs">
                      {comp.name} · {comp.sector}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="mono text-[14px] font-black text-[var(--theme-card-text)]">
                    {comp.currencySymbol}{comp.currentPrice.toLocaleString()}
                  </div>
                  <div className={`mono text-[11.5px] font-bold ${comp.priceChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {comp.priceChangePct >= 0 ? '+' : ''}{comp.priceChangePct.toFixed(2)}%
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
