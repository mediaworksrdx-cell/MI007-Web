'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Timeframe, IndicatorType, INDICATOR_DEFAULTS, OVERLAY_TYPES, PANEL_TYPES } from '@/lib/types';
import type { ChartType } from '@/lib/types';
import { ChartTemplate } from '@/lib/chartTemplates';

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
  { value: 'CANDLESTICK',   label: 'Candlestick', icon: '❚' },
  { value: 'HOLLOW_CANDLE', label: 'Hollow Candle', icon: '▯' },
  { value: 'LINE',          label: 'Line Chart', icon: '∿' },
  { value: 'AREA',          label: 'Area Mountain', icon: '▲' },
  { value: 'HEIKIN_ASHI',   label: 'Heikin-Ashi', icon: 'HA' },
];


const ALL_INDICATOR_TYPES: IndicatorType[] = [
  ...OVERLAY_TYPES,
  ...PANEL_TYPES,
];

interface ChartToolbarProps {
  timeframe: Timeframe;
  chartType: ChartType;
  showVolume: boolean;
  showVolumePanel: boolean;
  showSmcOverlay: boolean;
  showVolumeProfile: boolean;
  activeIndicators: IndicatorType[];
  engineStatus?: string;
  isLiveFromEngine?: boolean;
  currency?: string;
  displayPrice?: number;
  displayChange?: number;
  displayChangePct?: number;
  templates: ChartTemplate[];
  activeTemplateId: string;
  saveStatus?: 'idle' | 'saved';
  onTimeframeChange: (tf: Timeframe) => void;
  onChartTypeChange: (type: ChartType) => void;
  onToggleVolume: () => void;
  onToggleVolumePanel: () => void;
  onToggleSmcOverlay: () => void;
  onToggleVolumeProfile: () => void;
  onToggleIndicator: (type: IndicatorType) => void;
  onOpenIndicatorSettings?: (type: IndicatorType) => void;
  onSelectTemplate: (template: ChartTemplate) => void;
  onSaveToTemplate: (slotId: string) => void;
  onRenameTemplate: (slotId: string, newName: string) => void;
  onRemoveTemplate: (slotId: string) => void;
  onSaveChartLayout: () => void;
  onClearAllIndicators?: () => void;
  onExportSnapshot?: (mode: 'download' | 'clipboard') => void;
}

