'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { IndicatorConfig, INDICATOR_DEFAULTS } from '@/lib/types';

interface IndicatorSettingsModalProps {
  indicator: IndicatorConfig;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: IndicatorConfig) => void;
}

export function IndicatorSettingsModal({ indicator, isOpen, onClose, onSave }: IndicatorSettingsModalProps) {
  const defaultMeta = INDICATOR_DEFAULTS[indicator.type] || {
    period: 14,
    secondaryPeriod: 0,
    tertiaryPeriod: 0,
    multiplier: 1,
    color: '#3B82F6',
    secondaryColor: '#10B981',
    tertiaryColor: '#EF4444',
    step: 0.02,
    maxAf: 0.20,
    label: indicator.type,
  };

  // Keep all numeric inputs as strings so backspace/clear never leaves a phantom '0'
  const [period, setPeriod] = useState<string>(() => String(indicator.period || defaultMeta.period || ''));
  const [secondaryPeriod, setSecondaryPeriod] = useState<string>(() => String(indicator.secondaryPeriod || defaultMeta.secondaryPeriod || ''));
  const [tertiaryPeriod, setTertiaryPeriod] = useState<string>(() => String(indicator.tertiaryPeriod || defaultMeta.tertiaryPeriod || ''));
  const [multiplier, setMultiplier] = useState<string>(() => String(indicator.multiplier ?? defaultMeta.multiplier ?? ''));
  const [step, setStep] = useState<string>(() => String(indicator.step ?? defaultMeta.step ?? 0.02));
  const [maxAf, setMaxAf] = useState<string>(() => String(indicator.maxAf ?? defaultMeta.maxAf ?? 0.20));
  const [color, setColor] = useState<string>(indicator.color || defaultMeta.color);
  const [secondaryColor, setSecondaryColor] = useState<string>(indicator.secondaryColor || defaultMeta.secondaryColor);

  useEffect(() => {
    setPeriod(String(indicator.period || defaultMeta.period || ''));
    setSecondaryPeriod(String(indicator.secondaryPeriod || defaultMeta.secondaryPeriod || ''));
    setTertiaryPeriod(String(indicator.tertiaryPeriod || defaultMeta.tertiaryPeriod || ''));
    setMultiplier(String(indicator.multiplier ?? defaultMeta.multiplier ?? ''));
    setStep(String(indicator.step ?? defaultMeta.step ?? 0.02));
    setMaxAf(String(indicator.maxAf ?? defaultMeta.maxAf ?? 0.20));
    setColor(indicator.color || defaultMeta.color);
    setSecondaryColor(indicator.secondaryColor || defaultMeta.secondaryColor);
  }, [indicator, defaultMeta]);

  // Which inputs are relevant for each indicator type
  const hasPeriod = !['PARABOLIC_SAR', 'VWAP', 'OBV', 'CVD'].includes(indicator.type);
  const hasSecondary = ['MACD', 'STOCHASTIC', 'ICHIMOKU', 'EMA_RIBBON'].includes(indicator.type);
  const hasTertiary = ['MACD', 'ICHIMOKU', 'EMA_RIBBON'].includes(indicator.type);
  const hasMultiplier = ['BOLLINGER_BANDS', 'SUPERTREND', 'EMA_RIBBON'].includes(indicator.type);
  const hasSarSettings = indicator.type === 'PARABOLIC_SAR';
  const hasSecondaryColor = ['STOCHASTIC', 'MACD', 'ICHIMOKU', 'BOLLINGER_BANDS', 'SUPERTREND'].includes(indicator.type);

  // Contextual labels
  const periodLabel = (() => {
    switch (indicator.type) {
      case 'MACD': return 'Fast Length';
      case 'STOCHASTIC': return '%K Length';
      case 'ICHIMOKU': return 'Tenkan-sen (Conversion) Length';
      case 'EMA_RIBBON': return 'EMA 1 (Fast Length)';
      case 'PIVOT_POINTS': return 'Lookback Period';
      case 'DONCHIAN': return 'Channel Period';
      case 'SUPERTREND': return 'ATR Length';
      case 'ATR': return 'ATR Period';
      case 'RSI': return 'RSI Length';
      case 'HMA': return 'Hull Period';
      case 'CMF': return 'CMF Period';
      case 'ADX': return 'ADX Period';
      case 'CCI': return 'CCI Period';
      case 'WILLIAMS_R': return '%R Length';
      case 'MFI': return 'MFI Period';
      default: return 'Period / Length';
    }
  })();

  const secondaryPeriodLabel = (() => {
    switch (indicator.type) {
      case 'MACD': return 'Slow Length';
      case 'STOCHASTIC': return '%D Smoothing';
      case 'ICHIMOKU': return 'Kijun-sen (Base) Length';
      case 'EMA_RIBBON': return 'EMA 2 (Medium Length)';
      default: return 'Secondary Period';
    }
  })();

  const tertiaryPeriodLabel = (() => {
    switch (indicator.type) {
      case 'MACD': return 'Signal Smoothing Length';
      case 'ICHIMOKU': return 'Senkou Span B Length';
      case 'EMA_RIBBON': return 'EMA 4 (Baseline Length)';
      default: return 'Signal / Smoothing Length';
    }
  })();

  const multiplierLabel = (() => {
    switch (indicator.type) {
      case 'BOLLINGER_BANDS': return 'StdDev Multiplier';
      case 'SUPERTREND': return 'ATR Factor / Multiplier';
      case 'EMA_RIBBON': return 'EMA 3 (Slow Length)';
      default: return 'Multiplier';
    }
  })();

  const handleReset = () => {
    setPeriod(String(defaultMeta.period || ''));
    setSecondaryPeriod(String(defaultMeta.secondaryPeriod || ''));
    setTertiaryPeriod(String(defaultMeta.tertiaryPeriod || ''));
    setMultiplier(String(defaultMeta.multiplier ?? ''));
    setStep(String(defaultMeta.step ?? 0.02));
    setMaxAf(String(defaultMeta.maxAf ?? 0.20));
    setColor(defaultMeta.color);
    setSecondaryColor(defaultMeta.secondaryColor);
  };

  const handleSave = () => {
    const p = parseInt(period, 10);
    const sp = parseInt(secondaryPeriod, 10);
    const tp = parseInt(tertiaryPeriod, 10);
    const mult = parseFloat(multiplier);
    const s = parseFloat(step);
    const maf = parseFloat(maxAf);

    onSave({
      ...indicator,
      period: Number.isFinite(p) && p > 0 ? p : (defaultMeta.period > 0 ? defaultMeta.period : 14),
      secondaryPeriod: Number.isFinite(sp) && sp > 0 ? sp : defaultMeta.secondaryPeriod,
      tertiaryPeriod: Number.isFinite(tp) && tp > 0 ? tp : defaultMeta.tertiaryPeriod,
      multiplier: Number.isFinite(mult) && mult > 0 ? mult : (defaultMeta.multiplier || 1),
      step: Number.isFinite(s) && s > 0 ? s : 0.02,
      maxAf: Number.isFinite(maf) && maf > 0 ? maf : 0.20,
      color,
      secondaryColor,
    });
    onClose();
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const content = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 dark:bg-black/70 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1726] text-slate-900 dark:text-slate-100 p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="w-3.5 h-3.5 rounded-full shadow-xs shrink-0" style={{ backgroundColor: color }} />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{defaultMeta.label} Settings</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-sm font-bold"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Main Period */}
          {hasPeriod && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                {periodLabel}
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={period}
                placeholder={String(defaultMeta.period || 14)}
                onChange={e => setPeriod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm font-mono font-bold focus:outline-hidden focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition-all shadow-xs"
              />
            </div>
          )}

          {/* Secondary Period */}
          {hasSecondary && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                {secondaryPeriodLabel}
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={secondaryPeriod}
                placeholder={String(defaultMeta.secondaryPeriod || 26)}
                onChange={e => setSecondaryPeriod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm font-mono font-bold focus:outline-hidden focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition-all shadow-xs"
              />
            </div>
          )}

          {/* Tertiary Period */}
          {hasTertiary && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                {tertiaryPeriodLabel}
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={tertiaryPeriod}
                placeholder={String(defaultMeta.tertiaryPeriod || 9)}
                onChange={e => setTertiaryPeriod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm font-mono font-bold focus:outline-hidden focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition-all shadow-xs"
              />
            </div>
          )}

          {/* Multiplier / Slow EMA */}
          {hasMultiplier && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                {multiplierLabel}
              </label>
              <input
                type="number"
                step={indicator.type === 'EMA_RIBBON' ? '1' : '0.1'}
                min={indicator.type === 'EMA_RIBBON' ? '1' : '0.1'}
                max={indicator.type === 'EMA_RIBBON' ? '500' : '20'}
                value={multiplier}
                placeholder={String(defaultMeta.multiplier ?? 2)}
                onChange={e => setMultiplier(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm font-mono font-bold focus:outline-hidden focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition-all shadow-xs"
              />
            </div>
          )}

          {/* Parabolic SAR Settings */}
          {hasSarSettings && (
            <>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Acceleration Step (0.005 - 0.1)
                </label>
                <input
                  type="number"
                  step="0.005"
                  min="0.001"
                  max="0.1"
                  value={step}
                  placeholder="0.02"
                  onChange={e => setStep(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm font-mono font-bold focus:outline-hidden focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition-all shadow-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Max Acceleration Factor (0.05 - 0.5)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="0.5"
                  value={maxAf}
                  placeholder="0.20"
                  onChange={e => setMaxAf(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm font-mono font-bold focus:outline-hidden focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition-all shadow-xs"
                />
              </div>
            </>
          )}

          {/* Primary Line / Dot Color */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              {indicator.type === 'PARABOLIC_SAR' ? 'SAR Dot Color' : 'Line Color'}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer p-0.5 bg-slate-50 dark:bg-slate-800 shadow-xs"
              />
              <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                {color.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Secondary Color Selection */}
          {hasSecondaryColor && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                {indicator.type === 'MACD' ? 'Signal Line Color' : 'Secondary Line / Band Color'}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={e => setSecondaryColor(e.target.value)}
                  className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer p-0.5 bg-slate-50 dark:bg-slate-800 shadow-xs"
                />
                <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                  {secondaryColor.toUpperCase()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            Reset Default
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs transition-colors shadow-xs cursor-pointer"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
