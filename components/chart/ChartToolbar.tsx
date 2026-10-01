'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Timeframe, IndicatorType, INDICATOR_DEFAULTS, OVERLAY_TYPES, PANEL_TYPES } from '@/lib/types';
import type { ChartType } from '@/lib/types';
import { DrawingToolType } from '@/lib/drawingTypes';

const TIMEFRAMES: { value: Timeframe; label: string }[] = [
  { value: '1m',  label: '1m (1 Min)' },
  { value: '5m',  label: '5m (5 Min)' },
  { value: '15m', label: '15m (15 Min)' },
  { value: '30m', label: '30m (30 Min)' },
  { value: '1H',  label: '1H (1 Hour)' },
  { value: '4H',  label: '4H (4 Hours)' },
  { value: '1D',  label: '1D (1 Day)' },
  { value: '1W',  label: '1W (1 Week)' },
  { value: '1M',  label: '1M (1 Month)' },
];

const CHART_TYPES: { value: ChartType; label: string; icon: string }[] = [
  { value: 'CANDLESTICK',   label: 'Candlestick', icon: '🕯️' },
  { value: 'HOLLOW_CANDLE', label: 'Hollow Candle', icon: '▯' },
  { value: 'LINE',          label: 'Line Chart', icon: '📈' },
  { value: 'AREA',          label: 'Area Mountain', icon: '🏔️' },
  { value: 'HEIKIN_ASHI',   label: 'Heikin-Ashi', icon: '⚖️' },
];

const DRAWING_TOOLS: { value: DrawingToolType; label: string; icon: string }[] = [
  { value: 'NONE',       label: 'Cursor / Pan Mode', icon: '↖' },
  { value: 'TRENDLINE',  label: 'Trendline (2 clicks)', icon: '╱' },
  { value: 'HORIZONTAL', label: 'Horizontal Ray (1 click)', icon: '―' },
  { value: 'RECTANGLE',  label: 'Support/Resistance Box', icon: '▭' },
  { value: 'FIBONACCI',  label: 'Fibonacci Retracement', icon: '≡' },
];

interface ChartToolbarProps {
  timeframe: Timeframe;
  chartType: ChartType;
  activeDrawingTool: DrawingToolType;
  showVolume: boolean;
  showVolumePanel: boolean;
  showSmcOverlay: boolean;
  showVolumeProfile: boolean;
  showFnoOverlay?: boolean;
  activeIndicators: IndicatorType[];
  engineStatus?: string;
  isLiveFromEngine?: boolean;
  currency?: string;
  displayPrice?: number;
  displayChange?: number;
  displayChangePct?: number;
  onTimeframeChange: (tf: Timeframe) => void;
  onChartTypeChange: (type: ChartType) => void;
  onDrawingToolChange: (tool: DrawingToolType) => void;
  onClearDrawings: () => void;
  onUndoDrawing?: () => void;
  onToggleVolume: () => void;
  onToggleVolumePanel: () => void;
  onToggleSmcOverlay: () => void;
  onToggleVolumeProfile: () => void;
  onToggleFnoOverlay?: () => void;
  onToggleIndicator: (type: IndicatorType) => void;
  onOpenIndicatorSettings?: (type: IndicatorType) => void;
}