export function ChartToolbar({
  timeframe,
  chartType,
  showVolume,
  showVolumePanel: _showVolumePanel,
  showSmcOverlay,
  showVolumeProfile,
  activeIndicators,
  engineStatus,
  isLiveFromEngine,
  currency = '₹',
  displayPrice,
  displayChange,
  displayChangePct,
  templates,
  activeTemplateId,
  saveStatus = 'idle',
  onTimeframeChange,
  onChartTypeChange,
  onToggleVolume,
  onToggleVolumePanel: _onToggleVolumePanel,
  onToggleSmcOverlay,
  onToggleVolumeProfile,
  onToggleIndicator,
  onOpenIndicatorSettings,
  onSaveChartLayout,
  onClearAllIndicators,
  onExportSnapshot,
  onSelectTemplate,
}: ChartToolbarProps) {
  const [openMenu, setOpenMenu] = useState<'TF' | 'CANDLES' | 'INDICATORS' | 'TEMPLATES' | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const currentChartType = CHART_TYPES.find((c) => c.value === chartType) || CHART_TYPES[0];
  const activeTemplate = templates.find((t) => t.id === activeTemplateId) || templates[0];
  const isIndicatorActive = (t: IndicatorType) => activeIndicators.includes(t);

  return (
    <div
      ref={toolbarRef}
      className="flex flex-wrap items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B0F19] px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 shadow-xs gap-2 relative z-50 select-none overflow-visible"
    >
      {/* ── Left Controls: Timeframe, Chart Type, Indicators, Drawing, Overlays, Save & Templates ── */}
      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
        {/* 1. Timeframe Simple Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === 'TF' ? null : 'TF')}
            className={`h-7 flex items-center gap-1 px-2.5 rounded-lg border font-bold font-mono text-xs transition-colors cursor-pointer ${
              openMenu === 'TF'
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                : 'border-slate-200 dark:border-slate-700 hover:border-emerald-500/60 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800'
            }`}
          >
            <span>{timeframe}</span>
            <span className="text-[9px] text-slate-400 dark:text-slate-500">▼</span>
          </button>

          {openMenu === 'TF' && (
            <div className="absolute top-full left-0 mt-1 w-36 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B0F19] shadow-xl py-1 z-[100] animate-in fade-in duration-75">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                Timeframe
              </div>
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.value}
                  type="button"
                  onClick={() => {
                    onTimeframeChange(tf.value);
                    setOpenMenu(null);
                  }}
                  className={`flex items-center justify-between w-full px-3 py-1.5 text-left text-xs font-mono font-medium transition-colors cursor-pointer ${
                    timeframe === tf.value
                      ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{tf.label}</span>
                  {timeframe === tf.value && <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 2. Chart Type Simple Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === 'CANDLES' ? null : 'CANDLES')}
            className={`h-7 flex items-center gap-1.5 px-2.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              openMenu === 'CANDLES'
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                : 'border-slate-200 dark:border-slate-700 hover:border-emerald-500/60 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800'
            }`}
          >
            <span className="font-mono text-sm leading-none">{currentChartType.icon}</span>
            <span className="font-bold">{currentChartType.label}</span>
            <span className="text-[9px] text-slate-400 dark:text-slate-500">▼</span>
          </button>

          {openMenu === 'CANDLES' && (
            <div className="absolute top-full left-0 mt-1 w-44 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B0F19] shadow-xl py-1 z-[100] animate-in fade-in duration-75">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                Chart Style
              </div>
              {CHART_TYPES.map((ct) => (
                <button
                  key={ct.value}
                  type="button"
                  onClick={() => {
                    onChartTypeChange(ct.value);
                    setOpenMenu(null);
                  }}
                  className={`flex items-center gap-2.5 w-full px-3 py-1.5 text-left text-xs font-medium transition-colors cursor-pointer ${
                    chartType === ct.value
                      ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="font-mono text-sm w-4 text-center">{ct.icon}</span>
                  <span className="flex-1">{ct.label}</span>
                  {chartType === ct.value && <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

        {/* 3. Indicators Simple Dropdown Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === 'INDICATORS' ? null : 'INDICATORS')}
            className={`h-7 flex items-center gap-1.5 px-2.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              openMenu === 'INDICATORS' || activeIndicators.length > 0
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold'
                : 'border-slate-200 dark:border-slate-700 hover:border-emerald-500/60 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800'
            }`}
          >
            <span className="font-mono font-black text-xs px-1 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">ƒx</span>
            <span>Indicators</span>
            {activeIndicators.length > 0 && (
              <span className="h-4 px-1.5 rounded-full bg-emerald-600 text-white font-mono text-[10px] font-bold flex items-center justify-center">
                {activeIndicators.length}
              </span>
            )}
            <span className="text-[9px] text-slate-400 dark:text-slate-500">▼</span>
          </button>

          {openMenu === 'INDICATORS' && (
            <div className="absolute top-full left-0 mt-1 w-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B0F19] shadow-xl py-1 z-[100] max-h-96 overflow-y-auto animate-in fade-in duration-75">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span>Indicators</span>
                {activeIndicators.length > 0 && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[9px] font-bold">{activeIndicators.length} active</span>
                )}
              </div>

              <div className="py-1">
                {ALL_INDICATOR_TYPES.map((type) => {
                  const meta = INDICATOR_DEFAULTS[type];
                  const active = isIndicatorActive(type);
                  return (
                    <div
                      key={type}
                      className={`flex items-center justify-between px-3 py-1.5 transition-colors cursor-pointer ${
                        active ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      onClick={() => onToggleIndicator(type)}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
                        <span className="text-xs truncate">{meta.label}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {active && onOpenIndicatorSettings && (
                          <button
                            type="button"
                            onClick={() => {
                              onOpenIndicatorSettings(type);
                              setOpenMenu(null);
                            }}
                            title="Configure Settings"
                            className="p-1 rounded text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 text-xs"
                          >
                            ⚙
                          </button>
                        )}
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => onToggleIndicator(type)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {activeIndicators.length > 0 && onClearAllIndicators && (
                <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                  <button
                    type="button"
                    onClick={() => {
                      onClearAllIndicators();
                      setOpenMenu(null);
                    }}
                    className="w-full py-1 text-center font-bold text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/15 rounded transition-colors cursor-pointer"
                  >
                    Clear All Indicators
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />
        
        {/* 4. Optional Clean Overlays (SMC, VOL, VPVR) */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleSmcOverlay}
            title="Toggle Smart Money Concepts"
            className={`h-7 px-2 rounded-md text-[11px] font-bold font-mono border transition-colors cursor-pointer ${
              showSmcOverlay
                ? 'bg-amber-50 dark:bg-amber-500/20 border-amber-400 dark:border-amber-500 text-amber-700 dark:text-amber-400 font-bold'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800'
            }`}
          >
            SMC
          </button>
          <button
            type="button"
            onClick={onToggleVolume}
            title="Toggle Volume Bars"
            className={`h-7 px-2 rounded-md text-[11px] font-bold font-mono border transition-colors cursor-pointer ${
              showVolume
                ? 'bg-emerald-50 dark:bg-emerald-500/20 border-emerald-400 dark:border-emerald-500 text-emerald-700 dark:text-emerald-400 font-bold'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800'
            }`}
          >
            VOL
          </button>
          <button
            type="button"
            onClick={onToggleVolumeProfile}
            title="Toggle Volume Profile Visible Range (VPVR)"
            className={`h-7 px-2 rounded-md text-[11px] font-bold font-mono border transition-colors cursor-pointer ${
              showVolumeProfile
                ? 'bg-blue-50 dark:bg-blue-500/20 border-blue-400 dark:border-blue-500 text-blue-700 dark:text-blue-400 font-bold'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800'
            }`}
          >
            VPVR
          </button>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

        {/* 6. SAVE BUTTON */}
        <button
          type="button"
          onClick={onSaveChartLayout}
          title="Save current chart layout and settings"
          className={`h-7 px-3 rounded-lg border font-bold text-xs font-mono flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
            saveStatus === 'saved'
              ? 'border-emerald-500 bg-emerald-600 text-white font-black'
              : 'border-emerald-300 dark:border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/25'
          }`}
        >
          <span>{saveStatus === 'saved' ? '✓' : '💾'}</span>
          <span>{saveStatus === 'saved' ? 'SAVED' : 'SAVE'}</span>
        </button>

        {/* 7. SNAPSHOT CAMERA TOOL */}
        {onExportSnapshot && (
          <button
            type="button"
            onClick={() => onExportSnapshot('download')}
            title="Download High-Resolution Chart Image"
            className="h-7 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-emerald-500/60 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-slate-800 font-bold text-xs font-mono flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <span className="text-sm leading-none">📷</span>
            <span className="hidden md:inline">SNAPSHOT</span>
          </button>
        )}

        {/* 8. TEMPLATES SIMPLE DROPDOWN */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === 'TEMPLATES' ? null : 'TEMPLATES')}
            className={`h-7 flex items-center gap-1.5 px-2.5 rounded-lg border text-xs font-bold font-mono transition-colors cursor-pointer ${
              openMenu === 'TEMPLATES'
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold'
                : 'border-slate-200 dark:border-slate-700 hover:border-emerald-500/60 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800'
            }`}
          >
            <span>📑</span>
            <span className="max-w-[100px] truncate">{activeTemplate?.name || 'Template'}</span>
            <span className="text-[9px] text-slate-400 dark:text-slate-500">▼</span>
          </button>

          {openMenu === 'TEMPLATES' && (
            <div className="absolute top-full left-0 mt-1 w-52 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B0F19] shadow-xl py-1 z-[100] animate-in fade-in duration-75">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                Chart Templates
              </div>
              {templates.slice(0, 5).map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => {
                    onSelectTemplate(tpl);
                    setOpenMenu(null);
                  }}
                  className={`flex items-center justify-between w-full px-3 py-1.5 text-left text-xs font-medium transition-colors cursor-pointer ${
                    tpl.id === activeTemplateId
                      ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate">{tpl.name}</span>
                  {tpl.id === activeTemplateId && <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Right Controls: Live Beacon & Quote ── */}
      <div className="flex items-center gap-2.5 shrink-0 ml-auto">
        {/* Beacon */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 shadow-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              engineStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <span>{engineStatus === 'connected' ? (isLiveFromEngine ? 'LIVE ENGINE' : 'CONNECTED') : 'RECONNECTING'}</span>
        </div>

        {/* Price Tracker */}
        {displayPrice !== undefined && displayPrice > 0 && (
          <div className="flex items-center gap-2.5 font-mono bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 px-2.5 py-0.5 rounded-lg shadow-xs">
            <span className="text-[16px] font-black text-slate-900 dark:text-white tracking-tight">
              {currency}
              {displayPrice.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            {displayChange !== undefined && displayChangePct !== undefined && (
              <span
                className={`text-[13px] font-extrabold ${
                  displayChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {displayChange >= 0 ? '+' : ''}
                {displayChange.toFixed(2)} ({displayChangePct >= 0 ? '+' : ''}
                {displayChangePct.toFixed(2)}%)
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
