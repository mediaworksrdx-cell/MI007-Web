'use client';

import React, { useState } from 'react';
import { IndicatorConfig, IndicatorType, INDICATOR_DEFAULTS } from '@/lib/types';

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

  const hasSecondary = ['MACD', 'STOCHASTIC', 'ICHIMOKU'].includes(indicator.type);
  const hasTertiary = ['MACD', 'ICHIMOKU'].includes(indicator.type);
  const hasMultiplier = ['BOLLINGER_BANDS', 'SUPERTREND'].includes(indicator.type);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <h3 className="text-base font-bold text-slate-900">{defaultMeta.label} Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Main Period */}
          {indicator.period > 0 && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                {indicator.type === 'VWAP' ? 'Anchor Interval' : 'Period / Length'}
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={period}
                onChange={e => setPeriod(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-mono font-semibold text-slate-800 focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          )}

          {/* Secondary Period */}
          {hasSecondary && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                {indicator.type === 'MACD' ? 'Slow Period' : 'Secondary Period'}
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={secondaryPeriod}
                onChange={e => setSecondaryPeriod(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-mono font-semibold text-slate-800 focus:outline-hidden focus:border-emerald-600"
              />
            </div>
          )}

          {/* Tertiary Period */}
          {hasTertiary && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                {indicator.type === 'MACD' ? 'Signal Smoothing' : 'Displacement / Span B'}
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={tertiaryPeriod}
                onChange={e => setTertiaryPeriod(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-mono font-semibold text-slate-800 focus:outline-hidden focus:border-emerald-600"
              />
            </div>
          )}

          {/* Multiplier */}
          {hasMultiplier && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Multiplier (Std Dev / ATR factor)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="10"
                value={multiplier}
                onChange={e => setMultiplier(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-mono font-semibold text-slate-800 focus:outline-hidden focus:border-emerald-600"
              />
            </div>
          )}

          {/* Color Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Line Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5"
              />
              <span className="font-mono text-xs text-slate-600 font-bold">{color.toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between mt-6 pt-3 border-t border-slate-100">
          <button
            onClick={handleReset}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
          >
            Reset Default
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