export function ChartToolbar({
  timeframe, chartType, activeDrawingTool,
  showVolume, showVolumePanel, showSmcOverlay, showVolumeProfile, showFnoOverlay = false,
  activeIndicators,
  engineStatus, isLiveFromEngine, currency = '₹', displayPrice, displayChange, displayChangePct,
  onTimeframeChange, onChartTypeChange, onDrawingToolChange, onClearDrawings, onUndoDrawing,
  onToggleVolume, onToggleVolumePanel, onToggleSmcOverlay, onToggleVolumeProfile, onToggleFnoOverlay,
  onToggleIndicator, onOpenIndicatorSettings,
}: ChartToolbarProps) {
  const [openMenu, setOpenMenu] = useState<'TF' | 'CANDLES' | 'INDICATORS' | 'DRAWING' | null>(null);
  const [indicatorSearch, setIndicatorSearch] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentChartTypeMeta = CHART_TYPES.find(c => c.value === chartType) || CHART_TYPES[0];
  const currentDrawingMeta = DRAWING_TOOLS.find(d => d.value === activeDrawingTool) || DRAWING_TOOLS[0];
  const isActiveInd = (t: IndicatorType) => activeIndicators.includes(t);

  const filteredOverlays = OVERLAY_TYPES.filter(t =>
    INDICATOR_DEFAULTS[t].label.toLowerCase().includes(indicatorSearch.toLowerCase())
  );
  const filteredPanels = PANEL_TYPES.filter(t =>
    INDICATOR_DEFAULTS[t].label.toLowerCase().includes(indicatorSearch.toLowerCase())
  );

  return (
    <div
      ref={menuRef}
      className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2 text-slate-800 text-xs shadow-xs relative z-30"
    >
      {/* ── Left Controls: Clean Dropdowns ── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* 1. Timeframe Dropdown */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'TF' ? null : 'TF')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-mono font-bold transition-all ${
              openMenu === 'TF'
                ? 'border-emerald-600 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-800'
            }`}
          >
            <span>⏱️</span>
            <span>{timeframe}</span>
            <span className="text-[10px] text-slate-400">▼</span>
          </button>

          {openMenu === 'TF' && (
            <div className="absolute top-full left-0 mt-1.5 w-36 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">Timeframe</div>
              {TIMEFRAMES.map(tf => (
                <button
                  key={tf.value}
                  onClick={() => {
                    onTimeframeChange(tf.value);
                    setOpenMenu(null);
                  }}
                  className={`flex items-center justify-between w-full px-2 py-1.5 rounded-lg text-left font-mono font-semibold transition-colors ${
                    timeframe === tf.value
                      ? 'bg-emerald-50 text-emerald-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{tf.value}</span>
                  {timeframe === tf.value && <span className="text-emerald-600 text-xs">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 2. Candles / Chart Type Dropdown */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'CANDLES' ? null : 'CANDLES')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-medium transition-all ${
              openMenu === 'CANDLES'
                ? 'border-emerald-600 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-800'
            }`}
          >
            <span>{currentChartTypeMeta.icon}</span>
            <span className="font-bold">{currentChartTypeMeta.label}</span>
            <span className="text-[10px] text-slate-400">▼</span>
          </button>

          {openMenu === 'CANDLES' && (
            <div className="absolute top-full left-0 mt-1.5 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">Chart Style</div>
              {CHART_TYPES.map(ct => (
                <button
                  key={ct.value}
                  onClick={() => {
                    onChartTypeChange(ct.value);
                    setOpenMenu(null);
                  }}
                  className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-left font-medium transition-colors ${
                    chartType === ct.value
                      ? 'bg-emerald-50 text-emerald-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{ct.icon}</span>
                  <span className="flex-1">{ct.label}</span>
                  {chartType === ct.value && <span className="text-emerald-600 text-xs">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-slate-200 mx-0.5" />

        {/* 3. Indicators Dropdown & Modal Menu */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'INDICATORS' ? null : 'INDICATORS')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-medium transition-all ${
              openMenu === 'INDICATORS' || activeIndicators.length > 0
                ? 'border-emerald-600 bg-emerald-50/70 text-emerald-800'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-800'
            }`}
          >
            <span>📈</span>
            <span className="font-bold">Indicators</span>
            {activeIndicators.length > 0 && (
              <span className="h-4 px-1.5 rounded-full bg-emerald-600 text-white font-mono text-[10px] font-bold flex items-center justify-center">
                {activeIndicators.length}
              </span>
            )}
            <span className="text-[10px] text-slate-400">▼</span>
          </button>

          {openMenu === 'INDICATORS' && (
            <div className="absolute top-full left-0 mt-1.5 w-72 rounded-xl border border-slate-200 bg-white shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100 max-h-96 flex flex-col overflow-hidden">
              {/* Search */}
              <div className="p-2 border-b border-slate-100 bg-slate-50">
                <input
                  type="text"
                  placeholder="Search indicators..."
                  value={indicatorSearch}
                  onChange={e => setIndicatorSearch(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-600"
                />
              </div>

              {/* Scrollable list */}
              <div className="overflow-y-auto p-2 space-y-3">
                {/* Overlays */}
                {filteredOverlays.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-0.5">
                      Main Chart Overlays
                    </div>
                    <div className="space-y-0.5">
                      {filteredOverlays.map(t => {
                        const active = isActiveInd(t);
                        return (
                          <div
                            key={t}
                            className={`flex items-center justify-between px-2 py-1 rounded-lg transition-colors ${
                              active ? 'bg-emerald-50/80 text-emerald-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <button
                              onClick={() => onToggleIndicator(t)}
                              className="flex items-center gap-2 flex-1 text-left"
                            >
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: INDICATOR_DEFAULTS[t].color }}
                              />
                              <span className="text-xs">{INDICATOR_DEFAULTS[t].label}</span>
                            </button>
                            <div className="flex items-center gap-1">
                              {active && onOpenIndicatorSettings && (
                                <button
                                  onClick={() => {
                                    onOpenIndicatorSettings(t);
                                    setOpenMenu(null);
                                  }}
                                  title="Settings"
                                  className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
                                >
                                  ⚙️
                                </button>
                              )}
                              <input
                                type="checkbox"
                                checked={active}
                                onChange={() => onToggleIndicator(t)}
                                className="rounded text-emerald-600 focus:ring-emerald-600 cursor-pointer"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Panels */}
                {filteredPanels.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-0.5">
                      Sub-Chart Panels
                    </div>
                    <div className="space-y-0.5">
                      {filteredPanels.map(t => {
                        const active = isActiveInd(t);
                        return (
                          <div
                            key={t}
                            className={`flex items-center justify-between px-2 py-1 rounded-lg transition-colors ${
                              active ? 'bg-emerald-50/80 text-emerald-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <button
                              onClick={() => onToggleIndicator(t)}
                              className="flex items-center gap-2 flex-1 text-left"
                            >
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: INDICATOR_DEFAULTS[t].color }}
                              />
                              <span className="text-xs">{INDICATOR_DEFAULTS[t].label}</span>
                            </button>
                            <div className="flex items-center gap-1">
                              {active && onOpenIndicatorSettings && (
                                <button
                                  onClick={() => {
                                    onOpenIndicatorSettings(t);
                                    setOpenMenu(null);
                                  }}
                                  title="Settings"
                                  className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
                                >
                                  ⚙️
                                </button>
                              )}
                              <input
                                type="checkbox"
                                checked={active}
                                onChange={() => onToggleIndicator(t)}
                                className="rounded text-emerald-600 focus:ring-emerald-600 cursor-pointer"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 4. Drawing Tools Dropdown */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'DRAWING' ? null : 'DRAWING')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-medium transition-all ${
              activeDrawingTool !== 'NONE'
                ? 'border-blue-600 bg-blue-50 text-blue-800 ring-1 ring-blue-600'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-800'
            }`}
          >
            <span>✏️</span>
            <span className="font-bold">{activeDrawingTool !== 'NONE' ? currentDrawingMeta.label : 'Drawing'}</span>
            <span className="text-[10px] text-slate-400">▼</span>
          </button>

          {openMenu === 'DRAWING' && (
            <div className="absolute top-full left-0 mt-1.5 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">Draw Tools</div>
              {DRAWING_TOOLS.map(dt => (
                <button
                  key={dt.value}
                  onClick={() => {
                    onDrawingToolChange(dt.value);
                    setOpenMenu(null);
                  }}
                  className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-left font-medium transition-colors ${
                    activeDrawingTool === dt.value
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="font-mono">{dt.icon}</span>
                  <span className="flex-1 text-xs">{dt.label}</span>
                  {activeDrawingTool === dt.value && <span className="text-blue-600 text-xs">✓</span>}
                </button>
              ))}

              <div className="my-1 border-t border-slate-100" />
              {onUndoDrawing && (
                <button
                  onClick={() => {
                    onUndoDrawing();
                    setOpenMenu(null);
                  }}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <span>↩️</span>
                  <span>Undo Last (Ctrl+Z)</span>
                </button>
              )}
              <button
                onClick={() => {
                  onClearDrawings();
                  setOpenMenu(null);
                }}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-left text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <span>🗑️</span>
                <span>Clear All Drawings</span>
              </button>
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-slate-200 mx-0.5" />

        {/* 5. Feature Badges (SMC, VOL, VPVR) */}
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleSmcOverlay}
            className={`px-2 py-1 rounded-md text-[11px] font-bold mono border transition-colors ${
              showSmcOverlay
                ? 'bg-amber-50 border-amber-300 text-amber-800'
                : 'border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            SMC
          </button>
          <button
            onClick={onToggleVolume}
            className={`px-2 py-1 rounded-md text-[11px] font-bold mono border transition-colors ${
              showVolume
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            VOL
          </button>
          <button
            onClick={onToggleVolumeProfile}
            className={`px-2 py-1 rounded-md text-[11px] font-bold mono border transition-colors ${
              showVolumeProfile
                ? 'bg-blue-50 border-blue-300 text-blue-800'
                : 'border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            VPVR
          </button>
          {onToggleFnoOverlay && (
            <button
              onClick={onToggleFnoOverlay}
              title="Toggle Institutional Options Dealer Walls (CW, PW, γ-Flip, Max Pain)"
              className={`px-2 py-1 rounded-md text-[11px] font-bold mono border transition-colors ${
                showFnoOverlay
                  ? 'bg-purple-50 border-purple-300 text-purple-800'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              F&O
            </button>
          )}
        </div>
      </div>

      {/* ── Right Controls: Live Beacon & Quote (Saves vertical space!) ── */}
      <div className="flex items-center gap-3">
        {/* Beacon */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-slate-200 bg-slate-50 text-[11px] font-mono font-bold text-slate-700">
          <span
            className={`w-2 h-2 rounded-full ${
              engineStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <span>{engineStatus === 'connected' ? (isLiveFromEngine ? 'LIVE ENGINE' : 'CONNECTED') : 'RECONNECTING'}</span>
        </div>

        {/* Price Tracker */}
        {displayPrice !== undefined && displayPrice > 0 && (
          <div className="flex items-center gap-2 font-mono">
            <span className="text-[14px] font-black text-slate-900">
              {currency}
              {displayPrice.toLocaleString(undefined, {
                minimumFractionDigits: displayPrice < 10 ? 2 : 2,
                maximumFractionDigits: 2,
              })}
            </span>
            {displayChange !== undefined && displayChangePct !== undefined && (
              <span
                className={`text-[12px] font-bold ${
                  displayChange >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {displayChange >= 0 ? '+' : ''}
                {displayChange.toFixed(2)} ({displayChange >= 0 ? '+' : ''}
                {displayChangePct.toFixed(2)}%)
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
