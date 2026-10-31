'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Timeframe, IndicatorType, IndicatorConfig, INDICATOR_DEFAULTS, OVERLAY_TYPES, PANEL_TYPES } from '@/lib/types';
import type { ChartType } from '@/lib/types';
import { ChartTemplate } from '@/lib/chartTemplates';
import { SmcConfig, DEFAULT_SMC_CONFIG } from '@/lib/smcEngine';
import { OrderFlowConfig, DEFAULT_ORDER_FLOW_CONFIG } from '@/lib/orderflow/types';
import { OrderFlowToolbarMenu } from './OrderFlowToolbarMenu';

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
  showOrderFlow?: boolean;
  orderFlowConfig?: OrderFlowConfig;
  onToggleOrderFlow?: () => void;
  onOrderFlowConfigChange?: (config: OrderFlowConfig) => void;
  orderFlowSignalsCount?: number;
  onOpenOrderFlowSignals?: () => void;
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
}: {
  label: string;
  sublabel?: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  badge?: string;
  badgeColor?: string;
  accent?: string;
}) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer select-none"
    >
      <div className="min-w-0 pr-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{label}</span>
          {badge && (
            <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
              {badge}
            </span>
          )}
        </div>
        {sublabel && (
          <div className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight mt-0.5">
            {sublabel}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onChange(!checked);
        }}
        className={`w-8 h-4.5 rounded-full transition-colors relative shrink-0 cursor-pointer ${
          checked ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-3.5' : 'translate-x-0'
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
  showOrderFlow = false,
  orderFlowConfig,
  onToggleOrderFlow,
  onOrderFlowConfigChange,
  orderFlowSignalsCount = 0,
  onOpenOrderFlowSignals,
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
  const [openMenu, setOpenMenu] = useState<'TF' | 'CANDLES' | 'INDICATORS' | 'TEMPLATES' | 'SMC' | 'ORDER_FLOW' | null>(null);
  const [indicatorSearch, setIndicatorSearch] = useState('');
  const [recentlyAddedType, setRecentlyAddedType] = useState<string | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const activeOfConfig: OrderFlowConfig = orderFlowConfig || {
    ...DEFAULT_ORDER_FLOW_CONFIG,
    enabled: showOrderFlow,
  };

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
        showBullishSetups: true,
        showBearishSetups: true,
        showBullishConfluence: false,
        showBearishConfluence: false,
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
        showBullishSetups: true,
        showBearishSetups: true,
        showBullishConfluence: false,
        showBearishConfluence: false,
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
              openMenu === 'SMC'
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold'
                : 'border-slate-200 dark:border-slate-700 hover:border-emerald-500/60 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800'
            }`}
          >
            <span className="font-mono font-black text-xs px-1 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
              SMC
            </span>
            <span>SMC Analysis</span>
            {activeSmcConfig.enabled && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            )}
            <span className="text-[9px] text-slate-400 dark:text-slate-500">▼</span>
          </button>

          {openMenu === 'SMC' && (
            <div
              className="absolute top-full left-0 mt-1 w-80 sm:w-96 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B0F19] shadow-2xl z-[100] max-h-[520px] flex flex-col animate-in fade-in duration-75 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-black text-xs px-1 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                    SMC
                  </span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Smart Money Concepts</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenu(null);
                  }}
                  title="Close SMC menu"
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Master Switch */}
              <div
                onClick={() => handleUpdateSmc({ enabled: !activeSmcConfig.enabled })}
                className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between hover:bg-slate-50/60 dark:hover:bg-slate-900/40 cursor-pointer select-none shrink-0"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">Enable SMC Overlays</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500">Master switch for all SMC chart elements</div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpdateSmc({ enabled: !activeSmcConfig.enabled });
                  }}
                  className={`w-8 h-4.5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                    activeSmcConfig.enabled ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                      activeSmcConfig.enabled ? 'translate-x-3.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Presets Bar */}
              <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center gap-1 flex-wrap shrink-0">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-0.5 shrink-0">Presets:</span>
                {[
                  { id: 'all', label: 'All' },
                  { id: 'bullish', label: 'Bullish' },
                  { id: 'bearish', label: 'Bearish' },
                  { id: 'structure', label: 'Structure' },
                  { id: 'zones', label: 'OB & FVG' },
                  { id: 'reset', label: 'Reset' },
                ].map((p) => {
                  const isActive =
                    (p.id === 'bullish' && activeSmcConfig.showBullishSetups && !activeSmcConfig.showBearishSetups) ||
                    (p.id === 'bearish' && !activeSmcConfig.showBullishSetups && activeSmcConfig.showBearishSetups) ||
                    (p.id === 'all' && activeSmcConfig.showBullishSetups && activeSmcConfig.showBearishSetups && activeSmcConfig.showBos && activeSmcConfig.showBullishOb) ||
                    (p.id === 'structure' && activeSmcConfig.showBos && !activeSmcConfig.showBullishOb) ||
                    (p.id === 'zones' && !activeSmcConfig.showBos && activeSmcConfig.showBullishOb);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSetPreset(p.id as any)}
                      className={`px-2 py-0.5 text-[10.5px] font-semibold rounded-md border cursor-pointer transition-colors shrink-0 ${
                        isActive
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>

              {/* Toggles Container */}
              <div className={`flex-1 overflow-y-auto px-2 py-2 space-y-3 text-xs ${!activeSmcConfig.enabled ? 'opacity-40 pointer-events-none' : ''}`}>
                {/* 1. Setup Direction */}
                <div>
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 px-1.5">
                    Direction Controls
                  </div>
                  <div className="space-y-0.5">
                    <SmcToggleRow
                      label="Bullish Setups"
                      sublabel="Demand zones, +BOS, +CHoCH, SSL sweeps"
                      checked={activeSmcConfig.showBullishSetups !== false}
                      onChange={(v) => handleUpdateSmc({ showBullishSetups: v })}
                    />
                    <SmcToggleRow
                      label="Bearish Setups"
                      sublabel="Supply zones, -BOS, -CHoCH, BSL sweeps"
                      checked={activeSmcConfig.showBearishSetups !== false}
                      onChange={(v) => handleUpdateSmc({ showBearishSetups: v })}
                    />
                  </div>
                </div>

                {/* 2. Market Structure */}
                <div>
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 px-1.5">
                    Market Structure
                  </div>
                  <div className="space-y-0.5">
                    <SmcToggleRow
                      label="Break of Structure (BOS)"
                      sublabel="Trend continuation breaks"
                      checked={activeSmcConfig.showBos}
                      onChange={(v) => handleUpdateSmc({ showBos: v })}
                      badge="BOS"
                    />
                    <SmcToggleRow
                      label="Change of Character (CHoCH)"
                      sublabel="Trend reversal character shifts"
                      checked={activeSmcConfig.showChoch}
                      onChange={(v) => handleUpdateSmc({ showChoch: v })}
                      badge="CHoCH"
                    />
                    <SmcToggleRow
                      label="Bullish Structure (+BOS / +CHoCH)"
                      sublabel="Demand-side structure shifts"
                      checked={activeSmcConfig.showBullishStructure}
                      onChange={(v) => handleUpdateSmc({ showBullishStructure: v })}
                    />
                    <SmcToggleRow
                      label="Bearish Structure (-BOS / -CHoCH)"
                      sublabel="Supply-side structure shifts"
                      checked={activeSmcConfig.showBearishStructure}
                      onChange={(v) => handleUpdateSmc({ showBearishStructure: v })}
                    />
                    <SmcToggleRow
                      label="Swing Points"
                      sublabel="Confirmed pivot highs and lows (HH, HL, LH, LL)"
                      checked={activeSmcConfig.showSwings}
                      onChange={(v) => handleUpdateSmc({ showSwings: v })}
                    />
                  </div>
                </div>

                {/* 3. Liquidity */}
                <div>
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 px-1.5">
                    Liquidity Pools & Sweeps
                  </div>
                  <div className="space-y-0.5">
                    <SmcToggleRow
                      label="BSL & SSL Levels"
                      sublabel="Buy-Side and Sell-Side liquidity lines"
                      checked={activeSmcConfig.showLiquidityLevels}
                      onChange={(v) => handleUpdateSmc({ showLiquidityLevels: v })}
                    />
                    <SmcToggleRow
                      label="Equal Highs & Lows (EQH / EQL)"
                      sublabel="Double top/bottom liquidity clusters"
                      checked={activeSmcConfig.showEqualHighLow}
                      onChange={(v) => handleUpdateSmc({ showEqualHighLow: v })}
                    />
                    <SmcToggleRow
                      label="Liquidity Sweeps (Master)"
                      sublabel="Stop hunt & rejection wicks"
                      checked={activeSmcConfig.showSweeps}
                      onChange={(v) => handleUpdateSmc({ showSweeps: v })}
                    />
                    <SmcToggleRow
                      label="Bullish Sweeps (SSL)"
                      sublabel="Sell-side sweep with bullish reclaim"
                      checked={activeSmcConfig.showSslSweeps}
                      onChange={(v) => handleUpdateSmc({ showSslSweeps: v })}
                    />
                    <SmcToggleRow
                      label="Bearish Sweeps (BSL)"
                      sublabel="Buy-side sweep with bearish rejection"
                      checked={activeSmcConfig.showBslSweeps}
                      onChange={(v) => handleUpdateSmc({ showBslSweeps: v })}
                    />
                  </div>
                </div>

                {/* 4. Order Blocks & Breakers */}
                <div>
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 px-1.5">
                    Order Blocks & Breakers
                  </div>
                  <div className="space-y-0.5">
                    <SmcToggleRow
                      label="Demand Order Blocks (Bullish)"
                      sublabel="Institutional buying zones"
                      checked={activeSmcConfig.showBullishOb}
                      onChange={(v) => handleUpdateSmc({ showBullishOb: v })}
                    />
                    <SmcToggleRow
                      label="Supply Order Blocks (Bearish)"
                      sublabel="Institutional selling zones"
                      checked={activeSmcConfig.showBearishOb}
                      onChange={(v) => handleUpdateSmc({ showBearishOb: v })}
                    />
                    <SmcToggleRow
                      label="Breaker Blocks (Master)"
                      sublabel="Violated order blocks flipped into opposite role"
                      checked={activeSmcConfig.showBreakers}
                      onChange={(v) => handleUpdateSmc({ showBreakers: v })}
                    />
                    <SmcToggleRow
                      label="Bullish Breakers (+BRK Support)"
                      sublabel="Failed supply OB converted to support"
                      checked={activeSmcConfig.showBullishBreakers}
                      onChange={(v) => handleUpdateSmc({ showBullishBreakers: v })}
                    />
                    <SmcToggleRow
                      label="Bearish Breakers (-BRK Resistance)"
                      sublabel="Failed demand OB converted to resistance"
                      checked={activeSmcConfig.showBearishBreakers}
                      onChange={(v) => handleUpdateSmc({ showBearishBreakers: v })}
                    />
                    <SmcToggleRow
                      label="Show Mitigated Blocks"
                      sublabel="Keep tested order blocks visible (dimmed)"
                      checked={activeSmcConfig.showMitigatedOb}
                      onChange={(v) => handleUpdateSmc({ showMitigatedOb: v })}
                    />
                  </div>
                </div>

                {/* 5. Fair Value Gaps (FVG) */}
                <div>
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 px-1.5">
                    Fair Value Gaps (FVG)
                  </div>
                  <div className="space-y-0.5">
                    <SmcToggleRow
                      label="Bullish Imbalance (+FVG)"
                      sublabel="3-candle displacement buy imbalance"
                      checked={activeSmcConfig.showBullishFvg}
                      onChange={(v) => handleUpdateSmc({ showBullishFvg: v })}
                    />
                    <SmcToggleRow
                      label="Bearish Imbalance (-FVG)"
                      sublabel="3-candle displacement sell imbalance"
                      checked={activeSmcConfig.showBearishFvg}
                      onChange={(v) => handleUpdateSmc({ showBearishFvg: v })}
                    />
                    <SmcToggleRow
                      label="Bullish Inverse FVG (+IFVG)"
                      sublabel="Violated bearish FVG flipped to support"
                      checked={activeSmcConfig.showBullishIfvg}
                      onChange={(v) => handleUpdateSmc({ showBullishIfvg: v })}
                    />
                    <SmcToggleRow
                      label="Bearish Inverse FVG (-IFVG)"
                      sublabel="Violated bullish FVG flipped to resistance"
                      checked={activeSmcConfig.showBearishIfvg}
                      onChange={(v) => handleUpdateSmc({ showBearishIfvg: v })}
                    />
                    <SmcToggleRow
                      label="Consequent Encroachment (50% CE)"
                      sublabel="50% midpoint magnet midline"
                      checked={activeSmcConfig.showFvgMidpoint}
                      onChange={(v) => handleUpdateSmc({ showFvgMidpoint: v })}
                    />
                    <SmcToggleRow
                      label="Show Mitigated FVGs"
                      sublabel="Keep filled imbalances visible (dimmed)"
                      checked={activeSmcConfig.showMitigatedFvg}
                      onChange={(v) => handleUpdateSmc({ showMitigatedFvg: v })}
                    />
                  </div>
                </div>

                {/* 6. Confluence Setups */}
                <div>
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 px-1.5">
                    Confluence Setups
                  </div>
                  <div className="space-y-0.5">
                    <SmcToggleRow
                      label="Bullish Confluence Setups"
                      sublabel="SSL sweep + FVG + Demand OB confluence"
                      checked={activeSmcConfig.showBullishConfluence}
                      onChange={(v) => handleUpdateSmc({ showBullishConfluence: v })}
                    />
                    <SmcToggleRow
                      label="Bearish Confluence Setups"
                      sublabel="BSL sweep + FVG + Supply OB confluence"
                      checked={activeSmcConfig.showBearishConfluence}
                      onChange={(v) => handleUpdateSmc({ showBearishConfluence: v })}
                    />
                  </div>
                </div>

                {/* 7. Premium / Discount & Levels */}
                <div>
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 px-1.5">
                    Range & Session Levels
                  </div>
                  <div className="space-y-0.5">
                    <SmcToggleRow
                      label="Dealing Range Zones"
                      sublabel="Premium and discount zones tint"
                      checked={activeSmcConfig.showPremiumDiscount}
                      onChange={(v) => handleUpdateSmc({ showPremiumDiscount: v })}
                    />
                    <SmcToggleRow
                      label="Equilibrium (50% EQ)"
                      sublabel="Fair value midpoint line"
                      checked={activeSmcConfig.showEquilibrium}
                      onChange={(v) => handleUpdateSmc({ showEquilibrium: v })}
                    />
                    <SmcToggleRow
                      label="Optimal Trade Entry (OTE)"
                      sublabel="61.8% to 78.6% retracement zone"
                      checked={activeSmcConfig.showOte}
                      onChange={(v) => handleUpdateSmc({ showOte: v })}
                    />
                    <SmcToggleRow
                      label="Previous Day High / Low (PDH / PDL)"
                      sublabel="Key daily liquidity references"
                      checked={activeSmcConfig.showPdhPdl}
                      onChange={(v) => handleUpdateSmc({ showPdhPdl: v })}
                    />
                    <SmcToggleRow
                      label="Previous Week High / Low (PWH / PWL)"
                      sublabel="Major weekly liquidity references"
                      checked={activeSmcConfig.showPwhPwl}
                      onChange={(v) => handleUpdateSmc({ showPwhPwl: v })}
                    />
                  </div>
                </div>
              </div>

              {/* Clean Simple Footer */}
              <div className="px-3.5 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 shrink-0 flex items-center justify-between">
                <a
                  href="/terminal/screener?tab=smcScanner"
                  className="text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1"
                >
                  <span>Open SMC Scanner</span>
                  <span className="text-[11px]">↗</span>
                </a>
                <button
                  type="button"
                  onClick={() => handleSetPreset('reset')}
                  className="text-xs text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                >
                  Reset Defaults
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

        {/* 4.5 Order Flow Footprint Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === 'ORDER_FLOW' ? null : 'ORDER_FLOW')}
            title="Order Flow Footprint Analysis Mode"
            className={`h-7 flex items-center gap-1.5 px-2.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              openMenu === 'ORDER_FLOW'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 font-bold'
                : 'border-slate-200 dark:border-slate-700 hover:border-blue-500/60 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800'
            }`}
          >
            <span className="font-mono font-black text-xs px-1 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400">
              OF
            </span>
            <span>Order Flow</span>
            {activeOfConfig.enabled && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            )}
            <span className="text-[9px] text-slate-400 dark:text-slate-500">▼</span>
          </button>

          <OrderFlowToolbarMenu
            isOpen={openMenu === 'ORDER_FLOW'}
            onClose={() => setOpenMenu(null)}
            config={activeOfConfig}
            onChangeConfig={(updates) => {
              const updated = { ...activeOfConfig, ...updates };
              onOrderFlowConfigChange?.(updated);
            }}
            onOpenSignalsModal={onOpenOrderFlowSignals}
            signalsCount={orderFlowSignalsCount}
          />
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
        {/* Beacon — reflects real data source (engine vs. offline demo fallback) */}
        {isLiveFromEngine ? (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>CONNECTED</span>
          </div>
        ) : (
          <div
            title="Trade Engine returned no candles for this symbol. Showing simulated demo data — not real market prices."
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700/70 bg-amber-50 dark:bg-amber-900/30 text-[11px] font-mono font-bold text-amber-700 dark:text-amber-300 shadow-xs"
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>DEMO DATA</span>
          </div>
        )}

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
