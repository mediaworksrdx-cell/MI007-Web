'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Timeframe, IndicatorType, IndicatorConfig, INDICATOR_DEFAULTS, OVERLAY_TYPES, PANEL_TYPES, getInstrumentDecimals } from '@/lib/types';
import type { ChartType } from '@/lib/types';
import { ChartTemplate } from '@/lib/chartTemplates';
import { SmcConfig, DEFAULT_SMC_CONFIG } from '@/lib/smcEngine';
import { OrderFlowConfig, DEFAULT_ORDER_FLOW_CONFIG } from '@/lib/orderflow/types';
import { Mi007Config, DEFAULT_MI007_CONFIG } from '@/lib/mi007/types';
import { OrderFlowToolbarMenu } from './OrderFlowToolbarMenu';

import { STRATEGY_INDICATOR_MAP } from '@/lib/screener/strategyIndicatorMap';

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
  showMi007?: boolean;
  mi007Config?: Mi007Config;
  onToggleMi007?: () => void;
  onMi007ConfigChange?: (partial: Partial<Mi007Config>) => void;
  showTrendFibo?: boolean;
  onToggleTrendFibo?: () => void;
  showVolumeProfile: boolean;
  showMagnifier?: boolean;
  onToggleMagnifier?: () => void;
  cursorMode?: import('./DrawingToolbar').CursorMode;
  activeIndicators: IndicatorType[];
  indicators?: IndicatorConfig[];
  engineStatus?: string;
  isLiveFromEngine?: boolean;
  isMarketOpen?: boolean;
  symbol?: string;
  currency?: string;
  displayPrice?: number;
  displayChange?: number;
  displayChangePct?: number;
  templates: ChartTemplate[];
  activeTemplateId: string;
  saveStatus?: 'idle' | 'saved';
  snapshotStatus?: 'idle' | 'captured';
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
  onApplyStrategy?: (strategyId: string) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  candleRangeMs?: { minMs: number; maxMs: number } | null;
  isGoToActive?: boolean;
  activeGoToLabel?: string;
  onGoToRange?: (range: { fromMs: number; toMs: number; label?: string; reset?: boolean } | null) => void;
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
  showMi007 = false,
  mi007Config,
  onToggleMi007,
  onMi007ConfigChange,
  showTrendFibo = false,
  onToggleTrendFibo,
  showVolumeProfile,
  showMagnifier = false,
  onToggleMagnifier,
  cursorMode = 'crosshair',
  activeIndicators,
  indicators,
  engineStatus,
  isLiveFromEngine,
  isMarketOpen = true,
  symbol,
  currency = '₹',
  displayPrice,
  displayChange,
  displayChangePct,
  templates,
  activeTemplateId,
  saveStatus = 'idle',
  snapshotStatus = 'idle',
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
  onApplyStrategy,
  isFullscreen,
  onToggleFullscreen,
  candleRangeMs,
  isGoToActive = false,
  activeGoToLabel,
  onGoToRange,
}: ChartToolbarProps) {
  const [openMenu, setOpenMenu] = useState<'TF' | 'CANDLES' | 'INDICATORS' | 'TEMPLATES' | 'GOTO' | 'SMC' | 'ORDER_FLOW' | 'MI007' | null>(null);
  const [goToDateFrom, setGoToDateFrom] = useState('');
  const [goToDateTill, setGoToDateTill] = useState('');
  const [goToTimeFrom, setGoToTimeFrom] = useState('00:00');
  const [goToTimeTill, setGoToTimeTill] = useState('23:59');
  const [goToError, setGoToError] = useState<string | null>(null);

  useEffect(() => {
    setGoToDateFrom('');
    setGoToDateTill('');
    setGoToTimeFrom('00:00');
    setGoToTimeTill('23:59');
    setGoToError(null);
  }, [symbol, timeframe]);
  const [fxTab, setFxTab] = useState<'indicators' | 'strategies'>('indicators');
  const [indicatorSearch, setIndicatorSearch] = useState('');
  const [strategySearch, setStrategySearch] = useState('');
  const [recentlyAddedType, setRecentlyAddedType] = useState<string | null>(null);
  const [recentlyAppliedStrategy, setRecentlyAppliedStrategy] = useState<string | null>(null);
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
        showMitigatedOb: true,
        showBullishFvg: true,
        showBearishFvg: true,
        showBullishIfvg: true,
        showBearishIfvg: true,
        showFvgMidpoint: true,
        showMitigatedFvg: true,
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
        showMitigatedOb: true,
        showBullishFvg: true,
        showBearishFvg: false,
        showBullishIfvg: true,
        showBearishIfvg: false,
        showFvgMidpoint: true,
        showMitigatedFvg: true,
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
        showMitigatedOb: true,
        showBullishFvg: false,
        showBearishFvg: true,
        showBullishIfvg: false,
        showBearishIfvg: true,
        showFvgMidpoint: true,
        showMitigatedFvg: true,
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
        showBullishBreakers: true,
        showBearishBreakers: true,
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
        showBullishStructure: true,
        showBearishStructure: true,
        showSwings: false,
        showSweeps: false,
        showSslSweeps: true,
        showBslSweeps: true,
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
      className="flex flex-wrap xl:flex-nowrap items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B0F19] px-1.5 sm:px-3 py-1 text-xs text-slate-800 dark:text-slate-200 shadow-xs gap-1 sm:gap-2 relative z-50 select-none overflow-visible"
    >
      {/* ── Left Controls: Timeframe, Chart Type, Indicators, Drawing, Overlays, Save & Templates ── */}
      <div className="flex flex-wrap xl:flex-nowrap items-center gap-1 sm:gap-1.5 min-w-0 overflow-visible">
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
            <span className="font-bold hidden sm:inline">{currentChartType.label}</span>
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
            <span className="hidden xs:inline">Indicators & Strategies</span>
            {((indicators && indicators.length > 0) || activeIndicators.length > 0) && (
              <span className="h-4 px-1.5 rounded-full bg-emerald-600 text-white font-mono text-[10px] font-bold flex items-center justify-center">
                {indicators ? indicators.length : activeIndicators.length}
              </span>
            )}
            <span className="text-[9px] text-slate-400 dark:text-slate-500">▼</span>
          </button>

          {openMenu === 'INDICATORS' && (
            <div
              className="absolute top-full left-0 mt-1 w-96 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B0F19] shadow-2xl z-[100] max-h-[520px] flex flex-col animate-in fade-in duration-75 overflow-hidden"
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

              {/* Sub-Tab Switcher: Indicators vs Strategies */}
              <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 shrink-0 p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setFxTab('indicators')}
                  className={`flex-1 py-1 text-center text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    fxTab === 'indicators'
                      ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Indicators ({ALL_INDICATOR_TYPES.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFxTab('strategies')}
                  className={`flex-1 py-1 text-center text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    fxTab === 'strategies'
                      ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Strategies ({Object.keys(STRATEGY_INDICATOR_MAP).length})
                </button>
              </div>

              {/* ── TAB A: INDICATORS ── */}
              {fxTab === 'indicators' && (
                <>
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
                </>
              )}

              {/* ── TAB B: STRATEGIES MASTER LIBRARY ── */}
              {fxTab === 'strategies' && (
                <>
                  {/* Search Bar for Strategies */}
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="relative">
                      <input
                        type="text"
                        value={strategySearch}
                        onChange={(e) => setStrategySearch(e.target.value)}
                        placeholder="Search strategies (e.g. SMC, Golden Cross, Momentum)..."
                        className="w-full pl-7 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500"
                      />
                      <span className="absolute left-2 top-2 text-slate-400 text-xs">🔍</span>
                      {strategySearch && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStrategySearch('');
                          }}
                          title="Clear search"
                          className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Strategies Master List */}
                  <div className="flex-1 overflow-y-auto py-1 divide-y divide-slate-100 dark:divide-slate-800/60">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between sticky top-0 bg-white dark:bg-[#0B0F19] z-10 border-b border-slate-100 dark:border-slate-800">
                      <span>Trading Strategies Master Library</span>
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">
                        Click to add setup
                      </span>
                    </div>

                    {Object.values(STRATEGY_INDICATOR_MAP)
                      .filter((s) => {
                        if (!strategySearch.trim()) return true;
                        const q = strategySearch.toLowerCase();
                        return (
                          s.strategyName.toLowerCase().includes(q) ||
                          s.category.toLowerCase().includes(q) ||
                          s.correspondingIndicators.some((ind) => ind.toLowerCase().includes(q))
                        );
                      })
                      .map((strat) => {
                        const isRecentlyApplied = recentlyAppliedStrategy === strat.strategyId;
                        return (
                          <div
                            key={strat.strategyId}
                            className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex flex-col gap-1.5 text-left"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                                    {strat.strategyName}
                                  </span>
                                  <span className="px-1.5 py-0.2 rounded text-[9.5px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                    {strat.category}
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  onApplyStrategy?.(strat.strategyId);
                                  setRecentlyAppliedStrategy(strat.strategyId);
                                  setTimeout(() => setRecentlyAppliedStrategy(null), 1800);
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                                  isRecentlyApplied
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/30'
                                }`}
                              >
                                {isRecentlyApplied ? '✓ Added' : '+ Add Setup'}
                              </button>
                            </div>

                            {/* Corresponding Indicators Badges */}
                            <div className="flex flex-wrap items-center gap-1 mt-0.5">
                              <span className="text-[9.5px] font-mono font-bold text-slate-400 uppercase">ƒx Indicators:</span>
                              {strat.correspondingIndicators.map((ind, i) => (
                                <span
                                  key={i}
                                  className="px-1.5 py-0.5 rounded text-[9.5px] font-mono font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                                >
                                  {ind}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </>
              )}

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

        {/* 4. SMC Analysis Split Button (1-Click Toggle + Dropdown Settings) */}
        <div className="relative flex items-center">
          <button
            type="button"
            onClick={() => handleUpdateSmc({ enabled: !activeSmcConfig.enabled })}
            title={activeSmcConfig.enabled ? "Disable SMC Overlays (1-Click)" : "Enable Smart Money Concepts (SMC) Analysis Mode (1-Click)"}
            className={`h-7 flex items-center gap-1.5 px-2.5 rounded-l-lg border-y border-l text-xs font-medium transition-colors cursor-pointer ${
              activeSmcConfig.enabled
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold'
                : 'border-slate-200 dark:border-slate-700 hover:border-emerald-500/60 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800'
            }`}
          >
            <span
              className={`font-mono font-black text-xs px-1 rounded ${
                activeSmcConfig.enabled
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
              }`}
            >
              SMC
            </span>
            <span className="hidden sm:inline">Analysis</span>
            {activeSmcConfig.enabled && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === 'SMC' ? null : 'SMC')}
            title="SMC Configuration & Individual Toggles"
            className={`h-7 px-1.5 rounded-r-lg border text-[10px] transition-colors cursor-pointer ${
              openMenu === 'SMC' || activeSmcConfig.enabled
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                : 'border-slate-200 dark:border-slate-700 hover:border-emerald-500/60 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
            }`}
          >
            ▼
          </button>

          {openMenu === 'SMC' && (
            <div
              className="absolute top-full left-0 mt-1 w-80 sm:w-96 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B0F19] shadow-2xl z-[100] max-h-[min(520px,calc(100vh-140px))] flex flex-col animate-in fade-in duration-75 overflow-hidden"
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

              {/* Quick Presets Bar */}
              <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center gap-1.5 flex-wrap shrink-0">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-0.5 shrink-0">Quick:</span>
                <button
                  type="button"
                  onClick={() => handleUpdateSmc({
                    enabled: true,
                    visualizationMode: 'clean',
                    enableCollisionControl: true,
                    enableHistoricalFading: true,
                    showMajorStructureOnly: true,
                    showInternalStructure: false,
                    showBos: true,
                    showChoch: true,
                    showBullishStructure: true,
                    showBearishStructure: true,
                    showBullishOb: true,
                    showBearishOb: true,
                    showBullishFvg: true,
                    showBearishFvg: true,
                    showSweeps: true,
                    showSslSweeps: true,
                    showBslSweeps: true,
                    showPremiumDiscount: true,
                    showEquilibrium: true,
                    showOte: true,
                    showBreakers: true,
                    showBullishIfvg: true,
                    showBearishIfvg: true,
                    showMitigatedOb: true,
                    showMitigatedFvg: true,
                    showFvgMidpoint: false,
                    showSwings: false,
                    showPdhPdl: false,
                    showPwhPwl: false,
                    showBullishConfluence: true,
                    showBearishConfluence: true,
                  })}
                  className="px-2 py-0.5 text-[10.5px] font-semibold rounded-md border bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 cursor-pointer transition-colors"
                >
                  Core 6
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPreset('all')}
                  className="px-2 py-0.5 text-[10.5px] font-semibold rounded-md border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                >
                  All On
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPreset('reset')}
                  className="px-2 py-0.5 text-[10.5px] font-semibold rounded-md border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                >
                  Reset
                </button>
              </div>

              {/* Simplified 2-Group SMC Menu */}
              <div className={`flex-1 min-h-0 overflow-y-auto px-2 py-2 pb-6 space-y-3 text-xs ${!activeSmcConfig.enabled ? 'opacity-40 pointer-events-none' : ''}`}>
                {/* 1. Core SMC (Most Important) */}
                <div>
                  <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1 px-1.5">
                    1. Core SMC (Recommended)
                  </div>
                  <div className="space-y-0.5">
                    <SmcToggleRow
                      label="Break of Structure (BOS)"
                      sublabel="Confirms trend continuation"
                      checked={activeSmcConfig.showBos !== false}
                      onChange={(v) => handleUpdateSmc({ showBos: v, showBullishStructure: v, showBearishStructure: v })}
                      badge="BOS"
                    />
                    <SmcToggleRow
                      label="Change of Character (CHoCH)"
                      sublabel="Early trend reversal shift"
                      checked={activeSmcConfig.showChoch !== false}
                      onChange={(v) => handleUpdateSmc({ showChoch: v, showBullishStructure: v, showBearishStructure: v })}
                      badge="CHoCH"
                    />
                    <SmcToggleRow
                      label="Order Blocks (Buy & Sell)"
                      sublabel="Key institutional demand & supply zones"
                      checked={Boolean(activeSmcConfig.showBullishOb !== false || activeSmcConfig.showBearishOb !== false)}
                      onChange={(v) => handleUpdateSmc({ showBullishOb: v, showBearishOb: v })}
                      badge="OB"
                    />
                    <SmcToggleRow
                      label="Fair Value Gaps (FVG)"
                      sublabel="3-candle price imbalance zones"
                      checked={Boolean(activeSmcConfig.showBullishFvg !== false || activeSmcConfig.showBearishFvg !== false)}
                      onChange={(v) => handleUpdateSmc({ showBullishFvg: v, showBearishFvg: v })}
                      badge="FVG"
                    />
                    <SmcToggleRow
                      label="Liquidity Sweeps"
                      sublabel="Stop-hunt wicks beyond highs & lows"
                      checked={activeSmcConfig.showSweeps !== false}
                      onChange={(v) => handleUpdateSmc({ showSweeps: v, showSslSweeps: v, showBslSweeps: v })}
                    />
                    <SmcToggleRow
                      label="Premium / Discount & OTE"
                      sublabel="Dealing range, 50% EQ & 62–79% OTE"
                      checked={Boolean(activeSmcConfig.showPremiumDiscount !== false || activeSmcConfig.showEquilibrium !== false || activeSmcConfig.showOte !== false)}
                      onChange={(v) => handleUpdateSmc({ showPremiumDiscount: v, showEquilibrium: v, showOte: v })}
                    />
                  </div>
                </div>

                {/* 2. Optional (Turn On When Needed) */}
                <div>
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 px-1.5">
                    2. Optional (As Needed)
                  </div>
                  <div className="space-y-0.5">
                    <SmcToggleRow
                      label="Breakers & Inverse FVG"
                      sublabel="Flipped support/resistance reversal zones"
                      checked={Boolean(activeSmcConfig.showBreakers || activeSmcConfig.showBullishIfvg || activeSmcConfig.showBearishIfvg)}
                      onChange={(v) => handleUpdateSmc({ showBreakers: v, showBullishBreakers: v, showBearishBreakers: v, showBullishIfvg: v, showBearishIfvg: v })}
                    />
                    <SmcToggleRow
                      label="Previous Day High / Low"
                      sublabel="Key intraday PDH / PDL levels"
                      checked={Boolean(activeSmcConfig.showPdhPdl)}
                      onChange={(v) => handleUpdateSmc({ showPdhPdl: v })}
                      badge="PDH/L"
                    />
                    <SmcToggleRow
                      label="Swing Points (HH / HL / LH / LL)"
                      sublabel="Pivot high and low structure labels"
                      checked={activeSmcConfig.showSwings !== false}
                      onChange={(v) => handleUpdateSmc({ showSwings: v })}
                    />
                    <SmcToggleRow
                      label="SMC Trade Brackets"
                      sublabel="Auto Entry, SL & TP boxes (hidden when MI007 is ON)"
                      checked={Boolean(activeSmcConfig.showBullishConfluence !== false || activeSmcConfig.showBearishConfluence !== false)}
                      onChange={(v) => handleUpdateSmc({ showBullishConfluence: v, showBearishConfluence: v })}
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

        {/* 4.5 Order Flow Footprint Toggle & Dropdown */}
        <div className="relative flex items-center">
          <button
            type="button"
            onClick={() => {
              const nextEnabled = !activeOfConfig.enabled;
              onOrderFlowConfigChange?.({ ...activeOfConfig, enabled: nextEnabled });
            }}
            title={activeOfConfig.enabled ? "Disable Order Flow Footprints" : "Enable Order Flow Footprints (Show Bid × Ask Volume Numbers)"}
            className={`h-7 flex items-center gap-1.5 px-2.5 rounded-l-lg border-y border-l text-xs font-medium transition-colors cursor-pointer ${
              activeOfConfig.enabled
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 font-bold'
                : 'border-slate-200 dark:border-slate-700 hover:border-blue-500/60 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800'
            }`}
          >
            <span className={`font-mono font-black text-xs px-1 rounded ${
              activeOfConfig.enabled
                ? 'bg-blue-500 text-white'
                : 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400'
            }`}>
              OF
            </span>
            <span className="hidden sm:inline">Order Flow</span>
            {activeOfConfig.enabled && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === 'ORDER_FLOW' ? null : 'ORDER_FLOW')}
            title="Order Flow Settings & Imbalance Thresholds"
            className={`h-7 px-1.5 rounded-r-lg border text-xs transition-colors cursor-pointer flex items-center justify-center ${
              activeOfConfig.enabled
                ? 'border-blue-500 bg-blue-100/60 dark:bg-blue-500/30 text-blue-700 dark:text-blue-400 font-bold'
                : 'border-slate-200 dark:border-slate-700 hover:border-blue-500/60 bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <span className="text-[9px]">▼</span>
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

        {/* 4.6 MI-007 Strategy — 1 Main Toggle + 3 Subs (SMC, Vol Pro, Fibo) */}
        {(() => {
          const activeMi007: Mi007Config = mi007Config || { ...DEFAULT_MI007_CONFIG, enabled: showMi007 };
          const updateMi007 = (partial: Partial<Mi007Config>) => {
            if (onMi007ConfigChange) {
              onMi007ConfigChange(partial);
            } else if (partial.enabled !== undefined) {
              onToggleMi007?.();
            }
          };
          return (
            <div className="relative flex items-center">
              <button
                type="button"
                onClick={() => updateMi007({ enabled: !activeMi007.enabled })}
                title="Toggle MI-007 Institutional Strategy (SMC + Volume Profile + Fibonacci)"
                className={`h-7 flex items-center gap-1.5 px-2.5 rounded-l-lg border-y border-l text-xs font-medium transition-colors cursor-pointer ${
                  activeMi007.enabled
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold'
                    : 'border-slate-200 dark:border-slate-700 hover:border-emerald-500/60 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800'
                }`}
              >
                <span
                  className={`font-mono font-black text-xs px-1 rounded ${
                    activeMi007.enabled
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  MI-007
                </span>
                {activeMi007.enabled && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setOpenMenu(openMenu === 'MI007' ? null : 'MI007')}
                title="MI-007 Layers (SMC, Vol Pro, Fibo)"
                className={`h-7 px-1.5 rounded-r-lg border text-[10px] transition-colors cursor-pointer ${
                  openMenu === 'MI007' || activeMi007.enabled
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                    : 'border-slate-200 dark:border-slate-700 hover:border-emerald-500/60 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
                }`}
              >
                ▼
              </button>

              {openMenu === 'MI007' && (
                <div className="absolute top-full left-0 mt-1.5 w-60 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl z-50 overflow-hidden">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-black text-[10px] px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950">MI-007</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Strategy</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpenMenu(null)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  {/* 1 Main Toggle */}
                  <div className="px-2 py-2 border-b border-slate-100 dark:border-slate-800">
                    <SmcToggleRow
                      label="Main Toggle (MI-007)"
                      sublabel="Master switch for strategy"
                      checked={activeMi007.enabled}
                      onChange={(v) => updateMi007({ enabled: v })}
                      badge="MAIN"
                    />
                  </div>

                  {/* 3 Sub Toggles: SMC, Vol Pro, Fibo */}
                  <div className={`px-2 py-2 space-y-0.5 ${!activeMi007.enabled ? 'opacity-40 pointer-events-none' : ''}`}>
                    <SmcToggleRow
                      label="SMC"
                      sublabel="Structure, setup bracket & checklist"
                      checked={activeMi007.showSmc}
                      onChange={(v) => updateMi007({ showSmc: v })}
                    />
                    <SmcToggleRow
                      label="Vol Pro"
                      sublabel="Volume Profile, POC, VAH & VAL"
                      checked={activeMi007.showVolPro}
                      onChange={(v) => updateMi007({ showVolPro: v })}
                    />
                    <SmcToggleRow
                      label="Fibo"
                      sublabel="Major-swing OTE & extension levels"
                      checked={activeMi007.showFibo}
                      onChange={(v) => updateMi007({ showFibo: v })}
                    />
                    <SmcToggleRow
                      label="HUD Card"
                      sublabel="Confirmation checklist card"
                      checked={Boolean(activeMi007.showHud)}
                      onChange={(v) => updateMi007({ showHud: v })}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* 4.7 Separate Standalone 3-Point Trend-Based Fibonacci Extension */}
        <button
          type="button"
          onClick={onToggleTrendFibo}
          title="Trend-Based Fibonacci Extension (3-pt A-B-C: Entry 0.618-0.786, Target 1.272-1.414)"
          className={`h-7 flex items-center gap-1.5 px-2.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
            showTrendFibo
              ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold'
              : 'border-slate-200 dark:border-slate-700 hover:border-amber-500/60 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800'
          }`}
        >
          <span
            className={`font-mono font-black text-[10.5px] px-1 rounded ${
              showTrendFibo
                ? 'bg-amber-500 text-slate-950'
                : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
            }`}
          >
            FIB EXT
          </span>
          <span className="hidden lg:inline">Trend Fib</span>
          {showTrendFibo && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          )}
        </button>

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
          {onToggleMagnifier && (
            <button
              type="button"
              onClick={onToggleMagnifier}
              title={showMagnifier ? 'Disable Magnifier Loupe (Hotkey: M)' : 'Enable Magnifier Loupe: 2.25x-2.5x Optical Zoom Lens & Cluster Inspection (Hotkey: M)'}
              className={`h-7 px-2 rounded-md text-[11px] font-bold font-mono border transition-colors cursor-pointer flex items-center gap-1 ${
                showMagnifier
                  ? 'bg-amber-50 dark:bg-amber-500/20 border-amber-400 dark:border-amber-500 text-amber-700 dark:text-amber-400 font-bold shadow-xs'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800'
              }`}
            >
              <span>🔍</span>
              <span>MAGNIFY</span>
            </button>
          )}


        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

        {/* 6. SAVE BUTTON (PERSIST CHART LAYOUT & WORKSPACE) */}
        <button
          type="button"
          onClick={onSaveChartLayout}
          title="Save Layout: Persist indicators, drawings & chart settings to browser storage"
          className={`h-7 px-2 sm:px-3 rounded-lg border font-bold text-xs font-mono flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
            saveStatus === 'saved'
              ? 'border-emerald-500 bg-emerald-600 text-white font-black'
              : 'border-emerald-300 dark:border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/25'
          }`}
        >
          <span>{saveStatus === 'saved' ? '✓' : '💾'}</span>
          <span className="hidden sm:inline">{saveStatus === 'saved' ? 'LAYOUT SAVED' : 'SAVE'}</span>
        </button>

        {/* 7. SNAPSHOT CAMERA TOOL (EXPORT PNG IMAGE) */}
        {onExportSnapshot && (
          <button
            type="button"
            onClick={() => onExportSnapshot('download')}
            title="Export Image: Download high-resolution PNG chart image to your device (Hotkey: S)"
            className={`h-7 px-2.5 rounded-lg border font-bold text-xs font-mono flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
              snapshotStatus === 'captured'
                ? 'border-blue-500 bg-blue-600 text-white font-black'
                : 'border-slate-200 dark:border-slate-700 hover:border-blue-500/60 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-800'
            }`}
          >
            <span className="text-sm leading-none">{snapshotStatus === 'captured' ? '✓' : '📷'}</span>
            <span className="text-[11px] font-bold">{snapshotStatus === 'captured' ? 'DOWNLOADED' : 'SNAPSHOT'}</span>
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
        <div className="relative hidden sm:block">
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
            <div className="absolute top-full right-0 mt-1 w-52 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B0F19] shadow-xl py-1 z-[100] animate-in fade-in duration-75">
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

        {/* 9. GO TO (DATE FROM/TILL + TIME FROM/TILL — STAYS LOCKED IN RANGE UNTIL CLOSED/OFF) */}
        <div className="relative flex items-center">
          <button
            type="button"
            onClick={() => {
              const nextOpen = openMenu === 'GOTO' ? null : 'GOTO';
              if (nextOpen === 'GOTO' && candleRangeMs) {
                const toDateStr = (ms: number) => {
                  const d = new Date(ms);
                  const y = d.getFullYear();
                  const m = String(d.getMonth() + 1).padStart(2, '0');
                  const day = String(d.getDate()).padStart(2, '0');
                  return `${y}-${m}-${day}`;
                };
                const minStr = toDateStr(candleRangeMs.minMs);
                const maxStr = toDateStr(candleRangeMs.maxMs);
                // Initialize or resync if dates are empty or outside newly loaded range
                if (!goToDateFrom || goToDateFrom < minStr || goToDateFrom > maxStr) {
                  const oneDayPriorMs = Math.max(candleRangeMs.minMs, candleRangeMs.maxMs - 24 * 3600_000);
                  setGoToDateFrom(toDateStr(oneDayPriorMs));
                }
                if (!goToDateTill || goToDateTill < minStr || goToDateTill > maxStr) {
                  setGoToDateTill(maxStr);
                }
                setGoToError(null);
              }
              setOpenMenu(nextOpen);
            }}
            className={`h-7 flex items-center gap-1.5 px-2.5 border text-xs font-bold font-mono transition-colors cursor-pointer ${
              isGoToActive ? 'rounded-l-lg border-r-0' : 'rounded-lg'
            } ${
              openMenu === 'GOTO' || isGoToActive
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold'
                : 'border-slate-200 dark:border-slate-700 hover:border-emerald-500/60 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800'
            }`}
            title={isGoToActive && activeGoToLabel ? `Viewing range: ${activeGoToLabel} (click to edit)` : 'Go to a specific Date & Time range on chart'}
          >
            <span>📅</span>
            <span>Go to</span>
            <span className="text-[9px] text-slate-400 dark:text-slate-500">▼</span>
          </button>

          {isGoToActive && (
            <button
              type="button"
              onClick={() => {
                onGoToRange?.({ fromMs: 0, toMs: 0, reset: true });
                setOpenMenu(null);
              }}
              className="h-7 px-1.5 rounded-r-lg border border-emerald-500 bg-emerald-600 hover:bg-rose-600 hover:border-rose-600 text-white text-[11px] font-bold transition-colors cursor-pointer"
              title="Reset view to latest live candles"
            >
              ✕
            </button>
          )}

          {openMenu === 'GOTO' && (() => {
            const toDateStr = (ms: number) => {
              const d = new Date(ms);
              const y = d.getFullYear();
              const m = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              return `${y}-${m}-${day}`;
            };
            const isDailyOrHigher = timeframe === '1D' || timeframe === '1W';
            const minDateStr = candleRangeMs ? toDateStr(candleRangeMs.minMs) : undefined;
            const maxDateStr = candleRangeMs ? toDateStr(candleRangeMs.maxMs) : undefined;
            const fmtShort = (ms: number) => {
              const d = new Date(ms);
              return isDailyOrHigher
                ? d.toLocaleDateString([], { day: '2-digit', month: 'short', year: '2-digit' })
                : d.toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
            };

            const handleApplyGoTo = (e?: React.FormEvent) => {
              if (e) e.preventDefault();
              if (!goToDateFrom) {
                setGoToError('Please select Date From.');
                return;
              }
              const tillDate = goToDateTill || goToDateFrom;
              const fromT = isDailyOrHigher ? '00:00' : (goToTimeFrom || '00:00');
              const tillT = isDailyOrHigher ? '23:59' : (goToTimeTill || '23:59');
              let fromMs = new Date(`${goToDateFrom}T${fromT}:00`).getTime();
              let toMs = new Date(`${tillDate}T${tillT}:59.999`).getTime();
              if (Number.isNaN(fromMs) || Number.isNaN(toMs)) {
                setGoToError('Invalid date or time.');
                return;
              }
              if (toMs < fromMs) {
                setGoToError('Till date/time must be after From.');
                return;
              }
              if (candleRangeMs) {
                if (toMs < candleRangeMs.minMs || fromMs > candleRangeMs.maxMs) {
                  setGoToError(
                    `Outside loaded history (${fmtShort(candleRangeMs.minMs)} – ${fmtShort(candleRangeMs.maxMs)}). Switch to 4H or 1D for older dates.`
                  );
                  return;
                }
                fromMs = Math.max(fromMs, candleRangeMs.minMs);
                toMs = Math.min(toMs, candleRangeMs.maxMs);
              }
              const label = isDailyOrHigher
                ? `${goToDateFrom} → ${tillDate}`
                : `${goToDateFrom} ${fromT} → ${tillDate} ${tillT}`;
              onGoToRange?.({ fromMs, toMs, label });
              setGoToError(null);
              setOpenMenu(null);
            };

            return (
              <form
                onSubmit={handleApplyGoTo}
                className="absolute top-full right-0 mt-1 w-76 max-w-[calc(100vw-1.5rem)] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B0F19] shadow-2xl p-3 z-[100] animate-in fade-in duration-75 select-text"
              >
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                      Go to Date &amp; Time
                    </span>
                    {isGoToActive && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold uppercase">
                        Active
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenMenu(null)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold px-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                        Date From
                      </label>
                      <input
                        type="date"
                        value={goToDateFrom}
                        onChange={(e) => { setGoToDateFrom(e.target.value); setGoToError(null); }}
                        className="w-full h-7 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-[11px] font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                        Date Till
                      </label>
                      <input
                        type="date"
                        value={goToDateTill}
                        onChange={(e) => { setGoToDateTill(e.target.value); setGoToError(null); }}
                        className="w-full h-7 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-[11px] font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {!isDailyOrHigher ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                          Time From
                        </label>
                        <input
                          type="time"
                          value={goToTimeFrom}
                          onChange={(e) => { setGoToTimeFrom(e.target.value); setGoToError(null); }}
                          className="w-full h-7 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-[11px] font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                          Time Till
                        </label>
                        <input
                          type="time"
                          value={goToTimeTill}
                          onChange={(e) => { setGoToTimeTill(e.target.value); setGoToError(null); }}
                          className="w-full h-7 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-[11px] font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                      {timeframe} bars match full calendar days automatically.
                    </div>
                  )}

                  {candleRangeMs && (
                    <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 px-2 py-1 rounded border border-slate-100 dark:border-slate-800">
                      Loaded: {fmtShort(candleRangeMs.minMs)} – {fmtShort(candleRangeMs.maxMs)}
                    </div>
                  )}

                  {goToError && (
                    <div className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 leading-snug">
                      {goToError}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      className="flex-1 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      Go to Range
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onGoToRange?.({ fromMs: 0, toMs: 0, reset: true });
                        setOpenMenu(null);
                      }}
                      className="h-7 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </form>
            );
          })()}
        </div>
      </div>

      {/* ── Right Controls: Live Beacon & Quote ── */}
      <div className="flex items-center gap-2.5 shrink-0 ml-auto">
        {/* Beacon — reflects real market open/closed status & engine connection */}
        {!isMarketOpen ? (
          <div
            title="Official exchange market is currently closed. Live trading and real-time candle creation are paused."
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 shadow-xs"
          >
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span className="hidden sm:inline">MARKET CLOSED</span>
          </div>
        ) : isLiveFromEngine ? (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">CONNECTED</span>
          </div>
        ) : (
          <div
            title="Trade Engine returned no candles for this symbol. Showing simulated demo data — not real market prices."
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700/70 bg-amber-50 dark:bg-amber-900/30 text-[11px] font-mono font-bold text-amber-700 dark:text-amber-300 shadow-xs"
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="hidden sm:inline">DEMO DATA</span>
          </div>
        )}

        {/* Price Tracker */}
        {displayPrice !== undefined && displayPrice > 0 && (() => {
          const dec = getInstrumentDecimals(symbol, displayPrice);
          return (
            <div
              className="flex items-center gap-1.5 sm:gap-2.5 font-mono tabular-nums bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 px-2 sm:px-2.5 py-0.5 rounded-lg shadow-xs"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              <span className="text-[14px] sm:text-[16px] font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
                {currency}
                {displayPrice.toLocaleString(undefined, {
                  minimumFractionDigits: dec,
                  maximumFractionDigits: dec,
                })}
              </span>
              {displayChange !== undefined && displayChangePct !== undefined && (
                <span
                  className={`text-[12px] sm:text-[13px] font-extrabold tabular-nums hidden xs:inline ${
                    displayChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {displayChange >= 0 ? '+' : ''}
                  {displayChange.toFixed(dec)} ({displayChangePct >= 0 ? '+' : ''}
                  {displayChangePct.toFixed(2)}%)
                </span>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
