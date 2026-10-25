'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Timeframe, IndicatorType, IndicatorConfig, INDICATOR_DEFAULTS, OVERLAY_TYPES, PANEL_TYPES } from '@/lib/types';
import type { ChartType } from '@/lib/types';
import { ChartTemplate } from '@/lib/chartTemplates';
import { SmcConfig, DEFAULT_SMC_CONFIG } from '@/lib/smcEngine';

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
  smcConfig?: SmcConfig;
  showVolumeProfile: boolean;
  activeIndicators: IndicatorType[];
  indicators?: IndicatorConfig[];
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
  onSmcConfigChange?: (config: SmcConfig) => void;
  onToggleVolumeProfile: () => void;
  onToggleIndicator: (type: IndicatorType) => void;
  onAddIndicator?: (type: IndicatorType) => void;
  onRemoveIndicator?: (idOrType: string) => void;
  onToggleIndicatorVisibility?: (idOrType: string) => void;
  onOpenIndicatorSettings?: (idOrType: string) => void;
  onSelectTemplate: (template: ChartTemplate) => void;
  onSaveToTemplate: (slotId: string) => void;
  onRenameTemplate: (slotId: string, newName: string) => void;
  onRemoveTemplate: (slotId: string) => void;
  onSaveChartLayout: () => void;
  onClearAllIndicators?: () => void;
  onExportSnapshot?: (mode: 'download' | 'clipboard') => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

