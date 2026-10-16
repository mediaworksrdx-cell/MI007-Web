// ─── Custom Ratio & Formula Creator Modal ──────────────────────────────────
'use client';

import React, { useState, useMemo } from 'react';
import { CustomRatio, CompanyFundamental } from '@/lib/screener/types';
import { validateFormula, evaluateCustomRatio } from '@/lib/screener/customRatios';
import { MASTER_COMPANIES } from '@/lib/screener/data';
import { METRIC_DEFINITIONS } from '@/lib/screener/metrics';

interface CustomRatioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (ratio: CustomRatio) => void;
  marketCompanies?: CompanyFundamental[];
}

export function CustomRatioModal({
  isOpen,
  onClose,
  onSave,
  marketCompanies = MASTER_COMPANIES,
}: CustomRatioModalProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [formula, setFormula] = useState('');
  const [unit, setUnit] = useState('%');
  const [decimals, setDecimals] = useState(2);
  const [description, setDescription] = useState('');
  const [previewSymbol, setPreviewSymbol] = useState(marketCompanies[0]?.symbol || 'TCS');

  const selectedCompany = useMemo(() => {
    return marketCompanies.find((c) => c.symbol === previewSymbol) || marketCompanies[0];
  }, [previewSymbol, marketCompanies]);

  const validation = useMemo(() => {
    if (!formula.trim()) return { valid: false, error: 'Enter a mathematical formula' };
    return validateFormula(formula);
  }, [formula]);

  const previewValue = useMemo(() => {
    if (!validation.valid || !selectedCompany) return null;
    const tempRatio: CustomRatio = {
      id: 'temp',
      name,
      code,
      formula,
      unit,
      decimals,
      description,
      createdAt: '',
    };
    return evaluateCustomRatio(tempRatio, selectedCompany);
  }, [validation.valid, selectedCompany, formula, name, code, unit, decimals, description]);

  if (!isOpen) return null;

  const insertMetric = (metricLabel: string) => {
    setFormula((prev) => (prev ? `${prev} ${metricLabel}` : metricLabel));
  };

  const insertOperator = (op: string) => {
    setFormula((prev) => (prev ? `${prev} ${op} ` : `${op} `));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !validation.valid) return;

    const ratio: CustomRatio = {
      id: `custom-ratio-${Date.now()}`,
      name: name.trim(),
      code: code.trim().toUpperCase() || name.trim().toUpperCase().replace(/\s+/g, '_'),
      formula: formula.trim(),
      unit,
      decimals,
      description: description.trim(),
      createdAt: new Date().toISOString(),
    };

    onSave(ratio);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-2xl border-2 terminal-page-panel shadow-2xl overflow-hidden bg-[var(--theme-card-bg)] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
          <div className="flex items-center gap-2">
            <span className="mono text-[16px] font-black inst-card-text uppercase tracking-wider">
              Create Custom Financial Ratio
            </span>
            <span className="mono text-[11px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
              Safe Shunting-Yard AST
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block mono text-[12px] font-bold text-[var(--theme-card-text-muted)] uppercase tracking-wider mb-1">
                Ratio Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. FCF to Market Cap"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!code) setCode(e.target.value.toUpperCase().replace(/\s+/g, '_'));
                }}
                className="w-full px-3.5 py-2.5 rounded-xl text-[13.5px] mono border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block mono text-[12px] font-bold text-[var(--theme-card-text-muted)] uppercase tracking-wider mb-1">
                Unit / Format
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['%', 'x', 'ratio'].map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnit(u)}
                    className={`py-2 rounded-xl mono text-[13px] font-bold border transition-all ${
                      unit === u
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                        : 'border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text-muted)]'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="mono text-[12px] font-bold text-[var(--theme-card-text-muted)] uppercase tracking-wider">
                Formula Expression *
              </label>
              <span className="mono text-[11px] text-[var(--theme-card-text-muted)]">
                Use +, -, *, /, ( )
              </span>
            </div>
            <textarea
              rows={2}
              required
              placeholder="e.g. Free Cash Flow / Market Capitalization * 100"
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-[14px] mono border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] placeholder-[var(--theme-card-text-muted)] focus:outline-none focus:border-emerald-500 font-bold resize-none"
            />
            {/* Validation Feedback */}
            <div className="mt-1 flex items-center justify-between text-[11.5px] mono">
              {validation.valid ? (
                <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
                  ✓ Valid mathematical expression
                </span>
              ) : (
                <span className="text-rose-400 font-bold">
                  ⚠ {validation.error}
                </span>
              )}
            </div>
          </div>

          {/* Quick Insert Operators and Financial Metrics */}
          <div className="p-3 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
            <span className="mono text-[11px] font-black text-[var(--theme-card-text-muted)] uppercase tracking-wider block mb-2">
              Quick Insert Operators & Variables
            </span>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {['+', '-', '*', '/', '(', ')', '100'].map((op) => (
                <button
                  key={op}
                  type="button"
                  onClick={() => insertOperator(op)}
                  className="px-2.5 py-1 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] mono text-[12px] font-black text-emerald-400 hover:border-emerald-500 transition-colors"
                >
                  {op}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {[
                'Free Cash Flow',
                'Market Capitalization',
                'Cash from Operations',
                'Net Profit Margin',
                'Operating Profit Margin',
                'ROCE',
                'Return on Equity',
                'Net Debt',
                'EBITDA Growth',
                'Price to Earning',
                'Price to Book Value',
              ].map((metric) => (
                <button
                  key={metric}
                  type="button"
                  onClick={() => insertMetric(metric)}
                  className="px-2 py-0.5 rounded-md border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] mono text-[11px] font-bold text-[var(--theme-card-text-muted)] hover:text-white hover:border-slate-400 transition-colors"
                >
                  + {metric}
                </button>
              ))}
            </div>
          </div>

          {/* Real-time Preview against Company */}
          <div className="p-3.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] flex items-center justify-between">
            <div>
              <span className="mono text-[11px] font-bold text-[var(--theme-card-text-muted)] uppercase tracking-wider block">
                Live Calculation Preview
              </span>
              <div className="flex items-center gap-2 mt-1">
                <select
                  value={previewSymbol}
                  onChange={(e) => setPreviewSymbol(e.target.value)}
                  className="px-2 py-1 rounded-lg text-[12px] mono border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] font-bold focus:outline-none"
                >
                  {marketCompanies.map((c) => (
                    <option key={c.symbol} value={c.symbol}>
                      {c.symbol} ({c.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="text-right">
              <span className="mono text-[11px] font-bold text-[var(--theme-card-text-muted)] block">
                Resulting Value
              </span>
              <span className="mono text-[18px] font-black text-emerald-400">
                {previewValue !== null
                  ? `${previewValue.toFixed(decimals)} ${unit}`
                  : '—'}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--theme-card-border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl mono text-[13px] font-bold text-[var(--theme-card-text-muted)] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !validation.valid}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 mono text-[13px] font-black tracking-wide hover:bg-emerald-400 disabled:opacity-50 transition-all shadow-sm"
            >
              Save Custom Ratio
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
