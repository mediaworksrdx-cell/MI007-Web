'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { IndicatorType, INDICATOR_DEFAULTS, OVERLAY_TYPES, PANEL_TYPES } from '@/lib/types';

interface IndicatorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeIndicators: IndicatorType[];
  onToggleIndicator: (type: IndicatorType) => void;
  onOpenSettings: (type: IndicatorType) => void;
  onClearAll: () => void;
}

interface IndicatorMeta {
  type: IndicatorType;
  label: string;
  category: 'TREND' | 'MOMENTUM' | 'VOLUME';
  isOverlay: boolean;
  desc: string;
}

const INDICATORS_LIST: IndicatorMeta[] = [
  // ── Overlays & Trend ──
  { type: 'SMA', label: 'Simple Moving Average (SMA)', category: 'TREND', isOverlay: true, desc: 'Arithmetic average of past closing prices over N periods' },
  { type: 'EMA', label: 'Exponential Moving Average (EMA)', category: 'TREND', isOverlay: true, desc: 'Weighted moving average giving higher priority to recent price action' },
  { type: 'EMA_RIBBON', label: 'EMA Ribbon (20 / 50 / 100 / 200)', category: 'TREND', isOverlay: true, desc: 'Four simultaneous EMAs indicating trend expansion and dynamic support/resistance' },
  { type: 'BOLLINGER_BANDS', label: 'Bollinger Bands (BB)', category: 'TREND', isOverlay: true, desc: 'Standard deviation volatility envelopes surrounding a central 20-SMA baseline' },
  { type: 'VWAP', label: 'Volume Weighted Average Price (VWAP)', category: 'TREND', isOverlay: true, desc: 'Benchmark intraday true price weighted by trading volume per candle' },
  { type: 'SUPERTREND', label: 'Supertrend', category: 'TREND', isOverlay: true, desc: 'Trend-following overlay using ATR bands for directional breakout trailing stops' },
  { type: 'ICHIMOKU', label: 'Ichimoku Cloud (Kinko Hyo)', category: 'TREND', isOverlay: true, desc: 'Comprehensive Japanese equilibrium system (Tenkan, Kijun, Senkou Spans A & B)' },
  { type: 'PARABOLIC_SAR', label: 'Parabolic SAR (Stop & Reverse)', category: 'TREND', isOverlay: true, desc: 'Trailing acceleration stop dots signaling reversal pivot targets' },
  { type: 'PIVOT_POINTS', label: 'Pivot Points (Daily / Swing)', category: 'TREND', isOverlay: true, desc: 'Predictive mathematical support (S1, S2) and resistance (R1, R2) reference levels' },
  { type: 'DONCHIAN', label: 'Donchian Channels', category: 'TREND', isOverlay: true, desc: 'Breakout envelopes plotting highest high and lowest low over N periods' },
  { type: 'HMA', label: 'Hull Moving Average (HMA)', category: 'TREND', isOverlay: true, desc: 'Fast, smooth moving average virtually eliminating lag while preserving smoothing' },

  // ── Momentum & Oscillators ──
  { type: 'RSI', label: 'Relative Strength Index (RSI)', category: 'MOMENTUM', isOverlay: false, desc: 'Momentum oscillator (0-100) measuring velocity and magnitude of price changes' },
  { type: 'MACD', label: 'MACD (Moving Average Convergence Divergence)', category: 'MOMENTUM', isOverlay: false, desc: 'Trend-following momentum indicator showing the relationship between two EMAs' },
  { type: 'STOCHASTIC', label: 'Stochastic Oscillator (%K, %D)', category: 'MOMENTUM', isOverlay: false, desc: 'Compares a particular closing price to a range of its prices over a certain period' },
  { type: 'CCI', label: 'Commodity Channel Index (CCI)', category: 'MOMENTUM', isOverlay: false, desc: 'Measures the variation of an instrument from its statistical mean price' },
  { type: 'WILLIAMS_R', label: 'Williams %R', category: 'MOMENTUM', isOverlay: false, desc: 'Negative scale momentum indicator reflecting overbought and oversold levels' },

  // ── Volatility & Volume Order Flow ──
  { type: 'ATR', label: 'Average True Range (ATR)', category: 'VOLUME', isOverlay: false, desc: 'Volatility metric decomposing the entire range of an asset for the period' },
  { type: 'CVD', label: 'Cumulative Volume Delta (CVD)', category: 'VOLUME', isOverlay: false, desc: 'Aggressive buyer vs seller market delta accumulation over time' },
  { type: 'ADX', label: 'Average Directional Index (ADX / DMI)', category: 'VOLUME', isOverlay: false, desc: 'Quantifies trend strength independent of direction with +DI / -DI lines' },
  { type: 'OBV', label: 'On-Balance Volume (OBV)', category: 'VOLUME', isOverlay: false, desc: 'Cumulative volume momentum relating volume flow to price changes' },
  { type: 'MFI', label: 'Money Flow Index (MFI)', category: 'VOLUME', isOverlay: false, desc: 'Volume-weighted RSI measuring buying and selling pressure' },
  { type: 'CMF', label: 'Chaikin Money Flow (CMF)', category: 'VOLUME', isOverlay: false, desc: 'Volume-weighted accumulation/distribution oscillator over N periods' },
];