function SmcToggleRow({
  label,
  sublabel,
  checked,
  onChange,
  badge,
  badgeColor,
  accent = 'amber',
}: {
  label: string;
  sublabel?: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  badge?: string;
  badgeColor?: string;
  accent?: 'amber' | 'emerald' | 'rose' | 'teal' | 'indigo' | 'purple' | 'blue';
}) {
  const getToggleColor = () => {
    if (!checked) return 'bg-slate-300 dark:bg-slate-700';
    switch (accent) {
      case 'emerald':
        return 'bg-emerald-500';
      case 'rose':
        return 'bg-rose-500';
      case 'teal':
        return 'bg-teal-500';
      case 'blue':
        return 'bg-blue-500';
      case 'purple':
        return 'bg-purple-500';
      case 'indigo':
        return 'bg-indigo-500';
      case 'amber':
      default:
        return 'bg-amber-500';
    }
  };

  return (
    <div className="flex items-center justify-between py-1 px-1.5 rounded-lg hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
      <div className="min-w-0 pr-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-[11.5px] text-slate-800 dark:text-slate-200">{label}</span>
          {badge && (
            <span
              className={`text-[9px] font-mono font-bold px-1 rounded border ${
                badgeColor ||
                'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700'
              }`}
            >
              {badge}
            </span>
          )}
        </div>
        {sublabel && <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{sublabel}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-7 h-4 rounded-full transition-colors relative cursor-pointer shrink-0 ${getToggleColor()}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-3' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

export function ChartToolbar({
  timeframe,
  chartType,
  showVolume,
  showVolumePanel: _showVolumePanel,
  showSmcOverlay,
  smcConfig,
  showVolumeProfile,
  activeIndicators,
  indicators,
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
  onSmcConfigChange,
  onToggleVolumeProfile,
  onToggleIndicator,
  onAddIndicator,
  onRemoveIndicator,
  onToggleIndicatorVisibility,
  onOpenIndicatorSettings,
  onSaveChartLayout,
  onClearAllIndicators,
  onExportSnapshot,
  onSelectTemplate,
  isFullscreen,
  onToggleFullscreen,
}: ChartToolbarProps) {
  const [openMenu, setOpenMenu] = useState<'TF' | 'CANDLES' | 'INDICATORS' | 'TEMPLATES' | 'SMC' | null>(null);
  const [indicatorSearch, setIndicatorSearch] = useState('');
  const [recentlyAddedType, setRecentlyAddedType] = useState<string | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const activeSmcConfig: SmcConfig = smcConfig || {
    ...DEFAULT_SMC_CONFIG,
    enabled: showSmcOverlay,
  };

  const handleUpdateSmc = (partial: Partial<SmcConfig>) => {
    const updated: SmcConfig = { ...activeSmcConfig, ...partial };
    if (onSmcConfigChange) {
      onSmcConfigChange(updated);
    } else {
      if (partial.enabled !== undefined && partial.enabled !== showSmcOverlay) {
        onToggleSmcOverlay();
      }
    }
  };

  const handleSetPreset = (preset: 'all' | 'bullish' | 'bearish' | 'structure' | 'zones' | 'reset') => {
    if (preset === 'all') {
      handleUpdateSmc({
        enabled: true,
        showBullishSetups: true,
        showBearishSetups: true,
        showBos: true,
        showChoch: true,
        showBullishStructure: true,
        showBearishStructure: true,
        showSwings: true,
        showSweeps: true,
        showSslSweeps: true,
        showBslSweeps: true,
        showEqualHighLow: true,
        showLiquidityLevels: true,
        showBullishOb: true,
        showBearishOb: true,
        showBreakers: true,
        showBullishBreakers: true,
        showBearishBreakers: true,
        showMitigatedOb: false,
        showBullishFvg: true,
        showBearishFvg: true,
        showBullishIfvg: false,
        showBearishIfvg: false,
        showFvgMidpoint: true,
        showMitigatedFvg: false,
        showBullishConfluence: true,
        showBearishConfluence: true,
        showPremiumDiscount: true,
        showEquilibrium: true,
        showOte: true,
        showPdhPdl: true,
      });
    } else if (preset === 'bullish') {
      handleUpdateSmc({
        enabled: true,
        showBullishSetups: true,
        showBearishSetups: false,
        showBos: true,
        showChoch: true,
        showBullishStructure: true,
        showBearishStructure: false,
        showSwings: true,
        showSweeps: true,
        showSslSweeps: true,
        showBslSweeps: false,
        showEqualHighLow: true,
        showLiquidityLevels: true,
        showBullishOb: true,
        showBearishOb: false,
        showBreakers: true,
        showBullishBreakers: true,
        showBearishBreakers: false,
        showMitigatedOb: false,
        showBullishFvg: true,
        showBearishFvg: false,
        showBullishIfvg: false,
        showBearishIfvg: false,
        showFvgMidpoint: true,
        showMitigatedFvg: false,
        showBullishConfluence: true,
        showBearishConfluence: false,
        showPremiumDiscount: true,
        showEquilibrium: true,
        showOte: true,
        showPdhPdl: true,
      });
    } else if (preset === 'bearish') {
      handleUpdateSmc({
        enabled: true,
        showBullishSetups: false,
        showBearishSetups: true,
        showBos: true,
        showChoch: true,
        showBullishStructure: false,
        showBearishStructure: true,
        showSwings: true,
        showSweeps: true,
        showSslSweeps: false,
        showBslSweeps: true,
        showEqualHighLow: true,
        showLiquidityLevels: true,
        showBullishOb: false,
        showBearishOb: true,
        showBreakers: true,
        showBullishBreakers: false,
        showBearishBreakers: true,
        showMitigatedOb: false,
        showBullishFvg: false,
        showBearishFvg: true,
        showBullishIfvg: false,
        showBearishIfvg: false,
        showFvgMidpoint: true,
        showMitigatedFvg: false,
        showBullishConfluence: false,
        showBearishConfluence: true,
        showPremiumDiscount: true,
        showEquilibrium: true,
        showOte: true,
        showPdhPdl: true,
      });
    } else if (preset === 'structure') {
      handleUpdateSmc({
        enabled: true,
        showBos: true,
        showChoch: true,
        showBullishStructure: true,
        showBearishStructure: true,
        showSwings: true,
        showSweeps: true,
        showSslSweeps: true,
        showBslSweeps: true,
        showEqualHighLow: true,
        showLiquidityLevels: true,
        showBullishOb: false,
        showBearishOb: false,
        showBreakers: false,
        showBullishBreakers: false,
        showBearishBreakers: false,
        showBullishFvg: false,
        showBearishFvg: false,
        showBullishIfvg: false,
        showBearishIfvg: false,
        showFvgMidpoint: false,
        showPremiumDiscount: true,
        showEquilibrium: true,
      });
    } else if (preset === 'zones') {
      handleUpdateSmc({
        enabled: true,
        showBos: false,
        showChoch: false,
        showBullishStructure: false,
        showBearishStructure: false,
        showSwings: false,
        showSweeps: false,
        showSslSweeps: false,
        showBslSweeps: false,
        showEqualHighLow: false,
        showLiquidityLevels: false,
        showBullishOb: true,
        showBearishOb: true,
        showBreakers: true,
        showBullishBreakers: true,
        showBearishBreakers: true,
        showBullishFvg: true,
        showBearishFvg: true,
        showBullishIfvg: false,
        showBearishIfvg: false,
        showFvgMidpoint: true,
        showPremiumDiscount: true,
        showEquilibrium: true,
      });
    } else if (preset === 'reset') {
      handleUpdateSmc({ ...DEFAULT_SMC_CONFIG, enabled: true });
    }
  };

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

        {/* 3. TradingView-Standard Multi-Instance Indicators Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === 'INDICATORS' ? null : 'INDICATORS')}
            className={`h-7 flex items-center gap-1.5 px-2.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              openMenu === 'INDICATORS' || (indicators ? indicators.length > 0 : activeIndicators.length > 0)
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold'
                : 'border-slate-200 dark:border-slate-700 hover:border-emerald-500/60 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800'
            }`}
          >
            <span className="font-mono font-black text-xs px-1 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">ƒx</span>
            <span>Indicators</span>
            {((indicators && indicators.length > 0) || activeIndicators.length > 0) && (
              <span className="h-4 px-1.5 rounded-full bg-emerald-600 text-white font-mono text-[10px] font-bold flex items-center justify-center">
                {indicators ? indicators.length : activeIndicators.length}
              </span>
            )}
            <span className="text-[9px] text-slate-400 dark:text-slate-500">▼</span>
          </button>

          {openMenu === 'INDICATORS' && (
            <div
              className="absolute top-full left-0 mt-1 w-80 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B0F19] shadow-2xl z-[100] max-h-[480px] flex flex-col animate-in fade-in duration-75 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with Close (×) Icon */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-black text-[11px] px-1 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">ƒx</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Indicators & Strategies</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenu(null);
                  }}
                  title="Close Indicators menu"
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Search Bar */}
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div className="relative">
                  <input
                    type="text"
                    value={indicatorSearch}
                    onChange={(e) => setIndicatorSearch(e.target.value)}
                    placeholder="Search indicators (e.g. EMA, RSI)..."
                    className="w-full pl-7 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500"
                  />
                  <span className="absolute left-2 top-2 text-slate-400 text-xs">🔍</span>
                  {indicatorSearch && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIndicatorSearch('');
                      }}
                      title="Clear search"
                      className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Active Indicators on Chart (with Eye, Settings, Delete) */}
              {indicators && indicators.length > 0 && (
                <div className="px-3 py-2 bg-slate-50/80 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 shrink-0">
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Active on Chart</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[9px] font-bold">{indicators.length}</span>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                    {indicators.map((cfg, idx) => {
                      const id = cfg.id || cfg.type;
                      return (
                        <div
                          key={`${id}-${idx}`}
                          className="flex items-center justify-between px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                            <span className={`font-mono text-xs truncate ${cfg.enabled !== false ? 'font-bold text-slate-800 dark:text-slate-100' : 'text-slate-400 line-through'}`}>
                              {INDICATOR_DEFAULTS[cfg.type]?.label || cfg.type} ({cfg.period})
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleIndicatorVisibility?.(id);
                              }}
                              title={cfg.enabled !== false ? "Hide Indicator" : "Show Indicator"}
                              className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 text-[10px] cursor-pointer"
                            >
                              {cfg.enabled !== false ? '👁' : '👁‍🗨'}
                            </button>
                            <button
                              type="button"
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenIndicatorSettings?.(id);
                                setOpenMenu(null);
                              }}
                              title="Configure Settings"
                              className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 text-[10px] cursor-pointer"
                            >
                              ⚙
                            </button>
                            <button
                              type="button"
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveIndicator?.(id);
                              }}
                              title="Remove indicator from chart"
                              className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/15 font-bold text-xs cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Indicators Library (Click to Add multiple times) */}
              <div className="flex-1 overflow-y-auto py-1">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Indicators Library</span>
                  <span className="text-[9px] text-slate-400">Click + to add again & again</span>
                </div>
                {ALL_INDICATOR_TYPES.filter(type => {
                  if (!indicatorSearch.trim()) return true;
                  const query = indicatorSearch.toLowerCase();
                  const meta = INDICATOR_DEFAULTS[type];
                  return meta.label.toLowerCase().includes(query) || type.toLowerCase().includes(query);
                }).map((type) => {
                  const meta = INDICATOR_DEFAULTS[type];
                  const count = indicators ? indicators.filter(c => c.type === type).length : (isIndicatorActive(type) ? 1 : 0);
                  const isJustAdded = recentlyAddedType === type;

                  const handleAdd = () => {
                    if (onAddIndicator) {
                      onAddIndicator(type);
                    } else {
                      onToggleIndicator(type);
                    }
                    setRecentlyAddedType(type);
                    setTimeout(() => setRecentlyAddedType(null), 1000);
                  };

                  return (
                    <div
                      key={type}
                      className="flex items-center justify-between px-3 py-1.5 transition-colors cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 group"
                      onClick={handleAdd}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
                        <span className="text-xs font-medium truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {meta.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {count > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                            {count} active
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={handleAdd}
                          title={`Add ${meta.label} (can add again and again for multiple periods)`}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
                            isJustAdded
                              ? 'bg-emerald-600 text-white scale-105 shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {isJustAdded ? '✓ Added' : '+ Add'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {((indicators && indicators.length > 0) || activeIndicators.length > 0) && onClearAllIndicators && (
                <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shrink-0">
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

        {/* 4. SMC Analysis Dropdown (Dedicated Smart Money Concepts Mode) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === 'SMC' ? null : 'SMC')}
            title="Smart Money Concepts (SMC) Analysis Mode"
            className={`h-7 flex items-center gap-1.5 px-2.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              openMenu === 'SMC' || activeSmcConfig.enabled
                ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold'
                : 'border-slate-200 dark:border-slate-700 hover:border-amber-500/60 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800'
            }`}
          >
            <span className="font-mono font-black text-[10px] px-1 rounded bg-amber-100 dark:bg-amber-500/30 text-amber-800 dark:text-amber-300">
              SMC
            </span>
            <span className="font-bold">SMC Analysis</span>
            {activeSmcConfig.enabled && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            )}
            <span className="text-[9px] text-slate-400 dark:text-slate-500">▼</span>
          </button>

          {openMenu === 'SMC' && (
            <div
              className="absolute top-full left-0 mt-1 w-96 sm:w-[420px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B0F19] shadow-2xl z-[100] max-h-[580px] flex flex-col animate-in fade-in duration-75 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-[11px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    SMC
                  </span>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Smart Money Concepts</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Institutional Order Flow & Structure</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenMenu(null)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Master Toggle */}
              <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-amber-50/50 dark:bg-amber-500/5 flex items-center justify-between shrink-0">
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100">Enable SMC Overlays</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Master switch for all institutional zones</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleUpdateSmc({ enabled: !activeSmcConfig.enabled })}
                  className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer ${
                    activeSmcConfig.enabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white transition-transform ${
                      activeSmcConfig.enabled ? 'translate-x-4.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Presets Bar */}
              <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center gap-1.5 overflow-x-auto shrink-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Presets:</span>
                <button
                  type="button"
                  onClick={() => handleSetPreset('all')}
                  className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-200/70 dark:bg-slate-800 hover:bg-amber-500/20 hover:text-amber-500 text-slate-700 dark:text-slate-300 cursor-pointer transition-colors"
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPreset('bullish')}
                  className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 cursor-pointer transition-colors"
                >
                  ▲ Bullish
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPreset('bearish')}
                  className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 cursor-pointer transition-colors"
                >
                  ▼ Bearish
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPreset('structure')}
                  className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-200/70 dark:bg-slate-800 hover:bg-amber-500/20 hover:text-amber-500 text-slate-700 dark:text-slate-300 cursor-pointer transition-colors"
                >
                  Structure
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPreset('zones')}
                  className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-200/70 dark:bg-slate-800 hover:bg-amber-500/20 hover:text-amber-500 text-slate-700 dark:text-slate-300 cursor-pointer transition-colors"
                >
                  OB & FVG
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPreset('reset')}
                  className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-200/70 dark:bg-slate-800 hover:bg-rose-500/20 hover:text-rose-500 text-slate-700 dark:text-slate-300 cursor-pointer transition-colors"
                >
                  Reset
                </button>
              </div>

              {/* Toggles Container */}
              <div className={`flex-1 overflow-y-auto px-3 py-2 space-y-3.5 text-xs ${!activeSmcConfig.enabled ? 'opacity-40 pointer-events-none' : ''}`}>
                {/* ── SMC Setup Direction (Master Controls) ── */}
                <div className="p-2.5 rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-slate-100/60 dark:bg-slate-900/60 space-y-2">
                  <div className="flex items-center justify-between px-0.5">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span>🎯</span>
                      <span>SMC Setup Direction (Master Controls)</span>
                    </div>
                    <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500">Filters all signals & zones</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Bullish Setup Master Card */}
                    <div className={`p-2 rounded-lg border transition-all ${
                      activeSmcConfig.showBullishSetups !== false
                        ? 'bg-emerald-500/8 border-emerald-500/40 dark:bg-emerald-950/25 dark:border-emerald-500/35'
                        : 'bg-slate-100/50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 opacity-60'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                          <span className="font-bold text-[11px] text-emerald-700 dark:text-emerald-400">Bullish Setup</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUpdateSmc({ showBullishSetups: activeSmcConfig.showBullishSetups === false ? true : false })}
                          className={`w-7 h-4 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                            activeSmcConfig.showBullishSetups !== false ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                          title="Toggle all Bullish / Long setups"
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                              activeSmcConfig.showBullishSetups !== false ? 'translate-x-3' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                      <div className="text-[9.5px] text-slate-500 dark:text-slate-400 leading-tight mb-1.5">
                        Demand zones & long-side signals
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">+BOS</span>
                        <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">SSL Sweep</span>
                        <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">Demand OB</span>
                        <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">+FVG</span>
                        <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">+IFVG</span>
                      </div>
                    </div>

                    {/* Bearish Setup Master Card */}
                    <div className={`p-2 rounded-lg border transition-all ${
                      activeSmcConfig.showBearishSetups !== false
                        ? 'bg-rose-500/8 border-rose-500/40 dark:bg-rose-950/25 dark:border-rose-500/35'
                        : 'bg-slate-100/50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 opacity-60'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500 inline-block shadow-[0_0_6px_rgba(244,63,94,0.5)]" />
                          <span className="font-bold text-[11px] text-rose-700 dark:text-rose-400">Bearish Setup</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUpdateSmc({ showBearishSetups: activeSmcConfig.showBearishSetups === false ? true : false })}
                          className={`w-7 h-4 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                            activeSmcConfig.showBearishSetups !== false ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                          title="Toggle all Bearish / Short setups"
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                              activeSmcConfig.showBearishSetups !== false ? 'translate-x-3' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                      <div className="text-[9.5px] text-slate-500 dark:text-slate-400 leading-tight mb-1.5">
                        Supply zones & short-side signals
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">-BOS</span>
                        <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">BSL Sweep</span>
                        <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">Supply OB</span>
                        <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">-FVG</span>
                        <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">-IFVG</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[9px] text-slate-400 dark:text-slate-500 px-0.5">
                    <span className="font-bold text-amber-500">Note:</span>
                    <span>Equilibrium (50% EQ) renders as neutral context independent of direction filters.</span>
                  </div>
                </div>

                {/* 1. Market Structure */}
                <div>
                  <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1 px-1">
                    Market Structure (Directional)
                  </div>
                  <div className="space-y-0.5 bg-slate-50/50 dark:bg-slate-900/30 rounded-lg p-1 border border-slate-100 dark:border-slate-800/60">
                    <SmcToggleRow
                      label="BOS (Break of Structure)"
                      sublabel="Trend continuation breaks"
                      checked={activeSmcConfig.showBos}
                      onChange={(v) => handleUpdateSmc({ showBos: v })}
                      badge="BOS ↑↓"
                      accent="amber"
                    />
                    <SmcToggleRow
                      label="CHoCH / MSS"
                      sublabel="Change of Character reversal shifts"
                      checked={activeSmcConfig.showChoch}
                      onChange={(v) => handleUpdateSmc({ showChoch: v })}
                      badge="CHoCH"
                      accent="amber"
                    />
                    <SmcToggleRow
                      label="Bullish BOS & CHoCH / MSS"
                      sublabel="Demand-side break of structure & character shifts"
                      checked={activeSmcConfig.showBullishStructure}
                      onChange={(v) => handleUpdateSmc({ showBullishStructure: v })}
                      badge="+BOS / +CHoCH"
                      badgeColor="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      accent="emerald"
                    />
                    <SmcToggleRow
                      label="Bearish BOS & CHoCH / MSS"
                      sublabel="Supply-side break of structure & character shifts"
                      checked={activeSmcConfig.showBearishStructure}
                      onChange={(v) => handleUpdateSmc({ showBearishStructure: v })}
                      badge="-BOS / -CHoCH"
                      badgeColor="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                      accent="rose"
                    />
                    <SmcToggleRow
                      label="Swing Points"
                      sublabel="Confirmed pivot highs and lows"
                      checked={activeSmcConfig.showSwings}
                      onChange={(v) => handleUpdateSmc({ showSwings: v })}
                      badge="HH/HL/LH/LL"
                      accent="amber"
                    />
                  </div>
                </div>

                {/* 2. Liquidity */}
                <div>
                  <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1 px-1">
                    Liquidity Pools & Sweeps
                  </div>
                  <div className="space-y-0.5 bg-slate-50/50 dark:bg-slate-900/30 rounded-lg p-1 border border-slate-100 dark:border-slate-800/60">
                    <SmcToggleRow
                      label="BSL & SSL Levels"
                      sublabel="Buy-Side and Sell-Side order pools"
                      checked={activeSmcConfig.showLiquidityLevels}
                      onChange={(v) => handleUpdateSmc({ showLiquidityLevels: v })}
                      badge="$$$"
                      accent="amber"
                    />
                    <SmcToggleRow
                      label="Equal Highs & Lows"
                      sublabel="Double top/bottom liquidity clusters"
                      checked={activeSmcConfig.showEqualHighLow}
                      onChange={(v) => handleUpdateSmc({ showEqualHighLow: v })}
                      badge="EQH/EQL"
                      accent="amber"
                    />
                    <SmcToggleRow
                      label="Liquidity Sweeps (Master)"
                      sublabel="Stop hunt & wick rejection sweeps"
                      checked={activeSmcConfig.showSweeps}
                      onChange={(v) => handleUpdateSmc({ showSweeps: v })}
                      badge="Sweeps"
                      accent="amber"
                    />
                    <SmcToggleRow
                      label="Bullish Sweeps (SSL Sweeps)"
                      sublabel="Sell-side liquidity sweep & rapid bullish reclaim"
                      checked={activeSmcConfig.showSslSweeps}
                      onChange={(v) => handleUpdateSmc({ showSslSweeps: v })}
                      badge="SSL Sweep"
                      badgeColor="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      accent="emerald"
                    />
                    <SmcToggleRow
                      label="Bearish Sweeps (BSL Sweeps)"
                      sublabel="Buy-side liquidity sweep & rapid bearish rejection"
                      checked={activeSmcConfig.showBslSweeps}
                      onChange={(v) => handleUpdateSmc({ showBslSweeps: v })}
                      badge="BSL Sweep"
                      badgeColor="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                      accent="rose"
                    />
                  </div>
                </div>

                {/* 3. Order Blocks & Breakers */}
                <div>
                  <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1 px-1">
                    Institutional Order Blocks & Breakers
                  </div>
                  <div className="space-y-0.5 bg-slate-50/50 dark:bg-slate-900/30 rounded-lg p-1 border border-slate-100 dark:border-slate-800/60">
                    <SmcToggleRow
                      label="Bullish Demand OB"
                      sublabel="Institutional buying footprint before rally"
                      checked={activeSmcConfig.showBullishOb}
                      onChange={(v) => handleUpdateSmc({ showBullishOb: v })}
                      badge="Demand"
                      badgeColor="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      accent="emerald"
                    />
                    <SmcToggleRow
                      label="Bearish Supply OB"
                      sublabel="Institutional selling footprint before drop"
                      checked={activeSmcConfig.showBearishOb}
                      onChange={(v) => handleUpdateSmc({ showBearishOb: v })}
                      badge="Supply"
                      badgeColor="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                      accent="rose"
                    />
                    <SmcToggleRow
                      label="Breaker Blocks (Master)"
                      sublabel="Violated order blocks flipped into opposite role"
                      checked={activeSmcConfig.showBreakers}
                      onChange={(v) => handleUpdateSmc({ showBreakers: v })}
                      badge="Breakers"
                      accent="purple"
                    />
                    <SmcToggleRow
                      label="Bullish Breakers (+BRK Support)"
                      sublabel="Failed supply OB converting into support"
                      checked={activeSmcConfig.showBullishBreakers}
                      onChange={(v) => handleUpdateSmc({ showBullishBreakers: v })}
                      badge="+BRK"
                      badgeColor="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      accent="emerald"
                    />
                    <SmcToggleRow
                      label="Bearish Breakers (-BRK Resistance)"
                      sublabel="Failed demand OB converting into resistance"
                      checked={activeSmcConfig.showBearishBreakers}
                      onChange={(v) => handleUpdateSmc({ showBearishBreakers: v })}
                      badge="-BRK"
                      badgeColor="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                      accent="rose"
                    />
                    <SmcToggleRow
                      label="Show Mitigated Blocks"
                      sublabel="Display already tested order blocks"
                      checked={activeSmcConfig.showMitigatedOb}
                      onChange={(v) => handleUpdateSmc({ showMitigatedOb: v })}
                      accent="amber"
                    />
                  </div>
                </div>

                {/* 4. Fair Value Gaps & IFVG */}
                <div>
                  <div className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider mb-1 px-1">
                    Fair Value Gaps (FVG) & Inverse FVGs (IFVG)
                  </div>
                  <div className="space-y-0.5 bg-slate-50/50 dark:bg-slate-900/30 rounded-lg p-1 border border-slate-100 dark:border-slate-800/60">
                    <SmcToggleRow
                      label="Bullish Imbalance (+FVG)"
                      sublabel="3-candle displacement buy imbalance"
                      checked={activeSmcConfig.showBullishFvg}
                      onChange={(v) => handleUpdateSmc({ showBullishFvg: v })}
                      badge="+FVG"
                      badgeColor="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      accent="emerald"
                    />
                    <SmcToggleRow
                      label="Bearish Imbalance (-FVG)"
                      sublabel="3-candle displacement sell imbalance"
                      checked={activeSmcConfig.showBearishFvg}
                      onChange={(v) => handleUpdateSmc({ showBearishFvg: v })}
                      badge="-FVG"
                      badgeColor="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                      accent="rose"
                    />
                    <SmcToggleRow
                      label="Bullish Inverse FVG (+IFVG Support)"
                      sublabel="Violated bearish FVG flipped to bullish support"
                      checked={activeSmcConfig.showBullishIfvg}
                      onChange={(v) => handleUpdateSmc({ showBullishIfvg: v })}
                      badge="+IFVG"
                      badgeColor="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20"
                      accent="teal"
                    />
                    <SmcToggleRow
                      label="Bearish Inverse FVG (-IFVG Resistance)"
                      sublabel="Violated bullish FVG flipped to bearish resistance"
                      checked={activeSmcConfig.showBearishIfvg}
                      onChange={(v) => handleUpdateSmc({ showBearishIfvg: v })}
                      badge="-IFVG"
                      badgeColor="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                      accent="purple"
                    />
                    <SmcToggleRow
                      label="Consequent Encroachment (CE)"
                      sublabel="50% midpoint magnet midline"
                      checked={activeSmcConfig.showFvgMidpoint}
                      onChange={(v) => handleUpdateSmc({ showFvgMidpoint: v })}
                      badge="50% CE"
                      accent="amber"
                    />
                    <SmcToggleRow
                      label="Show Mitigated FVGs"
                      sublabel="Display fully filled imbalances"
                      checked={activeSmcConfig.showMitigatedFvg}
                      onChange={(v) => handleUpdateSmc({ showMitigatedFvg: v })}
                      accent="amber"
                    />
                  </div>
                </div>

                {/* 5. Confluence & Reversal Setups */}
                <div>
                  <div className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-1 px-1">
                    Confluence & Reversal Setups
                  </div>
                  <div className="space-y-0.5 bg-slate-50/50 dark:bg-slate-900/30 rounded-lg p-1 border border-slate-100 dark:border-slate-800/60">
                    <SmcToggleRow
                      label="Bullish Confluence Setups"
                      sublabel="SSL sweep + FVG + Demand OB confluence signals"
                      checked={activeSmcConfig.showBullishConfluence}
                      onChange={(v) => handleUpdateSmc({ showBullishConfluence: v })}
                      badge="Bullish"
                      badgeColor="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      accent="emerald"
                    />
                    <SmcToggleRow
                      label="Bearish Confluence Setups"
                      sublabel="BSL sweep + FVG + Supply OB confluence signals"
                      checked={activeSmcConfig.showBearishConfluence}
                      onChange={(v) => handleUpdateSmc({ showBearishConfluence: v })}
                      badge="Bearish"
                      badgeColor="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                      accent="rose"
                    />
                  </div>
                </div>

                {/* 6. Dealing Range */}
                <div>
                  <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1 px-1">
                    Premium & Discount Zones
                  </div>
                  <div className="space-y-0.5 bg-slate-50/50 dark:bg-slate-900/30 rounded-lg p-1 border border-slate-100 dark:border-slate-800/60">
                    <SmcToggleRow
                      label="Dealing Range Zones"
                      sublabel="Subtle background tint for Buy/Sell regions"
                      checked={activeSmcConfig.showPremiumDiscount}
                      onChange={(v) => handleUpdateSmc({ showPremiumDiscount: v })}
                      accent="indigo"
                    />
                    <SmcToggleRow
                      label="Equilibrium (EQ)"
                      sublabel="50% fair-value midline (Neutral context)"
                      checked={activeSmcConfig.showEquilibrium}
                      onChange={(v) => handleUpdateSmc({ showEquilibrium: v })}
                      badge="50% EQ"
                      badgeColor="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                      accent="amber"
                    />
                    <SmcToggleRow
                      label="Optimal Trade Entry (OTE)"
                      sublabel="61.8% to 78.6% institutional entry zone"
                      checked={activeSmcConfig.showOte}
                      onChange={(v) => handleUpdateSmc({ showOte: v })}
                      badge="OTE"
                      badgeColor="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
                      accent="blue"
                    />
                  </div>
                </div>

                {/* 7. Key Session Levels */}
                <div>
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 px-1">
                    Key Historical Levels
                  </div>
                  <div className="space-y-0.5 bg-slate-50/50 dark:bg-slate-900/30 rounded-lg p-1 border border-slate-100 dark:border-slate-800/60">
                    <SmcToggleRow
                      label="Previous Day High/Low"
                      sublabel="Prior trading day liquidity reference"
                      checked={activeSmcConfig.showPdhPdl}
                      onChange={(v) => handleUpdateSmc({ showPdhPdl: v })}
                      badge="PDH/PDL"
                      accent="amber"
                    />
                    <SmcToggleRow
                      label="Previous Week High/Low"
                      sublabel="Prior weekly macro liquidity frame"
                      checked={activeSmcConfig.showPwhPwl}
                      onChange={(v) => handleUpdateSmc({ showPwhPwl: v })}
                      badge="PWH/PWL"
                      accent="amber"
                    />
                  </div>
                </div>
              </div>

              {/* Scanner Link Footer */}
              <a
                href="/terminal/screener?tab=smcScanner"
                className="flex items-center justify-between px-3.5 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors shrink-0"
              >
                <span className="flex items-center gap-1.5">
                  <span>⚡</span>
                  <span>Open SMC Institutional Scanner</span>
                </span>
                <span className="font-mono text-xs">↗</span>
              </a>
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />
        
        {/* 5. Optional Clean Overlays (VOL, VPVR) */}
        <div className="flex items-center gap-1">
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

        {/* 7.5 FULLSCREEN TOGGLE */}
        {onToggleFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            title={isFullscreen ? 'Exit Full Screen (Esc / F)' : 'Full Screen (F)'}
            className={`h-7 px-2.5 rounded-lg border font-bold text-xs font-mono flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
              isFullscreen
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-black'
                : 'border-slate-200 dark:border-slate-700 hover:border-emerald-500/60 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-slate-800'
            }`}
          >
            {isFullscreen ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              </svg>
            )}
            <span className="hidden md:inline">{isFullscreen ? 'EXIT' : 'FULL'}</span>
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
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>CONNECTED</span>
        </div>

        {/* Price Tracker */}
        {displayPrice !== undefined && displayPrice > 0 && (
          <div
            className="flex items-center gap-2.5 font-mono tabular-nums bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 px-2.5 py-0.5 rounded-lg shadow-xs"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            <span className="text-[16px] font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
              {currency}
              {displayPrice.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            {displayChange !== undefined && displayChangePct !== undefined && (
              <span
                className={`text-[13px] font-extrabold tabular-nums ${
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
