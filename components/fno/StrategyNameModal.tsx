'use client';

import React, { useState, useEffect, useRef } from 'react';
import { StrategyCategory } from '@/lib/fno/fnoTypes';

interface StrategyNameModalProps {
  isOpen: boolean;
  mode: 'SAVE' | 'RENAME';
  initialName: string;
  initialCategory?: StrategyCategory;
  symbol: string;
  expiry?: string;
  legsCount?: number;
  netDebitCredit?: number;
  currencySymbol?: string;
  onClose: () => void;
  onConfirm: (name: string, category: StrategyCategory) => void;
}

export function StrategyNameModal({
  isOpen,
  mode,
  initialName,
  initialCategory = 'BULLISH',
  symbol,
  expiry,
  legsCount,
  netDebitCredit,
  currencySymbol = '₹',
  onClose,
  onConfirm,
}: StrategyNameModalProps) {
  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState<StrategyCategory>(initialCategory);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setCategory(initialCategory);
      // Focus and select input on open
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [isOpen, initialName, initialCategory]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;
    onConfirm(cleanName, category);
  };

  const CATEGORIES: Array<{ id: StrategyCategory; label: string; activeClass: string }> = [
    { id: 'BULLISH', label: '🐂 BULLISH', activeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' },
    { id: 'BEARISH', label: '🐻 BEARISH', activeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/50' },
    { id: 'NEUTRAL', label: '⚖️ NEUTRAL', activeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/50' },
    { id: 'VOLATILE', label: '⚡ VOLATILITY', activeClass: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/50' },
  ];

  const SUGGESTED_CHIPS = [
    `${symbol} Bull Call Spread`,
    `${symbol} Bear Put Spread`,
    `${symbol} Iron Condor`,
    `${symbol} Long Straddle`,
    `${symbol} Short Strangle`,
    `${symbol} Calendar Spread`,
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] p-5 sm:p-6 shadow-2xl z-10 space-y-4 text-[var(--theme-card-text)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--theme-card-border)]">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-500/15 text-blue-400 text-lg">
              {mode === 'SAVE' ? '💾' : '✏️'}
            </span>
            <div>
              <h3 className="mono text-base font-black tracking-tight text-[var(--theme-card-text)] uppercase">
                {mode === 'SAVE' ? 'Save & Track Strategy' : 'Rename Strategy'}
              </h3>
              <p className="text-[11px] text-[var(--theme-card-subtitle)] mt-0.5">
                {mode === 'SAVE'
                  ? 'Enter a custom name and category to track this structure in your portfolio.'
                  : 'Update the custom title for this strategy across your derivatives cockpit.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-500/20 transition-colors cursor-pointer text-sm"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Strategy Name Input */}
          <div className="space-y-1.5">
            <label className="block mono text-[11px] font-bold uppercase tracking-wider text-[var(--theme-card-text)]">
              Custom Strategy Name <span className="text-rose-400">*</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`e.g. ${symbol} Custom Strategy`}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-sm font-mono font-bold text-[var(--theme-card-text)] focus:outline-emerald-500 focus:border-emerald-500 transition-all placeholder:text-slate-500"
              maxLength={80}
              required
            />
          </div>

          {/* Suggested Quick Names (mode === 'SAVE') */}
          {mode === 'SAVE' && (
            <div className="space-y-1">
              <span className="text-[10px] mono text-[var(--theme-card-subtitle)] uppercase font-semibold">
                Quick Suggested Names:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setName(chip)}
                    className="px-2 py-0.5 rounded-md text-[10px] mono font-medium border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] hover:border-emerald-500/40 hover:text-emerald-400 transition-colors cursor-pointer text-slate-300"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Market Bias / Category Selector */}
          <div className="space-y-1.5">
            <label className="block mono text-[11px] font-bold uppercase tracking-wider text-[var(--theme-card-text)]">
              Strategy Market Bias
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10.5px] mono font-bold border transition-all cursor-pointer ${
                    category === cat.id
                      ? cat.activeClass
                      : 'border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] opacity-70 hover:opacity-100 text-slate-300'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Summary Pill Bar */}
          <div className="p-3 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] flex flex-wrap items-center justify-between gap-2 text-[11px] mono">
            <div className="flex items-center gap-2">
              <span className="font-bold text-blue-400">{symbol}</span>
              {expiry && <span className="text-slate-400">• Exp: {expiry}</span>}
              {typeof legsCount === 'number' && (
                <span className="text-slate-400">• {legsCount} Leg{legsCount !== 1 ? 's' : ''}</span>
              )}
            </div>
            {typeof netDebitCredit === 'number' && (
              <div className="font-bold">
                <span className="text-slate-400">Net: </span>
                <span className={netDebitCredit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {netDebitCredit >= 0 ? `Credit +${currencySymbol}` : `Debit -${currencySymbol}`}
                  {Math.abs(Math.round(netDebitCredit)).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--theme-card-border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs mono font-bold border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] hover:bg-slate-500/10 text-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-5 py-2 rounded-xl text-xs mono font-black bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>{mode === 'SAVE' ? '💾' : '✓'}</span>
              <span>{mode === 'SAVE' ? 'Save Strategy' : 'Update Name'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