export function IndicatorsModal({
  isOpen,
  onClose,
  activeIndicators,
  onToggleIndicator,
  onOpenSettings,
  onClearAll,
}: IndicatorsModalProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'TREND' | 'MOMENTUM' | 'VOLUME'>('ALL');

  const filtered = useMemo(() => {
    return INDICATORS_LIST.filter((ind) => {
      const matchSearch =
        ind.label.toLowerCase().includes(search.toLowerCase()) ||
        ind.desc.toLowerCase().includes(search.toLowerCase()) ||
        ind.type.toLowerCase().includes(search.toLowerCase());
      const matchTab = activeTab === 'ALL' || ind.category === activeTab;
      return matchSearch && matchTab;
    });
  }, [search, activeTab]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!isOpen || !mounted) return null;

  const content = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 dark:bg-black/75 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B0F19] text-slate-800 dark:text-slate-100 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F172A]/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-black font-mono text-sm">
              ƒx
            </span>
            <div>
              <h3 className="font-mono text-base font-black text-slate-800 dark:text-slate-100 tracking-wide uppercase">
                Indicators & Quantitative Overlays
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Institutional overlays, momentum oscillators, and volume profile tools</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xl"
          >
            ×
          </button>
        </div>

        {/* Search Bar & Category Filters */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search indicators by name or keyword (e.g. EMA, RSI, Pivot, Vol)..."
              autoFocus
              className="w-full px-3.5 py-2 pl-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'ALL' ? 'bg-emerald-500 text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              All ({INDICATORS_LIST.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('TREND')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'TREND' ? 'bg-emerald-500 text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Overlays
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('MOMENTUM')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'MOMENTUM' ? 'bg-emerald-500 text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Momentum
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('VOLUME')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'VOLUME' ? 'bg-emerald-500 text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Volume
            </button>
          </div>
        </div>

        {/* Scrollable Indicator List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-mono text-xs">
              No indicators found matching "{search}".
            </div>
          ) : (
            filtered.map((item) => {
              const isActive = activeIndicators.includes(item.type);
              const def = INDICATOR_DEFAULTS[item.type];

              return (
                <div
                  key={item.type}
                  onClick={() => onToggleIndicator(item.type)}
                  className={`flex items-start justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    isActive
                      ? 'border-emerald-500/60 bg-emerald-500/10 dark:bg-emerald-500/15 shadow-xs'
                      : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/40 dark:bg-slate-800/30'
                  }`}
                >
                  {/* Left: Color dot & Descriptions */}
                  <div className="flex items-start gap-3 min-w-0 flex-1 pr-3">
                    <span
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0 mt-0.5 border border-black/10"
                      style={{ backgroundColor: def.color }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-100">
                          {item.label}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-200/60 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300">
                          {item.isOverlay ? 'OVERLAY' : 'SUB-PANEL'}
                        </span>
                        {def.period > 0 && (
                          <span className="text-[10.5px] font-mono text-slate-400">
                            (Period: {def.period})
                          </span>
                        )}
                      </div>
                      <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        {item.desc}
                      </p>
                    </div>
                  </div>

                  {/* Right Actions: Settings Gear & Checkbox Toggle */}
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {isActive && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenSettings(item.type);
                          onClose();
                        }}
                        title="Configure settings (periods, multipliers, colors)"
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        ⚙️
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onToggleIndicator(item.type)}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-emerald-500 text-slate-950 shadow-xs'
                          : 'border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-500'
                      }`}
                    >
                      {isActive ? '✓ Active' : '+ Add'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
          <div className="text-xs font-mono text-slate-500">
            Active on chart: <strong className="text-emerald-600 dark:text-emerald-400">{activeIndicators.length}</strong> indicator{activeIndicators.length === 1 ? '' : 's'}
          </div>
          {activeIndicators.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-rose-600 hover:bg-rose-500/15 transition-colors cursor-pointer"
            >
              Clear All Active
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
