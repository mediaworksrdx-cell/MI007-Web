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
  if (!isOpen) return null;

  const defaultMeta = INDICATOR_DEFAULTS[indicator.type];
  const [period, setPeriod] = useState(indicator.period);
  const [secondaryPeriod, setSecondaryPeriod] = useState(indicator.secondaryPeriod);
  const [tertiaryPeriod, setTertiaryPeriod] = useState(indicator.tertiaryPeriod);
  const [multiplier, setMultiplier] = useState(indicator.multiplier);
  const [color, setColor] = useState(indicator.color);
  const [secondaryColor, setSecondaryColor] = useState(indicator.secondaryColor);

  useEffect(() => {
    setPeriod(indicator.period);
    setSecondaryPeriod(indicator.secondaryPeriod);
    setTertiaryPeriod(indicator.tertiaryPeriod);
    setMultiplier(indicator.multiplier);
    setColor(indicator.color);
    setSecondaryColor(indicator.secondaryColor);
  }, [indicator]);

  const hasSecondary = ['MACD', 'STOCHASTIC', 'ICHIMOKU'].includes(indicator.type);
  const hasTertiary = ['MACD', 'ICHIMOKU'].includes(indicator.type);
  const hasMultiplier = ['BOLLINGER_BANDS', 'SUPERTREND'].includes(indicator.type);
  const hasSecondaryColor = ['STOCHASTIC', 'MACD', 'ICHIMOKU', 'BOLLINGER_BANDS'].includes(indicator.type);

  const handleReset = () => {
    setPeriod(defaultMeta.period);
    setSecondaryPeriod(defaultMeta.secondaryPeriod);
    setTertiaryPeriod(defaultMeta.tertiaryPeriod);
    setMultiplier(defaultMeta.multiplier);
    setColor(defaultMeta.color);
    setSecondaryColor(defaultMeta.secondaryColor);
  };

  const handleSave = () => {
    onSave({
      ...indicator,
      period: Number(period) || defaultMeta.period,
      secondaryPeriod: Number(secondaryPeriod) || defaultMeta.secondaryPeriod,
      tertiaryPeriod: Number(tertiaryPeriod) || defaultMeta.tertiaryPeriod,
      multiplier: Number(multiplier) || defaultMeta.multiplier,
      color,
      secondaryColor,
    });
    onClose();
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!isOpen || !mounted) return null;

  const content = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 dark:bg-black/70 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1726] text-slate-900 dark:text-slate-100 p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
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

        <div className="space-y-4">
          {/* Main Period */}
          {indicator.period > 0 && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                {indicator.type === 'VWAP' ? 'Anchor Interval' : 'Period / Length'}
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={period}
                onChange={e => setPeriod(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm font-mono font-bold focus:outline-hidden focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition-all shadow-xs"
              />
            </div>
          )}

          {/* Secondary Period */}
          {hasSecondary && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                {indicator.type === 'MACD' ? 'Slow Period' : 'Secondary Period'}
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={secondaryPeriod}
                onChange={e => setSecondaryPeriod(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm font-mono font-bold focus:outline-hidden focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition-all shadow-xs"
              />
            </div>
          )}

          {/* Tertiary Period */}
          {hasTertiary && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                {indicator.type === 'MACD' ? 'Signal Smoothing' : 'Displacement / Span B'}
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={tertiaryPeriod}
                onChange={e => setTertiaryPeriod(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm font-mono font-bold focus:outline-hidden focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition-all shadow-xs"
              />
            </div>
          )}

          {/* Multiplier */}
          {hasMultiplier && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Multiplier (Std Dev / ATR factor)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="10"
                value={multiplier}
                onChange={e => setMultiplier(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm font-mono font-bold focus:outline-hidden focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition-all shadow-xs"
              />
            </div>
          )}

          {/* Primary Color Selection */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Line Color
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

        {/* Buttons */}
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
